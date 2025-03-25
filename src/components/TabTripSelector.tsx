import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useCallback, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { reloadCabTypes } from "@/lib/cabData";
import { fareService } from "@/services/fareService";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileTripSelector } from "./MobileTripSelector";

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
  const isMobile = useIsMobile();
  const [prevTab, setPrevTab] = useState<string | null>(null);
  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);

  const clearAllFormState = useCallback(() => {
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
    
    setTimeout(() => {
      reloadCabTypes().catch(err => {
        console.error("Failed to reload cab types after clearing state:", err);
      });
    }, 100);
  }, []);

  const clearAllCacheData = useCallback(() => {
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
      fareService.clearCache();
      sessionStorage.removeItem('cabFares');
      localStorage.removeItem('cabFares');
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
    
    document.dispatchEvent(new CustomEvent('cacheCleared', { 
      detail: { tripType: selectedTab } 
    }));
  }, [selectedTab, tripMode]);

  useEffect(() => {
    if (prevTab !== selectedTab) {
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
      
      const reloadTimer = setTimeout(() => {
        reloadCabTypes().catch(err => {
          console.error("Failed to reload cab types:", err);
        });
      }, 300);
      
      setRefreshTimer(reloadTimer);
      
      return () => {
        if (reloadTimer) clearTimeout(reloadTimer);
      };
    }
  }, [selectedTab, toast, clearAllCacheData, prevTab, refreshTimer, clearAllFormState]);

  const handleTabChange = (value: string) => {
    console.log(`Tab change requested: ${value} (current: ${selectedTab})`);
    
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      setRefreshTimer(null);
    }

    clearAllFormState();
    clearAllCacheData();
    
    window.dispatchEvent(new CustomEvent('locationCleared', { detail: { type: 'all' } }));
    document.dispatchEvent(new CustomEvent('locationCleared', { detail: { type: 'all' } }));
    
    fareService.clearCache();
    
    setTimeout(() => {
      onTabChange(value as 'outstation' | 'local' | 'airport' | 'tour');
    }, 50);
  };

  if (isMobile) {
    return (
      <MobileTripSelector
        selectedTab={selectedTab}
        tripMode={tripMode}
        onTabChange={onTabChange}
        onTripModeChange={onTripModeChange}
      />
    );
  }
  
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
