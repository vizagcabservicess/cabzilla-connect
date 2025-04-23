
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Location } from '@/lib/locationData';
import { CabType } from '@/types/cab';
import { TripType, TripMode } from '@/lib/tripTypes';

interface BookingContextType {
  pickupLocation: Location | null;
  dropoffLocation: Location | null;
  selectedCab: CabType | null;
  selectedDateTime: Date | null;
  tripType: string;
  tripMode: TripMode | string;
  hourlyPackage?: string;
  setPickupLocation: (location: Location | null) => void;
  setDropoffLocation: (location: Location | null) => void;
  setSelectedCab: (cab: CabType | null) => void;
  setSelectedDateTime: (date: Date | null) => void;
  setTripType: (type: string) => void;
  setTripMode: (mode: TripMode | string) => void;
  setHourlyPackage: (packageId: string) => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<Location | null>(null);
  const [selectedCab, setSelectedCab] = useState<CabType | null>(null);
  const [selectedDateTime, setSelectedDateTime] = useState<Date | null>(new Date());
  const [tripType, setTripType] = useState<string>('outstation');
  const [tripMode, setTripMode] = useState<TripMode | string>('one-way');
  const [hourlyPackage, setHourlyPackage] = useState<string>('8hrs-80km');

  return (
    <BookingContext.Provider
      value={{
        pickupLocation,
        dropoffLocation,
        selectedCab,
        selectedDateTime,
        tripType,
        tripMode,
        hourlyPackage,
        setPickupLocation,
        setDropoffLocation,
        setSelectedCab,
        setSelectedDateTime,
        setTripType,
        setTripMode,
        setHourlyPackage,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export const useBookingContext = (): BookingContextType => {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBookingContext must be used within a BookingProvider');
  }
  return context;
};
