import type { DraftItem } from "@/lib/types";

type DraftQueuePanelProps = {
  drafts: DraftItem[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
};

export function DraftQueuePanel({ drafts, onApprove, onReject }: DraftQueuePanelProps) {
  return (
    <section className="panel-card animate-fadeInUp p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Draft Queue</h2>
        <p className="text-xs text-slate-500">{drafts.length} pending</p>
      </div>

      {drafts.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">
          No pending drafts. The planner will add post and reply drafts here.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {drafts.map((draft) => (
            <li key={draft.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-slate-900 px-2 py-1 text-white">{draft.kind}</span>
                {draft.targetPostId && <span className="rounded-full bg-cyan-100 px-2 py-1 text-cyan-800">{draft.targetPostId}</span>}
              </div>

              <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{draft.text}</p>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-medium text-white"
                  onClick={() => onApprove(draft.id)}
                >
                  Approve (Simulated)
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                  onClick={() => onReject(draft.id)}
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
