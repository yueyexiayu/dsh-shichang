import test from "node:test";
import assert from "node:assert/strict";
import { parsePatchIds, parsePresetPluginIds, filterCatalog, matchesQuery, summarizePlugin } from "../lib/parse.js";

test("parsePatchIds reads desktop insert ids", () => {
  const text = `# comment
- insert:
    - id: dsh-edu
      name: ../../plugins/dsh-edu/lib/index.js
    - id: bianji
      name: ../../plugins/bianji/lib/index.js
`;
  assert.deepEqual(parsePatchIds(text), ["dsh-edu", "bianji"]);
});

test("parsePatchIds ignores top-level config overrides", () => {
  const text = `- insert:
    - id: web-search-anysearch
      name: ./node_modules/@anysearch/anysearch-dsh/lib/index.js
- id: web
  config:
    searchProvider: anysearch
    fetchProvider: anysearch
`;
  assert.deepEqual(parsePatchIds(text), ["web-search-anysearch"]);
});

test("filterCatalog searches and paginates by stars", () => {
  const plugins = [
    { name: "dsh-edu", owner: "example", stars: 2, category: "usage", description: { zh: "额度" } },
    { name: "bianji", owner: "example", stars: 9, category: "ui", description: { zh: "编辑器" } },
    { name: "other", owner: "x", stars: 1, category: "fun", description: { en: "joke" } },
  ];
  const page = filterCatalog(plugins, { q: "编辑", page: 1, limit: 10 });
  assert.equal(page.total, 1);
  assert.equal(page.plugins[0].name, "bianji");
  const ui = filterCatalog(plugins, { category: "ui" });
  assert.equal(ui.total, 1);
  const ranked = filterCatalog(plugins, {});
  assert.deepEqual(ranked.plugins.map((p) => p.name), ["bianji", "dsh-edu", "other"]);
});

test("filterCatalog sorts by added, downloads, and name", () => {
  const plugins = [
    { name: "zeta", stars: 1, downloads: 9, added: "2026-01-01" },
    { name: "alpha", stars: 8, downloads: 2, added: "2026-09-01" },
    { name: "mid", stars: 3, downloads: 20, added: "2026-06-01" },
  ];
  assert.deepEqual(filterCatalog(plugins, { sort: "added" }).plugins.map((p) => p.name), ["alpha", "mid", "zeta"]);
  assert.deepEqual(filterCatalog(plugins, { sort: "downloads" }).plugins.map((p) => p.name), ["mid", "zeta", "alpha"]);
  assert.deepEqual(filterCatalog(plugins, { sort: "name" }).plugins.map((p) => p.name), ["alpha", "mid", "zeta"]);
  assert.deepEqual(filterCatalog(plugins, { sort: "stars" }).plugins.map((p) => p.name), ["alpha", "mid", "zeta"]);
});

test("matchesQuery is case-insensitive", () => {
  assert.equal(matchesQuery({ name: "BianJi", description: "Editor" }, "bian"), true);
  assert.equal(matchesQuery({ name: "foo" }, "bar"), false);
});

test("parsePresetPluginIds reads plugins paths from a user preset", () => {
  const text = [
    "    - id: compaction-basic",
    "      name: ../../plugins/yasuo/lib/index.js",
  ].join("\n");
  assert.deepEqual(parsePresetPluginIds(text), ["yasuo"]);
  assert.deepEqual(
    parsePresetPluginIds("name: /Users/ning/.dsh/plugins/yasuo/lib/index.js"),
    ["yasuo"],
  );
  assert.deepEqual(parsePresetPluginIds("- insert:\n    - id: bianji\n"), []);
});

test("summarizePlugin flattens zh description", () => {
  const row = summarizePlugin({
    name: "dsh-edu",
    owner: "local",
    url: "https://github.com/x/dsh-edu",
    description: { zh: "额度", en: "quota" },
    stars: "12",
  });
  assert.equal(row.description, "额度");
  assert.equal(row.stars, 12);
});
