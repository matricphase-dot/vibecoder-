import fs from "node:fs";
import path from "node:path";

const fsp = fs.promises;

const DEFAULTS = {
  maxFiles: 12,
  maxChars: 60000,
  maxFileChars: 12000,
  headChars: 3000,
  tailChars: 2000,
};

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".turbo",
  ".cache",
  "coverage",
  ".vite",
]);

const IGNORE_FILES_SUFFIX = [
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico",
  ".zip", ".tar", ".gz", ".7z",
  ".mp4", ".mp3", ".mov",
  ".pdf",
];

function looksBinaryByExt(relPath) {
  const p = String(relPath || "").toLowerCase();
  return IGNORE_FILES_SUFFIX.some((s) => p.endsWith(s));
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9_./-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => t.length >= 2 && t.length <= 32);
}

function scorePath(relPath, promptTokens) {
  const p = String(relPath || "").toLowerCase();
  const base = path.posix.basename(p);

  let score = 0;

  if (base === "package.json") score += 8;
  if (base === "readme.md" || base === "readme") score += 6;
  if (base.endsWith(".env.example")) score += 4;
  if (base === "vite.config.js" || base === "vite.config.ts") score += 4;
  if (base === "next.config.js" || base === "next.config.mjs") score += 4;
  if (base === "server.js" || base === "worker.js") score += 3;

  for (const t of promptTokens) {
    if (p.includes(t)) score += 2;
  }

  score += Math.max(0, 2 - Math.floor(p.length / 60));
  return score;
}

async function listFilesRecursive(rootAbs, rel = "") {
  const abs = path.join(rootAbs, rel);
  const entries = await fsp.readdir(abs, { withFileTypes: true });

  const out = [];
  for (const ent of entries) {
    if (ent.isDirectory()) {
      if (IGNORE_DIRS.has(ent.name)) continue;
      if (ent.name.startsWith(".")) continue;
      out.push(...(await listFilesRecursive(rootAbs, path.join(rel, ent.name))));
      continue;
    }

    if (!ent.isFile()) continue;

    const relPath = path.posix.normalize(path.join(rel, ent.name).replaceAll("\\", "/"));
    if (looksBinaryByExt(relPath)) continue;

    out.push(relPath);
  }
  return out;
}

async function readTextFileSafe(absPath, maxBytes = 1024 * 1024) {
  const st = await fsp.stat(absPath);
  const size = st.size || 0;
  const toRead = Math.min(size, maxBytes);

  const fd = await fsp.open(absPath, "r");
  try {
    const buf = Buffer.alloc(toRead);
    await fd.read(buf, 0, toRead, 0);

    const slice = buf.subarray(0, Math.min(4096, buf.length));
    let nul = 0;
    for (const b of slice) if (b === 0) nul++;
    if (nul > 0) return null;

    return buf.toString("utf8");
  } finally {
    await fd.close();
  }
}

function snippet(text, maxFileChars, headChars, tailChars) {
  const s = String(text || "");
  if (s.length <= maxFileChars) return s;
  const head = s.slice(0, headChars);
  const tail = s.slice(Math.max(0, s.length - tailChars));
  return `${head}\n\n/* ...snip... (${s.length - head.length - tail.length} chars omitted) ... */\n\n${tail}`;
}

export async function buildContextPack({ rootAbs, prompt, pinnedPaths = [], opts = {} }) {
  const cfg = { ...DEFAULTS, ...opts };
  const promptTokens = tokenize(prompt);

  const allFiles = await listFilesRecursive(rootAbs);

  const pinnedSet = new Set((pinnedPaths || []).map((p) => String(p).replaceAll("\\", "/")));

  const candidates = allFiles.map((relPath) => ({
    relPath,
    pinned: pinnedSet.has(relPath),
    score: 0,
  }));

  for (const c of candidates) {
    c.score = scorePath(c.relPath, promptTokens) + (c.pinned ? 1000 : 0);
  }

  candidates.sort((a, b) => b.score - a.score);

  const picked = [];
  let totalChars = 0;

  for (const c of candidates) {
    if (picked.length >= cfg.maxFiles) break;
    if (totalChars >= cfg.maxChars) break;
    if (!c.pinned && c.score <= 0) continue;

    const absPath = path.join(rootAbs, c.relPath);

    let txt = null;
    try {
      txt = await readTextFileSafe(absPath);
    } catch {
      txt = null;
    }
    if (!txt) continue;

    const snip = snippet(txt, cfg.maxFileChars, cfg.headChars, cfg.tailChars);
    if (totalChars + snip.length > cfg.maxChars && picked.length > 0) break;

    picked.push({
      path: c.relPath,
      content: snip,
      score: c.score,
      reason: c.pinned ? "Pinned by user" : "Path/token match + common entrypoint boost",
    });

    totalChars += snip.length;
  }

  return { files: picked, totalChars, counts: { allFiles: allFiles.length } };
}
