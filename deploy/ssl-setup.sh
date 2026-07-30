#!/bin/bash
# ══════════════════════════════════════════════════════════════════
# ВЫПУСК БЕСПЛАТНЫХ SSL-СЕРТИФИКАТОВ (Let's Encrypt)
#
# Запускать ОДИН РАЗ после первого старта платформы.
# Перед запуском убедитесь, что все домены уже указывают
# на IP этого сервера (DNS-записи типа A).
# ══════════════════════════════════════════════════════════════════
set -e
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "❌ Нет файла .env. Сначала: cp .env.example .env и заполните его."
  exit 1
fi
set -a; source .env; set +a

echo "▶ Домены: $DOMAIN, www.$DOMAIN, $PORTAL_DOMAIN, $ADMIN_DOMAIN, $API_DOMAIN"
echo ""

mkdir -p data/certbot/www data/certbot/conf

# ── временный конфиг nginx только для проверки домена ──
cat > deploy/nginx/olan.conf.template.bak.tmp <<'TMP'
server {
  listen 80;
  server_name _;
  location /.well-known/acme-challenge/ { root /var/www/certbot; }
  location / { return 200 'ok'; add_header Content-Type text/plain; }
}
TMP

mv deploy/nginx/olan.conf.template deploy/nginx/olan.conf.template.real
mv deploy/nginx/olan.conf.template.bak.tmp deploy/nginx/olan.conf.template

echo "▶ Запускаю временный nginx для проверки доменов…"
docker compose up -d nginx
sleep 5

echo "▶ Запрашиваю сертификат…"
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  --email "$CERTBOT_EMAIL" \
  --agree-tos --no-eff-email \
  -d "$DOMAIN" -d "www.$DOMAIN" \
  -d "$PORTAL_DOMAIN" -d "$ADMIN_DOMAIN" -d "$API_DOMAIN"

# ── возвращаем настоящий конфиг ──
mv deploy/nginx/olan.conf.template.real deploy/nginx/olan.conf.template

echo "▶ Перезапускаю платформу с HTTPS…"
docker compose up -d --force-recreate nginx

echo ""
echo "✅ Готово! Сертификаты выпущены и будут продлеваться автоматически."
echo ""
echo "   Главный сайт   https://$DOMAIN"
echo "   Кабинеты       https://$PORTAL_DOMAIN"
echo "   Админ-панель   https://$ADMIN_DOMAIN"
echo ""
