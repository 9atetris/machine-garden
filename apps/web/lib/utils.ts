import { createMockTimeline } from "@/lib/mockTimeline";
import type { SocialAgentState, SocialPolicy, StopReason } from "@/lib/types";

export function generateRunId(): string {
  return `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function generateEntityId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createInitialPolicy(): SocialPolicy {
  return {
    goal: "engage",
    tone: "technical",
    riskTolerance: "low",
    plannerMode: "rule",
    maxAutoActions: 5
  };
}

export function createInitialSocialAgentState(overrides?: {
  policy?: Partial<SocialPolicy>;
  endReason?: StopReason;
}): SocialAgentState {
  const basePolicy = createInitialPolicy();

  return {
    runId: generateRunId(),
    status: "idle",
    step: 0,
    policy: {
      ...basePolicy,
      ...overrides?.policy
    },
    timeline: createMockTimeline(),
    seenPostIds: [],
    savedTopics: [],
    mutedTopics: [],
    draftQueue: [],
    logs: [],
    consecutiveFailures: 0,
    endReason: overrides?.endReason
  };
}

export function hashStringToFeltLikeHex(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const normalized = (hash >>> 0).toString(16).padStart(8, "0");
  return `0x${normalized}`;
}

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatUtcDateTime(input: string): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return input;
  }

  const year = date.getUTCFullYear();
  const month = padDatePart(date.getUTCMonth() + 1);
  const day = padDatePart(date.getUTCDate());
  const hour = padDatePart(date.getUTCHours());
  const minute = padDatePart(date.getUTCMinutes());
  const second = padDatePart(date.getUTCSeconds());

  return `${year}-${month}-${day} ${hour}:${minute}:${second} UTC`;
}
