# shichang

DeepSeek Harness 官方桌面端的只读插件市场。会话中间列增加 **市场** 标签：查看本机 `$DSH_HOME/plugins` 已装插件，以及 [awesome-dsh-plugin](https://awesome-dsh-plugin.com/) 社区目录（搜索、分类、按评星 / 收录日期 / 下载量 / 名称排序）。

**不提供安装和卸载。** 面向官方桌面（`connection.fetch`），不走 `dsh plugin --profile desktop`。

## 安装

复制到 `$DSH_HOME/plugins/shichang`，在 `$DSH_HOME/profiles/desktop/cordis.patch.yml` 写入：

```yaml
- insert:
    - id: shichang
      name: ../../plugins/shichang/lib/index.js
```

完全退出 DeepSeek Harness（macOS：⌘Q）再打开。中间列会出现 **市场**。

## 说明

- 社区数据来自公开的 `https://awesome-dsh-plugin.com/plugins.json`
- 「最新收录」按目录的 `added` 字段，不是 GitHub Release 时间
- 仓库内不含本机 patch、账号或凭据

## 开发

```bash
node --check lib/index.js lib/client.js lib/parse.js
node --test
```
