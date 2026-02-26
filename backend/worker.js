import "dotenv/config";
import path from "path";
import fs from "fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Worker } from "bullmq";
import { appendLog } from "./logs.js";
import OpenAI from "openai";

import { runSnapshotPath } from "./projectsStore.js";

const connection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT || 6379),
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKSPACE_DIR = path.join(__dirname, "..", "workspace");
const PLANS_DIR = path.join(__dirname, "..", "plans");
const STATE_FILE = path.join(__dirname, "running-jobs.json");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeFileSafe(rootDir, relPath, content) {
  const full = path.join(rootDir, relPath);
  ensureDir(path.dirname(full));
  fs.writeFileSync(full, content, "utf8");
}

function readTextIfExists(filePath) {
  try {
    if (!fs.existsSync(filePath)) return "";
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function pickPort() {
  return 5200 + Math.floor(Math.random() * 200);
}

function runStreaming(cmd, args, cwd, onLine) {
  return new Promise((resolve, reject) => {
    const isWin = process.platform === "win32";
    const fullCmd = isWin ? "cmd.exe" : cmd;
    const fullArgs = isWin ? ["/c", cmd, ...args] : args;

    const child = spawn(fullCmd, fullArgs, { cwd });

    let collected = "";

    const handle = (chunk) => {
      const s = String(chunk).replace(/\r/g, "");
      collected += s;
      s.split("\n").forEach((line) => {
        const t = line.trimEnd();
        if (t) onLine(t);
      });
    };

    child.stdout.on("data", handle);
    child.stderr.on("data", handle);

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ code, output: collected });
      else {
        const err = new Error(`${cmd} exited with code ${code}`);
        err.code = code;
        err.output = collected;
        reject(err);
      }
    });
  });
}

async function scaffoldProject(baseDir, framework, logLine) {
  if (framework === "vite-react") {
    logLine("Scaffold: Vite React template...");
    await runStreaming("npm", ["create", "vite@latest", ".", "--", "--template", "react"], baseDir, logLine);
    return baseDir;
  }

  if (framework === "nextjs") {
    logLine("Scaffold: Next.js (create-next-app)...");
    const sub = path.join(baseDir, "next-app");
    ensureDir(sub);

    await runStreaming(
      "npx",
      ["create-next-app@latest", ".", "--js", "--eslint", "--app", "--no-tailwind", "--no-src-dir", "--no-import-alias"],
      sub,
      logLine
    );

    return sub;
  }

  throw new Error("Unsupported framework");
}

async function npmInstall(cwd, logLine) {
  logLine("Install: npm install ...");
  await runStreaming("npm", ["install"], cwd, logLine);
}

async function npmBuild(cwd, logLine) {
  logLine("Build: npm run build ...");
  await runStreaming("npm", ["run", "build"], cwd, logLine);
}

function startDevServer(cwd, port, logLine) {
  logLine(`Run: starting dev server on port ${port} ...`);

  const isWin = process.platform === "win32";
  const fullCmd = isWin ? "cmd.exe" : "npm";
  const fullArgs = isWin
    ? ["/c", "npm", "run", "dev", "--", "--port", String(port)]
    : ["run", "dev", "--", "--port", String(port)];

  const child = spawn(fullCmd, fullArgs, { cwd, detached: true, stdio: "ignore" });
  child.unref();

  return { pid: child.pid, previewUrl: `http://127.0.0.1:${port}/` };
}

function loadPlan(planId) {
  const p = path.join(PLANS_DIR, `${planId}.json`);
  if (!fs.existsSync(p)) throw new Error(`Plan not found: ${p}`);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function loadSnapshotPlan({ projectId, snapshotFromRunId }) {
  const p = runSnapshotPath(__dirname, projectId, snapshotFromRunId);
  if (!fs.existsSync(p)) throw new Error(`Snapshot not found: ${p}`);
  const snap = JSON.parse(fs.readFileSync(p, "utf8"));
  if (!snap || !Array.isArray(snap.files)) throw new Error("Invalid snapshot format");
  return {
    planId: snap.planId || "__snapshot__",
    framework: snap.framework,
    prompt: snap.prompt,
    files: snap.files,
  };
}

function parseSelectedPaths(arr) {
  if (!arr) return null;
  if (!Array.isArray(arr)) return null;
  const cleaned = arr
    .map((x) => String(x))
    .filter((p) => p && !p.startsWith("..") && !path.isAbsolute(p) && !p.includes(".."));
  return cleaned.length ? cleaned : null;
}

function upsertRunningJob(entry) {
  try {
    let arr = [];
    if (fs.existsSync(STATE_FILE)) {
      arr = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
      if (!Array.isArray(arr)) arr = [];
    }
    const idx = arr.findIndex((x) => x && String(x.jobId) === String(entry.jobId));
    if (idx >= 0) arr[idx] = entry;
    else arr.push(entry);
    fs.writeFileSync(STATE_FILE, JSON.stringify(arr, null, 2), "utf8");
  } catch {}
}

async function tryOneAutofix({ framework, prompt, filesToApply, jobDir, buildOut, logLine }) {
  logLine("Build failed. Attempting one auto-fix (patch allowed files)...");

  const allowed = filesToApply.map((f) => f.path);
  const currentFiles = filesToApply.map((f) => ({
    path: f.path,
    content: readTextIfExists(path.join(jobDir, f.path)),
  }));

  const system = `
You are fixing a JavaScript project build error.

Output ONLY JSON:
{ "files": [ { "path": string, "content": string } ] }

Rules:
- Only modify files in Allowed files.
- Do not add new files.
- Keep changes minimal.
`.trim();

  const user =
    `Framework: ${framework}\n` +
    `User goal: ${prompt}\n\n` +
    `Allowed files:\n${JSON.stringify(allowed, null, 2)}\n\n` +
    `Current files:\n${JSON.stringify(currentFiles, null, 2)}\n\n` +
    `Build error output:\n${buildOut}`;

  const resp = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.1,
  });

  const text = String(resp?.choices?.[0]?.message?.content || "").trim();
  let patch;
  try {
    patch = JSON.parse(text);
  } catch {
    throw new Error("Auto-fix returned non-JSON.");
  }

  const patchFiles = Array.isArray(patch.files) ? patch.files : [];
  for (const pf of patchFiles) {
    const p = String(pf.path || "");
    if (!allowed.includes(p)) continue;
    writeFileSafe(jobDir, p, String(pf.content || ""));
    logLine(`Patched: ${p}`);
  }
}

async function runApplyPlan(job) {
  const planId = String(job.data?.planId || "");
  const selectedPaths = parseSelectedPaths(job.data?.selectedPaths);
  const projectId = job.data?.projectId ? String(job.data.projectId) : "";
  const snapshotFromRunId = job.data?.snapshotFromRunId ? String(job.data.snapshotFromRunId) : "";

  if (!planId) throw new Error("applyPlan: planId is required");

  await appendLog(job.id, `applyPlan: planId=${planId}`);

  // Load plan either from PLANS_DIR or from run snapshot
  let plan;
  if (planId === "__snapshot__") {
    if (!projectId || !snapshotFromRunId) throw new Error("applyPlan: missing projectId or snapshotFromRunId");
    plan = loadSnapshotPlan({ projectId, snapshotFromRunId });
    await appendLog(job.id, `applyPlan: loaded snapshot from run=${snapshotFromRunId}`);
  } else {
    plan = loadPlan(planId);
  }

  await appendLog(job.id, `applyPlan: framework=${plan.framework}`);

  const filesToApply = selectedPaths ? plan.files.filter((f) => selectedPaths.includes(f.path)) : plan.files;

  if (selectedPaths && filesToApply.length === 0) {
    throw new Error("applyPlan: No valid selectedPaths matched plan files.");
  }

  ensureDir(WORKSPACE_DIR);
  const runId = `job-${Date.now()}-${job.id}`;
  const baseJobDir = path.join(WORKSPACE_DIR, runId);
  ensureDir(baseJobDir);

  await appendLog(job.id, `applyPlan: workspace=${baseJobDir}`);

  const logLine = (line) => appendLog(job.id, line);

  const jobDir = await scaffoldProject(baseJobDir, plan.framework, logLine);

  await appendLog(job.id, `applyPlan: writing ${filesToApply.length} file(s)...`);
  for (const f of filesToApply) {
    writeFileSafe(jobDir, f.path, f.content);
    await appendLog(job.id, `Wrote: ${f.path}`);
  }

  await npmInstall(jobDir, logLine);

  try {
    await npmBuild(jobDir, logLine);
  } catch (err) {
    const buildOut = String(err && err.output ? err.output : err);
    await tryOneAutofix({
      framework: plan.framework,
      prompt: plan.prompt,
      filesToApply,
      jobDir,
      buildOut,
      logLine,
    });
    await appendLog(job.id, "Retry build...");
    await npmBuild(jobDir, logLine);
  }

  const port = pickPort();
  const { pid, previewUrl } = startDevServer(jobDir, port, logLine);

  upsertRunningJob({
    jobId: String(job.id),
    pid,
    port,
    jobDir,
    previewUrl,
    createdAt: new Date().toISOString(),
    prompt: String(plan.prompt || ""),
    source: "queue",
  });

  await appendLog(job.id, `applyPlan: previewUrl=${previewUrl}`);
  await appendLog(job.id, "applyPlan: done");

  // BullMQ job.returnvalue [web:2118]
  return { ok: true, planId, pid, port, previewUrl, jobDir };
}

async function runTest(job) {
  await appendLog(job.id, `Worker started: jobId=${job.id} name=${job.name}`);
  await appendLog(job.id, `Payload: ${JSON.stringify(job.data || {})}`);
  await appendLog(job.id, "Worker done.");
  return { ok: true };
}

new Worker(
  "vibe-builds",
  async (job) => {
    const timeoutMs = Number(process.env.WORKER_TIMEOUT_MS || 20 * 60 * 1000);

    const task = async () => {
      if (job.name === "applyPlan") return await runApplyPlan(job);
      return await runTest(job);
    };

    return await Promise.race([
      task(),
      new Promise((_, rej) => setTimeout(() => rej(new Error("Worker timeout")), timeoutMs)),
    ]);
  },
  { connection, concurrency: Number(process.env.WORKER_CONCURRENCY || 1) }
);
