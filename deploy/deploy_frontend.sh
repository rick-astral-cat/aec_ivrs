#!/usr/bin/env bash
#
# Build the AEC IVRS frontend from the git checkout and publish it to the
# directory nginx serves in production.
#
# It does NOT touch git: run `git pull` / `git reset --hard` yourself first.
# Steps:
#   1. Show what is about to be deployed and ask for confirmation.
#   2. Install dependencies (npm ci) and build (npm run build) in the checkout.
#   3. Back up the currently published files into frontend_backups/ (timestamped;
#      only the most recent ones are kept).
#   4. Publish the new build with rsync --delete.
#   5. Verify index.html is in place and print how to roll back.
#
# No service restart is needed: nginx serves the static files directly.
# The production build calls the API on the same origin (/api), so VITE_API_URL
# must NOT be set for production builds.
#
# Usage:
#   bash deploy/deploy_frontend.sh            # interactive
#   bash deploy/deploy_frontend.sh -y         # skip the confirmation prompt
#   bash deploy/deploy_frontend.sh --dry-run  # build, then only show what would change
#
# Paths can be overridden with environment variables, e.g.:
#   DEST_DIR=/var/www/html/aec_ivrs/frontend/dist bash deploy/deploy_frontend.sh

set -Eeuo pipefail

# --- Configuration ----------------------------------------------------------
REPO_DIR="${REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
SRC_DIR="${SRC_DIR:-$REPO_DIR/frontend}"
APP_DIR="${APP_DIR:-/var/www/html/aec_ivrs}"
DEST_DIR="${DEST_DIR:-$APP_DIR/frontend/dist}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/frontend_backups}"
KEEP_BACKUPS="${KEEP_BACKUPS:-5}"

# Same rsync flags as the backend deploy: production directories may be owned
# by www-data, so directory times and permissions are not synced.
RSYNC_OPTS=(-rlt --omit-dir-times --no-perms --itemize-changes)

# --- Arguments --------------------------------------------------------------
ASSUME_YES=false
DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    -y|--yes) ASSUME_YES=true ;;
    --dry-run) DRY_RUN=true ;;
    -h|--help) sed -n '2,26p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

# --- Helpers ----------------------------------------------------------------
info() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m OK\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m !!\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31mERR\033[0m %s\n' "$*" >&2; exit 1; }

BACKUP_PATH=""
PUBLISH_STARTED=false

on_error() {
  local line="$1"
  printf '\n\033[1;31mDeploy failed (line %s).\033[0m\n' "$line" >&2
  if [[ "$PUBLISH_STARTED" == true && -n "$BACKUP_PATH" ]]; then
    echo "The published files may be incomplete. Restore the previous version with:" >&2
    echo "  rsync ${RSYNC_OPTS[*]} --delete \"$BACKUP_PATH/\" \"$DEST_DIR/\"" >&2
  else
    echo "Production files were not modified." >&2
  fi
  echo "Fix the error and run the script again; it is safe to re-run." >&2
}
trap 'on_error $LINENO' ERR

# --- Pre-flight checks ------------------------------------------------------
command -v rsync >/dev/null || die "rsync is not installed (sudo apt install rsync)."
command -v npm >/dev/null || die "npm is not installed on this server (install Node.js LTS)."
[[ -f "$SRC_DIR/package.json" ]] || die "Source does not look like the frontend: $SRC_DIR"
[[ -d "$(dirname "$DEST_DIR")" ]] || die "Parent of the target directory not found: $(dirname "$DEST_DIR")"
if [[ -n "${VITE_API_URL:-}" ]]; then
  warn "VITE_API_URL is set ($VITE_API_URL); the build will call that URL instead of /api."
fi

# Help confirm the target is really what nginx serves.
NGINX_ROOTS="$(grep -rhoE '^\s*root\s+[^;]+' /etc/nginx/sites-enabled 2>/dev/null | awk '{print $2}' | sort -u || true)"
if [[ -n "$NGINX_ROOTS" ]] && ! grep -qxF "${DEST_DIR%/}" <<<"$(sed 's:/*$::' <<<"$NGINX_ROOTS")"; then
  warn "Target is not an nginx root. nginx roots found:"
  sed 's/^/      /' <<<"$NGINX_ROOTS"
  warn "If needed, re-run with DEST_DIR=<nginx root>."
fi

BRANCH="$(git -C "$REPO_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
COMMIT="$(git -C "$REPO_DIR" log -1 --format='%h %s' 2>/dev/null || echo '?')"

info "Source : $SRC_DIR"
info "Target : $DEST_DIR"
info "Branch : $BRANCH"
info "Commit : $COMMIT"
info "Node   : $(node --version 2>/dev/null || echo '?') / npm $(npm --version)"
if [[ -n "$(git -C "$REPO_DIR" status --porcelain -- frontend 2>/dev/null)" ]]; then
  warn "The source frontend has uncommitted changes; they will be deployed too."
fi

if [[ "$DRY_RUN" != true && "$ASSUME_YES" != true ]]; then
  read -r -p "Build and publish this frontend to production? [y/N] " answer
  [[ "$answer" =~ ^[yYsS]$ ]] || { echo "Cancelled."; exit 0; }
fi

# --- 1. Build ---------------------------------------------------------------
info "Installing dependencies (npm ci)"
(cd "$SRC_DIR" && npm ci --no-audit --no-fund --loglevel=error)
ok "Dependencies installed"

info "Building (npm run build)"
(cd "$SRC_DIR" && npm run build)
[[ -f "$SRC_DIR/dist/index.html" ]] || die "Build finished but dist/index.html is missing."
ok "Build ready in $SRC_DIR/dist"

# --- Dry run ----------------------------------------------------------------
if [[ "$DRY_RUN" == true ]]; then
  info "Dry run: files that would change in $DEST_DIR (nothing is modified):"
  rsync "${RSYNC_OPTS[@]}" --delete --dry-run "$SRC_DIR/dist/" "$DEST_DIR/"
  exit 0
fi

# --- 2. Back up the published version ---------------------------------------
if [[ -d "$DEST_DIR" && -n "$(ls -A "$DEST_DIR" 2>/dev/null)" ]]; then
  mkdir -p "$BACKUP_DIR"
  BACKUP_PATH="$BACKUP_DIR/dist_$(date +%d_%m_%Y_%H%M%S)"
  cp -a "$DEST_DIR" "$BACKUP_PATH"
  ok "Previous version backed up to $BACKUP_PATH"

  # Keep only the most recent backups.
  mapfile -t old_backups < <(ls -1dt "$BACKUP_DIR"/dist_* 2>/dev/null | tail -n +"$((KEEP_BACKUPS + 1))")
  if (( ${#old_backups[@]} > 0 )); then
    rm -rf -- "${old_backups[@]}"
    ok "Removed ${#old_backups[@]} old backup(s); keeping the last $KEEP_BACKUPS"
  fi
else
  warn "Nothing published yet at $DEST_DIR (no backup needed)."
  mkdir -p "$DEST_DIR"
fi

# --- 3. Publish -------------------------------------------------------------
info "Publishing build"
PUBLISH_STARTED=true
rsync "${RSYNC_OPTS[@]}" --delete "$SRC_DIR/dist/" "$DEST_DIR/"
[[ -f "$DEST_DIR/index.html" ]] || die "index.html is missing in $DEST_DIR after publishing."
ok "Build published"

echo
ok "Frontend deployed: $BRANCH @ $COMMIT"
echo "    Reload the browser with Ctrl+F5 to skip the cached index.html."
if [[ -n "$BACKUP_PATH" ]]; then
  echo "    Roll back: rsync ${RSYNC_OPTS[*]} --delete \"$BACKUP_PATH/\" \"$DEST_DIR/\""
fi
