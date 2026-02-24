import { buildPostDraft, buildReplyDraft } from "@/lib/draft";
import { assessPostRisk } from "@/lib/risk";
import type {
  AgentAction,
  AgentCycleOutput,
  Goal,
  RiskLevel,
  SocialAgentState,
  TimelinePost
} from "@/lib/types";

const ALLOWED_ACTIONS = new Set([
  "draft_post",
  "draft_reply",
  "bookmark_thread",
  "follow_topic",
  "mute_topic",
  "ask_user_approval",
  "skip"
]);

function clampConfidence(confidence: number): number {
  return Math.max(0, Math.min(1, Number(confidence.toFixed(2))));
}

function getUnseenPosts(state: SocialAgentState): TimelinePost[] {
  return state.timeline.filter((post) => {
    if (state.seenPostIds.includes(post.id)) {
      return false;
    }

    if (state.mutedTopics.includes(post.topic)) {
      return false;
    }

    return true;
  });
}

function sortForGoal(posts: TimelinePost[], goal: Goal, savedTopics: string[]): TimelinePost[] {
  const copy = [...posts];

  if (goal === "discover") {
    return copy.sort((a, b) => {
      const aNewTopic = savedTopics.includes(a.topic) ? 0 : 1;
      const bNewTopic = savedTopics.includes(b.topic) ? 0 : 1;
      if (aNewTopic !== bNewTopic) {
        return bNewTopic - aNewTopic;
      }
      return b.engagementScore - a.engagementScore;
    });
  }

  if (goal === "engage") {
    return copy.sort((a, b) => {
      const aTopic = savedTopics.includes(a.topic) ? 1 : 0;
      const bTopic = savedTopics.includes(b.topic) ? 1 : 0;
      if (aTopic !== bTopic) {
        return bTopic - aTopic;
      }

      const sentimentScore = (post: TimelinePost): number => {
        if (post.sentiment === "positive") {
          return 2;
        }
        if (post.sentiment === "neutral") {
          return 1;
        }
        return 0;
      };

      const sentimentDiff = sentimentScore(b) - sentimentScore(a);
      if (sentimentDiff !== 0) {
        return sentimentDiff;
      }

      return b.engagementScore - a.engagementScore;
    });
  }

  return copy.sort((a, b) => b.engagementScore - a.engagementScore);
}

function noRelevantPostsOutput(): AgentCycleOutput {
  return {
    observe: "No unseen posts remain after muted-topic filtering.",
    plan: "Skip action and wait for fresh timeline inputs.",
    action: {
      type: "skip",
      reason: "no_relevant_posts",
      expectedOutcome: "avoid unnecessary low-value actions"
    },
    resultPreview: "Agent stayed idle because no relevant posts were available.",
    risk: "safe",
    confidence: 0.92
  };
}

function buildEngageAction(state: SocialAgentState, post: TimelinePost, postRisk: RiskLevel): AgentAction {
  if (postRisk === "high" && state.policy.riskTolerance === "low") {
    return {
      type: "bookmark_thread",
      targetPostId: post.id,
      reason: "high-risk discussion; store for later review instead of direct reply",
      expectedOutcome: "capture context without escalation"
    };
  }

  const draftText = buildReplyDraft({
    tone: state.policy.tone,
    postAuthor: post.author,
    postText: post.text,
    topic: post.topic
  });

  return {
    type: "draft_reply",
    targetPostId: post.id,
    payload: { draftText },
    reason: "engage mode prioritizes constructive replies on relevant timeline content",
    expectedOutcome: "queue a high-signal reply for user approval"
  };
}

function buildDiscoverAction(state: SocialAgentState, post: TimelinePost, postRisk: RiskLevel): AgentAction {
  if (!state.savedTopics.includes(post.topic)) {
    return {
      type: "follow_topic",
      targetPostId: post.id,
      payload: { topic: post.topic },
      reason: "discover mode prefers adding new relevant topics",
      expectedOutcome: "expand tracked signal surface"
    };
  }

  if (postRisk === "high") {
    return {
      type: "bookmark_thread",
      targetPostId: post.id,
      reason: "high-risk thread stored for manual review",
      expectedOutcome: "maintain awareness while avoiding reactive posting"
    };
  }

  return {
    type: "ask_user_approval",
    targetPostId: post.id,
    payload: {
      draftText: buildReplyDraft({
        tone: state.policy.tone,
        postAuthor: post.author,
        postText: post.text,
        topic: post.topic
      })
    },
    reason: "discover mode found a potentially valuable interaction",
    expectedOutcome: "collect user guidance before drafting aggressively"
  };
}

function buildBroadcastAction(state: SocialAgentState, post: TimelinePost): AgentAction {
  const draftText = buildPostDraft({
    tone: state.policy.tone,
    topic: post.topic,
    relatedTopics: state.savedTopics
  });

  return {
    type: "draft_post",
    payload: { draftText },
    reason: "broadcast mode prioritizes publishing a standalone update",
    expectedOutcome: "prepare a concise outbound post aligned to current signals"
  };
}

function riskToConfidence(risk: RiskLevel): number {
  if (risk === "safe") {
    return 0.85;
  }
  if (risk === "medium") {
    return 0.62;
  }
  return 0.38;
}

export function planNextCycle(state: SocialAgentState): AgentCycleOutput {
  const unseenPosts = getUnseenPosts(state);
  if (unseenPosts.length === 0) {
    return noRelevantPostsOutput();
  }

  const candidate = sortForGoal(unseenPosts, state.policy.goal, state.savedTopics)[0];
  const riskAssessment = assessPostRisk(candidate, state.policy);

  let action: AgentAction;
  if (state.policy.goal === "engage") {
    action = buildEngageAction(state, candidate, riskAssessment.risk);
  } else if (state.policy.goal === "discover") {
    action = buildDiscoverAction(state, candidate, riskAssessment.risk);
  } else {
    action = buildBroadcastAction(state, candidate);
  }

  if (!ALLOWED_ACTIONS.has(action.type)) {
    action = {
      type: "skip",
      targetPostId: candidate.id,
      reason: "planner produced unsupported action; falling back to skip",
      expectedOutcome: "prevent invalid state transitions"
    };
  }

  const confidenceBase = riskToConfidence(riskAssessment.risk);
  const goalBoost = state.policy.goal === "discover" && action.type === "follow_topic" ? 0.08 : 0;
  const sentimentPenalty = candidate.sentiment === "negative" ? 0.06 : 0;
  const confidence = clampConfidence(confidenceBase + goalBoost - sentimentPenalty);

  return {
    observe: `Observed ${candidate.author} on ${candidate.topic} (${candidate.sentiment}, score ${candidate.engagementScore}).`,
    plan: `Selected ${action.type} because goal=${state.policy.goal}, tone=${state.policy.tone}, riskTolerance=${state.policy.riskTolerance}.`,
    action,
    resultPreview: `Simulated ${action.type} for post ${candidate.id}.`,
    risk: riskAssessment.risk,
    confidence
  };
}
