import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

interface CookieConsentContextType {
  preferences: CookiePreferences;
  hasConsent: boolean;
  updatePreferences: (preferences: CookiePreferences) => void;
  acceptAll: () => void;
  rejectAll: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

interface CookieConsentProviderProps {
  children: ReactNode;
}

export const CookieConsentProvider: React.FC<CookieConsentProviderProps> = ({ children }) => {
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
    functional: false
  });
  const [hasConsent, setHasConsent] = useState(false);

  const applyConsentToScripts = useCallback((prefs: CookiePreferences) => {
    const dev = import.meta.env.DEV;

    // Apply Google Consent Mode v2
    if (typeof window !== 'undefined' && window.gtag) {
      const consentUpdate = {
        'ad_storage': prefs.marketing ? 'granted' : 'denied',
        'analytics_storage': prefs.analytics ? 'granted' : 'denied',
        'functionality_storage': prefs.functional ? 'granted' : 'denied',
        'personalization_storage': prefs.marketing ? 'granted' : 'denied',
        'security_storage': prefs.necessary ? 'granted' : 'denied'
      };
      if (dev) console.log('Sending consent update:', consentUpdate);
      window.gtag('consent', 'update', consentUpdate);

      // Send initial page view if analytics consent is granted
      if (prefs.analytics) {
        window.gtag('config', 'G-68BN0C389S', {
          send_page_view: true,
          page_path: window.location.pathname + window.location.search
        });
        window.gtag('event', 'page_view', {
          page_path: window.location.pathname + window.location.search,
          page_title: document.title
        });
      }
    } else if (dev) {
      console.warn('gtag not available on window object');
    }

    // Store preferences for future page loads
    localStorage.setItem('cookie-preferences', JSON.stringify(prefs));

    // Sync first-party Visitor Analytics tracker consent
    try {
      localStorage.setItem('vth_va_consent', prefs.analytics ? 'granted' : 'denied');
      document.documentElement.setAttribute('data-va-consent', prefs.analytics ? 'granted' : 'denied');
      document.dispatchEvent(new CustomEvent('vth:consent', { detail: { analytics: prefs.analytics } }));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    // Load saved preferences from localStorage
    const savedConsent = localStorage.getItem('cookie-consent-given');
    const savedPreferences = localStorage.getItem('cookie-preferences');
    
    if (savedConsent === 'true' && savedPreferences) {
      try {
        const parsedPreferences = JSON.parse(savedPreferences);
        setPreferences(parsedPreferences);
        setHasConsent(true);
        // Apply consent to tracking scripts
        applyConsentToScripts(parsedPreferences);
      } catch (error) {
        if (import.meta.env.DEV) console.error('Error parsing saved cookie preferences:', error);
      }
    } else {
      // No saved consent, use default granted state (production environment)
      const defaultPreferences = {
        necessary: true,
        analytics: true,
        marketing: true,
        functional: true
      };
      setPreferences(defaultPreferences);
      // Don't set hasConsent to true to show banner
      // But apply scripts with granted state
      applyConsentToScripts(defaultPreferences);
    }
  }, [applyConsentToScripts]);

  const updatePreferences = (newPreferences: CookiePreferences) => {
    setPreferences(newPreferences);
    setHasConsent(true);
    applyConsentToScripts(newPreferences);
  };

  const acceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true
    };
    updatePreferences(allAccepted);
  };

  const rejectAll = () => {
    const onlyNecessary = {
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false
    };
    updatePreferences(onlyNecessary);
  };

  const value: CookieConsentContextType = {
    preferences,
    hasConsent,
    updatePreferences,
    acceptAll,
    rejectAll
  };

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
};

export const useCookieConsent = (): CookieConsentContextType => {
  const context = useContext(CookieConsentContext);
  if (context === undefined) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider');
  }
  return context;
};

// Declare global types for TypeScript
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    clarity: (...args: any[]) => void;
  }
}
