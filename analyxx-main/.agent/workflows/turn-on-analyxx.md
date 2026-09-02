---
description: Start the full ANALYXX stack — Docker, Backend, Frontend, WhatsApp Bot, and Ngrok
---

# Turn On ANALYXX

Run this single command to start everything:

// turbo
```bash
/Users/ayush/Desktop/pyq-analyzer/start.sh
```

## What it starts:
1. **Docker** — Postgres (`:5432`) + Redis (`:6379`)
2. **Backend** — FastAPI on `localhost:8000`
3. **Frontend** — Next.js on `localhost:3000`
4. **WhatsApp Bot** — Express on `localhost:3001`
5. **Ngrok** — Tunnel to port `3001` for webhook

## To stop everything:
Press `Ctrl+C` in the terminal — all services shut down gracefully.

## Logs:
All service logs are saved to `.analyxx-logs/` in the project root.
