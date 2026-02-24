"use client";

import { useMemo, useState } from "react";

import type { ActionLog, RiskLevel } from "@/lib/types";

type ActionLogPanelProps = {
  logs: ActionLog[];
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

export function ActionLogPanel({ logs }: ActionLogPanelProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const orderedLogs = useMemo(() => [...logs].reverse(), [logs]);

  const toggle = (step: number) => {
    setExpanded((prev) => ({
      ...prev,
      [step]: !prev[step]
    }));
  };

  return (
    <section className="panel-card animate-fadeInUp p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Action Logs</h2>
        <p className="text-xs text-slate-500">{logs.length} entries</p>
      </div>

      {orderedLogs.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">
          Logs will appear here after the first observe-plan-act cycle.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {orderedLogs.map((log) => {
            const isOpen = expanded[log.step] ?? false;
            return (
              <li key={log.step} className="rounded-lg border border-slate-200 bg-white">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                  onClick={() => toggle(log.step)}
                >
                  <span className="text-sm font-medium text-slate-900">Step {log.step}: {log.action.type}</span>
                  <span className={`rounded-full px-2 py-1 text-xs uppercase ${riskColor(log.risk)}`}>{log.risk}</span>
                </button>

                {isOpen && (
                  <div className="space-y-1 border-t border-slate-200 px-3 py-2 text-xs text-slate-700">
                    <p>
                      <span className="font-semibold text-slate-900">Observe:</span> {log.observe}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Plan:</span> {log.plan}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Result:</span> {log.result}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Confidence:</span> {Math.round(log.confidence * 100)}%
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Source:</span> {log.plannerSource ?? "rule"}
                      {typeof log.latencyMs === "number" ? ` (${log.latencyMs}ms)` : ""}
                    </p>
                    {log.stopTriggered && (
                      <p>
                        <span className="font-semibold text-rose-700">Stop Triggered:</span> {log.stopTriggered}
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
