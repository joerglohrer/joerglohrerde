#!/usr/bin/env bash
# Deploy: SvelteKit-Build per FTPS nach einem der All-Inkl-Webroots.
# Credentials kommen aus ./.env.local (gitignored), Variablen-Prefix je Ziel.
#
# Zielauswahl via DEPLOY_TARGET-Env-Variable:
#   - DEPLOY_TARGET=svelte  (default) → svelte.joerg-lohrer.de via SVELTE_FTP_*
#   - DEPLOY_TARGET=staging           → staging.joerg-lohrer.de via STAGING_FTP_*
#
# Beispiele:
#   ./scripts/deploy-svelte.sh                          # default: svelte
#   DEPLOY_TARGET=staging ./scripts/deploy-svelte.sh    # staging-probelauf
#   DEPLOY_TARGET=svelte ./scripts/deploy-svelte.sh     # explizit

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env.local ]; then
  echo "FEHLER: .env.local fehlt — Credentials ergänzen (siehe .env.example)." >&2
  exit 1
fi

TARGET="${DEPLOY_TARGET:-svelte}"
case "$TARGET" in
  svelte)
    PREFIX="SVELTE_FTP_"
    PUBLIC_URL="https://svelte.joerg-lohrer.de/"
    SITE_URL="https://svelte.joerg-lohrer.de"
    ;;
  staging)
    PREFIX="STAGING_FTP_"
    PUBLIC_URL="https://staging.joerg-lohrer.de/"
    SITE_URL="https://staging.joerg-lohrer.de"
    ;;
  prod)
    # Deploy auf staging-ftp (joerglohrer26 = aktueller cutover-webroot),
    # aber mit og:url auf der hauptdomain.
    PREFIX="STAGING_FTP_"
    PUBLIC_URL="https://joerg-lohrer.de/"
    SITE_URL="https://joerg-lohrer.de"
    ;;
  *)
    echo "FEHLER: unbekanntes DEPLOY_TARGET='$TARGET' (erlaubt: svelte, staging, prod)." >&2
    exit 2
    ;;
esac

# Werte direkt aus .env.local lesen (nicht via `source`, weil
# password-shell-metazeichen wie ( ) & kein sourcing überstehen).
read_env() {
  local key="$1"
  # nimmt die erste zeile, die exakt mit KEY= beginnt, schneidet alles nach
  # dem ersten = ab, gibt den rest 1:1 zurück (auch mit sonderzeichen).
  awk -F= -v k="$key" 'BEGIN{found=0} $1==k && !found { sub("^" k "=",""); print; found=1 }' .env.local
}

FTP_HOST_KEY="${PREFIX}HOST"
FTP_USER_KEY="${PREFIX}USER"
FTP_PASS_KEY="${PREFIX}PASS"
FTP_PATH_KEY="${PREFIX}REMOTE_PATH"

FTP_HOST="$(read_env "$FTP_HOST_KEY")"
FTP_USER="$(read_env "$FTP_USER_KEY")"
FTP_PASS="$(read_env "$FTP_PASS_KEY")"
FTP_REMOTE_PATH="$(read_env "$FTP_PATH_KEY")"

for pair in "$FTP_HOST_KEY:$FTP_HOST" "$FTP_USER_KEY:$FTP_USER" \
            "$FTP_PASS_KEY:$FTP_PASS" "$FTP_PATH_KEY:$FTP_REMOTE_PATH"; do
  key="${pair%%:*}"
  val="${pair#*:}"
  if [ -z "$val" ]; then
    echo "FEHLER: $key fehlt in .env.local." >&2
    exit 1
  fi
done

BUILD_DIR="$ROOT/app/build"
SNAPSHOT_DIR="$ROOT/snapshot/output"

echo "Ziehe Snapshot von Relays …"
(cd "$ROOT/snapshot" && deno task snapshot) || {
  echo "FEHLER: Snapshot fehlgeschlagen. 'cd snapshot && deno task snapshot' manuell ausführen zum Debuggen." >&2
  exit 1
}

if [ ! -f "$SNAPSHOT_DIR/index.json" ]; then
  echo "FEHLER: $SNAPSHOT_DIR/index.json fehlt nach snapshot." >&2
  exit 1
fi

echo "Baue SvelteKit …"
(cd "$ROOT/app" && npm run build >/dev/null 2>&1) || {
  echo "FEHLER: Build fehlgeschlagen. 'cd app && npm run build' manuell ausführen zum Debuggen." >&2
  exit 1
}

if [ ! -d "$BUILD_DIR" ]; then
  echo "FEHLER: app/build nicht vorhanden nach build." >&2
  exit 1
fi

# __SITE_URL__-Platzhalter in allen HTML-Dateien durch die ziel-spezifische
# SITE_URL ersetzen (für og:url / canonical). Nicht im quellcode hart
# setzen, damit ein builder einmal baut und mehrere domains damit bedienen
# kann.
echo "Patche __SITE_URL__ → $SITE_URL in HTML-Dateien …"
find "$BUILD_DIR" -type f -name "*.html" -print0 | while IFS= read -r -d '' html_file; do
  # sed -i '' für macOS-kompatibilität (bsd sed braucht leeres backup-arg)
  sed -i '' "s|__SITE_URL__|$SITE_URL|g" "$html_file"
done

# __HTML_LANG__-Platzhalter pro detail-HTML aus dem snapshot-JSON ableiten:
# /<slug>/index.html → snapshot/output/posts/<slug>.json → .lang
# Alle anderen HTMLs (index, archiv/, impressum/, tag/) bekommen den
# default 'de' — die SPA setzt activeLocale clientseitig nach.
echo "Patche __HTML_LANG__ pro HTML aus snapshot/output …"
find "$BUILD_DIR" -type f -name "index.html" -print0 | while IFS= read -r -d '' html_file; do
  rel="${html_file#$BUILD_DIR/}"
  slug="${rel%/index.html}"
  lang_file="$SNAPSHOT_DIR/posts/${slug}.json"
  if [ -f "$lang_file" ]; then
    lang=$(grep -o '"lang": *"[a-z][a-z]"' "$lang_file" | head -1 | sed 's/.*"\([a-z][a-z]\)".*/\1/')
  else
    lang="de"
  fi
  sed -i '' "s|__HTML_LANG__|${lang:-de}|g" "$html_file"
done

echo "Ziel: $TARGET ($PUBLIC_URL)"
echo "Lade Build von $BUILD_DIR nach ftp://$FTP_HOST$FTP_REMOTE_PATH"

# pro Datei ein curl-Upload (zuverlässig auf macOS ohne lftp)
find "$BUILD_DIR" -type f -print0 | while IFS= read -r -d '' local_file; do
  rel="${local_file#$BUILD_DIR/}"
  remote="ftp://$FTP_HOST${FTP_REMOTE_PATH%/}/$rel"
  echo "  → $rel"
  # --tls-max 1.2: All-Inkl/Kasserver FTPS schließt bei TLS 1.3 die Data-
  # Connection mit "426 Transfer aborted" — mit 1.2 läuft es sauber durch.
  curl -sSf --ssl-reqd --tls-max 1.2 --ftp-create-dirs \
    --retry 3 --retry-delay 2 --retry-all-errors \
    --connect-timeout 15 \
    --user "$FTP_USER:$FTP_PASS" \
    -T "$local_file" "$remote"
done

echo "Upload fertig. Live-Check:"
curl -sIL "$PUBLIC_URL" | head -5
