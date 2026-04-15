#!/usr/bin/env bash
# Deploy: SvelteKit-Build nach svelte.joerg-lohrer.de per FTPS.
# Credentials kommen aus ./.env.local (gitignored), Variablen-Prefix SVELTE_FTP_.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env.local ]; then
  echo "FEHLER: .env.local fehlt — Credentials ergänzen (siehe .env.example)." >&2
  exit 1
fi

# nur SVELTE_FTP_* exportieren (via Tempfile — process substitution ist nicht
# überall verfügbar, je nach Shell/Sandbox).
_ENV_TMP="$(mktemp)"
trap 'rm -f "$_ENV_TMP"' EXIT
grep -E '^SVELTE_FTP_' .env.local > "$_ENV_TMP" || true
set -a
# shellcheck disable=SC1090
. "$_ENV_TMP"
set +a

for v in SVELTE_FTP_HOST SVELTE_FTP_USER SVELTE_FTP_PASS SVELTE_FTP_REMOTE_PATH; do
  if [ -z "${!v:-}" ]; then
    echo "FEHLER: $v fehlt in .env.local." >&2
    exit 1
  fi
done

BUILD_DIR="$ROOT/app/build"
if [ ! -d "$BUILD_DIR" ]; then
  echo "FEHLER: app/build nicht vorhanden. Bitte vorher 'npm run build' in app/ ausführen." >&2
  exit 1
fi

echo "Lade Build von $BUILD_DIR nach ftp://$SVELTE_FTP_HOST$SVELTE_FTP_REMOTE_PATH"

# pro Datei ein curl-Upload (zuverlässig auf macOS ohne lftp)
find "$BUILD_DIR" -type f -print0 | while IFS= read -r -d '' local_file; do
  rel="${local_file#$BUILD_DIR/}"
  remote="ftp://$SVELTE_FTP_HOST${SVELTE_FTP_REMOTE_PATH%/}/$rel"
  echo "  → $rel"
  # --tls-max 1.2: All-Inkl/Kasserver FTPS schließt bei TLS 1.3 die Data-
  # Connection mit "426 Transfer aborted" — mit 1.2 läuft es sauber durch.
  curl -sSf --ssl-reqd --tls-max 1.2 --ftp-create-dirs \
    --retry 3 --retry-delay 2 --retry-all-errors \
    --connect-timeout 15 \
    --user "$SVELTE_FTP_USER:$SVELTE_FTP_PASS" \
    -T "$local_file" "$remote"
done

echo "Upload fertig. Live-Check:"
curl -sIL "https://svelte.joerg-lohrer.de/" | head -5
