
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useCallback, useState, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { toast } from "sonner";
import { reloadCabTypes } from "@/lib/cabData";
import { fareService } from "@/services/fareService";
import { TourPackageSelector } from "@/components/TourPackageSelector";

interface TabTripSelectorProps {
  selectedTab: 'outstation' | 'local' | 'airport' | 'tour';
  tripMode: 'one-way' | 'round-trip';
  onTabChange: (tab: 'outstation' | 'local' | 'airport' | 'tour') => void;
  onTripModeChange: (mode: 'one-way' | 'round-trip') => void;
  selectedTour?: string | null;
  onTourChange?: (tourId: string) => void;
}

export function TabTripSelector({ 
  selectedTab, 
  tripMode, 
  onTabChange, 
  onTripModeChange,
  selectedTour = null,
  onTourChange = () => {}
}: TabTripSelectorProps) {
  const { toast } = useToast();
  const [prevTab, setPrevTab] = useState<string | null>(null);
  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);
  const lastClearTimeRef = useRef<number>(0);
  const clearThrottleTime = 2000; // 2 seconds minimum between clears
  const lastTabChangeRef = useRef<number>(0);

  const clearAllFormState = useCallback(() => {
    const now = Date.now();
    if (now - lastClearTimeRef.current < clearThrottleTime) {
      console.log(`Throttling form state clear (last clear was ${now - lastClearTimeRef.current}ms ago)`);
      return;
    }
    
    lastClearTimeRef.current = now;
    console.log("✨ Clearing form state for tab change");
    
    // Clear only relevant session storage items to avoid aggressive refreshes
    sessionStorage.removeItem('dropLocation');
    sessionStorage.removeItem('pickupLocation');
    
    // The code below was causing UI refresh issues, so we'll handle DOM updates more carefully
    const inputFields = document.querySelectorAll('input[type="text"]');
    inputFields.forEach(input => {
      const inputElement = input as HTMLInputElement;
      if (inputElement.placeholder && 
          (inputElement.placeholder.toLowerCase().includes('pickup') || 
           inputElement.placeholder.toLowerCase().includes('drop') ||
           inputElement.placeholder.toLowerCase().includes('location'))) {
        
        // Clear without triggering events that could cause UI refreshes
        if (inputElement.value) {
          inputElement.value = '';
        }
      }
    });
    
    // Only dispatch this event once to prevent cascading updates
    if (now - parseInt(sessionStorage.getItem('lastLocationClearedEvent') || '0', 10) > clearThrottleTime) {
      const clearEvent = new CustomEvent('locationCleared', { 
        bubbles: true, 
        detail: { source: 'TabTripSelector', timestamp: now } 
      });
      document.dispatchEvent(clearEvent);
      sessionStorage.setItem('lastLocationClearedEvent', now.toString());
    }
    
  }, [clearThrottleTime]);

  const clearAllCacheData = useCallback(() => {
    const now = Date.now();
    if (now - lastClearTimeRef.current < clearThrottleTime) {
      console.log(`Throttling cache clear (last clear was ${now - lastClearTimeRef.current}ms ago)`);
      return;
    }
    
    lastClearTimeRef.current = now;
    console.log("Clearing cache data for trip type change");
    
    const oldTripType = sessionStorage.getItem('tripType');
    
    // Store the new trip type
    sessionStorage.setItem('tripType', selectedTab);
    sessionStorage.setItem('tripMode', tripMode);
    
    // Only clear fare cache when trip type actually changes
    if (oldTripType && oldTripType !== selectedTab) {
      console.log(`Trip type changed from ${oldTripType} to ${selectedTab}`);
      
      const lastFareCacheClear = parseInt(sessionStorage.getItem('lastFareCacheClear') || '0', 10);
      if (now - lastFareCacheClear > clearThrottleTime) {
        fareService.clearCache();
        sessionStorage.setItem('lastFareCacheClear', now.toString());
      }
    }
  }, [selectedTab, tripMode, clearThrottleTime]);

  useEffect(() => {
    if (prevTab !== selectedTab) {
      const debounceTime = 300;
      const now = Date.now();
      const lastTabChangeTime = parseInt(sessionStorage.getItem('lastTabChangeTime') || '0', 10);
      
      if (now - lastTabChangeTime < debounceTime) {
        console.log('Debouncing tab change operations');
        return;
      }
      
      sessionStorage.setItem('lastTabChangeTime', now.toString());
      
      // Clear data only when tab changes
      clearAllCacheData();
      clearAllFormState();
      setPrevTab(selectedTab);
      
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
      
      if (refreshTimer) {
        clearTimeout(refreshTimer);
        setRefreshTimer(null);
      }
      
      // Limit cab type reloads to prevent API hammering
      const lastCabTypeReload = parseInt(sessionStorage.getItem('lastCabTypeReload') || '0', 10);
      if (now - lastCabTypeReload > 5000) {
        const reloadTimer = setTimeout(() => {
          reloadCabTypes().catch(err => {
            console.error("Failed to reload cab types:", err);
          });
          sessionStorage.setItem('lastCabTypeReload', Date.now().toString());
        }, 800);
        
        setRefreshTimer(reloadTimer);
      }
      
      return () => {
        if (refreshTimer) clearTimeout(refreshTimer);
      };
    }
  }, [selectedTab, toast, clearAllCacheData, prevTab, refreshTimer, clearAllFormState]);

  const handleTabChange = (value: string) => {
    const now = Date.now();
    const lastTabClick = parseInt(sessionStorage.getItem('lastTabClick') || '0', 10);
    const debounceTime = 1000;
    
    if (now - lastTabClick < debounceTime) {
      console.log(`Debouncing tab click (last click was ${now - lastTabClick}ms ago)`);
      return;
    }
    
    if (value === selectedTab) {
      console.log(`Tab ${value} already selected, ignoring click`);
      return;
    }
    
    sessionStorage.setItem('lastTabClick', now.toString());
    lastTabChangeRef.current = now;
    
    console.log(`Tab change requested: ${value} (current: ${selectedTab})`);
    
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      setRefreshTimer(null);
    }
    
    // Perform clear operations only once
    clearAllFormState();
    clearAllCacheData();
    
    // Set a timeout to ensure the state update happens after current execution
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
      
      {selectedTab === 'tour' && (
        <div className="mt-4">
          <TourPackageSelector 
            selectedTour={selectedTour} 
            onTourChange={onTourChange} 
          />
        </div>
      )}
    </div>
  );
}
