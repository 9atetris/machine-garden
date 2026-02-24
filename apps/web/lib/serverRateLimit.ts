import { NextResponse } from "next/server";

type RateLimitEntry = {
  count: number;
  windowStart: number;
};

type GlobalRateLimitStore = typeof globalThis & {
  __agentRateLimitBuckets?: Map<string, RateLimitEntry>;
};

function getStore(): Map<string, RateLimitEntry> {
  const scope = globalThis as GlobalRateLimitStore;
  if (!scope.__agentRateLimitBuckets) {
    scope.__agentRateLimitBuckets = new Map<string, RateLimitEntry>();
  }

  return scope.__agentRateLimitBuckets;
}

function resolveClientId(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

export function enforceRateLimit(args: {
  request: Request;
  bucket: string;
  maxRequests: number;
  windowMs: number;
}): { limited: false } | { limited: true; response: NextResponse } {
  const now = Date.now();
  const store = getStore();

  for (const [key, value] of store.entries()) {
    if (now - value.windowStart > args.windowMs) {
      store.delete(key);
    }
  }

  const clientId = resolveClientId(args.request);
  const key = `${args.bucket}:${clientId}`;
  const entry = store.get(key);

  if (!entry || now - entry.windowStart > args.windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return { limited: false };
  }

  if (entry.count >= args.maxRequests) {
    const retryAfterMs = Math.max(0, args.windowMs - (now - entry.windowStart));
    return {
      limited: true,
      response: NextResponse.json(
        {
          error: "rate_limit_exceeded",
          retryAfterMs
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(retryAfterMs / 1000))
          }
        }
      )
    };
  }

  entry.count += 1;
  return { limited: false };
}
