import test from "node:test";
import assert from "node:assert/strict";
import { filterCatalog, matchesQuery, summarizePlugin, validateCatalog } from "../lib/parse.js";

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

test("null descriptions remain searchable by other fields", () => {
  const plugin = { name: "nullable", owner: "example", description: null };
  assert.equal(matchesQuery(plugin, "nullable"), true);
  assert.equal(matchesQuery(plugin, "absent"), false);
  assert.equal(filterCatalog([plugin], { q: "example" }).total, 1);
  assert.equal(summarizePlugin(plugin).description, "");
});

test("pagination rejects non-finite, fractional, unsafe and out-of-range values", () => {
  for (const value of ["Infinity", "NaN", "0", "-1", "1.5", "9007199254740992", "", " ", "garbage"]) {
    assert.throws(() => filterCatalog([], { page: value }), /page/, `page=${JSON.stringify(value)}`);
  }
  for (const value of ["Infinity", "NaN", "0", "-1", "1.5", "101", "", " ", "garbage"]) {
    assert.throws(() => filterCatalog([], { limit: value }), /limit/, `limit=${JSON.stringify(value)}`);
  }
  assert.equal(filterCatalog([], { page: String(Number.MAX_SAFE_INTEGER), limit: "100" }).page, Number.MAX_SAFE_INTEGER);
  assert.equal(filterCatalog([], {}).limit, 40);
});

test("catalog bilingual text allows missing translations and discards unused language fields", () => {
  for (const [input, expected] of [[{}, {}], [{ zh: "说明", fr: "bonjour" }, { zh: "说明" }], [{ fr: "bonjour" }, {}]]) {
    const catalog = validateCatalog({ plugins: [{ name: "translated", description: input }], categories: { ui: input } });
    assert.deepEqual(catalog.plugins[0].description, expected);
    assert.deepEqual(catalog.categories.ui, expected);
    assert.equal(summarizePlugin(catalog.plugins[0]).description, expected.zh || "");
  }
  for (const invalid of [{ zh: {} }, { en: [] }, { zh: 1 }, { en: null }]) {
    assert.throws(() => validateCatalog({ plugins: [{ name: "invalid", description: invalid }] }), /description/);
    assert.throws(() => validateCatalog({ plugins: [], categories: { ui: invalid } }), /categories/);
  }
});

test("catalog count must be a safe nonnegative integer without requiring row-count equality", () => {
  for (const invalid of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, "-1", "1.5", "9007199254740992"]) {
    assert.throws(() => validateCatalog({ plugins: [], count: invalid }), /count/);
  }
  for (const [input, expected] of [[0, 0], ["2", 2], [String(Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER]]) {
    assert.equal(validateCatalog({ plugins: [], count: input }).count, expected);
  }
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
