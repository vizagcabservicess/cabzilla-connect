
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { toast } from "sonner";
import { reloadCabTypes } from "@/lib/cabData";

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
  const clearAllCacheData = useCallback(() => {
    console.log("Clearing all cached data for trip type change");
    
    const oldTripType = sessionStorage.getItem('tripType');
    
    // Force clear drop location for ALL tab changes
    sessionStorage.removeItem('dropLocation');
    
    // Clear specific data for airport tab
    if (selectedTab === 'airport') {
      // For airport tab, also clear pickup location to ensure fresh selection
      sessionStorage.removeItem('pickupLocation');
    }
    
    // Clear all booking and fare related data
    sessionStorage.removeItem('selectedCab');
    sessionStorage.removeItem('hourlyPackage');
    sessionStorage.removeItem('tourPackage');
    sessionStorage.removeItem('bookingDetails');
    sessionStorage.removeItem('cabFares');
    sessionStorage.removeItem('calculatedFares');
    sessionStorage.removeItem('distance');
    
    // Force clear trip specific data
    if (oldTripType && oldTripType !== selectedTab) {
      console.log(`Trip type changed from ${oldTripType} to ${selectedTab}`);
    }
    
    // Clear localStorage items that might cache fare data
    localStorage.removeItem('cabFares');
    localStorage.removeItem('lastTripType');
    localStorage.removeItem('lastTripMode');
    
    // Force clear local cache variables
    const localKeys = ['fare-', 'discount-', 'cab-', 'location-', 'trip-', 'price-'];
    
    // Loop through sessionStorage to find items with these keys
    Object.keys(sessionStorage).forEach(key => {
      for (const prefix of localKeys) {
        if (key.startsWith(prefix)) {
          console.log(`Removing cached item: ${key}`);
          sessionStorage.removeItem(key);
          break;
        }
      }
    });
    
    // Also clear any items in localStorage that might be caching fare data
    Object.keys(localStorage).forEach(key => {
      for (const prefix of localKeys) {
        if (key.startsWith(prefix)) {
          console.log(`Removing cached item from localStorage: ${key}`);
          localStorage.removeItem(key);
          break;
        }
      }
    });
    
    // Store current trip type in sessionStorage
    sessionStorage.setItem('tripType', selectedTab);
    sessionStorage.setItem('tripMode', tripMode);
    sessionStorage.setItem('lastCacheClear', Date.now().toString());
    
    // Also reload cab types to ensure fresh data
    reloadCabTypes().catch(err => {
      console.error("Failed to reload cab types:", err);
    });
  }, [selectedTab, tripMode]);
  
  // Clear any cached fare data when tab changes
  useEffect(() => {
    clearAllCacheData();
    
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
      duration: 3000,
    });
    
    if (selectedTab === 'airport') {
      console.log('Trip type changed to airport');
      
      // Force a reload of the page when switching to airport tab to ensure clean state
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
    
  }, [selectedTab, toast, clearAllCacheData]);
  
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
