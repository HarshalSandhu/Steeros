# STEEROS.ai

Routes every LLM prompt to the cheapest model that can handle it, remembers
past answers, and cuts the energy burn — token spend and carbon footprint
go down together.

## Deploy (Vercel)

Import the repo on Vercel (Python / FastAPI). Runtimes: `fastapi`,
`uvicorn[standard]` (see `requirements.txt`). Entry point: `api/index.py`.

## Local dev

```sh
# root (edge/landing build)
.venv/bin/uvicorn main:app --port 4050

# legacy CRT build
.venv/bin/uvicorn main:app --port 4040  # inside crt/
```

## Builds

- `/` — main landing (novel flat-editorial build, burgundy)
- `crt/` — legacy CRT terminal build