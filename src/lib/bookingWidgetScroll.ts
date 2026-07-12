/** Keep the page pinned to top on search-results / edit — avoids a tiny scroll under the fixed header. */
export function resetPageScroll(): void {
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
