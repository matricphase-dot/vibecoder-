import { useMemo, useRef, useState } from "react";
import "./App.css";

const API_BASE = "http://127.0.0.1:8787";
const TOKEN = ""; // optional: put BUILD_TOKEN here if you enabled it

async function apiFetch(path, { method = "GET", body } = {}) {
  const url = new URL(API_BASE + path);

  if (TOKEN) url.searchParams.set("token", TOKEN);

  const res = await fetch(url.toString(), {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const msg = typeof data === "string" ? data : data?.error || data?.message || "Request failed";
    throw new Error(msg);
  }

  return data;
}

export default function App() {
  const [prompt, setPrompt] = useState("Build a simple landing page with a hero and CTA button.");
  const [framework, setFramework] = useState("vite-react");

  const [planId, setPlanId] = useState("");
  const [queueJobId, setQueueJobId] = useState("");

  const [status, setStatus] = useState("idle");
  const [previewUrl, setPreviewUrl] = useState("");

  const [logs, setLogs] = useState([]);
  const esRef = useRef(null);
  const pollRef = useRef(null);

  const canStart = useMemo(() => prompt.trim().length > 0 && status !== "running", [prompt, status]);

  function addLog(line) {
    setLogs((prev) => [...prev, line]);
  }

  function stopStreams() {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function onStart() {
    stopStreams();
    setLogs([]);
    setPlanId("");
    setQueueJobId("");
    setPreviewUrl("");
    setStatus("running");

    try {
      addLog("Planning...");
      const planRes = await apiFetch("/api/plan", {
        method: "POST",
        body: { prompt, framework },
      });

      setPlanId(planRes.planId);
      addLog(`Plan created: ${planRes.planId}`);

      addLog("Queueing apply...");
      const applyRes = await apiFetch("/api/queue/apply", {
        method: "POST",
        body: { planId: planRes.planId },
      });

      const jobId = String(applyRes.jobId);
      setQueueJobId(jobId);
      addLog(`Queued applyPlan jobId=${jobId}`);

      // SSE logs
      const logUrl = new URL(`${API_BASE}/api/job/logs/stream`);
      logUrl.searchParams.set("jobId", jobId);
      if (TOKEN) logUrl.searchParams.set("token", TOKEN);

      const es = new EventSource(logUrl.toString());
      esRef.current = es;

      es.addEventListener("log", (e) => {
        try {
          const obj = JSON.parse(e.data);
          if (obj?.line) addLog(obj.line);
        } catch {
          addLog(String(e.data || ""));
        }
      });

      es.addEventListener("error", () => {
        // EventSource auto-reconnects by default; keep it simple here. [web:1254]
      });

      // Poll status for previewUrl
      pollRef.current = setInterval(async () => {
        try {
          const st = await apiFetch(`/api/queue/status?jobId=${encodeURIComponent(jobId)}`);
          const state = st.state;

          if (state === "failed") {
            setStatus("failed");
            addLog(`FAILED: ${st.failedReason || "Unknown error"}`);
            stopStreams();
          }

          if (state === "completed") {
            const url = st.returnvalue?.previewUrl || "";
            if (url) {
              setPreviewUrl(url);
              setStatus("done");
              addLog(`DONE: ${url}`);
              stopStreams();
            }
          }
        } catch (err) {
          // ignore transient polling errors
        }
      }, 1000);
    } catch (e) {
      setStatus("failed");
      addLog(`ERROR: ${String(e?.message || e)}`);
      stopStreams();
    }
  }

  async function onStop() {
    if (!queueJobId) return;
    try {
      addLog(`Stopping job ${queueJobId}...`);
      await apiFetch("/api/queue/stop", {
        method: "POST",
        body: { jobId: queueJobId, cleanup: true },
      });
      addLog("Stopped.");
    } catch (e) {
      addLog(`Stop error: ${String(e?.message || e)}`);
    } finally {
      setStatus("idle");
      stopStreams();
    }
  }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 20, fontFamily: "system-ui, Arial" }}>
      <h1>Vibe Coding Platform</h1>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label>
          Framework:&nbsp;
          <select value={framework} onChange={(e) => setFramework(e.target.value)}>
            <option value="vite-react">vite-react</option>
            <option value="nextjs">nextjs</option>
          </select>
        </label>

        <button onClick={onStart} disabled={!canStart}>
          Start build
        </button>

        <button onClick={onStop} disabled={!queueJobId || status !== "running"}>
          Stop build
        </button>

        {previewUrl ? (
          <a href={previewUrl} target="_blank" rel="noreferrer">
            Open preview
          </a>
        ) : null}
      </div>

      <div style={{ marginTop: 12 }}>
        <textarea
          rows={5}
          style={{ width: "100%" }}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div><b>Status:</b> {status}</div>
          <div>planId: {planId || "-"}</div>
          <div>jobId: {queueJobId || "-"}</div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Logs</div>
        <pre
          style={{
            background: "#0b1020",
            color: "#d7e1ff",
            padding: 12,
            borderRadius: 8,
            minHeight: 220,
            maxHeight: 420,
            overflow: "auto",
            fontSize: 12,
          }}
        >
          {logs.join("\n")}
        </pre>
      </div>
    </div>
  );
}
