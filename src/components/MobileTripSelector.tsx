import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Car, PlaneTakeoff, Clock, MapPin, Compass, 
  ChevronLeft, PenLine, Shield, User, Calendar, 
  Check, CircleUser, AlertCircle, X
} from "lucide-react";
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
  const [statusBarTime, setStatusBarTime] = useState("10:09");
  const [showStopsTooltip, setShowStopsTooltip] = useState(false);
  const [locations, setLocations] = useState({
    from: "14-263, Port Quarters Area, Ganesh Colony, Vi...",
    to: selectedTab === "airport" ? "Vishakhapatnam Airport" : "Enter drop location"
  });

  // Generate status bar time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setStatusBarTime(`${hours}:${minutes}`);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000);
    
    return () => clearInterval(interval);
  }, []);

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

  const renderHeader = () => {
    return (
      <div className="bg-blue-900 text-white py-4 px-5">
        <h2 className="text-xl font-bold mb-1">Guaranteed On-time Cabs!</h2>
        <div className="flex items-center text-sm space-x-2 mb-3">
          <div className="flex items-center">
            <span className="mr-1">•</span>
            <span>Trusted Drivers</span>
          </div>
          <div className="flex items-center">
            <span className="mr-1">•</span>
            <span>Clean cabs</span>
          </div>
          <div className="flex items-center">
            <span className="mr-1">•</span>
            <span>On-Time Pickup</span>
          </div>
        </div>
        <div className="text-blue-300 text-sm">
          How do we ensure this? <span className="underline">Learn more...</span>
        </div>
      </div>
    );
  };

  const renderServiceBadge = () => {
    let message = "";
    switch(selectedTab) {
      case 'outstation':
        message = "Making outstation travel seamless for last 7 years";
        break;
      case 'airport':
        message = "Present across 75 domestic & 600+ international airports";
        break;
      case 'local':
        message = "Covering 70+ cities for your local travel needs";
        break;
      case 'tour':
        message = "Explore curated tour packages with professional guides";
        break;
    }
    
    return (
      <div className="bg-blue-900 text-white text-center py-2 text-sm font-medium">
        {message}
      </div>
    );
  };

  return (
    <div className="w-full pb-16">
      <div className="flex flex-col w-full">
        {/* Status Bar */}
        <div className="bg-white h-8 flex items-center justify-between px-4 text-sm">
          <div className="font-semibold">{statusBarTime}</div>
          <div className="flex items-center gap-1">
            <div className="flex">
              <div className="h-2 w-2 bg-gray-800 rounded-full"></div>
              <div className="h-2 w-2 bg-gray-800 rounded-full ml-0.5"></div>
              <div className="h-2 w-2 bg-gray-800 rounded-full ml-0.5"></div>
            </div>
            <span className="font-medium ml-1">4G</span>
            <div className="bg-green-500 text-white text-xs rounded-sm px-1 ml-1">85%</div>
          </div>
        </div>
        
        {/* App Header */}
        {renderHeader()}
        
        {/* Service Badge */}
        {renderServiceBadge()}
        
        {/* Trip Type Tabs */}
        <div className="bg-white p-4">
          <div className="bg-gray-100 rounded-full p-1 flex">
            <Button 
              variant="ghost"
              onClick={() => handleTabChange('outstation')}
              className={cn(
                "flex-1 rounded-full text-sm py-2 px-3",
                selectedTab === 'outstation' 
                  ? "bg-white shadow-sm text-blue-600" 
                  : "bg-transparent text-gray-700"
              )}
            >
              Outstation
            </Button>
            
            <Button 
              variant="ghost"
              onClick={() => handleTabChange('airport')}
              className={cn(
                "flex-1 rounded-full text-sm py-2 px-3",
                selectedTab === 'airport' 
                  ? "bg-white shadow-sm text-blue-600" 
                  : "bg-transparent text-gray-700"
              )}
            >
              Airport
            </Button>
            
            <Button 
              variant="ghost"
              onClick={() => handleTabChange('local')}
              className={cn(
                "flex-1 rounded-full text-sm py-2 px-3",
                selectedTab === 'local' 
                  ? "bg-white shadow-sm text-blue-600" 
                  : "bg-transparent text-gray-700"
              )}
            >
              Hourly Rentals
            </Button>
          </div>
        </div>
        
        {/* Trip Mode Selection */}
        {selectedTab === 'outstation' && (
          <div className="bg-white p-4">
            <div className="bg-gray-100 rounded-lg border border-gray-200 p-2 flex items-center justify-between">
              <button 
                className={cn(
                  "flex-1 flex items-center justify-center px-2 py-1.5 rounded-full text-sm font-medium",
                  tripMode === 'one-way' 
                    ? "bg-blue-500 text-white" 
                    : "bg-white text-gray-700 border border-gray-300"
                )}
                onClick={() => onTripModeChange('one-way')}
              >
                <div className="flex items-center">
                  <div className="h-3 w-3 mr-1.5 rounded-full border-2 border-current flex items-center justify-center">
                    {tripMode === 'one-way' && <div className="h-1.5 w-1.5 bg-white rounded-full"></div>}
                  </div>
                  <span>One Way</span>
                </div>
              </button>
              
              <button 
                className={cn(
                  "flex-1 flex items-center justify-center px-2 py-1.5 rounded-full text-sm font-medium ml-2",
                  tripMode === 'round-trip' 
                    ? "bg-blue-500 text-white" 
                    : "bg-white text-gray-700 border border-gray-300"
                )}
                onClick={() => onTripModeChange('round-trip')}
              >
                <div className="flex items-center">
                  <div className="h-3 w-3 mr-1.5 rounded-full border-2 border-current flex items-center justify-center">
                    {tripMode === 'round-trip' && <div className="h-1.5 w-1.5 bg-white rounded-full"></div>}
                  </div>
                  <span>Round Trip</span>
                </div>
              </button>
            </div>
            
            {/* Location Inputs */}
            <div className="bg-white rounded-lg border border-gray-200 mt-4">
              <div className="p-3 border-b border-gray-100">
                <div className="text-xs font-medium text-gray-500 mb-1">FROM</div>
                <div className="flex items-center">
                  <div className="w-8 flex items-center justify-center">
                    <div className="h-3 w-3 rounded-full bg-gray-300 border-2 border-gray-400"></div>
                  </div>
                  <div className="text-base font-medium line-clamp-1">
                    {locations.from}
                  </div>
                </div>
              </div>
              
              <div className="p-3">
                <div className="text-xs font-medium text-gray-500 mb-1">DROP ADDRESS</div>
                <div className="flex items-center">
                  <div className="w-8 flex items-center justify-center">
                    <div className="h-3 w-3 rounded-full bg-gray-300 border-2 border-gray-400"></div>
                  </div>
                  <div className="text-base text-gray-400">
                    Enter drop location
                  </div>
                </div>
              </div>
            </div>
            
            {/* Add Stops Button */}
            <div className="relative mt-4">
              <button 
                className="border border-blue-400 text-blue-600 rounded-md py-2.5 w-full text-sm font-medium flex items-center justify-center"
                onClick={() => setShowStopsTooltip(true)}
              >
                <span className="mr-2">+</span> ADD STOPS
              </button>
              
              {showStopsTooltip && (
                <div className="absolute top-full left-0 right-0 bg-gray-800 text-white p-3 rounded-md mt-1 z-10 shadow-lg">
                  <div className="flex justify-between items-start">
                    <div className="text-sm">
                      You can add one or multiple stops
                    </div>
                    <button 
                      className="text-white"
                      onClick={() => setShowStopsTooltip(false)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Trip Start */}
            <div className="bg-white rounded-lg border border-gray-200 mt-4">
              <div className="p-3">
                <div className="text-xs font-medium text-gray-500 mb-1">TRIP START</div>
                <div className="flex items-center">
                  <div className="w-8 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <div className="text-base font-medium">
                      Tue <span className="font-bold">25 Mar</span> 2025
                    </div>
                    <div className="text-xs text-gray-500">10:15 PM</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Search Button */}
            <button className="bg-blue-500 text-white rounded-md py-3 w-full text-base font-medium mt-6">
              SEARCH
            </button>
          </div>
        )}
        
        {selectedTab === 'airport' && (
          
          <div className="bg-white p-4">              
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-4">
              <div className="p-3 border-b border-gray-100">
                <div className="text-xs font-medium text-gray-500 mb-1">FROM</div>
                <div className="flex items-center">
                  <div className="w-8 flex items-center justify-center">
                    <div className="h-3 w-3 rounded-full bg-gray-300 border-2 border-gray-400"></div>
                  </div>
                  <div className="text-base font-medium line-clamp-1">
                    {locations.from}
                  </div>
                </div>
              </div>
              
              <div className="p-3">
                <div className="text-xs font-medium text-gray-500 mb-1">TO</div>
                <div className="flex items-center">
                  <div className="w-8 flex items-center justify-center">
                    <div className="h-3 w-3 rounded-full bg-gray-300 border-2 border-gray-400"></div>
                  </div>
                  <div className="text-base font-medium line-clamp-1">
                    Vishakhapatnam Airport
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
              <div className="p-3">
                <div className="text-xs font-medium text-gray-500 mb-1">TRIP START</div>
                <div className="flex items-center">
                  <div className="w-8 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <div className="text-base font-medium">
                      Wed 26 Mar 2025
                    </div>
                    <div className="text-xs text-gray-500">10:00 AM</div>
                  </div>
                </div>
              </div>
            </div>
            
            <button className="bg-blue-500 text-white rounded-md py-3 w-full text-base font-medium">
              SEARCH
            </button>
          </div>
        )}
        
        {selectedTab === 'local' && (
          
          <div className="bg-white p-4">              
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-4">
              <div className="p-3">
                <div className="text-xs font-medium text-gray-500 mb-1">FROM</div>
                <div className="flex items-center">
                  <div className="w-8 flex items-center justify-center">
                    <div className="h-3 w-3 rounded-full bg-gray-300 border-2 border-gray-400"></div>
                  </div>
                  <div className="text-base font-medium line-clamp-1">
                    {locations.from}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-4">
              <div className="p-3">
                <div className="text-xs font-medium text-gray-500 mb-1">TRIP START</div>
                <div className="flex items-center">
                  <div className="w-8 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <div className="text-base font-medium">
                      Wed 26 Mar 2025
                    </div>
                    <div className="text-xs text-gray-500">10:00 AM</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
              <div className="p-3">
                <div className="text-xs font-medium text-gray-500 mb-1">SELECT PACKAGE</div>
                <div className="flex items-center">
                  <div className="w-8 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-gray-500" />
                  </div>
                  <div className="text-base font-medium">
                    1 Hrs 10 Kms
                  </div>
                </div>
              </div>
            </div>
            
            <button className="bg-blue-500 text-white rounded-md py-3 w-full text-base font-medium">
              SEARCH
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
