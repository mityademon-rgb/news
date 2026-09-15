#!/usr/bin/env bash
set -euo pipefail

update_url="https://raw.githubusercontent.com/mityademon-rgb/news/boom-kadr-deploy/.deploy/update.sh"

curl -4 -fsSL --connect-timeout 10 --max-time 30 "$update_url" -o /usr/local/sbin/boom-kadr-update
chmod 755 /usr/local/sbin/boom-kadr-update
/usr/local/sbin/boom-kadr-update

install -d /etc/nginx/sites-available /etc/nginx/sites-enabled /etc/nginx/sites-disabled

if [ -L /etc/nginx/sites-enabled/default ]; then
  mv /etc/nginx/sites-enabled/default /etc/nginx/sites-disabled/default.before-boom-kadr
fi

rm -f /etc/nginx/sites-enabled/boom-kadr /etc/nginx/conf.d/boom-kadr.conf

cat > /etc/nginx/sites-available/boom-kadr <<'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name 72.56.65.161 boom-kadr.72-56-65-161.nip.io _;

    root /var/www/boom-kadr;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(css|js|webp)$ {
        expires 7d;
        add_header Cache-Control "public";
    }
}
NGINX

ln -s /etc/nginx/sites-available/boom-kadr /etc/nginx/sites-enabled/boom-kadr.conf

cat > /etc/systemd/system/boom-kadr-update.service <<'UNIT'
[Unit]
Description=Update BUM.KADR website from GitHub
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/boom-kadr-update
UNIT

cat > /etc/systemd/system/boom-kadr-update.timer <<'UNIT'
[Unit]
Description=Check BUM.KADR website updates

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
Persistent=true

[Install]
WantedBy=timers.target
UNIT

nginx -t
systemctl reload nginx
systemctl daemon-reload
systemctl enable --now boom-kadr-update.timer

# The temporary GitHub Actions key is no longer needed: deployment is pull-based.
if [ -f /root/.ssh/authorized_keys ]; then
  sed -i '/boom-kadr-github-actions$/d' /root/.ssh/authorized_keys
fi

status_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1/index.html)"
test "$status_code" = "200"

echo "БУМ.КАДР установлен. HTTP $status_code"
