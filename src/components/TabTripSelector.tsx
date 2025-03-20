
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useCallback, useState, useRef } from "react";
import { toast } from "sonner";

interface TabTripSelectorProps {
  selectedTab: 'outstation' | 'local' | 'airport' | 'tour';
  tripMode: 'one-way' | 'round-trip';
  onTabChange: (tab: 'outstation' | 'local' | 'airport' | 'tour') => void;
  onTripModeChange: (mode: 'one-way' | 'round-trip') => void;
}

export function TabTripSelector({ 
  selectedTab, 
  tripMode, 
  onTabChange, 
  onTripModeChange 
}: TabTripSelectorProps) {
  const [prevTab, setPrevTab] = useState<string | null>(null);
  const isClearing = useRef(false);
  const isProcessingTabChange = useRef(false);

  const updateSessionStorage = useCallback(() => {
    sessionStorage.setItem('tripType', selectedTab);
    sessionStorage.setItem('tripMode', tripMode);
  }, [selectedTab, tripMode]);
  
  useEffect(() => {
    if (prevTab !== selectedTab && prevTab !== null && !isProcessingTabChange.current) {
      if (!isClearing.current) {
        isClearing.current = true;
        
        // Remove stored locations to reset the form
        sessionStorage.removeItem('dropLocation');
        sessionStorage.removeItem('pickupLocation');
        sessionStorage.removeItem('selectedCab');
        
        updateSessionStorage();
        
        const tabNames = {
          'outstation': 'Outstation Trip',
          'local': 'Local Hourly Rental',
          'airport': 'Airport Transfer',
          'tour': 'Tour Package'
        };
        
        toast(
          `Switched to ${tabNames[selectedTab]}`,
          {
            description: "Previous selections have been reset.",
            duration: 3000,
          }
        );
        
        setTimeout(() => {
          isClearing.current = false;
        }, 500); // Increased from 300ms to 500ms for more reliability
      }
    }
    
    setPrevTab(selectedTab);
  }, [selectedTab, updateSessionStorage]);
  
  const handleTabChange = (value: string) => {
    if (value !== selectedTab && !isClearing.current && !isProcessingTabChange.current) {
      isProcessingTabChange.current = true;
      
      // Small delay to prevent rapid tab changes
      setTimeout(() => {
        onTabChange(value as 'outstation' | 'local' | 'airport' | 'tour');
        isProcessingTabChange.current = false;
      }, 100);
    }
  };
  
  return (
    <div className="space-y-4">
      <Tabs value={selectedTab} className="w-full" onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="outstation">Outstation</TabsTrigger>
          <TabsTrigger value="local">Local</TabsTrigger>
          <TabsTrigger value="airport">Airport</TabsTrigger>
          <TabsTrigger value="tour">Tour Packages</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {selectedTab === 'outstation' && (
        <div className="flex gap-3 mt-2">
          <Button
            type="button"
            variant={tripMode === 'one-way' ? 'default' : 'outline'}
            size="sm"
            className="flex-1"
            onClick={() => onTripModeChange('one-way')}
          >
            One Way
          </Button>
          <Button
            type="button"
            variant={tripMode === 'round-trip' ? 'default' : 'outline'}
            size="sm"
            className="flex-1"
            onClick={() => onTripModeChange('round-trip')}
          >
            Round Trip
          </Button>
        </div>
      )}
    </div>
  );
}
