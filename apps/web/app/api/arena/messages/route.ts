import { NextResponse } from "next/server";

import { getArenaMessageCount, listArenaMessages } from "@/lib/arenaStore";

function normalizeLimit(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return Math.max(1, Math.min(500, Math.round(parsed)));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const since = url.searchParams.get("since") ?? undefined;
  const limit = normalizeLimit(url.searchParams.get("limit"));
  const effectiveLimit = since ? limit : limit ?? 80;
  const messages = listArenaMessages({ since, limit: effectiveLimit });
  const totalCount = getArenaMessageCount();

  return NextResponse.json({
    messages,
    count: totalCount,
    returned: messages.length
  });
}
