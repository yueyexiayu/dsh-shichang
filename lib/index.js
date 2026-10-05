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

function modulePath(moduleName, baseUrl, packages, bareBase = baseUrl) {
  if (typeof moduleName !== "string") return null;
  if (nodePath.isAbsolute(moduleName)) return moduleName;
  if (moduleName.startsWith("file:")) return fileURLToPath(moduleName);
  if (!moduleName.startsWith("./") && !moduleName.startsWith("../")) {
    if (moduleName.startsWith("cordis:")) return null;
    if (!bareBase || !packages) return undefined;
    return packages.packageOf(moduleName, bareBase)?.dir ?? null;
  }
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

function phaseText(row) {
  if (row.pathConfirmed === false) return "状态未知";
  if (row.enabled === false) return "已禁用";
  if (row.enabled !== true) return "状态未知";
  if (row.fiberPhase === "active") return "运行中";
  if (row.fiberPhase === "failed") return "加载失败";
  if (row.fiberPhase === "loading" || row.fiberPhase === "pending") return "加载中";
  if (row.fiberPhase === "unloading") return "卸载中";
  return "未加载";
}

function statusOf(references, complete) {
  const states = [...new Set(references.map(phaseText))];
  if (states.length === 0) return complete ? "未启用" : "状态未知";
  if (states.includes("运行中")) {
    if (states.length > 1) return "部分运行中，另有" + states.filter((state) => state !== "运行中").join("、");
    const host = references.some((row) => row.scope === "host");
    const preset = references.some((row) => row.scope !== "host");
    return host && preset ? "Host / 预设实例运行中" : host ? "Host 运行中" : "预设实例运行中";
  }
  return states.join("、");
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
  // ctx.get() reads optional services without Cordis's direct-property inject requirement.
  const loader = ctx.get?.("loader");
  const loaderEntries = typeof loader?.entries === "function"
    ? new Map(Array.from(loader.entries(), (entry) => [entry.id, entry])) : new Map();
  const packages = ctx.get?.("pluginPackages");
  const presets = ctx.get?.("agentPresets");
  const inspections = typeof presets?.inspectCompositions === "function" ? presets.inspectCompositions() : [];
  const references = [];
  let complete = true;
  const add = async (row, scope, baseUrl, presetId, bareBase = baseUrl, retainedInstance) => {
    const resolved = modulePath(row.moduleName, baseUrl, packages, bareBase);
    const scopeLabel = scope === "host" ? "桌面 Host" : scope === "preset-runtime"
      ? `预设 ${presetId} 保留运行实例 ${retainedInstance}` : `预设 ${presetId} 当前声明`;
    const reference = { scope, scopeLabel, ...(presetId === undefined ? {} : { presetId }),
      ...(retainedInstance === undefined ? {} : { retainedInstance }),
      entryId: row.entryId ?? null, moduleName: row.moduleName, enabled: row.enabled, fiberPhase: row.fiberPhase };
    if (resolved === undefined) {
      complete = false;
      const parts = row.moduleName.split(/[\\/]/);
      references.push({ ...reference, hintId: parts.includes("plugins") ? parts[parts.indexOf("plugins") + 1] : undefined,
        pathConfirmed: false, statusText: "声明路径未确认" });
      return;
    }
    if (resolved === null) return; // Resolved built-ins and non-local packages do not identify a local directory.
    // Failed imports may name a missing file inside an existing plugin package.
    // Resolve the existing ancestor so symlinks still identify that package.
    const realPath = await canonicalPath(resolved);
    const confirmed = { ...reference, realPath, pathConfirmed: true };
    references.push({ ...confirmed, statusText: statusOf([confirmed], true) });
  };
  for (const row of inventory.entries) {
    const entry = loaderEntries.get(row.entryId);
    await add(row, "host", entry?.parent?.tree?.ctx?.baseUrl);
  }
  for (const preset of inventory.agentPresets || []) {
    if (preset.broken) complete = false;
    for (const row of preset.rows) {
      // Current declarations do not expose their resolution base. Retained active
      // revisions are independent evidence, not bases for this declaration's state.
      await add(row, "preset", undefined, preset.id);
    }
  }
  for (const [index, preset] of inspections.entries()) {
    for (const module of preset.modules) {
      await add({ ...module, enabled: true, fiberPhase: "active" }, "preset-runtime", module.baseUrl,
        preset.id, module.useHostBase ? null : module.baseUrl, index + 1);
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
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    if (!st.isDirectory()) continue;
    const realDir = await fs.realpath(dir);
    const pkg = await readJson(nodePath.join(dir, "package.json"));
    const linked = references.filter((row) => {
      if (row.pathConfirmed === false) return row.hintId === id || row.moduleName === pkg?.name;
      if (row.realPath !== realDir && !row.realPath.startsWith(realDir + nodePath.sep)) return false;
      return !nodePath.relative(realDir, row.realPath).split(nodePath.sep).includes("node_modules");
    }).map(({ realPath, hintId, ...row }) => row);
    const statusText = statusOf(linked, complete);
    const hasActive = linked.some((row) => row.pathConfirmed && row.enabled === true && row.fiberPhase === "active");
    const item = {
      id,
      name: (pkg && pkg.name) || id,
      version: (pkg && pkg.version) || "",
      description: (pkg && pkg.description) || "",
      path: dir,
      // This proves a Host/preset fiber only, never Client mounting or current-session selection.
      loaded: hasActive,
      hasActive,
      mixed: new Set(linked.map(phaseText)).size > 1,
      exists: true,
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
