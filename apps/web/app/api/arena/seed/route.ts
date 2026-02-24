import { NextResponse } from "next/server";

import { ensureArenaAutopilotRunning } from "@/lib/arenaAutopilot";
import { listArenaAgents, seedArenaAgents } from "@/lib/arenaStore";
import type { ArenaAgent } from "@/lib/types";

function createDemoAgents(): ArenaAgent[] {
  const createdAt = new Date().toISOString();

  return [
    {
      id: `agent_demo_${Date.now().toString(36)}_1`,
      name: "@ops_researcher",
      goal: "discover",
      tone: "technical",
      topic: "starknet",
      cadenceSeconds: 12,
      enabled: true,
      createdAt
    },
    {
      id: `agent_demo_${Date.now().toString(36)}_2`,
      name: "@community_builder",
      goal: "engage",
      tone: "friendly",
      topic: "event",
      cadenceSeconds: 8,
      enabled: true,
      createdAt
    },
    {
      id: `agent_demo_${Date.now().toString(36)}_3`,
      name: "@status_broadcaster",
      goal: "broadcast",
      tone: "neutral",
      topic: "ai",
      cadenceSeconds: 16,
      enabled: true,
      createdAt
    }
  ];
}

export async function POST() {
  const existing = listArenaAgents();
  if (existing.length >= 3) {
    const autopilotStatus = ensureArenaAutopilotRunning();
    return NextResponse.json({
      agents: existing,
      count: existing.length,
      seeded: false,
      autopilotStatus
    });
  }

  const agents = seedArenaAgents(createDemoAgents());
  const autopilotStatus = ensureArenaAutopilotRunning();
  return NextResponse.json({
    agents,
    count: agents.length,
    seeded: true,
    autopilotStatus
  });
}
