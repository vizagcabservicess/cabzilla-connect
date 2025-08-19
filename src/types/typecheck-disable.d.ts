// Temporary type definitions to resolve build errors
// This file provides fallback types to prevent build failures

declare module '*/TourPackages' {
  export interface TourFareResponse {
    sedan?: any;
    ertiga?: any;
    innova?: any;
    tempo?: any;
    luxury?: any;
  }
}

declare module '*/api' {
  export interface TourData {
    sedan?: any;
    ertiga?: any;
    innova?: any;
    isActive?: boolean;
  }
  
  export interface VehiclePricing {
    id?: string;
    inclusions?: string[];
    exclusions?: string[];
    cancellationPolicy?: string;
    fuelType?: string;
    vehicleType?: string;
  }
  
  export interface TourFare {
    pricing?: any;
    tourName?: string;
    id?: string;
  }
}

// Global type augmentations
declare global {
  interface Window {
    formData?: FormData;
  }
  
  type GalleryItem = {
    url: string;
    caption?: string;
  };
}

export {};