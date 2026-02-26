import fs from "fs";
import path from "path";

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

export function dataRootAbs(baseDirAbs) {
  return path.join(baseDirAbs, "data");
}

export function projectsRootAbs(baseDirAbs) {
  return path.join(dataRootAbs(baseDirAbs), "projects");
}

export function projectDirAbs(baseDirAbs, projectId) {
  return path.join(projectsRootAbs(baseDirAbs), String(projectId));
}

export function projectJsonPath(baseDirAbs, projectId) {
  return path.join(projectDirAbs(baseDirAbs, projectId), "project.json");
}

export function runsDirAbs(baseDirAbs, projectId) {
  return path.join(projectDirAbs(baseDirAbs, projectId), "runs");
}

export function runDirAbs(baseDirAbs, projectId, runId) {
  return path.join(runsDirAbs(baseDirAbs, projectId), String(runId));
}

export function runJsonPath(baseDirAbs, projectId, runId) {
  return path.join(runDirAbs(baseDirAbs, projectId, runId), "run.json");
}

export function runLogJsonlPath(baseDirAbs, projectId, runId) {
  return path.join(runDirAbs(baseDirAbs, projectId, runId), "log.jsonl");
}

/**
 * Snapshot artifact path (stored plan subset used for replay)
 */
export function runSnapshotPath(baseDirAbs, projectId, runId) {
  return path.join(runDirAbs(baseDirAbs, projectId, runId), "planSnapshot.json");
}

export function nowIso() {
  return new Date().toISOString();
}

export function newProjectId() {
  return `proj-${Date.now()}`;
}

export function newRunId() {
  return `run-${Date.now()}`;
}

/**
 * Writes JSON atomically by writing a temp file in the same directory then renaming.
 * Renaming within the same directory is the typical atomic update approach. [web:2373]
 */
export function writeJsonAtomic(filePath, obj) {
  ensureDir(path.dirname(filePath));
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), "utf8");
  fs.renameSync(tmp, filePath);
}

export function readJsonIfExists(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

export function appendJsonl(filePath, obj) {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, JSON.stringify(obj) + "\n", "utf8");
}

/**
 * Write snapshot artifact atomically.
 * IMPORTANT: ensure the run directory exists, and don't silently swallow write errors.
 */
export function writeRunSnapshot(baseDirAbs, projectId, runId, snapshotObj) {
  const p = runSnapshotPath(baseDirAbs, projectId, runId);

  try {
    // Ensure run folder exists even if createRun() wasn’t called (defensive).
    ensureDir(runDirAbs(baseDirAbs, projectId, runId));

    // Atomic JSON write (tmp -> rename). fs.writeFileSync/fs.renameSync throw on failure. [web:2485]
    writeJsonAtomic(p, snapshotObj);

    return p;
  } catch (e) {
    // Make failures visible (this is what you need right now).
    console.error("writeRunSnapshot failed:", {
      projectId: String(projectId),
      runId: String(runId),
      path: p,
      error: String(e?.message || e),
    });
    throw e;
  }
}

export function createProject(baseDirAbs, { name = "Untitled Project" } = {}) {
  const projectId = newProjectId();
  const proj = {
    projectId,
    name: String(name || "Untitled Project"),
    createdAt: nowIso(),
  };
  writeJsonAtomic(projectJsonPath(baseDirAbs, projectId), proj);
  ensureDir(runsDirAbs(baseDirAbs, projectId));
  return proj;
}

export function listProjects(baseDirAbs) {
  const root = projectsRootAbs(baseDirAbs);
  ensureDir(root);
  const entries = fs.readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory());
  const out = [];
  for (const e of entries) {
    const p = readJsonIfExists(projectJsonPath(baseDirAbs, e.name));
    if (p?.projectId) out.push(p);
  }
  out.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return out;
}

export function getProject(baseDirAbs, projectId) {
  return readJsonIfExists(projectJsonPath(baseDirAbs, projectId));
}

export function createRun(baseDirAbs, { projectId, planId, prompt, framework, repoId, selectedPaths, jobId } = {}) {
  const runId = newRunId();

  // Ensure run directory exists upfront (helps snapshot + log writers)
  ensureDir(runDirAbs(baseDirAbs, projectId, runId));

  const run = {
    runId,
    projectId,
    planId: String(planId || ""),
    prompt: String(prompt || ""),
    framework: String(framework || ""),
    repoId: repoId ? String(repoId) : "",
    selectedPaths: Array.isArray(selectedPaths) ? selectedPaths.map(String) : [],
    jobId: jobId ? String(jobId) : "",
    status: "queued",
    createdAt: nowIso(),
    endedAt: null,
    previewUrl: "",
    failedReason: "",
  };

  writeJsonAtomic(runJsonPath(baseDirAbs, projectId, runId), run);
  return run;
}

export function updateRun(baseDirAbs, projectId, runId, patch) {
  const p = runJsonPath(baseDirAbs, projectId, runId);
  const cur = readJsonIfExists(p);
  if (!cur) return null;
  const next = { ...cur, ...(patch || {}) };
  writeJsonAtomic(p, next);
  return next;
}

export function listRuns(baseDirAbs, projectId) {
  const dir = runsDirAbs(baseDirAbs, projectId);
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory());
  const out = [];
  for (const e of entries) {
    const r = readJsonIfExists(runJsonPath(baseDirAbs, projectId, e.name));
    if (r?.runId) out.push(r);
  }
  out.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return out;
}

export function getRun(baseDirAbs, projectId, runId) {
  return readJsonIfExists(runJsonPath(baseDirAbs, projectId, runId));
}

export function tailJsonl(filePath, maxLines = 200) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, "utf8");
    const lines = raw.split("\n").filter(Boolean);
    const tail = lines.slice(-maxLines);
    return tail
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}
