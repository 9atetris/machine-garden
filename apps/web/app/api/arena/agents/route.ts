import { NextResponse } from "next/server";

import { normalizeArenaCadenceSeconds } from "@/lib/arenaConfig";
import { ensureArenaAutopilotRunning } from "@/lib/arenaAutopilot";
import { addArenaAgent, listArenaAgents } from "@/lib/arenaStore";
import { enforceRateLimit } from "@/lib/serverRateLimit";
import type { ArenaAgent, Goal, Tone } from "@/lib/types";

type AgentInput = {
  name?: string;
  topic?: string;
  goal?: Goal;
  tone?: Tone;
  cadenceSeconds?: number;
  enabled?: boolean;
};

const AGENT_CREATE_RATE_LIMIT_WINDOW_MS = Number(process.env.AGENT_ARENA_CREATE_RATE_LIMIT_WINDOW_MS ?? 60_000);
const AGENT_CREATE_RATE_LIMIT_MAX = Number(process.env.AGENT_ARENA_CREATE_RATE_LIMIT_MAX ?? 20);
const MAX_AGENTS = Number(process.env.AGENT_ARENA_MAX_AGENTS ?? 30);

function normalizeGoal(value: unknown): Goal {
  if (value === "discover" || value === "engage" || value === "broadcast") {
    return value;
  }

  return "engage";
}

function normalizeTone(value: unknown): Tone {
  if (value === "neutral" || value === "friendly" || value === "technical") {
    return value;
  }

  return "neutral";
}

function createArenaAgent(input: AgentInput): ArenaAgent {
  const now = new Date().toISOString();
  const goal = normalizeGoal(input.goal);

  return {
    id: `agent_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: input.name?.trim() || "@arena_agent",
    topic: input.topic?.trim() || "general",
    goal,
    tone: normalizeTone(input.tone),
    cadenceSeconds: normalizeArenaCadenceSeconds(input.cadenceSeconds, goal),
    enabled: input.enabled !== false,
    createdAt: now
  };
}

export async function GET() {
  const agents = listArenaAgents();
  return NextResponse.json({
    agents,
    count: agents.length
  });
}

export async function POST(request: Request) {
  const limited = enforceRateLimit({
    request,
    bucket: "arena_agent_create",
    maxRequests: AGENT_CREATE_RATE_LIMIT_MAX,
    windowMs: AGENT_CREATE_RATE_LIMIT_WINDOW_MS
  });
  if (limited.limited) {
    return limited.response;
  }

  const existing = listArenaAgents();
  if (existing.length >= MAX_AGENTS) {
    return NextResponse.json(
      {
        error: "arena_agent_limit_reached",
        maxAgents: MAX_AGENTS
      },
      { status: 409 }
    );
  }

  let payload: AgentInput;
  try {
    payload = (await request.json()) as AgentInput;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!payload.name || payload.name.trim().length === 0) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const agent = createArenaAgent(payload);
  addArenaAgent(agent);
  const autopilotStatus = ensureArenaAutopilotRunning();

  return NextResponse.json({
    agent,
    accepted: true,
    autopilotStatus
  });
}
