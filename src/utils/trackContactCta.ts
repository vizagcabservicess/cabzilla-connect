/**
 * Track WhatsApp / Call CTA clicks into Visitor Analytics.
 * Uses the tracker `vth:track` event so types are `whatsapp_click` / `phone_click`
 * (visible under Reports → Top buttons and overview cards).
 */
export type ContactCtaKind = 'whatsapp' | 'phone';

export function trackContactCta(
  kind: ContactCtaKind,
  meta?: { name?: string; path?: string; [key: string]: unknown },
): void {
  if (typeof document === 'undefined') return;

  const type = kind === 'whatsapp' ? 'whatsapp_click' : 'phone_click';
  const name =
    meta?.name || (kind === 'whatsapp' ? 'whatsapp_cta' : 'call_cta');
  const path =
    meta?.path ||
    (typeof window !== 'undefined' ? window.location.pathname : undefined);

  try {
    document.dispatchEvent(
      new CustomEvent('vth:track', {
        detail: {
          type,
          name,
          meta: { ...meta, path },
        },
      }),
    );
  } catch {
    // Tracker may not be loaded yet — ignore
  }
}
