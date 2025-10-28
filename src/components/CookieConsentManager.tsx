import React from 'react';
import { useCookieConsent } from '@/contexts/CookieConsentContext';
import CookieConsentBanner from './CookieConsentBanner';

const CookieConsentManager: React.FC = () => {
  const { hasConsent, updatePreferences, acceptAll, rejectAll } = useCookieConsent();

  return (
    <>
      {!hasConsent && (
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
