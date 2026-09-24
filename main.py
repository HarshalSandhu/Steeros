"""STEEROS · token-aware LLM dispatch dashboard.

Sits on the local server, intercepts Claude Code prompts, classifies
difficulty, and routes each request to the cheapest model that can handle it.
Serves the retro CRT dashboard + mock-data API for now; real telemetry hooks
come later.
"""

from __future__ import annotations

import json
import random
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, Request, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

STATIC_DIR = Path(__file__).parent / "static"
LEAD_FILE = Path(__file__).parent / "leads.json"
WAITLIST_FILE = Path(__file__).parent / "waitlist.json"
WAITLIST_FILE = Path(__file__).parent / "waitlist.json"

app = FastAPI(title="STEEROS", version="2.0.0")

NOW = datetime.now(timezone.utc)


def _series(n: int = 30) -> list[dict]:
    """Deterministic-ish mock time series for the sparks/line chart."""
    tokens = 250_000
    out = []
    month = 1
    for i in range(n):
        month = (i // 10) + 1
        day = (i % 10) + 1
        growth = 1 + (i * 0.045) + random.uniform(-0.08, 0.08)
        tokens = int(tokens * growth)
        out.append({"label": f"M{month}.{day:02d}", "tokens": tokens})
    return out


MOCK_DASHBOARD = {
    "system": {
        "name": "STEEROS",
        "version": "2.0.0",
        "uptime_seconds": 912347,
        "status": "ONLINE",
        "uptime_human": "10d 13:25:47",
        "mux": "LOCAL:127.0.0.1:4040",
    },
    "problem": {
        "title": "The Current Problem",
        "headline": "Once a model is selected, every prompt pays its price.",
        "body": (
            "Whatever coding agent you use, Claude Code, Cursor, Copilot, you "
            "pick a model and that door flies open for everything: from a one-line "
            "git message to a multi-file refactor, every prompt bleeds premium "
            "tokens. Teams routinely burn 60-70% of their spend on requests that a "
            "small model handles perfectly."
        ),
        "framing": "Think of it like taking a Ferrari to buy milk, every single time.",
    },
    "solution": {
        "title": "The Solution",
        "headline": "A three-tier ladder: lowest cost, balanced, quality.",
        "body": (
            "STEEROS sits between your prompts and the LLMs. Each request is "
            "scored for complexity: intent, context size, tool usage, risk, and "
            "dropped onto the right rung: the lowest-cost model for easy tasks, "
            "the balanced mid-tier for most engineering work, and the quality "
            "flagship only when the task actually earns its price."
        ),
        "bullet_points": [
            "Heuristic + classifier scoring on every prompt",
            "Three tiers: low-cost · balanced · quality, each with its own cost ceiling",
            "Per-model cost ceilings, you define the wallet",
            "Fallback chain: if a low-cost model fails, escalate automatically",
            "Zero code changes on your side, Claude Code just talks to one proxy",
        ],
    },
    "business_problem": {
        "title": "The Business Problem",
        "headline": "Token spend has become an operating cost with no governor.",
        "body": (
            "Every agentic coding task is a cascade of model calls. Costs grow "
            "linearly with seat count, but nobody watches per-request spend. "
            "Finance sees the invoice, engineers see latency, and the flagship "
            "model quietly becomes your default for everything, including the "
            "10-second one-liner."
        ),
        "study": {
            "name": "RouteLLM · LMSYS, arXiv 2406.18665 (2024)",
            "claim": "Routing simpler queries to cheaper models cut LLM costs by up to 85% while keeping 95% of flagship-model quality.",
            "url": "https://arxiv.org/abs/2406.18665",
        },
        "stats": [
            {"label": "avg. over-billing", "value": "63%", "detail": "of requests need a cheaper tier"},
            {"label": "cost per trivial request", "value": "$0.04", "detail": "vs ~$0.003 on a small model"},
            {"label": "time to payback", "value": "< 2 wks", "detail": "for a 10-seat team"},
        ],
    },
    "savings": {
        "tokens_saved": 4128374,
        "dollars_saved": 1832.42,
        "monthly_savings": 486.10,
        "pct_saved": 63,
        "requests_total": 48211,
        "avg_cost_before": 0.068,
        "avg_cost_after": 0.022,
        "series": _series(),
        "by_model": [
            {"model": "flash-tier", "name": "light-model", "requests": 24609, "cost": 98.4, "share": 51},
            {"model": "mid-tier", "name": "balanced-model", "requests": 15428, "cost": 308.6, "share": 32},
            {"model": "flagship", "name": "top-model", "requests": 8174, "cost": 735.7, "share": 17},
        ],
        "difficulty": {"easy": 51, "medium": 32, "hard": 17},
        "last_30d": [
            {"week": "W01", "spend_before": 1110, "spend_after": 402},
            {"week": "W02", "spend_before": 1235, "spend_after": 438},
            {"week": "W03", "spend_before": 1398, "spend_after": 489},
            {"week": "W04", "spend_before": 1612, "spend_after": 509},
        ],
    },
    "roadmap": [
        {
            "id": 1,
            "title": "Live Local Dashboard",
            "desc": "Already shipped. A live local dashboard tracks requests, tokens, and money saved in real time, click any metric to open its live API connection.",
            "status": "included",
            "eta": "SHIPPED",
            "progress": 100,
        },
        {
            "id": 2,
            "title": "Other Coding Agents",
            "desc": "One router for every coding agent, Cursor, Codex, Gemini CLI, Aider, Copilot, same difficulty gate, same cost governor.",
            "status": "in development",
            "eta": "Q4 2026",
            "progress": 55,
        },
        {
            "id": 3,
            "title": "Memory Agent",
            "desc": "Per-project context that remembers prior routes so repeat prompts skip straight to the right tier.",
            "status": "in development",
            "eta": "Q4 2026",
            "progress": 35,
        },
        {
            "id": 4,
            "title": "PII Detection & Prevention",
            "desc": "Scrub secrets, keys, and customer PII before any prompt leaves the machine. Blocklist + redaction.",
            "status": "planned",
            "eta": "Q1 2027",
            "progress": 15,
        },
        {
            "id": 5,
            "title": "Self-tuning Difficulty Model",
            "desc": "The classifier retrains on your team's own prompt distribution, weekly, on-device.",
            "status": "backlog",
            "eta": "Q2 2027",
            "progress": 0,
            "locked": True,
        },
    ],
    "dispatch_log": [
        {"ts": "09:41:12", "prompt": "fix typo in README", "route": "light-model", "saved": "$0.041"},
        {"ts": "09:44:37", "prompt": "refactor auth module to async", "route": "balanced-model", "saved": "$0.063"},
        {"ts": "09:48:03", "prompt": "design new migration strategy", "route": "top-model", "saved": "$0.000"},
        {"ts": "09:52:55", "prompt": "add unit tests for parser", "route": "light-model", "saved": "$0.038"},
        {"ts": "09:56:20", "prompt": "debug prod crash on startup", "route": "balanced-model", "saved": "$0.057"},
    ],
    "free_tier": {
        "name": "STEEROS FREE",
        "limits": "Open-source quickstart for STEEROS.",
        "files": [
            {"name": "routes.free.yaml", "bytes": 1843, "what": "working config template"},
            {"name": "proxy.example.sh", "bytes": 921, "what": "one-liner localhost proxy"},
            {"name": "models.json", "bytes": 1276, "what": "model map + cost ceilings"},
        ],
    },
}

FREE_CONFIG_YAML = """# STEEROS FREE, generated @ {now}
# Hand-tune ceilings for your wallet. Smallest model that clears the bar wins.
version: 2.0.0
mode: free

proxy:
  listen: "127.0.0.1:4040"
  upstream_base: "http://localhost:8000"

routes:
  - id: light-model
    difficulty: easy
    max_input_tokens: 2048
    cost_ceiling: 0.003
    provider: local

  - id: balanced-model
    difficulty: medium
    max_input_tokens: 8192
    cost_ceiling: 0.012
    provider: cloud-tier-2

  - id: top-model
    difficulty: hard
    max_input_tokens: 64000
    cost_ceiling: 0.20
    provider: cloud-flagship

classifier:
  mode: heuristic
  fallback_route: balanced-model
  escalate_on_failure: true

guardrails:
  monthly_requests_cap: 25000
  over_cap_policy: degrade_to_light
  alert_email: ""
"""


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/dashboard")
def dashboard() -> dict:
    return MOCK_DASHBOARD


@app.get("/api/ping")
def ping() -> dict:
    return {"pong": True, "ts": datetime.now(timezone.utc).isoformat()}


@app.post("/api/enterprise/lead")
async def enterprise_lead(request: Request) -> dict:
    """Capture a B2B/enterprise contact lead. Persists to leads.json on disk."""
    try:
        data = await request.json()
    except Exception:
        return {"ok": False, "error": "invalid_json"}

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    company = str(data.get("company", "")).strip()

    if not email or "@" not in email or "." not in email:
        return {"ok": False, "id": None, "error": "invalid_email"}

    leads = []
    if LEAD_FILE.exists():
        try:
            leads = json.loads(LEAD_FILE.read_text())
        except Exception:
            leads = []

    for lead in leads:
        if lead.get("email") == email:
            return {"ok": True, "id": lead.get("id"), "existing": True}

    lead = {
        "id": len(leads) + 1,
        "ts": datetime.now(timezone.utc).isoformat(),
        "name": name,
        "email": email,
        "company": company,
    }
    leads.append(lead)
    LEAD_FILE.write_text(json.dumps(leads, indent=2))
    return {"ok": True, "id": lead["id"], "existing": False}


@app.post("/api/waitlist")
async def waitlist_join(request: Request) -> dict:
    """Capture a waitlist signup for the free/local tier. Persists to waitlist.json on disk."""
    try:
        data = await request.json()
    except Exception:
        return {"ok": False, "id": None, "error": "invalid_json"}

    email = str(data.get("email", "")).strip().lower()
    name = str(data.get("name", "")).strip()

    if not email or "@" not in email or "." not in email:
        return {"ok": False, "id": None, "error": "invalid_email"}

    rows = []
    if WAITLIST_FILE.exists():
        try:
            rows = json.loads(WAITLIST_FILE.read_text())
        except Exception:
            rows = []

    for row in rows:
        if row.get("email") == email:
            return {"ok": True, "id": row.get("id"), "existing": True}

    row = {
        "id": len(rows) + 1,
        "ts": datetime.now(timezone.utc).isoformat(),
        "name": name,
        "email": email,
    }
    rows.append(row)
    WAITLIST_FILE.write_text(json.dumps(rows, indent=2))
    return {"ok": True, "id": row["id"], "existing": False}


@app.get("/api/free/download")
def download_free_config() -> Response:
    """Generate + serve the free-tier config bundle as a file download."""
    content = FREE_CONFIG_YAML.format(now=NOW.strftime("%Y-%m-%d %H:%M:%SZ"))
    return Response(
        content=content,
        media_type="text/plain",
        headers={"Content-Disposition": 'attachment; filename="routes.free.yaml"'},
    )


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")