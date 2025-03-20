
import React from 'react';
import { CabType } from '@/types/cab';
import { CabOptionCard } from '../CabOptionCard';
import { CalculatingState } from './CalculatingState';
import { EmptyState } from './EmptyState';

interface CabOptionsContentProps {
  cabTypes: CabType[];
  cabFares: Record<string, number>;
  selectedCabId: string | null;
  isCalculatingFares: boolean;
  isRefreshingCabs: boolean;
  fareDetails: string;
  onSelectCab: (cab: CabType) => void;
  onRefresh: () => void;
}

export function CabOptionsContent({
  cabTypes,
  cabFares,
  selectedCabId,
  isCalculatingFares,
  isRefreshingCabs,
  fareDetails,
  onSelectCab,
  onRefresh
}: CabOptionsContentProps) {
  if (cabTypes.length === 0) {
    return <EmptyState isRefreshing={isRefreshingCabs} onRefresh={onRefresh} />;
  }

  return (
    <div className="space-y-3">
      {isCalculatingFares && <CalculatingState />}
      
      {cabTypes.map((cab) => (
        <CabOptionCard 
          key={cab.id || `cab-${Math.random()}`}
          cab={cab}
          fare={cabFares[cab.id] || 0}
          isSelected={selectedCabId === cab.id}
          onSelect={onSelectCab}
          fareDetails={fareDetails}
          isCalculating={isCalculatingFares}
        />
      ))}
    </div>
  );
}
