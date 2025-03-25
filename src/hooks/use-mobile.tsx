
import { useState, useEffect } from 'react';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function checkIsMobile() {
      // Check for mobile viewport size
      const mobileViewport = window.innerWidth < 768;
      
      // Check for mobile user agent
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const mobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      
      // Check for touch capability
      const hasTouch = 'ontouchstart' in window || 
                       (window as any).DocumentTouch && document instanceof (window as any).DocumentTouch || 
                       navigator.maxTouchPoints > 0;
                       
      // Is this potentially a PWA or standalone web app?
      const isStandalone = (window.matchMedia('(display-mode: standalone)').matches) || 
                          ((window as any).navigator && (window as any).navigator.standalone === true);
      
      // Apply mobile app-like styles when on mobile
      if (mobileViewport || mobileUserAgent) {
        document.body.classList.add('mobile-app');
        
        // Apply smoother scrolling for iOS
        document.documentElement.style.setProperty('-webkit-overflow-scrolling', 'touch');
        
        // Apply smoother font rendering for mobile
        document.body.style.setProperty('-webkit-font-smoothing', 'antialiased');
        document.body.style.setProperty('-moz-osx-font-smoothing', 'grayscale');
        
        // Hide address bar if in standalone mode
        if (isStandalone && hasTouch) {
          window.scrollTo(0, 1);
        }
        
        // Disable user selection on mobile for app-like feel
        document.body.style.userSelect = 'none';
        document.body.style.setProperty('webkit-user-select', 'none');
        (document.body.style as any).webkitTapHighlightColor = 'transparent';
        
        // Prevent bounce effect on iOS
        document.body.style.overscrollBehavior = 'none';
        document.documentElement.style.overscrollBehavior = 'none';
      } else {
        document.body.classList.remove('mobile-app');
      }
      
      setIsMobile(mobileViewport || mobileUserAgent);
    }
    
    // Check immediately
    checkIsMobile();
    
    // Check on resize
    window.addEventListener('resize', checkIsMobile);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  return isMobile;
}
