/**
 * POST /api/track-search — sends a WhatsApp text alert to the business owner (Meta Cloud API).
 * Run: node server/track-search-server.mjs
 * Env: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_PHONE_NUMBER_ID_TRIP,
 *      OWNER_WHATSAPP_NUMBER or WHATSAPP_ADMIN_PHONE (digits only, optional leading 91)
 */

import http from 'node:http';

const PORT = Number(process.env.TRACK_SEARCH_PORT || 3001);

function getPhoneNumberId() {
  return (
    process.env.WHATSAPP_PHONE_NUMBER_ID ||
    process.env.WHATSAPP_PHONE_NUMBER_ID_TRIP ||
    ''
  ).trim();
}

function getOwnerDigits() {
  const raw = (process.env.OWNER_WHATSAPP_NUMBER || process.env.WHATSAPP_ADMIN_PHONE || '').replace(/\D/g, '');
  return raw;
}

function formatSearchedAtIst() {
  return new Date()
    .toLocaleString('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace(/,/g, '')
    .trim() + ' IST';
}

function formatResultsShown(body) {
  const fares = Array.isArray(body.vehicleFares) ? body.vehicleFares : null;
  if (fares && fares.length) {
    return fares
      .filter((v) => v && (v.name || v.fareText))
      .map((v) => `${v.name || 'Vehicle'}: ${v.fareText || '—'}`)
      .join('\n');
  }
  const cars = Array.isArray(body.carsShown) ? body.carsShown.filter(Boolean).join(', ') : '';
  return cars || '—';
}

function formatDurationHuman(totalMinutes) {
  const m = Math.round(Number(totalMinutes));
  if (!Number.isFinite(m) || m <= 0) return '';
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} min`;
  if (r === 0) return `${h} hr`;
  return `${h} hr ${r} min`;
}

function formatRouteSummary(body) {
  const rawKm = body.distanceKmOneWay;
  const owKm = typeof rawKm === 'number' ? rawKm : rawKm != null ? Number(rawKm) : NaN;
  const rawMin = body.durationMinutesOneWay;
  const owMin = typeof rawMin === 'number' ? rawMin : rawMin != null ? Number(rawMin) : NaN;
  const kmOk = Number.isFinite(owKm) && owKm > 0;
  const durOk = Number.isFinite(owMin) && owMin > 0;
  if (!kmOk && !durOk) return '';

  const mode = String(body.tripModeTrack || '').toLowerCase();
  const kmPart = kmOk ? `~${Math.round(owKm)} km` : '';
  const durOne = durOk ? formatDurationHuman(owMin) : '';
  const durHalf = durOne ? `~${durOne}` : '';

  /** e.g. *One-way:* Approx. route: ~621 km · ~10 hr 30 min */
  const oneWayLine = (detail) =>
    detail ? `📏 *One-way:* Approx. route: ${detail}\n` : '';

  if (mode === 'round-trip') {
    const owDetail = [kmPart, durHalf].filter(Boolean).join(' · ');
    const rtKmPart = kmOk ? `~${Math.round(owKm * 2)} km` : '';
    const rtDurPart = durOk ? `~${formatDurationHuman(Math.round(owMin * 2))}` : '';
    const rtDetail = [rtKmPart, rtDurPart].filter(Boolean).join(' · ');
    return (
      oneWayLine(owDetail) +
      (rtDetail ? `📏 *Round-trip (approx):* Approx. route: ${rtDetail}\n` : '')
    );
  }

  const parts = [kmPart, durHalf].filter(Boolean);
  return oneWayLine(parts.join(' · '));
}

function buildOwnerMessage(body) {
  const guest = body.guestPhone || '';
  const pickup = body.pickup || '';
  const drop = body.drop || '';
  const trip = body.tripType || '';
  const departure = body.departure || '';
  const routeSummary = formatRouteSummary(body);
  const resultsBlock = formatResultsShown(body);
  const searchedAt = formatSearchedAtIst();

  return (
    `🚖 *New Cab Search Alert!*\n\n` +
    `👤 *Guest Number:* ${guest}\n` +
    `📍 *Pickup:* ${pickup}\n` +
    `📍 *Drop:* ${drop}\n` +
    `🔄 *Trip Type:* ${trip}\n` +
    routeSummary +
    `📅 *Departure:* ${departure}\n` +
    `🚗 *Results:*\n${resultsBlock}\n` +
    `⏰ *Searched At:* ${searchedAt}`
  );
}

async function sendWhatsAppText({ toDigits, text }) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN || '';
  const phoneNumberId = getPhoneNumberId();
  if (!token || !phoneNumberId) {
    return { ok: false, error: 'WhatsApp is not configured (token or phone number id missing).' };
  }
  if (!toDigits || toDigits.length < 10) {
    return { ok: false, error: 'Owner WhatsApp number is not configured.' };
  }

  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: toDigits,
      type: 'text',
      text: { body: text },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: data?.error?.message || res.statusText || 'Graph API error', data };
  }
  return { ok: true, data };
}

function readJsonBody(req, limit = 32_768) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > limit) {
        reject(new Error('payload_too_large'));
        return;
      }
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS' && url.pathname === '/api/track-search') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    });
    res.end();
    return;
  }

  if (req.method !== 'POST' || url.pathname !== '/api/track-search') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  try {
    const body = await readJsonBody(req);
    const guestPhoneRaw = typeof body.guestPhone === 'string' ? body.guestPhone.trim() : '';
    const guestDigits = guestPhoneRaw.replace(/\s/g, '').startsWith('+')
      ? guestPhoneRaw.replace(/\s/g, '').slice(1).replace(/\D/g, '')
      : '';
    const guestPhone =
      guestDigits.length >= 8 && guestDigits.length <= 15 ? `+${guestDigits}` : '';
    if (!guestPhone) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Invalid guestPhone' }));
      return;
    }

    const ownerDigits = getOwnerDigits();
    const text = buildOwnerMessage({ ...body, guestPhone });
    const result = await sendWhatsAppText({ toDigits: ownerDigits, text });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (!result.ok) {
      console.error('[track-search]', result.error, result.data || '');
      res.writeHead(502);
      res.end(JSON.stringify({ success: false, error: result.error }));
      return;
    }

    res.writeHead(200);
    res.end(JSON.stringify({ success: true }));
  } catch (e) {
    console.error('[track-search]', e);
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Bad request' }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`track-search API listening on http://127.0.0.1:${PORT}/api/track-search`);
});
