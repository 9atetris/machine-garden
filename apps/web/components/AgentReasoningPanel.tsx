import type { ActionLog, RiskLevel } from "@/lib/types";

type AgentReasoningPanelProps = {
  latestLog?: ActionLog;
};

function riskColor(risk: RiskLevel): string {
  if (risk === "safe") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (risk === "medium") {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-rose-100 text-rose-800";
}

export function AgentReasoningPanel({ latestLog }: AgentReasoningPanelProps) {
  if (!latestLog) {
    return (
      <section className="panel-card animate-fadeInUp p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-slate-900">Agent Reasoning</h2>
        <p className="mt-2 text-sm text-slate-600">No action yet. Start or step the run to view Observe / Plan / Act / Result.</p>
      </section>
    );
  }

  const confidencePct = Math.round(latestLog.confidence * 100);

  return (
    <section className="panel-card animate-fadeInUp p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Agent Reasoning</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-medium uppercase ${riskColor(latestLog.risk)}`}>{latestLog.risk}</span>
      </div>

      <div className="mt-4 space-y-3 text-sm text-slate-700">
        <div>
          <p className="section-title">Observe</p>
          <p className="mt-1">{latestLog.observe}</p>
        </div>
        <div>
          <p className="section-title">Plan</p>
          <p className="mt-1">{latestLog.plan}</p>
        </div>
        <div>
          <p className="section-title">Act</p>
          <p className="mt-1 font-medium text-slate-900">{latestLog.action.type}</p>
          <p className="mt-1 text-xs text-slate-600">{latestLog.action.reason}</p>
          <p className="mt-1 text-xs text-slate-500">
            source: {latestLog.plannerSource ?? "rule"}
            {typeof latestLog.latencyMs === "number" ? ` | latency: ${latestLog.latencyMs}ms` : ""}
          </p>
        </div>
        <div>
          <p className="section-title">Result</p>
          <p className="mt-1">{latestLog.result}</p>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="section-title">Confidence</span>
            <span>{confidencePct}%</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500"
              style={{ width: `${confidencePct}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
