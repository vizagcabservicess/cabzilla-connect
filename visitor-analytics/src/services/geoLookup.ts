import type { GeoInfo } from '../types/index.js';

const cache = new Map<string, { geo: GeoInfo; expires: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const EMPTY: GeoInfo = {
  country: null,
  city: null,
  region: null,
  pincode: null,
  timezone: null,
  isp: null,
  ipOrg: null,
  isProxy: false,
  isHosting: false,
  isMobileNet: false,
};

function isPrivateIp(ip: string): boolean {
  const v = ip.trim().toLowerCase();
  if (!v || v === '0.0.0.0' || v === '::' || v === '::1' || v === '127.0.0.1') return true;
  if (v.startsWith('10.') || v.startsWith('192.168.') || v.startsWith('127.')) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(v)) return true;
  if (v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80:')) return true;
  if (v === 'unknown' || v.includes('localhost')) return true;
  return false;
}

function mergeGeo(base: GeoInfo, extra: Partial<GeoInfo>): GeoInfo {
  return {
    country: base.country || extra.country || null,
    city: base.city || extra.city || null,
    region: base.region || extra.region || null,
    pincode: base.pincode || extra.pincode || null,
    timezone: base.timezone || extra.timezone || null,
    isp: base.isp || extra.isp || null,
    ipOrg: base.ipOrg || extra.ipOrg || null,
    isProxy: Boolean(base.isProxy || extra.isProxy),
    isHosting: Boolean(base.isHosting || extra.isHosting),
    isMobileNet: Boolean(base.isMobileNet || extra.isMobileNet),
  };
}

/** Heuristic when provider doesn't flag hosting explicitly. */
function looksLikeHosting(orgOrIsp: string | null | undefined): boolean {
  if (!orgOrIsp) return false;
  const s = orgOrIsp.toLowerCase();
  return /amazon|aws|google cloud|gcp|azure|digitalocean|linode|vultr|hetzner|ovh|contabo|cloudflare|hostinger|colo|datacenter|data center|server|vps|dedicated|leaseweb|choopa|m247|quadranet/.test(
    s,
  );
}

async function lookupIpApi(ip: string): Promise<Partial<GeoInfo>> {
  const url =
    `http://ip-api.com/json/${encodeURIComponent(ip)}` +
    `?fields=status,country,countryCode,regionName,city,zip,timezone,isp,org,as,proxy,hosting,mobile`;
  const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
  if (!res.ok) return {};
  const data = (await res.json()) as {
    status?: string;
    country?: string;
    countryCode?: string;
    regionName?: string;
    city?: string;
    zip?: string;
    timezone?: string;
    isp?: string;
    org?: string;
    as?: string;
    proxy?: boolean;
    hosting?: boolean;
    mobile?: boolean;
  };
  if (data.status !== 'success') return {};
  const ipOrg = data.org || data.as || null;
  const isp = data.isp || null;
  return {
    country: data.countryCode || data.country || null,
    city: data.city || null,
    region: data.regionName || null,
    pincode: data.zip || null,
    timezone: data.timezone || null,
    isp,
    ipOrg,
    isProxy: Boolean(data.proxy),
    isHosting: Boolean(data.hosting) || looksLikeHosting(ipOrg) || looksLikeHosting(isp),
    isMobileNet: Boolean(data.mobile),
  };
}

async function lookupIpInfo(ip: string, token: string): Promise<Partial<GeoInfo>> {
  const url = `https://ipinfo.io/${encodeURIComponent(ip)}/json?token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
  if (!res.ok) return {};
  const data = (await res.json()) as {
    country?: string;
    region?: string;
    city?: string;
    postal?: string;
    timezone?: string;
    org?: string;
    privacy?: { vpn?: boolean; proxy?: boolean; tor?: boolean; hosting?: boolean };
  };
  const ipOrg = data.org || null;
  const privacy = data.privacy;
  return {
    country: data.country || null,
    city: data.city || null,
    region: data.region || null,
    pincode: data.postal || null,
    timezone: data.timezone || null,
    isp: ipOrg,
    ipOrg,
    isProxy: Boolean(privacy?.vpn || privacy?.proxy || privacy?.tor),
    isHosting: Boolean(privacy?.hosting) || looksLikeHosting(ipOrg),
    isMobileNet: false,
  };
}

/**
 * Enrich header-based geo with IP geolocation + fraud signals (proxy / hosting / ISP).
 * Cached per IP for 24h.
 */
export async function enrichGeoFromIp(ip: string, headerGeo: GeoInfo): Promise<GeoInfo> {
  let geo: GeoInfo = {
    ...EMPTY,
    ...headerGeo,
    pincode: headerGeo.pincode ?? null,
    isp: headerGeo.isp ?? null,
    ipOrg: headerGeo.ipOrg ?? null,
    isProxy: Boolean(headerGeo.isProxy),
    isHosting: Boolean(headerGeo.isHosting),
    isMobileNet: Boolean(headerGeo.isMobileNet),
  };

  // Still look up fraud flags even when city/pin already known from CDN
  const needsLookup =
    !geo.city ||
    !geo.pincode ||
    geo.isp == null ||
    (!geo.isProxy && !geo.isHosting); // may still want hosting/proxy flags

  if (isPrivateIp(ip)) return geo;

  const cached = cache.get(ip);
  if (cached && cached.expires > Date.now()) {
    return mergeGeo(geo, cached.geo);
  }

  if (!needsLookup && geo.isp) return geo;

  try {
    const token = (process.env.VA_IPINFO_TOKEN || process.env.IPINFO_TOKEN || '').trim();
    const lookedUp = token ? await lookupIpInfo(ip, token) : await lookupIpApi(ip);
    const resolved = mergeGeo(geo, lookedUp);
    cache.set(ip, { geo: resolved, expires: Date.now() + CACHE_TTL_MS });
    if (cache.size > 5000) {
      const first = cache.keys().next().value;
      if (first) cache.delete(first);
    }
    return resolved;
  } catch {
    return geo;
  }
}

export function formatCityPincode(geo: Pick<GeoInfo, 'city' | 'pincode' | 'region'>): string {
  const city = geo.city || geo.region || null;
  if (city && geo.pincode) return `${city} · ${geo.pincode}`;
  if (city) return city;
  if (geo.pincode) return geo.pincode;
  return 'Unknown city';
}

export function emptyGeo(): GeoInfo {
  return { ...EMPTY };
}
