import { promises as fs } from "node:fs";
import * as nodePath from "node:path";
import os from "node:os";
import {
  API_PATH,
  CATALOG_URL,
  PAGE_SIZE,
  parsePatchIds,
  parsePresetPluginIds,
  filterCatalog,
  summarizePlugin,
} from "./parse.js";

export const name = "shichang";
export const inject = ["connection"];

const CACHE_MS = 15 * 60 * 1000;
let catalogCache = null;

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function fail(status, error) {
  return jsonResponse(status, { ok: false, error });
}

function dshHome() {
  return process.env.DSH_HOME || nodePath.join(os.homedir(), ".dsh");
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return null;
  }
}

async function listInstalled() {
  const home = dshHome();
  const pluginsDir = nodePath.join(home, "plugins");
  const patchFile = nodePath.join(home, "profiles", "desktop", "cordis.patch.yml");
  let patchIds = [];
  try {
    patchIds = parsePatchIds(await fs.readFile(patchFile, "utf8"));
  } catch {
    patchIds = [];
  }
  const loaded = new Set(patchIds);
  const presetIds = [];
  const presetsDir = nodePath.join(home, ".agent-presets");
  try {
    const presetNames = await fs.readdir(presetsDir);
    for (const presetId of presetNames) {
      const composition = nodePath.join(presetsDir, presetId, "agent.cordis.yml");
      try {
        const ids = parsePresetPluginIds(await fs.readFile(composition, "utf8"));
        for (const id of ids) {
          loaded.add(id);
          if (!presetIds.includes(id)) presetIds.push(id);
        }
      } catch {
        // missing composition
      }
    }
  } catch {
    // no user presets
  }
  const plugins = [];
  let names = [];
  try {
    names = await fs.readdir(pluginsDir);
  } catch {
    names = [];
  }
  const seen = new Set();
  for (const id of names) {
    const dir = nodePath.join(pluginsDir, id);
    let st;
    try {
      st = await fs.stat(dir);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;
    const pkg = await readJson(nodePath.join(dir, "package.json"));
    const item = {
      id,
      name: (pkg && pkg.name) || id,
      version: (pkg && pkg.version) || "",
      description: (pkg && pkg.description) || "",
      path: dir,
      loaded: loaded.has(id),
      via: patchIds.includes(id) ? "patch" : (presetIds.includes(id) ? "preset" : ""),
      source: "local",
    };
    plugins.push(item);
    seen.add(id);
  }
  for (const id of patchIds) {
    if (seen.has(id)) continue;
    plugins.push({
      id,
      name: id,
      version: "",
      description: "已写入 desktop patch，目录不存在",
      path: "",
      loaded: true,
      via: "patch",
      source: "patch",
    });
  }
  plugins.sort((a, b) => a.id.localeCompare(b.id));
  return { home, pluginsDir, patchFile, plugins };
}

async function loadCatalog() {
  const now = Date.now();
  if (catalogCache && now - catalogCache.at < CACHE_MS) return catalogCache.data;
  const res = await fetch(CATALOG_URL, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error("catalog http " + res.status);
  const data = await res.json();
  catalogCache = { at: now, data };
  return data;
}

export function apply(ctx) {
  ctx.connection.fetch.register({
    path: API_PATH,
    methods: ["GET"],
    requestBody: "buffered",
    fetch: async (request) => {
      try {
        const url = new URL(request.url);
        const action = url.searchParams.get("action") || "installed";
        if (action === "installed") {
          const listed = await listInstalled();
          return jsonResponse(200, { ok: true, ...listed });
        }
        if (action === "catalog") {
          const data = await loadCatalog();
          const raw = Array.isArray(data.plugins) ? data.plugins : [];
          const page = filterCatalog(raw, {
            q: url.searchParams.get("q") || "",
            category: url.searchParams.get("category") || "",
            sort: url.searchParams.get("sort") || "stars",
            page: url.searchParams.get("page") || "1",
            limit: url.searchParams.get("limit") || String(PAGE_SIZE),
          });
          return jsonResponse(200, {
            ok: true,
            source: data.url || CATALOG_URL,
            updated: data.updated || "",
            count: data.count || raw.length,
            categories: data.categories || {},
            total: page.total,
            page: page.page,
            limit: page.limit,
            sort: page.sort,
            plugins: page.plugins.map(summarizePlugin).filter(Boolean),
          });
        }
        return fail(400, "unknown action");
      } catch (error) {
        const message = error && error.message ? error.message : String(error);
        return fail(502, message);
      }
    },
  });
}
