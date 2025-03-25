
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
    // Handle initial check
    setIsMobile(window.innerWidth < BREAKPOINTS.MOBILE)
    
    // Set up resize listener
    const handleResize = () => {
      setIsMobile(window.innerWidth < BREAKPOINTS.MOBILE)
    }
    
    window.addEventListener('resize', handleResize)
    
    // Clean up event listener
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return !!isMobile
}

export function useScreenSize() {
  const [screenSize, setScreenSize] = React.useState<ScreenSize>(undefined)

  React.useEffect(() => {
    // Function to determine screen size
    const determineScreenSize = (): ScreenSize => {
      const width = window.innerWidth;
      if (width < BREAKPOINTS.MOBILE) return 'mobile';
      if (width < BREAKPOINTS.TABLET) return 'tablet';
      return 'desktop';
    }

    // Handle initial check
    setScreenSize(determineScreenSize())
    
    // Set up resize listener
    const handleResize = () => {
      setScreenSize(determineScreenSize())
    }
    
    window.addEventListener('resize', handleResize)
    
    // Clean up event listener
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return {
    screenSize,
    isMobile: screenSize === 'mobile',
    isTablet: screenSize === 'tablet',
    isDesktop: screenSize === 'desktop'
  }
}
