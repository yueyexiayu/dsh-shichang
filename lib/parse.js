export const API_PATH = "/api/shichang";
export const CATALOG_URL = "https://awesome-dsh-plugin.com/plugins.json";
export const PAGE_SIZE = 40;
export const SORTS = ["stars", "added", "downloads", "name"];

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function invalid(field) {
  throw new Error(`插件目录数据格式无效：${field}`);
}

function optionalString(value, field) {
  if (value == null) return "";
  if (typeof value !== "string") invalid(field);
  return value;
}

function finiteNumber(value, field, fallback) {
  if (value == null) return fallback;
  if ((typeof value !== "number" && typeof value !== "string") ||
      (typeof value === "string" && !value.trim()) || !Number.isFinite(Number(value))) invalid(field);
  return Number(value);
}

function bilingual(value, field) {
  if (!isRecord(value)) invalid(field);
  const normalized = {};
  for (const key of ["zh", "en"]) {
    if (!Object.hasOwn(value, key)) continue;
    if (typeof value[key] !== "string") invalid(`${field}.${key}`);
    normalized[key] = value[key];
  }
  return normalized;
}

function normalizePlugin(plugin, field) {
  if (!isRecord(plugin)) invalid(field);
  if (typeof plugin.name !== "string" || !plugin.name.trim()) invalid(`${field}.name`);
  const row = { name: plugin.name };
  for (const key of ["owner", "url", "page", "category", "version", "npm", "install", "added"]) {
    row[key] = optionalString(plugin[key], `${field}.${key}`);
  }
  row.description = plugin.description == null ? "" : typeof plugin.description === "string"
    ? plugin.description : bilingual(plugin.description, `${field}.description`);
  row.stars = finiteNumber(plugin.stars, `${field}.stars`, 0);
  row.downloads = finiteNumber(plugin.downloads, `${field}.downloads`, null);
  return row;
}

export function validateCatalog(data) {
  if (!isRecord(data) || !Array.isArray(data.plugins)) invalid("plugins");
  const plugins = data.plugins.map((plugin, index) => normalizePlugin(plugin, `plugins[${index}]`));
  const categories = data.categories === undefined ? {} : data.categories;
  if (!isRecord(categories)) invalid("categories");
  const count = finiteNumber(data.count, "count", plugins.length);
  if (!Number.isSafeInteger(count) || count < 0) invalid("count");
  return {
    plugins,
    url: optionalString(data.url, "url"),
    updated: optionalString(data.updated, "updated"),
    count,
    categories: Object.fromEntries(Object.entries(categories).map(([key, value]) => [key, bilingual(value, `categories.${key}`)])),
  };
}

export function parsePagination(options = {}) {
  const parse = (value, key, fallback, max) => {
    if (value === undefined || value === null) return fallback;
    const n = Number(value);
    if ((typeof value !== "number" && typeof value !== "string") ||
        (typeof value === "string" && !value.trim()) || !Number.isSafeInteger(n) || n < 1 || n > max) {
      throw new Error(`无效分页参数 ${key}：必须是 1..${max} 的安全正整数`);
    }
    return n;
  };
  return {
    page: parse(options.page, "page", 1, Number.MAX_SAFE_INTEGER),
    limit: parse(options.limit, "limit", PAGE_SIZE, 100),
  };
}

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
    plugin.description && typeof plugin.description === "object" ? plugin.description.en : "",
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
  const { page, limit } = parsePagination(options || {});
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
  const row = normalizePlugin(plugin, "plugin");
  return { ...row, description: textOf(row.description) };
}
