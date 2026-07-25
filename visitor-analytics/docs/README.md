# Visitor Analytics & Live Chat — Vizag Taxi Hub

First-party analytics (Clarity/Hotjar-style) and live chat (Intercom-style) for Vizag Taxi Hub.

## Architecture

```
[tracker.js SDK] ──REST + WebSocket──► [visitor-analytics Node service :4090]
[LiveChatWidget]                              │
[Admin /visitor-analytics]                    ├── MySQL (va_* tables)
                                              ├── S3-compatible storage (recordings, chat files)
                                              └── OpenAI (offline AI chat)
```

| Layer | Location |
|-------|----------|
| SQL schema | `sql/visitor_analytics_schema.sql` |
| Analytics API + WS | `visitor-analytics/` |
| Tracker SDK | `visitor-analytics/sdk/` → builds to `public/tracker.js` |
| Admin UI | `src/pages/admin/visitor-analytics/` |
| Chat widget | `src/components/visitor-analytics/chat/LiveChatWidget.tsx` |
| Frontend API client | `src/services/api/visitorAnalyticsAPI.ts` |

## Quick start (local)

### 1. Database

```bash
mysql -u USER -p DATABASE < sql/visitor_analytics_schema.sql
```

### 2. Analytics server

```bash
cd visitor-analytics
cp .env.example .env
# Edit DB_*, JWT_SECRET, S3_*, OPENAI_API_KEY
npm install
npm run dev
```

Server listens on `http://127.0.0.1:4090`. Health: `GET /health`.

### 3. Tracker SDK (already built to public/)

```bash
npm run build:tracker
# or: cd visitor-analytics/sdk && npm install && npm run build
```

Output: `public/tracker.js` (~10KB gzip).

### 4. Frontend

```bash
# Terminal A — analytics API
npm run dev:analytics

# Terminal B — Vite app
npm run dev
# or both: npm run dev:with-analytics
```

Optional env in `.env` / `.env.local`:

```
VITE_VA_API_BASE=http://localhost:4090
VITE_VA_WS_URL=ws://localhost:4090/ws
VITE_VA_SITE_KEY=vth_pk_live_replace_me
VITE_VA_SITE_ID=00000000-0000-4000-8000-000000000001
```

Vite proxies `/api/va` → analytics REST and `/va-ws` → WebSocket.

## One-line install (production site)

```html
<script>
  window.VTH_ANALYTICS = {
    siteKey: 'YOUR_PUBLIC_KEY',
    apiBase: 'https://vizagup.com',
    wsUrl: 'wss://vizagup.com/ws',
    recording: true,
    requireConsent: true,
    maskSelectors: ['.mask-me', '[data-va-mask]']
  };
</script>
<script src="/tracker.js" defer></script>
```

The main app `index.html` already includes this (with localhost/prod auto-detection).

## REST APIs

Base: `http://localhost:4090`

### Public (site key header `X-Site-Key`)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/track/identify` | Create/update visitor + session |
| POST | `/api/track/events` | Batched events |
| POST | `/api/track/recording` | Compressed recording chunk |
| POST | `/api/track/booking` | Booking analytics event |
| POST | `/api/chat/visitor/*` | Visitor chat REST |
| POST | `/api/chat/offline` | Offline form |

### Auth (JWT)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/login` | Operator login |
| POST | `/api/auth/exchange` | Exchange main-app admin JWT |

### Admin (Bearer JWT)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/live-visitors` | Realtime online visitors |
| GET | `/api/admin/sessions` | Session list |
| GET | `/api/admin/sessions/:id` | Session detail |
| GET | `/api/admin/sessions/:id/recording` | Replay manifest (presigned S3) |
| GET | `/api/admin/visitors` | Visitor list |
| GET | `/api/admin/heatmaps` | Heatmap buckets |
| GET | `/api/admin/funnels` | Funnel list |
| GET | `/api/admin/funnels/:id/stats` | Conversion / drop-off / avg time |
| GET | `/api/admin/reports` | Daily / weekly / monthly |
| GET | `/api/admin/booking-analytics` | Vehicle category funnel |
| GET | `/api/admin/notifications` | Admin notifications |
| * | `/api/chat/operator/*` | Inbox, assign, canned replies, export |

## WebSocket API

Connect: `ws://localhost:4090/ws?role=visitor|operator|dashboard&siteId=...&token=...`

Envelope:

```json
{ "type": "chat.message", "payload": { }, "requestId": "optional" }
```

Common types: `visitor.activity`, `notification`, `chat.message`, `chat.typing`, `chat.seen`, `chat.assigned`.

## Features

### Visitor tracking
New/returning, session id, IP, geo, browser, device, screen, OS, language, timezone, referrer, UTM, landing page.

### Events
Page view, mouse move, scroll, click, double/right click, form focus/blur/submit, phone/WhatsApp/email click, booking started/completed, Razorpay payment, popup open/close.

### Session recording
Mouse, scroll, clicks, keystrokes (no passwords), DOM mutations, resize, tab/visibility. Compressed gzip chunks in S3. Replay: play / pause / 2x / 4x / timeline / jump to event.

### Heatmaps
Click, scroll, move — filter by date, page, campaign, device (desktop/tablet/mobile).

### Live dashboard
Visitors online, current page, time on page, mouse position, city, source, device, browser, new/returning.

### Funnels
Landing → Vehicle → Booking form → Payment → Confirmation with conversion, drop-off, average time.

### Booking analytics
Airport / Local / Outstation / Tempo / Araku / Vizag / Simhachalam / Borra / Lambasingi × quote, form, phone, WhatsApp, payment, completed.

### Live chat
Floating bubble, unread badge, typing, seen, visitor info, history, file/image/voice, emoji, canned replies, notes, tags, departments, assignment, offline form, sound + desktop notifications.

### AI assistant
When operators are offline, OpenAI answers pricing/availability and collects name, phone, pickup, drop, date, vehicle — then transfers when an operator is online.

### Privacy
Never records passwords, card, OTP, CVV; mask selectors; cookie consent; configurable retention (`va_sites.retention_days`). Run `npm run retention` in `visitor-analytics`.

## Admin UI

- Route: `/admin/visitor-analytics`
- Tabs: Live · Sessions · Heatmaps · Funnels · Bookings · Reports · Chat · Settings
- Sidebar: **Visitor Analytics** / **Live Chat**
- Privileges: `visitor_analytics`, `live_chat`

## Production deployment

1. Run SQL migration on production MySQL.
2. Deploy `visitor-analytics` Node service (PM2/systemd/Docker) with production `.env` (real JWT secret, S3, OpenAI).
3. Put TLS reverse proxy in front (e.g. `vizagup.com` → Node `PORT`, WebSocket upgrade enabled).
4. Build tracker: `npm run build:tracker` and deploy `public/tracker.js` with the SPA.
5. Set `VITE_VA_*` env vars for the SPA build, or rely on `index.html` runtime config.
6. Align `va_sites.public_key` with `SITE_PUBLIC_KEY` / `VTH_ANALYTICS.siteKey`.
7. Schedule retention: cron `cd visitor-analytics && npm run retention` daily.

### S3-compatible storage

Works with AWS S3, MinIO, Cloudflare R2, DigitalOcean Spaces. Set `S3_ENDPOINT`, keys, bucket, and `S3_FORCE_PATH_STYLE=true` for MinIO.

### JWT

Operator APIs use `JWT_SECRET`. Prefer exchanging the existing admin `auth_token` via `POST /api/auth/exchange` so operators reuse main-app login.

## Performance

- Tracker target: **&lt; 50KB gzip** (current build ~10KB gzip).
- Events batched (interval + size threshold).
- Recording compressed (gzip) and uploaded in chunks.
- Replay player is lazy-loaded in the admin UI.
- Passive listeners + idle callbacks in the SDK.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev:analytics` | Start analytics API |
| `npm run dev:with-analytics` | Vite + analytics together |
| `npm run build:tracker` | Build `public/tracker.js` |
| `npm run build:analytics` | Compile analytics server |
