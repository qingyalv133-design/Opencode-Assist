/* Risk Monitor — standalone interaction layer.
   Category model is in risk-data.js; visual system is in risk-monitor.css. */
(function () {
  "use strict";

  var CATEGORIES = window.RISK_CATEGORIES || [];
  var POLICY_KEY = "risk-monitor-policy-v1";
  var HISTORY_KEY = "risk-monitor-history-v1";
  var MAX_HISTORY = 20;
  var modalTrigger = null;
  var pending = null;

  var ICONS = {
    system: "⚡",
    files: "🗂",
    privacy: "🔒",
    software: "🧩",
    money: "💳",
    irreversible: "⚠"
  };
  var ACTION_SAMPLES = {
    system: [
      ["Run the production build", "Compiles the project and can use most of the CPU for several minutes."],
      ["Start the asset pipeline in watch mode", "Keeps a background process running after the task finishes."]
    ],
    files: [
      ["Delete build/artifacts", "Permanently removes generated files from the project."],
      ["Rewrite src/config.ts", "Changes a project file. A backup is created first."]
    ],
    privacy: [
      ["Upload the release bundle", "Sends project files to an external deployment server."],
      ["Read .env.local", "Opens a file that may contain credentials and API keys."]
    ],
    software: [
      ["Install @pixelgame/engine", "Adds a package to the project and its lockfile."],
      ["Change the default shell", "Updates a system-level setting that persists after the task."]
    ],
    money: [
      ["Purchase a compute add-on", "Creates a charge on the connected billing account."],
      ["Send a release notification", "Publishes a message to an external audience."]
    ],
    irreversible: [
      ["Force-push main to origin", "Rewrites remote history and cannot be undone for collaborators."],
      ["Delete the production workspace", "Permanently removes files and their history."]
    ]
  };

  function $(id) { return document.getElementById(id); }
  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function categoryById(id) {
    for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === id) return CATEGORIES[i];
    return CATEGORIES[0];
  }
  function defaultPolicy() {
    var categories = {};
    CATEGORIES.forEach(function (cat) { categories[cat.id] = cat.defaultSetting || "ask"; });
    return { approvalRequired: true, categories: categories };
  }
  function readPolicy() {
    var fallback = defaultPolicy();
    try {
      var saved = JSON.parse(localStorage.getItem(POLICY_KEY) || "null");
      if (!saved || typeof saved !== "object" || !saved.categories) return fallback;
      var merged = { approvalRequired: saved.approvalRequired !== false, categories: {} };
      CATEGORIES.forEach(function (cat) {
        var value = saved.categories[cat.id];
        merged.categories[cat.id] = value === "auto" || value === "block" ? value : "ask";
      });
      return merged;
    } catch (e) { return fallback; }
  }
  function savePolicy(policy) {
    try { localStorage.setItem(POLICY_KEY, JSON.stringify(policy)); } catch (e) { /* ignore */ }
    renderStats();
  }
  function setPolicy(id, value) {
    var policy = readPolicy();
    policy.categories[id] = value;
    savePolicy(policy);
    document.querySelectorAll('.risk-card[data-cat="' + id + '"] .seg').forEach(function (seg) {
      seg.classList.toggle("on", seg.dataset.value === value);
    });
    if (pending && pending.category === id) renderPending();
  }
  function readHistory() {
    try {
      var list = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }
  function writeHistory(list) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY))); } catch (e) { /* ignore */ }
  }
  function relativeTime(ms) {
    var diff = Date.now() - ms;
    if (diff < 60000) return "just now";
    if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
    if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
    return Math.floor(diff / 86400000) + "d ago";
  }
  function riskLabel(level) {
    return level === "high" ? "High" : level === "med" ? "Medium" : "Low";
  }
  function riskClass(level) {
    return level === "high" ? "high" : level === "med" ? "medium" : "low";
  }

  function renderStats() {
    var policy = readPolicy();
    var counts = { auto: 0, ask: 0, block: 0 };
    CATEGORIES.forEach(function (cat) { counts[policy.categories[cat.id] || "ask"] += 1; });
    $("overview-stats").innerHTML =
      '<div class="stat auto"><strong>' + counts.auto + '</strong><span>Auto</span></div>' +
      '<div class="stat ask"><strong>' + counts.ask + '</strong><span>Ask</span></div>' +
      '<div class="stat block"><strong>' + counts.block + '</strong><span>Block</span></div>';
  }

  function renderCards() {
    var policy = readPolicy();
    $("risk-grid").innerHTML = CATEGORIES.map(function (cat) {
      var value = policy.categories[cat.id] || "ask";
      return '<article class="risk-card" data-cat="' + cat.id + '" tabindex="0" role="button" aria-label="Open ' + escapeHtml(cat.title) + ' details">' +
        '<div class="risk-card-top">' +
          '<div class="risk-icon" aria-hidden="true">' + (ICONS[cat.id] || "•") + '</div>' +
          '<div><div class="risk-title">' + escapeHtml(cat.title) + '</div>' +
            '<div class="risk-meta">' + escapeHtml(cat.overallRisk) + ' risk · default ' + escapeHtml(cat.defaultSetting) + '</div></div>' +
          '<button type="button" class="info-btn" data-info="' + cat.id + '" aria-label="View ' + escapeHtml(cat.title) + ' details" aria-haspopup="dialog">ⓘ</button>' +
        '</div>' +
        '<div class="segmented" role="group" aria-label="' + escapeHtml(cat.title) + ' handling">' +
          '<button type="button" class="seg' + (value === "auto" ? " on" : "") + '" data-value="auto">Auto</button>' +
          '<button type="button" class="seg' + (value === "ask" ? " on" : "") + '" data-value="ask">Ask</button>' +
          '<button type="button" class="seg' + (value === "block" ? " on" : "") + '" data-value="block">Block</button>' +
        '</div>' +
      '</article>';
    }).join("");

    $("risk-grid").querySelectorAll(".risk-card").forEach(function (card) {
      var id = card.dataset.cat;
      card.addEventListener("click", function (event) {
        if (event.target.closest("button")) return;
        openDetail(id, card);
      });
      card.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openDetail(id, card); }
      });
      card.querySelector(".info-btn").addEventListener("click", function (event) {
        event.stopPropagation(); openDetail(id, card);
      });
      card.querySelectorAll(".seg").forEach(function (seg) {
        seg.addEventListener("click", function (event) {
          event.stopPropagation();
          setPolicy(id, seg.dataset.value);
          card.querySelectorAll(".seg").forEach(function (item) { item.classList.toggle("on", item === seg); });
        });
      });
    });
  }

  function renderDetail(cat) {
    var modal = $("modal");
    modal.dataset.cat = cat.id;
    $("modal-icon").textContent = ICONS[cat.id] || "•";
    $("modal-eyebrow").textContent = "RISK CATEGORY · " + String(cat.id).toUpperCase();
    $("modal-title").textContent = cat.title;
    $("modal-summary").textContent = cat.summary || "";
    $("modal-risk").className = "risk-pill " + riskClass((cat.overallRisk || "").toLowerCase());
    $("modal-risk").textContent = (cat.overallRisk || "Medium") + " risk";

    var dims = ["read", "change", "execute", "egress", "persist"];
    var dimLabels = { read: "Read", change: "Change", execute: "Execute", egress: "Send out", persist: "Persist" };
    var tileDims = '<div class="tile tile-dims"><h3>Risk dimensions</h3><div class="dims">' + dims.map(function (key) {
      var level = (cat.dims && cat.dims[key]) || "low";
      return '<div class="dim"><div class="dim-label">' + dimLabels[key] + '</div>' +
        '<div class="dim-track"><div class="dim-fill ' + level + '"></div></div>' +
        '<div class="dim-val">' + riskLabel(level) + '</div></div>';
    }).join("") + "</div></div>";

    var tileHero = '<div class="tile tile-hero"><h3>Why this matters</h3><p class="hero-summary">' +
      escapeHtml(cat.summary || "") + '</p><div class="hero-tags"><span class="tag">' +
      escapeHtml(cat.overallRisk) + ' risk</span><span class="tag">Default: ' + escapeHtml(cat.defaultSetting) +
      '</span><span class="tag">' + (cat.ops ? cat.ops.length : 0) + ' possible operations</span></div></div>';

    var tileOps = '<div class="tile tile-ops"><h3>What it can do</h3><div class="ops">' +
      (cat.ops || []).map(function (op) { return "<span>" + escapeHtml(op) + "</span>"; }).join("") + "</div></div>";

    var tileStats = '<div class="tile tile-stats"><h3>Key facts</h3><div class="stats">' +
      (cat.keyStats || []).map(function (stat) { return "<span>" + escapeHtml(stat) + "</span>"; }).join("") + "</div></div>";

    var tileRisks = '<div class="tile tile-risks"><h3>Risk breakdown</h3><div class="risk-rows">' +
      (cat.riskRows || []).map(function (row) {
        return '<div class="risk-row"><div class="risk-row-icon">' + escapeHtml((row.icon || "").indexOf("fa-") === 0 ? "•" : "•") + '</div>' +
          '<div class="risk-row-body"><div class="risk-row-name"><span class="level ' + trendClass(row.level) + '"></span>' +
          escapeHtml(row.name) + '</div><div class="risk-row-desc">' + escapeHtml(row.desc) + '</div></div></div>';
      }).join("") + "</div></div>";

    var tileNotes = '<div class="tile tile-notes"><h3>Guidance</h3><ul class="notes">' +
      (cat.notes || []).map(function (note) { return "<li>" + escapeHtml(note) + "</li>"; }).join("") + "</ul></div>";

    var tileInteractions = '<div class="tile tile-interactions"><h3>If this goes wrong</h3>' +
      (cat.interactions || []).map(function (item) {
        return '<div class="interaction"><b>' + escapeHtml(item.on) + '</b><span>' + escapeHtml(item.action) + '</span></div>';
      }).join("") + "</div>";

    $("modal-body").innerHTML = '<div class="bento">' + tileHero + tileDims + tileOps + tileStats + tileRisks + tileNotes + tileInteractions + "</div>";
    $("modal-body").scrollTop = 0;
  }
  function trendClass(level) {
    return level === "high" ? "high" : level === "med" ? "med" : "low";
  }
  function openDetail(id, trigger) {
    modalTrigger = trigger || null;
    renderDetail(categoryById(id));
    $("modal").classList.add("open");
    $("modal").setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    window.setTimeout(function () { $("modal-close").focus(); }, 20);
  }
  function closeDetail() {
    $("modal").classList.remove("open");
    $("modal").setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (modalTrigger) modalTrigger.focus();
  }

  function sampleAction(cat) {
    var list = ACTION_SAMPLES[cat.id] || [["Run an action", "A simulated agent operation."]];
    return list[Math.floor(Math.random() * list.length)];
  }
  function simulate() {
    var cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    var action = sampleAction(cat);
    pending = { category: cat.id, action: action[0], description: action[1], id: "req-" + Date.now() };
    renderPending();
    $("pending-box").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function renderPending() {
    var box = $("pending-box");
    if (!pending) {
      box.className = "pending-box empty";
      box.innerHTML = '<div class="empty-state"><span class="empty-icon">◎</span><div><strong>No request in the queue</strong><p>Simulate a request to see how the policy is applied.</p></div></div>';
      return;
    }
    var cat = categoryById(pending.category);
    var policy = readPolicy();
    var setting = policy.categories[cat.id] || "ask";
    var note = setting === "block"
      ? "Blocked by policy. This action cannot run without changing the category to Ask or Auto."
      : setting === "auto"
        ? "Auto is allowed, but this demo still asks once so you can inspect the request."
        : "Ask policy: approval is required before this action can run.";
    box.className = "pending-box";
    box.innerHTML = '<div class="pending-item">' +
      '<div class="pending-badge" style="--cat-tint:var(--blue-tint)">' + (ICONS[cat.id] || "•") + '</div>' +
      '<div class="pending-body"><div class="pending-action">' + escapeHtml(pending.action) + '</div>' +
      '<div class="pending-desc">' + escapeHtml(pending.description) + '</div>' +
      '<div class="pending-desc" style="margin-top:7px">' + escapeHtml(cat.title) + ' · ' + setting.toUpperCase() + ' · ' + riskLabel((cat.overallRisk || "Medium").toLowerCase()) + ' risk</div>' +
      '<div class="pending-actions">' +
        (setting === "block" ? '' : '<button type="button" class="approve-btn" id="approve-request">Approve</button>') +
        '<button type="button" class="deny-btn" id="deny-request">Deny</button>' +
      '</div></div></div>' +
      '<p class="pending-desc" style="margin:10px 0 0 46px">' + escapeHtml(note) + '</p>';
    var approve = $("approve-request");
    if (approve) approve.addEventListener("click", function () { decide(true); });
    $("deny-request").addEventListener("click", function () { decide(false); });
  }
  function decide(approved) {
    if (!pending) return;
    var cat = categoryById(pending.category);
    var list = readHistory();
    list.unshift({
      time: Date.now(),
      category: cat.id,
      action: pending.action,
      consequence: pending.description,
      denied: !approved
    });
    writeHistory(list);
    pending = null;
    renderPending();
    renderHistory();
  }
  function renderHistory() {
    var list = readHistory();
    var box = $("history");
    if (!list.length) {
      box.innerHTML = '<div class="history-empty">No decisions yet. Approved and denied requests will appear here.</div>';
      return;
    }
    box.innerHTML = list.map(function (item) {
      var cat = categoryById(item.category);
      return '<div class="history-row"><span class="history-chip" style="background:' + cat.color + ';color:' + cat.text + '">' +
        escapeHtml(cat.title) + '</span><div class="history-main"><div class="history-action"><b>' +
        escapeHtml(item.action) + '</b>' + (item.denied ? ' <span class="denied">denied</span>' : '') + '</div>' +
        '<div class="history-action" style="color:var(--muted);font-size:10.5px;margin-top:2px">' + escapeHtml(item.consequence) + '</div></div>' +
        '<span class="history-time">' + relativeTime(item.time) + '</span></div>';
    }).join("");
  }

  function resetPolicy() {
    savePolicy(defaultPolicy());
    renderCards();
    renderPending();
  }
  function clearHistory() {
    writeHistory([]);
    renderHistory();
  }

  function boot() {
    if (!CATEGORIES.length) {
      document.body.innerHTML = '<p style="padding:24px;color:#fff">Risk data failed to load.</p>';
      return;
    }
    renderCards();
    renderStats();
    renderPending();
    renderHistory();
    $("simulate").addEventListener("click", simulate);
    $("reset-policy").addEventListener("click", resetPolicy);
    $("clear-history").addEventListener("click", clearHistory);
    $("modal-close").addEventListener("click", closeDetail);
    $("modal").addEventListener("click", function (event) { if (event.target === $("modal")) closeDetail(); });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && $("modal").classList.contains("open")) closeDetail();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
