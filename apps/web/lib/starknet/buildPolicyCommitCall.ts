import type { SocialPolicy } from "@/lib/types";
import { hashStringToFeltLikeHex } from "@/lib/utils";

export type StarknetCallPayload = {
  contractAddress: string;
  entrypoint: string;
  calldata: string[];
};

const GOAL_CODE: Record<SocialPolicy["goal"], string> = {
  discover: "0x1",
  engage: "0x2",
  broadcast: "0x3"
};

const TONE_CODE: Record<SocialPolicy["tone"], string> = {
  neutral: "0x1",
  friendly: "0x2",
  technical: "0x3"
};

const RISK_CODE: Record<SocialPolicy["riskTolerance"], string> = {
  low: "0x1",
  medium: "0x2",
  high: "0x3"
};

export function buildPolicyCommitPayload(policy: SocialPolicy): StarknetCallPayload {
  const serialized = JSON.stringify(policy);
  const policyHash = hashStringToFeltLikeHex(serialized);

  return {
    contractAddress: "0x07a11ce000000000000000000000000000000000000000000000000000000001",
    entrypoint: "commit_policy",
    calldata: [
      GOAL_CODE[policy.goal],
      TONE_CODE[policy.tone],
      RISK_CODE[policy.riskTolerance],
      `0x${policy.maxAutoActions.toString(16)}`,
      policyHash
    ]
  };
}
