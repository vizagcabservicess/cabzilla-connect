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
  for (const [prop, value] of LOCKED_STYLES) {
    if (locked) body.style.setProperty(prop, value, 'important');
    else body.style.removeProperty(prop);
  }
}

export function installScrollLockShiftFix(): () => void {
  if (typeof window === 'undefined' || typeof MutationObserver === 'undefined') {
    return () => undefined;
  }

  const sync = () => {
    applyNoShiftStyles(document.body.hasAttribute(LOCK_ATTR));
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

  return () => {
    obs.disconnect();
    document.removeEventListener('pointerdown', onOpen, true);
    document.removeEventListener('keydown', onOpen, true);
    applyNoShiftStyles(false);
  };
}
