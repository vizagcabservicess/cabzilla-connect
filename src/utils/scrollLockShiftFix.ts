/**
 * Radix Select (and other overlays) use react-remove-scroll, which injects
 * `overflow: hidden !important` + margin compensation on body. That hides the
 * scrollbar and shifts the page. Inline `!important` styles beat their stylesheet.
 */
const LOCK_ATTR = 'data-scroll-locked';

const LOCKED_STYLES: Array<[string, string]> = [
  ['overflow-x', 'clip'],
  ['overflow-y', 'scroll'],
  ['margin-left', '0px'],
  ['margin-right', '0px'],
  ['margin-top', '0px'],
  ['padding-left', '0px'],
  ['padding-right', '0px'],
  ['padding-top', '0px'],
  ['position', 'static'],
  ['--removed-body-scroll-bar-size', '0px'],
];

function applyNoShiftStyles(locked: boolean): void {
  const { body } = document;
  if (!body) return;
  const adminShell = document.querySelector('[data-admin-shell]');
  for (const [prop, value] of LOCKED_STYLES) {
    if (!locked) {
      body.style.removeProperty(prop);
      continue;
    }
    // The admin page already scrolls inside its content column. A body scrollbar
    // here is a second bar on the right, and it stays after the dropdown closes.
    const next = adminShell && prop === 'overflow-y' ? 'hidden' : value;
    body.style.setProperty(prop, next, 'important');
  }
}

function overlayIsOpen(): boolean {
  return Boolean(
    document.querySelector(
      '[data-radix-select-content][data-state="open"], [role="dialog"][data-state="open"], [role="menu"][data-state="open"]'
    )
  );
}

export function installScrollLockShiftFix(): () => void {
  if (typeof window === 'undefined' || typeof MutationObserver === 'undefined') {
    return () => undefined;
  }

  let clearTimer = 0;
  const sync = () => {
    const locked = document.body.hasAttribute(LOCK_ATTR);
    applyNoShiftStyles(locked);
    window.clearTimeout(clearTimer);
    if (!locked) return;
    clearTimer = window.setTimeout(() => {
      if (!document.body.hasAttribute(LOCK_ATTR) || overlayIsOpen()) return;
      document.body.removeAttribute(LOCK_ATTR);
      applyNoShiftStyles(false);
    }, 400);
  };

  sync();
  const obs = new MutationObserver(sync);
  obs.observe(document.body, { attributes: true, attributeFilter: [LOCK_ATTR] });

  // Re-assert after Radix injects its style singleton (next frame)
  const onOpen = () => {
    if (!document.body.hasAttribute(LOCK_ATTR)) return;
    requestAnimationFrame(sync);
    window.setTimeout(sync, 0);
    window.setTimeout(sync, 50);
  };
  document.addEventListener('pointerdown', onOpen, true);
  document.addEventListener('keydown', onOpen, true);

  const pinHorizontalScroll = () => {
    if (window.innerWidth >= 1024 || window.scrollX === 0) return;
    window.scrollTo(0, window.scrollY);
  };
  window.addEventListener('scroll', pinHorizontalScroll, { passive: true });
  window.visualViewport?.addEventListener('scroll', pinHorizontalScroll, { passive: true });
  window.visualViewport?.addEventListener('resize', pinHorizontalScroll);

  return () => {
    obs.disconnect();
    document.removeEventListener('pointerdown', onOpen, true);
    document.removeEventListener('keydown', onOpen, true);
    window.removeEventListener('scroll', pinHorizontalScroll);
    window.visualViewport?.removeEventListener('scroll', pinHorizontalScroll);
    window.visualViewport?.removeEventListener('resize', pinHorizontalScroll);
    applyNoShiftStyles(false);
  };
}
