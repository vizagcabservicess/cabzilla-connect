
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CabBookingInterface } from '@/components/CabBookingInterface';

const BookPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [initialTab, setInitialTab] = useState<string>('local');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [selectedTourId, setSelectedTourId] = useState<string>('');

  useEffect(() => {
    // Get parameters from URL
    const tab = searchParams.get('tab') || 'local';
    const vehicle = searchParams.get('vehicle') || '';
    const tourId = searchParams.get('id') || '';

    console.log('BookPage params:', { tab, vehicle, tourId });

    // Normalize vehicle ID - convert slug back to ID if needed
    let normalizedVehicle = vehicle;
    if (vehicle) {
      // Convert common slugs back to vehicle IDs
      const vehicleSlugMap: { [key: string]: string } = {
        'swift-dzire': 'sedan',
        'dzire': 'sedan',
        'ertiga': 'ertiga',
        'toyota-glanza': 'glanza',
        'glanza': 'glanza',
        'innova-crysta': 'innova',
        'innova': 'innova',
        'tempo-traveller': 'tempo',
        'traveller': 'tempo'
      };
      
      normalizedVehicle = vehicleSlugMap[vehicle.toLowerCase()] || vehicle;
    }

    // Normalize tour ID - handle both slug and ID formats
    let normalizedTourId = tourId;
    if (tourId) {
      // Convert common tour slugs to IDs
      const tourSlugMap: { [key: string]: string } = {
        'araku': 'araku-valley-tour',
        'araku-valley': 'araku-valley-tour',
        'araku-valley-tour': 'araku-valley-tour',
        'lambasingi': 'lambasingi-tour',
        'lambasingi-tour': 'lambasingi-tour',
        'vizag': 'vizag-city-tour',
        'vizag-city': 'vizag-city-tour',
        'vizag-city-tour': 'vizag-city-tour'
      };
      
      normalizedTourId = tourSlugMap[tourId.toLowerCase()] || tourId;
    }

    setInitialTab(tab);
    setSelectedVehicle(normalizedVehicle);
    setSelectedTourId(normalizedTourId);
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50">
      <CabBookingInterface 
        initialTab={initialTab}
        preselectedVehicle={selectedVehicle}
        preselectedTourId={selectedTourId}
      />
    </div>
  );
};

export default BookPage;
