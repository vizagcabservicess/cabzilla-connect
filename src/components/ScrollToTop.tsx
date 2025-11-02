import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top when pathname changes
    window.scrollTo(0, 0);
    
    // Track page view for analytics if consent is given
    if (typeof window !== 'undefined' && window.gtag) {
      const consentGiven = localStorage.getItem('cookie-consent-given') === 'true';
      const preferences = localStorage.getItem('cookie-preferences');
      
      if (consentGiven && preferences) {
        try {
          const prefs = JSON.parse(preferences);
          if (prefs.analytics) {
            window.gtag('config', 'G-68BN0C389S', {
              page_path: pathname
            });
          }
        } catch (error) {
          console.error('Error parsing preferences for analytics:', error);
        }
      }
    }
  }, [pathname]);

  return null;
} 