import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { useCookieConsent } from '@/contexts/CookieConsentContext';

const CookieConsentBanner = lazy(() => import('./CookieConsentBanner'));

/** After idle + delay so cookie UI (large Radix tree) is not on the critical path and does not steal LCP. */
const BANNER_DELAY_MS = 10000;

const CookieConsentManager: React.FC = () => {
  const { hasConsent, updatePreferences, acceptAll, rejectAll } = useCookieConsent();
  const [showBanner, setShowBanner] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (hasConsent) return;
    const startTimer = () => {
      timeoutRef.current = window.setTimeout(() => setShowBanner(true), BANNER_DELAY_MS);
    };
    if (typeof requestIdleCallback !== 'undefined') {
      const idleId = requestIdleCallback(startTimer, { timeout: 4000 });
      return () => {
        cancelIdleCallback(idleId);
        if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      };
    }
    startTimer();
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, [hasConsent]);

  return (
    <>
      {!hasConsent && showBanner && (
        <Suspense fallback={null}>
          <CookieConsentBanner
            onConsentChange={updatePreferences}
            onAcceptAll={acceptAll}
            onRejectAll={rejectAll}
          />
        </Suspense>
      )}
    </>
  );
};

export default CookieConsentManager;
