# Visitor Analytics — Deployment Guide

## Prerequisites

- Node.js 20+
- MySQL 8+
- S3-compatible bucket (AWS / R2 / MinIO / Spaces)
- OpenAI API key (optional; required for AI chat)
- Reverse proxy with WebSocket support (Nginx / Caddy / Cloudflare)

## 1. Database

```bash
mysql -u USER -p vizagtaxihub < sql/visitor_analytics_schema.sql
```

Update `va_sites.public_key` to a strong random key and use the same value in server + tracker config.

## 2. Environment

```bash
cd visitor-analytics
cp .env.example .env
```

Required production values:

- `JWT_SECRET` — long random string (share with token exchange strategy)
- `DB_*` — production MySQL
- `S3_*` — real bucket credentials
- `SITE_PUBLIC_KEY` / `DEFAULT_SITE_ID` — match seeded site row
- `OPENAI_API_KEY` — for offline AI
- `CORS_ORIGINS` — include `https://vizagtaxihub.com`, `https://www.vizagtaxihub.com`, and `https://vizagup.com`
- `IP_HASH_SALT` — unique salt for IP hashing

## 3. Install & run

```bash
npm install
npm run build
NODE_ENV=production node dist/server.js
```

PM2 example:

```bash
pm2 start dist/server.js --name vth-analytics
pm2 save
```

## 4. Nginx (example)

```nginx
server {
  server_name vizagup.com;

  location / {
    proxy_pass http://127.0.0.1:4090;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /ws {
    proxy_pass http://127.0.0.1:4090/ws;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400;
  }
}
```

Same-origin alternative: proxy `/api/va` and `/va-ws` from the main site to `:4090` (matches Vite dev proxies).

## 5. Frontend

```bash
npm run build:tracker
# ensure public/tracker.js is in the SPA deploy artifact
npm run build:prod
```

Set build-time env if not using runtime `window.VTH_ANALYTICS_*`:

```
VITE_VA_API_BASE=https://vizagup.com
VITE_VA_WS_URL=wss://vizagup.com/ws
VITE_VA_SITE_KEY=...
VITE_VA_SITE_ID=00000000-0000-4000-8000-000000000001
```

## 6. Retention cron

```cron
15 3 * * * cd /var/www/visitor-analytics && npm run retention >> /var/log/va-retention.log 2>&1
```

## 7. Smoke checks

1. `curl https://vizagup.com/health`
2. Open homepage → Network: identify + events batches succeed
3. Admin → Visitor Analytics → Live visitors appear
4. Open chat widget → message appears in Chat inbox
5. Complete a test booking → booking analytics increments
6. Open a recorded session → replay plays

## Privileges

Grant `visitor_analytics` and/or `live_chat` in User Privileges (or use super_admin).
