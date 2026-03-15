import { useMemo, useState } from "react";

const STAGES = [
  { key: "dnsLookupMs", short: "DNS", label: "DNS Lookup", color: "#f97316" },
  { key: "tcpHandshakeMs", short: "TCP", label: "TCP Handshake", color: "#facc15" },
  { key: "tlsHandshakeMs", short: "TLS", label: "TLS Handshake", color: "#a855f7" },
  { key: "requestMs", short: "REQ", label: "HTTP Request", color: "#38bdf8" },
  { key: "responseMs", short: "RES", label: "HTTP Response", color: "#22c55e" },
  { key: "browserRenderMs", short: "BND", label: "Browser Render", color: "#ec4899" }
];

const MOCK_API_RESPONSE = {
  url: "https://example.com/index.html",
  dnsLookupMs: 20,
  tcpHandshakeMs: 10,
  tlsHandshakeMs: 30,
  requestMs: 14,
  responseMs: 48,
  browserRenderMs: 16,
  serverRegion: "ap-southeast"
};

const BACKEND_BASE_URL = "http://localhost:6060";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buildTimeline = (payloadData) => {
  const total = STAGES.reduce((sum, stage) => sum + payloadData[stage.key], 0);
  let cursor = 0;

  const rows = STAGES.map((stage) => {
    const duration = payloadData[stage.key];
    const row = {
      ...stage,
      duration,
      startMs: cursor,
      startPct: (cursor / total) * 100,
      widthPct: (duration / total) * 100
    };
    cursor += duration;
    return row;
  });

  return { total, rows };
};

function App() {
  const [url, setUrl] = useState(MOCK_API_RESPONSE.url);
  const [activeStage, setActiveStage] = useState(-1);
  const [barProgress, setBarProgress] = useState(
    Object.fromEntries(STAGES.map((stage) => [stage.key, 0]))
  );
  const [logs, setLogs] = useState([
    "> [SYS] Ready. Enter URL and click ANALYZE.",
    "> [PIPE] Expected order: DNS -> TCP -> TLS -> REQ -> RES -> BND"
  ]);
  const [isRunning, setIsRunning] = useState(false);

  const [payload, setPayload] = useState(MOCK_API_RESPONSE);
  const { total: totalMs, rows: timeline } = useMemo(
    () => buildTimeline(payload),
    [payload]
  );

  const appendLog = (text) => setLogs((prev) => [...prev, text]);

  const resetRun = () => {
    setActiveStage(-1);
    setLogs([
      `> [REQ] Starting analysis for ${url}`,
      "> [SYS] Initializing waterfall renderer..."
    ]);
    setBarProgress(Object.fromEntries(STAGES.map((stage) => [stage.key, 0])));
  };

  const runAnalysis = async () => {
    if (isRunning) {
      return;
    }

    setIsRunning(true);
    resetRun();

    let nextPayload = MOCK_API_RESPONSE;
    try {
      const response = await fetch(
        `${BACKEND_BASE_URL}/api/analyze?url=${encodeURIComponent(url)}`
      );
      if (response.ok) {
        nextPayload = await response.json();
        appendLog(
          `> [API] Backend payload loaded (${BACKEND_BASE_URL})`
        );
      } else {
        appendLog(
          `> [API] Backend returned ${response.status}, using local mock JSON`
        );
      }
    } catch {
      appendLog(
        "> [API] Backend is unreachable, using local mock JSON"
      );
    }

    const { total: nextTotal, rows: runTimeline } = buildTimeline(nextPayload);
    setPayload(nextPayload);
    appendLog(`> [API] Payload ready (${nextTotal}ms total)`);
    await wait(250);

    for (let i = 0; i < runTimeline.length; i += 1) {
      const stage = runTimeline[i];
      setActiveStage(i);
      appendLog(
        `> [${stage.short}] ${stage.label} started... (${stage.duration}ms)`
      );

      await wait(220);
      setBarProgress((prev) => ({ ...prev, [stage.key]: 1 }));
      await wait(Math.max(380, stage.duration * 14));
      appendLog(`> [${stage.short}] ${stage.label} done in ${stage.duration}ms`);
    }

    appendLog(`> [BND] Visual build complete. ${url} lifecycle resolved.`);
    setActiveStage(-1);
    setIsRunning(false);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0 opacity-60">
        <div className="hero-grid" />
      </div>
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-cyan-400/20 blur-[170px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-fuchsia-500/20 blur-[140px]" />

      <section className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
        <header className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.45em] text-slate-400">
            Network - Browser
          </p>
          <h1 className="title-glow text-3xl font-extrabold uppercase tracking-[0.05em] sm:text-5xl">
            HTTP Request Lifecycle
          </h1>
          <p className="font-['Space_Grotesk'] text-sm text-slate-400 sm:text-base">
            Neon waterfall timeline for DNS, transport, security, request and render phases.
          </p>
        </header>

        <section className="panel-glass rounded-2xl border border-slate-700/40 p-4 shadow-panel sm:p-5">
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/index.html"
              className="h-12 flex-1 rounded-xl border border-slate-700/70 bg-slate-900/80 px-4 font-['Share_Tech_Mono'] text-sm text-slate-100 outline-none transition focus:border-cyan-400/70 focus:shadow-neon"
            />
            <button
              type="button"
              onClick={runAnalysis}
              disabled={isRunning}
              className="h-12 rounded-xl border border-cyan-400/60 bg-cyan-400/15 px-5 font-['Orbitron'] text-sm font-bold uppercase tracking-[0.18em] text-cyan-200 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRunning ? "Running..." : "Analyze"}
            </button>
          </div>
        </section>

        <section className="panel-glass rounded-2xl border border-slate-700/40 p-4 sm:p-5">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.35em] text-slate-500">
            Pipeline
          </p>
          <div className="relative grid grid-cols-2 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
            <span className="pipeline-line" />
            {timeline.map((stage, index) => {
              const isActive = activeStage === index;
              const isDone = barProgress[stage.key] === 1;
              return (
                <div key={stage.key} className="relative flex flex-col items-center gap-2">
                  <div
                    className={`stage-node ${isActive ? "stage-node-active" : ""} ${
                      isDone ? "stage-node-done" : ""
                    }`}
                    style={{ "--stage-color": stage.color }}
                  >
                    {stage.short}
                  </div>
                  <div className="text-center font-['Space_Grotesk'] text-[11px] text-slate-300">
                    {stage.label}
                    <p className="font-mono text-[10px] text-slate-500">~{stage.duration}ms</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel-glass rounded-2xl border border-slate-700/40 p-4 sm:p-5">
          <div className="mb-4 flex items-end justify-between gap-3">
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-slate-500">
              Timing Waterfall
            </p>
            <p className="font-['Share_Tech_Mono'] text-sm text-cyan-300">total: ~{totalMs}ms</p>
          </div>

          <div className="space-y-3">
            {timeline.map((stage) => (
              <div key={`row-${stage.key}`} className="grid grid-cols-[70px_1fr_62px] items-center gap-3 sm:grid-cols-[90px_1fr_70px]">
                <span
                  className="font-['Share_Tech_Mono'] text-xs uppercase tracking-wider"
                  style={{ color: stage.color }}
                >
                  {stage.short}
                </span>
                <div className="relative h-7 rounded-md border border-slate-800 bg-slate-900/60">
                  <div
                    className="absolute left-0 top-0 h-full"
                    style={{ width: `${stage.startPct}%` }}
                  />
                  <div
                    className="waterfall-bar"
                    style={{
                      left: `${stage.startPct}%`,
                      width: `${stage.widthPct}%`,
                      background: `linear-gradient(90deg, ${stage.color}, ${stage.color}cc)`,
                      boxShadow: `0 0 16px ${stage.color}66`,
                      transform: `scaleX(${barProgress[stage.key]})`
                    }}
                  />
                </div>
                <span className="font-['Share_Tech_Mono'] text-right text-xs text-slate-400">
                  ~{stage.duration}ms
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel-glass rounded-2xl border border-slate-700/40 p-4 sm:p-5">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.35em] text-slate-500">Terminal Log</p>
          <div className="max-h-72 overflow-auto rounded-xl border border-slate-800 bg-black/60 p-4 font-['Share_Tech_Mono'] text-sm leading-7 text-slate-200">
            {logs.map((line, index) => (
              <div key={`${line}-${index}`} className="terminal-line">
                {line}
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;
