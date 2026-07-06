#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "API  → http://127.0.0.1:8000/api/health"
echo "App  → http://127.0.0.1:5173"
echo "Ctrl+C pour arrêter."

python3 -m uvicorn api.main:app --host 127.0.0.1 --port 8000 &
API_PID=$!
trap 'kill $API_PID 2>/dev/null || true' EXIT

cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
