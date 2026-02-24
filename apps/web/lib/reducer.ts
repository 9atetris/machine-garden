import { planNextCycle } from "@/lib/planner";
import { detectDuplicateDraft, getLowConfidenceThreshold, shouldStopForRisk } from "@/lib/risk";
import type { AgentAction, AgentCycleOutput, PlannerSource, SocialAgentState, StopReason } from "@/lib/types";
import { MAX_CONSECUTIVE_FAILURES } from "@/lib/types";
import { generateEntityId } from "@/lib/utils";

type ApplyCycleMeta = {
  plannerSource?: PlannerSource;
  latencyMs?: number;
};

function validateAction(action: AgentAction): string | undefined {
  switch (action.type) {
    case "draft_post":
      if (!action.payload?.draftText) {
        return "draft_post requires payload.draftText";
      }
      return undefined;
    case "draft_reply":
      if (!action.targetPostId) {
        return "draft_reply requires targetPostId";
      }
      if (!action.payload?.draftText) {
        return "draft_reply requires payload.draftText";
      }
      return undefined;
    case "bookmark_thread":
      if (!action.targetPostId) {
        return "bookmark_thread requires targetPostId";
      }
      return undefined;
    case "follow_topic":
    case "mute_topic":
      if (!action.payload?.topic) {
        return `${action.type} requires payload.topic`;
      }
      return undefined;
    case "ask_user_approval":
    case "skip":
      return undefined;
    default:
      return "unsupported action type";
  }
}

function appendUnique(values: string[], nextValue: string | undefined): string[] {
  if (!nextValue) {
    return values;
  }

  if (values.includes(nextValue)) {
    return values;
  }

  return [...values, nextValue];
}

function findTopicByPostId(state: SocialAgentState, postId?: string): string | undefined {
  if (!postId) {
    return undefined;
  }

  return state.timeline.find((post) => post.id === postId)?.topic;
}

export function applyCycleOutput(state: SocialAgentState, cycle: AgentCycleOutput, meta?: ApplyCycleMeta): SocialAgentState {
  if (state.status === "finished" || state.status === "error") {
    return state;
  }

  const actionError = validateAction(cycle.action);

  const nextStep = state.step + 1;
  let nextSeen = [...state.seenPostIds];
  let nextSavedTopics = [...state.savedTopics];
  let nextMutedTopics = [...state.mutedTopics];
  let nextDraftQueue = [...state.draftQueue];
  let result = cycle.resultPreview;

  let success = !actionError;
  let stopTriggered: StopReason | undefined;

  if (actionError) {
    success = false;
    result = `Simulation failed: ${actionError}.`;
  } else {
    nextSeen = appendUnique(nextSeen, cycle.action.targetPostId);

    if (cycle.action.type === "draft_post" || cycle.action.type === "draft_reply") {
      const draftText = cycle.action.payload?.draftText ?? "";
      if (detectDuplicateDraft(draftText, nextDraftQueue)) {
        success = false;
        stopTriggered = "duplicate_content_detected";
        result = "Simulation halted due to duplicate draft content.";
      } else {
        nextDraftQueue.push({
          id: generateEntityId("draft"),
          kind: cycle.action.type === "draft_post" ? "post" : "reply",
          text: draftText,
          targetPostId: cycle.action.targetPostId
        });
      }
    }

    if (cycle.action.type === "ask_user_approval" && cycle.action.payload?.draftText) {
      if (detectDuplicateDraft(cycle.action.payload.draftText, nextDraftQueue)) {
        success = false;
        stopTriggered = "duplicate_content_detected";
        result = "Approval request matched an existing draft and was blocked.";
      } else {
        nextDraftQueue.push({
          id: generateEntityId("draft"),
          kind: cycle.action.targetPostId ? "reply" : "post",
          text: cycle.action.payload.draftText,
          targetPostId: cycle.action.targetPostId
        });
      }
    }

    if (cycle.action.type === "follow_topic") {
      const topic = cycle.action.payload?.topic ?? findTopicByPostId(state, cycle.action.targetPostId);
      nextSavedTopics = appendUnique(nextSavedTopics, topic);
    }

    if (cycle.action.type === "mute_topic") {
      const topic = cycle.action.payload?.topic ?? findTopicByPostId(state, cycle.action.targetPostId);
      nextMutedTopics = appendUnique(nextMutedTopics, topic);
      nextSavedTopics = nextSavedTopics.filter((savedTopic) => savedTopic !== topic);
    }

    if (
      cycle.action.type === "skip" &&
      (cycle.action.reason.includes("no_relevant") || cycle.observe.includes("No unseen posts"))
    ) {
      stopTriggered = "no_relevant_posts";
      result = "Run finished because there were no relevant posts left.";
    }
  }

  const nextConsecutiveFailures = success ? 0 : state.consecutiveFailures + 1;

  if (!stopTriggered && shouldStopForRisk(cycle, state.policy)) {
    if (cycle.risk === "high" && state.policy.riskTolerance !== "high") {
      stopTriggered = "toxicity_risk_high";
      result = "Run stopped: high-risk content exceeded tolerance.";
    } else if (cycle.confidence < getLowConfidenceThreshold(state.policy)) {
      stopTriggered = "low_confidence";
      result = "Run stopped: confidence dropped below policy threshold.";
    }
  }

  if (!stopTriggered && nextConsecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    stopTriggered = "consecutive_failures";
    result = "Run stopped after repeated failures.";
  }

  if (!stopTriggered && nextStep >= state.policy.maxAutoActions) {
    stopTriggered = "max_actions_reached";
    result = "Run reached max actions for this policy.";
  }

  const nextStatus = stopTriggered
    ? stopTriggered === "consecutive_failures"
      ? "error"
      : "finished"
    : state.status === "running"
      ? "running"
      : "stopped";

  return {
    ...state,
    status: nextStatus,
    step: nextStep,
    seenPostIds: nextSeen,
    savedTopics: nextSavedTopics,
    mutedTopics: nextMutedTopics,
    draftQueue: nextDraftQueue,
    logs: [
      ...state.logs,
      {
        step: nextStep,
        observe: cycle.observe,
        plan: cycle.plan,
        action: cycle.action,
        result,
        risk: cycle.risk,
        confidence: cycle.confidence,
        success,
        plannerSource: meta?.plannerSource ?? "rule",
        latencyMs: meta?.latencyMs,
        stopTriggered
      }
    ],
    consecutiveFailures: nextConsecutiveFailures,
    endReason: stopTriggered ?? state.endReason
  };
}

export function applyActionCycle(state: SocialAgentState): SocialAgentState {
  return applyCycleOutput(state, planNextCycle(state), { plannerSource: "rule" });
}
