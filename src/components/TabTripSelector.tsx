
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useCallback, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { toast } from "sonner";
import { reloadCabTypes } from "@/lib/cabData";
import { fareService } from "@/services/fareService";

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
  // Add state to track if airport tab was previously selected to prevent excessive refreshes
  const [prevTab, setPrevTab] = useState<string | null>(null);
  // Add a debounce timer reference
  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);

  // Function to thoroughly clear all cache data
  const clearAllCacheData = useCallback(() => {
    console.log("Clearing all cached data for trip type change");
    
    // Store the old trip type to compare
    const oldTripType = sessionStorage.getItem('tripType');
    
    // Force clear all location data to properly reset the form state
    sessionStorage.removeItem('dropLocation');
    sessionStorage.removeItem('pickupLocation');
    sessionStorage.removeItem('dropCoordinates');
    sessionStorage.removeItem('pickupCoordinates');
    sessionStorage.removeItem('dropLocationObj');
    sessionStorage.removeItem('pickupLocationObj');
    
    // Clear booking-related data regardless of tab change
    sessionStorage.removeItem('selectedCab');
    sessionStorage.removeItem('hourlyPackage');
    sessionStorage.removeItem('tourPackage');
    sessionStorage.removeItem('bookingDetails');
    sessionStorage.removeItem('calculatedFares');
    sessionStorage.removeItem('distance');
    sessionStorage.removeItem('airportDirection');
    
    // Force clear trip-specific data when changing trip types
    if (oldTripType && oldTripType !== selectedTab) {
      console.log(`Trip type changed from ${oldTripType} to ${selectedTab}`);
      
      // Always clear the fare cache when changing trip types
      fareService.clearCache();
      sessionStorage.removeItem('cabFares');
      localStorage.removeItem('cabFares');
    }
    
    // Clear localStorage items that might cache fare data
    localStorage.removeItem('lastTripType');
    localStorage.removeItem('lastTripMode');
    
    // Clear any other cache items with standard prefixes
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
    
    // Store current trip type in sessionStorage
    sessionStorage.setItem('tripType', selectedTab);
    sessionStorage.setItem('tripMode', tripMode);
    sessionStorage.setItem('lastCacheClear', Date.now().toString());
  }, [selectedTab, tripMode]);
  
  // Clear cache data when tab changes
  useEffect(() => {
    // Only clear cache and reload if the tab actually changed
    if (prevTab !== selectedTab) {
      clearAllCacheData();
      setPrevTab(selectedTab);
      
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
      
      // Cancel any previous refresh timer
      if (refreshTimer) {
        clearTimeout(refreshTimer);
        setRefreshTimer(null);
      }
      
      // Force reload cab types when switching tabs to ensure fresh data
      const reloadTimer = setTimeout(() => {
        reloadCabTypes().catch(err => {
          console.error("Failed to reload cab types:", err);
        });
      }, 300); // Increased timeout to ensure other cleanups complete first
      
      setRefreshTimer(reloadTimer);
      
      return () => {
        if (reloadTimer) clearTimeout(reloadTimer);
      };
    }
  }, [selectedTab, toast, clearAllCacheData, prevTab, refreshTimer]);
  
  // Function to handle tab change with complete data reset
  const handleTabChange = (value: string) => {
    // Always completely reset state when changing tabs, even if selecting the same tab again
    // This forces a full refresh of data and UI state
    console.log(`Tab change requested: ${value} (current: ${selectedTab})`);
    
    // Cancel any existing timers
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      setRefreshTimer(null);
    }
    
    // Force a cache clear regardless of whether it's the same tab or not
    fareService.clearCache();
    
    // Force all location data to be cleared for a clean state
    sessionStorage.removeItem('dropLocation');
    sessionStorage.removeItem('pickupLocation');
    sessionStorage.removeItem('dropCoordinates');
    sessionStorage.removeItem('pickupCoordinates');
    sessionStorage.removeItem('dropLocationObj');
    sessionStorage.removeItem('pickupLocationObj');
    
    // Update the tab
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
