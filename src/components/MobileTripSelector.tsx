
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Car, PlaneTakeoff, Clock, MapPin, Compass, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";

interface MobileTripSelectorProps {
  selectedTab: 'outstation' | 'local' | 'airport' | 'tour';
  tripMode: 'one-way' | 'round-trip';
  onTabChange: (tab: 'outstation' | 'local' | 'airport' | 'tour') => void;
  onTripModeChange: (mode: 'one-way' | 'round-trip') => void;
}

export function MobileTripSelector({
  selectedTab,
  tripMode,
  onTabChange,
  onTripModeChange
}: MobileTripSelectorProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [prevTab, setPrevTab] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Clear cache data when tab changes
  useEffect(() => {
    if (prevTab !== selectedTab) {
      // Store the current trip type in sessionStorage
      sessionStorage.setItem('tripType', selectedTab);
      sessionStorage.setItem('tripMode', tripMode);
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
    }
  }, [selectedTab, toast, tripMode, prevTab]);

  // Function to handle tab change
  const handleTabChange = (value: 'outstation' | 'local' | 'airport' | 'tour') => {
    onTabChange(value);
    setIsDrawerOpen(false);
  };

  if (!isMobile) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="flex flex-col w-full">
        <div className="bg-white shadow-sm fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/')}
            className="p-0 h-8 w-8"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Vizag Cabs</h1>
          <div className="w-8"></div>
        </div>
        
        <div className="pt-14 pb-2 px-3 bg-white">
          <div className="grid grid-cols-4 gap-2 mb-2">
            <Button 
              variant="ghost"
              onClick={() => handleTabChange('outstation')}
              className={cn(
                "flex flex-col items-center justify-center py-3 rounded-xl",
                selectedTab === 'outstation' 
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md" 
                  : "bg-white text-gray-700 border shadow-sm"
              )}
            >
              <Car className={cn("h-5 w-5 mb-1", selectedTab === 'outstation' ? "text-white" : "text-blue-500")} />
              <span className="text-xs font-medium">Outstation</span>
            </Button>
            
            <Button 
              variant="ghost"
              onClick={() => handleTabChange('airport')}
              className={cn(
                "flex flex-col items-center justify-center py-3 rounded-xl",
                selectedTab === 'airport' 
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md" 
                  : "bg-white text-gray-700 border shadow-sm"
              )}
            >
              <PlaneTakeoff className={cn("h-5 w-5 mb-1", selectedTab === 'airport' ? "text-white" : "text-blue-500")} />
              <span className="text-xs font-medium">Airport</span>
            </Button>
            
            <Button 
              variant="ghost"
              onClick={() => handleTabChange('local')}
              className={cn(
                "flex flex-col items-center justify-center py-3 rounded-xl",
                selectedTab === 'local' 
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md" 
                  : "bg-white text-gray-700 border shadow-sm"
              )}
            >
              <Clock className={cn("h-5 w-5 mb-1", selectedTab === 'local' ? "text-white" : "text-blue-500")} />
              <span className="text-xs font-medium">Hourly</span>
            </Button>
            
            <Button 
              variant="ghost"
              onClick={() => handleTabChange('tour')}
              className={cn(
                "flex flex-col items-center justify-center py-3 rounded-xl",
                selectedTab === 'tour' 
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md" 
                  : "bg-white text-gray-700 border shadow-sm"
              )}
            >
              <Compass className={cn("h-5 w-5 mb-1", selectedTab === 'tour' ? "text-white" : "text-blue-500")} />
              <span className="text-xs font-medium">Tours</span>
            </Button>
          </div>
        </div>
        
        {selectedTab === 'outstation' && (
          <>
            <div className="bg-amber-50 p-3 border-y flex items-center">
              <MapPin className="text-amber-500 h-5 w-5 mr-2" />
              <p className="text-sm text-amber-700">Includes one pick up & drop</p>
            </div>
            <div className="p-3 flex items-center gap-2">
              <div className="flex border rounded-md w-full overflow-hidden shadow-sm">
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(
                    "flex-1 rounded-l-md py-2 px-4 text-sm",
                    tripMode === 'one-way' 
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white" 
                      : "bg-white text-gray-700"
                  )}
                  onClick={() => onTripModeChange('one-way')}
                >
                  <span className="flex items-center">
                    <input 
                      type="radio" 
                      checked={tripMode === 'one-way'} 
                      onChange={() => {}} 
                      className="mr-2 h-4 w-4" 
                    />
                    One Way
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(
                    "flex-1 rounded-r-md py-2 px-4 text-sm",
                    tripMode === 'round-trip' 
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white" 
                      : "bg-white text-gray-700"
                  )}
                  onClick={() => onTripModeChange('round-trip')}
                >
                  <span className="flex items-center">
                    <input 
                      type="radio" 
                      checked={tripMode === 'round-trip'} 
                      onChange={() => {}} 
                      className="mr-2 h-4 w-4" 
                    />
                    Round Trip
                  </span>
                </Button>
              </div>
            </div>
          </>
        )}
        
        {selectedTab === 'tour' && (
          <div className="bg-blue-50 p-3 border-y flex items-center">
            <Compass className="text-blue-500 h-5 w-5 mr-2" />
            <p className="text-sm text-blue-700">Explore curated tour packages with transportation</p>
          </div>
        )}
      </div>
    </div>
  );
}
