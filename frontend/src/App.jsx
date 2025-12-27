import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "vibe_recent_jobs_v1";

function loadJobs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_e) {
    return [];
  }
}

function saveJobs(jobs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}

export default function App() {
  const [prompt, setPrompt] = useState(
    "Build a counter app with plus and minus buttons"
  );
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | running | done
  const [previewUrl, setPreviewUrl] = useState("");
  const [jobs, setJobs] = useState(() => loadJobs());

  useEffect(() => {
    saveJobs(jobs);
  }, [jobs]);

  const canBuild = prompt.trim().length > 0 && status !== "running";

  const onBuild = async () => {
    setStatus("running");
    setPreviewUrl("");
    setLogs((l) => [
      ...l,
      `User prompt: ${prompt}`,
      "Connecting stream: /api/build/stream ...",
    ]);

    const url = `/api/build/stream?prompt=${encodeURIComponent(prompt)}`;
    const es = new EventSource(url);

    es.addEventListener("log", (e) => {
      const msg = JSON.parse(e.data);
      setLogs((l) => [...l, msg.line]);
    });

    es.addEventListener("done", (e) => {
      const msg = JSON.parse(e.data);
      es.close();

      const nextPreviewUrl = msg.previewUrl ? String(msg.previewUrl) : "";
      if (nextPreviewUrl) {
        setPreviewUrl(nextPreviewUrl);
        setLogs((l) => [...l, `Preview: ${nextPreviewUrl}`]);
      }

      const job = {
        jobId: msg.jobId ? String(msg.jobId) : `job-${Date.now()}`,
        prompt,
        previewUrl: nextPreviewUrl,
        time: new Date().toISOString(),
        status: "running", // running | stopped
      };

      setJobs((prev) => {
        const filtered = prev.filter((j) => j.jobId !== job.jobId);
        const merged = [job, ...filtered];
        return merged.slice(0, 10);
      });

      setLogs((l) => [...l, "Done."]);
      setStatus("done");
    });

    es.addEventListener("error", () => {
      es.close();
      setLogs((l) => [...l, "Stream error (check backend terminal)."]);
      setStatus("idle");
    });
  };

  const clearJobs = () => {
    setJobs([]);
    setLogs((l) => [...l, "Cleared recent jobs."]);
  };

  const stopJob = async (jobId) => {
    setLogs((l) => [...l, `Stopping job: ${jobId} ...`]);

    try {
      const res = await fetch("/api/job/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, cleanup: true }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setLogs((l) => [
          ...l,
          `Stop failed: ${data?.error || `HTTP ${res.status}`}`,
        ]);
        return;
      }

      setLogs((l) => [
        ...l,
        `Stopped ${jobId}. cleanup=${String(data.cleanup)} removed=${String(
          data.workspaceRemoved
        )}`,
      ]);

      setJobs((prev) =>
        prev.map((j) =>
          j.jobId === jobId ? { ...j, status: "stopped" } : j
        )
      );
    } catch (e) {
      setLogs((l) => [...l, `Stop network error: ${String(e)}`]);
    }
  };

  const header = useMemo(() => {
    return status === "running" ? "Building…" : "Vibe Coding Prototype";
  }, [status]);

  return (
    <div
      style={{
        fontFamily: "system-ui, Arial",
        maxWidth: 980,
        margin: "40px auto",
        padding: 16,
      }}
    >
      <h1 style={{ marginBottom: 6 }}>{header}</h1>
      <p style={{ marginTop: 0, color: "#555" }}>
        Prompt → SSE logs → preview URL, with stop/cleanup controls.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}>
        <div>
          <label style={{ display: "block", marginBottom: 8 }}>Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            style={{ width: "100%", padding: 12, fontSize: 14 }}
          />

          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={onBuild}
              disabled={!canBuild}
              style={{ padding: "10px 14px" }}
            >
              Build
            </button>

            <span style={{ color: "#666" }}>Status: {status}</span>

            {previewUrl ? (
              <a href={previewUrl} target="_blank" rel="noreferrer">
                Open preview
              </a>
            ) : null}
          </div>

          <h3 style={{ marginTop: 24, marginBottom: 8 }}>Logs</h3>
          <div
            style={{
              background: "#0b1020",
              color: "#d7e1ff",
              padding: 12,
              borderRadius: 8,
              minHeight: 220,
              whiteSpace: "pre-wrap",
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
              fontSize: 13,
            }}
          >
            {logs.length ? (
              logs.map((line, i) => <div key={i}>{line}</div>)
            ) : (
              <div>(No logs yet)</div>
            )}
          </div>
        </div>

        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <h3 style={{ margin: 0 }}>Recent jobs</h3>
            <button onClick={clearJobs} style={{ padding: "6px 10px" }}>
              Clear
            </button>
          </div>

          <div style={{ marginTop: 10 }}>
            {jobs.length === 0 ? (
              <div style={{ color: "#666" }}>(No jobs yet)</div>
            ) : (
              jobs.map((j) => (
                <div
                  key={j.jobId}
                  style={{
                    border: "1px solid #e5e5e5",
                    borderRadius: 8,
                    padding: 10,
                    marginBottom: 10,
                    background: "white",
                  }}
                >
                  <div style={{ fontSize: 12, color: "#666" }}>
                    {j.time} — {j.jobId}
                  </div>

                  <div style={{ marginTop: 6, fontSize: 13 }}>{j.prompt}</div>

                  <div style={{ marginTop: 8, display: "flex", gap: 10 }}>
                    {j.previewUrl ? (
                      <a href={j.previewUrl} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    ) : (
                      <span style={{ color: "#999" }}>(No preview URL)</span>
                    )}

                    <button
                      onClick={() => stopJob(j.jobId)}
                      disabled={j.status === "stopped"}
                      style={{ padding: "4px 8px" }}
                    >
                      {j.status === "stopped" ? "Stopped" : "Stop + cleanup"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
