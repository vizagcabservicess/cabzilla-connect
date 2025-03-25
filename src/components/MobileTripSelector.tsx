
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Car, PlaneTakeoff, Clock, MapPin, Compass, 
  ChevronLeft, PenLine, Shield, User, Calendar, 
  Check, CircleUser, AlertCircle
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

  const renderFeatures = () => {
    return (
      <div className="bg-blue-900 text-white p-4">
        <div className="text-xl font-bold mb-2">
          Guaranteed On-time Cabs!
        </div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-col items-center">
            <div className="bg-blue-800 bg-opacity-40 rounded-full w-14 h-14 flex items-center justify-center mb-1">
              <CircleUser className="h-8 w-8 text-white" />
            </div>
            <div className="text-sm">Trusted Drivers</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="bg-blue-800 bg-opacity-40 rounded-full w-14 h-14 flex items-center justify-center mb-1">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div className="text-sm">Clean cabs</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="bg-blue-800 bg-opacity-40 rounded-full w-14 h-14 flex items-center justify-center mb-1">
              <Clock className="h-8 w-8 text-white" />
            </div>
            <div className="text-sm">On-Time Pickup</div>
          </div>
        </div>
        <div className="text-sm text-blue-200 underline text-center">
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

  const renderPartnerBanner = () => {
    return (
      <div className="bg-blue-50 p-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Our Top Rated Partner</div>
          <div className="text-xs text-gray-600">
            India's Leading {selectedTab === 'outstation' ? 'Outstation' : selectedTab === 'airport' ? 'Airport' : 'Local'} Cab Rentals Since 2006
          </div>
        </div>
        <div className="bg-white py-1 px-2 rounded border border-blue-100 flex items-center">
          <strong className="text-blue-600 text-xl">SAVAARI</strong>
          <span className="text-[10px] text-gray-600 ml-1">a make<strong>MY</strong>trip Group Company</span>
        </div>
      </div>
    );
  };

  const renderStats = () => {
    let count = '4,00,000+';
    let tripType = 'Outstation Trips';
    
    if (selectedTab === 'airport') {
      count = '6,40,000+';
      tripType = 'Airport Trips';
    } else if (selectedTab === 'local') {
      count = '32,000+';
      tripType = 'Hourly Rental Trips';
    }
    
    return (
      <div className="bg-blue-50 p-4">
        <div className="flex items-center">
          <div className="text-2xl font-bold text-blue-900">{count}</div>
          <div className="ml-2 text-sm text-gray-600">Customers trusted us with their {tripType}</div>
        </div>
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
        <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/')}
            className="p-0 h-8 w-8 mr-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">
            {selectedTab === 'outstation' ? 'Cab Search' : 
             selectedTab === 'airport' ? 'Airport Transfer' :
             selectedTab === 'local' ? 'Hourly Rentals' : 'Tour Packages'}
          </h1>
        </div>
        
        {/* Features Banner */}
        {renderFeatures()}
        
        {/* Service Badge */}
        {renderServiceBadge()}
        
        {/* Trip Type Tabs */}
        <div className="bg-white p-3 border-b border-gray-200">
          <div className="bg-gray-100 rounded-full flex">
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
            <div className="bg-white p-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                <div className="flex items-center">
                  <div className="flex-1 flex items-center mr-1">
                    <div className={cn(
                      "flex items-center justify-center rounded-full text-sm font-medium py-2 flex-1",
                      tripMode === 'one-way' 
                        ? "bg-blue-500 text-white" 
                        : "bg-white text-gray-700 border border-gray-300"
                    )}>
                      <div className="h-3 w-3 mr-1.5 rounded-full border-2 border-current flex items-center justify-center">
                        {tripMode === 'one-way' && <div className="h-1.5 w-1.5 bg-white rounded-full"></div>}
                      </div>
                      One Way
                    </div>
                  </div>
                  <div className="flex-1 flex items-center ml-1">
                    <div 
                      className={cn(
                        "flex items-center justify-center rounded-full text-sm font-medium py-2 flex-1",
                        tripMode === 'round-trip' 
                          ? "bg-blue-500 text-white" 
                          : "bg-white text-gray-700 border border-gray-300"
                      )}
                      onClick={() => onTripModeChange('round-trip')}
                    >
                      <div className="h-3 w-3 mr-1.5 rounded-full border-2 border-current flex items-center justify-center">
                        {tripMode === 'round-trip' && <div className="h-1.5 w-1.5 bg-white rounded-full"></div>}
                      </div>
                      Round Trip
                    </div>
                  </div>
                </div>
              </div>
              
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
              
              <button className="border border-blue-400 text-blue-600 rounded-md py-2.5 w-full text-sm font-medium flex items-center justify-center mb-4">
                <span className="mr-2">+</span> ADD STOPS
              </button>
              
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
                <div className="p-3">
                  <div className="text-xs font-medium text-gray-500 mb-1">TRIP START</div>
                  <div className="flex items-center">
                    <div className="w-8 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-gray-500" />
                    </div>
                    <div>
                      <div className="text-base font-medium">
                        Tue 25 Mar 2025
                      </div>
                      <div className="text-xs text-gray-500">10:15 PM</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <button className="bg-blue-500 text-white rounded-md py-3 w-full text-base font-medium">
                SEARCH
              </button>
            </div>
            
            {renderPartnerBanner()}
            {renderStats()}
          </>
        )}
        
        {selectedTab === 'airport' && (
          <>
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
            
            {renderStats()}
            
            <div className="p-4">
              <h2 className="text-lg font-bold mb-3">What's New</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-xl shadow">
                  <div className="flex items-start gap-2">
                    <div className="bg-orange-200 h-12 w-12 rounded-full flex items-center justify-center">
                      <Car className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">Pre-book International Airport cabs</h3>
                      <p className="text-xs text-gray-600 mt-1">Get guaranteed airport cabs outside India with meet & greet services</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-3 rounded-xl shadow">
                  <div className="flex items-start gap-2">
                    <div className="bg-blue-200 h-12 w-12 rounded-full flex items-center justify-center">
                      <Clock className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">Make Your Trip Affordable</h3>
                      <p className="text-xs text-gray-600 mt-1">With Book Now Pay Later, Low Cost EMI & Amazing Offers.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        
        {selectedTab === 'local' && (
          <>
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
            
            {renderStats()}
          </>
        )}
      </div>
    </div>
  );
}
