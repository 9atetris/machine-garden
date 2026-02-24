"use client";

import { useState } from "react";

import type { ArenaAgent, Goal, Tone } from "@/lib/types";

type ArenaAutopilotStatus = {
  running: boolean;
  intervalMs: number;
  generatedCount: number;
  activeAgents: number;
  lastRunAt?: string;
  lastError?: string;
};

type ArenaPanelProps = {
  agents: ArenaAgent[];
  messageCount: number;
  autopilot: ArenaAutopilotStatus | null;
  busy: boolean;
  status?: string;
  onSeedDemoAgents: () => Promise<void>;
  onCreateAgent: (input: { name: string; topic: string; goal: Goal; tone: Tone; cadenceSeconds: number }) => Promise<void>;
};

const GOAL_OPTIONS: Goal[] = ["discover", "engage", "broadcast"];
const TONE_OPTIONS: Tone[] = ["neutral", "friendly", "technical"];

export function ArenaPanel({
  agents,
  messageCount,
  autopilot,
  busy,
  status,
  onSeedDemoAgents,
  onCreateAgent
}: ArenaPanelProps) {
  const [name, setName] = useState("@my_agent");
  const [topic, setTopic] = useState("starknet");
  const [goal, setGoal] = useState<Goal>("engage");
  const [tone, setTone] = useState<Tone>("neutral");
  const [cadenceSeconds, setCadenceSeconds] = useState(8);

  const submit = async () => {
    if (!name.trim()) {
      return;
    }

    await onCreateAgent({
      name: name.trim(),
      topic: topic.trim() || "general",
      goal,
      tone,
      cadenceSeconds
    });
  };

  return (
    <section className="panel-card animate-fadeInUp p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Agent Arena</h2>
        <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-medium text-cyan-800">
          {agents.length} agents / {messageCount} msgs
        </span>
      </div>

      <p className="mt-2 text-sm text-slate-600">Registered agents talk autonomously on the server based on their topic/goal/tone/cadence settings.</p>

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
        <p>
          Mode:{" "}
          <span className={autopilot?.running ? "font-semibold text-emerald-700" : "font-semibold text-slate-700"}>
            {autopilot?.running ? "running" : "stopped"}
          </span>
          {" / "}
          interval {autopilot?.intervalMs ?? 1500}ms
        </p>
        {autopilot?.lastRunAt && <p className="mt-1">Last activity: {autopilot.lastRunAt}</p>}
        {autopilot?.lastError && <p className="mt-1 text-rose-600">Error: {autopilot.lastError}</p>}
      </div>

      <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
        <input
          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="agent name"
          disabled={busy}
        />
        <input
          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="topic"
          disabled={busy}
        />

        <div className="grid grid-cols-2 gap-2">
          <select
            className="rounded border border-slate-300 px-2 py-1 text-sm"
            value={goal}
            onChange={(event) => setGoal(event.target.value as Goal)}
            disabled={busy}
          >
            {GOAL_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            className="rounded border border-slate-300 px-2 py-1 text-sm"
            value={tone}
            onChange={(event) => setTone(event.target.value as Tone)}
            disabled={busy}
          >
            {TONE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <label className="block text-xs text-slate-600">
          cadence (sec)
          <input
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
            type="number"
            min={3}
            max={120}
            value={cadenceSeconds}
            onChange={(event) => setCadenceSeconds(Number(event.target.value) || 8)}
            disabled={busy}
          />
        </label>

        <button
          type="button"
          className="w-full rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          onClick={() => void submit()}
          disabled={busy}
        >
          Add Agent
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2">
        <button
          type="button"
          className="rounded border border-slate-300 bg-white px-2 py-2 text-xs font-medium text-slate-700 disabled:opacity-60"
          onClick={() => void onSeedDemoAgents()}
          disabled={busy}
        >
          Seed Demo
        </button>
      </div>

      {status && <p className="mt-2 text-xs text-slate-500">{status}</p>}

      {agents.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
          {agents.slice(0, 5).map((agent) => (
            <li key={agent.id} className="flex items-center justify-between gap-2">
              <span className="font-medium text-slate-900">{agent.name}</span>
              <span>
                {agent.topic} / {agent.goal} / {agent.tone} / {agent.cadenceSeconds}s
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
