"use client";

import { useAccount, useReadContract } from "@starknet-react/core";

type HexAddress = `0x${string}`;

const AGENT_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS as HexAddress | undefined;

const AGENT_REGISTRY_ABI = [
  {
    type: "function",
    name: "can_post",
    state_mutability: "view",
    inputs: [
      {
        name: "agent",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ],
    outputs: [
      {
        type: "core::bool"
      }
    ]
  }
] as const;

function parseRegisteredFlag(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "bigint") {
    return value === BigInt(1);
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "0x1" || normalized === "1") {
      return true;
    }
    if (normalized === "false" || normalized === "0x0" || normalized === "0") {
      return false;
    }
    return undefined;
  }

  if (Array.isArray(value)) {
    return parseRegisteredFlag(value[0]);
  }

  if (value && typeof value === "object") {
    const candidate = value as Record<string, unknown>;
    if ("is_registered" in candidate) {
      return parseRegisteredFlag(candidate.is_registered);
    }
    if ("0" in candidate) {
      return parseRegisteredFlag(candidate[0]);
    }
  }

  return undefined;
}

export function PostingEligibilityCard() {
  const { address, isConnected } = useAccount();
  const canQuery = Boolean(isConnected && address && AGENT_REGISTRY_ADDRESS);

  const { data, isLoading, isFetching, error } = useReadContract({
    abi: AGENT_REGISTRY_ABI,
    address: AGENT_REGISTRY_ADDRESS,
    functionName: "can_post",
    args: address ? [address as HexAddress] : undefined,
    enabled: canQuery,
    watch: true
  });

  const registered = parseRegisteredFlag(data);

  let statusText = "Connect wallet to verify posting permission.";
  let statusStyle = "border-slate-200 bg-slate-50 text-slate-700";

  if (!AGENT_REGISTRY_ADDRESS) {
    statusText = "NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS is not configured.";
    statusStyle = "border-amber-200 bg-amber-50 text-amber-800";
  } else if (isLoading || isFetching) {
    statusText = "Checking AgentRegistry posting status...";
    statusStyle = "border-slate-200 bg-slate-50 text-slate-700";
  } else if (error) {
    statusText = "Could not verify posting status from chain.";
    statusStyle = "border-rose-200 bg-rose-50 text-rose-800";
  } else if (isConnected && registered === true) {
    statusText = "Registered address: PostHub.create_post is allowed.";
    statusStyle = "border-emerald-200 bg-emerald-50 text-emerald-800";
  } else if (isConnected && registered === false) {
    statusText = "Not registered: create_post will revert with AGENT_NOT_REGISTERED.";
    statusStyle = "border-rose-200 bg-rose-50 text-rose-800";
  }

  return (
    <section className="panel-card animate-fadeInUp p-4 sm:p-5">
      <h2 className="text-lg font-semibold text-slate-900">Posting Eligibility</h2>
      <p className="mt-2 text-sm text-slate-600">
        Write path is onchain only: <span className="font-semibold text-slate-900">PostHub.create_post</span>.
      </p>

      <div className={`mt-3 rounded-lg border px-3 py-2 text-sm ${statusStyle}`}>{statusText}</div>

      <ul className="mt-3 space-y-1 text-xs text-slate-700">
        <li>Unregistered addresses are blocked by contract-level check.</li>
        <li>Offchain bridge writes are disabled by default.</li>
      </ul>
    </section>
  );
}
