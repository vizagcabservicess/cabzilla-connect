import { Location } from '@/types/api';

// Utility functions for location data

export const convertToApiLocation = (location: Location): any => {
  if (!location) return null;
  
  return {
    id: location.id?.toString() || 'unknown',
    name: location.name || '',
    address: location.address || location.name || '',
    lat: typeof location.latitude === 'number' ? location.latitude : (location.lat || 0),
    lng: typeof location.longitude === 'number' ? location.longitude : (location.lng || 0),
    type: location.type || 'other'
  };
};

export const createLocationChangeHandler = (
  setLocation: (location: Location) => void, 
  locationName: string
) => {
  return (location: Location) => {
    if (!location) return;
    
    const processedLocation: Location = {
      ...location,
      address: location.address || location.name || '',
      lat: location.lat || location.latitude || 0,
      lng: location.lng || location.longitude || 0,
      isInVizag: location.isInVizag !== undefined ? location.isInVizag : isLocationInVizag(location)
    };
    
    setLocation(processedLocation);
    console.log(`${locationName} location changed:`, processedLocation);
  };
};

export const isVizagLocation = (location: Location): boolean => {
  return safeIncludes(location.name, [
    'Visakhapatnam',
    'Vizag',
    'VSP',
    'Gajuwaka',
    'Dwaraka Nagar',
    'MVP Colony',
    'Siripuram',
    'Maddilapalem',
    'Seethammadhara',
    'NAD Kotha Road',
    'Railway New Colony',
    'Maharanipeta',
    'Purna Market',
    'Asilmetta',
    'RTC Complex',
    'Jagadamba Junction',
    'Srikakulam',
    'Vizianagaram',
    'Anakapalle',
    'Pendurthi',
    'Simhachalam',
    'Kailasagiri',
    'Rushikonda',
    'Bheemili',
    'Madhurawada',
    'Yendada',
    ' সাগরমালা ',
    'Gangavaram',
    'Parawada',
    'Atchutapuram',
    'Narsipatnam',
    'Chodavaram',
    'Payakaraopeta',
    'Tuni',
    'Kakinada',
    'Rajahmundry',
    'Eluru',
    'Vijayawada',
    'Guntur',
    'Ongole',
    'Nellore',
    'Tirupati',
    'Chittoor',
    'Kadapa',
    'Kurnool',
    'Anantapur',
    'Hindupur',
    'Madanapalle',
    'Pileru',
    'Rayachoti',
    'Rajampet',
    'Badvel',
    'Proddatur',
    'Jammalamadugu',
    'Pulivendla',
    'Kadiri',
    'Dharmavaram',
    'Tadipatri',
    'Gooty',
    'Yemmiganur',
    'Adoni',
    'Nandyal',
    'Allagadda',
    'Srisailam',
    'Markapur',
    'Kandukur',
    'Kavali',
    'Gudur',
    'Sullurpeta',
    'Naidupeta',
    'Puttur',
    'Srikalahasti',
    'Renigunta',
    'Pakala',
    'Palamaner',
    'Vayalpadu',
    'Punganur',
    'Tamballapalle',
    'Annamayya',
    'Rayalacheruvu',
    'Chinnamandem',
    'Kodur',
    'Obulavaripalle',
    'Porumamilla',
    'Kaluvoya',
    'Siddavatam',
    'Pendlimarri',
    'Chitvel',
    'Pullampeta',
    'Atlur',
    'B Kodur',
    'Valmikipuram',
    'Gurramkonda',
    'Madanapalle Mandal',
    'Punganur Mandal',
    'Pileru Mandal',
    'Rayachoti Mandal',
    'Rajampet Mandal',
    'Badvel Mandal',
    'Proddatur Mandal',
    'Jammalamadugu Mandal',
    'Pulivendla Mandal',
    'Kadiri Mandal',
    'Dharmavaram Mandal',
    'Tadipatri Mandal',
    'Gooty Mandal',
    'Yemmiganur Mandal',
    'Adoni Mandal',
    'Nandyal Mandal',
    'Allagadda Mandal',
    'Srisailam Mandal',
    'Markapur Mandal',
    'Kandukur Mandal',
    'Kavali Mandal',
    'Gudur Mandal',
    'Sullurpeta Mandal',
    'Naidupeta Mandal',
    'Puttur Mandal',
    'Srikalahasti Mandal',
    'Renigunta Mandal',
    'Pakala Mandal',
    'Palamaner Mandal',
    'Vayalpadu Mandal',
    'Punganur Mandal',
    'Tamballapalle Mandal',
  ]);
};

export const safeIncludes = (text: string | undefined, patterns: string[]): boolean => {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return patterns.some(pattern => lowerText.includes(pattern.toLowerCase()));
};

export const formatTravelTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours > 0) {
    return `${hours} hr ${remainingMinutes} min`;
  } else {
    return `${remainingMinutes} min`;
  }
};

export const isLocationInVizag = (location: Location | null): boolean => {
  if (!location) return false;
  
  const lat = location.lat || location.latitude || 0;
  const lng = location.lng || location.longitude || 0;
  
  // Visakhapatnam city bounds
  const vizagBounds = {
    north: 17.9000,
    south: 17.6000,
    east: 83.4000,
    west: 83.1000
  };
  
  return lat >= vizagBounds.south && 
         lat <= vizagBounds.north && 
         lng >= vizagBounds.west && 
         lng <= vizagBounds.east;
};
