#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

NODE="${NODE:-/Applications/Cursor.app/Contents/Resources/app/resources/helpers/node}"
VITE="$ROOT/frontend/node_modules/vite/bin/vite.js"
EXPECTED_LIVE="pdf-v8"

echo "API  → http://127.0.0.1:8000/api/health"
echo "App  → http://127.0.0.1:5173"
echo "Ctrl+C pour arrêter."

# Arrêt forcé de toute API résiduelle sur le port 8000.
if command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -ti :8000 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "Arrêt de l'ancienne API (port 8000)…"
    kill -9 $PIDS 2>/dev/null || true
    sleep 1
  fi
fi

echo "Vérification des dépendances Python…"
python3 -m pip install -q -r requirements.txt

export PDF_CONVERTER=libreoffice
if [ -x "/Applications/LibreOffice.app/Contents/MacOS/soffice" ]; then
  export SOFFICE_BIN="/Applications/LibreOffice.app/Contents/MacOS/soffice"
fi

python3 -m uvicorn api.main:app --host 127.0.0.1 --port 8000 \
  --reload --reload-dir api --reload-dir engine &
API_PID=$!
trap 'kill -9 $API_PID 2>/dev/null || true' EXIT

echo "Démarrage de l'API…"
READY=0
for _ in 1 2 3 4 5 6 7 8 9 10; do
  sleep 1
  HEALTH=$(curl -s http://127.0.0.1:8000/api/health 2>/dev/null || true)
  if echo "$HEALTH" | grep -q "\"live\":\"$EXPECTED_LIVE\""; then
    READY=1
    echo "API prête ($HEALTH)"
    break
  fi
done

if [ "$READY" -ne 1 ]; then
  echo "⚠️  L'API ne répond pas avec live=$EXPECTED_LIVE."
  echo "    Réponse actuelle : ${HEALTH:-aucune}"
  kill -9 $API_PID 2>/dev/null || true
  exit 1
fi

cd frontend
if [ ! -f "$VITE" ]; then
  echo "Frontend Vite introuvable. Lancez npm install dans frontend/."
  exit 1
fi
"$NODE" "$VITE" --host 127.0.0.1 --port 5173
