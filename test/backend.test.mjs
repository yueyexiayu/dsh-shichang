import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { apply, inject } from "../lib/index.js";

async function fixture(t, snapshot = { entries: [] }, options = {}) {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "shichang-test-"));
  const previousHome = process.env.DSH_HOME;
  const previousFetch = globalThis.fetch;
  process.env.DSH_HOME = home;
  t.after(async () => {
    if (previousHome === undefined) delete process.env.DSH_HOME;
    else process.env.DSH_HOME = previousHome;
    globalThis.fetch = previousFetch;
    await fs.rm(home, { recursive: true, force: true });
  });
  const profile = path.join(home, "profiles/desktop");
  await fs.mkdir(profile, { recursive: true });
  const baseUrl = pathToFileURL(path.join(profile, "cordis.patch.yml")).href;
  let handler;
  const ctx = {
    baseUrl,
    connection: { fetch: { register(config) { handler = config.fetch; } } },
    pluginInventory: { list: async () => snapshot },
    loader: { entries: () => options.loaderEntries || [] },
    get: (name) => name === "agentPresets" ? options.presets : undefined,
  };
  Object.assign(ctx, options.context);
  apply(ctx);
  const request = async (query = "action=installed") => {
    const response = await handler(new Request(`http://localhost/api/shichang?${query}`));
    return { status: response.status, body: await response.json() };
  };
  const plugin = async (id) => {
    const dir = path.join(home, "plugins", id);
    await fs.mkdir(path.join(dir, "lib"), { recursive: true });
    await fs.writeFile(path.join(dir, "package.json"), JSON.stringify({ name: `package-${id}`, version: "1.0.0" }));
    await fs.writeFile(path.join(dir, "lib/index.js"), "export const name = 'fixture';\n");
    return dir;
  };
  return { home, profile, baseUrl, request, plugin, ctx };
}

test("installed uses real paths and runtime phases instead of patch ids", async (t) => {
  const entries = [
    { entryId: "wrong-folder-name", moduleName: "../../plugins/active/lib/index.js", enabled: true, fiberPhase: "active" },
    { entryId: "disabled", moduleName: "../../plugins/disabled/lib/index.js", enabled: false, fiberPhase: null },
    { entryId: "failed", moduleName: "../../plugins/failed/lib/index.js", enabled: true, fiberPhase: "failed" },
    { entryId: "unmounted", moduleName: "../../plugins/unmounted/lib/index.js", enabled: true, fiberPhase: null },
    { entryId: "missing", moduleName: "../../plugins/missing/lib/index.js", enabled: true, fiberPhase: "failed" },
    { entryId: "builtin", moduleName: "@deepseek-ai/dsh-agent", enabled: true, fiberPhase: "active" },
  ];
  const f = await fixture(t, { entries });
  for (const id of ["active", "disabled", "failed", "unmounted", "unused"]) await f.plugin(id);
  await fs.writeFile(path.join(f.profile, "cordis.patch.yml"), "- insert:\n    - id: disabled\n      disabled: true\n    - id: failed\n    - id: missing\n");
  const { status, body } = await f.request();
  assert.equal(status, 200);
  assert.deepEqual(body.plugins.map((p) => p.id), ["active", "disabled", "failed", "unmounted", "unused"]);
  const byId = Object.fromEntries(body.plugins.map((p) => [p.id, p]));
  assert.equal(byId.active.loaded, true);
  assert.equal(byId.active.name, "package-active");
  assert.equal(byId.disabled.loaded, false);
  assert.equal(byId.disabled.statusText, "已禁用");
  assert.equal(byId.failed.statusText, "加载失败");
  assert.equal(byId.unmounted.statusText, "未加载");
  assert.equal(byId.unused.statusText, "未启用");
  assert.equal(byId.active.references[0].entryId, "wrong-folder-name");
});

test("failed or disabled imports keep directory ownership when their module file is missing", async (t) => {
  const snapshot = { entries: [
    { entryId: "different-id", moduleName: "../../plugins/broken/lib/missing.js", enabled: true, fiberPhase: "failed" },
    { entryId: "off", moduleName: "../../plugins/off/lib/missing.js", enabled: false, fiberPhase: null },
  ] };
  const f = await fixture(t, snapshot);
  await f.plugin("broken");
  await f.plugin("off");
  const { body } = await f.request();
  assert.equal(body.plugins[0].statusText, "加载失败");
  assert.equal(body.plugins[0].loaded, false);
  assert.equal(body.plugins[0].references[0].statusText, "加载失败");
  assert.equal(body.plugins[1].statusText, "已禁用");
});

test("declaring loader bases and symlink package paths map without id guessing", async (t) => {
  const entries = [
    { entryId: "nested:module", moduleName: "./plugins/actual/lib/index.js", enabled: true, fiberPhase: "active" },
    { entryId: "local", moduleName: "../../plugins/alias/lib/index.js", enabled: false, fiberPhase: null },
  ];
  const loaders = [];
  const f = await fixture(t, { entries }, { loaderEntries: loaders });
  const dir = await f.plugin("actual");
  await fs.symlink(dir, path.join(f.home, "plugins", "alias"));
  loaders.push({ id: "nested:module", parent: { tree: { ctx: { baseUrl: pathToFileURL(path.join(f.home, "composition.yml")).href } } } });
  const { body } = await f.request();
  assert.equal(body.plugins.length, 2);
  for (const row of body.plugins) {
    assert.equal(row.loaded, true);
    assert.equal(row.references.length, 2);
  }
});

test("official preset inventory participates while legacy preset files do not", async (t) => {
  const snapshot = { entries: [], agentPresets: [{ id: "official", rows: [
    { entryId: "editor", moduleName: "../../plugins/preset-only/lib/index.js", enabled: true, fiberPhase: "active" },
    { entryId: "off", moduleName: "../../plugins/preset-disabled/lib/index.js", enabled: false, fiberPhase: null },
    { entryId: "condition", moduleName: "../../plugins/preset-conditional/lib/index.js", enabled: "conditional", fiberPhase: null },
  ] }] };
  const f = await fixture(t, snapshot);
  for (const id of ["preset-only", "preset-disabled", "preset-conditional", "legacy-only"]) await f.plugin(id);
  const legacy = path.join(f.home, ".agent-presets/old");
  await fs.mkdir(legacy, { recursive: true });
  await fs.writeFile(path.join(legacy, "agent.cordis.yml"), "- name: ../../plugins/legacy-only/lib/index.js\n");
  const { body } = await f.request();
  const byId = Object.fromEntries(body.plugins.map((p) => [p.id, p]));
  assert.equal(byId["preset-only"].loaded, true);
  assert.equal(byId["preset-only"].references[0].presetId, "official");
  assert.equal(byId["preset-disabled"].statusText, "已禁用");
  assert.equal(byId["preset-disabled"].references[0].statusText, "已禁用");
  assert.equal(byId["preset-conditional"].statusText, "状态未知");
  assert.equal(byId["legacy-only"].statusText, "未启用");
});

test("preset inspection provides the active declaration base in another scope", async (t) => {
  const snapshot = { entries: [], agentPresets: [{ id: "scope", rows: [{ entryId: null, moduleName: "./plugins/scoped/lib/index.js", enabled: true, fiberPhase: "active" }] }] };
  let inspection = [];
  const f = await fixture(t, snapshot, { presets: { inspectCompositions: () => inspection } });
  await f.plugin("scoped");
  inspection = [{ id: "scope", modules: [{ moduleName: "./plugins/scoped/lib/index.js", baseUrl: pathToFileURL(path.join(f.home, "preset.yml")).href }] }];
  assert.equal((await f.request()).body.plugins[0].loaded, true);
});

test("missing or failing official inventory is an explicit error", async (t) => {
  const f = await fixture(t, { entries: [] }, { context: { pluginInventory: undefined } });
  await f.plugin("local");
  const result = await f.request();
  assert.equal(result.status, 502);
  assert.match(result.body.error, /pluginInventory/);
  assert.equal(result.body.plugins, undefined);
  assert.ok(inject.includes("pluginInventory"));
});

test("inventory service failure is not converted to an empty successful list", async (t) => {
  const f = await fixture(t, null, { context: { pluginInventory: { list: async () => { throw new Error("inventory unavailable"); } } } });
  const result = await f.request();
  assert.equal(result.status, 502);
  assert.match(result.body.error, /inventory unavailable/);
});

test("ordinary catalog cache, forced refresh, refresh failure, and instance isolation", async (t) => {
  const f = await fixture(t);
  let calls = 0;
  let reject = false;
  globalThis.fetch = async () => {
    calls++;
    if (reject) throw new Error("network unavailable");
    return Response.json({ plugins: [{ name: `revision-${calls}` }] });
  };
  assert.equal((await f.request("action=catalog")).body.plugins[0].name, "revision-1");
  assert.equal((await f.request("action=catalog&q=revision")).body.plugins[0].name, "revision-1");
  assert.equal(calls, 1);
  assert.equal((await f.request("action=catalog&refresh=1")).body.plugins[0].name, "revision-2");
  reject = true;
  const failure = await f.request("action=catalog&refresh=1");
  assert.equal(failure.status, 502);
  assert.match(failure.body.error, /network unavailable/);
  assert.equal((await f.request("action=catalog")).body.plugins[0].name, "revision-2");
  reject = false;
  let otherHandler;
  apply({ ...f.ctx, connection: { fetch: { register(config) { otherHandler = config.fetch; } } } });
  const otherResponse = await otherHandler(new Request("http://localhost/api/shichang?action=catalog"));
  assert.equal((await otherResponse.json()).plugins[0].name, "revision-4");
});

test("older catalog requests cannot overwrite a newer refresh cache", async (t) => {
  const f = await fixture(t);
  const pending = [];
  globalThis.fetch = () => new Promise((resolve) => pending.push(resolve));
  const old = f.request("action=catalog&refresh=1");
  const newer = f.request("action=catalog&refresh=1");
  const filtered = f.request("action=catalog&q=new");
  pending[1](Response.json({ plugins: [{ name: "new" }] }));
  await newer;
  assert.equal((await filtered).body.plugins[0].name, "new");
  pending[0](Response.json({ plugins: [{ name: "old" }] }));
  await old;
  assert.equal((await f.request("action=catalog")).body.plugins[0].name, "new");
});

test("catalog fetch has a 15 second timeout and reports timeout in Chinese", async (t) => {
  const f = await fixture(t);
  const originalTimeout = AbortSignal.timeout;
  let timeoutMs;
  AbortSignal.timeout = (ms) => {
    timeoutMs = ms;
    return AbortSignal.abort(new DOMException("timed out", "TimeoutError"));
  };
  t.after(() => { AbortSignal.timeout = originalTimeout; });
  globalThis.fetch = async (_url, options) => {
    assert.ok(options.signal);
    options.signal.throwIfAborted();
    return Response.json({ plugins: [] });
  };
  const result = await f.request("action=catalog&refresh=1");
  assert.equal(timeoutMs, 15000);
  assert.equal(result.status, 502);
  assert.match(result.body.error, /超时/);
});
