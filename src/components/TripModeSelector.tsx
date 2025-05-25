
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export function TripModeSelector() {
  const [selectedTab, setSelectedTab] = useState('Outstation');
  const [tripType, setTripType] = useState('oneway');

  const tabs = ['Outstation', 'Local', 'Airport', 'Tour'];

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 justify-center">
        {tabs.map((tab) => (
          <Button
            key={tab}
            variant={selectedTab === tab ? 'default' : 'outline'}
            onClick={() => setSelectedTab(tab)}
            className={`px-6 py-2 ${
              selectedTab === tab 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            {tab}
          </Button>
        ))}
      </div>

      {/* Trip Type Selection for Outstation */}
      {selectedTab === 'Outstation' && (
        <RadioGroup value={tripType} onValueChange={setTripType} className="flex justify-center space-x-6">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="oneway" id="oneway" />
            <Label htmlFor="oneway" className="text-gray-700 font-medium">One Way</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="roundtrip" id="roundtrip" />
            <Label htmlFor="roundtrip" className="text-gray-700 font-medium">Round Trip</Label>
          </div>
        </RadioGroup>
      )}
    </div>
  );
}
