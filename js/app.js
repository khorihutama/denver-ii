// Denver II screening — app logic
// State: answers[itemNumber] = "P" | "F" | "R" | "NO"
let lang = localStorage.getItem("denver2-lang") || "en";
let answers = {};
let currentAgeMonths = null; // corrected age used for the age line
let currentChild = null;

const $ = (id) => document.getElementById(id);
const t = (k) => (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k;
const sectorName = (s) => {
  const sec = SECTORS.find((x) => x.id === s);
  return lang === "id" ? sec.idn : sec.en;
};
const itemName = (item) => (lang === "id" ? item.id : item.en);

function applyI18n() {
  document.documentElement.lang = lang === "id" ? "id" : "en";
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  $("lang-en").classList.toggle("active", lang === "en");
  $("lang-id").classList.toggle("active", lang === "id");
}

function setLang(l) {
  lang = l;
  localStorage.setItem("denver2-lang", l);
  applyI18n();
  if (currentAgeMonths !== null) { renderChecklist(); renderChart(); renderAge(); }
}

// ---- Age calculation ----
// Corrected age: for children born prematurely and under 24 months,
// subtract the weeks born early from chronological age (standard Denver II practice).
function calcAge(dobStr, testStr, weeksEarly) {
  const dob = new Date(dobStr + "T00:00:00");
  const test = new Date(testStr + "T00:00:00");
  if (isNaN(dob) || isNaN(test)) return null;
  const days = Math.round((test - dob) / 86400000);
  if (days < 0) return null;
  const chronoMonths = days / 30.4375;
  let corrected = chronoMonths;
  if (weeksEarly > 0 && chronoMonths < 24) {
    corrected = chronoMonths - (weeksEarly * 7) / 30.4375;
  }
  return { days, chronoMonths, correctedMonths: Math.max(0, corrected) };
}

function fmtAge(months) {
  const y = Math.floor(months / 12);
  const m = Math.floor(months % 12);
  if (y > 0) return `${y}y ${m}m`;
  const d = Math.round((months - Math.floor(months)) * 30.4375);
  return `${Math.floor(months)} ${t("months")} ${d} ${t("days")}`;
}

function renderAge() {
  if (!currentChild) return;
  const a = calcAge(currentChild.dob, currentChild.testDate, currentChild.weeksEarly);
  const el = $("age-result");
  el.hidden = false;
  el.innerHTML = `<strong>${t("age")}:</strong> ${fmtAge(a.chronoMonths)}` +
    (a.correctedMonths !== a.chronoMonths
      ? ` &nbsp;•&nbsp; <strong>${t("correctedAge")}:</strong> ${fmtAge(a.correctedMonths)}`
      : "");
}

// ---- Item classification for a given age ----
// delay-item:    p90 < age            -> Fail = Delay
// caution-item:  p75 <= age <= p90    -> Fail = Caution
// due-item:      p25 <= age < p75     -> on schedule, Fail is noted but not a caution
// upcoming-item: age < p25 (within +4 mo preview)
// Refusal on a delay/caution item makes the test Untestable for that item.
function classify(item, age) {
  if (item.p90 < age) return "expected";
  if (item.p25 <= age) return "due";
  if (item.p25 <= age + 4) return "upcoming";
  return "future";
}
function isCautionZone(item, age) { return item.p75 <= age && age <= item.p90; }

function score() {
  let delays = 0, cautions = 0, untestableItems = 0;
  if (currentAgeMonths === null) return { delays, cautions, untestableItems, verdict: null };
  for (const item of ITEMS) {
    const a = answers[item.n];
    if (!a) continue;
    const cls = classify(item, currentAgeMonths);
    if (a === "F") {
      if (cls === "expected") delays++;
      else if (cls === "due" && isCautionZone(item, currentAgeMonths)) cautions++;
    }
    if (a === "R" && (cls === "expected" || (cls === "due" && isCautionZone(item, currentAgeMonths)))) {
      untestableItems++;
    }
  }
  let verdict = "normal";
  if (untestableItems > 0) verdict = "untestable";
  else if (delays >= 1 || cautions >= 2) verdict = "suspect";
  return { delays, cautions, untestableItems, verdict };
}

// ---- Checklist rendering ----
const GROUPS = [
  { key: "expected", titleKey: "expected", subKey: "expectedSub" },
  { key: "due", titleKey: "dueNow", subKey: "dueNowSub" },
  { key: "upcoming", titleKey: "upcoming", subKey: "upcomingSub" },
];
const RESULT_BTNS = [["P", "pass"], ["F", "fail"], ["R", "refusal"], ["NO", "noOpp"]];

function itemRow(item) {
  const row = document.createElement("div");
  row.className = "item-row";
  const label = document.createElement("div");
  label.className = "item-label";
  label.innerHTML = `<span class="item-name">${itemName(item)}</span>
    <span class="item-meta">${item.p50} mo • 90%: ${item.p90} mo</span>`;
  row.appendChild(label);
  const btns = document.createElement("div");
  btns.className = "result-btns";
  for (const [code, key] of RESULT_BTNS) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = t(key);
    b.className = "res-btn res-" + code + (answers[item.n] === code ? " selected" : "");
    b.onclick = () => {
      // Tapping the already-selected option again clears it (reset this item).
      if (answers[item.n] === code) delete answers[item.n];
      else answers[item.n] = code;
      // Update only this row in place. A full renderChecklist() rebuilds the
      // whole list and makes the page jump / scroll back up on every tap.
      // The chart is re-rendered on demand when its panel is opened.
      [...btns.children].forEach((x, i) =>
        x.classList.toggle("selected", answers[item.n] === RESULT_BTNS[i][0])
      );
      renderResult();
    };
    btns.appendChild(b);
  }
  row.appendChild(btns);
  return row;
}

function renderChecklist() {
  const wrap = $("checklist");
  wrap.innerHTML = "";
  if (currentAgeMonths === null) return;
  for (const g of GROUPS) {
    const items = ITEMS.filter((i) => classify(i, currentAgeMonths) === g.key);
    if (!items.length) continue;
    const h = document.createElement("div");
    h.className = "group-head";
    h.innerHTML = `<h3>${t(g.titleKey)}</h3><p>${t(g.subKey)}</p>`;
    wrap.appendChild(h);
    for (const sector of SECTORS) {
      const sItems = items.filter((i) => i.sector === sector.id);
      if (!sItems.length) continue;
      const sh = document.createElement("h4");
      sh.className = "sector-head";
      sh.textContent = sectorName(sector.id);
      wrap.appendChild(sh);
      sItems.forEach((i) => wrap.appendChild(itemRow(i)));
    }
  }
  renderResult();
}

function renderResult() {
  const s = score();
  const banner = $("result-banner");
  if (!s.verdict || Object.keys(answers).length === 0) { banner.hidden = true; return; }
  banner.hidden = false;
  banner.className = "result-banner verdict-" + s.verdict;
  const why = s.verdict === "normal" ? t("normalWhy") : s.verdict === "suspect" ? t("suspectWhy") : t("untestableWhy");
  banner.innerHTML = `<strong>${t("result")}: ${t(s.verdict)}</strong>
    <span>${t("delays")}: ${s.delays} • ${t("cautions")}: ${s.cautions}</span><p>${why}</p>`;
}

// ---- Chart view ----
// Classic Denver II layout, simplified: one row per item, x-axis 0–72 months.
// Bar spans p25→p90, the p75→p90 segment is darker (the "caution" zone),
// a vertical red line marks the child's (corrected) age.
const MAX_MONTHS = 72;
const pct = (m) => (m / MAX_MONTHS) * 100;

function renderChart() {
  const wrap = $("chart");
  wrap.innerHTML = "";
  if (currentAgeMonths === null) {
    wrap.innerHTML = `<p class="hint">${t("needDob")}</p>`;
    return;
  }
  for (const sector of SECTORS) {
    const title = document.createElement("h4");
    title.className = "sector-head";
    title.textContent = sectorName(sector.id);
    wrap.appendChild(title);

    const scroll = document.createElement("div");
    scroll.className = "chart-scroll";
    const inner = document.createElement("div");
    inner.className = "chart-inner";

    // month axis
    const axis = document.createElement("div");
    axis.className = "chart-axis";
    for (let m = 0; m <= MAX_MONTHS; m += 6) {
      const tick = document.createElement("span");
      tick.style.left = pct(m) + "%";
      tick.textContent = m;
      axis.appendChild(tick);
    }
    inner.appendChild(axis);

    for (const item of ITEMS.filter((i) => i.sector === sector.id)) {
      const row = document.createElement("div");
      row.className = "chart-row";
      const name = document.createElement("div");
      name.className = "chart-name";
      name.textContent = itemName(item);
      const track = document.createElement("div");
      track.className = "chart-track";
      const bar = document.createElement("div");
      bar.className = "chart-bar" + (answers[item.n] === "F" ? " bar-fail" : answers[item.n] === "P" ? " bar-pass" : "");
      bar.style.left = pct(item.p25) + "%";
      bar.style.width = pct(item.p90 - item.p25) + "%";
      const tail = document.createElement("div");
      tail.className = "chart-bar-tail";
      tail.style.left = ((item.p75 - item.p25) / (item.p90 - item.p25)) * 100 + "%";
      tail.style.width = ((item.p90 - item.p75) / (item.p90 - item.p25)) * 100 + "%";
      bar.appendChild(tail);
      const ageLine = document.createElement("div");
      ageLine.className = "chart-age-line";
      ageLine.style.left = pct(currentAgeMonths) + "%";
      track.append(bar, ageLine);
      row.append(name, track);
      inner.appendChild(row);
    }
    scroll.appendChild(inner);
    wrap.appendChild(scroll);
  }
}

// ---- History (localStorage) ----
const LS_KEY = "denver2-screenings";
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; }
}
function renderHistory() {
  const list = $("history-list");
  const rows = loadHistory();
  list.innerHTML = rows.length ? "" : `<p class="hint">${t("noHistory")}</p>`;
  rows.forEach((r, idx) => {
    const div = document.createElement("div");
    div.className = "card history-row";
    div.innerHTML = `<strong>${r.name || t("anonymous")}</strong>
      <span>${t("screeningOn")}: ${r.testDate} • ${t("age")}: ${fmtAge(r.ageMonths)} • ${t("result")}: ${t(r.verdict)}</span>`;
    const load = document.createElement("button");
    load.type = "button"; load.textContent = t("load");
    load.onclick = () => {
      $("child-name").value = r.name || "";
      $("child-dob").value = r.dob;
      $("test-date").value = r.testDate;
      $("weeks-early").value = r.weeksEarly || 0;
      answers = r.answers || {};
      startScreening();
    };
    const del = document.createElement("button");
    del.type = "button"; del.textContent = t("del");
    del.onclick = () => {
      const all = loadHistory(); all.splice(idx, 1);
      localStorage.setItem(LS_KEY, JSON.stringify(all)); renderHistory();
    };
    const actions = document.createElement("div");
    actions.className = "history-actions"; actions.append(load, del);
    div.appendChild(actions);
    list.appendChild(div);
  });
}

// ---- Flow ----
function showPanel(name) {
  for (const p of ["checklist", "chart", "history"]) {
    $("panel-" + p).hidden = p !== name;
    $("view-" + p).classList.toggle("active", p === name);
  }
  if (name === "chart") renderChart();
  if (name === "history") renderHistory();
}

function startScreening() {
  const dob = $("child-dob").value;
  if (!dob) { alert(t("needDob")); return; }
  const testDate = $("test-date").value || new Date().toISOString().slice(0, 10);
  $("test-date").value = testDate;
  const weeksEarly = parseInt($("weeks-early").value || "0", 10);
  const a = calcAge(dob, testDate, weeksEarly);
  if (!a || a.correctedMonths > 72) { alert(t("ageRange")); return; }
  currentChild = { name: $("child-name").value.trim(), dob, testDate, weeksEarly };
  currentAgeMonths = a.correctedMonths;
  renderAge(); renderChecklist();
  $("view-toggle").hidden = false;
  showPanel("checklist");
}

function init() {
  $("test-date").value = new Date().toISOString().slice(0, 10);
  $("lang-en").onclick = () => setLang("en");
  $("lang-id").onclick = () => setLang("id");
  $("start-btn").onclick = startScreening;
  $("view-checklist").onclick = () => showPanel("checklist");
  $("view-chart").onclick = () => showPanel("chart");
  $("view-history").onclick = () => showPanel("history");
  $("save-btn").onclick = () => {
    if (!currentChild) return;
    const s = score();
    const all = loadHistory();
    all.unshift({
      ...currentChild, answers, ageMonths: currentAgeMonths,
      verdict: s.verdict || "normal", savedAt: new Date().toISOString(),
    });
    localStorage.setItem(LS_KEY, JSON.stringify(all));
    alert(t("saved"));
  };
  applyI18n();
}
document.addEventListener("DOMContentLoaded", init);
