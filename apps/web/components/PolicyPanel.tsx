import type { Goal, PlannerMode, RiskTolerance, SocialPolicy, Tone } from "@/lib/types";

type PolicyPanelProps = {
  policy: SocialPolicy;
  disabled?: boolean;
  onPolicyChange: (next: Partial<SocialPolicy>) => void;
};

const GOAL_OPTIONS: Goal[] = ["discover", "engage", "broadcast"];
const TONE_OPTIONS: Tone[] = ["neutral", "friendly", "technical"];
const RISK_OPTIONS: RiskTolerance[] = ["low", "medium", "high"];
const PLANNER_OPTIONS: PlannerMode[] = ["rule", "ai"];
const MAX_ACTION_OPTIONS = [3, 5, 10];

export function PolicyPanel({ policy, disabled, onPolicyChange }: PolicyPanelProps) {
  return (
    <section className="panel-card animate-fadeInUp p-4 sm:p-5">
      <h2 className="text-lg font-semibold text-slate-900">Policy</h2>
      <p className="mt-1 text-sm text-slate-600">Configure goal, voice, and safety boundaries before each run.</p>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="section-title">Goal</span>
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            value={policy.goal}
            disabled={disabled}
            onChange={(event) => onPolicyChange({ goal: event.target.value as Goal })}
          >
            {GOAL_OPTIONS.map((goal) => (
              <option key={goal} value={goal}>
                {goal}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="section-title">Tone</span>
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            value={policy.tone}
            disabled={disabled}
            onChange={(event) => onPolicyChange({ tone: event.target.value as Tone })}
          >
            {TONE_OPTIONS.map((tone) => (
              <option key={tone} value={tone}>
                {tone}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="section-title">Risk Tolerance</span>
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            value={policy.riskTolerance}
            disabled={disabled}
            onChange={(event) => onPolicyChange({ riskTolerance: event.target.value as RiskTolerance })}
          >
            {RISK_OPTIONS.map((risk) => (
              <option key={risk} value={risk}>
                {risk}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="section-title">Planner</span>
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            value={policy.plannerMode}
            disabled={disabled}
            onChange={(event) => onPolicyChange({ plannerMode: event.target.value as PlannerMode })}
          >
            {PLANNER_OPTIONS.map((plannerMode) => (
              <option key={plannerMode} value={plannerMode}>
                {plannerMode}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="section-title">Max Actions</span>
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            value={policy.maxAutoActions}
            disabled={disabled}
            onChange={(event) => onPolicyChange({ maxAutoActions: Number(event.target.value) })}
          >
            {MAX_ACTION_OPTIONS.map((maxActions) => (
              <option key={maxActions} value={maxActions}>
                {maxActions}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
