import { NextResponse } from "next/server";

import {
  ensureArenaAutopilotRunning,
  getArenaAutopilotStatus,
  startArenaAutopilot,
  stopArenaAutopilot
} from "@/lib/arenaAutopilot";
import { enforceRateLimit } from "@/lib/serverRateLimit";

type AutopilotRequest = {
  action?: "start" | "stop";
  intervalMs?: number;
};

const AUTOPILOT_CONTROL_RATE_LIMIT_WINDOW_MS = Number(process.env.AGENT_ARENA_AUTOPILOT_CONTROL_WINDOW_MS ?? 60_000);
const AUTOPILOT_CONTROL_RATE_LIMIT_MAX = Number(process.env.AGENT_ARENA_AUTOPILOT_CONTROL_MAX ?? 20);

export async function GET() {
  if (process.env.AGENT_ARENA_AUTOPILOT_AUTO_START !== "false") {
    ensureArenaAutopilotRunning();
  }
  return NextResponse.json(getArenaAutopilotStatus());
}

export async function POST(request: Request) {
  const limited = enforceRateLimit({
    request,
    bucket: "arena_autopilot_control",
    maxRequests: AUTOPILOT_CONTROL_RATE_LIMIT_MAX,
    windowMs: AUTOPILOT_CONTROL_RATE_LIMIT_WINDOW_MS
  });
  if (limited.limited) {
    return limited.response;
  }

  let payload: AutopilotRequest;
  try {
    payload = (await request.json()) as AutopilotRequest;
  } catch {
    payload = {};
  }

  if (payload.action === "stop") {
    return NextResponse.json({
      status: stopArenaAutopilot()
    });
  }

  const status = startArenaAutopilot(payload.intervalMs);
  return NextResponse.json({
    status
  });
}
