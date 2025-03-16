
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect } from "react";

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
  // Function to thoroughly clear all cache data
  const clearAllCacheData = () => {
    console.log("Clearing all cached data");
    
    // Clear all booking and fare related data
    sessionStorage.removeItem('selectedCab');
    sessionStorage.removeItem('hourlyPackage');
    sessionStorage.removeItem('tourPackage');
    sessionStorage.removeItem('bookingDetails');
    sessionStorage.removeItem('cabFares');
    sessionStorage.removeItem('dropLocation');
    sessionStorage.removeItem('pickupLocation');
    sessionStorage.removeItem('pickupDate');
    sessionStorage.removeItem('returnDate');
    
    // Force clear local cache variables
    const localKeys = ['fare-', 'discount-', 'cab-', 'location-', 'trip-'];
    
    // Loop through sessionStorage to find items with these keys
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        for (const prefix of localKeys) {
          if (key.startsWith(prefix)) {
            console.log(`Removing cached item: ${key}`);
            sessionStorage.removeItem(key);
            break;
          }
        }
      }
    }
  };
  
  // Clear any cached fare data when tab changes
  useEffect(() => {
    clearAllCacheData();
    
    // Reset drop location when switching to local
    if (selectedTab === 'local') {
      sessionStorage.removeItem('dropLocation');
    }
  }, [selectedTab]);
  
  // Function to handle tab change with complete data reset
  const handleTabChange = (value: string) => {
    // Force clear all cached data
    clearAllCacheData();
    
    // Then update the tab
    onTabChange(value as 'outstation' | 'local' | 'airport' | 'tour');
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
