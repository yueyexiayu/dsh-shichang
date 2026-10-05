import { promises as fs } from "node:fs";
import * as nodePath from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import {
  API_PATH,
  CATALOG_URL,
  PAGE_SIZE,
  filterCatalog,
  summarizePlugin,
} from "./parse.js";

export const name = "shichang";
export const inject = ["connection", "pluginInventory"];

const CACHE_MS = 15 * 60 * 1000;
const FETCH_TIMEOUT_MS = 15 * 1000;

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

function modulePath(moduleName, baseUrl) {
  if (typeof moduleName !== "string") return null;
  if (nodePath.isAbsolute(moduleName)) return moduleName;
  if (moduleName.startsWith("file:")) return fileURLToPath(moduleName);
  if (!moduleName.startsWith("./") && !moduleName.startsWith("../")) return null;
  if (!baseUrl) return undefined;
  const url = new URL(moduleName, baseUrl);
  return url.protocol === "file:" ? fileURLToPath(url) : undefined;
}

async function canonicalPath(path) {
  let parent = path;
  const missing = [];
  while (true) {
    try { return nodePath.join(await fs.realpath(parent), ...missing); }
    catch (error) {
      if (error.code !== "ENOENT" && error.code !== "ENOTDIR") throw error;
      const next = nodePath.dirname(parent);
      if (next === parent) throw error;
      missing.unshift(nodePath.basename(parent));
      parent = next;
    }
  }
}

function statusOf(references, complete) {
  if (references.some((row) => row.enabled === true && row.fiberPhase === "active")) return "已加载";
  if (references.length === 0) return complete ? "未启用" : "状态未知";
  if (references.every((row) => row.enabled === false)) return "已禁用";
  const enabled = references.filter((row) => row.enabled === true);
  if (enabled.some((row) => row.fiberPhase === "failed")) return "加载失败";
  if (enabled.some((row) => row.fiberPhase === "loading" || row.fiberPhase === "pending")) return "加载中";
  if (enabled.some((row) => row.fiberPhase === "unloading")) return "卸载中";
  if (references.some((row) => row.enabled === "conditional")) return "状态未知";
  return "未加载";
}

async function listInstalled(ctx) {
  if (typeof ctx.pluginInventory?.list !== "function") {
    throw new Error("pluginInventory 服务不可用，无法读取插件运行状态");
  }
  const inventory = await ctx.pluginInventory.list();
  if (!inventory || !Array.isArray(inventory.entries)) {
    throw new Error("pluginInventory 返回了无效的插件清单");
  }
  const home = dshHome();
  const pluginsDir = nodePath.join(home, "plugins");
  const loaderEntries = typeof ctx.loader?.entries === "function"
    ? new Map(Array.from(ctx.loader.entries(), (entry) => [entry.id, entry])) : new Map();
  const presets = ctx.get?.("agentPresets");
  const inspections = typeof presets?.inspectCompositions === "function" ? presets.inspectCompositions() : [];
  const references = [];
  let complete = true;
  const add = async (row, scope, baseUrl, presetId) => {
    const resolved = modulePath(row.moduleName, baseUrl);
    if (resolved === undefined) { complete = false; return; }
    if (resolved === null) return; // npm and built-in entries are not local plugin directories.
    // Failed imports may name a missing file inside an existing plugin package.
    // Resolve the existing ancestor so symlinks still identify that package.
    const realPath = await canonicalPath(resolved);
    references.push({ realPath, scope, ...(presetId === undefined ? {} : { presetId }),
      entryId: row.entryId, moduleName: row.moduleName, enabled: row.enabled, fiberPhase: row.fiberPhase,
      statusText: statusOf([row], true) });
  };
  for (const row of inventory.entries) {
    const entry = loaderEntries.get(row.entryId);
    await add(row, "host", entry === undefined ? ctx.baseUrl : entry.parent?.tree?.ctx?.baseUrl);
  }
  for (const preset of inventory.agentPresets || []) {
    if (preset.broken) complete = false;
    for (const row of preset.rows) {
      const modules = inspections.filter((item) => item.id === preset.id)
        .flatMap((item) => item.modules).filter((module) => module.moduleName === row.moduleName);
      const bases = modules.length ? [...new Set(modules.map((module) => module.baseUrl))] : [ctx.baseUrl];
      for (const baseUrl of bases) await add(row, "preset", baseUrl, preset.id);
    }
  }
  const plugins = [];
  let names = [];
  try {
    names = await fs.readdir(pluginsDir);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  for (const id of names) {
    const dir = nodePath.join(pluginsDir, id);
    let st;
    try {
      st = await fs.stat(dir);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;
    const realDir = await fs.realpath(dir);
    const linked = references.filter((row) => row.realPath === realDir || row.realPath.startsWith(realDir + nodePath.sep))
      .map(({ realPath, ...row }) => row);
    const statusText = statusOf(linked, complete);
    const pkg = await readJson(nodePath.join(dir, "package.json"));
    const item = {
      id,
      name: (pkg && pkg.name) || id,
      version: (pkg && pkg.version) || "",
      description: (pkg && pkg.description) || "",
      path: dir,
      loaded: statusText === "已加载",
      statusText,
      references: linked,
      via: [...new Set(linked.map((row) => row.scope))].join(","),
      source: "local",
    };
    plugins.push(item);
  }
  plugins.sort((a, b) => a.id.localeCompare(b.id));
  return { home, pluginsDir, plugins };
}

export function apply(ctx) {
  let catalogCache = null;
  let catalogRequest = 0;
  let pendingCatalog = null;
  function loadCatalog(refresh) {
    if (!refresh && pendingCatalog) return pendingCatalog.promise;
    if (!refresh && catalogCache && Date.now() - catalogCache.at < CACHE_MS) {
      return Promise.resolve(catalogCache.data);
    }
    const sequence = ++catalogRequest;
    const promise = (async () => {
      const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
      try {
        const res = await fetch(CATALOG_URL, { headers: { accept: "application/json" }, signal });
        if (!res.ok) throw new Error("catalog http " + res.status);
        const data = await res.json();
        if (!data || !Array.isArray(data.plugins)) throw new Error("插件目录数据格式无效");
        if (sequence === catalogRequest) catalogCache = { at: Date.now(), data };
        return data;
      } catch (error) {
        if (signal.aborted || error?.name === "TimeoutError") throw new Error("获取插件目录超时，请重试");
        throw error;
      } finally {
        if (pendingCatalog?.sequence === sequence) pendingCatalog = null;
      }
    })();
    pendingCatalog = { sequence, promise };
    return promise;
  }
  ctx.connection.fetch.register({
    path: API_PATH,
    methods: ["GET"],
    requestBody: "buffered",
    fetch: async (request) => {
      try {
        const url = new URL(request.url);
        const action = url.searchParams.get("action") || "installed";
        if (action === "installed") {
          const listed = await listInstalled(ctx);
          return jsonResponse(200, { ok: true, ...listed });
        }
        if (action === "catalog") {
          const data = await loadCatalog(url.searchParams.get("refresh") === "1");
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
