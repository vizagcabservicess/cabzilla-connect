
// Environment variable for Google Maps API Key
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

// Define libraries array as a constant to prevent unnecessary re-renders
export const MAPS_LIBRARIES = ["places"] as ["places"];

// Create hidden div element for PlacesService
export const createMapCanvas = (): HTMLDivElement | null => {
  // Check if map-canvas already exists
  const existingCanvas = document.getElementById('map-canvas');
  if (existingCanvas) {
    return existingCanvas as HTMLDivElement;
  }
  
  console.log("Creating hidden map-canvas element for PlacesService");
  try {
    const mapCanvas = document.createElement('div');
    mapCanvas.id = 'map-canvas';
    mapCanvas.style.display = 'none';
    mapCanvas.style.height = '200px';
    mapCanvas.style.width = '200px';
    document.body.appendChild(mapCanvas);
    
    return mapCanvas;
  } catch (error) {
    console.error("Error creating map canvas:", error);
    return null;
  }
};

// Initialize a hidden map to activate the Places API
export const initializeHiddenMap = (mapCanvas: HTMLDivElement): google.maps.Map | null => {
  if (!window.google || !window.google.maps) {
    console.warn("Google Maps not loaded yet, can't initialize hidden map");
    return null;
  }
  
  try {
    const map = new window.google.maps.Map(mapCanvas, {
      center: { lat: 17.6868, lng: 83.2185 }, // Visakhapatnam coordinates
      zoom: 13,
      disableDefaultUI: true,
    });
    console.log("Hidden map initialized for Places API");
    return map;
  } catch (error) {
    console.error("Failed to initialize hidden map:", error);
    return null;
  }
};

// Force Places API to initialize properly
export const forcePlacesInitialization = (retryAttempt = 0): void => {
  if (!window.google || !window.google.maps) {
    if (retryAttempt < 3) {
      console.log(`Google Maps not available, retrying Places init attempt ${retryAttempt + 1}/3`);
      setTimeout(() => forcePlacesInitialization(retryAttempt + 1), 1000);
    }
    return;
  }
  
  try {
    console.log("Forcing Places API initialization");
    
    // Create canvas if doesn't exist
    const mapCanvas = createMapCanvas();
    if (!mapCanvas) {
      throw new Error("Could not create map canvas");
    }
    
    // Try to initialize AutocompleteService
    if (window.google.maps.places) {
      const autocompleteService = new window.google.maps.places.AutocompleteService();
      console.log("AutocompleteService initialized:", !!autocompleteService);
      
      // Initialize PlacesService with the map canvas
      const placesService = new window.google.maps.places.PlacesService(mapCanvas);
      
      // Make a simple request to ensure the service is initialized
      placesService.nearbySearch(
        {
          location: { lat: 17.6868, lng: 83.2185 }, // Visakhapatnam
          radius: 500,
          type: "transit_station"
        },
        (results, status) => {
          console.log("Places API initialization status:", status);
        }
      );
      
      console.log("Places API initialized successfully");
      
      // Mark initialization as successful in window object for debugging
      (window as any).placesInitialized = true;
    } else {
      throw new Error("Google Places API not available");
    }
  } catch (error) {
    console.error("Error initializing Places API:", error);
    
    // Retry initialization if not too many attempts
    if (retryAttempt < 3) {
      console.log(`Retrying Places API initialization (attempt ${retryAttempt + 1}/3)...`);
      setTimeout(() => forcePlacesInitialization(retryAttempt + 1), 1000);
    } else {
      // If all retries failed, set window debug variable
      (window as any).placesInitialized = false;
    }
  }
};

// Set default bounds for India
export const setDefaultIndiaBounds = (): void => {
  if (window.google && window.google.maps) {
    try {
      // Set default map options for all instances
      const indiaBounds = new window.google.maps.LatLngBounds(
        new window.google.maps.LatLng(8.0, 68.0),  // SW corner of India
        new window.google.maps.LatLng(37.0, 97.0)  // NE corner of India
      );
      
      // Store default bounds in window object for later use
      (window as any).indiaBounds = indiaBounds;
      
      console.log("Default India bounds set for Maps");
    } catch (error) {
      console.error("Error setting default bounds:", error);
    }
  }
};

// Helper to check if Places API is available
export const isPlacesApiAvailable = (): boolean => {
  return !!(window.google && window.google.maps && window.google.maps.places);
};

// Helper to check if Places API services are initialized
export const arePlacesServicesInitialized = (): boolean => {
  return !!(
    window.google && 
    window.google.maps && 
    window.google.maps.places && 
    window.google.maps.places.AutocompleteService
  );
};

// Set global variables for debugging
export const setGlobalDebugVariables = (): void => {
  if (window.google && window.google.maps) {
    (window as any).googleMapsLoaded = true;
    (window as any).googlePlacesAvailable = isPlacesApiAvailable();
    (window as any).placesServicesInitialized = arePlacesServicesInitialized();
    console.log("Google Maps loaded status set on window object");
  }
};
