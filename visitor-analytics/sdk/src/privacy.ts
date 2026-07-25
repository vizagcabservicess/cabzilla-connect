import type { ResolvedConfig } from './types';

const SENSITIVE_NAME_RE =
  /pass(word|wd|code)?|pwd|otp|cvv|cvc|csc|card.?num|cc.?num|credit.?card|pan|ssn|pin|secret|token|cvv2/i;

const AUTOCOMPLETE_BLOCK = new Set([
  'cc-number',
  'cc-csc',
  'cc-exp',
  'cc-exp-month',
  'cc-exp-year',
  'cc-name',
  'cc-type',
  'current-password',
  'new-password',
  'one-time-code',
]);

export function hasConsent(requireConsent: boolean): boolean {
  if (!requireConsent) return true;

  try {
    const w = window as Window & {
      VTH_CONSENT?: boolean | { analytics?: boolean; necessary?: boolean };
      Cookiebot?: { consent?: { statistics?: boolean; marketing?: boolean } };
      __cmp?: unknown;
    };

    if (typeof w.VTH_CONSENT === 'boolean') return w.VTH_CONSENT;
    if (w.VTH_CONSENT && typeof w.VTH_CONSENT === 'object') {
      return w.VTH_CONSENT.analytics === true || w.VTH_CONSENT.necessary === true;
    }

    // Common CMP: Cookiebot
    if (w.Cookiebot?.consent) {
      return Boolean(w.Cookiebot.consent.statistics || w.Cookiebot.consent.marketing);
    }

    // data attribute on html/body
    const el =
      document.documentElement.getAttribute('data-va-consent') ||
      document.body?.getAttribute('data-va-consent');
    if (el === 'granted' || el === 'true' || el === '1') return true;
    if (el === 'denied' || el === 'false' || el === '0') return false;

    // localStorage flag set by site consent banner
    const stored = localStorage.getItem('vth_va_consent');
    if (stored === 'granted' || stored === '1' || stored === 'true') return true;
    if (stored === 'denied' || stored === '0' || stored === 'false') return false;
  } catch {
    // ignore
  }

  return false;
}

export function watchConsent(
  requireConsent: boolean,
  onGranted: () => void,
): () => void {
  if (!requireConsent || hasConsent(true)) {
    onGranted();
    return () => undefined;
  }

  const check = () => {
    if (hasConsent(true)) {
      cleanup();
      onGranted();
    }
  };

  const onStorage = (e: StorageEvent) => {
    if (e.key === 'vth_va_consent') check();
  };

  window.addEventListener('storage', onStorage);
  document.addEventListener('vth:consent', check);
  document.addEventListener('CookiebotOnAccept', check);
  const interval = window.setInterval(check, 1500);

  function cleanup() {
    window.removeEventListener('storage', onStorage);
    document.removeEventListener('vth:consent', check);
    document.removeEventListener('CookiebotOnAccept', check);
    clearInterval(interval);
  }

  return cleanup;
}

export function isSensitiveElement(el: Element | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.hasAttribute('data-va-ignore') || el.closest('[data-va-ignore]')) return true;

  if (el instanceof HTMLInputElement) {
    const type = (el.type || '').toLowerCase();
    if (type === 'password') return true;
    const ac = (el.getAttribute('autocomplete') || '').toLowerCase();
    if (AUTOCOMPLETE_BLOCK.has(ac)) return true;
    if (SENSITIVE_NAME_RE.test(el.name || '') || SENSITIVE_NAME_RE.test(el.id || '')) return true;
  }

  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    if (SENSITIVE_NAME_RE.test(el.name || '') || SENSITIVE_NAME_RE.test(el.id || '')) return true;
  }

  return false;
}

export function shouldMaskElement(el: Element | null, maskSelectors: string[]): boolean {
  if (!el || !(el instanceof Element)) return false;
  if (isSensitiveElement(el)) return true;
  if (el.closest('[data-va-mask], .mask-me')) return true;
  for (const sel of maskSelectors) {
    try {
      if (el.matches(sel) || el.closest(sel)) return true;
    } catch {
      // invalid selector
    }
  }
  return false;
}

export function maskValue(value: string): string {
  if (!value) return '';
  return '*'.repeat(Math.min(value.length, 32));
}

export function safeInputValue(el: Element, maskSelectors: string[]): string {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return '';
  if (isSensitiveElement(el) || shouldMaskElement(el, maskSelectors)) {
    return maskValue(el.value || '');
  }
  const v = el.value || '';
  // Heuristic: long digit runs look like card numbers
  if (/\b\d{12,19}\b/.test(v.replace(/\s+/g, ''))) return maskValue(v);
  return v.length > 200 ? v.slice(0, 200) : v;
}

export function cssPath(el: Element | null): string {
  if (!el || !(el instanceof Element)) return '';
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node.nodeType === 1 && parts.length < 6) {
    let part = node.nodeName.toLowerCase();
    if (node.id) {
      part += `#${cssEscape(node.id)}`;
      parts.unshift(part);
      break;
    }
    const parent: Element | null = node.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (c: Element) => c.nodeName === node!.nodeName,
      );
      if (siblings.length > 1) {
        const idx = siblings.indexOf(node) + 1;
        part += `:nth-of-type(${idx})`;
      }
    }
    parts.unshift(part);
    node = parent;
  }
  return parts.join('>');
}

function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
  return value.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
}

export function elementSnapshot(
  el: Element | null,
  maskSelectors: string[],
): {
  elementTag?: string;
  elementId?: string;
  elementClass?: string;
  elementText?: string;
  elementHref?: string;
} {
  if (!el || !(el instanceof Element)) return {};
  const tag = el.tagName.toLowerCase();
  const id = el.id || undefined;
  const cls = typeof el.className === 'string' ? el.className.slice(0, 120) : undefined;
  let href: string | undefined;
  if (el instanceof HTMLAnchorElement) href = el.href;
  else {
    const a = el.closest('a');
    if (a) href = a.href;
  }

  let text: string | undefined;
  if (!shouldMaskElement(el, maskSelectors)) {
    text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120) || undefined;
  } else {
    text = '[masked]';
  }

  return {
    elementTag: tag,
    elementId: id,
    elementClass: cls,
    elementText: text,
    elementHref: href,
  };
}

/** Keep snapshots under upload limits, but high enough to include the full homepage DOM. */
const MAX_SNAPSHOT_HTML_CHARS = 1_200_000;

function injectBaseHref(html: string, baseHref: string): string {
  if (!baseHref || /<base\s/i.test(html)) return html;
  const tag = `<base href="${baseHref.replace(/"/g, '&quot;')}">`;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${tag}`);
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html([^>]*)>/i, `<html$1><head>${tag}</head>`);
  }
  return `${tag}${html}`;
}

export function sanitizeHtmlForRecord(html: string, cfg: ResolvedConfig, baseHref?: string): string {
  // Strip scripts — replay must not execute visitor JS
  let out = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  out = out.replace(/<!--[\s\S]*?-->/g, '');
  out = out.replace(/<link\b[^>]*(rel=["']modulepreload["']|rel=["']preload["'])[^>]*>/gi, '');
  out = out.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '');
  out = out.replace(/\sdata-va-ignore(?:\s|=|>)/gi, ' hidden$&');

  // Only strip *huge* inline data-URIs (icons under 8KB are fine and keep UI visible)
  out = out.replace(/\s(src|href|poster)\s*=\s*(["'])(data:[^"']*)\2/gi, (_m, attr, quote, data: string) => {
    if (data.length <= 8_000) return ` ${attr}=${quote}${data}${quote}`;
    return ` ${attr}=${quote}#${quote} data-va-stripped="1"`;
  });
  out = out.replace(/url\(\s*(['"]?)(data:[^)"']+)\1\s*\)/gi, (_m, _q, data: string) => {
    if (data.length <= 8_000) return `url(${data})`;
    return 'url(#)';
  });

  // Only strip enormous SVGs (hero icons are usually smaller)
  out = out.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, (m) =>
    m.length > 80_000 ? '<svg data-va-stripped="1" width="1" height="1"></svg>' : m,
  );

  out = out.replace(
    /<input\b([^>]*?)>/gi,
    (_m, attrs: string) => {
      const lower = attrs.toLowerCase();
      if (
        /type\s*=\s*["']?password/.test(lower) ||
        SENSITIVE_NAME_RE.test(attrs) ||
        /autocomplete\s*=\s*["']?(cc-|current-password|new-password|one-time-code)/.test(lower)
      ) {
        return `<input${attrs.replace(/\svalue\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, ' value="***"')} data-va-masked="1">`;
      }
      return `<input${attrs}>`;
    },
  );

  for (const sel of cfg.maskSelectors) {
    void sel;
  }

  if (baseHref) {
    out = injectBaseHref(out, baseHref.endsWith('/') ? baseHref : `${baseHref}/`);
  }

  if (out.length > MAX_SNAPSHOT_HTML_CHARS) {
    // Prefer cutting at a tag boundary so the head/nav survive
    const cut = out.lastIndexOf('>', MAX_SNAPSHOT_HTML_CHARS);
    const at = cut > MAX_SNAPSHOT_HTML_CHARS * 0.7 ? cut + 1 : MAX_SNAPSHOT_HTML_CHARS;
    out = `${out.slice(0, at)}<!--va-truncated--></body></html>`;
  }
  return out;
}

export function classifyLink(href: string | null | undefined):
  | 'phone_click'
  | 'whatsapp_click'
  | 'email_click'
  | null {
  if (!href) return null;
  const h = href.trim().toLowerCase();
  if (h.startsWith('tel:')) return 'phone_click';
  if (h.startsWith('mailto:')) return 'email_click';
  if (
    h.includes('wa.me/') ||
    h.includes('api.whatsapp.com') ||
    h.includes('whatsapp.com/send') ||
    h.startsWith('whatsapp:')
  ) {
    return 'whatsapp_click';
  }
  return null;
}
