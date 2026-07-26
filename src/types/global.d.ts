// Global type declarations for window object extensions

interface VisitorAnalyticsIdentity {
  visitorId?: string | null;
  sessionId?: string | null;
  visitorKey?: string;
  isReturning?: boolean;
}

interface VisitorAnalyticsChatBridge {
  open?: () => void;
  close?: () => void;
  toggle?: () => void;
  identify?: (profile: Record<string, unknown>) => void;
  trackEvent?: (name: string, data?: Record<string, unknown>) => void;
  getVisitorContext?: () => {
    visitorKey?: string;
    sessionId?: string;
    visitorId?: string | null;
    pageUrl?: string;
    isReturning?: boolean;
  };
  openChat?: () => void;
  closeChat?: () => void;
}

interface VisitorAnalytics {
  trackInteraction: (event: string, category: string, data?: Record<string, unknown>) => void;
  trackPageView: (page: string, data?: Record<string, unknown>) => void;
  trackSearch: (query: string, results?: number) => void;
  trackClick: (element: string, data?: Record<string, unknown>) => void;
  trackScroll: (percentage: number) => void;
  trackFormSubmission: (formName: string, data?: Record<string, unknown>) => void;
  trackConversion: (event: string, value?: number) => void;
  destroy?: () => void;
  chat?: VisitorAnalyticsChatBridge;
  getSessionId?: () => string | null;
  getVisitorId?: () => string | null;
  getIdentity?: () => VisitorAnalyticsIdentity | null;
}

interface VthAnalyticsConfig {
  siteKey: string;
  apiBase?: string;
  wsUrl?: string;
  recording?: boolean;
  requireConsent?: boolean;
  maskSelectors?: string[];
}

declare global {
  interface Window {
    visitorAnalytics?: VisitorAnalytics;
    VTH_ANALYTICS?: VthAnalyticsConfig;
    VTH_ANALYTICS_SITE_KEY?: string;
    VTH_ANALYTICS_API?: string;
    VTH_ANALYTICS_WS?: string;
    VTHTracker?: unknown;
    loadRazorpay?: () => void;
    Razorpay?: unknown;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export {};
