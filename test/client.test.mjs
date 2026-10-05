import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

// Executes the actual client module. Requests deliberately ignore abort so late
// network completions still exercise the response-order guard.
async function mountClient() {
  const state = [], memo = [], requests = [];
  let cursor = 0, dirty = false, jobs = [], Component, tree;
  const equal = (a, b) => a && b && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
  const React = {
    createElement(type, props, ...children) {
      return { type, props: props || {}, children: children.flat(Infinity).filter(x => x != null && x !== false) };
    },
    useState(initial) {
      const i = cursor++;
      if (!(i in state)) state[i] = initial;
      return [state[i], value => {
        const next = typeof value === 'function' ? value(state[i]) : value;
        if (!Object.is(next, state[i])) { state[i] = next; dirty = true; }
      }];
    },
    useRef(initial) {
      const i = cursor++;
      if (!(i in state)) state[i] = { current: initial };
      return state[i];
    },
    useCallback(callback, deps) {
      const i = cursor++;
      if (!memo[i] || !equal(deps, memo[i].deps)) memo[i] = { deps, callback };
      return memo[i].callback;
    },
    useEffect(effect, deps) {
      const i = cursor++;
      if (!memo[i] || !equal(deps, memo[i].deps)) {
        const previous = memo[i];
        const entry = memo[i] = { deps };
        jobs.push(() => { previous?.cleanup?.(); entry.cleanup = effect(); });
      }
    },
  };
  let exports;
  const sandbox = {
    React, URLSearchParams, AbortController,
    window: { __ModuleLoader__: { load(spec) { exports = spec.factory(() => React); } } },
    document: { getElementById() { return null; }, createElement() { return {}; }, head: { appendChild() {} } },
    fetch(url, options = {}) {
      return new Promise((resolve, reject) => requests.push({ url, options, resolve, reject }));
    },
  };
  vm.runInNewContext(await fs.readFile(new URL('../lib/client.js', import.meta.url), 'utf8'), sandbox);
  exports.apply({
    effect(fn) { fn(); }, sidebarRightTabs: { register() {} },
    slots: { inject(name, fn) { fn(); }, register(spec, component) {
      if (spec.name === 'sidebar.right.pane.tab') Component = component({}).type;
    } },
  });
  function commit() {
    let attempts = 0;
    do {
      dirty = false; cursor = 0; jobs = [];
      tree = Component();
      jobs.forEach(job => job());
      if (++attempts > 20) throw Error('Render did not settle');
    } while (dirty);
  }
  function all(predicate, node = tree, found = []) {
    if (!node || typeof node !== 'object') return found;
    if (predicate(node)) found.push(node);
    for (const child of node.children || []) all(predicate, child, found);
    return found;
  }
  function button(label) { return all(x => x.type === 'button' && x.children.includes(label))[0]; }
  function click(label) { button(label).props.onClick(); commit(); }
  function search(value) { all(x => x.type === 'input')[0].props.onChange({ target: { value } }); commit(); }
  async function settle(i, body, error) {
    if (error) requests[i].reject(error);
    else requests[i].resolve({ json: async () => body });
    await new Promise(resolve => setImmediate(resolve));
    commit();
  }
  commit();
  return {
    requests, click, search, settle,
    cards: () => all(x => x.props.className === 'sc-name').map(x => x.children[0]),
    query: () => all(x => x.type === 'input')[0]?.props.value,
    meta: () => all(x => x.props.className === 'sc-meta')[0].children.join(''),
    labels: () => all(x => x.props.className?.startsWith('sc-badge')).flatMap(x => x.children),
    descriptions: () => all(x => x.props.className === 'sc-desc').flatMap(x => x.children),
    unmount() { for (const item of memo) item?.cleanup?.(); },
  };
}
const catalog = name => ({ ok: true, plugins: [{ name, owner: 'test' }], total: 1, categories: {}, limit: 40 });
const installed = name => ({ ok: true, plugins: [{ id: name, name, loaded: true, statusText: '已加载' }] });
async function openCatalog() {
  const client = await mountClient();
  await client.settle(0, installed('local'));
  client.click('社区目录');
  await client.settle(1, catalog('baseline'));
  return client;
}

test('late search success cannot replace a newer completed search', async () => {
  const client = await openCatalog();
  client.search('old'); client.search('new');
  await client.settle(3, catalog('new result'));
  await client.settle(2, catalog('old result'));
  assert.equal(client.query(), 'new');
  assert.deepEqual(client.cards(), ['new result']);
  assert.equal(client.requests[2].options.signal.aborted, true);
});

test('tab switch clears old cards and late catalog cannot replace local plugins', async () => {
  const client = await openCatalog();
  client.search('delayed');
  client.click('已安装');
  assert.deepEqual(client.cards(), []);
  await client.settle(3, installed('real local'));
  await client.settle(2, catalog('wrong catalog'));
  assert.deepEqual(client.cards(), ['real local']);
});

test('stale failure cannot clear loading or display an error for the latest search', async () => {
  const client = await openCatalog();
  client.search('old'); client.search('new');
  await client.settle(2, null, Error('obsolete network error'));
  assert.equal(client.meta(), '加载中…');
  await client.settle(3, catalog('new result'));
  assert.deepEqual(client.cards(), ['new result']);
  assert.doesNotMatch(client.meta(), /obsolete/);
});

test('unmount aborts the pending request', async () => {
  const client = await mountClient();
  client.unmount();
  assert.equal(client.requests[0].options.signal?.aborted, true);
});

test('refresh forces catalog update while ordinary searches use the cache', async () => {
  const client = await openCatalog();
  client.click('刷新');
  assert.equal(new URL(client.requests[2].url, 'http://local').searchParams.get('refresh'), '1');
  client.search('normal');
  assert.equal(new URL(client.requests[3].url, 'http://local').searchParams.has('refresh'), false);
  await client.settle(3, catalog('normal result'));
  await client.settle(2, catalog('obsolete refresh result'));
  assert.deepEqual(client.cards(), ['normal result']);
});

test('local cards display actual disabled and preset lifecycle status', async () => {
  const client = await mountClient();
  await client.settle(0, { ok: true, plugins: [
    { id: 'disabled', name: 'disabled', loaded: false, statusText: '已禁用' },
    { id: 'preset', name: 'preset', loaded: false, via: 'preset', statusText: 'standard · 未加载' },
  ] });
  assert.deepEqual(client.labels(), ['已禁用', 'standard · 未加载']);
});

test('latest server error is visible and previous cards are cleared', async () => {
  const client = await openCatalog();
  client.click('刷新');
  await client.settle(2, { ok: false, error: '目录请求超时，请重试' });
  assert.equal(client.meta(), '目录请求超时，请重试');
  assert.deepEqual(client.cards(), []);
});

test('preset scope and lifecycle remain visible beside the overall active status', async () => {
  const client = await mountClient();
  await client.settle(0, { ok: true, plugins: [{
    id: 'shared', name: 'shared', loaded: true, statusText: '已加载', references: [
      { scope: 'host', statusText: '已加载' },
      { scope: 'preset', presetId: 'standard', statusText: '已禁用' },
      { scope: 'preset', presetId: 'minimal', statusText: '未加载' },
    ],
  }] });
  assert.deepEqual(client.labels(), ['已加载']);
  assert.deepEqual(client.descriptions(), ['桌面 Host：已加载', '预设 standard：已禁用', '预设 minimal：未加载']);
});

test('an active host instance does not hide another failed host instance', async () => {
  const client = await mountClient();
  await client.settle(0, { ok: true, plugins: [{
    id: 'shared', name: 'shared', loaded: true, mixed: true, statusText: '部分运行中，另有加载失败', references: [
      { scope: 'host', scopeLabel: '桌面 Host', statusText: 'Host 运行中', moduleName: '/plugins/shared/lib/index.js' },
      { scope: 'host', scopeLabel: '桌面 Host', statusText: '加载失败', moduleName: '/plugins/shared/lib/broken.js' },
    ],
  }] });
  assert.deepEqual(client.descriptions(), ['桌面 Host：Host 运行中', '桌面 Host：加载失败']);
});

test('retained preset runtime and current disabled declaration remain separate', async () => {
  const client = await mountClient();
  await client.settle(0, { ok: true, plugins: [{
    id: 'preset', name: 'preset', loaded: true, mixed: true, statusText: '部分运行中，另有已禁用', references: [
      { scope: 'preset', presetId: 'standard', statusText: '已禁用' },
      { scope: 'preset-runtime', presetId: 'standard', scopeLabel: '预设 standard 运行实例 1', statusText: '运行中' },
    ],
  }] });
  assert.deepEqual(client.descriptions(), ['预设 standard：已禁用', '预设 standard 运行实例 1：运行中']);
});
