export const API_PATH = "/api/shichang";
export const CATALOG_URL = "https://awesome-dsh-plugin.com/plugins.json";
export const PAGE_SIZE = 40;
export const SORTS = ["stars", "added", "downloads", "name"];

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function compareName(a, b) {
  return String(a.name || "").localeCompare(String(b.name || ""));
}

export function comparePlugins(a, b, sort) {
  const key = SORTS.includes(sort) ? sort : "stars";
  if (key === "added") {
    const diff = String(b.added || "").localeCompare(String(a.added || ""));
    return diff || compareName(a, b);
  }
  if (key === "downloads") {
    const diff = num(b.downloads) - num(a.downloads);
    return diff || compareName(a, b);
  }
  if (key === "name") return compareName(a, b);
  const diff = num(b.stars) - num(a.stars);
  return diff || compareName(a, b);
}

export function parsePatchIds(text) {
  const ids = [];
  // Insert entries are indented. A top-level `- id: web` is a config override, not a local plugin.
  const re = /^[ \t]+-\s*id:\s*([A-Za-z0-9._/@-]+)\s*$/gm;
  let match;
  while ((match = re.exec(String(text || ""))) !== null) ids.push(match[1]);
  return ids;
}

/** Plugin folder names referenced as `$DSH_HOME/plugins/<id>/...` in a user preset. */
export function parsePresetPluginIds(text) {
  const ids = [];
  const re = /(?:^|[\\/])plugins[\\/]([A-Za-z0-9._-]+)(?:[\\/]|$)/g;
  let match;
  while ((match = re.exec(String(text || ""))) !== null) ids.push(match[1]);
  return ids;
}

export function textOf(description) {
  if (!description) return "";
  if (typeof description === "string") return description;
  return String(description.zh || description.en || "");
}

export function matchesQuery(plugin, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  const hay = [
    plugin.name,
    plugin.owner,
    plugin.npm,
    plugin.category,
    textOf(plugin.description),
    typeof plugin.description === "object" ? plugin.description.en : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export function filterCatalog(plugins, options) {
  const list = Array.isArray(plugins) ? plugins : [];
  const query = options && options.q;
  const category = options && options.category;
  const page = Math.max(1, Number(options && options.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(options && options.limit) || PAGE_SIZE));
  const sort = options && options.sort;
  const filtered = list.filter((plugin) => {
    if (category && plugin.category !== category) return false;
    return matchesQuery(plugin, query);
  });
  filtered.sort((a, b) => comparePlugins(a, b, sort));
  const start = (page - 1) * limit;
  return {
    total: filtered.length,
    page,
    limit,
    sort: SORTS.includes(sort) ? sort : "stars",
    plugins: filtered.slice(start, start + limit),
  };
}

export function summarizePlugin(plugin) {
  if (!plugin || typeof plugin !== "object") return null;
  return {
    name: plugin.name || "",
    owner: plugin.owner || "",
    url: plugin.url || "",
    page: plugin.page || "",
    category: plugin.category || "",
    description: textOf(plugin.description),
    version: plugin.version || "",
    stars: Number(plugin.stars) || 0,
    downloads: plugin.downloads == null ? null : Number(plugin.downloads),
    npm: plugin.npm || "",
    install: plugin.install || "",
    added: plugin.added || "",
  };
}
