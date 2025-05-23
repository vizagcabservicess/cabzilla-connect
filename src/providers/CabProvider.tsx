import React, { createContext, useContext, useState } from 'react';
import { CabType } from '@/types/cab';

interface CabContextType {
  selectedCab: CabType | null;
  setSelectedCab: (cab: CabType | null) => void;
  tripType: string;
  setTripType: (type: string) => void;
  tripMode: string;
  setTripMode: (mode: string) => void;
  fareSource: string;
  setFareSource: (source: string) => void;
}

const CabContext = createContext<CabContextType | undefined>(undefined);

export function CabProvider({ children }: { children: React.ReactNode }) {
  const [selectedCab, setSelectedCab] = useState<CabType | null>(null);
  const [tripType, setTripType] = useState<string>('local');
  const [tripMode, setTripMode] = useState<string>('one-way');
  const [fareSource, setFareSource] = useState<string>('unknown');

  const value = {
    selectedCab,
    setSelectedCab,
    tripType,
    setTripType,
    tripMode,
    setTripMode,
    fareSource,
    setFareSource
  };

  return (
    <CabContext.Provider value={value}>
      {children}
    </CabContext.Provider>
  );
}

export function useCab() {
  const context = useContext(CabContext);
  if (context === undefined) {
    throw new Error('useCab must be used within a CabProvider');
  }
  return context;
} 