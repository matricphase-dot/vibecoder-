import express from "express";
import path from "path";
import fs from "fs";
import OpenAI from "openai";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const WORKSPACE_DIR = path.join(__dirname, "..", "workspace");
const STATE_FILE = path.join(__dirname, "running-jobs.json");

// jobId -> { pid, port, jobDir, previewUrl, createdAt, prompt }
const runningJobs = new Map();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function pickPort() {
  return 5200 + Math.floor(Math.random() * 200);
}

function createSse(res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (event, payload) => {
    if (event) res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  return { send };
}

function runStreaming(cmd, args, cwd, onLine) {
  return new Promise((resolve, reject) => {
    const isWin = process.platform === "win32";
    const fullCmd = isWin ? "cmd.exe" : cmd;
    const fullArgs = isWin ? ["/c", cmd, ...args] : args;

    const child = spawn(fullCmd, fullArgs, { cwd });

    const handle = (chunk) => {
      const s = String(chunk).replace(/\r/g, "");
      s.split("\n").forEach((line) => {
        const t = line.trimEnd();
        if (t) onLine(t);
      });
    };

    child.stdout.on("data", handle);
    child.stderr.on("data", handle);

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

function rmDirSafe(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    return true;
  } catch (_e) {
    return false;
  }
}

// Windows: taskkill /PID <pid> /T /F kills process tree. [web:407]
function killProcessTree(pid) {
  return new Promise((resolve, reject) => {
    if (!pid || typeof pid !== "number") return reject(new Error("Invalid pid"));

    if (process.platform === "win32") {
      const child = spawn("cmd.exe", [
        "/c",
        "taskkill",
        "/PID",
        String(pid),
        "/T",
        "/F",
      ]);

      let out = "";
      child.stdout.on("data", (d) => (out += String(d)));
      child.stderr.on("data", (d) => (out += String(d)));

      child.on("error", reject);
      child.on("close", (code) => resolve({ code, output: out.trim() }));
      return;
    }

    try {
      process.kill(pid);
      resolve({ code: 0, output: "process.kill sent" });
    } catch (e) {
      resolve({ code: 1, output: String(e?.message || e) });
    }
  });
}

function saveState() {
  const arr = Array.from(runningJobs.entries()).map(([jobId, j]) => ({
    jobId,
    pid: j.pid,
    port: j.port,
    jobDir: j.jobDir,
    previewUrl: j.previewUrl,
    createdAt: j.createdAt,
    prompt: j.prompt,
  }));
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(arr, null, 2), "utf8");
  } catch (_e) {}
}

function loadState() {
  try {
    if (!fs.existsSync(STATE_FILE)) return;
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return;

    arr.forEach((x) => {
      if (x && x.jobId && x.pid && x.jobDir) {
        runningJobs.set(String(x.jobId), {
          pid: Number(x.pid),
          port: Number(x.port || 0),
          jobDir: String(x.jobDir),
          previewUrl: String(x.previewUrl || ""),
          createdAt: String(x.createdAt || ""),
          prompt: String(x.prompt || ""),
        });
      }
    });
  } catch (_e) {}
}

function writeAppJsx(jobDir, appJsx) {
  const target = path.join(jobDir, "src", "App.jsx");
  fs.writeFileSync(target, appJsx, "utf8");
}

async function generateAppJsxFromPrompt(prompt) {
  // Keep this tight: only generate src/App.jsx.
  const system = `
You generate ONLY the contents of a React component file for Vite React: src/App.jsx.

Rules:
- Return ONLY valid JavaScript/JSX code (no markdown, no backticks).
- Must export default function App().
- No external libraries (no router, no tailwind, no UI kits).
- Use inline styles for basic layout.
- Must be self-contained and run in a fresh Vite React template.
- Prefer simple state with useState/useMemo/useEffect if needed.
`.trim();

  const user = `User prompt: ${prompt}\n\nGenerate src/App.jsx now.`;

  const resp = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.2,
  });

  const text = resp?.choices?.[0]?.message?.content || "";
  return String(text).trim();
}

// Load persisted jobs
loadState();

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/jobs", (_req, res) => {
  const jobs = Array.from(runningJobs.entries()).map(([jobId, j]) => ({
    jobId,
    pid: j.pid,
    port: j.port,
    previewUrl: j.previewUrl,
    jobDir: j.jobDir,
    createdAt: j.createdAt,
    prompt: j.prompt,
  }));
  res.json({ jobs });
});

app.post("/api/job/stop", async (req, res) => {
  const jobId = req.body && req.body.jobId ? String(req.body.jobId) : "";
  const cleanup = Boolean(req.body && req.body.cleanup);

  if (!jobId) return res.status(400).json({ error: "jobId is required" });

  const job = runningJobs.get(jobId);
  if (!job) return res.status(404).json({ error: "job not found" });

  const killResult = await killProcessTree(job.pid);

  let removed = false;
  if (cleanup) {
    removed = rmDirSafe(job.jobDir);
  }

  runningJobs.delete(jobId);
  saveState();

  res.json({
    ok: true,
    jobId,
    killedPid: job.pid,
    previewUrl: job.previewUrl,
    cleanup,
    workspaceRemoved: removed,
    killResult,
  });
});

// LLM-powered build (SSE)
app.get("/api/build/stream", async (req, res) => {
  const { send } = createSse(res);

  let aborted = false;
  req.on("close", () => {
    aborted = true;
  });

  const prompt = String(req.query.prompt || "");
  const port = pickPort();

  try {
    if (!process.env.OPENAI_API_KEY) {
      send("error", { message: "OPENAI_API_KEY missing in backend environment." });
      res.end();
      return;
    }

    ensureDir(WORKSPACE_DIR);

    const jobId = `job-${Date.now()}`;
    const jobDir = path.join(WORKSPACE_DIR, jobId);
    ensureDir(jobDir);

    send("log", { line: `Backend: jobId=${jobId}` });
    send("log", { line: `Backend: prompt length=${prompt.length}` });
    send("log", { line: "Backend: scaffolding Vite (react) ..." });

    if (aborted) return;

    await runStreaming(
      "npm",
      ["create", "vite@latest", ".", "--", "--template", "react"],
      jobDir,
      (line) => send("log", { line })
    );

    if (aborted) return;

    send("log", { line: "Backend: npm install ..." });
    await runStreaming("npm", ["install"], jobDir, (line) =>
      send("log", { line })
    );

    if (aborted) return;

    send("log", { line: "Backend: generating src/App.jsx with OpenAI ..." });
    const appJsx = await generateAppJsxFromPrompt(prompt);

    if (!appJsx || !appJsx.includes("export default function App")) {
      throw new Error("Model returned invalid App.jsx (missing export default function App).");
    }

    writeAppJsx(jobDir, appJsx);

    send("log", { line: "Backend: verifying (npm run build) ..." });
    await runStreaming("npm", ["run", "build"], jobDir, (line) =>
      send("log", { line })
    );

    if (aborted) return;

    send("log", { line: `Backend: starting dev server on port ${port} ...` });

    const isWin = process.platform === "win32";
    const fullCmd = isWin ? "cmd.exe" : "npm";
    const fullArgs = isWin
      ? ["/c", "npm", "run", "dev", "--", "--port", String(port)]
      : ["run", "dev", "--", "--port", String(port)];

    const child = spawn(fullCmd, fullArgs, {
      cwd: jobDir,
      detached: true,
      stdio: "ignore",
    });
    child.unref();

    const previewUrl = `http://127.0.0.1:${port}/`;

    runningJobs.set(jobId, {
      pid: child.pid,
      port,
      jobDir,
      previewUrl,
      createdAt: new Date().toISOString(),
      prompt,
    });
    saveState();

    send("log", { line: `Backend: previewUrl=${previewUrl}` });
    send("done", { ok: true, jobId, previewUrl });
    res.end();
  } catch (e) {
    send("error", { message: String(e?.message || e) });
    res.end();
  }
});

const PORT = 8787;
app.listen(PORT, "127.0.0.1", () => {
  console.log(`Backend listening on http://127.0.0.1:${PORT}`);
  console.log(`Loaded jobs from: ${STATE_FILE}`);
});
