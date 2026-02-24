import type { AgentAction, AgentActionType, AgentCycleOutput, RiskLevel } from "@/lib/types";

const ALLOWED_ACTION_TYPES: AgentActionType[] = [
  "draft_post",
  "draft_reply",
  "bookmark_thread",
  "follow_topic",
  "mute_topic",
  "ask_user_approval",
  "skip"
];

function asString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  return undefined;
}

function parseRisk(value: unknown): RiskLevel {
  if (value === "medium" || value === "high" || value === "safe") {
    return value;
  }

  return "medium";
}

function parseConfidence(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0.5;
  }

  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

function parseAction(value: unknown): AgentAction | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const rawAction = value as {
    type?: unknown;
    targetPostId?: unknown;
    payload?: unknown;
    reason?: unknown;
    expectedOutcome?: unknown;
  };

  const actionType = rawAction.type;
  if (!ALLOWED_ACTION_TYPES.includes(actionType as AgentActionType)) {
    return undefined;
  }

  const rawPayload = rawAction.payload;
  const payload =
    rawPayload && typeof rawPayload === "object"
      ? {
          draftText: asString((rawPayload as { draftText?: unknown }).draftText),
          topic: asString((rawPayload as { topic?: unknown }).topic)
        }
      : undefined;

  return {
    type: actionType as AgentActionType,
    targetPostId: asString(rawAction.targetPostId),
    payload,
    reason: asString(rawAction.reason) ?? "no reason provided",
    expectedOutcome: asString(rawAction.expectedOutcome) ?? "no expected outcome provided"
  };
}

export function sanitizeAgentCycleOutput(value: unknown): AgentCycleOutput | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const rawCycle = value as {
    observe?: unknown;
    plan?: unknown;
    action?: unknown;
    resultPreview?: unknown;
    risk?: unknown;
    confidence?: unknown;
  };

  const action = parseAction(rawCycle.action);
  if (!action) {
    return undefined;
  }

  return {
    observe: asString(rawCycle.observe) ?? "observe was omitted",
    plan: asString(rawCycle.plan) ?? "plan was omitted",
    action,
    resultPreview: asString(rawCycle.resultPreview) ?? "result preview was omitted",
    risk: parseRisk(rawCycle.risk),
    confidence: parseConfidence(rawCycle.confidence)
  };
}

export function extractJsonObjectFromText(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const objectMatch = trimmed.match(/\{[\s\S]*\}/);
    if (!objectMatch) {
      return undefined;
    }

    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      return undefined;
    }
  }
}
