#!/usr/bin/env bash
#
# Deploy the AEC IVRS backend from the git checkout to the production directory.
#
# It does NOT touch git: run `git pull` / `git reset --hard` yourself first.
# Steps:
#   1. Show what is about to be deployed and ask for confirmation.
#   2. Stop the systemd service.
#   3. Back up the SQLite database into db_backups/ (timestamped).
#   4. Sync the backend code (rsync), preserving production-only files:
#      .env, .venv/, *.db and __pycache__/.
#   5. Install/upgrade Python dependencies in the production virtualenv.
#   6. Apply database migrations (fails fast before starting the service).
#   7. Start the service and verify it is running.
#
# Usage:
#   bash deploy/deploy_backend.sh            # interactive
#   bash deploy/deploy_backend.sh -y         # skip the confirmation prompt
#   bash deploy/deploy_backend.sh --dry-run  # only show what rsync would change
#
# Paths and service name can be overridden with environment variables, e.g.:
#   DEST_DIR=/srv/aec_ivrs/backend bash deploy/deploy_backend.sh

set -Eeuo pipefail

# --- Configuration ----------------------------------------------------------
REPO_DIR="${REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
SRC_DIR="${SRC_DIR:-$REPO_DIR/backend}"
APP_DIR="${APP_DIR:-/var/www/html/aec_ivrs}"
DEST_DIR="${DEST_DIR:-$APP_DIR/backend}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/db_backups}"
SERVICE="${SERVICE:-aec_ivrs.service}"
DB_FILE="${DB_FILE:-ivrs.db}"

# Never copied from the repo and never deleted in production.
RSYNC_EXCLUDES=(
  --exclude ".env"
  --exclude ".venv/"
  --exclude "*.db"
  --exclude "__pycache__/"
)

# --- Arguments --------------------------------------------------------------
ASSUME_YES=false
DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    -y|--yes) ASSUME_YES=true ;;
    --dry-run) DRY_RUN=true ;;
    -h|--help) sed -n '2,22p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

# --- Helpers ----------------------------------------------------------------
info() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m OK\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m !!\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31mERR\033[0m %s\n' "$*" >&2; exit 1; }

BACKUP_FILE=""
SERVICE_STOPPED=false

on_error() {
  local line="$1"
  printf '\n\033[1;31mDeploy failed (line %s).\033[0m\n' "$line" >&2
  if [[ "$SERVICE_STOPPED" == true ]]; then
    echo "The service '$SERVICE' is STOPPED." >&2
  fi
  if [[ -n "$BACKUP_FILE" ]]; then
    echo "Database backup: $BACKUP_FILE" >&2
    echo "To restore it:   cp \"$BACKUP_FILE\" \"$DEST_DIR/$DB_FILE\" && sudo systemctl start $SERVICE" >&2
  fi
}
trap 'on_error $LINENO' ERR

# --- Pre-flight checks ------------------------------------------------------
command -v rsync >/dev/null || die "rsync is not installed (sudo apt install rsync)."
[[ -f "$SRC_DIR/main.py" ]] || die "Source does not look like the backend: $SRC_DIR"
[[ -d "$DEST_DIR" ]] || die "Production directory not found: $DEST_DIR"
[[ -x "$DEST_DIR/.venv/bin/python" ]] || die "Production virtualenv not found: $DEST_DIR/.venv"
[[ -f "$DEST_DIR/.env" ]] || warn "No .env in $DEST_DIR (JWT_SECRET/APP_ENV may be missing)."

BRANCH="$(git -C "$REPO_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
COMMIT="$(git -C "$REPO_DIR" log -1 --format='%h %s' 2>/dev/null || echo '?')"

info "Source : $SRC_DIR"
info "Target : $DEST_DIR"
info "Branch : $BRANCH"
info "Commit : $COMMIT"
if [[ -n "$(git -C "$REPO_DIR" status --porcelain -- backend 2>/dev/null)" ]]; then
  warn "The source backend has uncommitted changes; they will be deployed too."
fi

# --- Dry run ----------------------------------------------------------------
if [[ "$DRY_RUN" == true ]]; then
  info "Dry run: files that would change (nothing is modified):"
  rsync -rltp --delete --itemize-changes --dry-run "${RSYNC_EXCLUDES[@]}" "$SRC_DIR/" "$DEST_DIR/"
  exit 0
fi

if [[ "$ASSUME_YES" != true ]]; then
  read -r -p "Deploy this backend to production? [y/N] " answer
  [[ "$answer" =~ ^[yYsS]$ ]] || { echo "Cancelled."; exit 0; }
fi

# --- 1. Stop service --------------------------------------------------------
info "Stopping $SERVICE"
sudo systemctl stop "$SERVICE"
SERVICE_STOPPED=true
ok "Service stopped"

# --- 2. Back up database ----------------------------------------------------
if [[ -f "$DEST_DIR/$DB_FILE" ]]; then
  mkdir -p "$BACKUP_DIR"
  BACKUP_FILE="$BACKUP_DIR/$(date +%d_%m_%Y_%H%M%S).db"
  cp -p "$DEST_DIR/$DB_FILE" "$BACKUP_FILE"
  ok "Database backed up to $BACKUP_FILE"
else
  warn "No database found at $DEST_DIR/$DB_FILE (it will be created on startup)."
fi

# --- 3. Sync code -----------------------------------------------------------
info "Syncing code"
rsync -rltp --delete --itemize-changes "${RSYNC_EXCLUDES[@]}" "$SRC_DIR/" "$DEST_DIR/"
ok "Code synced"

# --- 4. Dependencies --------------------------------------------------------
info "Installing Python dependencies"
"$DEST_DIR/.venv/bin/python" -m pip install --quiet --disable-pip-version-check -r "$DEST_DIR/requirements.txt"
ok "Dependencies installed"

# --- 5. Migrations ----------------------------------------------------------
# Same routine the service runs on startup; running it here makes a failing
# migration visible before the service is started.
info "Applying database migrations"
(cd "$DEST_DIR" && .venv/bin/python -c "from bootstrap import run_migrations; run_migrations()")
ok "Migrations applied"

# --- 6. Start service -------------------------------------------------------
info "Starting $SERVICE"
sudo systemctl start "$SERVICE"
sleep 3
if sudo systemctl is-active --quiet "$SERVICE"; then
  SERVICE_STOPPED=false
  ok "Service is running"
else
  sudo journalctl -u "$SERVICE" -n 30 --no-pager || true
  [[ -n "$BACKUP_FILE" ]] && warn "To restore the database: cp \"$BACKUP_FILE\" \"$DEST_DIR/$DB_FILE\""
  die "Service failed to start (logs above)."
fi

echo
ok "Backend deployed: $BRANCH @ $COMMIT"
[[ -n "$BACKUP_FILE" ]] && echo "    Backup: $BACKUP_FILE"
echo "    Logs:   sudo journalctl -u $SERVICE -f"
