import { appendJsonl, nowIso, runLogJsonlPath } from "./projectsStore.js";

export function logRunEvent(baseDirAbs, { projectId, runId, type, line, data }) {
  if (!projectId || !runId) return;
  const p = runLogJsonlPath(baseDirAbs, projectId, runId);
  appendJsonl(p, {
    t: nowIso(),
    type: String(type || "log"),
    line: line != null ? String(line) : undefined,
    data: data !== undefined ? data : undefined,
  });
}
