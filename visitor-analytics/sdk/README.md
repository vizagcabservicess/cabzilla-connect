# Visitor Analytics SDK (Vizag Taxi Hub)

Lightweight, production-ready JavaScript tracker that builds to a single IIFE file (`tracker.js`). Drop-in install, automatic page/session tracking, optional DOM session recording, and a live-chat bridge.

## One-line install

```html
<script>
  window.VTH_ANALYTICS = {
    siteKey: 'YOUR_PUBLIC_SITE_KEY',
    apiBase: 'https://vizagup.com',
    wsUrl: 'wss://vizagup.com/ws',
    recording: true,
    requireConsent: true,
    maskSelectors: ['.mask-me', '[data-va-mask]'],
  };
</script>
<script src="/tracker.js"></script>
```

The script **auto-initializes** on load. No extra `init()` call is required when `window.VTH_ANALYTICS.siteKey` is set before the script tag.

## Build

From this directory:

```bash
cd visitor-analytics/sdk
npm install
npm run build
```

Vite builds an IIFE named `VTHTracker` to:

| Output | Path |
|--------|------|
| SDK dist | `visitor-analytics/sdk/dist/tracker.js` |
| Main app public (auto-copied) | `public/tracker.js` |

The Vite `closeBundle` hook copies `dist/tracker.js` → repo-root `public/tracker.js` so the main Cabzilla / Vizag Taxi Hub app can serve it as `/tracker.js`.

You can also build via the parent package:

```bash
cd visitor-analytics
npm run build:sdk
```

**Size target:** keep the minified bundle under **~50KB gzip**. Do not bundle `pako`; load it separately if you want gzip-compressed recording chunks:

```html
<script src="https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js"></script>
<script src="/tracker.js"></script>
```

If `window.pako` is missing, recording chunks are sent as raw JSON.

## Config reference

| Option | Default | Description |
|--------|---------|-------------|
| `siteKey` | _(required)_ | Public site key (`X-Site-Key`) |
| `apiBase` | `https://vizagup.com` | REST base (no trailing slash) |
| `wsUrl` | `wss://vizagup.com/ws` | Optional live WebSocket |
| `recording` | `true` | DOM session recorder |
| `requireConsent` | `false` | Wait for consent before tracking |
| `maskSelectors` | `.mask-me`, `[data-va-mask]` | CSS selectors to mask in events/recording |
| `batchIntervalMs` | `2000` | Event flush interval |
| `batchMaxEvents` | `20` | Flush when queue reaches this size |
| `mouseThrottleMs` | `200` | Mouse move throttle |
| `scrollThrottleMs` | `250` | Scroll throttle |
| `debug` | `false` | Console logging |

### Consent

When `requireConsent: true`, tracking starts only after:

- `window.VTH_CONSENT === true` (or `{ analytics: true }`), or
- `localStorage.vth_va_consent` is `granted` / `true` / `1`, or
- `<html data-va-consent="granted">`, or
- Cookiebot accept / `document` event `vth:consent`

Grant from your banner:

```js
localStorage.setItem('vth_va_consent', 'granted');
document.dispatchEvent(new Event('vth:consent'));
```

## What is collected on init

| Field | Client / Server |
|-------|-----------------|
| New / Returning | Client (`localStorage` + cookie) + server confirm |
| Session ID | Client (30 min idle refresh) |
| Visitor key | Persistent `localStorage` / cookie |
| IP | Server-side only |
| Country / City | Server (edge headers) |
| Browser, OS, Device | Client UA + screen |
| Screen | `screen.width/height` |
| Language | `navigator.language` |
| Timezone | `Intl` time zone |
| Referrer | `document.referrer` |
| UTM | Landing URL query (`utm_*`) |
| Landing page | First path+search of session |

## Event types

Automatically tracked:

`page_view`, `mouse_move` (throttled), `scroll`, `click`, `double_click`, `right_click`, `form_focus`, `form_blur`, `form_submit`, `phone_click`, `whatsapp_click`, `email_click`, `booking_started`, `booking_completed`, `razorpay_payment`, `popup_opened`, `popup_closed`, plus `visibility_change`, `resize`, `tab_switch`.

### Markup helpers

```html
<a href="tel:+919999999999">Call</a>           <!-- phone_click -->
<a href="https://wa.me/919999999999">WhatsApp</a>
<a href="mailto:hello@vizagtaxihub.com">Email</a>

<button data-va-event="booking_started">Get quote</button>
<button data-va-event="razorpay_payment" class="razorpay-payment-button">Pay</button>
<button data-va-track="custom" data-va-name="cta_hero">Book now</button>

<div data-va-ignore>…</div>
<input data-va-mask />
```

Dispatch manually:

```js
document.dispatchEvent(new CustomEvent('vth:track', {
  detail: { type: 'booking_completed', meta: { bookingId: 'ABC' } },
}));
```

## Public API (`window.visitorAnalytics`)

```js
visitorAnalytics.trackInteraction('hero_cta', { placement: 'home' });
visitorAnalytics.trackPageView('/outstation');
visitorAnalytics.trackSearch('vizag to araku');
visitorAnalytics.trackClick('#book-btn');
visitorAnalytics.trackScroll(75);
visitorAnalytics.trackFormSubmission('booking');
visitorAnalytics.trackConversion('booking_completed', { amount: 2500 });
visitorAnalytics.flush();
visitorAnalytics.getIdentity();
```

Also available: `window.VTHTracker.init(config)` for re-init.

### Chat bridge

```js
visitorAnalytics.chat.openChat();
visitorAnalytics.chat.onVisitorMessage((msg) => { /* … */ });
visitorAnalytics.chat.sendOperatorMessage({ text: 'Hello!', from: 'operator' });
visitorAnalytics.chat.setTyping(true);
visitorAnalytics.chat.getVisitorContext();

// From widget UI:
document.dispatchEvent(new CustomEvent('vth:chat:outbound', {
  detail: { text: 'I need a cab to airport' },
}));
```

Listen for operator replies: `document.addEventListener('vth:chat:inbound', …)`.

## REST endpoints (SDK → API)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/v1/collect/identify` | Create/update visitor + session |
| `POST` | `/v1/collect/events` | Batch analytics events |
| `POST` | `/v1/collect/recording` | Session recording chunk |

Headers: `Content-Type: application/json`, `X-Site-Key: <siteKey>`.

Events flush every **2s** or **20 events**, on `visibilitychange` / `pagehide` via `sendBeacon` when possible. WebSocket is used for live event fan-out when connected.

## Privacy

- Never records `input[type=password]`
- Skips autocomplete `cc-*`, `current-password`, `new-password`, `one-time-code`
- Skips name/id patterns: password, otp, cvv, card, etc.
- Honors `[data-va-ignore]` and mask selectors
- Keystrokes: only non-character keys (Enter, Tab, …) — no typed secrets
- Recording HTML is sanitized (scripts stripped; sensitive inputs masked)

## Performance notes

- Passive listeners for scroll / move / click
- Throttled mouse & scroll
- `requestIdleCallback` for non-urgent flushes
- Lean custom recorder (not full rrweb) to stay under the gzip budget
