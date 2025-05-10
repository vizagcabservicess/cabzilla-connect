
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useCallback, useState, useRef } from "react";
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
  const [prevTab, setPrevTab] = useState<string | null>(null);
  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);
  const lastClearTimeRef = useRef<number>(0);
  const clearThrottleTime = 2000; // 2 seconds minimum between clears

  // Function to clear form state but preserve map-related data
  const clearFormState = useCallback(() => {
    // Check if we've cleared recently to prevent loops
    const now = Date.now();
    if (now - lastClearTimeRef.current < clearThrottleTime) {
      console.log(`Throttling form state clear (last clear was ${now - lastClearTimeRef.current}ms ago)`);
      return;
    }
    
    lastClearTimeRef.current = now;
    console.log("✨ Clearing form state while preserving map data");
    
    // Store location coordinates before clearing
    const pickupCoords = sessionStorage.getItem('pickupCoordinates');
    const dropCoords = sessionStorage.getItem('dropCoordinates');
    const pickupLoc = sessionStorage.getItem('pickupLocation');
    const dropLoc = sessionStorage.getItem('dropLocation');
    
    // Clear booking-related data
    sessionStorage.removeItem('selectedCab');
    sessionStorage.removeItem('hourlyPackage');
    sessionStorage.removeItem('tourPackage');
    sessionStorage.removeItem('bookingDetails');
    sessionStorage.removeItem('calculatedFares');
    sessionStorage.removeItem('cabFares');
    
    // Find and clear text inputs but not map-related fields
    const inputFields = document.querySelectorAll('input[type="text"]');
    inputFields.forEach(input => {
      const inputElement = input as HTMLInputElement;
      // Skip map location fields when clearing
      if (inputElement.placeholder && 
          !(inputElement.placeholder.toLowerCase().includes('pickup') || 
            inputElement.placeholder.toLowerCase().includes('drop') ||
            inputElement.placeholder.toLowerCase().includes('location'))) {
        
        // Clear the input value
        inputElement.value = '';
        
        // Dispatch both input and change events to ensure React state is updated
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        inputElement.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    
    // Store the current time of last clear operation
    sessionStorage.setItem('lastFormClear', Date.now().toString());
    
    // Restore location data if needed for the same trip type
    if (pickupCoords) sessionStorage.setItem('pickupCoordinates', pickupCoords);
    if (dropCoords) sessionStorage.setItem('dropCoordinates', dropCoords);
    if (pickupLoc) sessionStorage.setItem('pickupLocation', pickupLoc);
    if (dropLoc) sessionStorage.setItem('dropLocation', dropLoc);
  }, [clearThrottleTime]);
  
  // Function to clear cache data with throttling
  const clearCacheData = useCallback(() => {
    // Check if we've cleared recently to prevent loops
    const now = Date.now();
    if (now - lastClearTimeRef.current < clearThrottleTime) {
      console.log(`Throttling cache clear (last clear was ${now - lastClearTimeRef.current}ms ago)`);
      return;
    }
    
    lastClearTimeRef.current = now;
    console.log("Clearing cache data for trip type change");
    
    // Store the old trip type to compare
    const oldTripType = sessionStorage.getItem('tripType');
    
    // Only clear fare and booking data, preserve location data
    sessionStorage.removeItem('selectedCab');
    sessionStorage.removeItem('hourlyPackage');
    sessionStorage.removeItem('tourPackage');
    sessionStorage.removeItem('bookingDetails');
    sessionStorage.removeItem('calculatedFares');
    
    // Force clear trip-specific data when changing trip types
    if (oldTripType && oldTripType !== selectedTab) {
      console.log(`Trip type changed from ${oldTripType} to ${selectedTab}`);
      
      // Always clear the fare cache when changing trip types - but don't do this
      // in a way that will cause a cascade of events
      const lastFareCacheClear = parseInt(sessionStorage.getItem('lastFareCacheClear') || '0', 10);
      if (now - lastFareCacheClear > clearThrottleTime) {
        fareService.clearCache();
        sessionStorage.removeItem('cabFares');
        localStorage.removeItem('cabFares');
        sessionStorage.setItem('lastFareCacheClear', now.toString());
      }
    }
    
    // Clear localStorage items that might cache fare data
    localStorage.removeItem('lastTripType');
    localStorage.removeItem('lastTripMode');
    
    // Clear any other cache items with standard prefixes
    const localKeys = ['fare-', 'discount-', 'cab-', 'price-'];
    
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
    
    // Dispatch a custom event to notify other components of the cleared state
    // but use a flag to prevent duplicate events
    const hasDispatchedRecently = sessionStorage.getItem('lastCacheClearedEvent');
    if (!hasDispatchedRecently || (now - parseInt(hasDispatchedRecently, 10)) > clearThrottleTime) {
      document.dispatchEvent(new CustomEvent('cacheCleared', { 
        detail: { tripType: selectedTab } 
      }));
      sessionStorage.setItem('lastCacheClearedEvent', now.toString());
    }
  }, [selectedTab, tripMode, clearThrottleTime]);
  
  // Clear cache data when tab changes with debouncing
  useEffect(() => {
    // Only clear cache and reload if the tab actually changed
    if (prevTab !== selectedTab) {
      // Set a debounce to prevent multiple rapid executions
      const debounceTime = 300; // 300ms debounce
      const now = Date.now();
      const lastTabChangeTime = parseInt(sessionStorage.getItem('lastTabChangeTime') || '0', 10);
      
      if (now - lastTabChangeTime < debounceTime) {
        console.log('Debouncing tab change operations');
        return;
      }
      
      sessionStorage.setItem('lastTabChangeTime', now.toString());
      clearCacheData();
      clearFormState(); // Use the less aggressive clear
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
        description: "Your selections have been adjusted.",
        duration: 3000,
      });
      
      // Cancel any previous refresh timer
      if (refreshTimer) {
        clearTimeout(refreshTimer);
        setRefreshTimer(null);
      }
      
      // Force reload cab types when switching tabs to ensure fresh data
      // but use a larger timeout and check if we've done this recently
      const lastCabTypeReload = parseInt(sessionStorage.getItem('lastCabTypeReload') || '0', 10);
      if (now - lastCabTypeReload > 5000) { // Only reload if it's been more than 5 seconds
        const reloadTimer = setTimeout(() => {
          reloadCabTypes().catch(err => {
            console.error("Failed to reload cab types:", err);
          });
          sessionStorage.setItem('lastCabTypeReload', Date.now().toString());
        }, 800); // Increased timeout to ensure other cleanups complete first
        
        setRefreshTimer(reloadTimer);
      }
      
      return () => {
        if (refreshTimer) clearTimeout(refreshTimer);
      };
    }
  }, [selectedTab, toast, clearCacheData, prevTab, refreshTimer, clearFormState]);
  
  // Function to handle tab change with debounce
  const handleTabChange = (value: string) => {
    // Check for debouncing
    const now = Date.now();
    const lastTabClick = parseInt(sessionStorage.getItem('lastTabClick') || '0', 10);
    const debounceTime = 1000; // 1 second debounce for tab clicks
    
    if (now - lastTabClick < debounceTime) {
      console.log(`Debouncing tab click (last click was ${now - lastTabClick}ms ago)`);
      return;
    }
    
    // Store the time of this click
    sessionStorage.setItem('lastTabClick', now.toString());
    
    console.log(`Tab change requested: ${value} (current: ${selectedTab})`);
    
    // Cancel any existing timers
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      setRefreshTimer(null);
    }

    // Use the less aggressive clearing method
    clearFormState();
    clearCacheData();
    
    // Force a cache clear regardless of whether it's the same tab or not
    // but only if we haven't cleared recently
    const lastFareServiceClear = parseInt(sessionStorage.getItem('lastFareServiceClear') || '0', 10);
    if (now - lastFareServiceClear > clearThrottleTime) {
      fareService.clearCache();
      sessionStorage.setItem('lastFareServiceClear', now.toString());
    }
    
    // Update the tab - this needs to happen AFTER all the clearing operations
    // to ensure React state is updated with clean data
    setTimeout(() => {
      onTabChange(value as 'outstation' | 'local' | 'airport' | 'tour');
    }, 50);
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
