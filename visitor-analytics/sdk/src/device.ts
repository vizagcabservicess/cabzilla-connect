import type { DeviceInfo, DeviceType, UtmInfo } from './types';

function parseDeviceType(width: number | null, ua: string): DeviceType {
  const lower = ua.toLowerCase();
  if (/ipad|tablet|kindle|silk/.test(lower)) return 'tablet';
  if (/mobi|iphone|android(?!.*tablet)/.test(lower)) return 'mobile';
  if (width != null) {
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
  }
  return 'desktop';
}

function parseBrowser(ua: string): { browser: string | null; browserVersion: string | null } {
  const match =
    ua.match(/(Edg|Edge)\/([\d.]+)/) ||
    ua.match(/(Chrome)\/([\d.]+)/) ||
    ua.match(/(Firefox)\/([\d.]+)/) ||
    ua.match(/(OPR|Opera)\/([\d.]+)/) ||
    ua.match(/Version\/([\d.]+).*Safari/) ||
    ua.match(/(Safari)\/([\d.]+)/);

  if (!match) return { browser: null, browserVersion: null };

  if (match[0]?.includes('Version/') && /Safari/i.test(ua)) {
    return { browser: 'Safari', browserVersion: match[1] ?? null };
  }

  let browser = match[1]!;
  if (browser === 'OPR') browser = 'Opera';
  if (browser === 'Edg') browser = 'Edge';
  return { browser, browserVersion: match[2] ?? null };
}

function parseOs(ua: string): string | null {
  if (/Windows NT/i.test(ua)) return 'Windows';
  if (/Mac OS X/i.test(ua)) return 'macOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad|iOS/i.test(ua)) return 'iOS';
  if (/Linux/i.test(ua)) return 'Linux';
  if (/CrOS/i.test(ua)) return 'ChromeOS';
  return null;
}

export function collectDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent || '';
  const screenWidth = window.screen?.width ?? null;
  const screenHeight = window.screen?.height ?? null;
  const { browser, browserVersion } = parseBrowser(ua);
  let timezone: string | null = null;
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    timezone = null;
  }

  return {
    browser,
    browserVersion,
    os: parseOs(ua),
    deviceType: parseDeviceType(screenWidth, ua),
    screenWidth,
    screenHeight,
    language: navigator.language || (navigator as Navigator & { userLanguage?: string }).userLanguage || null,
    userAgent: ua,
    timezone,
  };
}

export function collectUtm(referrerOverride?: string | null): UtmInfo {
  const href = location.href;
  let landingPage = location.pathname + location.search;
  let utmSource: string | null = null;
  let utmMedium: string | null = null;
  let utmCampaign: string | null = null;
  let utmTerm: string | null = null;
  let utmContent: string | null = null;
  let gclid: string | null = null;
  let gadSource: string | null = null;
  let gadCampaignId: string | null = null;

  try {
    const u = new URL(href);
    landingPage = `${u.pathname}${u.search}`;
    utmSource = u.searchParams.get('utm_source');
    utmMedium = u.searchParams.get('utm_medium');
    utmCampaign = u.searchParams.get('utm_campaign');
    utmTerm = u.searchParams.get('utm_term');
    utmContent = u.searchParams.get('utm_content');
    gclid =
      u.searchParams.get('gclid') ||
      u.searchParams.get('gbraid') ||
      u.searchParams.get('wbraid');
    gadSource = u.searchParams.get('gad_source');
    gadCampaignId = u.searchParams.get('gad_campaignid');
  } catch {
    // keep defaults
  }

  // Google Ads auto-tagging without classic UTMs
  if ((gadSource || gclid) && !utmSource) {
    utmSource = 'google';
    utmMedium = utmMedium || 'cpc';
  }
  if ((gadSource || gclid) && !utmCampaign && gadCampaignId) {
    utmCampaign = `gad:${gadCampaignId}`;
  }

  // Persist first-touch UTM / Ads params for the session
  const stored = readSessionUtm();
  if (stored && !utmSource && !gclid && !gadSource) {
    return {
      ...stored,
      gclid: stored.gclid ?? null,
      gadSource: stored.gadSource ?? null,
      gadCampaignId: stored.gadCampaignId ?? null,
      referrer: referrerOverride ?? (document.referrer || null),
      landingPage: stored.landingPage || landingPage,
    };
  }

  const info: UtmInfo = {
    utmSource,
    utmMedium,
    utmCampaign,
    utmTerm,
    utmContent,
    gclid,
    gadSource,
    gadCampaignId,
    referrer: referrerOverride ?? (document.referrer || null),
    landingPage,
  };

  if (utmSource || gclid || gadSource || !stored) writeSessionUtm(info);
  return info;
}

const UTM_SESSION_KEY = 'vth_va_utm';

function readSessionUtm(): UtmInfo | null {
  try {
    const raw = sessionStorage.getItem(UTM_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UtmInfo;
  } catch {
    return null;
  }
}

function writeSessionUtm(info: UtmInfo): void {
  try {
    sessionStorage.setItem(UTM_SESSION_KEY, JSON.stringify(info));
  } catch {
    // ignore
  }
}
