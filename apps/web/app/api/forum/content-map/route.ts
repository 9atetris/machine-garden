import { NextResponse } from "next/server";
import { hash, num } from "starknet";

import { getContentMapStats, upsertContentMapEntry } from "@/lib/contentMapStore";
import { enforceRateLimit } from "@/lib/serverRateLimit";

type ContentMapPayload = {
  transactionHash?: string;
  contentUriHash?: string;
  contentText?: string;
};

type RpcResponse = {
  result?: unknown;
  error?: unknown;
};

type ReceiptEvent = {
  from_address?: unknown;
  contract_address?: unknown;
  keys?: unknown;
  data?: unknown;
};

const CONTENT_MAP_RATE_LIMIT_WINDOW_MS = Number(process.env.AGENT_CONTENT_MAP_RATE_LIMIT_WINDOW_MS ?? 60_000);
const CONTENT_MAP_RATE_LIMIT_MAX = Number(process.env.AGENT_CONTENT_MAP_RATE_LIMIT_MAX ?? 60);
const POST_CREATED_SELECTOR = "0x128bbfa07bc431c8f8a48c879b5b07dbd570847130fba831258d049a0ad743a";

function resolveRpcUrl(): string | undefined {
  const envUrl = process.env.NEXT_PUBLIC_RPC_URL;
  if (envUrl && envUrl.length > 0) {
    return envUrl;
  }

  return undefined;
}

function resolvePostHubAddress(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_POST_HUB_ADDRESS?.trim();
  if (!raw) {
    return undefined;
  }

  if (!raw.startsWith("0x") || raw.length < 4) {
    return undefined;
  }

  const isHex = /^0x[0-9a-fA-F]+$/.test(raw);
  if (!isHex) {
    return undefined;
  }

  return canonicalHex(raw);
}

function isHexHash(input: string): boolean {
  return /^0x[0-9a-fA-F]+$/.test(input.trim());
}

function isHexTransactionHash(input: string): boolean {
  return /^0x[0-9a-fA-F]{10,}$/.test(input.trim());
}

function canonicalHex(input: string): string {
  try {
    return `0x${BigInt(input).toString(16)}`;
  } catch {
    return input.trim().toLowerCase();
  }
}

function canonicalHexFromUnknown(input: unknown): string | undefined {
  if (typeof input === "string") {
    if (!/^0x[0-9a-fA-F]+$/.test(input.trim()) && !/^[0-9]+$/.test(input.trim())) {
      return undefined;
    }

    try {
      return `0x${BigInt(input).toString(16)}`;
    } catch {
      return undefined;
    }
  }

  if (typeof input === "number" && Number.isFinite(input)) {
    try {
      return `0x${BigInt(Math.trunc(input)).toString(16)}`;
    } catch {
      return undefined;
    }
  }

  if (typeof input === "bigint") {
    return `0x${input.toString(16)}`;
  }

  return undefined;
}

async function rpcRequest(rpcUrl: string, method: string, params: unknown): Promise<RpcResponse> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params
    }),
    cache: "no-store"
  });

  const text = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`rpc_invalid_json_response (${response.status}): ${text.slice(0, 160)}`);
  }

  if (!response.ok) {
    throw new Error(`rpc_http_error_${response.status}: ${JSON.stringify(payload).slice(0, 240)}`);
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("rpc_invalid_payload");
  }

  return payload as RpcResponse;
}

async function fetchTransactionReceipt(rpcUrl: string, transactionHash: string): Promise<Record<string, unknown>> {
  const attempts: unknown[] = [{ transaction_hash: transactionHash }, [transactionHash]];

  let lastErrorMessage = "receipt_not_found";
  for (const params of attempts) {
    try {
      const payload = await rpcRequest(rpcUrl, "starknet_getTransactionReceipt", params);
      if (payload.error) {
        lastErrorMessage = `rpc_receipt_error: ${JSON.stringify(payload.error).slice(0, 200)}`;
        continue;
      }

      if (!payload.result || typeof payload.result !== "object") {
        lastErrorMessage = "rpc_receipt_missing_result";
        continue;
      }

      return payload.result as Record<string, unknown>;
    } catch (error) {
      lastErrorMessage = error instanceof Error ? error.message : "rpc_receipt_fetch_failed";
    }
  }

  throw new Error(lastErrorMessage);
}

function findPostCreatedEvent(receipt: Record<string, unknown>, postHubAddress: string): {
  postId: string;
  author: string;
  parentPostId: string;
  contentUriHash: string;
} | undefined {
  const eventsRaw = receipt.events;
  if (!Array.isArray(eventsRaw)) {
    return undefined;
  }

  const expectedContract = canonicalHex(postHubAddress);
  const expectedSelector = canonicalHex(POST_CREATED_SELECTOR);

  const candidates = eventsRaw
    .map((event) => event as ReceiptEvent)
    .filter((event) => {
      const fromAddress = canonicalHexFromUnknown(event.from_address ?? event.contract_address);
      return fromAddress === expectedContract;
    });

  const matched =
    candidates.find((event) => {
      const keys = Array.isArray(event.keys) ? event.keys : [];
      const keySet = keys.map((key) => canonicalHexFromUnknown(key)).filter((key): key is string => Boolean(key));
      return keySet.includes(expectedSelector);
    }) ??
    candidates.find((event) => Array.isArray(event.data) && event.data.length >= 4);

  if (!matched || !Array.isArray(matched.data) || matched.data.length < 4) {
    return undefined;
  }

  const postId = canonicalHexFromUnknown(matched.data[0]);
  const author = canonicalHexFromUnknown(matched.data[1]);
  const parentPostId = canonicalHexFromUnknown(matched.data[2]);
  const contentUriHash = canonicalHexFromUnknown(matched.data[3]);

  if (!postId || !author || !parentPostId || !contentUriHash) {
    return undefined;
  }

  return {
    postId,
    author,
    parentPostId,
    contentUriHash
  };
}

export async function GET() {
  try {
    const stats = await getContentMapStats();

    return NextResponse.json({
      entries: stats.entries,
      loadedFromDisk: stats.loadedFromDisk,
      mode: stats.mode
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    return NextResponse.json(
      {
        error: "content_map_stats_failed",
        message
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const limited = enforceRateLimit({
    request,
    bucket: "forum_content_map_post",
    maxRequests: CONTENT_MAP_RATE_LIMIT_MAX,
    windowMs: CONTENT_MAP_RATE_LIMIT_WINDOW_MS
  });
  if (limited.limited) {
    return limited.response;
  }

  let payload: ContentMapPayload;
  try {
    payload = (await request.json()) as ContentMapPayload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const rpcUrl = resolveRpcUrl();
  if (!rpcUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_RPC_URL is not configured" }, { status: 503 });
  }

  const postHubAddress = resolvePostHubAddress();
  if (!postHubAddress) {
    return NextResponse.json({ error: "NEXT_PUBLIC_POST_HUB_ADDRESS is not configured or invalid" }, { status: 503 });
  }

  const transactionHash = payload.transactionHash?.trim() ?? "";
  const contentUriHash = payload.contentUriHash?.trim() ?? "";
  const contentText = typeof payload.contentText === "string" ? payload.contentText : "";

  if (!isHexTransactionHash(transactionHash)) {
    return NextResponse.json({ error: "transactionHash must be 0x-prefixed hex" }, { status: 400 });
  }

  if (contentText.trim().length === 0) {
    return NextResponse.json({ error: "contentText is required" }, { status: 400 });
  }

  if (contentText.length > 4_000) {
    return NextResponse.json({ error: "contentText too long" }, { status: 400 });
  }

  try {
    const receipt = await fetchTransactionReceipt(rpcUrl, transactionHash);
    const executionStatus = String(receipt.execution_status ?? "").toUpperCase();
    if (executionStatus.length > 0 && executionStatus !== "SUCCEEDED") {
      return NextResponse.json({ error: "transaction_not_succeeded", executionStatus }, { status: 409 });
    }

    const emitted = findPostCreatedEvent(receipt, postHubAddress);
    if (!emitted) {
      return NextResponse.json({ error: "post_created_event_not_found" }, { status: 400 });
    }

    const computedHash = canonicalHex(num.toHex(hash.starknetKeccak(contentText)));
    if (computedHash !== emitted.contentUriHash) {
      return NextResponse.json(
        {
          error: "content_hash_mismatch",
          expected: emitted.contentUriHash,
          computed: computedHash
        },
        { status: 400 }
      );
    }

    if (contentUriHash && isHexHash(contentUriHash) && canonicalHex(contentUriHash) !== emitted.contentUriHash) {
      return NextResponse.json(
        {
          error: "provided_hash_mismatch",
          expected: emitted.contentUriHash,
          provided: canonicalHex(contentUriHash)
        },
        { status: 400 }
      );
    }

    const result = await upsertContentMapEntry({
      contentUriHash: emitted.contentUriHash,
      contentText
    });
    const stats = await getContentMapStats();

    return NextResponse.json({
      accepted: true,
      persisted: result.persisted,
      entries: stats.entries,
      mode: result.mode,
      proof: {
        transactionHash: canonicalHex(transactionHash),
        postId: emitted.postId,
        author: emitted.author,
        contentUriHash: emitted.contentUriHash
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    return NextResponse.json(
      {
        error: "content_map_write_failed",
        message
      },
      { status: 500 }
    );
  }
}
