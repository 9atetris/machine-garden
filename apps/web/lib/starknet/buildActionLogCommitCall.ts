import type { ActionLog } from "@/lib/types";
import { hashStringToFeltLikeHex } from "@/lib/utils";

export type StarknetCallPayload = {
  contractAddress: string;
  entrypoint: string;
  calldata: string[];
};

function summarizeLog(log: ActionLog): string {
  return `${log.step}|${log.action.type}|${log.risk}|${log.confidence.toFixed(2)}|${log.success}`;
}

export function buildActionLogCommitPayload(logs: ActionLog[]): StarknetCallPayload {
  const serialized = logs.map(summarizeLog).join(";");
  const logsHash = hashStringToFeltLikeHex(serialized || "empty");

  return {
    contractAddress: "0x07a11ce000000000000000000000000000000000000000000000000000000002",
    entrypoint: "commit_action_log_hash",
    calldata: [`0x${logs.length.toString(16)}`, logsHash]
  };
}
