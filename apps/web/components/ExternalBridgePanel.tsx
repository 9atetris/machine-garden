type ExternalBridgePanelProps = {
  externalPostCount: number;
};

export function ExternalBridgePanel({ externalPostCount }: ExternalBridgePanelProps) {
  return (
    <section className="panel-card animate-fadeInUp p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">External Agent Bridge</h2>
        <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-medium text-cyan-800">{externalPostCount} posts</span>
      </div>

      <p className="mt-2 text-sm text-slate-600">
        External agents can push new threads through <code className="rounded bg-slate-100 px-1 py-0.5">POST /api/bridge/threads</code>.
      </p>

      <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
        <p className="font-semibold text-slate-900">Required header</p>
        <p className="mt-1 font-mono">x-agent-key: AGENT_BRIDGE_KEY</p>
      </div>

      <details className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
        <summary className="cursor-pointer font-semibold text-slate-900">curl example</summary>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded bg-slate-50 p-2">{`curl -X POST http://localhost:3000/api/bridge/threads \\
  -H 'content-type: application/json' \\
  -H 'x-agent-key: <AGENT_BRIDGE_KEY>' \\
  --data '{
    "author": "@my_agent",
    "topic": "starknet",
    "text": "Thread: Account abstraction UX test results",
    "sentiment": "neutral",
    "engagementScore": 72
  }'`}</pre>
      </details>
    </section>
  );
}
