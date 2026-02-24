import { STOP_CONDITIONS } from "@/lib/types";

const DESCRIPTIONS: Record<string, string> = {
  manual_stop: "Operator requested stop.",
  max_actions_reached: "Run reached policy action budget.",
  toxicity_risk_high: "Detected content risk beyond policy tolerance.",
  low_confidence: "Planner confidence dropped below threshold.",
  duplicate_content_detected: "Draft text duplicated existing queue item.",
  rate_limit_risk: "Reserved placeholder for API throttle checks.",
  no_relevant_posts: "No suitable timeline candidates remained.",
  consecutive_failures: "Repeated validation or action failures."
};

export function SafetyRulesPanel() {
  return (
    <section className="panel-card animate-fadeInUp p-4 sm:p-5">
      <h2 className="text-lg font-semibold text-slate-900">Safety Rules</h2>
      <ul className="mt-3 space-y-2 text-sm text-slate-700">
        {STOP_CONDITIONS.map((condition) => (
          <li key={condition} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="font-medium text-slate-900">{condition}</p>
            <p className="mt-0.5 text-xs text-slate-600">{DESCRIPTIONS[condition]}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
