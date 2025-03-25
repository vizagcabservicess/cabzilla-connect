
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Handle initial check
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    
    // Set up resize listener
    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    window.addEventListener('resize', handleResize)
    
    // Clean up event listener
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return !!isMobile
}
