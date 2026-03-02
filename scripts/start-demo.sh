#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_LOG="$ROOT_DIR/target/demo-backend.log"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

require_cmd docker
require_cmd curl
require_cmd npm

cd "$ROOT_DIR"

echo "[1/4] Starting PostgreSQL and Redis..."
docker compose up -d postgres redis >/dev/null

echo "[2/4] Starting Spring Boot backend on :8080..."
./mvnw -q -DskipTests spring-boot:run >"$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

cleanup() {
  if ps -p "$BACKEND_PID" >/dev/null 2>&1; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

echo "Waiting for backend health..."
for _ in $(seq 1 120); do
  if curl -fsS http://localhost:8080/actuator/health >/dev/null 2>&1; then
    echo "Backend is UP."
    break
  fi
  sleep 1
done

if ! curl -fsS http://localhost:8080/actuator/health >/dev/null 2>&1; then
  echo "Backend failed to become healthy."
  echo "Check logs: $BACKEND_LOG"
  exit 1
fi

echo "[3/4] Ensuring frontend dependencies..."
cd "$ROOT_DIR/frontend"
if [ ! -d node_modules ]; then
  npm ci
fi

echo "[4/4] Starting frontend dev server on :5173"
echo "Open: http://localhost:5173"
npm run dev -- --host 0.0.0.0 --port 5173
