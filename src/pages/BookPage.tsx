
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CabBookingInterface from '@/components/CabBookingInterface';

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

    setInitialTab(tab);
    setSelectedVehicle(vehicle);
    setSelectedTourId(tourId);
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
