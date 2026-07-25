#!/usr/bin/env bash
# ============================================================================
# Banglarfish one-shot VPS setup (Ubuntu 22.04/24.04, Hostinger KVM 1+).
# Run as root or with sudo:  sudo bash deploy/setup.sh
# Idempotent-ish: safe to re-run. Reads DB_PASSWORD/DOMAIN from the environment
# or falls back to the defaults below — edit these before running.
# ============================================================================
set -euo pipefail

APP_DIR="/var/www/banglarfish"
APP_USER="banglarfish"
DB_NAME="banglarfish"
DB_USER="banglarfish"
DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -hex 16)}"
DOMAIN="${DOMAIN:-banglarfish.com}"
NODE_MAJOR="20"

echo ">> Installing system packages (node ${NODE_MAJOR}, postgres, nginx, certbot)…"
apt-get update -y
apt-get install -y ca-certificates curl gnupg postgresql nginx certbot python3-certbot-nginx openssl git
if ! command -v node >/dev/null || [ "$(node -v | cut -c2- | cut -d. -f1)" -lt "$NODE_MAJOR" ]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi

echo ">> Creating app user + directories…"
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$APP_DIR" "$APP_DIR/uploads"

echo ">> Provisioning PostgreSQL database + role…"
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

echo ">> Syncing app files to ${APP_DIR}… (run this script from the project root)"
rsync -a --delete --exclude node_modules --exclude .git --exclude .output ./ "$APP_DIR/"

echo ">> Writing ${APP_DIR}/.env (if missing)…"
if [ ! -f "$APP_DIR/.env" ]; then
  sed \
    -e "s#postgres://banglarfish:CHANGE_ME@127.0.0.1:5432/banglarfish#postgres://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5432/${DB_NAME}#" \
    -e "s#https://banglarfish.com#https://${DOMAIN}#" \
    "$APP_DIR/.env.example" > "$APP_DIR/.env"
  echo "   -> Created .env. Fill in BOOMCAST_* and set SMS_DEV_MODE=false when ready."
fi

echo ">> Installing dependencies + building…"
cd "$APP_DIR"
npm ci
npm run build

echo ">> Running database migrations + seed…"
set -a; . "$APP_DIR/.env"; set +a
npm run db:migrate
npm run db:seed

echo ">> Installing systemd service…"
cp deploy/banglarfish.service /etc/systemd/system/banglarfish.service
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"
systemctl daemon-reload
systemctl enable --now banglarfish

echo ">> Configuring nginx…"
sed "s/banglarfish.com/${DOMAIN}/g" deploy/nginx.conf > /etc/nginx/sites-available/banglarfish
ln -sf /etc/nginx/sites-available/banglarfish /etc/nginx/sites-enabled/banglarfish
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo ""
echo "============================================================"
echo " Banglarfish is live on http://${DOMAIN}"
echo " DB password (save this): ${DB_PASSWORD}"
echo " Add TLS:  sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
echo " Admin login was printed by the seed step above."
echo "============================================================"
