# shichang

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
- 本机列表：desktop patch 里的显示「已加载」；只被用户 preset 引用的（如 `yasuo`）显示「用户 preset」，不要写进 desktop patch

## 开发

```bash
node --check lib/index.js lib/client.js lib/parse.js
node --test
```
