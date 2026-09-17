window.__ModuleLoader__.load({
  id: "shichang",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    var React = require("react");

    var inject = ["slots", "sidebarRightTabs"];
    var TAB_ID = "shichang";
    var TAB_KIND = "shichang";
    var API_PATH = "/api/shichang";
    var STYLE_ID = "shichang-style";

    var cssText = [
      ".sc-root { display: flex; flex-direction: column; height: 100%; min-height: 0; background: var(--dsw-alias-bg-base, #fff); color: var(--dsw-alias-label-primary, #1f2328); font-size: 13px; }",
      ".sc-toolbar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--dsw-alias-border-l3, #e6e6e6); background: var(--dsw-alias-bg-layer-1, #f7f7f8); flex: none; }",
      ".sc-title { font-weight: 600; }",
      ".sc-tabs { display: inline-flex; gap: 4px; }",
      ".sc-tab { border: 1px solid var(--dsw-alias-border-l3, #d0d0d0); background: transparent; border-radius: 6px; padding: 3px 10px; cursor: pointer; color: inherit; font: inherit; }",
      ".sc-tab.is-on { background: #094771; border-color: #094771; color: #fff; }",
      ".sc-search { flex: 1; min-width: 120px; border: 1px solid var(--dsw-alias-border-l3, #d0d0d0); border-radius: 6px; padding: 4px 8px; font: inherit; background: #fff; color: inherit; }",
      ".sc-select { border: 1px solid var(--dsw-alias-border-l3, #d0d0d0); border-radius: 6px; padding: 4px 6px; font: inherit; background: #fff; color: inherit; }",
      ".sc-meta { padding: 6px 12px; color: var(--dsw-alias-label-secondary, #868e96); font-size: 12px; flex: none; }",
      ".sc-list { flex: 1; min-height: 0; overflow: auto; padding: 8px 12px 20px; }",
      ".sc-card { border: 1px solid var(--dsw-alias-border-l3, #e6e6e6); border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; background: var(--dsw-alias-bg-base, #fff); }",
      ".sc-row { display: flex; align-items: baseline; gap: 8px; }",
      ".sc-name { font-weight: 600; }",
      ".sc-badge { font-size: 11px; color: var(--dsw-alias-label-secondary, #868e96); }",
      ".sc-badge.is-on { color: #2b8a3e; }",
      ".sc-desc { margin-top: 4px; color: var(--dsw-alias-label-secondary, #495057); line-height: 1.45; }",
      ".sc-links { margin-top: 6px; display: flex; gap: 10px; flex-wrap: wrap; }",
      ".sc-links a { color: var(--dsw-alias-link, #4176e6); text-decoration: none; }",
      ".sc-empty { padding: 24px; text-align: center; color: var(--dsw-alias-label-secondary, #868e96); }",
      ".sc-pager { display: flex; gap: 8px; align-items: center; padding: 8px 12px; border-top: 1px solid var(--dsw-alias-border-l3, #e6e6e6); flex: none; }",
      ".sc-btn { border: 1px solid var(--dsw-alias-border-l3, #d0d0d0); background: #fff; border-radius: 6px; padding: 3px 10px; cursor: pointer; font: inherit; color: inherit; }",
      ".sc-btn:disabled { opacity: 0.45; cursor: default; }",
    ].join(" ");

    function MarketGlyph(props) {
      var size = props && props.size != null ? props.size : 26;
      return React.createElement(
        "svg",
        {
          width: size,
          height: size,
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "1.7",
          className: props && props.className,
          "aria-hidden": "true",
        },
        React.createElement("path", { d: "M4 9h16l-1 11H5L4 9z" }),
        React.createElement("path", { d: "M9 9V7a3 3 0 0 1 6 0v2" }),
      );
    }

    function MarketTitle() {
      return React.createElement("span", null, "市场");
    }

    function ensureStyle() {
      var existing = document.getElementById(STYLE_ID);
      if (existing) {
        existing.textContent = cssText;
        return;
      }
      var style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = cssText;
      document.head.appendChild(style);
    }

    function apiGet(params) {
      return fetch(API_PATH + "?" + new URLSearchParams(params).toString()).then(function (res) {
        return res.json();
      });
    }

    function categoryLabel(categories, key) {
      var item = categories && categories[key];
      if (!item) return key;
      return item.zh || item.en || key;
    }

    function MarketApp() {
      var tabState = React.useState("installed");
      var tab = tabState[0];
      var setTab = tabState[1];
      var qState = React.useState("");
      var q = qState[0];
      var setQ = qState[1];
      var catState = React.useState("");
      var cat = catState[0];
      var setCat = catState[1];
      var sortState = React.useState("stars");
      var sort = sortState[0];
      var setSort = sortState[1];
      var pageState = React.useState(1);
      var page = pageState[0];
      var setPage = pageState[1];
      var dataState = React.useState(null);
      var data = dataState[0];
      var setData = dataState[1];
      var errState = React.useState("");
      var err = errState[0];
      var setErr = errState[1];
      var busyState = React.useState(false);
      var busy = busyState[0];
      var setBusy = busyState[1];

      var load = React.useCallback(function () {
        setBusy(true);
        var req = tab === "installed"
          ? apiGet({ action: "installed" })
          : apiGet({ action: "catalog", q: q, category: cat, sort: sort, page: String(page), limit: "40" });
        req.then(function (res) {
          setBusy(false);
          if (!res || !res.ok) {
            setErr((res && res.error) || "加载失败");
            return;
          }
          setErr("");
          setData(res);
        }).catch(function (error) {
          setBusy(false);
          setErr(String(error));
        });
      }, [tab, q, cat, sort, page]);

      React.useEffect(function () { load(); }, [load]);

      var cards = [];
      if (tab === "installed" && data && data.plugins) {
        cards = data.plugins.map(function (item) {
          return React.createElement(
            "div",
            { key: item.id, className: "sc-card" },
            React.createElement(
              "div",
              { className: "sc-row" },
              React.createElement("span", { className: "sc-name" }, item.name),
              item.version ? React.createElement("span", { className: "sc-badge" }, "v" + item.version) : null,
              React.createElement("span", { className: "sc-badge" + (item.loaded ? " is-on" : "") }, item.via === "preset" ? "用户 preset" : (item.loaded ? "已加载" : "未写入 patch")),
            ),
            item.description ? React.createElement("div", { className: "sc-desc" }, item.description) : null,
            item.path ? React.createElement("div", { className: "sc-desc" }, item.path) : null,
          );
        });
      }
      if (tab === "catalog" && data && data.plugins) {
        cards = data.plugins.map(function (item) {
          return React.createElement(
            "div",
            { key: item.owner + "/" + item.name, className: "sc-card" },
            React.createElement(
              "div",
              { className: "sc-row" },
              React.createElement("span", { className: "sc-name" }, item.name),
              React.createElement("span", { className: "sc-badge" }, item.owner),
              item.stars ? React.createElement("span", { className: "sc-badge" }, "★ " + item.stars) : null,
              item.downloads != null ? React.createElement("span", { className: "sc-badge" }, "↓ " + item.downloads) : null,
              item.added ? React.createElement("span", { className: "sc-badge" }, item.added) : null,
              item.category ? React.createElement("span", { className: "sc-badge" }, categoryLabel(data.categories, item.category)) : null,
            ),
            item.description ? React.createElement("div", { className: "sc-desc" }, item.description) : null,
            React.createElement(
              "div",
              { className: "sc-links" },
              item.url ? React.createElement("a", { href: item.url, target: "_blank", rel: "noreferrer" }, "GitHub") : null,
              item.page ? React.createElement("a", { href: item.page, target: "_blank", rel: "noreferrer" }, "目录页") : null,
            ),
          );
        });
      }

      var catOptions = [React.createElement("option", { key: "", value: "" }, "全部分类")];
      if (data && data.categories) {
        Object.keys(data.categories).forEach(function (key) {
          catOptions.push(React.createElement("option", { key: key, value: key }, categoryLabel(data.categories, key)));
        });
      }

      return React.createElement(
        "div",
        { className: "sc-root" },
        React.createElement(
          "div",
          { className: "sc-toolbar" },
          React.createElement("span", { className: "sc-title" }, "插件市场"),
          React.createElement(
            "span",
            { className: "sc-tabs" },
            React.createElement("button", {
              type: "button",
              className: "sc-tab" + (tab === "installed" ? " is-on" : ""),
              onClick: function () { setTab("installed"); setPage(1); },
            }, "已安装"),
            React.createElement("button", {
              type: "button",
              className: "sc-tab" + (tab === "catalog" ? " is-on" : ""),
              onClick: function () { setTab("catalog"); setPage(1); },
            }, "社区目录"),
          ),
          tab === "catalog"
            ? React.createElement("input", {
                className: "sc-search",
                value: q,
                placeholder: "搜索名称、作者、说明",
                onChange: function (event) { setQ(event.target.value); setPage(1); },
              })
            : null,
          tab === "catalog"
            ? React.createElement("select", {
                className: "sc-select",
                value: cat,
                onChange: function (event) { setCat(event.target.value); setPage(1); },
              }, catOptions)
            : null,
          tab === "catalog"
            ? React.createElement(
                "select",
                {
                  className: "sc-select",
                  value: sort,
                  onChange: function (event) { setSort(event.target.value); setPage(1); },
                },
                React.createElement("option", { value: "stars" }, "评星最高"),
                React.createElement("option", { value: "added" }, "最新收录"),
                React.createElement("option", { value: "downloads" }, "下载最多"),
                React.createElement("option", { value: "name" }, "名称 A-Z"),
              )
            : null,
          React.createElement("button", { type: "button", className: "sc-btn", onClick: load }, "刷新"),
        ),
        React.createElement(
          "div",
          { className: "sc-meta" },
          err || (busy ? "加载中…" : (tab === "installed"
            ? ((data && data.plugins && data.plugins.length) || 0) + " 个本机插件（只读，不提供安装卸载）"
            : "awesome-dsh-plugin " + ((data && data.updated) || "") + " · 共 " + ((data && data.total) || 0) + " 条")),
        ),
        React.createElement(
          "div",
          { className: "sc-list" },
          cards.length ? cards : React.createElement("div", { className: "sc-empty" }, busy ? "加载中…" : "没有匹配的插件"),
        ),
        tab === "catalog" && data
          ? React.createElement(
              "div",
              { className: "sc-pager" },
              React.createElement("button", {
                type: "button",
                className: "sc-btn",
                disabled: page <= 1 || busy,
                onClick: function () { setPage(page - 1); },
              }, "上一页"),
              React.createElement("span", null, "第 " + page + " 页"),
              React.createElement("button", {
                type: "button",
                className: "sc-btn",
                disabled: busy || page * ((data.limit) || 40) >= (data.total || 0),
                onClick: function () { setPage(page + 1); },
              }, "下一页"),
            )
          : null,
      );
    }

    function apply(ctx) {
      ensureStyle();
      function MarketTab(props) {
        return React.createElement(MarketApp, props);
      }
      ctx.effect(function () {
        return ctx.sidebarRightTabs.register({
          id: TAB_ID,
          kind: TAB_KIND,
          priority: "extension",
          title: function () { return "市场"; },
          guide: [{
            id: "open",
            order: 40,
            title: function () { return "市场"; },
            description: function () { return "查看本机插件和社区目录"; },
            icon: MarketGlyph,
          }],
        });
      }, "shichang.type");
      ctx.effect(function () {
        return ctx.slots.inject("sidebar.right.pane.tab", function () {
          return ctx.slots.register(
            { name: "sidebar.right.pane.tab", key: TAB_ID },
            MarketTab,
          );
        });
      }, "shichang.body");
      ctx.effect(function () {
        return ctx.slots.inject("sidebar.right.pane.tab.title", function () {
          return ctx.slots.register(
            { name: "sidebar.right.pane.tab.title", key: TAB_ID },
            MarketTitle,
          );
        });
      }, "shichang.title");
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
