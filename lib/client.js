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
      ".sc-root { display: flex; flex-direction: column; height: 100%; min-height: 0; background: var(--dsw-alias-bg-base, #fff); color: var(--dsw-alias-label-primary, #1f2328); font-family: var(--dsw-font-family, -apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Segoe UI\", sans-serif); font-size: 13px; }",
      ".sc-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--dsw-alias-border-l3, #e6e6e6); background: var(--dsw-alias-bg-layer-1, #f7f7f8); flex: none; }",
      ".sc-title { font-weight: 600; white-space: nowrap; font-size: 13px; }",
      ".sc-tabs { display: inline-flex; gap: 4px; flex: none; }",
      ".sc-tab { border: 1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border-l3, #d0d0d0)); background: transparent; border-radius: 10px; padding: 3px 10px; cursor: pointer; color: var(--dsw-alias-label-primary, #1f2328); font: inherit; font-size: 13px; }",
      ".sc-tab:hover { background: var(--dsw-alias-interactive-bg-hover); }",
      ".sc-tab.is-on { background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #007aff) 16%, transparent); border-color: var(--dsw-alias-border-l2, var(--dsw-alias-border-l3, #d0d0d0)); color: var(--dsw-alias-label-primary, #1f2328); }",
      ".sc-tab.is-on:hover { background: var(--dsw-alias-interactive-bg-hover); }",
      ".sc-tab:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary, #007aff); outline-offset: 1px; }",
      ".sc-search { flex: 1 1 180px; min-width: 120px; max-width: 100%; box-sizing: border-box; border: 1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border-l3, #d0d0d0)); border-radius: 10px; padding: 4px 8px; font: inherit; font-size: 13px; background: var(--dsw-alias-bg-base, #fff); color: var(--dsw-alias-label-primary, #1f2328); }",
      ".sc-search:hover { background: var(--dsw-alias-interactive-bg-hover); }",
      ".sc-search:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary, #007aff); outline-offset: 1px; }",
      ".sc-select { min-width: 0; max-width: 100%; border: 1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border-l3, #d0d0d0)); border-radius: 10px; padding: 4px 6px; font: inherit; font-size: 13px; background: var(--dsw-alias-bg-base, #fff); color: var(--dsw-alias-label-primary, #1f2328); }",
      ".sc-select:hover { background: var(--dsw-alias-interactive-bg-hover); }",
      ".sc-select:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary, #007aff); outline-offset: 1px; }",
      ".sc-select option { background: var(--dsw-alias-bg-base, #fff); color: var(--dsw-alias-label-primary, #1f2328); }",
      ".sc-meta { padding: 6px 12px; color: var(--dsw-alias-label-secondary, #868e96); font-size: 12px; flex: none; }",
      ".sc-list { flex: 1; min-height: 0; overflow: auto; padding: 8px 12px 20px; }",
      ".sc-card { border: 1px solid var(--dsw-alias-border-l3, #e6e6e6); border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; background: var(--dsw-alias-bg-base, #fff); }",
      ".sc-row { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; }",
      ".sc-name { font-weight: 600; overflow-wrap: anywhere; }",
      ".sc-badge { font-size: 12px; color: var(--dsw-alias-label-secondary, #868e96); }",
      ".sc-badge.is-on { color: #2b8a3e; }",
      ".sc-desc { margin-top: 4px; color: var(--dsw-alias-label-secondary, #495057); line-height: 1.45; overflow-wrap: anywhere; }",
      ".sc-links { margin-top: 6px; display: flex; gap: 10px; flex-wrap: wrap; }",
      ".sc-links a { color: var(--dsw-alias-link, #4176e6); text-decoration: none; }",
      ".sc-empty { padding: 24px; text-align: center; color: var(--dsw-alias-label-secondary, #868e96); }",
      ".sc-pager { display: flex; gap: 8px; align-items: center; padding: 8px 12px; border-top: 1px solid var(--dsw-alias-border-l3, #e6e6e6); flex: none; }",
      ".sc-btn { border: 1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border-l3, #d0d0d0)); background: var(--dsw-alias-bg-base, #fff); border-radius: 10px; padding: 3px 10px; cursor: pointer; font: inherit; font-size: 13px; color: var(--dsw-alias-label-primary, #1f2328); }",
      ".sc-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }",
      ".sc-btn:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary, #007aff); outline-offset: 1px; }",
      ".sc-btn, .sc-tab { white-space: nowrap; flex: none; }",
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

    var LIST_LOADING = "加载中…";
    var LIST_UPDATING = "正在更新…";
    var LIST_FAILURE = "加载失败，请刷新重试";
    var LIST_EMPTY = "没有匹配的插件";

    function apiGet(params, signal) {
      return new Promise(function (resolve, reject) {
        var settled = false;
        var controller = new AbortController();
        var timer = setTimeout(function () {
          controller.abort();
          settle(new Error("加载超时"));
        }, 15000);
        function settle(error, value) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (signal) signal.removeEventListener("abort", onAbort);
          if (error) reject(error);
          else resolve(value);
        }
        function onAbort() {
          clearTimeout(timer);
          controller.abort();
        }
        if (signal) {
          if (signal.aborted) onAbort();
          else signal.addEventListener("abort", onAbort);
        }
        fetch(API_PATH + "?" + new URLSearchParams(params).toString(), { signal: controller.signal }).then(function (res) {
          return res.json();
        }).then(function (body) {
          settle(null, body);
        }, function (error) {
          settle(error);
        });
      });
    }

    function isRecord(value) {
      return value !== null && typeof value === "object" && !Array.isArray(value);
    }

    function requireData(valid, field) {
      if (!valid) throw new Error("加载失败：响应数据格式无效（" + field + "）");
    }

    function optionalStrings(value, fields, prefix) {
      fields.forEach(function (field) {
        requireData(value[field] === undefined || typeof value[field] === "string", prefix + "." + field);
      });
    }

    function validateResponse(res, view) {
      requireData(isRecord(res) && typeof res.ok === "boolean", "response");
      if (!res.ok) {
        optionalStrings(res, ["error"], "response");
        throw new Error(res.error || "加载失败");
      }
      requireData(Array.isArray(res.plugins), "plugins");
      if (res.categories !== undefined) {
        requireData(isRecord(res.categories), "categories");
        Object.keys(res.categories).forEach(function (key) {
          var label = res.categories[key];
          requireData(isRecord(label), "categories." + key);
          optionalStrings(label, ["zh", "en"], "categories." + key);
        });
      }
      if (view === "catalog") {
        optionalStrings(res, ["updated"], "response");
        requireData(Number.isSafeInteger(res.total) && res.total >= 0, "total");
        requireData(res.limit === undefined || (Number.isSafeInteger(res.limit) && res.limit >= 1 && res.limit <= 100), "limit");
        requireData(res.page === undefined || (Number.isSafeInteger(res.page) && res.page >= 1), "page");
      }
      res.plugins.forEach(function (item, index) {
        var prefix = "plugins[" + index + "]";
        requireData(isRecord(item) && typeof item.name === "string", prefix + ".name");
        optionalStrings(item, ["description"], prefix);
        if (view === "installed") {
          requireData(typeof item.id === "string", prefix + ".id");
          optionalStrings(item, ["version", "statusText", "path", "metadataStatus", "metadataError"], prefix);
          requireData(item.metadataStatus === undefined || ["ok", "missing", "invalid", "unreadable"].includes(item.metadataStatus), prefix + ".metadataStatus");
          ["loaded", "mixed"].forEach(function (field) {
            requireData(item[field] === undefined || typeof item[field] === "boolean", prefix + "." + field);
          });
          if (item.references !== undefined) {
            requireData(Array.isArray(item.references), prefix + ".references");
            item.references.forEach(function (reference, i) {
              requireData(isRecord(reference), prefix + ".references[" + i + "]");
              optionalStrings(reference, ["scopeLabel", "scope", "presetId", "statusText"], prefix + ".references[" + i + "]");
            });
          }
        } else {
          requireData(typeof item.owner === "string", prefix + ".owner");
          optionalStrings(item, ["added", "category", "url", "page"], prefix);
          requireData(item.stars === undefined || (typeof item.stars === "number" && Number.isFinite(item.stars)), prefix + ".stars");
          requireData(item.downloads === undefined || item.downloads === null || (typeof item.downloads === "number" && Number.isFinite(item.downloads)), prefix + ".downloads");
        }
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
      var queryState = React.useState("");
      var query = queryState[0];
      var setQuery = queryState[1];
      var queryRef = React.useRef("");
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
      var categoriesState = React.useState({});
      var categories = categoriesState[0];
      var setCategories = categoriesState[1];
      var requestRef = React.useRef({ id: 0, controller: null });

      var load = React.useCallback(function (refresh) {
        var current = requestRef.current;
        if (current.controller) current.controller.abort();
        var id = ++current.id;
        var controller = current.controller = new AbortController();
        setBusy(true);
        setErr("");
        var params = { action: "catalog", q: query, category: cat, sort: sort, page: String(page), limit: "40" };
        if (refresh === true) params.refresh = "1";
        var req = tab === "installed"
          ? apiGet({ action: "installed" }, controller.signal)
          : apiGet(params, controller.signal);
        req.then(function (res) {
          if (id !== current.id) return;
          validateResponse(res, tab);
          if (tab === "catalog") {
            var lastPage = Math.max(1, Math.ceil(res.total / (res.limit || 40)));
            if (page > lastPage) {
              // The refresh already populated the Host cache. The page change
              // runs the normal guarded effect, fetching real corrected-page data
              // with the same filters rather than relabelling this empty response.
              setPage(lastPage);
              return;
            }
          }
          setBusy(false);
          setErr("");
          setData(Object.assign({}, res, { view: tab }));
          if (res.categories) setCategories(res.categories);
        }).catch(function (error) {
          if (id !== current.id) return;
          setBusy(false);
          setErr(error && typeof error.message === "string" ? error.message : String(error));
        });
      }, [tab, query, cat, sort, page]);

      React.useEffect(function () {
        load(false);
        return function () {
          ++requestRef.current.id;
          if (requestRef.current.controller) requestRef.current.controller.abort();
        };
      }, [load]);

      React.useEffect(function () {
        if (queryRef.current === q) return undefined;
        var timer = setTimeout(function () {
          queryRef.current = q;
          setQuery(q);
          setPage(1);
        }, 200);
        return function () { clearTimeout(timer); };
      }, [q]);

      var hasList = !!(data && data.view === tab && Array.isArray(data.plugins));
      var cards = [];
      if (!err && hasList && tab === "installed") {
        cards = data.plugins.map(function (item) {
          var runtimeStatuses = [];
          (item.references || []).forEach(function (reference) {
            var scope = reference.scopeLabel || (reference.scope === "host" ? "桌面 Host"
              : "预设 " + reference.presetId + (reference.scope === "preset-runtime" ? "运行实例" : ""));
            var label = scope + "：" + (reference.statusText || "状态未知");
            if (!runtimeStatuses.includes(label)) runtimeStatuses.push(label);
          });
          return React.createElement(
            "div",
            { key: item.id, className: "sc-card" },
            React.createElement(
              "div",
              { className: "sc-row" },
              React.createElement("span", { className: "sc-name" }, item.name),
              item.version ? React.createElement("span", { className: "sc-badge" }, "v" + item.version) : null,
              React.createElement("span", { className: "sc-badge" + (item.loaded && !item.mixed ? " is-on" : "") }, item.statusText || "状态未知"),
            ),
            runtimeStatuses.map(function (label) {
              return React.createElement("div", { key: label, className: "sc-desc" }, label);
            }),
            item.metadataStatus && item.metadataStatus !== "ok" ? React.createElement(
              "div", { className: "sc-desc" },
              (item.metadataStatus === "missing" ? "元数据缺失" : item.metadataStatus === "invalid" ? "元数据无效" : "元数据无法读取")
                + (item.metadataError ? "：" + item.metadataError : ""),
            ) : null,
            item.description ? React.createElement("div", { className: "sc-desc" }, item.description) : null,
            item.path ? React.createElement("div", { className: "sc-desc" }, item.path) : null,
          );
        });
      }
      if (!err && hasList && tab === "catalog") {
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
              item.category ? React.createElement("span", { className: "sc-badge" }, categoryLabel(categories, item.category)) : null,
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
      if (categories) {
        Object.keys(categories).forEach(function (key) {
          catOptions.push(React.createElement("option", { key: key, value: key }, categoryLabel(categories, key)));
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
                onChange: function (event) { setQ(event.target.value); },
              })
            : null,
          tab === "catalog"
            ? React.createElement("select", {
                className: "sc-select",
                "aria-label": "插件分类",
                value: cat,
                onChange: function (event) { setCat(event.target.value); setPage(1); },
              }, catOptions)
            : null,
          tab === "catalog"
            ? React.createElement(
                "select",
                {
                  className: "sc-select",
                  "aria-label": "排序方式",
                  value: sort,
                  onChange: function (event) { setSort(event.target.value); setPage(1); },
                },
                React.createElement("option", { value: "stars" }, "评星最高"),
                React.createElement("option", { value: "added" }, "最新收录"),
                React.createElement("option", { value: "downloads" }, "下载最多"),
                React.createElement("option", { value: "name" }, "名称 A-Z"),
              )
            : null,
          React.createElement("button", { type: "button", className: "sc-btn", onClick: function () { load(true); } }, "刷新"),
        ),
        React.createElement(
          "div",
          { className: "sc-meta" },
          err || (busy ? (hasList ? LIST_UPDATING : LIST_LOADING) : (tab === "installed"
            ? ((data && data.view === tab && data.plugins && data.plugins.length) || 0) + " 个本机插件（只读；Host 状态不代表 Client 或当前会话已启用）"
            : "awesome-dsh-plugin " + ((data && data.view === tab && data.updated) || "") + " · 共 " + ((data && data.view === tab && data.total) || 0) + " 条")),
        ),
        React.createElement(
          "div",
          { className: "sc-list" },
          cards.length ? cards : React.createElement("div", { className: "sc-empty" }, err ? LIST_FAILURE : (busy && !hasList ? LIST_LOADING : LIST_EMPTY)),
        ),
        tab === "catalog" && data && data.view === tab
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
