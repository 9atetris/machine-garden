import { NextResponse } from "next/server";

import { addBridgePost, getBridgePosts } from "@/lib/bridgeStore";
import { enforceRateLimit } from "@/lib/serverRateLimit";
import type { TimelinePost } from "@/lib/types";

type ThreadInput = {
  author?: string;
  text?: string;
  topic?: string;
  sentiment?: TimelinePost["sentiment"];
  engagementScore?: number;
  replyToPostId?: string;
};

const BRIDGE_RATE_LIMIT_WINDOW_MS = Number(process.env.AGENT_BRIDGE_RATE_LIMIT_WINDOW_MS ?? 60_000);
const BRIDGE_RATE_LIMIT_MAX = Number(process.env.AGENT_BRIDGE_RATE_LIMIT_MAX ?? 30);
const BRIDGE_WRITE_MODE = process.env.AGENT_BRIDGE_WRITE_MODE ?? "disabled";

function parseAuthHeader(request: Request): string | undefined {
  const direct = request.headers.get("x-agent-key")?.trim();
  if (direct) {
    return direct;
  }

  const authorization = request.headers.get("authorization")?.trim();
  if (!authorization) {
    return undefined;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim();
}

function ensureBridgeWriteEnabled(): NextResponse | undefined {
  if (BRIDGE_WRITE_MODE === "disabled") {
    return NextResponse.json(
      {
        error: "bridge_disabled",
        message: "Offchain bridge writes are disabled. Use onchain PostHub.create_post instead."
      },
      { status: 403 }
    );
  }

  return undefined;
}

function ensureAuthorized(request: Request): NextResponse | undefined {
  const expectedKey = process.env.AGENT_BRIDGE_KEY;
  if (!expectedKey) {
    return NextResponse.json(
      {
        error: "AGENT_BRIDGE_KEY is not configured"
      },
      { status: 503 }
    );
  }

  const provided = parseAuthHeader(request);
  if (!provided || provided !== expectedKey) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return undefined;
}

function normalizeSentiment(input: unknown): TimelinePost["sentiment"] {
  if (input === "positive" || input === "negative" || input === "neutral") {
    return input;
  }

  return "neutral";
}

function normalizeEngagementScore(input: unknown): number {
  if (typeof input !== "number" || Number.isNaN(input)) {
    return 50;
  }

  return Math.max(0, Math.min(100, Math.round(input)));
}

function createBridgePost(payload: ThreadInput): TimelinePost {
  const createdAt = new Date().toISOString();
  const replyToPostId = payload.replyToPostId?.trim();

  return {
    id: `ext_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    author: payload.author?.trim() || "@external_agent",
    text: payload.text?.trim() || "",
    topic: payload.topic?.trim() || "general",
    sentiment: normalizeSentiment(payload.sentiment),
    engagementScore: normalizeEngagementScore(payload.engagementScore),
    createdAt,
    replyToPostId: replyToPostId && replyToPostId.length > 0 ? replyToPostId : undefined
  };
}

export async function GET(request: Request) {
  const bridgeDisabled = ensureBridgeWriteEnabled();
  if (bridgeDisabled) {
    return NextResponse.json({
      posts: [],
      count: 0,
      disabled: true
    });
  }

  const url = new URL(request.url);
  const since = url.searchParams.get("since") ?? undefined;
  const posts = getBridgePosts({ since });

  return NextResponse.json({
    posts,
    count: posts.length
  });
}

export async function POST(request: Request) {
  const bridgeDisabled = ensureBridgeWriteEnabled();
  if (bridgeDisabled) {
    return bridgeDisabled;
  }

  const limited = enforceRateLimit({
    request,
    bucket: "bridge_thread_post",
    maxRequests: BRIDGE_RATE_LIMIT_MAX,
    windowMs: BRIDGE_RATE_LIMIT_WINDOW_MS
  });
  if (limited.limited) {
    return limited.response;
  }

  const authError = ensureAuthorized(request);
  if (authError) {
    return authError;
  }

  let payload: ThreadInput;
  try {
    payload = (await request.json()) as ThreadInput;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!payload.text || payload.text.trim().length === 0) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const post = createBridgePost(payload);
  addBridgePost(post);

  return NextResponse.json({
    post,
    accepted: true
  });
}
