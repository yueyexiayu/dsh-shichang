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
  const timers = new Map();
  let timerSeq = 0;
  function flush(max) {
    const due = [...timers.entries()].filter(([, timer]) => timer.ms <= max);
    for (const [id] of due) timers.delete(id);
    for (const [, timer] of due) timer.fn();
  }
  const sandbox = {
    React, URLSearchParams, AbortController,
    window: { __ModuleLoader__: { load(spec) { exports = spec.factory(() => React); } } },
    document: { getElementById() { return null; }, createElement() { return {}; }, head: { appendChild() {} } },
    setTimeout(fn, ms) {
      const id = ++timerSeq;
      timers.set(id, { fn, ms: ms || 0 });
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
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
  function type(value) { all(x => x.type === 'input')[0].props.onChange({ target: { value } }); commit(); }
  function search(value) { type(value); flush(250); commit(); }
  function select(label, value) { all(x => x.type === 'select' && x.props['aria-label'] === label)[0].props.onChange({ target: { value } }); commit(); }
  async function settle(i, body, error) {
    if (error) requests[i].reject(error);
    else requests[i].resolve({ json: async () => body });
    await new Promise(resolve => setImmediate(resolve));
    commit();
  }
  commit();
  return {
    requests, click, search, type, select, settle,
    flush() { flush(250); commit(); },
    page: () => all(x => x.type === 'span').flatMap(x => x.children).find(x => typeof x === 'string' && /^第 \d+ 页$/.test(x)),
    empty: () => all(x => x.props.className === 'sc-empty')[0]?.children.join(''),
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

test('typing keeps the current list until the debounced search starts', async () => {
  const client = await openCatalog();
  const before = client.requests.length;
  client.type('a');
  assert.equal(client.requests.length, before);
  assert.deepEqual(client.cards(), ['baseline']);
  assert.doesNotMatch(client.meta(), /加载中|正在更新/);
  client.flush();
  assert.equal(client.requests.length, before + 1);
  assert.equal(client.meta(), '正在更新…');
  assert.deepEqual(client.cards(), ['baseline']);
});

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
  assert.equal(client.meta(), '正在更新…');
  assert.deepEqual(client.cards(), ['baseline']);
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

test('invalid response data is a visible loading failure, never empty success or unsafe children', async t => {
  const cases = [
    ['missing plugins', 'installed', { ok: true }],
    ['null plugins', 'installed', { ok: true, plugins: null }],
    ['object plugins', 'installed', { ok: true, plugins: {} }],
    ['null item', 'installed', { ok: true, plugins: [null] }],
    ['array item', 'installed', { ok: true, plugins: [[]] }],
    ['object name', 'installed', { ok: true, plugins: [{ id: 'bad', name: {} }] }],
    ['object description', 'installed', { ok: true, plugins: [{ id: 'bad', name: 'bad', description: {} }] }],
    ['array status', 'installed', { ok: true, plugins: [{ id: 'bad', name: 'bad', statusText: [] }] }],
    ['object references', 'installed', { ok: true, plugins: [{ id: 'bad', name: 'bad', references: {} }] }],
    ['null reference', 'installed', { ok: true, plugins: [{ id: 'bad', name: 'bad', references: [null] }] }],
    ['object reference status', 'installed', { ok: true, plugins: [{ id: 'bad', name: 'bad', references: [{ statusText: {} }] }] }],
    ['object metadata error', 'installed', { ok: true, plugins: [{ id: 'bad', name: 'bad', metadataError: {} }] }],
    ['unknown metadata status', 'installed', { ok: true, plugins: [{ id: 'bad', name: 'bad', metadataStatus: 'broken' }] }],
    ['object error', 'installed', { ok: false, error: { message: 'bad' } }],
    ['truthy nonboolean ok', 'installed', { ok: 'true', plugins: [] }],
    ['array response', 'installed', []],
    ['object owner', 'catalog', { ...catalog('bad'), plugins: [{ name: 'bad', owner: {} }] }],
    ['object category', 'catalog', { ...catalog('bad'), plugins: [{ name: 'bad', owner: 'test', category: {} }] }],
    ['array categories', 'catalog', { ...catalog('bad'), categories: [] }],
    ['null categories', 'catalog', { ...catalog('bad'), categories: null }],
    ['object category label', 'catalog', { ...catalog('bad'), categories: { tools: { zh: {} } } }],
    ['array category entry', 'catalog', { ...catalog('bad'), categories: { tools: [] } }],
    ['null category entry', 'catalog', { ...catalog('bad'), categories: { tools: null } }],
    ['object updated', 'catalog', { ...catalog('bad'), updated: {} }],
    ['infinite stars', 'catalog', { ...catalog('bad'), plugins: [{ name: 'bad', owner: 'test', stars: Infinity }] }],
    ['object downloads', 'catalog', { ...catalog('bad'), plugins: [{ name: 'bad', owner: 'test', downloads: {} }] }],
    ['object url', 'catalog', { ...catalog('bad'), plugins: [{ name: 'bad', owner: 'test', url: {} }] }],
    ['invalid total', 'catalog', { ...catalog('bad'), total: -1 }],
    ['invalid limit', 'catalog', { ...catalog('bad'), limit: 0 }],
    ['invalid page', 'catalog', { ...catalog('bad'), page: 1.5 }],
  ];
  for (const [label, view, response] of cases) await t.test(label, async () => {
    const client = view === 'catalog' ? await openCatalog() : await mountClient();
    const index = view === 'catalog' ? (client.click('刷新'), 2) : 0;
    await client.settle(index, response);
    assert.match(client.meta(), /加载失败.*格式无效/);
    assert.deepEqual(client.cards(), []);
    assert.equal(client.empty(), '加载失败，请刷新重试');
  });
});

test('local metadata diagnostics preserve real Host lifecycle status', async () => {
  const client = await mountClient();
  await client.settle(0, { ok: true, plugins: [
    { id: 'ok', name: 'ok', loaded: true, statusText: 'Host 运行中', metadataStatus: 'ok', metadataError: '' },
    { id: 'missing', name: 'missing', loaded: true, statusText: 'Host 运行中', metadataStatus: 'missing', metadataError: 'package.json 不存在' },
    { id: 'invalid', name: 'invalid', loaded: false, statusText: '已禁用', metadataStatus: 'invalid', metadataError: 'package.json 格式无效' },
    { id: 'unreadable', name: 'unreadable', loaded: false, statusText: '未加载', metadataStatus: 'unreadable', metadataError: 'EACCES' },
  ] });
  assert.deepEqual(client.labels(), ['Host 运行中', 'Host 运行中', '已禁用', '未加载']);
  assert.deepEqual(client.descriptions(), [
    '元数据缺失：package.json 不存在', '元数据无效：package.json 格式无效', '元数据无法读取：EACCES',
  ]);
});

test('valid bilingual categories and finite metrics remain renderable with optional fields omitted', async () => {
  const client = await openCatalog();
  client.click('刷新');
  await client.settle(2, { ...catalog('valid'), categories: { tools: { zh: '工具', en: 'Tools' } }, plugins: [
    { name: 'valid', owner: 'test', category: 'tools', stars: 2, downloads: null },
  ] });
  assert.deepEqual(client.cards(), ['valid']);
  assert.deepEqual(client.labels(), ['test', '★ 2', '工具']);
});

async function openSecondPage() {
  const client = await openCatalog();
  client.search('retained query');
  await client.settle(2, { ...catalog('query result'), total: 81 });
  client.select('插件分类', 'tools');
  await client.settle(3, { ...catalog('category result'), total: 81 });
  client.select('排序方式', 'name');
  await client.settle(4, { ...catalog('sort result'), total: 81 });
  client.click('下一页');
  await client.settle(5, { ...catalog('old page two'), total: 81, page: 2 });
  assert.equal(client.page(), '第 2 页');
  return client;
}

test('refresh shrink actually requests and displays the corrected page with all filters retained', async () => {
  const client = await openSecondPage();
  client.click('刷新');
  const refresh = new URL(client.requests[6].url, 'http://local').searchParams;
  assert.equal(refresh.get('refresh'), '1');
  assert.equal(refresh.get('page'), '2');
  await client.settle(6, { ...catalog('unused'), plugins: [], total: 1, page: 2 });
  assert.equal(client.requests.length, 8, 'shrinking total must trigger a real corrected-page request');
  const corrected = new URL(client.requests[7].url, 'http://local').searchParams;
  assert.equal(corrected.get('page'), '1');
  assert.equal(corrected.get('q'), 'retained query');
  assert.equal(corrected.get('category'), 'tools');
  assert.equal(corrected.get('sort'), 'name');
  assert.equal(client.meta(), '正在更新…');
  assert.deepEqual(client.cards(), ['old page two']);
  await client.settle(7, { ...catalog('real corrected page'), page: 1 });
  assert.equal(client.page(), '第 1 页');
  assert.deepEqual(client.cards(), ['real corrected page']);
});

test('zero total shrink returns to page one and settles as a genuine empty result', async () => {
  const client = await openSecondPage();
  client.click('刷新');
  await client.settle(6, { ...catalog('unused'), plugins: [], total: 0, page: 2 });
  assert.equal(client.requests.length, 8);
  await client.settle(7, { ...catalog('unused'), plugins: [], total: 0, page: 1 });
  assert.equal(client.page(), '第 1 页');
  assert.equal(client.empty(), '没有匹配的插件');
  assert.equal(client.requests.length, 8, 'page-one empty response must not cause a reload loop');
});

test('corrected-page failure is visible instead of preserving a false empty success', async () => {
  const client = await openSecondPage();
  client.click('刷新');
  await client.settle(6, { ...catalog('unused'), plugins: [], total: 1, page: 2 });
  assert.equal(client.requests.length, 8);
  await client.settle(7, null, Error('corrected request failed'));
  assert.match(client.meta(), /corrected request failed/);
  assert.equal(client.empty(), '加载失败，请刷新重试');
});

test('a late corrected-page success or failure cannot replace a newer query', async t => {
  for (const error of [null, Error('obsolete correction error')]) await t.test(error ? 'failure' : 'success', async () => {
    const client = await openSecondPage();
    client.click('刷新');
    await client.settle(6, { ...catalog('unused'), plugins: [], total: 1, page: 2 });
    assert.equal(client.requests.length, 8);
    client.search('new query');
    assert.equal(client.requests[7].options.signal.aborted, true);
    await client.settle(8, catalog('new result'));
    await client.settle(7, catalog('obsolete corrected result'), error);
    assert.equal(client.query(), 'new query');
    assert.deepEqual(client.cards(), ['new result']);
    assert.doesNotMatch(client.meta(), /obsolete/);
  });
});
