#!/usr/bin/env bash

# ==============================================================================
# Sarthak Mathapati Portfolio — Local Development & Launch Workflow
# Usage:
#   ./stuff/start.sh          (Starts Frontend Application and opens browser)
#   ./stuff/start.sh frontend (Starts Frontend Application)
#   ./stuff/start.sh backend  (Starts Sanity Backend Studio and opens browser)
#   ./stuff/start.sh all      (Starts both Frontend and Backend concurrently)
# ==============================================================================

set -e

# Resolve script and root directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/stuff/backend"

# Terminal Colors
CYAN='\033[1;36m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Function to open browser cross-platform
open_browser() {
  local url="$1"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    open "$url" >/dev/null 2>&1 || true
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open "$url" >/dev/null 2>&1 || true
  elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    start "" "$url" >/dev/null 2>&1 || true
  fi
}

# Preflight checks
if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}✖ Error: Node.js is required but not installed.${NC}"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo -e "${RED}✖ Error: npm is required but not installed.${NC}"
  exit 1
fi

MODE="${1:-frontend}"

case "$MODE" in
  backend|studio)
    echo -e "${CYAN}===================================================${NC}"
    echo -e "${GREEN}   ⚡ LAUNCHING SANITY CMS CONTENT STUDIO...       ${NC}"
    echo -e "${CYAN}===================================================${NC}"
    echo -e "  ${BOLD}Studio Location:${NC} $BACKEND_DIR"
    echo -e "  ${BOLD}Studio URL:${NC}      ${CYAN}http://localhost:3333${NC}\n"

    # Background browser opener once studio starts listening
    (
      sleep 2
      open_browser "http://localhost:3333"
    ) &

    cd "$BACKEND_DIR"
    exec npm run dev
    ;;

  all|both|full)
    echo -e "${CYAN}===================================================${NC}"
    echo -e "${GREEN}   🚀 LAUNCHING FULL-STACK LOCAL ENVIRONMENT       ${NC}"
    echo -e "${CYAN}===================================================${NC}"
    echo -e "  ${BOLD}Frontend:${NC} ${CYAN}http://localhost:3000${NC}"
    echo -e "  ${BOLD}Studio:${NC}   ${CYAN}http://localhost:3333${NC}\n"

    # Trap Ctrl+C to kill all child processes
    trap 'kill $(jobs -p) 2>/dev/null || true; exit 0' SIGINT SIGTERM EXIT

    # Start Backend in background
    (
      cd "$BACKEND_DIR" && npm run dev
    ) &

    # Start Frontend
    node "$ROOT_DIR/stuff/utilities/serve.js"
    ;;

  frontend|app|start|*)
    echo -e "${CYAN}===================================================${NC}"
    echo -e "${GREEN}   🚀 LAUNCHING PORTFOLIO WEB APPLICATION          ${NC}"
    echo -e "${CYAN}===================================================${NC}\n"

    exec node "$ROOT_DIR/stuff/utilities/serve.js"
    ;;
esac
