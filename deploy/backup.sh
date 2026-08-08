#!/usr/bin/env bash
# Nightly backup: pg_dump + uploads, gzip, 30-day retention, optional offsite + age-encryption.
# Install as a cron job, e.g.:  0 3 * * *  /var/www/banglarfish/deploy/backup.sh >> /var/log/banglarfish-backup.log 2>&1
#
# Env (optional):
#   BACKUP_DIR        where to write backups          (default /var/backups/banglarfish)
#   UPLOAD_DIR        uploads dir to include          (default /var/www/banglarfish/public/uploads)
#   PG_CONTAINER      docker pg container name         (default banglarfish-pg)
#   PGUSER PGDATABASE db creds                         (default banglarfish / banglarfish)
#   RETENTION_DAYS    days to keep                     (default 30)
#   AGE_RECIPIENT     age public key -> encrypt dumps  (optional; requires `age`)
#   RCLONE_REMOTE     rclone remote:path -> offsite    (optional; requires `rclone`)
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/banglarfish}"
UPLOAD_DIR="${UPLOAD_DIR:-/var/www/banglarfish/public/uploads}"
PG_CONTAINER="${PG_CONTAINER:-banglarfish-pg}"
PGUSER="${PGUSER:-banglarfish}"
PGDATABASE="${PGDATABASE:-banglarfish}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
DUMP="$BACKUP_DIR/db-$STAMP.sql.gz"
MEDIA="$BACKUP_DIR/uploads-$STAMP.tar.gz"

echo "[backup] $STAMP starting"

# 1) Database — dump from the docker Postgres container, gzip immediately.
if docker ps --format '{{.Names}}' | grep -q "^${PG_CONTAINER}$"; then
  docker exec -i "$PG_CONTAINER" pg_dump -U "$PGUSER" -d "$PGDATABASE" | gzip > "$DUMP"
else
  # Fallback to a host-local pg_dump if not containerized.
  pg_dump -U "$PGUSER" -d "$PGDATABASE" | gzip > "$DUMP"
fi
echo "[backup] db -> $DUMP ($(du -h "$DUMP" | cut -f1))"

# 2) Uploaded media.
if [ -d "$UPLOAD_DIR" ]; then
  tar -czf "$MEDIA" -C "$(dirname "$UPLOAD_DIR")" "$(basename "$UPLOAD_DIR")"
  echo "[backup] media -> $MEDIA ($(du -h "$MEDIA" | cut -f1))"
fi

# 3) Optional encryption at rest (age).
if [ -n "${AGE_RECIPIENT:-}" ] && command -v age >/dev/null 2>&1; then
  for f in "$DUMP" "$MEDIA"; do
    [ -f "$f" ] && age -r "$AGE_RECIPIENT" -o "$f.age" "$f" && rm -f "$f"
  done
  echo "[backup] encrypted with age"
fi

# 4) Optional offsite copy (rclone -> S3/B2/etc).
if [ -n "${RCLONE_REMOTE:-}" ] && command -v rclone >/dev/null 2>&1; then
  rclone copy "$BACKUP_DIR" "$RCLONE_REMOTE" --include "*-$STAMP.*"
  echo "[backup] pushed offsite -> $RCLONE_REMOTE"
fi

# 5) Retention — prune local backups older than N days.
find "$BACKUP_DIR" -type f -mtime "+$RETENTION_DAYS" -name '*-*' -delete || true
echo "[backup] done; retention ${RETENTION_DAYS}d"

# Restore drill reminder (run manually / monthly):
#   gunzip -c db-YYYYMMDD-HHMMSS.sql.gz | docker exec -i banglarfish-pg psql -U banglarfish -d banglarfish_restore_test
