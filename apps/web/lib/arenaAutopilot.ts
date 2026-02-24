import { normalizeArenaCadenceSeconds } from "@/lib/arenaConfig";
import { runArenaConversationTick } from "@/lib/arenaEngine";
import { appendArenaMessages, listArenaAgents, listArenaMessages } from "@/lib/arenaStore";
import type { ArenaAgent } from "@/lib/types";

const MIN_AUTOPILOT_INTERVAL_MS = 800;
const MAX_AUTOPILOT_INTERVAL_MS = 20_000;
const DEFAULT_AUTOPILOT_INTERVAL_MS = Number(process.env.AGENT_ARENA_AUTOPILOT_INTERVAL_MS ?? 1_500);
const MAX_AGENTS_PER_LOOP_INPUT = Number(process.env.AGENT_ARENA_AUTOPILOT_MAX_AGENTS_PER_LOOP ?? 6);
const MAX_AGENTS_PER_LOOP = Number.isFinite(MAX_AGENTS_PER_LOOP_INPUT)
  ? Math.max(1, Math.min(12, Math.round(MAX_AGENTS_PER_LOOP_INPUT)))
  : 6;

type ArenaAutopilotState = {
  running: boolean;
  intervalMs: number;
  timer: NodeJS.Timeout | null;
  processing: boolean;
  lastRunAt?: string;
  lastError?: string;
  generatedCount: number;
  nextEligibleByAgentId: Map<string, number>;
};

type ArenaAutopilotGlobal = typeof globalThis & {
  __arenaAutopilotState?: ArenaAutopilotState;
};

export type ArenaAutopilotStatus = {
  running: boolean;
  intervalMs: number;
  generatedCount: number;
  activeAgents: number;
  lastRunAt?: string;
  lastError?: string;
};

function clampAutopilotInterval(value: number): number {
  if (!Number.isFinite(value)) {
    return 1_500;
  }

  return Math.max(MIN_AUTOPILOT_INTERVAL_MS, Math.min(MAX_AUTOPILOT_INTERVAL_MS, Math.round(value)));
}

function getState(): ArenaAutopilotState {
  const scope = globalThis as ArenaAutopilotGlobal;
  if (!scope.__arenaAutopilotState) {
    scope.__arenaAutopilotState = {
      running: false,
      intervalMs: clampAutopilotInterval(DEFAULT_AUTOPILOT_INTERVAL_MS),
      timer: null,
      processing: false,
      generatedCount: 0,
      nextEligibleByAgentId: new Map<string, number>()
    };
  }

  return scope.__arenaAutopilotState;
}

function pickDueAgents(agents: ArenaAgent[], nowMs: number, schedule: Map<string, number>): ArenaAgent[] {
  const dueAgents: ArenaAgent[] = [];
  const activeAgents = agents.filter((agent) => agent.enabled);
  const activeIds = new Set(activeAgents.map((agent) => agent.id));

  for (const knownAgentId of Array.from(schedule.keys())) {
    if (!activeIds.has(knownAgentId)) {
      schedule.delete(knownAgentId);
    }
  }

  for (const agent of activeAgents) {
    const cadenceMs = normalizeArenaCadenceSeconds(agent.cadenceSeconds, agent.goal) * 1_000;
    const scheduledAt = schedule.get(agent.id);

    if (typeof scheduledAt !== "number") {
      schedule.set(agent.id, nowMs + Math.floor(Math.random() * Math.min(cadenceMs, 2_000)));
      continue;
    }

    if (nowMs >= scheduledAt) {
      dueAgents.push(agent);
      const jitterMs = Math.floor(Math.random() * Math.max(300, Math.floor(cadenceMs * 0.35)));
      schedule.set(agent.id, nowMs + cadenceMs + jitterMs);
    }
  }

  return dueAgents.slice(0, MAX_AGENTS_PER_LOOP);
}

export async function runArenaAutopilotStep(): Promise<number> {
  const state = getState();
  if (state.processing) {
    return 0;
  }

  state.processing = true;
  try {
    const agents = listArenaAgents();
    if (agents.length === 0) {
      return 0;
    }

    const dueAgents = pickDueAgents(agents, Date.now(), state.nextEligibleByAgentId);
    if (dueAgents.length === 0) {
      return 0;
    }

    const history = listArenaMessages({ limit: 160 });
    const generated = runArenaConversationTick({
      agents: dueAgents,
      history,
      rounds: 1
    });

    if (generated.length > 0) {
      appendArenaMessages(generated);
      state.generatedCount += generated.length;
      state.lastRunAt = new Date().toISOString();
      state.lastError = undefined;
    }

    return generated.length;
  } catch (error) {
    state.lastError = error instanceof Error ? error.message : "unknown_error";
    return 0;
  } finally {
    state.processing = false;
  }
}

function scheduleAutopilotLoop(state: ArenaAutopilotState): void {
  if (state.timer) {
    clearInterval(state.timer);
  }

  state.timer = setInterval(() => {
    void runArenaAutopilotStep();
  }, state.intervalMs);
}

export function startArenaAutopilot(intervalMs?: number): ArenaAutopilotStatus {
  const state = getState();
  if (typeof intervalMs === "number") {
    state.intervalMs = clampAutopilotInterval(intervalMs);
  }

  if (!state.running) {
    state.running = true;
    scheduleAutopilotLoop(state);
    void runArenaAutopilotStep();
  } else if (typeof intervalMs === "number") {
    scheduleAutopilotLoop(state);
  }

  return getArenaAutopilotStatus();
}

export function ensureArenaAutopilotRunning(): ArenaAutopilotStatus {
  const state = getState();
  if (!state.running) {
    return startArenaAutopilot(state.intervalMs);
  }
  return getArenaAutopilotStatus();
}

export function stopArenaAutopilot(): ArenaAutopilotStatus {
  const state = getState();
  state.running = false;
  if (state.timer) {
    clearInterval(state.timer);
    state.timer = null;
  }

  return getArenaAutopilotStatus();
}

export function getArenaAutopilotStatus(): ArenaAutopilotStatus {
  const state = getState();
  const activeAgents = listArenaAgents().filter((agent) => agent.enabled).length;

  return {
    running: state.running,
    intervalMs: state.intervalMs,
    generatedCount: state.generatedCount,
    activeAgents,
    lastRunAt: state.lastRunAt,
    lastError: state.lastError
  };
}
