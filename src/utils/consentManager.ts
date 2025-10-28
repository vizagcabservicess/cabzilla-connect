/**
 * Cookie Consent Management Utility
 * Implements Google Consent Mode v2 and Microsoft Clarity integration
 */

export interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

/**
 * Initialize Google Consent Mode v2 with default denied state
 * This should be called before any tracking scripts load
 */
export const initializeConsentMode = (): void => {
  if (typeof window === 'undefined') return;

  // Initialize Google Consent Mode v2 with default denied state
  window.dataLayer = window.dataLayer || [];
  
  function gtag(...args: any[]) {
    window.dataLayer.push(args);
  }

  // Set default consent state (denied for all non-essential)
  gtag('consent', 'default', {
    'ad_storage': 'denied',
    'analytics_storage': 'denied',
    'functionality_storage': 'denied',
    'personalization_storage': 'denied',
    'security_storage': 'granted', // Always granted for security
    'wait_for_update': 500
  });

  // Make gtag available globally
  window.gtag = gtag;
};

/**
 * Update consent preferences based on user choices
 */
export const updateConsentPreferences = (preferences: CookiePreferences): void => {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('consent', 'update', {
    'ad_storage': preferences.marketing ? 'granted' : 'denied',
    'analytics_storage': preferences.analytics ? 'granted' : 'denied',
    'functionality_storage': preferences.functional ? 'granted' : 'denied',
    'personalization_storage': preferences.marketing ? 'granted' : 'denied',
    'security_storage': preferences.necessary ? 'granted' : 'denied',
    'wait_for_update': 500
  });
};

/**
 * Initialize Microsoft Clarity with consent awareness
 */
export const initializeClarityWithConsent = (projectId: string, preferences: CookiePreferences): void => {
  if (typeof window === 'undefined') return;

  // Only initialize Clarity if analytics consent is given
  if (!preferences.analytics) {
    console.log('Microsoft Clarity disabled due to analytics consent not granted');
    return;
  }

  // Clarity initialization function
  (function(c: any, l: any, a: any, r: any, i: any, t: any, y: any) {
    c[a] = c[a] || function() { (c[a].q = c[a].q || []).push(arguments) };
    t = l.createElement(r);
    t.async = 1;
    t.src = "https://www.clarity.ms/tag/" + i;
    try {
      y = l.getElementsByTagName(r)[0];
      if (y && y.parentNode) {
        y.parentNode.insertBefore(t, y);
      } else {
        l.head.appendChild(t);
      }
    } catch (error) {
      console.warn('Clarity script insertion failed, using fallback:', error);
      l.head.appendChild(t);
    }
  })(window, document, "clarity", "script", projectId);
};

/**
 * Load Google Analytics with consent awareness
 */
export const initializeGoogleAnalyticsWithConsent = (trackingId: string, preferences: CookiePreferences): void => {
  if (typeof window === 'undefined') return;

  // Load Google Analytics script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
  document.head.appendChild(script);

  // Initialize gtag with consent-aware configuration
  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) {
    window.dataLayer.push(args);
  }

  window.gtag = gtag;
  gtag('js', new Date());
  
  // Configure with consent-aware settings
  gtag('config', trackingId, {
    send_page_view: preferences.analytics, // Only send page views if analytics consent is given
    transport_type: 'beacon',
    anonymize_ip: true, // Always anonymize IP for privacy
    allow_google_signals: preferences.marketing, // Only enable if marketing consent is given
    allow_ad_personalization_signals: preferences.marketing
  });
};

/**
 * Check if user has given consent
 */
export const hasUserConsent = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('cookie-consent-given') === 'true';
};

/**
 * Get saved cookie preferences
 */
export const getSavedPreferences = (): CookiePreferences | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const saved = localStorage.getItem('cookie-preferences');
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Error parsing saved cookie preferences:', error);
    return null;
  }
};

/**
 * Save cookie preferences
 */
export const savePreferences = (preferences: CookiePreferences): void => {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('cookie-preferences', JSON.stringify(preferences));
  localStorage.setItem('cookie-consent-given', 'true');
};

// Declare global types
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
    clarity: (...args: any[]) => void;
  }
}
