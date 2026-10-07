# shichang

当前项目是深度适配个人使用，项目只是给大家提供思路和借鉴，尽量不要直接照搬。

DeepSeek Harness 官方桌面端的只读插件市场。右侧栏「开始」页增加 **市场** 入口：查看本机 `$DSH_HOME/plugins` 已装插件，以及 [awesome-dsh-plugin](https://awesome-dsh-plugin.com/) 社区目录（搜索、分类、按评星 / 收录日期 / 下载量 / 名称排序）。

**不提供安装和卸载。** 面向官方桌面（`connection.fetch`），不走 `dsh plugin --profile desktop`。

## 安装

复制到 `$DSH_HOME/plugins/shichang`，在 `$DSH_HOME/profiles/desktop/cordis.patch.yml` 写入：

```yaml
- insert:
    - id: shichang
      name: ../../plugins/shichang/lib/index.js
```

完全退出 DeepSeek Harness（macOS：⌘Q）再打开。展开右侧栏，在「开始」里会出现 **市场**。

## 说明

- 社区数据来自公开的 `https://awesome-dsh-plugin.com/plugins.json`
- 「最新收录」按目录的 `added` 字段，不是 GitHub Release 时间
- 仓库内不含本机 patch、账号或凭据
- 本机列表读取官方 `pluginInventory` 的实时状态，按实际模块路径及官方包解析结果关联本机目录；内部 `node_modules` 依赖不会被误认成外层插件。区分 Host 运行中、已禁用、加载失败、加载中、卸载中及未加载；同一插件多个实例的不同状态分别展示。
- preset 当前声明与仍由旧会话使用的保留版本分别展示，不把当前禁用状态套到旧的运行实例。相对声明缺少解析基址时显示未确认，不猜测桌面路径，不扫描废弃的 `.agent-presets` 目录。
- Host 或预设实例运行中不证明 Client 界面已加载，也不代表当前会话选择了该预设。读取状态失败会显示明确错误。
- 搜索、筛选、分页和切换页签会取消旧请求，迟到的响应不会覆盖当前结果。
- 社区目录的普通浏览使用 15 分钟缓存；点击「刷新」会重新请求远程目录。整份目录（包括条目、说明、数值和分类）验证通过后才写入缓存；坏条目不会被静默跳过。刷新失败会明确显示错误，不覆盖上次验证成功的缓存。
- 说明字段为 `null` 时按无说明处理，仍可正常搜索。Client 也校验实际显示的响应字段，格式错误会显示加载失败，不把对象直接送入 React 渲染。
- 刷新后结果数量减少而当前页越界时，自动调整到有效页并重新请求，不把越界空页显示成「没有匹配的插件」。
- 本机 `package.json` 缺失、JSON/字段无效或读取失败时，逐项展示元数据诊断；名称等非法字段使用安全回退，但不会掩盖错误，也不会改变独立取得的 Host / 预设运行状态。
- 控件使用桌面主题配色，窄侧栏会自动换行排列工具栏。

## API 边界

- `GET /api/shichang?action=catalog`：`page` 默认 `1`，`limit` 默认 `40`。两者必须是有限、安全的正整数，`limit` 范围为 `1..100`；非法值返回 HTTP `400`、`ok: false`，不会先请求远程目录。远程数据格式或网络错误返回 HTTP `502`。
- `GET /api/shichang?action=installed`：每条本机插件增加 `metadataStatus`（`ok`、`missing`、`invalid`、`unreadable`）和 `metadataError` 字符串。`ok` 表示元数据读取及显示字段校验成功，其余状态会给出明确诊断；它们与 `loaded` / `statusText` 的运行状态相互独立。
- 修改插件后仍需完全退出 DeepSeek Harness（⌘Q）再打开，单测通过或刷新浏览器不等于当前桌面进程已加载新代码。

## 开发

```bash
for file in lib/*.js; do node --check "$file"; done
node --test
# 含官方 Cordis / Loader / pluginInventory 集成测试：
DSH_SOURCE_DIR=/path/to/dsh node --test
```

未设置 `DSH_SOURCE_DIR` 时，官方源码集成测试会明确标记为跳过，其余回归仍运行。
