import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

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
        console.error('Error parsing saved cookie preferences:', error);
      }
    }
  }, []);

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

  const applyConsentToScripts = (prefs: CookiePreferences) => {
    // Apply Google Consent Mode v2
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        'ad_storage': prefs.marketing ? 'granted' : 'denied',
        'analytics_storage': prefs.analytics ? 'granted' : 'denied',
        'functionality_storage': prefs.functional ? 'granted' : 'denied',
        'personalization_storage': prefs.marketing ? 'granted' : 'denied',
        'security_storage': prefs.necessary ? 'granted' : 'denied',
        'wait_for_update': 500
      });
    }

    // Apply Microsoft Clarity consent
    if (typeof window !== 'undefined') {
      if (prefs.analytics) {
        // Load Clarity if analytics consent is given
        if (window.loadClarity) {
          window.loadClarity();
        }
        if (window.clarity) {
          window.clarity('consent');
        }
      } else {
        // Stop Clarity if analytics consent is not given
        if (window.clarity) {
          window.clarity('stop');
        }
      }
    }

    // Store preferences for future page loads
    localStorage.setItem('cookie-preferences', JSON.stringify(prefs));
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
    loadClarity: () => void;
  }
}
