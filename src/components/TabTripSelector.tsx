
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";

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
  const { toast } = useToast();

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
    
    // Force clear all calculated fare data
    sessionStorage.removeItem('calculatedFares');
    
    // Force clear trip specific data
    sessionStorage.removeItem('tripType');
    sessionStorage.removeItem('tripMode');
    sessionStorage.removeItem('distance');
    
    // Clear localStorage items that might cache fare data
    localStorage.removeItem('cabFares');
    localStorage.removeItem('lastTripType');
    localStorage.removeItem('lastTripMode');
    
    // Force clear local cache variables
    const localKeys = ['fare-', 'discount-', 'cab-', 'location-', 'trip-', 'price-'];
    
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
    
    // Also clear any items in localStorage that might be caching fare data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        for (const prefix of localKeys) {
          if (key.startsWith(prefix)) {
            console.log(`Removing cached item from localStorage: ${key}`);
            localStorage.removeItem(key);
            break;
          }
        }
      }
    }
  };
  
  // Clear any cached fare data when tab changes
  useEffect(() => {
    clearAllCacheData();
    
    // Store current trip type in sessionStorage to detect changes
    sessionStorage.setItem('currentTripType', selectedTab);
    
    // Reset drop location when switching to local
    if (selectedTab === 'local') {
      sessionStorage.removeItem('dropLocation');
    }
    
    // Notify user of tab change with toast
    const tabNames = {
      'outstation': 'Outstation Trip',
      'local': 'Local Hourly Rental',
      'airport': 'Airport Transfer',
      'tour': 'Tour Package'
    };
    
    toast({
      title: `Switched to ${tabNames[selectedTab]}`,
      description: "All previous selections have been reset.",
      duration: 2000,
    });
    
  }, [selectedTab, toast]);
  
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
