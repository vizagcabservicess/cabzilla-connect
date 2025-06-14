export interface TourGalleryImage {
  id: string;
  url: string;
  alt: string;
  caption?: string;
}

export interface TourItinerary {
  day: number;
  title: string;
  description: string;
  activities: string[];
  meals?: string[];
}

export interface TourHighlight {
  icon: string;
  title: string;
  description: string;
}

export interface TourDetail {
  id: string;
  tourId: string;
  tourName: string;
  description: string;
  duration: string;
  distance: number;
  days: number;
  difficulty: 'Easy' | 'Moderate' | 'Challenging';
  category: string;
  highlights: TourHighlight[];
  itinerary: TourItinerary[];
  gallery: TourGalleryImage[];
  inclusions: string[];
  exclusions: string[];
  pricing: { [vehicleId: string]: number };
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  timeDuration?: string;
}

export interface TourListItem {
  tourId: string;
  tourName: string;
  description: string;
  distance: number;
  days: number;
  imageUrl: string;
  pricing: { [vehicleId: string]: number };
  minPrice: number;
  timeDuration?: string;
}
