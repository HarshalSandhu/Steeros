"use strict";

const $ = (id) => document.getElementById(id);
const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/* ---------------------------------------------------------------- */
/* boot sequence                                                      */
/* ---------------------------------------------------------------- */

const LOGO_ASCII = `
  ____  _    _ _______ _____ _______    ____ _____
 |  _ \\| |  | |__   __|  __ \\__   __|  / __ \\_   _|
 | |_) | |  | |  | |  | |__) | | |    | |  | || |
 |  _ <| |  | |  | |  |  ___/  | |    | |  | || |
 | |_) | |__| |  | |  | |      | |    | |__| || |_
 |____/ \\____/   |_|  |_|      |_|     \\____/_____|
           token-aware llm dispatch system
`;

const BOOT_LINES = [
  "STEEROS BIOS v2.0.0 .............. OK",
  "probe: local proxy multiplexer @ 127.0.0.1:4040",
  "probe: model tier registry ........, 3 tiers loaded",
  "probe: coefficient bank ............ loaded",
  "mount /dev/token-mux .............. OK",
  "running self-check on dispatch rules ........ OK",
  "AUTH :: retrieving telemetry snapshot .......",
];

function boot() {
  const ascii = $("boot-ascii");
  const log = $("boot-log");
  const cursor = $("boot-cursor");
  ascii.textContent = LOGO_ASCII;

  let li = 0;
  const tick = () => {
    if (li >= BOOT_LINES.length) {
      cursor.style.display = "none";
      setTimeout(() => {
        $("boot").classList.add("gone");
        $("terminal").classList.add("on");
        start();
      }, 400);
      return;
    }
    const line = BOOT_LINES[li];
    const node = document.createElement("span");
    node.className = "ln" + (line.endsWith("...") ? "" : " ok");
    log.appendChild(node);
    let c = 0;
    const type = setInterval(() => {
      c++;
      node.textContent = line.slice(0, c);
      if (c >= line.length) {
        clearInterval(type);
        li++;
        setTimeout(tick, 90 + Math.random() * 160);
      }
    }, 14);
  };
  tick();
}

/* ---------------------------------------------------------------- */
/* globals                                                            */
/* ---------------------------------------------------------------- */

let DATA = null;
let dispatchTimer = null;
let typeTimer = null;
let typed = new WeakSet();
let chartsDone = false;

/* ---------------------------------------------------------------- */
/* typewriter                                                         */
/* ---------------------------------------------------------------- */

function typeText(el, text) {
  if (typed.has(el)) { el.textContent = text; return; }
  typed.add(el);
  const caret = document.createElement("span");
  caret.className = "caret";
  caret.textContent = "█";
  el.textContent = "";
  el.appendChild(caret);
  let i = 0;
  const step = () => {
    if (i <= text.length) {
      caret.previousSibling
        ? (caret.previousSibling.nodeValue = text.slice(0, i))
        : el.replaceChild(document.createTextNode(text.slice(0, i)), caret);
      i += 3;
      typeTimer = setTimeout(step, 12);
    } else {
      el.replaceChild(document.createTextNode(text), caret);
    }
  };
  step();
}

/* ---------------------------------------------------------------- */
/* cost leak widget (problem view)                                    */
/* ---------------------------------------------------------------- */

let leakTimer = null;
let leakCents = 2148;
const leakReduced = window.matchMedia("(prefers-reduced-motion: reduce)");

function startCostLeak() {
  if (leakTimer || leakReduced.matches) return;
  const track = $("cl-track");
  const burn = $("cl-burn");
  if (!track || !burn) return;

  const dense = 26;
  const pad = track.clientWidth;
  let count = 0;

  leakTimer = setInterval(() => {
    count++;
    const dot = document.createElement("span");
    dot.className = "cl-dot";
    track.appendChild(dot);
    const base = (count % dense) * (pad / dense) + Math.random() * 24 - 12;
    const swing = Math.sin(count * 0.9) * 5;

    let t = 0;
    const tick = () => {
      const slow = (t / 90) * 0.9;
      const wobble = Math.sin(t * 0.35) * 4;
      dot.style.transform =
        `translate(${Math.min(base * slow + swing, pad - 4)}px, ${wobble}px) scale(${Math.max(0.35, 1 - t / 130)})`;
      dot.style.opacity = String(Math.max(0, 0.95 - t / 120));
      t++;
      if (t < 130 && track.contains(dot)) {
        requestAnimationFrame(tick);
      } else {
        dot.remove();
        if (count % 3 === 0) {
          leakCents += 3 + Math.floor(Math.random() * 9);
          burn.textContent = `$${(leakCents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
        }
      }
    };
    requestAnimationFrame(tick);
  }, 260);
}

function stopCostLeak() {
  if (leakTimer) {
    clearInterval(leakTimer);
    leakTimer = null;
  }
  const track = $("cl-track");
  if (track) track.innerHTML = "";
}

/* ---------------------------------------------------------------- */
/* sparkline tracer (savings view)                                    */
/* ---------------------------------------------------------------- */

let traceTimer = null;

function startSparkTrace() {
  if (traceTimer) return;
  const line = $("spark-line");
  const dot = $("spark-dot");
  if (!line || !dot || !line.getTotalLength) return;
  const len = line.getTotalLength();
  if (!len) return;
  let t = 0;
  traceTimer = requestAnimationFrame(function traceTick() {
    t += 0.004;
    if (t > 1) t = 0;
    const p = line.getPointAtLength(t * len);
    dot.setAttribute("cx", p.x);
    dot.setAttribute("cy", p.y);
    traceTimer = requestAnimationFrame(traceTick);
  });
}

function stopSparkTrace() {
  if (traceTimer) {
    cancelAnimationFrame(traceTimer);
    traceTimer = null;
  }
  const dot = $("spark-dot");
  const line = $("spark-line");
  if (dot && line && line.getTotalLength) {
    dot.setAttribute("cx", dot.dataset.endX || 0);
    dot.setAttribute("cy", dot.dataset.endY || 0);
  }
}

/* ---------------------------------------------------------------- */
/* hero                                                               */
/* ---------------------------------------------------------------- */

const HERO_LINES = [
  ["$ claude", ""],
  ["prompt: add unit tests for the token router", ""],
  ["[SCORE] difficulty .93 ......... EASY", "accent"],
  ["[ROUTE] light-model ............ $0.003", "alt"],
  ["[SAVE]  vs flagship ............. $0.041", "accent"],
  ["$ claude", ""],
  ["prompt: redesign the multi-region migration plan", ""],
  ["[SCORE] difficulty .41 ......... MEDIUM", "accent"],
  ["[ROUTE] balanced-model ......... $0.012", "alt"],
  ["[SAVE]  vs flagship ............. $0.056", "accent"],
  ["$ claude", ""],
  ["prompt: debug k8s startup crash under load", ""],
  ["[SCORE] difficulty .12 ......... HARD", "accent"],
  ["[ROUTE] top-model ............... $0.120", "alt"],
  ["[SAVE]  flagship required ....... $0.000", "danger"],
];

function heroDemo() {
  const el = $("hero-term");
  el.innerHTML = "";
  let li = 0, ci = 0;
  const line = () => {
    if (li >= HERO_LINES.length) {
      setTimeout(() => {
        el.innerHTML = "";
        li = 0; ci = 0;
        line();
      }, 6000);
      return;
    }
    const [text, cls] = HERO_LINES[li];
    const row = document.createElement("div");
    row.className = "demo-row" + (cls ? " " + cls : "");
    el.appendChild(row);
    const type = () => {
      ci++;
      row.textContent = text.slice(0, ci);
      if (ci >= text.length) {
        li++;
        ci = 0;
        setTimeout(line, 380);
      } else {
        typeTimer = setTimeout(type, 22);
      }
    };
    type();
  };
  line();
}

/* ---------------------------------------------------------------- */
/* system sections                                                    */
/* ---------------------------------------------------------------- */

function renderHero(d) {
  $("hero-logo").textContent = LOGO_ASCII;
  $("hero-tagline").textContent = "Chat with Claude Code. Pay only for the model your prompt actually needs.";
  $("hero-sub").textContent =
    "STEEROS sits in front of your LLM calls, scores every prompt by difficulty, and routes it " +
    "to the cheapest tier that gets the job done. Local-first, drop-in, no code changes.";
}

function renderProblem(d) {
  const p = d.problem, b = d.business_problem, s = d.solution;

  $("problem-title").textContent = "01 // THE CURRENT PROBLEM";
  $("problem-box-title").textContent = p.title.toUpperCase();
  $("problem-headline").textContent = p.headline.toUpperCase();
  $("problem-body").textContent = p.body.replace(/\s+/g, " ");
  $("problem-framing").textContent = p.framing;

  $("solution-title").textContent = s.title.toUpperCase();
  $("solution-headline").textContent = s.headline.toUpperCase();
  $("solution-body").textContent = s.body.replace(/\s+/g, " ");
  $("solution-bullets").innerHTML = s.bullet_points
    .map((bp) => `<li>${bp}</li>`)
    .join("");

  $("biz-title").textContent = b.title.toUpperCase();
  $("biz-headline").textContent = b.headline.toUpperCase();
  $("biz-body").textContent = b.body.replace(/\s+/g, " ");
  $("biz-study").innerHTML =
    `<a href="${b.study.url}" target="_blank" rel="noopener" class="study-name">${b.study.name}</a>` +
    `<span class="study-claim"> — ${b.study.claim}</span> ` +
    `<a href="${b.study.url}" target="_blank" rel="noopener" class="study-link">read the paper ↗</a>`;
  $("biz-stats").innerHTML = b.stats
    .map(
      (st) =>
        `<div class="biz-stat"><span class="n">${st.value}</span>` +
        `<span class="l">${st.label}</span><span class="d">${st.detail}</span></div>`
    )
    .join("");
}

/* ---------------------------------------------------------------- */
/* savings                                                           */
/* ---------------------------------------------------------------- */

function renderCounters(d) {
  countUp($("c-tokens"), 0, d.tokens_saved, 0, 1600);
  countUp($("c-dollars"), 0, d.dollars_saved, 2, 1800, true);
  countUp($("c-avg"), 0, d.avg_cost_after, 3, 1400, true);
  countUp($("c-eff"), 0, d.pct_saved, 0, 1500);
  $("c-avg-sub").textContent =
    `was $${d.avg_cost_before.toFixed(3)} → now $${d.avg_cost_after.toFixed(3)} / request`;
}

function countUp(el, from, to, decimals, dur, money) {
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - t, 3);
    const val = from + (to - from) * eased;
    el.textContent = money
      ? "$" + val.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      : Math.round(val).toLocaleString("en-US");
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function renderSpark(series) {
  const w = 600, h = 180, pad = 8;
  const max = Math.max(...series.map((s) => s.tokens)) * 1.08;
  const min = Math.min(...series.map((s) => s.tokens)) * 0.9;
  const x = (i) => pad + (i / (series.length - 1)) * (w - 2 * pad);
  const y = (v) => h - pad - ((v - min) / (max - min)) * (h - 2 * pad);
  const pts = series.map((s, i) => `${x(i)},${y(s.tokens)}`);
  const svg = $("spark");
  const ns = "http://www.w3.org/2000/svg";
  svg.innerHTML = "";

  const grid = (yOff) => {
    const line = document.createElementNS(ns, "line");
    line.setAttribute("class", "gridline");
    line.setAttribute("x1", pad);
    line.setAttribute("x2", w - pad);
    line.setAttribute("y1", yOff);
    line.setAttribute("y2", yOff);
    return line;
  };
  [0.25, 0.5, 0.75].forEach((f) => svg.appendChild(grid(pad + (h - 2 * pad) * f)));

  const area = document.createElementNS(ns, "polygon");
  area.setAttribute("class", "area");
  area.setAttribute("points", `${pad},${h - pad} ${pts.join(" ")} ${w - pad},${h - pad}`);

  const line = document.createElementNS(ns, "polyline");
  line.setAttribute("class", "line");
  line.setAttribute("id", "spark-line");
  line.setAttribute("points", pts.join(" "));

  svg.appendChild(area);
  svg.appendChild(line);

  const last = series[series.length - 1];
  const dot = document.createElementNS(ns, "circle");
  dot.setAttribute("class", "dot");
  dot.setAttribute("id", "spark-dot");
  dot.setAttribute("cx", x(series.length - 1));
  dot.setAttribute("cy", y(last.tokens));
  dot.setAttribute("r", 4);
  dot.setAttribute("data-end-x", x(series.length - 1));
  dot.setAttribute("data-end-y", y(last.tokens));
  svg.appendChild(dot);

  const pad2 = document.createElementNS(ns, "circle");
  pad2.setAttribute("class", "dot-pulse");
  pad2.setAttribute("r", 7);
  pad2.setAttribute("cx", x(series.length - 1));
  pad2.setAttribute("cy", y(last.tokens));
  svg.appendChild(pad2);

  // animated draw
  const len = line.getTotalLength();
  line.style.strokeDasharray = len;
  line.style.strokeDashoffset = len;
  line.getBoundingClientRect();
  if (!chartsDone) line.style.strokeDashoffset = "0";
  line.style.transition = "stroke-dashoffset 1.6s ease";

  const lbl = document.createElementNS(ns, "text");
  lbl.setAttribute("class", "spark-lbl");
  lbl.setAttribute("x", x(series.length - 1) - 4);
  lbl.setAttribute("y", y(last.tokens) - 10);
  lbl.setAttribute("text-anchor", "end");
  lbl.textContent = last.tokens.toLocaleString() + " tokens";
  svg.appendChild(lbl);
}

function renderBars(byModel) {
  const maxCnt = Math.max(...byModel.map((m) => m.requests));
  $("barchart").innerHTML = byModel
    .map(
      (m, i) => `
      <div class="bar-row">
        <div class="bar-label">
          <span>${m.name}</span>
          <span>${m.requests.toLocaleString()} req · $${m.cost} · ${m.share}%</span>
        </div>
        <div class="bar-track"><div class="bar-fill" data-w="${(m.requests / maxCnt) * 100}" style="width:0"></div></div>
      </div>`
    )
    .join("");
}

function renderDonut(diff) {
  const total = diff.easy + diff.medium + diff.hard;
  const labels = [
    ["EASY", "light-model"],
    ["MEDIUM", "balanced-model"],
    ["HARD", "top-model"],
  ];
  const R = 70, C = 2 * Math.PI * R;
  const svg = $("donut");
  const ns = "http://www.w3.org/2000/svg";
  svg.innerHTML = `<svg viewBox="0 0 170 170" width="170" height="170"><g>`;
  const g = svg.querySelector("g");
  let offset = 0;
  Object.entries(diff).forEach(([k, v], i) => {
    const frac = v / total;
    const circ = document.createElementNS(ns, "circle");
    circ.setAttribute("class", "seg" + (i + 1));
    circ.setAttribute("cx", "85");
    circ.setAttribute("cy", "85");
    circ.setAttribute("r", R);
    circ.setAttribute("fill", "none");
    circ.setAttribute("stroke-width", "22");
    circ.setAttribute("stroke-dasharray", `${frac * C} ${C}`);
    circ.setAttribute("stroke-dashoffset", (-offset * C).toFixed(2));
    circ.style.transition = "opacity 0.4s ease";
    g.appendChild(circ);
    offset += frac;
  });
  svg.innerHTML += `</g></svg>
    <div class="donut-center"><b>${total.toLocaleString()}</b>requests / 30d</div>`;

  $("legend").innerHTML = labels
    .map(
      (l, i) => `
      <div class="legend-row">
        <span class="sw sw${i + 1}"></span>
        <span>${l[0]} → <span class="dim">${l[1]}</span></span>
        <span class="pct">${Object.values(diff)[i]}%</span>
      </div>`
    )
    .join("");
}

/* ---------------------------------------------------------------- */
/* dispatch stream                                                    */
/* ---------------------------------------------------------------- */

const FAKE_PROMPTS = [
  ["fix docstring in utils.py", "light-model"],
  ["optimize the nested for-loop", "balanced-model"],
  ["migrate legacy sync code to async", "balanced-model"],
  ["explain this docker-compose error", "light-model"],
  ["review the migration for deadlocks", "top-model"],
  ["add retry logic for s3 uploads", "light-model"],
  ["design cache invalidation strategy", "top-model"],
  ["refactor test suite to pytest", "balanced-model"],
];

function renderDispatch(log) {
  const el = $("dispatch-log");
  el.innerHTML = "";
  log.forEach((r) => {
    const row = document.createElement("div");
    row.className = "dlog-row";
    row.append(span("ts", r.ts), span("src", r.prompt), span("route", r.route.toUpperCase()), span("saved", r.saved));
    el.appendChild(row);
  });
}

function span(cls, txt) {
  const s = document.createElement("span");
  s.className = cls;
  s.textContent = txt;
  return s;
}

function startDispatchTick() {
  if (dispatchTimer) return;
  const el = $("dispatch-log");
  dispatchTimer = setInterval(() => {
    const [prompt, route] = FAKE_PROMPTS[Math.floor(Math.random() * FAKE_PROMPTS.length)];
    const ts = new Date().toTimeString().slice(0, 8);
    const saved = route === "top-model" ? "$0.000" : "$0.0" + (1 + Math.floor(Math.random() * 5));
    const row = document.createElement("div");
    row.className = "dlog-row";
    row.append(span("ts", ts), span("src", prompt), span("route", route.toUpperCase()), span("saved", saved));
    el.prepend(row);
    while (el.children.length > 8) el.lastChild.remove();
  }, 3500);
}

/* ---------------------------------------------------------------- */
/* roadmap                                                            */
/* ---------------------------------------------------------------- */

const STATUS_CLASS = { "in development": "status-dev", planned: "status-planned", backlog: "status-backlog", included: "status-inc" };

function renderRoadmap(items) {
  $("roadmap").innerHTML = items
    .map((r) => {
      if (r.locked) {
        return `
    <div class="roadmap-item locked">
      <div class="rm-blur">
        <div class="rm-head">
          <div>
            <span class="rm-id">#${String(r.id).padStart(3, "0")}</span>
            <span class="rm-title"> ${r.title}</span>
          </div>
          <span class="rm-status ${STATUS_CLASS[r.status]}">${r.status.toUpperCase()}</span>
        </div>
        <p class="rm-desc">${r.desc}</p>
        <div class="rm-meta"><span>ETA: ${r.eta}</span><span>COMPLETION: ${r.progress}%</span></div>
        <div class="rm-progress"><div class="rm-fill" data-w="${r.progress}"></div></div>
      </div>
      <div class="rm-lock"><span class="rm-lock-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg></span><span class="rm-lock-label">COMING ${r.eta}</span></div>
    </div>`;
      }
      return `
    <div class="roadmap-item">
      <div class="rm-head">
        <div>
          <span class="rm-id">#${String(r.id).padStart(3, "0")}</span>
          <span class="rm-title"> ${r.title}</span>
        </div>
        <span class="rm-status ${STATUS_CLASS[r.status]}">${r.status.toUpperCase()}</span>
      </div>
      <p class="rm-desc">${r.desc}</p>
      <div class="rm-meta"><span>ETA: ${r.eta}</span><span>COMPLETION: ${r.progress}%</span></div>
      <div class="rm-progress"><div class="rm-fill" data-w="${r.progress}"></div></div>
    </div>`;
    })
    .join("");
}

/* ---------------------------------------------------------------- */
/* download                                                           */
/* ---------------------------------------------------------------- */

function renderFree(d) {
  $("free-title").textContent = d.name;
  $("free-headline").textContent = d.limits;
  $("free-body").textContent = "Zero install — one binary, one port. Ships with the tier map, proxy script, and a config that works out of the box.";
  $("filelist").innerHTML = d.files
    .map(
      (f) =>
        `<div class="filerow"><span class="fn">${f.name}</span><span class="fd">${(f.bytes / 1000).toFixed(1)} kB · ${f.what}</span></div>`
    )
    .join("");
}

function downloadFree() {
  window.location.href = "/api/free/download";
}

function submitLead(event) {
  event.preventDefault();
  const btn = $("lead-btn");
  if (btn.disabled) return;
  const payload = {
    name: document.querySelector("#lead-form [name=name]").value,
    email: document.querySelector("#lead-form [name=email]").value,
    company: document.querySelector("#lead-form [name=company]").value,
  };
  btn.disabled = true;
  btn.textContent = "SENDING…";
  fetch("/api/enterprise/lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((res) => res.json())
    .then((d) => {
      const msg = $("lead-msg");
      if (d.ok) {
        msg.className = "lead-msg ok";
        msg.textContent = "THANKS — OUR ENTERPRISE TEAM WILL REACH OUT.";
      } else {
        msg.className = "lead-msg danger";
        msg.textContent = "COULD NOT SUBMIT — PLEASE CHECK YOUR EMAIL.";
        btn.disabled = false;
        btn.textContent = "REQUEST A CALL";
      }
    })
    .catch(() => {
      const msg = $("lead-msg");
      msg.className = "lead-msg danger";
      msg.textContent = "NETWORK ERROR — TRY AGAIN.";
      btn.disabled = false;
      btn.textContent = "REQUEST A CALL";
    });
}

function openLiveDashboard() {
  const el = $("dash-page");
  fetch("/api/dashboard")
    .then((res) => res.json())
    .then((d) => {
      const s = d.savings;
      el.querySelector(".ld-tokens").textContent = s.tokens_saved.toLocaleString() + " tokens";
      el.querySelector(".ld-saved").textContent = "$" + s.dollars_saved.toLocaleString(undefined, { maximumFractionDigits: 2 });
      el.querySelector(".ld-monthly").textContent = "$" + s.monthly_savings.toFixed(2) + "/mo";
      el.querySelector(".ld-requests").textContent = s.requests_total.toLocaleString() + " req";
      el.querySelector(".ld-live").textContent = "LIVE · " + new Date().toLocaleTimeString("en-US", { hour12: false });
      el.classList.add("open");
      document.body.style.overflow = "hidden";
    })
    .catch(() => {
      const msg = $("lead-msg");
      msg.className = "lead-msg danger";
      msg.textContent = "DASHBOARD API UNREACHABLE — IS THE SERVER RUNNING?";
    });
}

function closeLiveDashboard() {
  const el = $("dash-page");
  el.classList.remove("open");
  document.body.style.overflow = "";
}

/* ---------------------------------------------------------------- */
/* page router                                                       */
/* ---------------------------------------------------------------- */

const VIEWS = [
  { id: "overview", label: "OVERVIEW" },
  { id: "problem", label: "THE PROBLEM" },
  { id: "savings", label: "PROVEN SAVINGS" },
  { id: "stream", label: "LIVE ROUTING" },
  { id: "roadmap", label: "UPCOMING ENHANCEMENTS" },
  { id: "download", label: "DOWNLOAD" },
];

const enteredViews = new WeakSet();
let currentView = null;

function showView(hash) {
  hash = (hash || "overview").replace(/^#/, "");
  if (!VIEWS.some((v) => v.id === hash)) hash = "overview";
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  const view = $("view-" + hash);
  if (view) view.classList.add("active");
  document.querySelectorAll(".sections .tab").forEach((a) =>
    a.classList.toggle("active", a.getAttribute("href") === "#" + hash)
  );
  if (hash === "problem") startCostLeak();
  else stopCostLeak();
  if (hash === "savings") startSparkTrace();
  else stopSparkTrace();
  enterView(hash);
  currentView = hash;
}

function enterView(hash) {
  if (enteredViews.has(document.getElementById("view-" + hash))) return;
  enteredViews.add(document.getElementById("view-" + hash));

  if (hash === "overview") {
    heroDemo();
  }
  if (hash === "problem") {
    typeText($("problem-body"), DATA.problem.body.replace(/\s+/g, " "));
    typeText($("solution-body"), DATA.solution.body.replace(/\s+/g, " "));
    typeText($("biz-body"), DATA.business_problem.body.replace(/\s+/g, " "));
  }
  if (hash === "savings") {
    renderCounters(DATA.savings);
    document.querySelectorAll(".bar-fill").forEach((f) => {
      setTimeout(() => (f.style.width = f.dataset.w + "%"), 120);
    });
    chartsDone = true;
    const line = $("spark").querySelector(".line");
    if (line) {
      const len = line.getTotalLength();
      line.style.strokeDasharray = len;
      line.style.strokeDashoffset = len;
      line.style.transition = "stroke-dashoffset 1.6s ease";
      requestAnimationFrame(() => (line.style.strokeDashoffset = "0"));
    }
  }
  if (hash === "roadmap") {
    document.querySelectorAll(".rm-fill").forEach((f, i) => {
      setTimeout(() => (f.style.width = f.dataset.w + "%"), 150 + i * 120);
    });
  }
}

function onNavClick(e) {
  const href = e.currentTarget.getAttribute("href");
  e.preventDefault();
  showView(href);
}

function initRouter() {
  document.querySelectorAll(".sections .tab").forEach((a) =>
    a.addEventListener("click", onNavClick)
  );
  showView(location.hash || "overview");
}

/* ---------------------------------------------------------------- */
/* clock                                                              */
/* ---------------------------------------------------------------- */

function clock() {
  const tick = () => {
    const t = new Date();
    const s = t.toLocaleDateString("en-US", { month: "short", day: "2-digit" }) +
      " " + t.toLocaleTimeString("en-US", { hour12: false });
    if ($("clock")) $("clock").textContent = s;
  };
  tick();
  return setInterval(tick, 1000);
}

/* ---------------------------------------------------------------- */
/* start                                                              */
/* ---------------------------------------------------------------- */

async function start() {
  document.body.removeAttribute("data-theme");
  localStorage.removeItem("routeos-theme");
  clock();
  $("sys-status").textContent = "ONLINE";
  $("led").classList.remove("off");

  try {
    const res = await fetch("/api/dashboard");
    DATA = await res.json();
  } catch (_) {
    $("sys-status").textContent = "ERR: no API";
    $("led").classList.add("off");
    return;
  }

  const d = DATA;
  $("host").textContent = `${d.system.mux} · up ${d.system.uptime_human}`;

  renderHero(d);
  renderProblem(d);
  renderSpark(d.savings.series);
  renderBars(d.savings.by_model);
  renderDonut(d.savings.difficulty);
  renderDispatch(d.dispatch_log);
  startDispatchTick();
  renderRoadmap(d.roadmap);
  renderFree(d.free_tier);
  initRouter();
}

boot();