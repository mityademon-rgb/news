#!/usr/bin/env bash
set -euo pipefail

site_host="boom-kadr.72-56-65-161.nip.io"

apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq certbot python3-certbot-nginx

certbot --nginx \
  --domain "$site_host" \
  --non-interactive \
  --agree-tos \
  --register-unsafely-without-email \
  --redirect

nginx -t
systemctl reload nginx

status_code="$(curl -fsS -o /dev/null -w '%{http_code}' "https://$site_host/")"
test "$status_code" = "200"

echo "БУМ.КАДР доступен: https://$site_host — HTTP $status_code"
