import { createHash, randomUUID } from 'node:crypto';
import type { Request } from 'express';
import { env } from '../config/env.js';
import type { DeviceInfo, DeviceType, GeoInfo, UtmInfo } from '../types/index.js';

export function newId(): string {
  return randomUUID();
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(`${env.IP_HASH_SALT}:${ip}`).digest('hex');
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]!.trim();
  }
  return req.socket.remoteAddress || '0.0.0.0';
}

export function parseDeviceType(width: number | null | undefined, ua: string): DeviceType {
  const lower = ua.toLowerCase();
  if (/ipad|tablet|kindle|silk/.test(lower)) return 'tablet';
  if (/mobi|iphone|android(?!.*tablet)/.test(lower)) return 'mobile';
  if (width != null) {
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
  }
  return 'desktop';
}

export function parseUserAgent(ua: string, screenWidth?: number | null, screenHeight?: number | null): DeviceInfo {
  const browserMatch =
    ua.match(/(Edg|Edge)\/([\d.]+)/) ||
    ua.match(/(Chrome)\/([\d.]+)/) ||
    ua.match(/(Firefox)\/([\d.]+)/) ||
    ua.match(/(Safari)\/([\d.]+)/) ||
    ua.match(/(OPR|Opera)\/([\d.]+)/);

  let browser: string | null = null;
  let browserVersion: string | null = null;
  if (browserMatch) {
    browser = browserMatch[1] === 'OPR' ? 'Opera' : browserMatch[1]!.replace('Edg', 'Edge');
    browserVersion = browserMatch[2] ?? null;
  }

  let os: string | null = null;
  if (/Windows NT/i.test(ua)) os = 'Windows';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iOS/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  return {
    browser,
    browserVersion,
    os,
    deviceType: parseDeviceType(screenWidth ?? null, ua),
    screenWidth: screenWidth ?? null,
    screenHeight: screenHeight ?? null,
    language: null,
    userAgent: ua,
  };
}

function firstParam(u: URL, keys: string[]): string | null {
  for (const key of keys) {
    const v = u.searchParams.get(key);
    if (v) return v;
  }
  return null;
}

/** Parse UTM / Google Ads auto-tag params from a URL or path. */
export function parseUtm(urlOrPath: string, referrer?: string | null): UtmInfo {
  let landingPage = urlOrPath || '';
  let utmSource: string | null = null;
  let utmMedium: string | null = null;
  let utmCampaign: string | null = null;
  let utmTerm: string | null = null;
  let utmContent: string | null = null;
  let gclid: string | null = null;
  let gadSource: string | null = null;
  let gadCampaignId: string | null = null;

  if (urlOrPath) {
    try {
      const base = urlOrPath.startsWith('http')
        ? urlOrPath
        : `https://vizagtaxihub.com${urlOrPath.startsWith('/') ? '' : '/'}${urlOrPath}`;
      const u = new URL(base);
      landingPage = `${u.pathname}${u.search}`;
      utmSource = u.searchParams.get('utm_source');
      utmMedium = u.searchParams.get('utm_medium');
      utmCampaign = u.searchParams.get('utm_campaign');
      utmTerm = u.searchParams.get('utm_term');
      utmContent = u.searchParams.get('utm_content');
      gclid = firstParam(u, ['gclid', 'gbraid', 'wbraid']);
      gadSource = u.searchParams.get('gad_source');
      gadCampaignId = u.searchParams.get('gad_campaignid');
    } catch {
      // keep defaults
    }
  }

  // Auto-tagging often has gad_source / gclid without classic UTMs
  if ((gadSource || gclid) && !utmSource) {
    utmSource = 'google';
    utmMedium = utmMedium || 'cpc';
  }
  if ((gadSource || gclid) && !utmCampaign && gadCampaignId) {
    utmCampaign = `gad:${gadCampaignId}`;
  }

  return {
    utmSource,
    utmMedium,
    utmCampaign,
    utmTerm,
    utmContent,
    gclid,
    gadSource,
    gadCampaignId,
    referrer: referrer || null,
    landingPage,
  };
}

/** Merge stored session columns with params parsed from landing/exit URLs. */
export function resolveSessionAttribution(input: {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  gclid?: string | null;
  gadSource?: string | null;
  gadCampaignId?: string | null;
  referrer?: string | null;
  landingPage?: string | null;
  entryUrl?: string | null;
  exitPage?: string | null;
}): UtmInfo {
  const fromLanding = parseUtm(input.landingPage || '', null);
  const fromEntry = parseUtm(input.entryUrl || '', null);
  const fromExit = parseUtm(input.exitPage || '', null);
  const pick = <T,>(...vals: Array<T | null | undefined>): T | null => {
    for (const v of vals) {
      if (v != null && String(v).trim() !== '') return v as T;
    }
    return null;
  };

  const merged = parseUtm('', input.referrer);
  merged.utmSource = pick(input.utmSource, fromLanding.utmSource, fromEntry.utmSource, fromExit.utmSource);
  merged.utmMedium = pick(input.utmMedium, fromLanding.utmMedium, fromEntry.utmMedium, fromExit.utmMedium);
  merged.utmCampaign = pick(
    input.utmCampaign,
    fromLanding.utmCampaign,
    fromEntry.utmCampaign,
    fromExit.utmCampaign,
  );
  merged.utmTerm = pick(input.utmTerm, fromLanding.utmTerm, fromEntry.utmTerm, fromExit.utmTerm);
  merged.utmContent = pick(
    input.utmContent,
    fromLanding.utmContent,
    fromEntry.utmContent,
    fromExit.utmContent,
  );
  merged.gclid = pick(input.gclid, fromLanding.gclid, fromEntry.gclid, fromExit.gclid);
  merged.gadSource = pick(
    input.gadSource,
    fromLanding.gadSource,
    fromEntry.gadSource,
    fromExit.gadSource,
  );
  merged.gadCampaignId = pick(
    input.gadCampaignId,
    fromLanding.gadCampaignId,
    fromEntry.gadCampaignId,
    fromExit.gadCampaignId,
  );
  merged.referrer = input.referrer || null;
  merged.landingPage = input.landingPage || fromLanding.landingPage || fromEntry.landingPage;

  if ((merged.gadSource || merged.gclid) && !merged.utmSource) {
    merged.utmSource = 'google';
    merged.utmMedium = merged.utmMedium || 'cpc';
  }
  if ((merged.gadSource || merged.gclid) && !merged.utmCampaign && merged.gadCampaignId) {
    merged.utmCampaign = `gad:${merged.gadCampaignId}`;
  }

  return merged;
}

/** Normalize session attribution into marketing-friendly buckets. */
export function classifyTrafficSource(input: {
  utmSource?: string | null;
  utmMedium?: string | null;
  gclid?: string | null;
  gadSource?: string | null;
  referrer?: string | null;
  landingPage?: string | null;
  entryUrl?: string | null;
  exitPage?: string | null;
}): string {
  const resolved =
    input.landingPage || input.entryUrl || input.exitPage
      ? resolveSessionAttribution(input)
      : null;
  const source = (resolved?.utmSource || input.utmSource || '').toLowerCase().trim();
  const medium = (resolved?.utmMedium || input.utmMedium || '').toLowerCase().trim();
  const gclid = (resolved?.gclid || input.gclid || '').trim();
  const gadSource = (resolved?.gadSource || input.gadSource || '').trim();
  const ref = (resolved?.referrer || input.referrer || '').toLowerCase();

  if (
    gclid ||
    gadSource ||
    ((source.includes('google') || source === 'adwords' || source === 'googleads') &&
      /cpc|ppc|paid|paidsearch|ads|display/.test(medium))
  ) {
    return 'Google Ads';
  }
  if (source.includes('facebook') || source === 'fb' || source === 'fbads' || medium.includes('facebook')) {
    return 'Facebook';
  }
  if (source.includes('instagram') || source === 'ig' || medium.includes('instagram')) {
    return 'Instagram';
  }
  if (
    (source.includes('google') && (medium === 'organic' || medium === 'seo' || medium === 'organic-search')) ||
    (!source && !gclid && !gadSource && /google\./.test(ref))
  ) {
    return 'Organic Search';
  }
  if (source === 'direct' || (!source && !gclid && !gadSource && !(input.referrer || resolved?.referrer))) {
    return 'Direct';
  }
  if (source) {
    return source.charAt(0).toUpperCase() + source.slice(1);
  }
  if (input.referrer || resolved?.referrer) return 'Referral';
  return 'Direct';
}

export function trafficSourceLabel(utm: UtmInfo): string {
  return classifyTrafficSource({
    utmSource: utm.utmSource,
    utmMedium: utm.utmMedium,
    gclid: utm.gclid,
    gadSource: utm.gadSource,
    referrer: utm.referrer,
    landingPage: utm.landingPage,
  });
}

/** Lightweight geo from Cloudflare / common proxy headers. Falls back to nulls. */
export function geoFromHeaders(req: Request): GeoInfo {
  const country =
    (req.headers['cf-ipcountry'] as string | undefined) ||
    (req.headers['x-vercel-ip-country'] as string | undefined) ||
    (req.headers['x-country-code'] as string | undefined) ||
    null;
  const city =
    (req.headers['cf-ipcity'] as string | undefined) ||
    (req.headers['x-vercel-ip-city'] as string | undefined) ||
    (req.headers['x-city'] as string | undefined) ||
    null;
  const region =
    (req.headers['cf-region'] as string | undefined) ||
    (req.headers['x-vercel-ip-country-region'] as string | undefined) ||
    (req.headers['x-region'] as string | undefined) ||
    null;
  const pincode =
    (req.headers['cf-postal-code'] as string | undefined) ||
    (req.headers['x-vercel-ip-postal-code'] as string | undefined) ||
    (req.headers['x-postal-code'] as string | undefined) ||
    null;
  const timezone =
    (req.headers['x-visitor-timezone'] as string | undefined) ||
    (req.headers['cf-timezone'] as string | undefined) ||
    null;
  return {
    country,
    city,
    region,
    pincode,
    timezone,
    isp: null,
    ipOrg: null,
    isProxy: false,
    isHosting: false,
    isMobileNet: false,
  };
}

export function pathFromUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    if (url.startsWith('http')) return new URL(url).pathname;
    return url.split('?')[0] || url;
  } catch {
    return url;
  }
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function toMysqlDateTime(d: Date = new Date()): string {
  return d.toISOString().slice(0, 23).replace('T', ' ');
}
