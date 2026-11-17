/**
 * Track WhatsApp / Call CTA clicks into Google Analytics 4 (`window.gtag`)
 * and Visitor Analytics (`vth:track`).
 *
 * GA4 events emitted: `whatsapp_click` and `phone_click`.
 */
export type ContactCtaKind = 'whatsapp' | 'phone';

export interface TrackContactCtaMeta {
  name?: string;
  path?: string;
  skipVisitorAnalytics?: boolean;
  [key: string]: unknown;
}

const STAFF_PATH_PREFIXES = ['/admin', '/driver', '/event/share', '/ride/', '/vendor'];

let lastGaEventKey = '';
let lastGaEventAt = 0;

function isStaffPathname(pathname: string): boolean {
  return STAFF_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function classifyContactHref(href: string | null | undefined): ContactCtaKind | null {
  if (!href) return null;
  const h = href.trim().toLowerCase();
  if (h.startsWith('tel:')) return 'phone';
  if (
    h.includes('wa.me/') ||
    h.includes('api.whatsapp.com') ||
    h.includes('whatsapp.com/send') ||
    h.startsWith('whatsapp:')
  ) {
    return 'whatsapp';
  }
  return null;
}

function reportContactCtaToGa(
  type: 'whatsapp_click' | 'phone_click',
  name: string,
  path: string | undefined,
): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

  const now = Date.now();
  const dedupKey = `${type}:${path || ''}`;
  if (dedupKey === lastGaEventKey && now - lastGaEventAt < 400) {
    return;
  }
  lastGaEventKey = dedupKey;
  lastGaEventAt = now;

  try {
    window.gtag('event', type, {
      event_category: 'contact',
      event_label: name,
      cta_location: name,
      page_path: path,
      transport_type: 'beacon',
      value: 1,
      currency: 'INR',
    });
  } catch {
    // Ignore analytics errors
  }
}

export function trackContactCta(
  kind: ContactCtaKind,
  meta?: TrackContactCtaMeta,
): void {
  if (typeof document === 'undefined') return;

  const type = kind === 'whatsapp' ? 'whatsapp_click' : 'phone_click';
  const name =
    meta?.name || (kind === 'whatsapp' ? 'whatsapp_cta' : 'call_cta');
  const path =
    meta?.path ||
    (typeof window !== 'undefined' ? window.location.pathname : undefined);

  reportContactCtaToGa(type, name, path);

  if (meta?.skipVisitorAnalytics) return;

  try {
    const { skipVisitorAnalytics: _skip, ...eventMeta } = meta || {};
    document.dispatchEvent(
      new CustomEvent('vth:track', {
        detail: {
          type,
          name,
          meta: { ...eventMeta, path },
        },
      }),
    );
  } catch {
    // Tracker may not be loaded yet — ignore
  }
}

/**
 * Installs a single document-level click listener so all declarative `<a href="tel:...">`
 * and `<a href="https://wa.me/...">` links across public pages emit GA4 events.
 * Visitor Analytics already captures anchor clicks natively, so `vth:track` is skipped here.
 */
export function installGlobalContactCtaGaListener(): () => void {
  if (typeof document === 'undefined') return () => undefined;

  const handleClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const anchor = target.closest('a[href]');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    const kind = classifyContactHref(href);
    if (!kind) return;

    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    if (isStaffPathname(pathname)) return;

    const explicitName =
      anchor.getAttribute('data-cta-name') ||
      anchor.getAttribute('aria-label') ||
      anchor.textContent?.trim().slice(0, 60);

    const fallbackName = kind === 'whatsapp' ? 'whatsapp_link' : 'phone_link';
    const cleanName = explicitName
      ? explicitName.replace(/\s+/g, ' ').trim()
      : fallbackName;

    trackContactCta(kind, {
      name: cleanName || fallbackName,
      path: pathname,
      skipVisitorAnalytics: true,
    });
  };

  document.addEventListener('click', handleClick, true);
  return () => {
    document.removeEventListener('click', handleClick, true);
  };
}
