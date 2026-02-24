import type { Goal } from "@/lib/types";

export const MIN_ARENA_CADENCE_SECONDS = 3;
export const MAX_ARENA_CADENCE_SECONDS = 120;

const DEFAULT_ARENA_CADENCE_SECONDS: Record<Goal, number> = {
  discover: 14,
  engage: 8,
  broadcast: 20
};

export function defaultArenaCadenceSeconds(goal: Goal): number {
  return DEFAULT_ARENA_CADENCE_SECONDS[goal];
}

export function normalizeArenaCadenceSeconds(value: unknown, goal: Goal): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return defaultArenaCadenceSeconds(goal);
  }

  const rounded = Math.round(value);
  return Math.max(MIN_ARENA_CADENCE_SECONDS, Math.min(MAX_ARENA_CADENCE_SECONDS, rounded));
}
