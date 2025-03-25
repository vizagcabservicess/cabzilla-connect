
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Car, PlaneTakeoff, Clock, MapPin, Compass, ChevronLeft, PenLine, Shield, User } from "lucide-react";
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

  const renderFeatures = () => {
    return (
      <div className="features-strip">
        <div className="features-strip-title">
          Guaranteed On-time Cabs!
        </div>
        <div className="features-items">
          <div className="feature-item">
            <div className="feature-icon">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className="feature-text">Trusted Drivers</div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div className="feature-text">Clean cabs</div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div className="feature-text">On-Time Pickup</div>
          </div>
        </div>
        <div className="text-sm text-blue-200 underline text-center mt-1">
          How do we ensure this? Learn more...
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
              <div className="h-3 w-3 bg-gray-800 rounded-full"></div>
              <div className="h-3 w-3 bg-gray-800 rounded-full ml-0.5"></div>
              <div className="h-3 w-3 bg-gray-800 rounded-full ml-0.5"></div>
            </div>
            <span className="font-medium">4G</span>
            <div className="bg-green-500 text-white text-xs rounded-sm px-1 ml-1">85%</div>
          </div>
        </div>
        
        {/* App Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/')}
            className="p-0 h-8 w-8"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">
            {selectedTab === 'outstation' ? 'Cab Search' : 
             selectedTab === 'airport' ? 'Airport Transfer' :
             selectedTab === 'local' ? 'Hourly Rentals' : 'Tour Packages'}
          </h1>
          <div className="w-8"></div>
        </div>
        
        {/* Features Banner */}
        {renderFeatures()}
        
        {/* Service Badge */}
        {renderServiceBadge()}
        
        {/* Trip Type Tabs */}
        <div className="bg-white p-3 border-b border-gray-200">
          <div className="p-1 bg-gray-100 rounded-full flex">
            <Button 
              variant="ghost"
              onClick={() => handleTabChange('outstation')}
              className={cn(
                "flex-1 rounded-full text-sm py-2 px-3",
                selectedTab === 'outstation' 
                  ? "bg-white text-blue-600 shadow-sm" 
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
                  ? "bg-white text-blue-600 shadow-sm" 
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
                  ? "bg-white text-blue-600 shadow-sm" 
                  : "bg-transparent text-gray-700"
              )}
            >
              Hourly Rentals
            </Button>
          </div>
        </div>
        
        {selectedTab === 'outstation' && (
          <>
            <div className="p-4 bg-white">
              <div className="trip-mode-toggle">
                <button
                  className={cn(
                    tripMode === 'one-way' ? "active" : ""
                  )}
                  onClick={() => onTripModeChange('one-way')}
                >
                  <div className="flex items-center justify-center">
                    <input 
                      type="radio" 
                      checked={tripMode === 'one-way'} 
                      onChange={() => {}} 
                      className="mr-2 h-4 w-4 text-blue-600" 
                    />
                    One Way
                  </div>
                </button>
                <button
                  className={cn(
                    tripMode === 'round-trip' ? "active" : ""
                  )}
                  onClick={() => onTripModeChange('round-trip')}
                >
                  <div className="flex items-center justify-center">
                    <input 
                      type="radio" 
                      checked={tripMode === 'round-trip'} 
                      onChange={() => {}} 
                      className="mr-2 h-4 w-4 text-blue-600" 
                    />
                    Round Trip
                  </div>
                </button>
              </div>
              
              <div className="mobile-app-card mt-4">
                <div className="p-3 border-b border-gray-100">
                  <div className="text-xs font-medium text-gray-500 mb-1">FROM</div>
                  <div className="flex items-center">
                    <div className="w-6 flex items-center justify-center">
                      <div className="h-3 w-3 rounded-full border-2 border-gray-400 bg-gray-200"></div>
                    </div>
                    <div className="text-base font-medium truncate">
                      Enter pickup location
                    </div>
                  </div>
                </div>
                
                <div className="p-3">
                  <div className="text-xs font-medium text-gray-500 mb-1">DROP ADDRESS</div>
                  <div className="flex items-center">
                    <div className="w-6 flex items-center justify-center">
                      <div className="h-3 w-3 rounded-full border-2 border-gray-400 bg-gray-200"></div>
                    </div>
                    <div className="text-base font-medium text-gray-400">
                      Enter drop location
                    </div>
                  </div>
                </div>
              </div>
              
              <button className="mt-4 border border-blue-400 text-blue-600 rounded-md py-2 w-full text-sm font-medium flex items-center justify-center">
                <span className="mr-2">+</span> ADD STOPS
              </button>
              
              <div className="mobile-app-card mt-4">
                <div className="p-3">
                  <div className="text-xs font-medium text-gray-500 mb-1">TRIP START</div>
                  <div className="flex items-center">
                    <div className="w-6 flex items-center justify-center">
                      <div className="h-5 w-5 text-gray-500">
                        <Clock className="h-full w-full" />
                      </div>
                    </div>
                    <div className="ml-1">
                      <div className="text-base font-medium">
                        {new Date().toLocaleDateString('en-US', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short'
                        })}
                      </div>
                      <div className="text-xs text-gray-500">10:00 AM</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <button className="app-button mt-6">
                SEARCH
              </button>
            </div>
          </>
        )}
        
        {selectedTab === 'airport' && (
          <div className="bg-amber-50 p-3 border-b border-amber-100 flex items-center">
            <MapPin className="text-amber-500 h-5 w-5 mr-2" />
            <p className="text-sm text-amber-700">Includes one pick up & drop at airport</p>
          </div>
        )}
        
        {selectedTab === 'tour' && (
          <div className="bg-blue-50 p-3 border-b border-blue-100 flex items-center">
            <Compass className="text-blue-500 h-5 w-5 mr-2" />
            <p className="text-sm text-blue-700">Explore curated tour packages with transportation</p>
          </div>
        )}
        
        {/* Partner banner */}
        <div className="bg-blue-50 p-3 my-4 mx-3 rounded-lg border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Our Top Rated Partner</div>
              <div className="text-xs text-gray-600">
                India's Leading {selectedTab === 'outstation' ? 'Outstation' : selectedTab === 'airport' ? 'Airport' : 'Local'} Cab Rentals Since 2006
              </div>
            </div>
            <div className="bg-white px-2 py-1 rounded">
              <strong className="text-blue-600 text-lg">SAVAARI</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
