let windowScrollFrame = 0;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function readWindowScrollY(): number {
  return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
}

function writeWindowScrollY(y: number): void {
  const top = Math.max(0, y);
  const scroller = document.scrollingElement || document.documentElement;
  scroller.scrollTop = top;
}

/** Frame-driven scroll so CSS `scroll-behavior: auto` cannot snap the page. */
export function animateWindowScrollTo(targetY: number, durationMs = 700): void {
  cancelAnimationFrame(windowScrollFrame);
  const startY = readWindowScrollY();
  const endY = Math.max(0, targetY);
  const delta = endY - startY;
  if (Math.abs(delta) < 1) return;
  const startedAt = performance.now();
  const html = document.documentElement;
  const body = document.body;
  const prevHtml = html.style.scrollBehavior;
  const prevBody = body.style.scrollBehavior;
  html.style.scrollBehavior = 'auto';
  body.style.scrollBehavior = 'auto';

  const finishStyles = () => {
    html.style.scrollBehavior = prevHtml;
    body.style.scrollBehavior = prevBody;
  };

  const tick = (now: number) => {
    const t = Math.min(1, (now - startedAt) / durationMs);
    writeWindowScrollY(startY + delta * easeInOutCubic(t));
    if (t < 1) {
      windowScrollFrame = requestAnimationFrame(tick);
      return;
    }
    finishStyles();
  };
  windowScrollFrame = requestAnimationFrame(tick);
}

export function smoothScrollToElement(el: HTMLElement, headerOffsetPx = 136): void {
  const top = el.getBoundingClientRect().top + readWindowScrollY() - headerOffsetPx;
  animateWindowScrollTo(top);
}

/** Keep the page pinned to top on search-results / edit — avoids a tiny scroll under the fixed header. */
export function resetPageScroll(): void {
  cancelAnimationFrame(windowScrollFrame);
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

function isHomeSearchResultsView(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.pathname === '/' &&
    new URLSearchParams(window.location.search).get('search') === '1'
  );
}

/** Scroll booking widget into view, or stay at top on `/?search=1` where the widget is already below the header. */
export function scrollToBookingWidget(options?: { smooth?: boolean }): void {
  if (isHomeSearchResultsView()) {
    resetPageScroll();
    return;
  }

  document.getElementById('booking-widget')?.scrollIntoView({
    behavior: options?.smooth ? 'smooth' : 'auto',
    block: 'start',
  });
}
