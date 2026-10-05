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
- 社区目录的普通浏览使用 15 分钟缓存；点击「刷新」会重新请求远程目录，失败会明确显示错误。
- 控件使用桌面主题配色，窄侧栏会自动换行排列工具栏。

## 开发

```bash
for file in lib/*.js; do node --check "$file"; done
node --test
```
