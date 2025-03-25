
import * as React from "react"

// Define breakpoints for different screen sizes
export const BREAKPOINTS = {
  MOBILE: 768,
  TABLET: 1024
}

type ScreenSize = 'mobile' | 'tablet' | 'desktop' | undefined;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Function to check if device is mobile
    const checkIsMobile = () => {
      // Check if we're on a mobile browser
      const isMobileBrowser = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Also check width
      const isMobileWidth = window.innerWidth < BREAKPOINTS.MOBILE;
      
      return isMobileBrowser || isMobileWidth;
    };
    
    // Handle initial check
    setIsMobile(checkIsMobile());
    
    // Set up resize listener
    const handleResize = () => {
      setIsMobile(checkIsMobile());
    };
    
    // Add event listeners
    window.addEventListener('resize', handleResize);
    
    // Apply mobile-specific behaviors
    if (checkIsMobile()) {
      // Add app-container class to body for native-like scrolling
      document.body.classList.add('app-container');
      
      // Prevent pull-to-refresh behavior on mobile
      document.body.style.overscrollBehavior = 'none';
      
      // Apply app-specific viewport meta tag
      let viewportMeta = document.querySelector('meta[name="viewport"]');
      if (!viewportMeta) {
        viewportMeta = document.createElement('meta');
        viewportMeta.setAttribute('name', 'viewport');
        document.head.appendChild(viewportMeta);
      }
      viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
      
      // Handle iOS status bar for PWA
      if (navigator.standalone) {
        document.body.classList.add('pwa-standalone');
      }
    }
    
    // Clean up event listeners and body classes
    return () => {
      window.removeEventListener('resize', handleResize);
      document.body.classList.remove('app-container');
      document.body.style.overscrollBehavior = '';
    };
  }, []);

  return !!isMobile
}

export function useScreenSize() {
  const [screenSize, setScreenSize] = React.useState<ScreenSize>(undefined)
  const [orientation, setOrientation] = React.useState<'portrait' | 'landscape' | undefined>(undefined)

  React.useEffect(() => {
    // Function to determine screen size
    const determineScreenSize = (): ScreenSize => {
      const width = window.innerWidth;
      if (width < BREAKPOINTS.MOBILE) return 'mobile';
      if (width < BREAKPOINTS.TABLET) return 'tablet';
      return 'desktop';
    }
    
    // Function to determine orientation
    const determineOrientation = () => {
      return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    }

    // Handle initial check
    setScreenSize(determineScreenSize());
    setOrientation(determineOrientation());
    
    // Set up resize and orientation change listeners
    const handleResize = () => {
      setScreenSize(determineScreenSize());
      setOrientation(determineOrientation());
    }
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    }
  }, [])

  return {
    screenSize,
    isMobile: screenSize === 'mobile',
    isTablet: screenSize === 'tablet',
    isDesktop: screenSize === 'desktop',
    orientation
  }
}

// Hook to handle mobile keyboard appearance
export function useMobileKeyboard() {
  const [isKeyboardVisible, setIsKeyboardVisible] = React.useState(false);
  const isMobile = useIsMobile();
  
  React.useEffect(() => {
    if (!isMobile) return;
    
    const detectKeyboard = () => {
      // On iOS, the viewport height changes when the keyboard appears
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      
      // If the viewport is significantly smaller than the window height, keyboard is likely visible
      setIsKeyboardVisible(windowHeight - viewportHeight > 150);
    };
    
    // Set up event listeners for detecting keyboard
    window.visualViewport?.addEventListener('resize', detectKeyboard);
    window.addEventListener('resize', detectKeyboard);
    
    return () => {
      window.visualViewport?.removeEventListener('resize', detectKeyboard);
      window.removeEventListener('resize', detectKeyboard);
    };
  }, [isMobile]);
  
  return {
    isKeyboardVisible,
    keyboardHeight: isKeyboardVisible ? (window.innerHeight - (window.visualViewport?.height || 0)) : 0
  };
}
