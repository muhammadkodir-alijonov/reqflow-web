import { useEffect, useMemo, useState } from "react";

const STAGES = [
  { key: "dnsLookupMs", short: "DNS", label: "DNS Lookup", color: "#f97316" },
  { key: "tcpHandshakeMs", short: "TCP", label: "TCP Handshake", color: "#facc15" },
  { key: "tlsHandshakeMs", short: "TLS", label: "TLS Handshake", color: "#a855f7" },
  { key: "requestMs", short: "REQ", label: "HTTP Request", color: "#38bdf8" },
  { key: "responseMs", short: "RES", label: "HTTP Response", color: "#22c55e" },
  { key: "browserRenderMs", short: "BND", label: "Browser Render", color: "#ec4899" }
];

const DEFAULT_TARGET_URL = "https://muhammadqodir.com";

const MOCK_API_RESPONSE = {
  url: DEFAULT_TARGET_URL,
  dnsLookupMs: 20,
  tcpHandshakeMs: 10,
  tlsHandshakeMs: 30,
  requestMs: 14,
  responseMs: 48,
  browserRenderMs: 16,
  serverRegion: "ap-southeast"
};

const EMPTY_PAYLOAD = {
  url: DEFAULT_TARGET_URL,
  dnsLookupMs: 0,
  tcpHandshakeMs: 0,
  tlsHandshakeMs: 0,
  requestMs: 0,
  responseMs: 0,
  browserRenderMs: 0,
  serverRegion: "-"
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
const USE_MOCK_ON_ERROR =
  String(import.meta.env.VITE_USE_MOCK_ON_ERROR ?? "false").toLowerCase() ===
  "true";
const VISIT_SESSION_KEY = "reqflow-visit-registered";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForNextPaint = () =>
  new Promise((resolve) => {
    if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
      resolve();
      return;
    }

    // Two RAF ticks is a common approach to wait until the next paint is committed.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resolve);
    });
  });

const pickDuration = (candidates, fallbackValue = 0) => {
  for (const value of candidates) {
    const normalized = Number(value);
    if (Number.isFinite(normalized) && normalized >= 0) {
      return normalized;
    }
  }

  return fallbackValue;
};

const isValidHttpUrl = (value) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const normalizeNotes = (notes, fallbackNotes) => {
  if (!Array.isArray(notes) || notes.length === 0) {
    return fallbackNotes;
  }

  return notes
    .map((item) => {
      if (typeof item === "string") {
        return { left: item, right: "info" };
      }
      if (!item || typeof item !== "object") {
        return null;
      }

      const left = item.left ?? item.label ?? item.message ?? "";
      const right = item.right ?? item.kind ?? item.type ?? "info";
      if (!left) {
        return null;
      }

      return {
        left: String(left),
        right: String(right)
      };
    })
    .filter(Boolean);
};

const getHostInfoFromUrl = (value) => {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname;
    const labels = hostname.split(".").filter(Boolean);
    const tld = labels.length > 0 ? labels[labels.length - 1] : "com";
    const zone = labels.length >= 2 ? labels.slice(-2).join(".") : hostname;

    return {
      protocol: parsed.protocol,
      hostname,
      tld,
      zone,
      path: `${parsed.pathname || "/"}${parsed.search || ""}`
    };
  } catch {
    return {
      protocol: "https:",
      hostname: "example.com",
      tld: "com",
      zone: "example.com",
      path: "/"
    };
  }
};

const toHttpVersionLabel = (rawVersion, protocol) => {
  const value = String(rawVersion ?? "")
    .trim()
    .toLowerCase();

  if (["1", "1.0", "http/1", "http/1.0"].includes(value)) {
    return "HTTP/1.0";
  }

  if (["1.1", "http/1.1"].includes(value)) {
    return "HTTP/1.1";
  }

  if (["2", "2.0", "h2", "http/2", "http/2.0"].includes(value)) {
    return "HTTP/2";
  }

  if (["3", "3.0", "h3", "http/3", "http/3.0", "quic"].includes(value)) {
    return "HTTP/3";
  }

  if (protocol === "http:") {
    return "HTTP/1.1";
  }

  return "HTTP/2 or HTTP/3";
};

const buildDefaultStageDetails = (payloadData) => {
  const hostInfo = getHostInfoFromUrl(payloadData?.url ?? DEFAULT_TARGET_URL);
  const httpVersion = toHttpVersionLabel(payloadData?.httpVersion, hostInfo.protocol);

  return {
    DNS: {
      title: "DNS Lookup",
      notes: [
        { left: "Browser checks cache", right: "cached? no" },
        { left: "OS resolver queried", right: "asking system" },
        { left: "Root nameserver ->", right: `.${hostInfo.tld}` },
        { left: "TLD nameserver ->", right: hostInfo.zone },
        { left: "IP returned", right: "ready" }
      ]
    },
    TCP: {
      title: "TCP Handshake",
      notes: [
        { left: "SYN ->", right: "client -> server" },
        { left: "<- SYN-ACK", right: "server -> client" },
        { left: "ACK ->", right: "client -> server" },
        { left: "Connection established", right: "socket open" }
      ]
    },
    TLS: {
      title: "TLS Handshake",
      notes: [
        { left: "ClientHello ->", right: "cipher suites" },
        { left: "<- ServerHello + cert", right: "server chooses" },
        { left: "Certificate verified", right: "CA trusted" },
        { left: "Keys exchanged", right: "ECDHE" },
        { left: "Encrypted tunnel", right: "TLS HTTPS" }
      ]
    },
    REQ: {
      title: "HTTP Request",
      notes: [
        { left: `GET ${hostInfo.path} ${httpVersion}`, right: "method + path" },
        { left: `Host: ${hostInfo.hostname}`, right: "header" },
        { left: "Accept: text/html", right: "header" },
        { left: "Cookie: session=abc", right: "header" },
        { left: "Request sent ->", right: "encrypted" }
      ]
    },
    RES: {
      title: "HTTP Response",
      notes: [
        { left: `<- ${httpVersion} 200 OK`, right: "status" },
        { left: "Content-Type: text/html", right: "header" },
        { left: "Cache-Control: max-age", right: "header" },
        { left: "Body: <html>...", right: "payload" },
        { left: "Response received", right: "14kb" }
      ]
    },
    BND: {
      title: "Browser Render",
      notes: [
        { left: "HTML parsed -> DOM", right: "tree built" },
        { left: "CSS parsed -> CSSOM", right: "styles computed" },
        { left: "Render tree created", right: "dom + cssom" },
        { left: "Layout calculated", right: "box positions" },
        { left: "Paint complete", right: "visible" }
      ]
    }
  };
};

const parsePayload = (raw) => {
  const source = raw?.data ?? raw ?? {};
  const timings = source.timings ?? {};

  const dnsLookupMs = pickDuration([
    source.dnsLookupMs,
    timings.dnsLookupMs,
    timings.dnsMs
  ]);
  const tcpHandshakeMs = pickDuration([
    source.tcpHandshakeMs,
    timings.tcpHandshakeMs,
    timings.tcpMs
  ]);
  const tlsHandshakeMs = pickDuration([
    source.tlsHandshakeMs,
    timings.tlsHandshakeMs,
    timings.tlsMs
  ]);
  const requestMs = pickDuration([
    source.requestMs,
    source.httpRequestMs,
    timings.requestMs,
    timings.httpRequestMs
  ]);
  const responseMs = pickDuration([
    source.responseMs,
    source.httpResponseMs,
    timings.responseMs,
    timings.httpResponseMs
  ]);

  const browserRenderRaw = [source.browserRenderMs, timings.browserRenderMs].find(
    (value) => Number.isFinite(Number(value)) && Number(value) >= 0
  );

  return {
    url: source.url ?? MOCK_API_RESPONSE.url,
    dnsLookupMs,
    tcpHandshakeMs,
    tlsHandshakeMs,
    requestMs,
    responseMs,
    browserRenderMs:
      browserRenderRaw === undefined || browserRenderRaw === null
        ? null
        : Number(browserRenderRaw),
    serverRegion: source.serverRegion ?? MOCK_API_RESPONSE.serverRegion,
    stageDetails:
      source.stageDetails && typeof source.stageDetails === "object"
        ? source.stageDetails
        : undefined,
    dnsDetails: source.dnsDetails,
    tcpDetails: source.tcpDetails,
    tlsDetails: source.tlsDetails,
    reqDetails: source.reqDetails,
    resDetails: source.resDetails,
    bndDetails: source.bndDetails,
    httpVersion:
      source.httpVersion ??
      source.protocolVersion ??
      timings.httpVersion ??
      timings.protocolVersion ??
      source.http?.version ??
      source.response?.httpVersion ??
      source.reqDetails?.httpVersion ??
      source.resDetails?.httpVersion ??
      source.stageDetails?.REQ?.httpVersion
  };
};

const getStageDetail = (payloadData, stageShort, fallbackDuration) => {
  const fallback = buildDefaultStageDetails(payloadData)[stageShort];
  const payloadDetails = payloadData?.stageDetails?.[stageShort];
  const payloadDetailsByKey = payloadData?.[`${stageShort.toLowerCase()}Details`];
  const source = payloadDetails ?? payloadDetailsByKey ?? null;

  return {
    title: source?.title ?? fallback.title,
    durationMs: Number(source?.durationMs ?? fallbackDuration),
    notes: normalizeNotes(source?.notes, fallback.notes)
  };
};

const buildTimeline = (payloadData) => {
  const total = STAGES.reduce((sum, stage) => sum + payloadData[stage.key], 0);
  const safeTotal = total > 0 ? total : 1;
  let cursor = 0;

  const rows = STAGES.map((stage) => {
    const duration = payloadData[stage.key];
    const row = {
      ...stage,
      duration,
      startMs: cursor,
      startPct: (cursor / safeTotal) * 100,
      widthPct: (duration / safeTotal) * 100
    };
    cursor += duration;
    return row;
  });

  return { total, rows };
};

const joinApiPath = (base, path) => {
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

const formatVisitsCompact = (value) => {
  const safeValue = Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;

  const formatUnit = (number, divisor, suffix) => {
    const normalized = number / divisor;
    const precision = normalized < 10 ? 1 : 0;
    const rounded = normalized.toFixed(precision).replace(/\.0$/, "");
    return `${rounded}${suffix}`;
  };

  if (safeValue < 1_000) {
    return String(Math.floor(safeValue));
  }

  if (safeValue < 1_000_000) {
    return formatUnit(safeValue, 1_000, "k");
  }

  if (safeValue < 1_000_000_000) {
    return formatUnit(safeValue, 1_000_000, "mln");
  }

  return formatUnit(safeValue, 1_000_000_000, "bln");
};

function App() {
  const [url, setUrl] = useState(DEFAULT_TARGET_URL);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [totalVisits, setTotalVisits] = useState(0);
  const [, setVisitorStatus] = useState("connecting");
  const [activeStage, setActiveStage] = useState(0);
  const [focusedStage, setFocusedStage] = useState(0);
  const [barProgress, setBarProgress] = useState(
    Object.fromEntries(STAGES.map((stage) => [stage.key, 0]))
  );
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [detailProgress, setDetailProgress] = useState(
    Object.fromEntries(STAGES.map((stage) => [stage.short, 0]))
  );

  const [payload, setPayload] = useState(EMPTY_PAYLOAD);
  const { total: totalMs, rows: timeline } = useMemo(
    () => buildTimeline(payload),
    [payload]
  );

  useEffect(() => {
    let isUnmounted = false;

    const pullTotalVisits = async () => {
      try {
        const response = await fetch(joinApiPath(API_BASE_URL, "/visitors/total"));

        if (!response.ok) {
          throw new Error(`Visitor API status ${response.status}`);
        }

        const body = await response.json();
        const count = Number(body?.totalVisits ?? 0);
        if (!isUnmounted) {
          setTotalVisits(Number.isFinite(count) && count >= 0 ? count : 0);
          setVisitorStatus("live");
        }
      } catch {
        if (!isUnmounted) {
          setVisitorStatus("offline");
        }
      }
    };

    const registerVisit = async () => {
      try {
        const alreadyRegisteredInSession =
          typeof window !== "undefined" && window.sessionStorage.getItem(VISIT_SESSION_KEY) === "1";

        if (alreadyRegisteredInSession) {
          await pullTotalVisits();
          return;
        }

        const response = await fetch(joinApiPath(API_BASE_URL, "/visitors/hit"), {
          method: "POST"
        });

        if (!response.ok) {
          throw new Error(`Visitor API status ${response.status}`);
        }

        const body = await response.json();
        const count = Number(body?.totalVisits ?? 0);
        if (!isUnmounted) {
          setTotalVisits(Number.isFinite(count) && count >= 0 ? count : 0);
          setVisitorStatus("live");

          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(VISIT_SESSION_KEY, "1");
          }
        }
      } catch {
        if (!isUnmounted) {
          setVisitorStatus("offline");
        }
      }
    };

    registerVisit();

    const timeoutId = setTimeout(pullTotalVisits, 1200);
    const intervalId = setInterval(pullTotalVisits, 5000);

    return () => {
      isUnmounted = true;
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);

  const appendLog = (text, stageIndex) =>
    setLogs((prev) => [...prev, { text, stageIndex }]);

  const visibleLogs = useMemo(
    () => logs.filter((entry) => entry.stageIndex <= focusedStage),
    [logs, focusedStage]
  );

  const currentStage = timeline[focusedStage] ?? timeline[0];
  const detail = useMemo(
    () => getStageDetail(payload, currentStage.short, currentStage.duration),
    [payload, currentStage.short, currentStage.duration]
  );
  const currentVisibleNotes = detail.notes.slice(
    0,
    Math.max(detailProgress[currentStage.short] || 0, isRunning ? 0 : detail.notes.length)
  );

  const resetRun = (targetUrl) => {
    setHasAnalyzed(false);
    setActiveStage(0);
    setFocusedStage(0);
    setLogs([
      { text: `> [REQ] Starting analysis for ${targetUrl}`, stageIndex: 0 },
      {
        text: "> [PIPE] Sequence: DNS -> TCP -> TLS -> REQ -> RES -> BND",
        stageIndex: 0
      }
    ]);
    setBarProgress(Object.fromEntries(STAGES.map((stage) => [stage.key, 0])));
    setDetailProgress(Object.fromEntries(STAGES.map((stage) => [stage.short, 0])));
  };

  const runAnalysis = async () => {
    if (isRunning) {
      return;
    }

    const targetUrl = url.trim();
    setErrorMessage("");

    if (!isValidHttpUrl(targetUrl)) {
      setErrorMessage("URL noto'g'ri. Faqat http:// yoki https:// bilan to'liq URL kiriting.");
      setLogs([
        {
          text: `> [ERR] Invalid URL: ${targetUrl || "(empty)"}`,
          stageIndex: 0
        }
      ]);
      return;
    }

    setIsRunning(true);
    resetRun(targetUrl);
    setUrl(targetUrl);

    let nextPayload = null;
    const analyzeUrl = `${joinApiPath(API_BASE_URL, "/analyze")}?url=${encodeURIComponent(targetUrl)}`;

    try {
      const response = await fetch(analyzeUrl);
      if (response.ok) {
        const body = await response.json();
        nextPayload = parsePayload(body);
        appendLog(`> [API] Backend payload loaded (${API_BASE_URL})`, 0);
      } else {
        let backendMessage = "";
        try {
          const errorBody = await response.json();
          backendMessage =
            errorBody?.message ?? errorBody?.error ?? errorBody?.detail ?? "";
        } catch {
          // no-op: fallback to status-only message
        }

        const safeMessage = backendMessage
          ? `Backend returned ${response.status}: ${backendMessage}`
          : `Backend returned ${response.status}`;
        throw new Error(safeMessage);
      }
    } catch (error) {
      const safeError = error?.message ?? "Unexpected backend error";
      if (!USE_MOCK_ON_ERROR) {
        setErrorMessage(safeError);
        appendLog(`> [ERR] ${safeError}`, 0);
        appendLog("> [API] Mock fallback disabled. Real backend response required.", 0);
        setIsRunning(false);
        return;
      }

      nextPayload = MOCK_API_RESPONSE;
      setErrorMessage(`${safeError}. Mock data ko'rsatilmoqda.`);
      appendLog("> [API] Backend is unreachable, using local mock JSON", 0);
    }

    let runMetrics = buildTimeline(nextPayload);
    if (nextPayload.browserRenderMs === null) {
      const payloadWithoutBnd = { ...nextPayload, browserRenderMs: 0 };
      const renderStart = typeof performance !== "undefined" ? performance.now() : Date.now();
      setPayload(payloadWithoutBnd);
      await waitForNextPaint();
      const renderEnd = typeof performance !== "undefined" ? performance.now() : Date.now();
      const measuredRenderMs = Math.max(1, Math.round(renderEnd - renderStart));
      nextPayload = { ...nextPayload, browserRenderMs: measuredRenderMs };
      runMetrics = buildTimeline(nextPayload);
      setPayload(nextPayload);
      appendLog(`> [BND] Browser render measured on client (${measuredRenderMs}ms)`, 0);
    } else {
      setPayload(nextPayload);
    }

    appendLog(`> [API] Payload ready (${runMetrics.total}ms total)`, 0);
    setHasAnalyzed(true);
    await wait(250);

    for (let i = 0; i < runMetrics.rows.length; i += 1) {
      const stage = runMetrics.rows[i];
      const stageDetail = getStageDetail(nextPayload, stage.short, stage.duration);

      setActiveStage(i);
      setFocusedStage(i);
      setDetailProgress((prev) => ({ ...prev, [stage.short]: 0 }));
      appendLog(
        `> [${stage.short}] ${stage.label} started... (${stage.duration}ms)`,
        i
      );

      if (stageDetail.notes.length > 0) {
        setDetailProgress((prev) => ({ ...prev, [stage.short]: 1 }));
        for (let noteIdx = 2; noteIdx <= stageDetail.notes.length; noteIdx += 1) {
          await wait(Math.max(110, Math.floor(stage.duration * 4)));
          setDetailProgress((prev) => ({ ...prev, [stage.short]: noteIdx }));
        }
      }

      await wait(220);
      setBarProgress((prev) => ({ ...prev, [stage.key]: 1 }));
      await wait(Math.max(380, stage.duration * 14));
      appendLog(`> [${stage.short}] ${stage.label} done in ${stage.duration}ms`, i);
    }

    appendLog(`> [BND] Visual build complete. ${targetUrl} lifecycle resolved.`, 5);
    setActiveStage(5);
    setFocusedStage(5);
    setIsRunning(false);
  };

  const handleStageFocus = (index) => {
    if (isRunning) {
      return;
    }
    setFocusedStage(index);
    setActiveStage(index);
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
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-xs uppercase tracking-[0.45em] text-slate-400">
              Network - Browser
            </p>
            <div className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-right">
              <p className="font-['Share_Tech_Mono'] text-[10px] uppercase tracking-[0.2em] text-emerald-200">
                Total Visits {formatVisitsCompact(totalVisits)}
              </p>
            </div>
          </div>
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
              placeholder="https://muhammadqodir.com"
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

          {errorMessage ? (
            <p className="mt-3 rounded-xl border border-rose-500/45 bg-rose-500/10 px-3 py-2 font-['Share_Tech_Mono'] text-xs text-rose-200">
              {errorMessage}
            </p>
          ) : null}
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
                  <button
                    type="button"
                    onClick={() => handleStageFocus(index)}
                    className={`stage-node ${isActive ? "stage-node-active" : ""} ${
                      isDone ? "stage-node-done" : ""
                    }`}
                    style={{ "--stage-color": stage.color }}
                  >
                    {stage.short}
                  </button>
                  <div className="text-center font-['Space_Grotesk'] text-[10px] font-semibold text-slate-300">
                    {stage.label}
                    <p className="font-mono text-[10px] text-slate-500">
                      {hasAnalyzed ? `~${stage.duration}ms` : "0ms"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section
          className="panel-glass rounded-2xl border border-slate-700/40 p-4 sm:p-5"
          style={{ boxShadow: `0 0 30px ${currentStage.color}26` }}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="grid h-10 w-10 place-items-center rounded-xl border text-sm font-bold"
                style={{
                  borderColor: `${currentStage.color}88`,
                  color: currentStage.color,
                  boxShadow: `0 0 16px ${currentStage.color}44`
                }}
              >
                {currentStage.short}
              </div>
              <div>
                <p
                  className="font-['Orbitron'] text-xl font-bold"
                  style={{ color: currentStage.color }}
                >
                  {detail.title}
                </p>
                <p className="font-['Share_Tech_Mono'] text-xs text-slate-500">
                  typical: {hasAnalyzed ? `~${detail.durationMs}ms` : "0ms"}
                </p>
              </div>
            </div>
            <div
              className="rounded-full border px-3 py-1 font-['Share_Tech_Mono'] text-xs"
              style={{
                borderColor: `${currentStage.color}66`,
                color: currentStage.color,
                boxShadow: `0 0 12px ${currentStage.color}33`
              }}
            >
              {isRunning ? "in progress" : "ready"}
            </div>
          </div>

          <div className="space-y-2">
            {currentVisibleNotes.map((item, idx) => (
              <div
                key={`${currentStage.short}-${idx}`}
                className="flex items-center justify-between rounded-lg border border-slate-800/90 bg-slate-950/40 px-3 py-2"
              >
                <p className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: currentStage.color }}
                  />
                  {item.left}
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {item.right}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel-glass rounded-2xl border border-slate-700/40 p-4 sm:p-5">
          <div className="mb-4 flex items-end justify-between gap-3">
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-slate-500">
              Timing Waterfall
            </p>
            <p className="font-['Share_Tech_Mono'] text-sm text-cyan-300">
              total: {hasAnalyzed ? `~${totalMs}ms` : "0ms"}
            </p>
          </div>

          <div className="space-y-3">
            {timeline.map((stage, idx) => (
              <div key={`row-${stage.key}`} className="grid grid-cols-[70px_1fr_62px] items-center gap-3 sm:grid-cols-[90px_1fr_70px]">
                <span
                  className="font-['Share_Tech_Mono'] text-xs font-bold uppercase tracking-wider"
                  style={{ color: stage.color, opacity: focusedStage >= idx ? 1 : 0.28 }}
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
                      opacity: focusedStage >= idx ? 1 : 0.2,
                      transform: `scaleX(${barProgress[stage.key] || (!isRunning && focusedStage >= idx ? 1 : 0)})`
                    }}
                  />
                </div>
                <span className="font-['Share_Tech_Mono'] text-right text-xs text-slate-400">
                  {hasAnalyzed && focusedStage >= idx ? `~${stage.duration}ms` : "0ms"}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel-glass rounded-2xl border border-slate-700/40 p-4 sm:p-5">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.35em] text-slate-500">Terminal Log</p>
          <div className="max-h-72 overflow-auto rounded-xl border border-slate-800 bg-black/60 p-4 font-['Share_Tech_Mono'] text-xs leading-6 text-slate-200">
            {visibleLogs.map((entry, index) => (
              <div key={`${entry.text}-${index}`} className="terminal-line">
                {entry.text}
              </div>
            ))}
          </div>
        </section>

        <footer className="pb-2 pt-1 text-center">
          <p className="font-['Share_Tech_Mono'] text-xs tracking-[0.22em] text-slate-500">
            crafted by
            <a
              href="https://muhammadqodir.com"
              target="_blank"
              rel="noreferrer"
              className="ml-2 text-cyan-300 transition hover:text-cyan-200"
            >
              muhammadqodir.com
            </a>
          </p>
        </footer>
      </section>
    </main>
  );
}

export default App;
