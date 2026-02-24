import { sanitizeAgentCycleOutput } from "@/lib/agentOutput";
import { planNextCycle } from "@/lib/planner";
import type { AgentCycleOutput, PlannerSource, SocialAgentState } from "@/lib/types";

type AgentApiResponse = {
  cycle?: unknown;
  source?: PlannerSource;
  latencyMs?: number;
  error?: string;
};

export type PlannerExecutionResult = {
  cycle: AgentCycleOutput;
  source: PlannerSource;
  latencyMs?: number;
  warning?: string;
};

function ruleResult(state: SocialAgentState, source: PlannerSource = "rule", warning?: string): PlannerExecutionResult {
  return {
    cycle: planNextCycle(state),
    source,
    warning
  };
}

export async function getNextCycle(state: SocialAgentState): Promise<PlannerExecutionResult> {
  if (state.policy.plannerMode === "rule") {
    return ruleResult(state, "rule");
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    const response = await fetch("/api/agent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ state }),
      signal: controller.signal
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      return ruleResult(state, "rule_fallback", `agent_api_http_${response.status}`);
    }

    const payload = (await response.json()) as AgentApiResponse;
    const cycle = sanitizeAgentCycleOutput(payload.cycle);
    if (!cycle) {
      return ruleResult(state, "rule_fallback", "agent_api_invalid_cycle");
    }

    if (payload.source === "ai") {
      return {
        cycle,
        source: "ai",
        latencyMs: payload.latencyMs
      };
    }

    return {
      cycle,
      source: payload.source ?? "rule_fallback",
      latencyMs: payload.latencyMs,
      warning: payload.error
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "agent_api_error";
    return ruleResult(state, "rule_fallback", message);
  }
}
