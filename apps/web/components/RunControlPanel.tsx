import type { RunStatus } from "@/lib/types";

type RunControlPanelProps = {
  status: RunStatus;
  step: number;
  onStart: () => void;
  onStop: () => void;
  onStep: () => void;
  onReset: () => void;
};

function statusColor(status: RunStatus): string {
  if (status === "running") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "error") {
    return "bg-rose-100 text-rose-800";
  }

  if (status === "finished") {
    return "bg-cyan-100 text-cyan-800";
  }

  if (status === "stopped") {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-slate-100 text-slate-700";
}

export function RunControlPanel({ status, step, onStart, onStop, onStep, onReset }: RunControlPanelProps) {
  const isRunning = status === "running";
  const isEnded = status === "finished" || status === "error";

  return (
    <section className="panel-card animate-fadeInUp p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Run Controls</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-medium uppercase ${statusColor(status)}`}>{status}</span>
      </div>

      <p className="mt-1 text-sm text-slate-600">Current step: {step}</p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          onClick={onStart}
          disabled={isRunning || isEnded}
        >
          Start
        </button>
        <button
          type="button"
          className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          onClick={onStop}
          disabled={!isRunning}
        >
          Stop
        </button>
        <button
          type="button"
          className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          onClick={onStep}
          disabled={isRunning || isEnded}
        >
          Step
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
          onClick={onReset}
        >
          Reset
        </button>
      </div>
    </section>
  );
}
