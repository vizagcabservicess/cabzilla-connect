
import React, { useState } from 'react';
import { CabOptions } from '@/components/CabOptions';
import { CabType } from '@/types/cab';
import { Location } from '@/types/api';

interface AdminBookingFormProps {
  onSubmit: (data: any) => void;
  initialData?: any;
  cabTypes: CabType[];
  isSubmitting?: boolean;
}

export function AdminBookingForm({ 
  onSubmit, 
  initialData, 
  cabTypes, 
  isSubmitting = false 
}: AdminBookingFormProps) {
  const [selectedCab, setSelectedCab] = useState<CabType | null>(null);
  const [pickupLocation] = useState<Location | null>(null);
  const [dropLocation] = useState<Location | null>(null);
  const [distance] = useState(0);
  const [tripType] = useState('local');
  const [tripMode] = useState<'one-way' | 'round-trip'>('one-way');
  const [pickupDate] = useState<Date | undefined>(undefined);
  const [returnDate] = useState<Date | null>(null);
  const [hourlyPackage] = useState('8hrs-80km');

  const handleSelectCab = (cab: CabType) => {
    setSelectedCab(cab);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCab) {
      onSubmit({
        cabType: selectedCab.id,
        // Add other form data here
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <CabOptions
        cabTypes={cabTypes}
        selectedCab={selectedCab}
        onSelectCab={handleSelectCab}
        distance={distance}
        tripType={tripType}
        tripMode={tripMode}
        pickupDate={pickupDate}
        returnDate={returnDate}
        hourlyPackage={hourlyPackage}
        isCalculatingFares={false}
      />
      
      <button
        type="submit"
        disabled={isSubmitting || !selectedCab}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded disabled:opacity-50"
      >
        {isSubmitting ? 'Creating...' : 'Create Booking'}
      </button>
    </form>
  );
}
