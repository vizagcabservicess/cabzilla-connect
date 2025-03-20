
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
  const [prevTab, setPrevTab] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  
  // Function to clear form state without excessive operations
  const clearFormState = useCallback(() => {
    if (isClearing) return; // Prevent multiple simultaneous clearing operations
    
    setIsClearing(true);
    console.log("Clearing form state for tab change");
    
    // Clear key session storage items
    sessionStorage.removeItem('dropLocation');
    sessionStorage.removeItem('pickupLocation');
    sessionStorage.removeItem('selectedCab');
    
    // Store current trip type in sessionStorage
    sessionStorage.setItem('tripType', selectedTab);
    sessionStorage.setItem('tripMode', tripMode);
    
    // Allow clearing to happen again after a short delay
    setTimeout(() => setIsClearing(false), 300);
  }, [selectedTab, tripMode, isClearing]);
  
  // Clear form state when tab changes
  useEffect(() => {
    if (prevTab !== selectedTab) {
      clearFormState();
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
        description: "Previous selections have been reset.",
        duration: 3000,
      });
    }
  }, [selectedTab, toast, clearFormState, prevTab]);
  
  // Function to handle tab change
  const handleTabChange = (value: string) => {
    // Only perform a full reset when changing to a different tab
    if (value !== selectedTab) {
      // This will trigger the useEffect above
      onTabChange(value as 'outstation' | 'local' | 'airport' | 'tour');
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
