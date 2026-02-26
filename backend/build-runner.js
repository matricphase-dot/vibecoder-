import path from "path";
import fs from "fs";
import { spawn } from "node:child_process";
import { createTwoFilesPatch } from "diff";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

export function writeFileSafe(rootDir, relPath, content) {
  const full = path.join(rootDir, relPath);
  ensureDir(path.dirname(full));
  fs.writeFileSync(full, content, "utf8");
}

export function readTextIfExists(filePath) {
  try {
    if (!fs.existsSync(filePath)) return "";
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

export function unifiedDiff(oldText, newText, relPath) {
  return createTwoFilesPatch(
    `a/${relPath}`,
    `b/${relPath}`,
    oldText || "",
    newText || "",
    "",
    "",
    { context: 3 }
  );
}

export function parseSelectedPaths(raw) {
  if (!raw) return null;
  try {
    const arr = JSON.parse(String(raw));
    if (!Array.isArray(arr)) return null;
    const cleaned = arr
      .map((x) => String(x))
      .filter((p) => p && !p.startsWith("..") && !path.isAbsolute(p) && !p.includes(".."));
    return cleaned.length ? cleaned : null;
  } catch {
    return null;
  }
}

export function planFilePath(plansDir, planId) {
  return path.join(plansDir, `${planId}.json`);
}

export function loadPlan(plansDir, planId) {
  const p = planFilePath(plansDir, planId);
  if (!fs.existsSync(p)) throw new Error("Plan not found (expired or deleted).");
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

export function pickPort() {
  return 5200 + Math.floor(Math.random() * 200);
}

export function runStreaming(cmd, args, cwd, onLine) {
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

export async function scaffoldProject(baseDir, framework, log) {
  if (framework === "vite-react") {
    log("Scaffold: Vite React template...");
    await runStreaming(
      "npm",
      ["create", "vite@latest", ".", "--", "--template", "react"],
      baseDir,
      log
    );
    return baseDir;
  }

  if (framework === "nextjs") {
    log("Scaffold: Next.js (create-next-app)...");
    const sub = path.join(baseDir, "next-app");
    ensureDir(sub);

    await runStreaming(
      "npx",
      [
        "create-next-app@latest",
        ".",
        "--js",
        "--eslint",
        "--app",
        "--no-tailwind",
        "--no-src-dir",
        "--no-import-alias",
      ],
      sub,
      log
    );

    return sub;
  }

  throw new Error("Unsupported framework");
}

export async function npmInstall(cwd, log) {
  log("Install: npm install ...");
  await runStreaming("npm", ["install"], cwd, log);
}

export async function npmBuild(cwd, log) {
  log("Build: npm run build ...");
  await runStreaming("npm", ["run", "build"], cwd, log);
}

export function startDevServer(cwd, port, log) {
  log(`Run: starting dev server on port ${port} ...`);

  const isWin = process.platform === "win32";
  const fullCmd = isWin ? "cmd.exe" : "npm";
  const fullArgs = isWin
    ? ["/c", "npm", "run", "dev", "--", "--port", String(port)]
    : ["run", "dev", "--", "--port", String(port)];

  const child = spawn(fullCmd, fullArgs, { cwd, detached: true, stdio: "ignore" });
  child.unref();

  return { pid: child.pid, previewUrl: `http://127.0.0.1:${port}/` };
}

// optional: one auto-fix pass (same logic you had in server.js)
export async function tryOneAutofix({ framework, prompt, filesToApply, jobDir, buildOut, log }) {
  log("Build failed. Attempting one auto-fix (patch allowed files)...");

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
    log(`Patched: ${p}`);
  }
}
