import React from 'react';
import { OutstationHeroWidget } from './OutstationHeroWidget';

interface OutstationHeroProps {
  initialPickup?: string;
  initialDrop?: string;
  onSearch?: (searchData: any) => void;
}

export function OutstationHero({ initialPickup, initialDrop, onSearch }: OutstationHeroProps) {
  return (
    <div className="flex justify-center items-center min-h-[60vh] w-full">
      <div className="w-full max-w-8xl px-4">
        <OutstationHeroWidget initialPickup={initialPickup} initialDrop={initialDrop} onSearch={onSearch} />
      </div>
    </div>
  );
}
