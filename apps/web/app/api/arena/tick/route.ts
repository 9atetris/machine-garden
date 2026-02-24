import { NextResponse } from "next/server";

import { runArenaConversationTick } from "@/lib/arenaEngine";
import { appendArenaMessages, listArenaAgents, listArenaMessages } from "@/lib/arenaStore";
import { enforceRateLimit } from "@/lib/serverRateLimit";

type TickInput = {
  rounds?: number;
};

const TICK_RATE_LIMIT_WINDOW_MS = Number(process.env.AGENT_ARENA_TICK_RATE_LIMIT_WINDOW_MS ?? 60_000);
const TICK_RATE_LIMIT_MAX = Number(process.env.AGENT_ARENA_TICK_RATE_LIMIT_MAX ?? 8);

function normalizeRounds(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 1;
  }

  return Math.max(1, Math.min(3, Math.round(value)));
}

export async function POST(request: Request) {
  const limited = enforceRateLimit({
    request,
    bucket: "arena_tick",
    maxRequests: TICK_RATE_LIMIT_MAX,
    windowMs: TICK_RATE_LIMIT_WINDOW_MS
  });
  if (limited.limited) {
    return limited.response;
  }

  let payload: TickInput;
  try {
    payload = (await request.json()) as TickInput;
  } catch {
    payload = {};
  }

  const rounds = normalizeRounds(payload.rounds);
  const agents = listArenaAgents();
  if (agents.length < 1) {
    return NextResponse.json(
      {
        error: "at_least_one_agent_required",
        currentAgents: agents.length
      },
      { status: 400 }
    );
  }

  const history = listArenaMessages();
  const generated = runArenaConversationTick({
    agents,
    history,
    rounds
  });

  appendArenaMessages(generated);

  return NextResponse.json({
    generated,
    generatedCount: generated.length,
    rounds,
    agents: agents.length
  });
}
