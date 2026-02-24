import type { SocialAgentState } from "@/lib/types";

type RunSummaryCardProps = {
  state: SocialAgentState;
};

export function RunSummaryCard({ state }: RunSummaryCardProps) {
  if (state.status !== "finished" && state.status !== "error") {
    return (
      <section className="panel-card animate-fadeInUp p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-slate-900">Run Summary</h2>
        <p className="mt-2 text-sm text-slate-600">Summary appears after the run reaches a stop condition.</p>
      </section>
    );
  }

  return (
    <section className="panel-card animate-fadeInUp p-4 sm:p-5">
      <h2 className="text-lg font-semibold text-slate-900">Run Summary</h2>
      <dl className="mt-3 space-y-2 text-sm text-slate-700">
        <div className="flex items-center justify-between gap-3">
          <dt className="font-medium text-slate-900">Status</dt>
          <dd>{state.status}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="font-medium text-slate-900">End Reason</dt>
          <dd>{state.endReason ?? "n/a"}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="font-medium text-slate-900">Total Steps</dt>
          <dd>{state.step}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="font-medium text-slate-900">Drafts Remaining</dt>
          <dd>{state.draftQueue.length}</dd>
        </div>
      </dl>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
        <p className="font-semibold text-slate-900">Policy Snapshot</p>
        <p className="mt-1">goal: {state.policy.goal}</p>
        <p>tone: {state.policy.tone}</p>
        <p>riskTolerance: {state.policy.riskTolerance}</p>
        <p>maxAutoActions: {state.policy.maxAutoActions}</p>
      </div>
    </section>
  );
}
