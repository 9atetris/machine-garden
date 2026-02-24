import type {
  AgentCycleOutput,
  DraftItem,
  RiskLevel,
  RiskTolerance,
  SocialPolicy,
  TimelinePost
} from "@/lib/types";

const RISK_SCORE: Record<RiskLevel, number> = {
  safe: 0,
  medium: 1,
  high: 2
};

function scoreToRisk(score: number): RiskLevel {
  if (score >= 2) {
    return "high";
  }
  if (score === 1) {
    return "medium";
  }
  return "safe";
}

function adjustForTolerance(baseRisk: RiskLevel, riskTolerance: RiskTolerance): RiskLevel {
  const score = RISK_SCORE[baseRisk];

  if (riskTolerance === "low") {
    return scoreToRisk(Math.min(score + 1, 2));
  }

  if (riskTolerance === "high") {
    return scoreToRisk(Math.max(score - 1, 0));
  }

  return baseRisk;
}

export function assessPostRisk(post: TimelinePost, policy: SocialPolicy): { risk: RiskLevel; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  if (post.sentiment === "negative") {
    score = Math.max(score, 1);
    reasons.push("negative_sentiment");
  }

  if (post.sentiment === "negative" && post.engagementScore >= 75) {
    score = Math.max(score, 2);
    reasons.push("toxicity_risk_high");
  }

  if (post.engagementScore >= 85) {
    score = Math.max(score, 1);
    reasons.push("high_virality");
  }

  if (/guaranteed|1000x|last spots|signal room/i.test(post.text)) {
    score = Math.max(score, 2);
    reasons.push("spam_pattern_detected");
  }

  const adjustedRisk = adjustForTolerance(scoreToRisk(score), policy.riskTolerance);
  return { risk: adjustedRisk, reasons };
}

function normalizeDraftText(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9\s]/gi, "").replace(/\s+/g, " ").trim();
}

export function detectDuplicateDraft(draftText: string, existingDrafts: DraftItem[]): boolean {
  const normalized = normalizeDraftText(draftText);
  if (!normalized) {
    return false;
  }

  return existingDrafts.some((draft) => normalizeDraftText(draft.text) === normalized);
}

export function getLowConfidenceThreshold(policy: SocialPolicy): number {
  if (policy.riskTolerance === "low") {
    return 0.58;
  }

  if (policy.riskTolerance === "medium") {
    return 0.45;
  }

  return 0.35;
}

export function shouldStopForRisk(cycleOutput: AgentCycleOutput, policy: SocialPolicy): boolean {
  if (cycleOutput.risk === "high" && policy.riskTolerance !== "high") {
    return true;
  }

  return cycleOutput.confidence < getLowConfidenceThreshold(policy);
}
