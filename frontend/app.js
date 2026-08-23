(() => {
  const CFG = window.SCRAPESHIELD_CONFIG;
  const API = CFG.API_BASE_URL;
  const COLLECTION_ID = CFG.COLLECTION_ID;

  const FIELD_ORDER = ["title", "price", "availability", "rating", "category", "product_url"];
  const FIELD_LABELS = {
    title: "Title",
    price: "Price",
    availability: "Availability",
    rating: "Rating",
    category: "Category",
    product_url: "Product URL",
  };

  // ---- DOM refs ---------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const connIndicator = $("connIndicator");
  const connLabel = $("connLabel");
  const offlineBanner = $("offlineBanner");
  const offlineHost = $("offlineHost");
  const retryConnBtn = $("retryConn");

  const metricCollector = $("metricCollector");
  const metricRecords = $("metricRecords");
  const metricRecordsFoot = $("metricRecordsFoot");
  const metricFieldsHealthy = $("metricFieldsHealthy");
  const metricFailures = $("metricFailures");
  const metricFailuresFoot = $("metricFailuresFoot");

  const fieldList = $("fieldList");
  const refreshHealthBtn = $("refreshHealthBtn");

  const dataCardWrap = $("dataCardWrap");

  const healStatusBadge = $("healStatusBadge");
  const healSteps = $("healSteps");
  const healIdleMsg = $("healIdleMsg");
  const runHealBtn = $("runHealBtn");
  let demoFailureActive = false;

  const timelineEl = $("timeline");

  offlineHost.textContent = API;

  // ---- helpers ------------------------------------------------------------
  function fmtTime(d = new Date()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  function addTimelineEvent(title, tone = "info") {
    const li = document.createElement("li");
    li.dataset.tone = tone;
    li.innerHTML = `<p class="t-title">${title}</p><span class="t-time">${fmtTime()}</span>`;
    timelineEl.prepend(li);
  }

  async function apiFetch(path, options) {
    const res = await fetch(`${API}${path}`, options);
    if (!res.ok) {
      let detail = "";
      try { detail = (await res.json()).message || ""; } catch (_) {}
      throw new Error(detail || `Request failed (${res.status})`);
    }
    return res.json();
  }

  function setOffline(isOffline) {
    offlineBanner.classList.toggle("hidden", !isOffline);
    connIndicator.dataset.state = isOffline ? "offline" : "online";
    connLabel.textContent = isOffline ? "Backend unreachable" : "Bright Data Connected";
  }

  // ---- connection check ----------------------------------------------------
  async function checkConnection() {
    connIndicator.dataset.state = "pending";
    connLabel.textContent = "Connecting to Bright Data…";
    try {
      const root = await apiFetch("/");
      setOffline(false);
      if (root.collector_id) metricCollector.textContent = root.collector_id;
      addTimelineEvent("Collector connected", "good");
      return true;
    } catch (err) {
      setOffline(true);
      metricCollector.textContent = "unreachable";
      return false;
    }
  }

  // ---- extraction health ----------------------------------------------------
  function statusForRate(rate) {
    if (rate >= 90) return "healthy";
    if (rate >= 50) return "warning";
    return "failed";
  }

  const STATUS_ICONS = {
    healthy: '<svg viewBox="0 0 10 10" fill="none"><path d="M1.5 5.2L3.7 7.5L8.5 2.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    warning: '<svg viewBox="0 0 10 10" fill="none"><path d="M5 1V6M5 8.4V8.41" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    failed: '<svg viewBox="0 0 10 10" fill="none"><path d="M2 2L8 8M8 2L2 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  };

  function renderFieldHealth(health) {
    const fh = health.field_health || {};
    const keys = FIELD_ORDER.filter((k) => k in fh).concat(Object.keys(fh).filter((k) => !FIELD_ORDER.includes(k)));

    fieldList.innerHTML = "";
    let healthyCount = 0;

    keys.forEach((key, i) => {
      const f = fh[key];
      let rate = typeof f.success_rate === "number" ? f.success_rate : 0;

      if (key === "price" && demoFailureActive) {
          rate = 0;
    }
      const status = statusForRate(rate);
      if (status === "healthy") healthyCount++;

      const row = document.createElement("div");
      row.className = "field-row";
      row.dataset.status = status;
      row.style.animationDelay = `${i * 0.05}s`;
      row.innerHTML = `
        <span class="field-icon">${STATUS_ICONS[status]}</span>
        <span class="field-name">${FIELD_LABELS[key] || key}</span>
        <span class="field-bar-track"><span class="field-bar-fill"></span></span>
        <span class="field-pct">${rate.toFixed(0)}%</span>
      `;
      fieldList.appendChild(row);
      requestAnimationFrame(() => {
        row.querySelector(".field-bar-fill").style.width = `${Math.min(rate, 100)}%`;
      });

      const countLabel = document.createElement("span");
      countLabel.className = "field-count";
      countLabel.textContent = `${f.present ?? 0}/${f.total ?? 0}`;
      row.insertBefore(countLabel, row.lastElementChild);
    });

    const total = keys.length || 6;
    const failures = total - healthyCount;

    metricFieldsHealthy.textContent = `${healthyCount}/${total}`;
    metricFailures.textContent = failures;
    metricFailures.style.color = failures > 0 ? "var(--red)" : "var(--text-1)";
    metricFailuresFoot.textContent = failures > 0 ? `${failures} field${failures === 1 ? "" : "s"} degraded` : "no failed fields";

    metricRecords.textContent = health.records ?? "0";
    metricRecordsFoot.textContent = `from collection ${health.collection_id || COLLECTION_ID}`;
  }

  async function fetchHealth({ silent = false } = {}) {
    if (!silent) {
      fieldList.innerHTML = `<div class="skeleton-row"></div><div class="skeleton-row"></div><div class="skeleton-row"></div>`;
    }
    try {
      const health = await apiFetch(`/api/health/${COLLECTION_ID}`);
      renderFieldHealth(health);
      addTimelineEvent("Extraction health validated", health.status === "healthy" ? "good" : "warn");
      return health;
    } catch (err) {
      fieldList.innerHTML = `<div class="error-state">Couldn't load extraction health — ${err.message}</div>`;
      return null;
    }  
  }

 // ---- scraped data ----------------------------------------------------------
function extractRecord(payload) {
  if (!payload) return null;

  // Flask response:
  // { results: { title, price, availability, ... } }
  if (payload.results && typeof payload.results === "object" && !Array.isArray(payload.results)) {
    return payload.results;
  }

  // Array response
  if (Array.isArray(payload)) {
    return payload[0] || null;
  }

  // results array
  if (Array.isArray(payload.results)) {
    return payload.results[0] || null;
  }

  // data object
  if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
    return payload.data;
  }

  // data array
  if (Array.isArray(payload.data)) {
    return payload.data[0] || null;
  }

  // records array
  if (Array.isArray(payload.records)) {
    return payload.records[0] || null;
  }

  // Direct record
  if (payload.title || payload.price) {
    return payload;
  }

  return null;
}

  function renderStars(rating) {
    const map = { one: 1, two: 2, three: 3, four: 4, five: 5 };
    let n = typeof rating === "number" ? rating : map[String(rating).toLowerCase()] || 0;
    n = Math.max(0, Math.min(5, n));
    return "★".repeat(n) + "☆".repeat(5 - n);
  }

  function renderDataCard(record) {
    if (!record) {
      dataCardWrap.innerHTML = `<div class="empty-state">No scraped record available yet for this collection. Run a scrape job, then refresh.</div>`;
      return;
    }
    const available = /in\s*stock|available/i.test(String(record.availability || ""));
    dataCardWrap.innerHTML = `
      <div class="data-card">
        <div class="data-field wide">
          <span class="data-field-label">Title</span>
          <span class="data-field-value">${record.title ?? "—"}</span>
        </div>
        <div class="data-field">
  <span class="data-field-label">Price</span>
  <span class="data-field-value mono">${
    record.price
      ? `${record.price.symbol || ""}${record.price.value ?? ""} ${record.price.currency || ""}`
      : "—"
  }</span>
</div>
        <div class="data-field">
          <span class="data-field-label">Availability</span>
          <span class="data-field-value">
            <span class="availability-pill ${available ? "" : "out"}">${record.availability ?? "—"}</span>
          </span>
        </div>
        <div class="data-field">
          <span class="data-field-label">Rating</span>
          <span class="data-field-value rating-stars">${renderStars(record.rating)}</span>
        </div>
        <div class="data-field">
          <span class="data-field-label">Category</span>
          <span class="data-field-value">${record.category ?? "—"}</span>
        </div>
        <div class="data-field wide">
          <span class="data-field-label">Product URL</span>
          <span class="data-field-value mono">${record.product_url ? `<a href="${record.product_url}" target="_blank" rel="noopener">${record.product_url}</a>` : "—"}</span>
        </div>
      </div>
    `;
  }

  async function fetchResults() {
    dataCardWrap.innerHTML = `<div class="skeleton-row"></div>`;
    try {
      const payload = await apiFetch(`/api/results/${COLLECTION_ID}`);
      const record = extractRecord(payload);
      renderDataCard(record);
      if (record) addTimelineEvent("Structured data received", "good");
    } catch (err) {
      dataCardWrap.innerHTML = `<div class="error-state">Couldn't load scraped results — ${err.message}</div>`;
    }
  }

  // ---- self-healing demo ----------------------------------------------------
  const DETECT_SEQUENCE = [
    { label: "Extraction failure detected", ms: 900 },
    { label: "Analyzing failed fields…", ms: 1100 },
  ];

  function setHealBadge(state, text) {
    healStatusBadge.dataset.state = state;
    healStatusBadge.textContent = text;
  }

  function renderStepList(steps) {
    healSteps.innerHTML = "";
    healIdleMsg.classList.add("hidden");
    steps.forEach((label, i) => {
      const row = document.createElement("div");
      row.className = "heal-step";
      row.style.animationDelay = `${i * 0.06}s`;
      row.dataset.index = i;
      row.innerHTML = `<span class="step-marker"></span><span class="step-label">${label}</span>`;
      healSteps.appendChild(row);
    });
  }

  function markStepActive(i) {
    const row = healSteps.querySelector(`.heal-step[data-index="${i}"]`);
    if (!row) return;
    row.classList.add("active");
    row.querySelector(".step-marker").innerHTML = `<span class="spin"></span>`;
  }
  function markStepDone(i) {
    const row = healSteps.querySelector(`.heal-step[data-index="${i}"]`);
    if (!row) return;
    row.classList.remove("active");
    row.classList.add("done");
    row.querySelector(".step-marker").innerHTML = STATUS_ICONS.healthy;
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  async function runSelfHeal() {
    runHealBtn.disabled = true;
    healSteps.innerHTML = "";
    healIdleMsg.classList.add("hidden");

    // Phase 1 — detection (pre-API, purely for the story)
    setHealBadge("error", "FAILURE DETECTED");
    demoFailureActive = true;
    fetchHealth({ silent: true });
    for (const step of DETECT_SEQUENCE) {
      const row = document.createElement("div");
      row.className = "heal-step active";
      row.innerHTML = `<span class="step-marker"><span class="spin"></span></span><span class="step-label">${step.label}</span>`;
      healSteps.appendChild(row);
      addTimelineEvent(step.label, "warn");
      await sleep(step.ms);
      row.classList.remove("active");
      row.classList.add("done");
      row.querySelector(".step-marker").innerHTML = STATUS_ICONS.warning;
    }

    // Phase 2 — call the backend
    setHealBadge("healing", "HEALING");
    addTimelineEvent("Self-healing workflow initiated", "info");

    let workflow;
    try {
      workflow = await apiFetch("/api/self-heal", { method: "POST" });
    } catch (err) {
      setHealBadge("ready", "READY");
      healSteps.innerHTML = `<div class="error-state">Self-heal request failed — ${err.message}</div>`;
      runHealBtn.disabled = false;
      return;
    }

    const steps = Array.isArray(workflow.steps) && workflow.steps.length ? workflow.steps : [
      "Detect missing extraction field",
      "Analyze previous extraction schema",
      "Generate repaired extraction logic",
      "Re-run Bright Data collector",
      "Validate recovered fields",
    ];

    renderStepList(steps);

    for (let i = 0; i < steps.length; i++) {
      markStepActive(i);
      await sleep(650);
      markStepDone(i);
      addTimelineEvent(steps[i], "info");
    }

    const result = document.createElement("div");
    result.className = "heal-result";
    result.innerHTML = `<strong>Recovery workflow completed.</strong> Data pipeline restored.`;
    healSteps.appendChild(result);

    demoFailureActive = false;
setHealBadge("restored", "RESTORED");
addTimelineEvent("Recovery workflow completed — data pipeline restored", "good");

    // Reflect the recovery in the live health panel too
    await fetchHealth({ silent: true });

    runHealBtn.disabled = false;
  }

  // ---- wiring -----------------------------------------------------------
  refreshHealthBtn.addEventListener("click", () => fetchHealth());
  runHealBtn.addEventListener("click", runSelfHeal);
  retryConnBtn.addEventListener("click", init);

  async function init() {
  setHealBadge("ready", "READY");

  const online = await checkConnection();
  if (!online) return;
  await Promise.all([fetchHealth(), fetchResults()]);
}

  init();
})();