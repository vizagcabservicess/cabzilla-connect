// Global type declarations for window object extensions

interface VisitorAnalytics {
  trackInteraction: (event: string, category: string, data?: any) => void;
  trackPageView: (page: string, data?: any) => void;
  trackSearch: (query: string, results?: number) => void;
  trackClick: (element: string, data?: any) => void;
  trackScroll: (percentage: number) => void;
  trackFormSubmission: (formName: string, data?: any) => void;
  trackConversion: (event: string, value?: number) => void;
}

declare global {
  interface Window {
    visitorAnalytics?: VisitorAnalytics;
  }
}

export {};

