"use strict";

const $ = (id) => document.getElementById(id);
const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

function updateFavicon() {
  const accent = cssVar("--accent") || "#45ff8b";
  const bg = cssVar("--bg") || "#101018";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="${bg}"/><text x="16" y="22" font-family="monospace" font-size="20" font-weight="bold" fill="${accent}" text-anchor="middle">S/</text></svg>`;
  const url = "data:image/svg+xml," + encodeURIComponent(svg);
  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = url;
}

/* ---------------------------------------------------------------- */
/* globals                                                            */
/* ---------------------------------------------------------------- */

let DATA = null;
let dispatchTimer = null;
let typeTimer = null;
let typed = new WeakSet();
let counted = false;
let chartsDone = false;
let roadmapDone = false;

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
/* sections                                                           */
/* ---------------------------------------------------------------- */

function renderHero(d) {
  $("hero-tagline").textContent = "Chat with Claude Code. Pay only for the model your prompt actually needs.";
  $("hero-sub").textContent =
    "STEEROS routes every prompt to the cheapest tier that can handle it, " +
    "local-first and drop-in.";
}

function renderProblem(d) {
  const p = d.problem, b = d.business_problem, s = d.solution;

  $("problem-title").textContent = "01 The Current Problem";
  $("problem-box-title").textContent = p.title;
  $("problem-headline").textContent = p.headline;
  $("problem-body").textContent = p.body.replace(/\s+/g, " ");
  $("problem-framing").textContent = p.framing;

  $("solution-title").textContent = s.title;
  $("solution-headline").textContent = s.headline;
  $("solution-body").textContent = s.body.replace(/\s+/g, " ");
  $("solution-bullets").innerHTML = s.bullet_points
    .map((bp) => `<li>${bp}</li>`)
    .join("");

  $("biz-title").textContent = b.title;
  $("biz-headline").textContent = b.headline;
  $("biz-body").textContent = b.body.replace(/\s+/g, " ");
  $("biz-study").innerHTML =
    `<a href="${b.study.url}" target="_blank" rel="noopener" class="study-name">${b.study.name}</a>` +
    `<span class="study-claim">: ${b.study.claim}</span> ` +
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
        <span>${l[0]} → <span class="muted">${l[1]}</span></span>
        <span class="pct">${Object.values(diff)[i]}%</span>
      </div>`
    )
    .join("");
}

/* ---------------------------------------------------------------- */
/* prompt → model routing demo · neural                              */
/* ---------------------------------------------------------------- */

let rdTimers = [];
let rdBeam = null;
let rdGen = 0;
const rdReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
const RD_DEMO = [
  { p: "fix a typo in the docs", model: "light-model", score: 0.93, cost: "$0.003" },
  { p: "refactor auth to async", model: "balanced-model", score: 0.41, cost: "$0.012" },
  { p: "design multi-region migration", model: "top-model", score: 0.12, cost: "$0.120" },
];
const RD_NODES = [
  { model: "light-model", y: 40 },
  { model: "balanced-model", y: 125 },
  { model: "top-model", y: 210 },
];

const NS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs) => {
  const e = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
  return e;
};

function buildRdSVG() {
  const svg = $("rd-svg");
  if (!svg || svg.dataset.built) return;
  svg.dataset.built = "1";
  svg.innerHTML = "";

  RD_NODES.forEach((n, i) => {
    svg.appendChild(svgEl("path", {
      class: "rd-link", id: "rd-link-" + i, d: `M 54 125 C 210 125, 300 ${n.y}, 558 ${n.y}`,
    }));
    const g = svgEl("g", { class: "rd-node", id: "rd-node-" + i });
    g.appendChild(svgEl("circle", { class: "n-ring", cx: 558, cy: n.y, r: 12 }));
    g.appendChild(svgEl("circle", { class: "n-core", cx: 558, cy: n.y, r: 5 }));
    svg.appendChild(g);
  });

  const hub = svgEl("g", { class: "rd-hub-ring" });
  hub.appendChild(svgEl("circle", { cx: 54, cy: 125, r: 14, fill: "none", stroke: "#e08baf", "stroke-width": 1.5, "stroke-dasharray": "3 4" }));
  hub.appendChild(svgEl("circle", { cx: 54, cy: 125, r: 4, fill: "#e08baf" }));
  svg.appendChild(hub);
  const hubLabel = svgEl("text", { class: "rd-label", x: 54, y: 96, "text-anchor": "middle" });
  hubLabel.textContent = "ROUTER";
  svg.appendChild(hubLabel);
}

function rdLaunch() {
  const svg = $("rd-svg");
  const g = svgEl("g", { id: "rd-beam" });
  const head = svgEl("circle", { class: "rd-tracer", r: 4.5 });
  const trail = [];
  for (let i = 0; i < 6; i++) {
    trail.push(svgEl("circle", { class: "rd-tracer", r: Math.max(1.2, 4 - i * 0.55) }));
    g.appendChild(trail[i]);
  }
  g.appendChild(head);
  svg.appendChild(g);
  rdBeam = g;
  return { head, trail };
}

function rdFly(path, tracer, duration) {
  const len = path.getTotalLength();
  path.classList.add("drawing");
  path.style.strokeDasharray = String(len);
  path.style.strokeDashoffset = String(len);
  return new Promise((resolve) => {
    let t0 = null;
    const step = (t) => {
      if (!t0) t0 = t;
      const p = Math.min(1, (t - t0) / duration);
      const ease = 1 - Math.pow(1 - p, 3);
      path.style.strokeDashoffset = String(len * (1 - ease));
      for (let i = 0; i < tracer.trail.length; i++) {
        const pos = Math.max(0, ease - (i + 1) * 0.045);
        const pt = path.getPointAtLength(pos * len);
        tracer.trail[i].setAttribute("cx", pt.x);
        tracer.trail[i].setAttribute("cy", pt.y);
        tracer.trail[i].setAttribute("opacity", pos > 0 ? 1 - i / 7 : 0);
      }
      const pt = path.getPointAtLength(ease * len);
      tracer.head.setAttribute("cx", pt.x);
      tracer.head.setAttribute("cy", pt.y);
      if (p < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

function rdClearBeam() {
  if (rdBeam) { rdBeam.remove(); rdBeam = null; }
}

const rdType = (el, text, speed, gap) =>
  new Promise((resolve) => {
    let i = 0;
    const t = setInterval(() => {
      i += 2;
      el.textContent = text.slice(0, Math.min(i, text.length));
      if (i >= text.length) {
        clearInterval(t);
        rdTimers = rdTimers.filter((x) => x !== t);
        setTimeout(resolve, gap || 260);
      }
    }, speed);
    rdTimers.push(t);
  });

const rdWait = (ms) =>
  new Promise((r) => {
    const t = setTimeout(r, ms);
    rdTimers.push(t);
  });

async function runRoutingDemo() {
  const readout = $("rd-readout");
  if (!readout) return;
  const gen = ++rdGen;
  if (rdReduced.matches) {
    readout.innerHTML =
      `<div class="r-promp">$ claude · prompt: ${RD_DEMO[1].p}</div>` +
      `<div class="r-score">[SCORE] difficulty ${RD_DEMO[1].score.toFixed(2)}</div>` +
      `<div class="r-route">[ROUTE] → ${RD_DEMO[1].model} · ${RD_DEMO[1].cost}</div>`;
    return;
  }

  let i = 0;
  for (;;) {
    if (gen !== rdGen) return;
    const demo = RD_DEMO[i];
    readout.innerHTML = "";
    const promp = document.createElement("div");
    promp.className = "r-promp";
    promp.textContent = "$ claude";
    const promp2 = document.createElement("div");
    promp2.className = "r-promp";
    promp2.textContent = "";
    promp2.style.opacity = "0.8";
    const promptBlock = document.createElement("div");
    promptBlock.append(promp, promp2);
    const score = document.createElement("div");
    score.className = "r-score";
    score.textContent = "[SCORE] difficulty 0.00";
    const route = document.createElement("div");
    route.className = "r-route";
    route.textContent = "";

    readout.append(promptBlock, score, route);

    await rdType(promp2, `prompt: ${demo.p}`, 22);
    if (gen !== rdGen) return;

    const start = performance.now();
    await new Promise((resolve) => {
      const t = setInterval(() => {
        const k = Math.min(1, (performance.now() - start) / 1400);
        const vivid = 1 - Math.pow(1 - k, 3);
        score.textContent = `[SCORE] difficulty ${(demo.score * vivid).toFixed(2).padStart(5, "0")}`;
        if (k >= 1) { clearInterval(t); resolve(); }
      }, 30);
    });
    if (gen !== rdGen) return;

    const node = $("rd-node-" + i);
    const link = $("rd-link-" + i);
    node.classList.add("lit");
    const lbl = document.querySelector('.rd-node-label[data-i="' + i + '"]');
    if (lbl) lbl.classList.add("on");
    route.textContent = `[ROUTE] → ${demo.model} · ${demo.cost}`;

    await rdWait(400);
    await rdFly(link, rdLaunch(), 1800);
    rdClearBeam();
    if (gen !== rdGen) return;

    await rdWait(1400);
    node.classList.remove("lit");
    if (lbl) lbl.classList.remove("on");
    link.classList.remove("drawing");
    link.style.strokeDasharray = "";
    link.style.strokeDashoffset = "";
    await rdWait(400);
    i = (i + 1) % RD_DEMO.length;
  }
}

function startRoutingDemo() {
  buildRdSVG();
  runRoutingDemo();
}

function stopRoutingDemo() {
  rdGen++;
  rdTimers.forEach((t) => { clearInterval(t); clearTimeout(t); });
  rdTimers = [];
  rdClearBeam();
  const readout = $("rd-readout");
  if (readout) readout.innerHTML = "";
  document.querySelectorAll(".rd-node").forEach((n) => n.classList.remove("lit"));
  document.querySelectorAll(".rd-node-label").forEach((l) => l.classList.remove("on"));
  document.querySelectorAll(".rd-link").forEach((l) => {
    l.classList.remove("drawing");
    l.style.strokeDasharray = "";
    l.style.strokeDashoffset = "";
  });
}

/* ---------------------------------------------------------------- */
/* flagship burn                                                    */
/* ---------------------------------------------------------------- */

const burnStages = [];
let burnRunning = false;
const burnReduced = window.matchMedia("(prefers-reduced-motion: reduce)");

function burnCost() {
  if (DATA && DATA.savings) {
    return (DATA.savings.requests_total * DATA.savings.avg_cost_before);
  }
  return 3278.34;
}

function fmtMoney(n) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function makeBurn(canvasId, valueId, subId, target, opts) {
  opts = opts || {};
  const cv = $(canvasId);
  const val = $(valueId);
  const sub = $(subId);
  if (!cv || !val) return null;
  const ctx = cv.getContext("2d");
  if (!ctx) return null;

  const W = cv.width, H = cv.height;
  const embers = [];
  let fireX = W / 2, fireY = H * 0.86, fireR = 8;
  let spend = 0;
  let frame = 0;
  let raf = 0;
  let resetT = null;
  const hueBase = opts.hueBase || 24;

  const spawn = () => {
    const n = 1 + Math.floor(Math.random() * 1);
    for (let k = 0; k < n; k++) {
      embers.push({
        x: W / 2 + (Math.random() - 0.5) * W * 0.7,
        y: (Math.random() - 0.3) * H * 0.3,
        vx: (Math.random() - 0.5) * 0.5,
        vy: 0.12 + Math.random() * 0.4,
        r: 0.8 + Math.random() * 1.4,
        hue: hueBase - 12 + Math.random() * 28,
        life: 1,
        decay: 0.001 + Math.random() * 0.002,
        value: target / 4200,
      });
    }
  };

  const drawFlame = () => {
    const flames = opts.flame || {
      c0: "rgba(255,190,120,0.85)",
      c1: "rgba(217,80,60,0.5)",
      c2: "rgba(60,15,20,0)",
      c3: "rgba(255,225,180,",
    };
    const grd = ctx.createRadialGradient(fireX, fireY, 2, fireX, fireY, fireR * 3.4);
    grd.addColorStop(0, flames.c0);
    grd.addColorStop(0.35, flames.c1);
    grd.addColorStop(1, flames.c2);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(fireX, fireY, fireR * 3.4, 0, Math.PI * 2);
    ctx.fill();

    const flicker = 0.7 + Math.sin(performance.now() / 90) * 0.12;
    ctx.fillStyle = flames.c3 + (0.9 * flicker) + ")";
    ctx.beginPath();
    ctx.arc(fireX, fireY, fireR * 1.1, 0, Math.PI * 2);
    ctx.fill();
  };

  const render = () => {
    val.textContent = fmtMoney(spend);
    if (sub) {
      sub.textContent = fmtMoney(target) +
        (opts.caption ? " · " + opts.caption : "");
    }
  };

  const loop = () => {
    if (!burnRunning) return;
    ctx.clearRect(0, 0, W, H);

    frame++;
    if (frame % 5 === 0) spawn();
    fireR = 8 + Math.random() * 3;
    drawFlame();

    for (let i = embers.length - 1; i >= 0; i--) {
      const e = embers[i];
      e.x += e.vx + Math.sin((e.x + performance.now() / 600) * 0.02) * 0.3;
      e.y += e.vy;
      e.vy += 0.008;
      const dx = fireX - e.x, dy = fireY - e.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < fireR * 5) {
        e.x += dx * 0.03;
        e.y += dy * 0.03;
      }
      e.life -= e.decay;
      if (e.life <= 0 || e.y > H + 8) { spend += e.value; embers.splice(i, 1); continue; }
      if (d < fireR * 2.4) spend += e.value * 0.02;
      ctx.globalAlpha = Math.max(0, e.life);
      ctx.fillStyle = "hsl(" + e.hue + ", 90%, " + (52 + e.life * 45) + "%)";
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    spend = Math.min(spend, target);
    if (opts.onTick) opts.onTick(spend, target);
    render();

    if (spend >= target) {
      val.classList.add("maxed");
      resetT = setTimeout(() => {
        spend = 0;
        embers.length = 0;
        val.classList.remove("maxed");
        val.textContent = fmtMoney(0);
        loop();
      }, 1400);
      return;
    }
    raf = requestAnimationFrame(loop);
  };

  return {
    start() {
      if (burnReduced.matches) {
        spend = target;
        render();
        val.classList.add("maxed");
        return;
      }
      loop();
    },
    stop() {
      cancelAnimationFrame(raf);
      clearTimeout(resetT);
    },
  };
}

function startBurn() {
  const s = (DATA && DATA.savings) ? DATA.savings : null;
  const flagshipTarget = burnCost();
  const routedTarget = s ? s.requests_total * s.avg_cost_after : flagshipTarget * 0.37;
  const pctTarget = s ? s.pct_saved : 63;
  const requests = s ? s.requests_total.toLocaleString() : "48,211";
  const pctEl = $("bc-pct"), keepEl = $("bc-keep");

  burnRunning = true;

  const routed = makeBurn("burn-canvas-2", "burn-value-2", "burn-sub-2", routedTarget, {
    hueBase: 148,
    caption: "requests split by capability across 3 model tiers",
    flame: {
      c0: "rgba(150,255,200,0.85)",
      c1: "rgba(60,190,140,0.5)",
      c2: "rgba(10,60,40,0)",
      c3: "rgba(200,255,230,",
    },
  });
  if (routed) {
    routed.start();
    burnStages.push(routed);
  }

  const flagship = makeBurn("burn-canvas", "burn-value", "burn-sub", flagshipTarget, {
    hueBase: 24,
    caption: requests + " requests at $" + (s ? s.avg_cost_before : 0.068) + "/prompt",
    onTick(spend, target) {
      if (keepEl) keepEl.textContent = fmtMoney(spend - spend * routedTarget / target);
    },
  });
  if (flagship) {
    flagship.start();
    burnStages.push(flagship);
  }

  if (pctEl) pctEl.textContent = pctTarget + "% less spend";
  if (keepEl) keepEl.textContent = "$0.00";
}

function stopBurn() {
  burnRunning = false;
  burnStages.forEach((st) => st.stop());
  burnStages.length = 0;
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
  $("free-body").textContent = "Zero install: enter your keys, hit start, and route immediately.";
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
        msg.textContent = "Thanks. Our enterprise team will reach out.";
      } else {
        msg.className = "lead-msg danger";
        msg.textContent = "Could not submit. Please check your email.";
        btn.disabled = false;
        btn.textContent = "REQUEST A CALL";
      }
    })
    .catch(() => {
      const msg = $("lead-msg");
      msg.className = "lead-msg danger";
      msg.textContent = "Network error. Try again.";
      btn.disabled = false;
      btn.textContent = "REQUEST A CALL";
    });
}

function submitWaitlist(event) {
  event.preventDefault();
  const btn = $("wait-btn");
  if (btn.disabled) return;
  const email = $("wait-email").value.trim().toLowerCase();
  const msg = $("wait-msg");
  btn.disabled = true;
  btn.textContent = "JOINING…";

  fetch("/api/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
    .then((res) => res.json())
    .then((d) => {
      if (d.ok) {
        msg.className = "wait-msg ok";
        msg.textContent = d.existing
          ? "You're already on the list — watch your inbox."
          : "You're on the list — watch your inbox for the setup.";
        const row = $("wait-row");
        if (row) row.style.display = "none";
      } else {
        msg.className = "wait-msg danger";
        msg.textContent = "That email didn't look right. Try again.";
        btn.disabled = false;
        btn.textContent = "[ JOIN THE WAITLIST ]";
      }
    })
    .catch(() => {
      msg.className = "wait-msg danger";
      msg.textContent = "Network error. Is the server running?";
      btn.disabled = false;
      btn.textContent = "[ JOIN THE WAITLIST ]";
    });
}

function closeLiveDashboard() {
  const el = $("dash-page");
  el.classList.remove("open");
  document.body.style.overflow = "";
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
      msg.textContent = "Dashboard API unreachable. Is the server running?";
    });
}

/* ---------------------------------------------------------------- */
/* page router (views instead of scroll)                             */
/* ---------------------------------------------------------------- */

const VIEWS = [
  { hash: "overview", el: "view-overview", tab: "overview" },
  { hash: "problem", el: "view-problem", tab: "problem" },
  { hash: "savings", el: "view-savings", tab: "savings" },
  { hash: "stream", el: "view-stream", tab: "stream" },
  { hash: "roadmap", el: "view-roadmap", tab: "roadmap" },
  { hash: "download", el: "view-download", tab: "download" },
];

let currentView = null;

function showView(hash) {
  const v = VIEWS.find((x) => x.hash === hash) || VIEWS[0];
  if (currentView === v.hash) {
    window.scrollTo({ top: 0, behavior: "auto" });
    return;
  }
  currentView = v.hash;
  document.querySelectorAll(".view").forEach((el) => el.classList.remove("active"));
  document.querySelectorAll(".sections .tab").forEach((a) => {
    const isActive = a.getAttribute("href") === "#" + v.hash;
    a.classList.toggle("active", isActive);
  });
  const view = document.getElementById(v.el);
  view.classList.add("active");
  window.scrollTo({ top: 0, behavior: "auto" });
  if (v.hash === "problem") startCostLeak();
  else stopCostLeak();
  if (v.hash === "problem") startBurn();
  else stopBurn();
  if (v.hash === "savings") startSparkTrace();
  else stopSparkTrace();
  if (v.hash === "overview") startRoutingDemo();
  else stopRoutingDemo();
  enterView(v.hash);
}

function onNavClick(event) {
  const href = event.currentTarget.getAttribute("href");
  if (href && href.startsWith("#")) {
    event.preventDefault();
    showView(href.slice(1));
  }
}

/* run once-per-visit reveals per page */
const enteredViews = {};

function enterView(hash) {
  if (enteredViews[hash]) return;
  enteredViews[hash] = true;

  if (hash === "problem") {
    typeText($("problem-body"), DATA.problem.body.replace(/\s+/g, " "));
    typeText($("solution-body"), DATA.solution.body.replace(/\s+/g, " "));
    typeText($("biz-body"), DATA.business_problem.body.replace(/\s+/g, " "));
  }
  if (hash === "savings" && !counted) {
    counted = true;
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
  if (hash === "roadmap" && !roadmapDone) {
    roadmapDone = true;
    document.querySelectorAll(".rm-fill").forEach((f, i) => {
      setTimeout(() => (f.style.width = f.dataset.w + "%"), 150 + i * 120);
    });
  }
}

function initRouter() {
  document.querySelectorAll(".sections .tab").forEach((a) => a.addEventListener("click", onNavClick));
  const initial = (location.hash || "").replace("#", "");
  showView(initial || "overview");
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
  localStorage.removeItem("nova-theme");
  updateFavicon();
  clock();

  try {
    const res = await fetch("/api/dashboard");
    DATA = await res.json();
  } catch (_) {
    return;
  }

  const d = DATA;

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

start();