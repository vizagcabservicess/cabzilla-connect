import OpenAI from 'openai';
import { env } from '../config/env.js';
import { query, queryOne } from '../db/pool.js';
import { newId } from '../utils/helpers.js';
import {
  buildLiveRateCardBrief,
  extractCalendarDays,
  extractRoutePlaces,
  formatRouteQuoteReply,
  isLocalHourlyPackageIntent,
  isRestrictedAirportRouteQuote,
  isTourItineraryIntent,
  isTourPackageIntent,
  quoteLocalHourlyPackages,
  quoteOutstationRoute,
  quoteTourItinerary,
  quoteTourPackage,
  quoteTourPackageWithId,
  quoteVehicleRateCard,
} from '../services/fareEngine.js';
import {
  accommodationReply,
  arakuLocalStartReply,
  coachBusReply,
  extractFlexibleDate,
  extractPassengerCount,
  isAccommodationIntent,
  isAirportDropOrPickup,
  isArakuLocalStartIntent,
  isBareAirportToken,
  isBorraCavesAsk,
  isCoachOrLargeBusIntent,
  isHotelIncludedAsk,
  isHowManyDaysAsk,
  isMultiStopSightseeingIntent,
  isPerPersonIntent,
  isTourFollowupIntent,
  isTwoDayArakuIntent,
  isVehicleRateOnlyIntent,
  parseFlexibleDate,
  parseTripBlob,
  vehicleHintFromMessage,
} from './chatIntents.js';

export const VEHICLE_CATEGORIES = [
  'Sedan',
  'Ertiga',
  'Innova Crysta',
  'Luxury Sedan',
  'Tempo Traveller',
  'Urbania',
  'Airport Taxi',
  'Local Taxi',
  'Outstation',
  'Araku Tour',
  'Vizag Tour',
  'Simhachalam',
  'Borra Caves',
  'Lambasingi',
] as const;

export type VehicleCategory = (typeof VEHICLE_CATEGORIES)[number];

const PRICING_KNOWLEDGE = `
You are VTH AI, the Vizag Taxi Hub AI booking assistant for Visakhapatnam (Vizag), Andhra Pradesh, India.

Company phone: +91 99663 63662
Website: https://vizagtaxihub.com
Availability: 24×7.

CRITICAL — FARES:
- NEVER invent fares, never multiply km × per-km yourself for short outstation trips.
- The website booking engine uses LIVE database rate cards + distance tiers (same as CabList/useFare).
- AIRPORT / LOCAL TRANSFERS: one-way trips within ~35 km (city hops, airport pickup/drop, Pendurthi, Gajuwaka, Madhurawada, etc.) use Airport-tab distance SLABS — NOT outstation base+driver. Example sedan ~15–20 km ≈ tier2 (~₹1000), not ₹4000+.
- Airport slabs (live DB): ≤10 / ≤20 / ≤30 / ≤40 km flat tiers, then +extraKm after 40. No driver allowance on airport.
- If the visitor asks general "airport taxi fares" / airport rates WITHOUT pickup and drop locations, do NOT dump the full slab table. Ask for: pickup, drop, date, pickup time, and preferred vehicle — then quote the exact fare for that trip.
- TOUR PACKAGES (Araku, Borra, Lambasingi, Vanajangi, Vizag city sightseeing, temple tours) use FIXED package prices from the Tours API — NEVER quote outstation tier/km fares for those.
- TOUR ITINERARIES: NEVER invent timings or place lists. When asked for itinerary/schedule/places, only use the live website itinerary for the NAMED tour (Lambasingi ≠ Araku). If not provided, ask which tour and direct them to vizagtaxihub.com/tours.
- LOCAL hourly packages offered: 8hrs/80km and 10hrs/100km only. NEVER mention or quote 4hrs/40km (or 04hrs/40km) — that package is discontinued on the website.
- NEVER treat clock times (9pm, 12am, 07:00) as pickup/drop places.
- Hotel / dormitory is NOT included in cab or tour-package fares unless the live tour inclusions say so.
- Fares are for the whole vehicle, not per person. Arakku/Aruku = Araku Valley.
- If name/phone are already in lead state, never ask for them again — quote or collect the missing trip field.
- When the system message includes a ROUTE_QUOTE, TOUR_QUOTE, or LIVE RATE CARDS block, copy those numbers exactly.
- If no fare block is present and the visitor asks for a price, say you will calculate from the booking engine and ask pickup, drop, date, and vehicle — do not guess.
- One-way outstation between ~35km and the tier-4 max uses a FLAT tier price + driver allowance (not base×km). Longer trips use base + 2×extra km + driver.

Rules:
- Warm, concise, Indian English.
- After quoting, collect: name, 10-digit mobile, pickup, drop, date, pickup time, vehicle.
- Never confirm a booking as complete without pickup time.
- NEVER tell the visitor their booking is confirmed instantly. When all details are collected, share a website checkout link that opens the booking form (guest details / GST step) so they can complete the booking on the site.
- Human request → operator / +91 99663 63662.
- Payment: Razorpay or cash to driver.
- No competitors or politics.
`.trim();

export interface AiLeadState {
  id: string;
  customerName: string | null;
  phone: string | null;
  pickup: string | null;
  dropoff: string | null;
  travelDate: string | null;
  /** Pickup time, e.g. "10:30 AM" or "14:00". */
  travelTime: string | null;
  vehicle: string | null;
  status: 'collecting' | 'complete' | 'transferred';
  meta: Record<string, unknown> | null;
}

export interface AssistantTurnResult {
  reply: string;
  lead: AiLeadState;
  leadComplete: boolean;
  suggestTransfer: boolean;
}

function hasLlmConfigured(): boolean {
  return Boolean(env.GEMINI_API_KEY || env.OPENAI_API_KEY);
}

let geminiAuthFailed = false;

async function callGeminiJson(input: {
  system: string;
  history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  userMessage: string;
}): Promise<Record<string, unknown> | null> {
  if (!env.GEMINI_API_KEY || geminiAuthFailed) return null;

  const preferred = env.GEMINI_MODEL || 'gemini-flash-latest';
  const models = Array.from(
    new Set([preferred, 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']),
  );

  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  for (const msg of input.history.slice(-12)) {
    if (msg.role === 'system') continue;
    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    });
  }
  contents.push({ role: 'user', parts: [{ text: input.userMessage }] });

  let lastError: unknown;
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: input.system }] },
          contents,
          generationConfig: {
            temperature: 0.35,
            responseMimeType: 'application/json',
          },
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        lastError = new Error(`Gemini ${model} HTTP ${res.status}: ${body.slice(0, 200)}`);
        // Invalid / expired key — stop hammering every model fallback
        if (
          res.status === 400 &&
          /API key not valid|INVALID_ARGUMENT|API_KEY_INVALID/i.test(body)
        ) {
          geminiAuthFailed = true;
          console.error(
            '[ai.assistant] Gemini API key is invalid — fix GEMINI_API_KEY on the server. Falling back to OpenAI / heuristics.',
          );
          break;
        }
        if (res.status === 401 || res.status === 403) {
          geminiAuthFailed = true;
          console.error('[ai.assistant] Gemini auth failed — disable or fix GEMINI_API_KEY.');
          break;
        }
        if (res.status === 404 || res.status === 400) continue;
        throw lastError;
      }
      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
      const parsed = parseJsonObject(text);
      if (parsed) {
        if (model !== preferred) {
          console.info(`[ai.assistant] Gemini model fallback used: ${model}`);
        }
        return parsed;
      }
      lastError = new Error(`Gemini ${model} returned non-JSON`);
    } catch (err) {
      lastError = err;
    }
  }
  if (lastError && !geminiAuthFailed) console.error('[ai.assistant] Gemini native error', lastError);
  return null;
}

async function callOpenAiJson(input: {
  system: string;
  history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  userMessage: string;
}): Promise<Record<string, unknown> | null> {
  if (!env.OPENAI_API_KEY) return null;
  const client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    ...(env.OPENAI_BASE_URL ? { baseURL: env.OPENAI_BASE_URL } : {}),
  });
  const completion = await client.chat.completions.create({
    model: env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0.35,
    messages: [
      { role: 'system', content: input.system },
      ...input.history.slice(-12),
      { role: 'user', content: input.userMessage },
    ],
    response_format: { type: 'json_object' },
  });
  return parseJsonObject(completion.choices[0]?.message?.content || '{}');
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1]!.trim() : trimmed;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // fall through
  }
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

function strOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s.length ? s : null;
}

function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return phone.trim();
}

function isLeadComplete(lead: {
  customerName: string | null;
  phone: string | null;
  pickup: string | null;
  dropoff: string | null;
  travelDate: string | null;
  travelTime: string | null;
  vehicle: string | null;
}): boolean {
  const phone = normalizePhone(lead.phone);
  return Boolean(
    lead.customerName &&
      phone &&
      phone.replace(/\D/g, '').length >= 10 &&
      lead.pickup &&
      !isGarbagePlace(lead.pickup) &&
      lead.dropoff &&
      !isGarbagePlace(lead.dropoff) &&
      lead.travelDate &&
      lead.travelTime &&
      lead.vehicle,
  );
}

/** Enough to open website checkout (name/phone come from pre-chat gate). */
function canSendCheckoutLink(lead: {
  customerName: string | null;
  phone: string | null;
  pickup: string | null;
  dropoff: string | null;
}): boolean {
  const phone = normalizePhone(lead.phone);
  return Boolean(
    lead.customerName &&
      phone &&
      phone.replace(/\D/g, '').length >= 10 &&
      lead.pickup &&
      !isGarbagePlace(lead.pickup) &&
      lead.dropoff &&
      !isGarbagePlace(lead.dropoff),
  );
}

/** Normalize DB / chat dates to YYYY-MM-DD. Never keep "Thu Nov 30" junk from String(Date).slice. */
function normalizeTravelDate(raw: unknown): string | null {
  return parseFlexibleDate(raw);
}

function isBookIntent(message: string): boolean {
  const lower = message.toLowerCase().trim();
  return (
    /^(kindly|please)?\s*book(\s+it|\s+now|\s+this|\s+the\s+(cab|taxi|trip))?[.!]?$/i.test(lower) ||
    /\b((kindly|please)\s+)?book(\s+it|\s+now|\s+this)?\b/i.test(lower) ||
    /\b(confirm\s*(the\s*)?(booking|trip)|i\s*(want|need)\s*to\s*book|go\s*ahead\s*(and\s*)?book)\b/i.test(
      lower,
    )
  );
}

function defaultTravelDateIst(): string {
  const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function extractRouteFromHistory(
  history: Array<{ role: string; content: string }>,
): { from: string; to: string } | null {
  for (const m of [...history].reverse()) {
    if (m.role !== 'assistant' || !m.content) continue;
    const arrow = m.content.match(/^([^\n→]+?)\s*→\s*([^\n:]+?):/m);
    if (arrow) {
      const from = arrow[1]!.trim();
      const to = arrow[2]!.replace(/\s*\(.*$/, '').trim();
      if (from.length >= 2 && to.length >= 2) return { from, to };
    }
  }
  return null;
}

/** Map tourId / tour title → checkout dropoff label. */
export function tourDestinationLabel(tourIdOrName: string): string {
  const s = tourIdOrName.toLowerCase();
  if (/lambasingi|lammasingi/.test(s)) return 'Lambasingi';
  if (/vanajangi/.test(s)) return 'Vanajangi';
  if (/araku/.test(s)) return 'Araku Valley';
  if (/borra/.test(s)) return 'Borra Caves';
  if (/north\s*city|vizag_north/.test(s)) return 'Vizag North City Tour';
  if (/south\s*city|vizag_south/.test(s)) return 'Vizag South City Tour';
  if (/arasavalli|srikurmam/.test(s)) return 'Arasavalli / Srikurmam';
  const cleaned = tourIdOrName
    .replace(/\s*tour\s*$/i, '')
    .replace(/_/g, ' ')
    .trim();
  return cleaned || 'Araku Valley';
}

function isLikelyVizagLocalPlace(place: string | null | undefined): boolean {
  if (!place) return false;
  const p = place.toLowerCase();
  if (/^(vizag|visakhapatnam|waltair)(\b|,|$)/i.test(p) && !/airport|araku|lambasingi/.test(p)) {
    // Bare city is OK as tour pickup
    if (/^(vizag|visakhapatnam|waltair)$/i.test(place.trim())) return true;
  }
  return /\b(akkayapalem|rk\s*beach|beach\s*road|mvp|gajuwaka|madhurawada|nad|novotel|kailasapuram|siripuram|dwaraka|jagadamba|pendurthi|inorbit)\b/i.test(
    p,
  );
}

/**
 * When visitor says "book it", bind lead to the LATEST assistant quote (tour or route).
 * Prevents stale RK Beach → Akkayapalem from overriding a fresh Araku tour quote.
 */
export function syncLeadFromLatestQuote(
  lead: AiLeadState,
  history: Array<{ role: string; content: string }>,
): void {
  const lastAsst = [...history].reverse().find((m) => m.role === 'assistant');
  const content = lastAsst?.content || '';
  if (!content) {
    // Fall back to stored tour id from a prior turn
    if (typeof lead.meta?.lastTourId === 'string' && lead.meta.lastTourId) {
      applyTourQuoteToLead(lead, {
        tourId: lead.meta.lastTourId,
        title: String(lead.meta.lastTourName || lead.meta.lastTourId),
      });
    }
    return;
  }

  // Tour package card: "Araku Valley Tour (~260 km):\n• Sedan: ₹5,000"
  const tourHeader = content.match(/^([^\n(]+?)(?:\s*\(([^)]*)\))?:\s*\r?\n\s*[•*]/m);
  if (
    tourHeader &&
    /₹|rs\.?/i.test(content) &&
    /\b(sedan|ertiga|innova|tempo|urbania|dzire)\b/i.test(content) &&
    /\b(tour|araku|lambasingi|vanajangi|borra|sightseeing|package)\b/i.test(content)
  ) {
    const title = tourHeader[1]!.trim();
    const metaBits = tourHeader[2] || '';
    const kmM = metaBits.match(/~?(\d+)\s*km/i) || content.match(/~(\d+)\s*km/i);
    const sedanFare = content.match(/\bSedan\b[^₹\n]*₹\s*([\d,]+)/i);
    applyTourQuoteToLead(lead, {
      title,
      tourId: typeof lead.meta?.lastTourId === 'string' ? lead.meta.lastTourId : undefined,
      distanceKm: kmM ? Number(kmM[1]) : undefined,
      quotedFare: sedanFare ? Number(sedanFare[1]!.replace(/,/g, '')) : undefined,
      quoteText: content,
    });
    return;
  }

  // Live route quote: "Vizag → Rajahmundry: ~200 km."
  const arrow = content.match(/^([^\n→]+?)\s*→\s*([^\n:(]+)/m);
  if (arrow && /~?\d+\s*km/i.test(content) && /₹|rs\.?/i.test(content)) {
    const from = arrow[1]!.trim();
    const to = arrow[2]!.replace(/\s*\(.*$/, '').trim();
    if (from.length >= 2 && to.length >= 2 && !isGarbagePlace(from) && !isGarbagePlace(to)) {
      lead.pickup = from;
      lead.dropoff = to;
      const kmM = content.match(/~?(\d+)\s*km/i);
      const fareM = content.match(/₹\s*([\d,]+)/);
      lead.meta = {
        ...(lead.meta || {}),
        lastQuotedKind: 'route',
        lastQuotedKm: kmM ? Number(kmM[1]) : lead.meta?.lastQuotedKm,
        lastQuotedFare: fareM ? Number(fareM[1]!.replace(/,/g, '')) : lead.meta?.lastQuotedFare,
      };
      delete lead.meta.lastTourId;
      delete lead.meta.lastTourName;
    }
  }
}

export function applyTourQuoteToLead(
  lead: AiLeadState,
  opts: {
    title?: string;
    tourId?: string;
    distanceKm?: number;
    quotedFare?: number;
    quoteText?: string;
  },
): void {
  const label = tourDestinationLabel(opts.tourId || opts.title || 'Araku Valley');
  const prevDrop = lead.dropoff;
  lead.dropoff = label;

  const prevWasLocalHop =
    isLikelyVizagLocalPlace(lead.pickup) &&
    isLikelyVizagLocalPlace(prevDrop) &&
    prevDrop !== null;
  if (!lead.pickup || prevWasLocalHop) {
    if (!lead.pickup) lead.pickup = 'Vizag';
  }
  if (!lead.pickup) lead.pickup = 'Vizag';

  const packageFares = parseTourPackageFares(opts.quoteText || '');
  let fare = opts.quotedFare;
  if ((!fare || fare <= 0) && Object.keys(packageFares).length) {
    fare = pickTourFareForVehicle(packageFares, lead.vehicle) || packageFares.sedan;
  }

  lead.meta = {
    ...(lead.meta || {}),
    lastQuotedKind: 'tour',
    lastTourId: opts.tourId || (lead.meta?.lastTourId as string) || null,
    lastTourName: opts.title || (lead.meta?.lastTourName as string) || label,
    lastTourPackageFares: Object.keys(packageFares).length
      ? packageFares
      : lead.meta?.lastTourPackageFares,
  };
  if (opts.distanceKm && opts.distanceKm > 0) {
    lead.meta.lastQuotedKm = opts.distanceKm;
  } else if (Number(lead.meta.lastQuotedKm) > 0 && Number(lead.meta.lastQuotedKm) <= 35) {
    delete lead.meta.lastQuotedKm;
  }
  if (fare && fare > 0) {
    lead.meta.lastQuotedFare = fare;
  }
}

/** Parse "• Sedan (Dzire): ₹5,000" lines from a tour quote. */
export function parseTourPackageFares(text: string): Record<string, number> {
  const out: Record<string, number> = {};
  if (!text) return out;
  const re = /•\s*([^:₹\n]+):\s*₹\s*([\d,]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const label = m[1]!.toLowerCase();
    const amount = Number(m[2]!.replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) continue;
    if (/urbania/.test(label)) out.urbania = amount;
    else if (/tempo/.test(label)) out.tempo_traveller = amount;
    else if (/innova|crysta/.test(label)) out.innova_crysta = amount;
    else if (/ertiga/.test(label)) out.ertiga = amount;
    else if (/luxury/.test(label)) out.luxury_sedan = amount;
    else if (/sedan|dzire/.test(label)) out.sedan = amount;
  }
  return out;
}

export function pickTourFareForVehicle(
  fares: Record<string, number>,
  vehicle: string | null | undefined,
): number {
  const v = (vehicle || 'Sedan').toLowerCase();
  if (/urbania/.test(v)) return fares.urbania || 0;
  if (/tempo/.test(v)) return fares.tempo_traveller || 0;
  if (/innova|crysta/.test(v)) return fares.innova_crysta || 0;
  if (/ertiga/.test(v)) return fares.ertiga || 0;
  if (/luxury/.test(v)) return fares.luxury_sedan || fares.sedan || 0;
  return fares.sedan || 0;
}

async function seedLeadFromVisitor(lead: AiLeadState, visitorId: string): Promise<void> {
  if (lead.customerName && lead.phone) return;
  const visitor = await queryOne<{ name: string | null; phone: string | null }>(
    `SELECT name, phone FROM va_visitors WHERE id = :id LIMIT 1`,
    { id: visitorId },
  );
  if (!visitor) return;
  if (!lead.customerName && visitor.name?.trim()) lead.customerName = visitor.name.trim();
  if (!lead.phone && visitor.phone) lead.phone = normalizePhone(visitor.phone);
}

/** Normalize times like 5pm, 17:00, 5.30 AM → display string. */
export function normalizeTravelTime(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;

  const ampm = s.match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)$/i);
  if (ampm) {
    let h = Number(ampm[1]);
    const m = ampm[2] ? Number(ampm[2]) : 0;
    const ap = ampm[3]!.toUpperCase();
    if (h < 1 || h > 12 || m > 59) return s;
    return `${h}:${String(m).padStart(2, '0')} ${ap}`;
  }

  const h24 = s.match(/^([01]?\d|2[0-3])[:.]([0-5]\d)$/);
  if (h24) {
    return `${h24[1]!.padStart(2, '0')}:${h24[2]}`;
  }

  if (/^(morning|afternoon|evening|night)$/i.test(s)) {
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }

  return s;
}

function extractTravelTime(message: string): string | null {
  const trimmed = message.trim();
  // Bare hour: "10" / "10am" when user is answering pickup time
  const bareHour = trimmed.match(/^(\d{1,2})\s*(am|pm)?$/i);
  if (bareHour) {
    const h = Number(bareHour[1]);
    if (h >= 1 && h <= 12) {
      const ap = (bareHour[2] || 'AM').toUpperCase();
      return `${h}:00 ${ap}`;
    }
    if (!bareHour[2] && h >= 0 && h <= 23) {
      return `${String(h).padStart(2, '0')}:00`;
    }
  }

  const m = message.match(
    /\b(?:at\s+|by\s+|pickup\s*(?:at|time)?[:\s]*)?(\d{1,2}[:.]\d{2}\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm)|([01]?\d|2[0-3])[:.][0-5]\d)\b/i,
  );
  if (m) return normalizeTravelTime(m[1]!.replace(/\s+/g, ' ').trim());

  const soft = message.match(/\b(morning|afternoon|evening|night)\b/i);
  if (soft && /\b(time|pickup|am|pm|depart|leave|flight)\b/i.test(message)) {
    return normalizeTravelTime(soft[1]!);
  }
  return null;
}

function isVehicleOnlyAnswer(message: string): boolean {
  const t = message.trim().toLowerCase();
  return /^(sedan|dzire|desire|desiree|swift|amaze|etios|glanza|ertiga|innova|crysta|hycross|tempo|traveller|traveler|urbania|luxury(\s*sedan)?|mpv|suv)$/i.test(
    t,
  );
}

function looksLikePlaceAnswer(message: string): boolean {
  const t = message.trim();
  if (t.length < 2 || t.length > 100) return false;
  if (
    /^(yes|no|ok|okay|hi|hello|hey|thanks|thank you|already told|book it|kindly book|please book)[.!]?$/i.test(
      t,
    )
  ) {
    return false;
  }
  if (isHumanHandoffIntent(t) || isBookIntent(t)) return false;
  if (isPricingIntent(t.toLowerCase())) return false;
  if (isVehicleOnlyAnswer(t)) return false;
  if (/(?:\+?91[-\s]?)?[6-9]\d{9}\b/.test(t)) return false;
  if (/^(morning|afternoon|evening|night|\d{1,2}([:.]\d{2})?\s*(am|pm)?)$/i.test(t)) return false;
  if (/^\d{1,2}([\/\-]\d{1,2}[\/\-]\d{2,4})?$/.test(t)) return false; // date or bare number
  // Must have letters (place name)
  if (!/[a-zA-Z]{3,}/.test(t)) return false;
  return true;
}

/** Reject chat phrases wrongly stored as pickup/drop ("I need vehicle", etc.). */
export function isGarbagePlace(raw: string | null | undefined): boolean {
  if (!raw) return true;
  const t = raw.trim();
  if (t.length < 2 || t.length > 120) return true;
  if (/^(i\s+)?(need|want|looking\s+for)\b/i.test(t)) return true;
  if (/\b(need|want)\s+(a\s+)?(vehicle|cab|taxi|car)\b/i.test(t)) return true;
  if (/^(a\s+)?(vehicle|cab|taxi|car|please|kindly)(\s+please)?$/i.test(t)) return true;
  if (/^(pickup|drop(?:-?off)?|destination)(\s+location)?(\s+is)?$/i.test(t)) return true;
  // Uncleaned "Pickup location is at Akkayapalem" must never be stored as-is
  if (/\b(pickup|drop(?:-?off)?|destination)\s+(location|point|place|area)\s+is\b/i.test(t)) return true;
  if (
    /\b(connect|human|operator|agent|executive|support|someone|person|chat|whatsapp)\b/i.test(t) &&
    !/\b(hotel|airport|station|junction|colony|nagar|palem|road)\b/i.test(t)
  ) {
    return true;
  }
  if (/^(tomorrow|today|yesterday|tmrw|sedan|ertiga|innova|crysta|tempo|urbania|outstation|out\s*station)$/i.test(t)) {
    return true;
  }
  if (/^\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)$/i.test(t)) return true;
  return false;
}

function cleanStandalonePlace(message: string): string {
  let s = message.trim();
  // "Pickup location is at Akkayapalem" / "Drop is Rajahmundry"
  s = s.replace(
    /^(?:my\s+)?(?:pickup|pick\s*up|drop(?:-?off)?|destination)\s*(?:location|point|place|area)?\s*(?:is\s*)?(?:at|from|to|:)?\s*/i,
    '',
  );
  s = s.replace(/^(?:at|from|near|in|the)\s+/i, '');
  s = s.replace(/\s+(?:please|sir|madam)\.?$/i, '');
  // Keep trailing "Hotel" for names like "Novotel Hotel"
  s = s.replace(/\s+/g, ' ').slice(0, 120).trim();
  return s;
}

/** Explicit "pickup is X" / "dropoff: Y" in free text. */
function extractExplicitPickupDrop(message: string): { pickup?: string; dropoff?: string } {
  const out: { pickup?: string; dropoff?: string } = {};
  const hasPickup = /\b(?:pickup|pick\s*up)\b/i.test(message);
  const hasDrop = /\b(?:drop(?:-?off)?|destination)\b/i.test(message);
  if (hasPickup && !hasDrop) {
    const p = cleanStandalonePlace(message);
    if (p && !isGarbagePlace(p) && looksLikePlaceAnswer(p)) out.pickup = p;
  } else if (hasDrop && !hasPickup) {
    const d = cleanStandalonePlace(message);
    if (d && !isGarbagePlace(d) && looksLikePlaceAnswer(d)) out.dropoff = d;
  } else if (hasPickup && hasDrop) {
    const pickupM = message.match(
      /\b(?:pickup|pick\s*up)\s*(?:location|point|place|area)?\s*(?:is\s*)?(?:at|from|:)?\s*(.+?)(?=\b(?:drop|destination)\b|$)/i,
    );
    const dropM = message.match(
      /\b(?:drop(?:-?off)?|destination)\s*(?:location|point|place|area)?\s*(?:is\s*)?(?:at|to|:)?\s*(.+?)$/i,
    );
    if (pickupM) {
      const p = cleanStandalonePlace(pickupM[1]!);
      if (p && !isGarbagePlace(p) && looksLikePlaceAnswer(p)) out.pickup = p;
    }
    if (dropM) {
      const d = cleanStandalonePlace(dropM[1]!);
      if (d && !isGarbagePlace(d) && looksLikePlaceAnswer(d)) out.dropoff = d;
    }
  }
  return out;
}

/** True only for bare Vizag city labels — not "Novotel Visakhapatnam" / "Vizag Airport". */
function isBareVizagCity(raw: string): boolean {
  const t = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  return /^(vizag|visakhapatnam|waltair|vskp)(?:\s*,?\s*andhra\s*pradesh)?(?:\s*,?\s*india)?$/.test(t);
}

export function heuristicExtract(message: string, prev: AiLeadState): Partial<AiLeadState> {
  const out: Partial<AiLeadState> = {};
  const phoneMatch = message.match(/(?:\+?91[-\s]?)?[6-9]\d{9}\b/);
  if (phoneMatch) out.phone = normalizePhone(phoneMatch[0]);

  const dateHit = extractFlexibleDate(message);
  if (dateHit) out.travelDate = dateHit;

  const time = extractTravelTime(message);
  if (time) out.travelTime = time;

  const lower = message.toLowerCase();
  for (const cat of VEHICLE_CATEGORIES) {
    if (isTripCategoryLabel(cat)) continue;
    if (lower.includes(cat.toLowerCase())) {
      out.vehicle = cat;
      break;
    }
  }
  if (!out.vehicle) {
    if (/urbania|force urbania/.test(lower)) out.vehicle = 'Urbania';
    else if (/\b(tempo|traveller)\b/.test(lower)) out.vehicle = 'Tempo Traveller';
    else if (/\b(innova|crysta)\b/.test(lower)) out.vehicle = 'Innova Crysta';
    else if (/\bertiga\b/.test(lower)) out.vehicle = 'Ertiga';
    else if (/\bluxury\b/.test(lower)) out.vehicle = 'Luxury Sedan';
    else if (/\b(sedan|dzire|desire|desiree|amaze|etios|glanza|swift|small car|4 seater)\b/.test(lower)) {
      out.vehicle = 'Sedan';
    }
  }

  const nameMatch = message.match(/\b(?:my name is|i am|i'm)\s+([A-Za-z][A-Za-z\s.'-]{1,60})/i);
  if (nameMatch) out.customerName = nameMatch[1]!.trim();

  // "Narendra Kumar, 9550099336, 23-07-2026, Sedan" (time may be missing)
  if (!out.customerName && phoneMatch) {
    const beforePhone = message.slice(0, message.indexOf(phoneMatch[0])).replace(/[,\s]+$/g, '').trim();
    if (/^[A-Za-z][A-Za-z\s.'-]{1,60}$/.test(beforePhone) && beforePhone.split(/\s+/).length <= 5) {
      out.customerName = beforePhone;
    }
  }

  // Explicit pickup/drop phrasing always wins (even alongside date answers)
  const explicit = extractExplicitPickupDrop(message);
  if (explicit.pickup) out.pickup = explicit.pickup;
  if (explicit.dropoff) out.dropoff = explicit.dropoff;

  // Date / time / vehicle answers must NEVER be treated as a new pickup/drop
  if (out.travelDate || out.travelTime || out.vehicle || isVehicleOnlyAnswer(message)) {
    return out;
  }

  // Popular destination after "to …" — never store "I need vehicle" as pickup
  const popular = matchPopularRoute(message);
  if (popular && /\b(?:to|towards|toward|upto|up to)\b/i.test(message) && !isHumanHandoffIntent(message)) {
    out.dropoff = popular.toLabel;
    const keepPickup = prev.pickup && !isGarbagePlace(prev.pickup) ? prev.pickup : null;
    out.pickup = keepPickup || out.pickup || null;
    // Leave pickup null so we ask "Where should we pick you up?" (or use Vizag only after quote)
    if (!out.pickup) {
      // Destination-only intent — default Vizag for fare quoting; user can refine
      out.pickup = 'Vizag';
    }
    if (!out.travelDate) {
      out.travelDate = null;
      out.travelTime = null;
    }
    return out;
  }

  const routePair = message.match(
    /\b(?:from\s+)?([A-Za-z][A-Za-z\s]{1,40}?)\s+(?:to|towards|toward)\s+([A-Za-z][A-Za-z\s]{1,40}?)(?:\s+(?:cost|fare|price|charges?|rate|kitna))?\.?\s*$/i,
  );
  if (routePair && !isHumanHandoffIntent(message)) {
    const from = routePair[1]!.trim();
    const to = routePair[2]!.trim();
    const fromOk =
      !isGarbagePlace(from) &&
      !/cost|fare|price|charge|rate|how|much|kitna|connect|human|operator|agent|please|need|want|vehicle|cab|taxi/i.test(
        from,
      );
    const toOk =
      !isGarbagePlace(to) && !/human|operator|agent|executive|person|someone/i.test(to);
    if (toOk) {
      out.dropoff = to;
      if (fromOk) {
        // Only collapse bare city names — keep "Novotel Visakhapatnam", "Airport Vizag", etc.
        out.pickup = isBareVizagCity(from) ? 'Vizag' : from;
      } else {
        out.pickup = prev.pickup && !isGarbagePlace(prev.pickup) ? prev.pickup : 'Vizag';
      }
      if (!out.travelDate) {
        out.travelDate = null;
        out.travelTime = null;
      }
    }
  } else if (!isHumanHandoffIntent(message)) {
    if (popular) {
      out.dropoff = popular.toLabel;
      out.pickup =
        (prev.pickup && !isGarbagePlace(prev.pickup) ? prev.pickup : null) || out.pickup || 'Vizag';
      out.travelDate = null;
      out.travelTime = null;
    } else if (looksLikePlaceAnswer(message)) {
      const place = cleanStandalonePlace(message);
      if (place && !isGarbagePlace(place)) {
        const prevPickupBad = isGarbagePlace(prev.pickup);
        const prevDropBad = isGarbagePlace(prev.dropoff);
        if (/\bpickup|pick\s*up\b/i.test(message) || (!prev.pickup || prevPickupBad)) {
          out.pickup = place;
        } else if (!prev.dropoff || prevDropBad) {
          out.dropoff = place;
        } else if (prev.pickup && prev.dropoff) {
          // New place after a complete route → new destination (unless message is pickup refinement)
          if (/\bpickup|pick\s*up\b/i.test(message)) {
            out.pickup = place;
          } else {
            out.pickup = prev.pickup;
            out.dropoff = place;
            out.travelDate = null;
            out.travelTime = null;
            out.vehicle = null;
          }
        }
      }
    }
  }

  return out;
}

export async function getOrCreateLead(params: {
  siteId: string;
  conversationId: string;
  visitorId: string;
}): Promise<AiLeadState> {
  const existing = await queryOne<{
    id: string;
    customer_name: string | null;
    phone: string | null;
    pickup: string | null;
    dropoff: string | null;
    travel_date: string | Date | null;
    vehicle: string | null;
    status: AiLeadState['status'];
    meta: string | Record<string, unknown> | null;
  }>(
    `SELECT id, customer_name, phone, pickup, dropoff, travel_date, vehicle, status, meta
     FROM va_ai_leads WHERE conversation_id = :conversationId ORDER BY created_at DESC LIMIT 1`,
    { conversationId: params.conversationId },
  );

  if (existing) {
    const meta =
      typeof existing.meta === 'string'
        ? ((existing.meta ? JSON.parse(existing.meta) : {}) as Record<string, unknown>)
        : existing.meta || {};
    return {
      id: existing.id,
      customerName: existing.customer_name,
      phone: existing.phone,
      pickup: existing.pickup,
      dropoff: existing.dropoff,
      travelDate: normalizeTravelDate(existing.travel_date),
      travelTime: typeof meta.travelTime === 'string' ? meta.travelTime : null,
      vehicle: existing.vehicle,
      status: existing.status,
      meta,
    };
  }

  const id = newId();
  await query(
    `INSERT INTO va_ai_leads (id, site_id, conversation_id, visitor_id, status)
     VALUES (:id, :siteId, :conversationId, :visitorId, 'collecting')`,
    {
      id,
      siteId: params.siteId,
      conversationId: params.conversationId,
      visitorId: params.visitorId,
    },
  );

  return {
    id,
    customerName: null,
    phone: null,
    pickup: null,
    dropoff: null,
    travelDate: null,
    travelTime: null,
    vehicle: null,
    status: 'collecting',
    meta: null,
  };
}

export async function saveLead(lead: AiLeadState, siteId: string, conversationId: string, visitorId: string): Promise<void> {
  lead.travelDate = normalizeTravelDate(lead.travelDate);
  const complete = isLeadComplete(lead);
  const status = lead.status === 'transferred' ? 'transferred' : complete ? 'complete' : 'collecting';
  const meta = { ...(lead.meta || {}), travelTime: lead.travelTime || null };
  lead.meta = meta;
  await query(
    `UPDATE va_ai_leads SET
      customer_name = :customerName,
      phone = :phone,
      pickup = :pickup,
      dropoff = :dropoff,
      travel_date = :travelDate,
      vehicle = :vehicle,
      status = :status,
      meta = :meta,
      site_id = :siteId,
      conversation_id = :conversationId,
      visitor_id = :visitorId
    WHERE id = :id`,
    {
      id: lead.id,
      siteId,
      conversationId,
      visitorId,
      customerName: lead.customerName,
      phone: normalizePhone(lead.phone),
      pickup: lead.pickup,
      dropoff: lead.dropoff,
      travelDate: lead.travelDate,
      vehicle: lead.vehicle,
      status,
      meta: JSON.stringify(meta),
    },
  );
  lead.status = status;
}

function isPricingIntent(lower: string): boolean {
  return /charg|price|rate|fare|cost|kitna|how much|₹|rs\.?|rupee|package|quota/.test(lower);
}

/** Popular Vizag outstation routes — fares from site routeData. */
const POPULAR_ROUTES: Array<{
  aliases: string[];
  toLabel: string;
  distance: string;
  time: string;
  sedan: string;
  suv: string;
}> = [
  { aliases: ['araku'], toLabel: 'Araku Valley', distance: '120 km', time: '3–4 hrs', sedan: '₹5,000', suv: '₹6,500' },
  { aliases: ['narsipatnam'], toLabel: 'Narsipatnam', distance: '80 km', time: '2 hrs', sedan: '₹3,000', suv: '₹4,800' },
  { aliases: ['annavaram'], toLabel: 'Annavaram', distance: '125 km', time: '3 hrs', sedan: '₹4,200', suv: '₹5,400' },
  { aliases: ['kakinada', 'cocanada'], toLabel: 'Kakinada', distance: '160 km', time: '3–4 hrs', sedan: '₹4,500', suv: '₹6,000' },
  {
    aliases: ['rajahmundry', 'rajamundry', 'rajamahendravaram', 'rjy'],
    toLabel: 'Rajahmundry',
    distance: '200 km',
    time: '4–5 hrs',
    sedan: '₹5,200',
    suv: '₹6,800',
  },
  { aliases: ['eluru'], toLabel: 'Eluru', distance: '300 km', time: '~6 hrs', sedan: '₹7,800', suv: '₹10,800' },
  { aliases: ['vijayawada', 'bezawada', 'vja'], toLabel: 'Vijayawada', distance: '350 km', time: '7–8 hrs', sedan: '₹9,600', suv: '₹11,000' },
  { aliases: ['bhadrachalam'], toLabel: 'Bhadrachalam', distance: '360 km', time: '~7 hrs', sedan: '₹10,800', suv: '₹16,000' },
  { aliases: ['guntur'], toLabel: 'Guntur', distance: '420 km', time: '7–8 hrs', sedan: '₹10,900', suv: '₹15,100' },
  { aliases: ['hyderabad', 'hyd', 'secunderabad'], toLabel: 'Hyderabad', distance: '620 km', time: '11–12 hrs', sedan: '₹17,000', suv: '₹22,000' },
  { aliases: ['tirupati', 'tirumala'], toLabel: 'Tirupati', distance: '760 km', time: '~12–14 hrs', sedan: '₹19,600', suv: '₹26,000' },
  { aliases: ['nellore'], toLabel: 'Nellore', distance: '700 km', time: '~11–12 hrs', sedan: '₹18,200', suv: '₹24,000' },
  { aliases: ['chennai', 'madras'], toLabel: 'Chennai', distance: '800 km', time: '14–15 hrs', sedan: '₹20,800', suv: '₹28,000' },
  { aliases: ['bangalore', 'bengaluru', 'blr'], toLabel: 'Bangalore', distance: '1000 km', time: '~16–18 hrs', sedan: '₹25,000', suv: '₹33,000' },
  { aliases: ['puri', 'jagannath'], toLabel: 'Puri', distance: '450 km', time: '9–10 hrs', sedan: '₹9,500', suv: '₹12,000' },
  { aliases: ['bhubaneswar', 'bhubaneshwar'], toLabel: 'Bhubaneswar', distance: '450 km', time: '~9 hrs', sedan: '₹12,000', suv: '₹18,000' },
  { aliases: ['srikakulam'], toLabel: 'Srikakulam', distance: '~120 km', time: '~2.5–3 hrs', sedan: 'from ~₹4,000', suv: 'from ~₹5,400' },
  { aliases: ['lambasingi'], toLabel: 'Lambasingi', distance: '~100–120 km', time: '3–4 hrs', sedan: 'on request', suv: 'on request' },
];

function normalizeCityText(text: string): string {
  return text
    .toLowerCase()
    .replace(/visakhapatnam|vizag|waltair|vskp/g, 'vizag')
    .replace(/rajahmundry|rajamundry|rajamahendravaram/g, 'rajahmundry')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchPopularRoute(message: string): (typeof POPULAR_ROUTES)[number] | null {
  const lower = normalizeCityText(message);
  // Prefer destination after "to" / "towards" when present — never match aliases inside pickup text
  const toMatch = lower.match(/\b(?:to|towards|toward|upto|up to)\s+([a-z0-9\s]{2,40})/);
  const haystack = toMatch ? toMatch[1]! : lower;
  for (const route of POPULAR_ROUTES) {
    if (route.aliases.some((a) => {
      const alias = normalizeCityText(a);
      if (!alias) return false;
      // Word-boundary style: alias must appear as its own token(s), not a random substring
      const re = new RegExp(`(?:^|\\s)${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`);
      return re.test(haystack) || (!toMatch && re.test(lower));
    })) {
      return route;
    }
  }
  return null;
}

function isCityToCityQuery(lower: string): boolean {
  if (/\b(to|towards|toward)\b/.test(lower) && /(vizag|visakhapatnam|from|cost|fare|price|charg|how much|kitna)/.test(lower)) {
    return true;
  }
  return POPULAR_ROUTES.some((r) => r.aliases.some((a) => lower.includes(a)));
}

function routeFareReply(route: (typeof POPULAR_ROUTES)[number]): string {
  const fareNote =
    route.sedan === 'on request'
      ? 'Fare depends on package (day / overnight).'
      : `Indicative one-way: Sedan ${route.sedan} · SUV/Ertiga class ${route.suv}.`;
  return `Vizag → ${route.toLabel}: about ${route.distance}, ${route.time}. ${fareNote} Final fare depends on one-way vs round-trip, vehicle, and date — our operator will confirm. Share name, phone, travel date, and preferred vehicle (Sedan / Ertiga / Innova / Tempo / Urbania)?`;
}


export function isHumanHandoffIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    /\b(human|real\s*person|live\s*agent|agent|operator|executive|customer\s*care|support\s*agent)\b/.test(
      lower,
    ) &&
    /\b(connect|talk|speak|transfer|call|chat|need|want|please|someone|person)\b/.test(lower)
  ) || /\b(talk\s*to\s*(a\s*)?(human|agent|operator|person)|connect\s*me|transfer\s*(me|to)|speak\s*to\s*(a\s*)?(human|agent|operator))\b/.test(
    lower,
  );
}

async function tourFollowupReply(
  message: string,
  lead: AiLeadState,
  historyText: string,
): Promise<string | null> {
  const lastName = String(lead.meta?.lastTourName || '');
  const lastId = typeof lead.meta?.lastTourId === 'string' ? lead.meta.lastTourId : '';
  const historyHasTour = /araku|lambasingi|vanajangi|borra|3 days|tour package/i.test(
    `${lastName} ${lastId} ${historyText}`,
  );
  if (!isTourFollowupIntent(message, lastName || (historyHasTour ? 'tour' : ''))) return null;

  if (isHotelIncludedAsk(message) || isAccommodationIntent(message)) {
    return accommodationReply();
  }
  if (isBorraCavesAsk(message) || /\bborra|bora cave/i.test(message)) {
    return (
      `Yes — the 1-day Araku Valley tour includes Borra Caves (plus viewpoints / Padmapuram as on the tour page).\n` +
      `It is a cab package, not a hotel package. Reply "book it" or ask for the itinerary.`
    );
  }
  if (isHowManyDaysAsk(message) || /^timing$/i.test(message.trim()) || /1 day plan/i.test(message)) {
    if (/3d|3 day/i.test(`${lastId} ${lastName}`)) {
      return 'That package is 3 days / 2 nights (Vizag + Araku). Hotel stay is extra unless listed in inclusions. Share travel date to book, or ask for the itinerary.';
    }
    const itin = await quoteTourItinerary(message, {
      lastTourId: lastId || 'araku',
      historyText,
    });
    if (itin?.reply) return itin.reply;
    return 'The standard Araku Valley tour is a 1-day cab package (~260 km). For 3 days / 2 nights we have a separate Vizag + Araku package. Which one do you want?';
  }
  if (isPerPersonIntent(message)) {
    const pax = extractPassengerCount(message) || 6;
    const fares = (lead.meta?.lastTourPackageFares || {}) as Record<string, number>;
    const whole = fares.innova_crysta || fares.ertiga || fares.sedan || Number(lead.meta?.lastQuotedFare) || 0;
    const vehicleHint =
      pax >= 12 ? 'Tempo Traveller / Urbania' : pax >= 6 ? 'Ertiga or Innova Crysta' : 'Sedan or Ertiga';
    if (whole > 0) {
      const each = Math.round(whole / pax);
      return (
        `Fares are for the whole vehicle, not per seat.\n` +
        `For ${pax} people, ${vehicleHint} is typical.\n` +
        `If you split the quoted vehicle fare of ₹${whole.toLocaleString('en-IN')}, that is about ₹${each.toLocaleString('en-IN')} per person.\n` +
        `Reply "book it" when ready, or call +91 99663 63662.`
      );
    }
    return (
      `Our tour prices are for the whole cab, not per person. For ${pax} people use ${vehicleHint}. ` +
      `Share the tour name (e.g. Araku 1-day or 3D/2N) and I will quote the live package.`
    );
  }
  return null;
}

async function specialIntentReply(
  message: string,
  lead: AiLeadState,
  historyText: string,
): Promise<string | null> {
  if (isCoachOrLargeBusIntent(message)) return coachBusReply();
  if (isArakuLocalStartIntent(message)) return arakuLocalStartReply();
  if (isAccommodationIntent(message) && !/\b(cab|taxi|tour package)\b/i.test(message)) {
    return accommodationReply();
  }
  if (isVehicleRateOnlyIntent(message)) {
    const card = await quoteVehicleRateCard(vehicleHintFromMessage(message));
    if (card) return card;
  }
  if (isLocalHourlyPackageIntent(message)) {
    return quoteLocalHourlyPackages();
  }
  if (isTwoDayArakuIntent(message)) {
    const day = await quoteTourPackageWithId('Araku Valley tour package');
    try {
      const rt = await quoteOutstationRoute({
        from: 'Visakhapatnam',
        to: 'Araku Valley',
        tripMode: 'round-trip',
        calendarDays: 2,
      });
      const dayBlock = day?.reply || '';
      const rtBlock = rt.quotes.length ? formatRouteQuoteReply(rt) : '';
      return (
        `We do not list a fixed 2-day / 1-night Araku package on the website.\n\n` +
        `1-day Araku tour (fixed cab package):\n${dayBlock}\n\n` +
        (rtBlock ? `Custom 2 days / 1 night (round-trip cab; hotel extra):\n${rtBlock}\n` : '') +
        `Hotel / dormitory is not included. Call +91 99663 63662 for a tailored 2D/1N plan.`
      );
    } catch {
      return day?.reply || null;
    }
  }
  const follow = await tourFollowupReply(message, lead, historyText);
  if (follow) return follow;

  if (isMultiStopSightseeingIntent(message)) {
    const templeTour = /arasavalli|arsavalli|srikurmam|sreekurmum|ari kurman/i.test(message);
    if (templeTour) {
      const quoted = await quoteTourPackageWithId(message);
      if (quoted?.reply) {
        return (
          `${quoted.reply}\n\n` +
          `If you only need a city loop (station → temples → hotel), the local 8hrs/80km package also fits. Share date and vehicle.`
        );
      }
    }
    const local = await quoteLocalHourlyPackages();
    return (
      `That sounds like a multi-stop Vizag / temple day.\n` +
      `Best fit is usually the local 8hrs/80km or 10hrs/100km package (cab stays with you):\n\n${local}`
    );
  }

  const blob = parseTripBlob(message);
  if (blob.pickup && blob.dropoff) {
    if (blob.travelDate) lead.travelDate = blob.travelDate;
    if (blob.travelTime) lead.travelTime = blob.travelTime;
    if (blob.vehicle) lead.vehicle = blob.vehicle;
    lead.pickup = blob.pickup;
    lead.dropoff = blob.dropoff;
    try {
      const quote = await quoteOutstationRoute({
        from: blob.pickup,
        to: blob.dropoff,
        tripMode: blob.tripMode || 'one-way',
      });
      if (quote.quotes.length) return formatRouteQuoteReply(quote);
    } catch {
      // fall through
    }
  }
  return null;
}

type FareEngineHit = {
  reply: string;
  lastTourId?: string;
  pickup?: string;
  dropoff?: string;
  quotedFare?: number;
  quotedKm?: number;
};

async function tryFareEngineReply(
  message: string,
  opts?: { lastTourId?: string | null; historyText?: string },
): Promise<FareEngineHit | null> {
  const lower = message.toLowerCase();

  // Never treat handoff / book-only phrases as route quotes
  if (isHumanHandoffIntent(message) || isBookIntent(message)) return null;

  // 4hrs/40km discontinued on website (RateCard shows 8hrs/80km only)
  if (/\b0?4\s*hrs?\s*[\/\-]?\s*40\s*k?m?\b|\b4\s*hr\s*[\/\-]?\s*40\b|\bcity\s*tour\s*\(?\s*4\s*hr/i.test(lower)) {
    const card = await quoteVehicleRateCard(
      lower.match(/urbania|tempo|traveller|innova|ertiga|sedan|dzire|amaze/)?.[0] || 'sedan',
    );
    const rates = card
      ? `\n\n${card}`
      : '\n\nShare vehicle type for live 8hrs/80km and 10hrs/100km rates.';
    return {
      reply:
        `We no longer offer the 4hrs/40km (City Tour) local package. ` +
        `Local options are 8hrs/80km and 10hrs/100km only.${rates}`,
    };
  }

  if (isLocalHourlyPackageIntent(message)) {
    return { reply: await quoteLocalHourlyPackages() };
  }

  // Live website itinerary FIRST (never let LLM invent Padmapuram/Chaparai schedules)
  if (isTourItineraryIntent(message)) {
    const itin = await quoteTourItinerary(message, {
      lastTourId: opts?.lastTourId,
      historyText: opts?.historyText,
    });
    if (itin?.reply) return { reply: itin.reply, lastTourId: itin.tourId || opts?.lastTourId || undefined };
  }

  // Tours FIRST (Araku / city sightseeing / Lambasingi) — same as website redirect to Tours tab
  if (isTourPackageIntent(message)) {
    // If they asked prices + itinerary together, prices then they can ask itinerary next
    const withId = await quoteTourPackageWithId(message);
    if (withId) return { reply: withId.reply, lastTourId: withId.tourId };
    const tourReply = await quoteTourPackage(message);
    if (tourReply) return { reply: tourReply };
  }

  let places = extractRoutePlaces(message);
  // Require fare/price intent OR a clear place-to-place — do not treat every "to" as a quote
  const wantsFare =
    /charg|price|rate|fare|cost|kitna|how much|₹|rs\.?|rupee|quota|package|tour/.test(lower);

  // Generic airport fare ask (quick-reply) → collect trip details, don't dump slab table
  const airportFareAsk =
    /\bairport\b/.test(lower) &&
    /(fare|charg|price|rate|cost|how much|taxi|cab|transfer|book|details)/.test(lower);
  if (airportFareAsk && !places) {
    return {
      reply:
        `Sure — I can quote the exact Vizag Airport transfer fare.\n` +
        `Please share:\n` +
        `• Pickup location\n` +
        `• Drop location\n` +
        `• Travel date\n` +
        `• Pickup time\n` +
        `• Preferred vehicle (Sedan / Ertiga / Innova / Tempo / Urbania)`,
    };
  }

  // Generic outstation ask without places → collect details
  if (
    !places &&
    /\boutstation\b/.test(lower) &&
    /(fare|charg|price|rate|cost|quote|cab|details|pickup|drop)/.test(lower)
  ) {
    return {
      reply:
        `Sure — I can quote the live outstation fare.\n` +
        `Please share:\n` +
        `• Pickup location\n` +
        `• Drop location\n` +
        `• One-way or round-trip\n` +
        `• Travel date & pickup time\n` +
        `• Preferred vehicle`,
    };
  }

  // "Rajahmundry cost" / "Tuni fare" without explicit from → assume Vizag pickup
  if (!places && wantsFare) {
    const popular = matchPopularRoute(message);
    if (popular) {
      places = {
        from: 'Visakhapatnam, Andhra Pradesh, India',
        to: `${popular.toLabel}, Andhra Pradesh, India`,
      };
    }
  }

  if (places && (wantsFare || /\b(?:to|towards|toward|->|→)\b/.test(lower))) {
    try {
      const isRoundTrip = /round\s*-?\s*trip|return\s+trip/i.test(message);
      const days = extractCalendarDays(message);
      const quote = await quoteOutstationRoute({
        from: places.from,
        to: places.to,
        tripMode: isRoundTrip ? 'round-trip' : 'one-way',
        calendarDays: isRoundTrip ? days || 2 : undefined,
        pricingModel: 'auto',
      });
      if (isRestrictedAirportRouteQuote(quote)) {
        return {
          reply: formatRouteQuoteReply(quote),
        };
      }
      if (quote.quotes.length) {
        return {
          reply: formatRouteQuoteReply(quote),
          pickup: places.from,
          dropoff: places.to,
          quotedFare: quote.quotes[0]?.total,
          quotedKm: quote.distanceKm,
        };
      }
    } catch (err) {
      console.error('[ai.assistant] fareEngine route quote failed', err);
      return {
        reply: `I can calculate that on our booking engine once pickup and drop are clear. Please share exact pickup area, drop, date, and vehicle — or use the website form for the same live fare. Call +91 99663 63662 if you prefer.`,
      };
    }
  }

  const vehicleHit = lower.match(
    /urbania|force urbania|tempo|traveller|traveler|innova|crysta|hycross|ertiga|sedan|dzire|amaze|glanza|luxury|mpv/,
  );
  if (vehicleHit && /charg|price|rate|fare|cost|kitna|how much|package|local|outstation/.test(lower)) {
    const card = await quoteVehicleRateCard(vehicleHit[0]);
    if (card) return { reply: card };
  }

  return null;
}

/** Trip-category labels are not bookable vehicle names for checkout. */
function isTripCategoryLabel(vehicle: string | null | undefined): boolean {
  if (!vehicle) return false;
  return /^(outstation|local\s*taxi|airport\s*taxi|araku\s*tour|vizag\s*tour|simhachalam|borra\s*caves|lambasingi)$/i.test(
    vehicle.trim(),
  );
}

function normalizeCheckoutVehicle(vehicle: string | null | undefined): string {
  if (!vehicle || isTripCategoryLabel(vehicle)) return 'Sedan';
  return vehicle;
}

function siteBaseUrl(): string {
  return (env.FARE_API_BASE || 'https://vizagtaxihub.com').replace(/\/$/, '');
}

/** Map lead tour meta → website /tours/{slug}. */
export function tourCheckoutSlug(lead: AiLeadState): string {
  const id = String(lead.meta?.lastTourId || '').toLowerCase().replace(/-/g, '_');
  const name = String(lead.meta?.lastTourName || lead.dropoff || '').toLowerCase();
  const raw = `${id} ${name}`;

  // Prefer explicit known website slugs (matches src/utils/tourUrlUtils.ts)
  if (/araku_vizag_3d_2n|3d\s*2n|3\s*day/.test(raw) && /araku/.test(raw)) return 'araku-vizag-3d-2n';
  if (/lambasingi|lammasingi/.test(raw)) return 'lambasingi-tour';
  if (/vanajangi/.test(raw)) return 'vanajangi-tour';
  if (/north_city|north\s*city|vizag_north/.test(raw)) return 'vizag-north-city-tour';
  if (/south_city|south\s*city|vizag_south/.test(raw)) return 'vizag-south-city-tour';
  if (/arasavalli|srikurmam/.test(raw)) return 'arasavalli-srikurmam-tour';
  if (/\baraku\b|borra/.test(raw)) return 'araku-valley-tour';

  // Unknown tour: slugify tourId / name — never silently send people to Araku
  const seed = id || name || 'tour';
  const slug = seed
    .replace(/_tour$/i, '')
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (slug && slug !== 'tour') {
    return /tour$/.test(slug) ? slug : `${slug}-tour`;
  }
  return 'araku-valley-tour';
}

function isTourLead(lead: AiLeadState): boolean {
  return (
    lead.meta?.lastQuotedKind === 'tour' ||
    Boolean(lead.meta?.lastTourId) ||
    /araku|lambasingi|vanajangi|borra|city\s*tour/i.test(
      `${lead.dropoff || ''} ${lead.meta?.lastTourName || ''}`,
    )
  );
}

/** Website checkout URL — tours open package page; routes open home Guest Details. */
export async function buildBookingCheckoutUrl(lead: AiLeadState): Promise<string> {
  const hay = `${lead.pickup || ''} ${lead.dropoff || ''}`;
  const tour = isTourLead(lead);
  const vehicleForForm = normalizeCheckoutVehicle(lead.vehicle);
  let fare = Number(lead.meta?.lastQuotedFare) || 0;
  let distanceKm = Number(lead.meta?.lastQuotedKm) || 0;

  // Tour packages = fixed website tour fares — never reprice via outstation km engine
  if (tour) {
    const packageFares = (lead.meta?.lastTourPackageFares || {}) as Record<string, number>;
    const vehicleFare = pickTourFareForVehicle(packageFares, vehicleForForm);
    if (vehicleFare > 0) fare = vehicleFare;
    else if (!fare) fare = Number(lead.meta?.lastQuotedFare) || 0;

    const q = new URLSearchParams({
      source: 'vth_ai',
      step: 'guest',
      vehicle: vehicleForForm || 'Sedan',
      name: lead.customerName || '',
      phone: lead.phone || '',
      date: lead.travelDate || '',
      time: lead.travelTime || '',
      from: lead.pickup || 'Vizag',
    });
    if (fare > 0) q.set('fare', String(Math.round(fare)));
    if (distanceKm > 0) q.set('km', String(Math.round(distanceKm)));
    if (lead.meta?.lastTourId) q.set('tourId', String(lead.meta.lastTourId));
    return `${siteBaseUrl()}/tours/${tourCheckoutSlug(lead)}?${q.toString()}`;
  }

  let tripType = 'outstation';
  if (/airport|vtz/i.test(hay)) tripType = 'airport';

  if ((!fare || fare <= 0 || !distanceKm) && lead.pickup && lead.dropoff) {
    try {
      const quote = await quoteOutstationRoute({
        from: lead.pickup,
        to: lead.dropoff,
        tripMode: 'one-way',
      });
      if (!isRestrictedAirportRouteQuote(quote)) {
        distanceKm = quote.distanceKm || distanceKm;
        if (/airport|vtz/i.test(hay) || quote.pricingModel === 'airport') tripType = 'airport';
        const vehicleNeedle = vehicleForForm.toLowerCase();
        const hit =
          quote.quotes.find((q) => {
            const label = q.label.toLowerCase();
            const id = q.vehicleId.toLowerCase();
            if (vehicleNeedle.includes('innova') || vehicleNeedle.includes('crysta')) {
              return label.includes('innova') || id.includes('innova');
            }
            if (vehicleNeedle.includes('ertiga')) return label.includes('ertiga') || id.includes('ertiga');
            if (vehicleNeedle.includes('tempo')) return label.includes('tempo') || id.includes('tempo');
            if (vehicleNeedle.includes('urbania') || vehicleNeedle.includes('bus')) {
              return label.includes('urbania') || id.includes('bus');
            }
            if (vehicleNeedle.includes('sedan') || vehicleNeedle.includes('dzire')) {
              return label.includes('sedan') || label.includes('dzire') || id.includes('sedan');
            }
            return label.includes(vehicleNeedle) || vehicleNeedle.includes(label.split(' ')[0]!);
          }) || quote.quotes[0];
        if (hit) fare = hit.total;
        if (!fare && quote.quotes[0]) fare = quote.quotes[0].total;
      }
    } catch (err) {
      console.error('[ai.assistant] checkout fare lookup failed', err);
    }
  } else if (distanceKm > 0 && distanceKm <= 35) {
    tripType = 'airport';
  }

  if (distanceKm > 0 && distanceKm <= 35) tripType = 'airport';

  const q = new URLSearchParams({
    search: '1',
    step: 'guest',
    source: 'vth_ai',
    from: lead.pickup || '',
    to: lead.dropoff || '',
    date: lead.travelDate || '',
    time: lead.travelTime || '',
    vehicle: vehicleForForm,
    name: lead.customerName || '',
    phone: lead.phone || '',
    tripType,
    tripMode: 'one-way',
  });
  if (fare > 0) q.set('fare', String(Math.round(fare)));
  if (distanceKm > 0) q.set('km', String(Math.round(distanceKm)));
  return `${siteBaseUrl()}/?${q.toString()}`;
}

export async function formatBookingLinkReply(lead: AiLeadState): Promise<string> {
  // Never show "Outstation" as the vehicle on the summary
  if (isTripCategoryLabel(lead.vehicle)) {
    lead.vehicle = 'Sedan';
  } else if (!lead.vehicle) {
    lead.vehicle = 'Sedan';
  }
  // Refresh tour package fare for the chosen vehicle before building the link
  if (isTourLead(lead) && lead.meta?.lastTourPackageFares) {
    const picked = pickTourFareForVehicle(
      lead.meta.lastTourPackageFares as Record<string, number>,
      lead.vehicle,
    );
    if (picked > 0) lead.meta.lastQuotedFare = picked;
  }
  const checkout = await buildBookingCheckoutUrl(lead);
  lead.meta = { ...(lead.meta || {}), checkoutUrl: checkout };
  const distanceKm = Number(lead.meta?.lastQuotedKm) || 0;
  const packageFare = Number(lead.meta?.lastQuotedFare) || 0;
  const tripLabel =
    isTourLead(lead)
      ? 'Tour package'
      : distanceKm > 0 && distanceKm <= 35
        ? 'Local / airport transfer'
        : /airport|vtz/i.test(`${lead.pickup} ${lead.dropoff}`)
          ? 'Airport transfer'
          : 'Outstation';
  const fareLine =
    isTourLead(lead) && packageFare > 0
      ? `• Package fare: ₹${packageFare.toLocaleString('en-IN')}\n`
      : '';
  return (
    `Thanks${lead.customerName ? `, ${lead.customerName}` : ''}! Your trip details are ready.\n\n` +
    `Open this link to finish booking on our website (guest details, GST, payment):\n` +
    `${checkout}\n\n` +
    `Summary:\n` +
    `• Name: ${lead.customerName}\n` +
    `• Phone: ${lead.phone}\n` +
    `• Pickup: ${lead.pickup}\n` +
    `• Dropoff: ${lead.dropoff}\n` +
    `• Date: ${lead.travelDate || 'Not set'}\n` +
    `• Time: ${lead.travelTime || 'Not set'}\n` +
    `• Vehicle: ${lead.vehicle}\n` +
    `• Trip type: ${tripLabel}\n` +
    fareLine +
    `\nYour booking is confirmed only after you complete the form on the website. Call +91 99663 63662 anytime.`
  );
}

async function fallbackReply(message: string, lead: AiLeadState): Promise<string> {
  if (isBookIntent(message)) {
    // History not available here — caller should sync first; still refuse garbage places
    if (!lead.pickup || !lead.dropoff || isGarbagePlace(lead.pickup) || isGarbagePlace(lead.dropoff)) {
      return 'Sure — which pickup and drop should I book? (e.g. Kailasapuram to Vizianagaram)';
    }
    if (!lead.customerName) return 'What is your name for the booking?';
    if (!lead.phone) return `Thanks${lead.customerName ? `, ${lead.customerName}` : ''}! Please share your 10-digit mobile number.`;
    if (!normalizeTravelDate(lead.travelDate)) {
      return `Got it — ${lead.pickup} → ${lead.dropoff}. Which travel date do you need? (e.g. tomorrow or 25-07-2026)`;
    }
    lead.travelDate = normalizeTravelDate(lead.travelDate);
    if (!lead.vehicle) lead.vehicle = 'Sedan';
    if (!lead.travelTime) lead.travelTime = 'To be confirmed';
    return await formatBookingLinkReply(lead);
  }

  const engine = await tryFareEngineReply(message, {
    lastTourId: typeof lead.meta?.lastTourId === 'string' ? lead.meta.lastTourId : null,
  });
  if (engine?.reply) {
    if (engine.lastTourId) {
      applyTourQuoteToLead(lead, {
        tourId: engine.lastTourId,
        title: engine.reply.split('\n')[0] || engine.lastTourId,
        distanceKm: (() => {
          const m = engine.reply.match(/~?(\d+)\s*km/i);
          return m ? Number(m[1]) : undefined;
        })(),
        quotedFare: (() => {
          const m = engine.reply.match(/\bSedan\b[^₹\n]*₹\s*([\d,]+)/i);
          return m ? Number(m[1]!.replace(/,/g, '')) : undefined;
        })(),
        quoteText: engine.reply,
      });
    }
    if (engine.pickup) lead.pickup = engine.pickup;
    if (engine.dropoff) lead.dropoff = engine.dropoff;
    if (engine.quotedFare || engine.quotedKm) {
      lead.meta = {
        ...(lead.meta || {}),
        lastQuotedKind: lead.meta?.lastQuotedKind || 'route',
        lastQuotedFare: engine.quotedFare ?? lead.meta?.lastQuotedFare,
        lastQuotedKm: engine.quotedKm ?? lead.meta?.lastQuotedKm,
      };
    }
    return engine.reply;
  }
  const lower = message.toLowerCase();

  // If lead already has pickup/drop and visitor asks cost, quote via booking engine
  if (lead.pickup && lead.dropoff && isPricingIntent(lower)) {
    try {
      const quote = await quoteOutstationRoute({
        from: lead.pickup,
        to: lead.dropoff,
        tripMode: /round\s*-?\s*trip|return/i.test(message) ? 'round-trip' : 'one-way',
        calendarDays: extractCalendarDays(message) || undefined,
      });
      if (isRestrictedAirportRouteQuote(quote)) {
        return formatRouteQuoteReply(quote);
      }
      if (quote.quotes.length) {
        lead.meta = {
          ...(lead.meta || {}),
          lastQuotedFare: quote.quotes[0]?.total,
          lastQuotedKm: quote.distanceKm,
        };
        return formatRouteQuoteReply(quote);
      }
    } catch (err) {
      console.error('[ai.assistant] lead route quote failed', err);
    }
  }

  if (isCityToCityQuery(lower) || isPricingIntent(lower)) {
    return 'Please share pickup location, drop location, one-way or round-trip, and preferred vehicle. I will quote the same live fare as the website booking form.';
  }

  if (/airport|vtz/.test(lower)) {
    if (lead.pickup && lead.dropoff && !isGarbagePlace(lead.pickup) && !isGarbagePlace(lead.dropoff)) {
      try {
        const quote = await quoteOutstationRoute({
          from: lead.pickup,
          to: lead.dropoff,
          tripMode: 'one-way',
        });
        if (quote.quotes.length) return formatRouteQuoteReply(quote);
      } catch {
        // continue
      }
    }
    if (lead.pickup && !lead.dropoff) {
      return `Pickup noted: ${lead.pickup}. What is the drop — Vizag Airport or another point? Also share date and vehicle.`;
    }
    return (
      `Sure — for Vizag Airport transfers, please share pickup, drop, date, pickup time, and preferred vehicle. ` +
      `I will quote the exact live fare. Or call +91 99663 63662.`
    );
  }

  if (!lead.pickup || isGarbagePlace(lead.pickup)) {
    lead.pickup = null;
    return 'Got it. Where should we pick you up?';
  }
  if (!lead.dropoff || isGarbagePlace(lead.dropoff)) {
    lead.dropoff = null;
    return 'And what is your drop / destination?';
  }
  if (!lead.travelDate) return 'Which date do you need the cab?';
  if (!lead.travelTime) {
    return 'What pickup time should we schedule? (e.g. 10:30 AM or 14:00)';
  }
  if (!lead.vehicle) {
    return `Which vehicle do you prefer? Options: Sedan, Ertiga, Innova Crysta, Luxury Sedan, Tempo Traveller, Urbania.`;
  }
  return await formatBookingLinkReply(lead);
}

function isBookingDetailContinuation(message: string): boolean {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();
  if (extractTravelTime(trimmed)) return true;
  if (normalizeTravelDate(trimmed)) return true;
  if (isVehicleOnlyAnswer(trimmed)) return true;
  if (/(?:\+?91[-\s]?)?[6-9]\d{9}\b/.test(trimmed)) return true;
  // Short time-only answers
  if (/^(morning|afternoon|evening|night|\d{1,2}([:.]\d{2})?\s*(am|pm)?)$/i.test(trimmed)) {
    return true;
  }
  // Explicit booking field updates
  if (/^(my name is|i am|i'm|name is|phone|mobile|date|time|pickup time)\b/i.test(lower)) {
    return true;
  }
  // Comma-separated booking dump: Name, phone, date, vehicle
  if (
    /[6-9]\d{9}/.test(trimmed) ||
    (/,/.test(trimmed) &&
      /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|sedan|ertiga|innova|tempo|urbania)\b/i.test(trimmed))
  ) {
    return true;
  }
  return false;
}

/**
 * Pure lead update from one visitor message (no DB / LLM).
 * Used by generateAssistantReply and offline regression tests.
 */
export function applyVisitorMessageToLead(
  lead: AiLeadState,
  visitorMessage: string,
  history: Array<{ role: string; content: string }> = [],
): AiLeadState {
  const extracted = heuristicExtract(visitorMessage, lead);
  const prevPickup = lead.pickup;
  const prevDrop = lead.dropoff;
  Object.assign(lead, {
    customerName: extracted.customerName ?? lead.customerName,
    phone: extracted.phone ?? lead.phone,
    pickup: extracted.pickup ?? lead.pickup,
    dropoff: extracted.dropoff ?? lead.dropoff,
    travelDate: extracted.travelDate !== undefined ? extracted.travelDate : lead.travelDate,
    travelTime: extracted.travelTime !== undefined ? extracted.travelTime : lead.travelTime,
    vehicle: extracted.vehicle !== undefined ? extracted.vehicle : lead.vehicle,
  });
  // Never keep chat junk as places ("I need vehicle", uncleaned "Pickup location is at …")
  if (isGarbagePlace(lead.pickup)) lead.pickup = null;
  if (isGarbagePlace(lead.dropoff)) lead.dropoff = null;
  // Route changed → stale km/fare must not force "local transfer" checkout
  if (
    (lead.pickup && lead.pickup !== prevPickup) ||
    (lead.dropoff && lead.dropoff !== prevDrop)
  ) {
    if (lead.meta) {
      delete lead.meta.lastQuotedFare;
      delete lead.meta.lastQuotedKm;
    }
  }
  lead.travelDate = normalizeTravelDate(lead.travelDate);

  // If AI just asked for pickup/drop, treat short replies as that field
  const lastAsst = [...history].reverse().find((m) => m.role === 'assistant');
  const lastQ = (lastAsst?.content || '').toLowerCase();
  if (
    looksLikePlaceAnswer(visitorMessage) &&
    !extracted.travelDate &&
    !extracted.travelTime &&
    !extracted.vehicle
  ) {
    const place = cleanStandalonePlace(visitorMessage);
    if (place && !isGarbagePlace(place)) {
      if (/pick you up|pickup location|where should we pick|pickup area|share:\s*\n?.*pickup/i.test(lastQ)) {
        lead.pickup = place;
      } else if (/drop|destination/.test(lastQ) && (!lead.dropoff || isGarbagePlace(lead.dropoff))) {
        lead.dropoff = place;
      } else if (!lead.pickup || isGarbagePlace(lead.pickup)) {
        lead.pickup = place;
      } else if (!lead.dropoff || isGarbagePlace(lead.dropoff)) {
        lead.dropoff = place;
      }
    }
  }

  // If AI asked for date/time/vehicle, lock those answers (don't let place logic override)
  if (/which date|travel date|what date/.test(lastQ) && extracted.travelDate) {
    lead.travelDate = extracted.travelDate;
  }
  if (/pickup time|what time|schedule/.test(lastQ) && extracted.travelTime) {
    lead.travelTime = extracted.travelTime;
  }
  if (/which vehicle|prefer\?|options: sedan/.test(lastQ) && extracted.vehicle) {
    lead.vehicle = extracted.vehicle;
  }

  return lead;
}

function completeAirportPair(lead: AiLeadState, message: string): void {
  const trimmed = message.trim();
  if (isBareAirportToken(trimmed)) {
    if (lead.pickup && !/airport|vtz|bhogapuram/i.test(lead.pickup)) {
      lead.dropoff = 'Visakhapatnam Airport';
    } else if (lead.dropoff && !/airport|vtz|bhogapuram/i.test(lead.dropoff) && (!lead.pickup || isGarbagePlace(lead.pickup))) {
      lead.pickup = 'Visakhapatnam Airport';
    }
    return;
  }
  if (/\bbhogapuram\b/i.test(trimmed) && /\bairport\b/i.test(trimmed) && lead.pickup && !/airport|bhogapuram/i.test(lead.pickup)) {
    lead.dropoff = 'Bhogapuram, Andhra Pradesh, India';
  }
}

export async function generateAssistantReply(input: {
  siteId: string;
  conversationId: string;
  visitorId: string;
  visitorMessage: string;
  history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
}): Promise<AssistantTurnResult> {
  const lead = await getOrCreateLead({
    siteId: input.siteId,
    conversationId: input.conversationId,
    visitorId: input.visitorId,
  });

  // Pre-chat gate already collected name/phone on the visitor record
  await seedLeadFromVisitor(lead, input.visitorId);

  applyVisitorMessageToLead(lead, input.visitorMessage, input.history);
  completeAirportPair(lead, input.visitorMessage);

  const llmReady = hasLlmConfigured();
  let reply: string;
  let suggestTransfer = false;

  const historyText = input.history
    .slice(-8)
    .map((m) => m.content)
    .join('\n');

  // Visitor asked for a human — skip fare quotes / LLM route guessing
  if (isHumanHandoffIntent(input.visitorMessage)) {
    await saveLead(lead, input.siteId, input.conversationId, input.visitorId);
    return {
      reply:
        `Sure — connecting you to our team. An operator will reply here shortly.\n` +
        `You can also call +91 99663 63662 anytime.`,
      lead,
      leadComplete: isLeadComplete(lead),
      suggestTransfer: true,
    };
  }

  const special = await specialIntentReply(input.visitorMessage, lead, historyText);
  if (special) {
    await saveLead(lead, input.siteId, input.conversationId, input.visitorId);
    return {
      reply: special,
      lead,
      leadComplete: isLeadComplete(lead),
      suggestTransfer: false,
    };
  }

  // "kindly book it" → checkout link using LATEST quoted tour/route (not a stale prior hop)
  if (isBookIntent(input.visitorMessage)) {
    syncLeadFromLatestQuote(lead, input.history);
    if (!lead.pickup || !lead.dropoff) {
      const fromHist = extractRouteFromHistory(input.history);
      if (fromHist) {
        lead.pickup = fromHist.from;
        lead.dropoff = fromHist.to;
      }
    }
    if (isGarbagePlace(lead.pickup)) lead.pickup = null;
    if (isGarbagePlace(lead.dropoff)) lead.dropoff = null;
    lead.travelDate = normalizeTravelDate(lead.travelDate);
    if (canSendCheckoutLink(lead) && !lead.travelDate) {
      reply = `Got it — ${lead.pickup} → ${lead.dropoff}. Which travel date do you need? (e.g. tomorrow or 25-07-2026)`;
      suggestTransfer = false;
      await saveLead(lead, input.siteId, input.conversationId, input.visitorId);
      return { reply, lead, leadComplete: false, suggestTransfer };
    }
    if (canSendCheckoutLink(lead) && lead.travelDate) {
      if (!lead.vehicle) lead.vehicle = 'Sedan';
      if (!lead.travelTime) lead.travelTime = 'To be confirmed';
      reply = await formatBookingLinkReply(lead);
      suggestTransfer = true;
      await saveLead(lead, input.siteId, input.conversationId, input.visitorId);
      return {
        reply,
        lead,
        leadComplete: isLeadComplete(lead),
        suggestTransfer,
      };
    }
    reply = await fallbackReply(input.visitorMessage, lead);
    await saveLead(lead, input.siteId, input.conversationId, input.visitorId);
    return {
      reply,
      lead,
      leadComplete: isLeadComplete(lead),
      suggestTransfer: false,
    };
  }

  if (
    lead.pickup &&
    lead.dropoff &&
    !isGarbagePlace(lead.pickup) &&
    !isGarbagePlace(lead.dropoff) &&
    (isBareAirportToken(input.visitorMessage) || isAirportDropOrPickup(input.visitorMessage))
  ) {
    try {
      const quote = await quoteOutstationRoute({
        from: lead.pickup,
        to: lead.dropoff,
        tripMode: 'one-way',
      });
      if (quote.quotes.length) {
        lead.meta = {
          ...(lead.meta || {}),
          lastQuotedKind: 'route',
          lastQuotedFare: quote.quotes[0]?.total,
          lastQuotedKm: quote.distanceKm,
        };
        await saveLead(lead, input.siteId, input.conversationId, input.visitorId);
        return {
          reply: formatRouteQuoteReply(quote),
          lead,
          leadComplete: isLeadComplete(lead),
          suggestTransfer: false,
        };
      }
    } catch (err) {
      console.error('[ai.assistant] airport pair quote failed', err);
    }
  }

  const engineReply = await tryFareEngineReply(input.visitorMessage, {
    lastTourId: typeof lead.meta?.lastTourId === 'string' ? lead.meta.lastTourId : null,
    historyText,
  });
  if (engineReply?.reply) {
    reply = engineReply.reply;
    suggestTransfer = false;
    if (engineReply.lastTourId) {
      applyTourQuoteToLead(lead, {
        tourId: engineReply.lastTourId,
        title: engineReply.reply.split('\n')[0] || engineReply.lastTourId,
        distanceKm: (() => {
          const m = engineReply.reply.match(/~?(\d+)\s*km/i);
          return m ? Number(m[1]) : undefined;
        })(),
        quotedFare: (() => {
          const m = engineReply.reply.match(/\bSedan\b[^₹\n]*₹\s*([\d,]+)/i);
          return m ? Number(m[1]!.replace(/,/g, '')) : undefined;
        })(),
        quoteText: engineReply.reply,
      });
      // Tour quotes must not be overwritten by route fare fields
    } else if (engineReply.quotedFare != null || engineReply.quotedKm != null) {
      lead.meta = {
        ...(lead.meta || {}),
        lastQuotedKind: lead.meta?.lastQuotedKind || 'route',
        lastQuotedFare: engineReply.quotedFare ?? lead.meta?.lastQuotedFare,
        lastQuotedKm: engineReply.quotedKm ?? lead.meta?.lastQuotedKm,
      };
    }
    if (engineReply.pickup) lead.pickup = engineReply.pickup;
    if (engineReply.dropoff) lead.dropoff = engineReply.dropoff;
  } else if (!llmReady) {
    reply = await fallbackReply(input.visitorMessage, lead);
    suggestTransfer = isLeadComplete(lead) || /human|agent|operator|person|call me/i.test(input.visitorMessage);
  } else {
    const liveBrief = await buildLiveRateCardBrief();
    const system = `${PRICING_KNOWLEDGE}

${liveBrief}

Current lead state (JSON):
${JSON.stringify({
  customerName: lead.customerName,
  phone: lead.phone,
  pickup: lead.pickup,
  dropoff: lead.dropoff,
  travelDate: lead.travelDate,
  travelTime: lead.travelTime,
  vehicle: lead.vehicle,
})}

Respond ONLY with compact JSON:
{
  "reply": "message to visitor",
  "customerName": "string or null",
  "phone": "string or null",
  "pickup": "string or null",
  "dropoff": "string or null",
  "travelDate": "YYYY-MM-DD or natural date string or null",
  "travelTime": "pickup time like 10:30 AM or 14:00 or null",
  "vehicle": "category or null",
  "suggestTransfer": true/false
}
Merge any newly provided fields; keep previous values when not updated.
IMPORTANT: customerName and phone are often already collected before chat — never ask for name/phone again if they appear in lead state.
IMPORTANT: If the visitor says "book it" / "kindly book" and pickup+drop are known, tell them you will share the website checkout link (do not invent confirmation).
IMPORTANT: Answer the visitor's LATEST message first. If they ask about a new trip, tour, package, or route, do NOT reuse unrelated old pickup/drop from lead state in the reply — quote the relevant tour/fares instead.
If name/phone/date/vehicle are present but pickup TIME is missing, and the visitor is continuing that same booking (not asking a new trip question), ask for pickup time before confirming.
NEVER say the booking is confirmed, finalized, or that driver details will be sent. When all fields are collected, tell them you will share a website checkout link — do not invent a confirmation message yourself.`;

    try {
      const parsed =
        (await callGeminiJson({
          system,
          history: input.history,
          userMessage: input.visitorMessage,
        })) ||
        (await callOpenAiJson({
          system,
          history: input.history,
          userMessage: input.visitorMessage,
        })) ||
        {};
      reply = strOrNull(parsed.reply) || (await fallbackReply(input.visitorMessage, lead));
      lead.customerName = strOrNull(parsed.customerName) ?? lead.customerName;
      lead.phone = normalizePhone(strOrNull(parsed.phone) ?? lead.phone);
      lead.pickup = strOrNull(parsed.pickup) ?? lead.pickup;
      lead.dropoff = strOrNull(parsed.dropoff) ?? lead.dropoff;
      if (isGarbagePlace(lead.pickup)) lead.pickup = null;
      if (isGarbagePlace(lead.dropoff)) lead.dropoff = null;
      lead.travelDate = normalizeTravelDate(strOrNull(parsed.travelDate) ?? lead.travelDate);
      lead.travelTime =
        normalizeTravelTime(strOrNull(parsed.travelTime)) ?? lead.travelTime;
      lead.vehicle = strOrNull(parsed.vehicle) ?? lead.vehicle;
      suggestTransfer = Boolean(parsed.suggestTransfer) || isLeadComplete(lead);
    } catch (err) {
      console.error('[ai.assistant] LLM error', err);
      reply = await fallbackReply(input.visitorMessage, lead);
      suggestTransfer = isLeadComplete(lead);
    }
  }

  lead.travelDate = normalizeTravelDate(lead.travelDate);

  // Only nag for pickup time when the visitor is continuing THAT booking — never overwrite a fare/tour answer
  const continuingBooking = isBookingDetailContinuation(input.visitorMessage);
  if (
    !engineReply?.reply &&
    continuingBooking &&
    lead.customerName &&
    lead.phone &&
    lead.pickup &&
    lead.dropoff &&
    lead.travelDate &&
    lead.vehicle &&
    !lead.travelTime
  ) {
    reply =
      `Thanks${lead.customerName ? `, ${lead.customerName}` : ''}! I have your details except pickup time.\n` +
      `• Pickup: ${lead.pickup}\n` +
      `• Dropoff: ${lead.dropoff}\n` +
      `• Date: ${lead.travelDate}\n` +
      `• Vehicle: ${lead.vehicle}\n` +
      `What time should we pick you up? (e.g. 10:30 AM or 14:00)`;
    suggestTransfer = false;
  }

  const leadComplete = isLeadComplete(lead);
  // Only emit checkout link on explicit book intent — never for "Araku Valley" / place messages
  if (
    leadComplete &&
    lead.status !== 'transferred' &&
    !engineReply?.reply &&
    isBookIntent(input.visitorMessage)
  ) {
    lead.status = 'complete';
    suggestTransfer = true;
    reply = await formatBookingLinkReply(lead);
  }

  await saveLead(lead, input.siteId, input.conversationId, input.visitorId);

  return { reply, lead, leadComplete, suggestTransfer };
}

export async function markLeadTransferred(leadId: string): Promise<void> {
  await query(`UPDATE va_ai_leads SET status = 'transferred' WHERE id = :id`, { id: leadId });
}

export function siteHasAiEnabled(flags: { ai_chat_enabled?: number | boolean }): boolean {
  return Boolean(flags.ai_chat_enabled);
}
