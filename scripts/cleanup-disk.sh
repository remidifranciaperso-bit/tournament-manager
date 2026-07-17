#!/usr/bin/env bash
# Nettoyage sécurisé : caches système + autosaves Keynote + fichiers temporaires dev.
# Ne touche PAS aux fichiers de travail (Desktop, Documents, templates du projet).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Nettoyage disque ==="
echo "Avant : $(df -h /System/Volumes/Data | tail -1 | awk '{print $4}') libres"
echo

total_before=$(df -k /System/Volumes/Data | tail -1 | awk '{print $4}')

# Fermer Keynote pour débloquer les autosaves
if pgrep -iq keynote 2>/dev/null; then
  echo "→ Fermeture de Keynote…"
  osascript -e 'tell application "Keynote" to quit' 2>/dev/null || true
  sleep 3
fi

# 1. Autosaves Keynote (gros fichiers temporaires de récupération)
KEYNOTE_AUTOSAVE="$HOME/Library/Containers/com.apple.iWork.Keynote/Data/Library/Autosave Information"
if [ -d "$KEYNOTE_AUTOSAVE" ] && [ "$(ls -A "$KEYNOTE_AUTOSAVE" 2>/dev/null | wc -l | tr -d ' ')" -gt 0 ]; then
  size_human=$(du -sh "$KEYNOTE_AUTOSAVE" 2>/dev/null | awk '{print $1}')
  echo "→ Keynote autosaves ($size_human)"
  rm -rf "$KEYNOTE_AUTOSAVE"/* 2>/dev/null || {
    echo "  ⚠ Impossible de tout supprimer — fermez Keynote manuellement et relancez."
  }
  echo "  ✓ nettoyé"
fi

# 2. Caches sans risque
for cache in \
  "$HOME/Library/Caches/com.google.SoftwareUpdate" \
  "$HOME/Library/Caches/com.todesktop.230313mzl4w4u92.ShipIt" \
  "$HOME/Library/Caches/pip" \
  "$HOME/Library/Caches/ms-playwright" \
  "$HOME/Library/Caches/Docker Desktop"
do
  if [ -e "$cache" ]; then
    label=$(basename "$cache")
    size_human=$(du -sh "$cache" 2>/dev/null | awk '{print $1}')
    echo "→ Cache $label ($size_human)"
    rm -rf "$cache"
    echo "  ✓ supprimé"
  fi
done

# 3. Fichiers temporaires navigateurs (code sign clones)
for path in /private/var/folders/*/*/X/com.google.Chrome.code_sign_clone \
            /private/var/folders/*/*/X/com.operasoftware.Opera.code_sign_clone; do
  if [ -d "$path" ]; then
      size_human=$(du -sh "$path" 2>/dev/null | awk '{print $1}')
      echo "→ Temp navigateur $(basename "$path") ($size_human)"
      rm -rf "$path"
      echo "  ✓ supprimé"
  fi
done

# 4. Installateurs DMG déjà utilisés
for dmg in \
  "$HOME/Downloads/LibreOffice_"*".dmg" \
  "$HOME/Downloads/Cursor-darwin"*.dmg
do
  if [ -f "$dmg" ]; then
    size_human=$(du -sh "$dmg" 2>/dev/null | awk '{print $1}')
    echo "→ Installateur $(basename "$dmg") ($size_human)"
    rm -f "$dmg"
    echo "  ✓ supprimé"
  fi
done

# 5. Exports PDF de test du projet
if [ -d "$ROOT/exports" ]; then
  size_human=$(du -sh "$ROOT/exports" 2>/dev/null | awk '{print $1}')
  echo "→ Exports tournoi ($size_human)"
  rm -rf "$ROOT/exports"/*
  echo "  ✓ vidé"
fi

# 6. Homebrew (si disponible)
if command -v brew >/dev/null 2>&1; then
  echo "→ Homebrew cleanup"
  brew cleanup -s --prune=all 2>/dev/null || true
  echo "  ✓ terminé"
fi

echo
total_after=$(df -k /System/Volumes/Data | tail -1 | awk '{print $4}')
gained_kb=$(( total_after - total_before ))
gained_gb=$(echo "scale=1; $gained_kb / 1024 / 1024" | bc 2>/dev/null || echo "?")
echo "Après : $(df -h /System/Volumes/Data | tail -1 | awk '{print $4}') libres"
echo "Espace récupéré : ~${gained_gb} Go"
