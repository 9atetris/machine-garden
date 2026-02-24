import { NextResponse } from "next/server";

import { extractJsonObjectFromText, sanitizeAgentCycleOutput } from "@/lib/agentOutput";
import { planNextCycle } from "@/lib/planner";
import { enforceRateLimit } from "@/lib/serverRateLimit";
import type { AgentCycleOutput, SocialAgentState } from "@/lib/types";

type AgentRequestBody = {
  state?: SocialAgentState;
};

type OpenAiChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const AGENT_API_RATE_LIMIT_WINDOW_MS = Number(process.env.AGENT_API_RATE_LIMIT_WINDOW_MS ?? 60_000);
const AGENT_API_RATE_LIMIT_MAX = Number(process.env.AGENT_API_RATE_LIMIT_MAX ?? 12);

function isStateShape(value: unknown): value is SocialAgentState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SocialAgentState>;
  return Boolean(candidate.policy && Array.isArray(candidate.timeline) && Array.isArray(candidate.logs));
}

function buildSystemPrompt(): string {
  return [
    "You are a policy-constrained social media planning engine.",
    "Return exactly one cycle output in JSON with keys: observe, plan, action, resultPreview, risk, confidence.",
    "Allowed action types: draft_post, draft_reply, bookmark_thread, follow_topic, mute_topic, ask_user_approval, skip.",
    "Respect risk tolerance. Avoid direct replies on high-toxicity content when tolerance is low.",
    "confidence must be between 0 and 1.",
    "Do not include markdown or explanations outside JSON."
  ].join(" ");
}

function buildUserPrompt(state: SocialAgentState): string {
  const payload = {
    policy: state.policy,
    timeline: state.timeline,
    seenPostIds: state.seenPostIds,
    savedTopics: state.savedTopics,
    mutedTopics: state.mutedTopics,
    draftQueue: state.draftQueue,
    step: state.step,
    consecutiveFailures: state.consecutiveFailures
  };

  return JSON.stringify(payload);
}

function fallbackResponse(state: SocialAgentState, latencyMs: number, error?: string) {
  return NextResponse.json({
    cycle: planNextCycle(state),
    source: "rule_fallback",
    latencyMs,
    error
  });
}

function parseAiCycle(content: string | undefined): AgentCycleOutput | undefined {
  if (!content) {
    return undefined;
  }

  const parsed = extractJsonObjectFromText(content);
  if (!parsed) {
    return undefined;
  }

  return sanitizeAgentCycleOutput(parsed);
}

export async function POST(request: Request) {
  const start = Date.now();
  let stateForFallback: SocialAgentState | undefined;

  try {
    const limited = enforceRateLimit({
      request,
      bucket: "agent_api",
      maxRequests: AGENT_API_RATE_LIMIT_MAX,
      windowMs: AGENT_API_RATE_LIMIT_WINDOW_MS
    });
    if (limited.limited) {
      return limited.response;
    }

    const body = (await request.json()) as AgentRequestBody;
    if (!isStateShape(body.state)) {
      return NextResponse.json({ error: "Invalid request: state is required." }, { status: 400 });
    }

    const state = body.state;
    stateForFallback = state;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return fallbackResponse(state, Date.now() - start, "OPENAI_API_KEY is not configured");
    }

    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: buildSystemPrompt()
          },
          {
            role: "user",
            content: buildUserPrompt(state)
          }
        ]
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      return fallbackResponse(state, Date.now() - start, `AI request failed (${aiResponse.status}): ${errorText.slice(0, 180)}`);
    }

    const payload = (await aiResponse.json()) as OpenAiChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content;
    const cycle = parseAiCycle(content);

    if (!cycle) {
      return fallbackResponse(state, Date.now() - start, "AI response could not be parsed into cycle output");
    }

    return NextResponse.json({
      cycle,
      source: "ai",
      latencyMs: Date.now() - start
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    if (stateForFallback) {
      return fallbackResponse(stateForFallback, Date.now() - start, `agent_api_error: ${message}`);
    }
    return NextResponse.json({ error: `agent_api_error: ${message}` }, { status: 500 });
  }
}
