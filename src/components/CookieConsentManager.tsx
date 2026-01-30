import React, { useState, useEffect } from 'react';
import { useCookieConsent } from '@/contexts/CookieConsentContext';
import CookieConsentBanner from './CookieConsentBanner';

// Delay until after LCP so the cookie modal doesn't become the LCP element (was 3.5s, caused ~19s LCP)
const BANNER_DELAY_MS = 10000;

const CookieConsentManager: React.FC = () => {
  const { hasConsent, updatePreferences, acceptAll, rejectAll } = useCookieConsent();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (hasConsent) return;
    const id = window.setTimeout(() => setShowBanner(true), BANNER_DELAY_MS);
    return () => clearTimeout(id);
  }, [hasConsent]);

  return (
    <>
      {!hasConsent && showBanner && (
        <CookieConsentBanner
          onConsentChange={updatePreferences}
          onAcceptAll={acceptAll}
          onRejectAll={rejectAll}
        />
      )}
    </>
  );
};

export default CookieConsentManager;
