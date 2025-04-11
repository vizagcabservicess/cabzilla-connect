
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

// Add a function to safely get values from session storage with proper error handling
export function safeGetFromSession(key: string, defaultValue: any) {
  try {
    const value = sessionStorage.getItem(key)
    if (!value) return defaultValue
    return JSON.parse(value)
  } catch (error) {
    console.error(`Error retrieving ${key} from session storage:`, error)
    return defaultValue
  }
}

// Add a function to safely set values in session storage
export function safeSetInSession(key: string, value: any) {
  try {
    const jsonValue = JSON.stringify(value)
    sessionStorage.setItem(key, jsonValue)
  } catch (error) {
    console.error(`Error storing ${key} in session storage:`, error)
  }
}
