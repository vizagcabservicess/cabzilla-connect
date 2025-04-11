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

  const clearAllFormState = useCallback(() => {
    const now = Date.now();
    if (now - lastClearTimeRef.current < clearThrottleTime) {
      console.log(`Throttling form state clear (last clear was ${now - lastClearTimeRef.current}ms ago)`);
      return;
    }
    
    lastClearTimeRef.current = now;
    console.log("✨ Aggressively clearing ALL form state and DOM elements");
    
    sessionStorage.removeItem('dropLocation');
    sessionStorage.removeItem('pickupLocation');
    sessionStorage.removeItem('dropCoordinates');
    sessionStorage.removeItem('pickupCoordinates');
    sessionStorage.removeItem('dropLocationObj');
    sessionStorage.removeItem('pickupLocationObj');
    
    sessionStorage.removeItem('selectedCab');
    sessionStorage.removeItem('hourlyPackage');
    sessionStorage.removeItem('tourPackage');
    sessionStorage.removeItem('bookingDetails');
    sessionStorage.removeItem('calculatedFares');
    sessionStorage.removeItem('distance');
    sessionStorage.removeItem('airportDirection');
    sessionStorage.removeItem('cabFares');
    
    const inputFields = document.querySelectorAll('input[type="text"]');
    inputFields.forEach(input => {
      const inputElement = input as HTMLInputElement;
      if (inputElement.placeholder && 
          (inputElement.placeholder.toLowerCase().includes('pickup') || 
           inputElement.placeholder.toLowerCase().includes('drop') ||
           inputElement.placeholder.toLowerCase().includes('location'))) {
        
        inputElement.value = '';
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        inputElement.dispatchEvent(new Event('change', { bubbles: true }));
        
        try {
          if ((inputElement as any)._valueTracker) {
            (inputElement as any)._valueTracker.setValue('');
          }
        } catch (e) {
          console.error("Error clearing React internal state:", e);
        }
      }
    });
    
    const clearEvent = new CustomEvent('locationCleared', { 
      bubbles: true, 
      detail: { source: 'TabTripSelector', timestamp: Date.now() } 
    });
    document.dispatchEvent(clearEvent);
    
    sessionStorage.setItem('lastFormClear', Date.now().toString());
  }, [clearThrottleTime]);

  const clearAllCacheData = useCallback(() => {
    const now = Date.now();
    if (now - lastClearTimeRef.current < clearThrottleTime) {
      console.log(`Throttling cache clear (last clear was ${now - lastClearTimeRef.current}ms ago)`);
      return;
    }
    
    lastClearTimeRef.current = now;
    console.log("Clearing all cached data for trip type change");
    
    const oldTripType = sessionStorage.getItem('tripType');
    
    sessionStorage.removeItem('dropLocation');
    sessionStorage.removeItem('pickupLocation');
    sessionStorage.removeItem('dropCoordinates');
    sessionStorage.removeItem('pickupCoordinates');
    sessionStorage.removeItem('dropLocationObj');
    sessionStorage.removeItem('pickupLocationObj');
    
    const pickupInput = document.querySelector('input[placeholder*="pickup"], input[placeholder*="Pickup"]') as HTMLInputElement;
    const dropInput = document.querySelector('input[placeholder*="drop"], input[placeholder*="Drop"]') as HTMLInputElement;
    
    if (pickupInput) {
      pickupInput.value = '';
      ['input', 'change', 'blur'].forEach(eventType => {
        const event = new Event(eventType, { bubbles: true });
        pickupInput.dispatchEvent(event);
      });
    }
    
    if (dropInput) {
      dropInput.value = '';
      ['input', 'change', 'blur'].forEach(eventType => {
        const event = new Event(eventType, { bubbles: true });
        dropInput.dispatchEvent(event);
      });
    }
    
    sessionStorage.removeItem('selectedCab');
    sessionStorage.removeItem('hourlyPackage');
    sessionStorage.removeItem('tourPackage');
    sessionStorage.removeItem('bookingDetails');
    sessionStorage.removeItem('calculatedFares');
    sessionStorage.removeItem('distance');
    sessionStorage.removeItem('airportDirection');
    
    if (oldTripType && oldTripType !== selectedTab) {
      console.log(`Trip type changed from ${oldTripType} to ${selectedTab}`);
      
      const lastFareCacheClear = parseInt(sessionStorage.getItem('lastFareCacheClear') || '0', 10);
      if (now - lastFareCacheClear > clearThrottleTime) {
        fareService.clearCache();
        sessionStorage.removeItem('cabFares');
        localStorage.removeItem('cabFares');
        sessionStorage.setItem('lastFareCacheClear', now.toString());
      }
    }
    
    localStorage.removeItem('lastTripType');
    localStorage.removeItem('lastTripMode');
    
    const localKeys = ['fare-', 'discount-', 'cab-', 'location-', 'trip-', 'price-'];
    
    Object.keys(sessionStorage).forEach(key => {
      for (const prefix of localKeys) {
        if (key.startsWith(prefix)) {
          console.log(`Removing cached item: ${key}`);
          sessionStorage.removeItem(key);
          break;
        }
      }
    });
    
    sessionStorage.setItem('tripType', selectedTab);
    sessionStorage.setItem('tripMode', tripMode);
    sessionStorage.setItem('lastCacheClear', Date.now().toString());
    
    const hasDispatchedRecently = sessionStorage.getItem('lastCacheClearedEvent');
    if (!hasDispatchedRecently || (now - parseInt(hasDispatchedRecently, 10)) > clearThrottleTime) {
      document.dispatchEvent(new CustomEvent('cacheCleared', { 
        detail: { tripType: selectedTab } 
      }));
      sessionStorage.setItem('lastCacheClearedEvent', now.toString());
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
    
    sessionStorage.setItem('lastTabClick', now.toString());
    
    console.log(`Tab change requested: ${value} (current: ${selectedTab})`);
    
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      setRefreshTimer(null);
    }
    
    clearAllFormState();
    clearAllCacheData();
    
    const lastLocationClearedEvent = parseInt(sessionStorage.getItem('lastLocationClearedEvent') || '0', 10);
    if (now - lastLocationClearedEvent > clearThrottleTime) {
      window.dispatchEvent(new CustomEvent('locationCleared', { detail: { type: 'all' } }));
      document.dispatchEvent(new CustomEvent('locationCleared', { detail: { type: 'all' } }));
      sessionStorage.setItem('lastLocationClearedEvent', now.toString());
    }
    
    const lastFareServiceClear = parseInt(sessionStorage.getItem('lastFareServiceClear') || '0', 10);
    if (now - lastFareServiceClear > clearThrottleTime) {
      fareService.clearCache();
      sessionStorage.setItem('lastFareServiceClear', now.toString());
    }
    
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
