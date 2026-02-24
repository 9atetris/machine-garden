import type { ArenaAgent, ArenaMessage } from "@/lib/types";

const MAX_ACTIVE_AGENTS_PER_TICK = 8;

function pickRecentTarget(agent: ArenaAgent, messages: ArenaMessage[]): ArenaMessage | undefined {
  return messages.find((message) => message.agentId !== agent.id);
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildMessageText(agent: ArenaAgent, target?: ArenaMessage): string {
  if (!target) {
    if (agent.goal === "discover") {
      return `Signal scan on ${agent.topic}: share one practical link worth bookmarking.`;
    }
    if (agent.goal === "broadcast") {
      return `Broadcast update on ${agent.topic}: one metric, one risk, one next action.`;
    }
    return `Question for ${agent.topic}: what is one actionable next step this week?`;
  }

  if (agent.tone === "technical") {
    return `Replying to ${target.agentName}: observed "${target.text.slice(0, 72)}". Proposed next step: add one measurable checkpoint.`;
  }

  if (agent.tone === "friendly") {
    return `@${target.agentName.replace(/^@/, "")} thanks for sharing. On ${agent.topic}, could we align on one concrete follow-up?`;
  }

  return `Following up on ${target.agentName}'s note: what is the clearest next step for ${agent.topic}?`;
}

function buildSentiment(goal: ArenaAgent["goal"]): ArenaMessage["sentiment"] {
  if (goal === "broadcast") {
    return "positive";
  }
  if (goal === "discover") {
    return "neutral";
  }
  return "neutral";
}

function createMessage(args: {
  agent: ArenaAgent;
  target?: ArenaMessage;
  roundIndex: number;
}): ArenaMessage {
  const text = buildMessageText(args.agent, args.target);
  const createdAt = new Date().toISOString();

  return {
    id: `arena_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    agentId: args.agent.id,
    agentName: args.agent.name,
    text,
    topic: args.agent.topic,
    sentiment: buildSentiment(args.agent.goal),
    engagementScore: clampScore(55 + args.roundIndex * 3 + (args.target ? 7 : 0)),
    createdAt,
    replyToMessageId: args.target?.id
  };
}

export function runArenaConversationTick(args: {
  agents: ArenaAgent[];
  history: ArenaMessage[];
  rounds: number;
}): ArenaMessage[] {
  const rounds = Math.max(1, Math.min(3, args.rounds));
  const activeAgents = args.agents.slice(0, MAX_ACTIVE_AGENTS_PER_TICK);
  if (activeAgents.length === 0) {
    return [];
  }

  const generated: ArenaMessage[] = [];
  for (let round = 0; round < rounds; round += 1) {
    for (const agent of activeAgents) {
      const visibleHistory = [...generated, ...args.history];
      const target = pickRecentTarget(agent, visibleHistory);
      generated.push(
        createMessage({
          agent,
          target,
          roundIndex: round
        })
      );
    }
  }

  return generated;
}
