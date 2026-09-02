#!/bin/bash

# ═══════════════════════════════════════════════════════════
#  ANALYXX — Full Stack Launcher
#  Starts: Docker · Backend · Frontend · WhatsApp Bot · Ngrok
# ═══════════════════════════════════════════════════════════

export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$ROOT_DIR/.analyxx-logs"
mkdir -p "$LOG_DIR"

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}${BOLD}║         🚀  ANALYXX AI — LAUNCH         ║${NC}"
echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════╝${NC}"
echo ""

cleanup() {
    echo ""
    echo -e "${YELLOW}${BOLD}Shutting down ANALYXX...${NC}"

    # Kill background processes
    [ -n "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null
    [ -n "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null
    [ -n "$WHATSAPP_PID" ] && kill $WHATSAPP_PID 2>/dev/null
    [ -n "$NGROK_PID" ] && kill $NGROK_PID 2>/dev/null

    # Stop Docker containers
    docker compose -f "$ROOT_DIR/docker-compose.yml" down 2>/dev/null

    echo -e "${GREEN}All services stopped.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# ─── 1. Docker ──────────────────────────────────────────
echo -e "${CYAN}[1/5]${NC} Starting Docker containers (Postgres + Redis)..."
docker compose -f "$ROOT_DIR/docker-compose.yml" up -d
if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✔ Docker containers running${NC}"
else
    echo -e "  ${RED}✖ Docker failed to start. Make sure Docker Desktop is running.${NC}"
    exit 1
fi

# ─── 2. Backend (FastAPI) ───────────────────────────────
echo -e "${CYAN}[2/5]${NC} Starting Backend (FastAPI on port 8000)..."
cd "$ROOT_DIR/backend"
source venv/bin/activate 2>/dev/null || source .venv/bin/activate 2>/dev/null
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo -e "  ${GREEN}✔ Backend started (PID: $BACKEND_PID)${NC}"

# ─── 3. Frontend (Next.js) ─────────────────────────────
echo -e "${CYAN}[3/5]${NC} Starting Frontend (Next.js on port 3000)..."
cd "$ROOT_DIR/frontend"
npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo -e "  ${GREEN}✔ Frontend started (PID: $FRONTEND_PID)${NC}"

# ─── 4. WhatsApp Bot ───────────────────────────────────
echo -e "${CYAN}[4/5]${NC} Starting WhatsApp Bot (port 3001)..."
cd "$ROOT_DIR/whatsapp-bot"
npm run dev > "$LOG_DIR/whatsapp-bot.log" 2>&1 &
WHATSAPP_PID=$!
echo -e "  ${GREEN}✔ WhatsApp Bot started (PID: $WHATSAPP_PID)${NC}"

# ─── 5. Ngrok Tunnel ───────────────────────────────────
echo -e "${CYAN}[5/5]${NC} Starting Ngrok tunnel (forwarding to port 3001)..."
ngrok http 3001 > "$LOG_DIR/ngrok.log" 2>&1 &
NGROK_PID=$!
echo -e "  ${GREEN}✔ Ngrok started (PID: $NGROK_PID)${NC}"

# ─── Summary ───────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║        ✅  ALL SERVICES RUNNING          ║${NC}"
echo -e "${GREEN}${BOLD}╠══════════════════════════════════════════╣${NC}"
echo -e "${GREEN}${BOLD}║${NC}  Docker     → Postgres:5432, Redis:6379 ${GREEN}${BOLD}║${NC}"
echo -e "${GREEN}${BOLD}║${NC}  Backend    → http://localhost:8000     ${GREEN}${BOLD}║${NC}"
echo -e "${GREEN}${BOLD}║${NC}  Frontend   → http://localhost:3000     ${GREEN}${BOLD}║${NC}"
echo -e "${GREEN}${BOLD}║${NC}  WhatsApp   → http://localhost:3001     ${GREEN}${BOLD}║${NC}"
echo -e "${GREEN}${BOLD}║${NC}  Ngrok      → Check .analyxx-logs/     ${GREEN}${BOLD}║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Logs → $LOG_DIR/${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Keep script alive and wait for Ctrl+C
wait
