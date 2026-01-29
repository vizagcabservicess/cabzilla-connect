import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useEffect, useCallback, useState, useRef, useLayoutEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { reloadCabTypes } from "@/lib/cabData";
import { TabBar } from "@/components/TabBar";
import { fareService } from "@/services/fareService";
import { Car, Clock, Plane, Building2 } from "lucide-react";

interface TabTripSelectorProps {
  selectedTab: 'outstation' | 'local' | 'airport' | 'tour';
  tripMode: 'one-way' | 'round-trip';
  onTabChange: (tab: 'outstation' | 'local' | 'airport' | 'tour') => void;
  onTripModeChange: (mode: 'one-way' | 'round-trip') => void;
  onClearLocations?: () => void;
  visibleTabs?: Array<'outstation' | 'local' | 'airport' | 'tour'>;
  /** Airport tab: show From Airport / To Airport instead of One Way / Round Trip */
  airportDirectionLabel?: string;
  onAirportDirectionChange?: (direction: 'from-airport' | 'to-airport') => void;
}

export function TabTripSelector({ 
  selectedTab, 
  tripMode, 
  onTabChange, 
  onTripModeChange, 
  onClearLocations,
  visibleTabs,
  airportDirectionLabel,
  onAirportDirectionChange,
}: TabTripSelectorProps) {
  const { toast } = useToast();
  const [prevTab, setPrevTab] = useState<string | null>(null);
  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);
  const lastClearTimeRef = useRef<number>(0);
  const clearThrottleTime = 2000; // 2 seconds minimum between clears
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  
  // Less aggressive form state clearing - preserves map-related data
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
    
    // Clear booking-related data but NOT the location data
    sessionStorage.removeItem('selectedCab');
    sessionStorage.removeItem('hourlyPackage');
    sessionStorage.removeItem('tourPackage');
    sessionStorage.removeItem('bookingDetails');
    sessionStorage.removeItem('calculatedFares');
    
    // Don't clear the cabFares here which can cause maps not to show
    
    // Store the current time of last clear operation
    sessionStorage.setItem('lastFormClear', Date.now().toString());
  }, [clearThrottleTime]);
  
  // Simplified cache data clearing that preserves map-related data
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
    
    // Only clear fare data but NOT location data
    sessionStorage.removeItem('selectedCab');
    sessionStorage.removeItem('hourlyPackage');
    sessionStorage.removeItem('tourPackage');
    sessionStorage.removeItem('bookingDetails');
    sessionStorage.removeItem('calculatedFares');
    
    // Store current trip type in sessionStorage without clearing location data
    sessionStorage.setItem('tripType', selectedTab);
    sessionStorage.setItem('tripMode', tripMode);
    sessionStorage.setItem('lastCacheClear', Date.now().toString());
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
      
      // Notify user of tab change with toast (only for non-tour tabs to avoid obstruction)
      // if (selectedTab !== 'tour') {
      //   const tabNames = {
      //     'outstation': 'Outstation Trip',
      //     'local': 'Local Hourly Rental',
      //     'airport': 'Airport Transfer',
      //     'tour': 'Tour Package'
      //   };
      //   
      //   toast({
      //     title: `Switched to ${tabNames[selectedTab]}`,
      //     description: "Your selections have been adjusted.",
      //     duration: 3000,
      //   });
      // }
      
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
      }, 800);
      
      setRefreshTimer(reloadTimer);
      
      return () => {
        if (refreshTimer) clearTimeout(refreshTimer);
      };
    }
  }, [selectedTab, toast, clearCacheData, prevTab, refreshTimer, clearFormState]);
  
  useLayoutEffect(() => {
    const idx = tabs.findIndex(t => t.id === selectedTab);
    const node = tabRefs.current[idx];
    if (node) {
      setIndicatorStyle({ left: node.offsetLeft, width: node.offsetWidth });
    }
  }, [selectedTab]);
  
  // Function to handle tab change with debounce
  const handleTabChange = (value: string) => {
    clearFormState();
    clearCacheData();
    
    // Clear locations when manually switching tabs
    // This allows users to clear locations when switching between trip types
    if (!visibleTabs || visibleTabs.length > 1) {
      // Clear drop location when switching from airport to outstation
      if (value === 'outstation' && selectedTab === 'airport') {
        sessionStorage.removeItem('dropLocation');
        sessionStorage.removeItem('dropCoordinates');
      }
      // Clear drop location for local and tour tabs
      else if (value === 'local' || value === 'tour') {
        sessionStorage.removeItem('dropLocation');
        sessionStorage.removeItem('dropCoordinates');
      }
      // For other cases, preserve locations for automatic switching
      
      if (onClearLocations) onClearLocations();
    }
    
    onTabChange(value as 'outstation' | 'local' | 'airport' | 'tour');
  };
  
  const tabIcons: Record<string, React.ReactNode> = {
    outstation: <Car className="w-4 h-4" />,
    local: <Clock className="w-4 h-4" />,
    airport: <Plane className="w-4 h-4" />,
    tour: <Building2 className="w-4 h-4" />,
  };

  // Convert trip types to tab format - REMOVED pooling
  const allTabs = [
    { id: 'outstation', label: 'Outstation' },
    { id: 'local', label: 'Local' },
    { id: 'airport', label: 'Airport' },
    { id: 'tour', label: 'Tour' }
  ];
  const tabs = visibleTabs ? allTabs.filter(tab => visibleTabs.includes(tab.id as any)) : allTabs;
  
  return (
    <div className="space-y-2 sm:space-y-4" id="tab-trip-selector">
      {/* Tab bar - Hidden when only one tab is visible */}
      {(!visibleTabs || visibleTabs.length > 1) && (
        <>
          {/* Mobile/Tablet: pill tabs */}
          <div className="mb-2 sm:mb-4 lg:hidden">
            <div className="relative w-full flex justify-center">
              <div className="flex w-full bg-gray-50 sm:bg-gray-100 rounded-lg sm:rounded-full p-0.5 sm:p-1 border border-gray-200" style={{boxShadow: 'none'}}>
                {tabs.map((tab, idx) => {
                  const isActive = selectedTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      ref={(el) => { if (el) tabRefs.current[idx] = el; }}
                      className={`flex-1 min-w-0 py-2.5 sm:py-2 px-2 sm:px-4 flex items-center justify-center rounded-md sm:rounded-full font-bold sm:font-medium transition-colors duration-200 text-sm text-center focus:outline-none ${isActive ? "bg-white border border-blue-600 shadow-sm z-10 text-blue-700 font-bold" : "bg-transparent text-gray-600 font-semibold sm:font-medium"}`}
                      onClick={() => handleTabChange(tab.id)}
                      style={{ zIndex: isActive ? 2 : 1 }}
                    >
                      <span className="leading-tight font-bold sm:font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          {/* Desktop: underline tabs with icons + tagline */}
          <div className="hidden lg:block mb-0 pb-4 border-b border-gray-200">
            <div className="flex items-end justify-between gap-4 w-full">
              <div className="flex gap-0 flex-1 min-w-0">
                {tabs.map((tab, idx) => {
                  const isActive = selectedTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      ref={(el) => { if (el) tabRefs.current[idx] = el; }}
                      className={`flex items-center gap-2 py-2 px-3 border-b-2 transition-colors duration-200 text-sm font-medium focus:outline-none -mb-[1px] ${isActive ? "border-blue-600 text-blue-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}
                      onClick={() => handleTabChange(tab.id)}
                    >
                      {tabIcons[tab.id]}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0 pb-1">Vizag&apos;s Fastest Cab Booking Platform</p>
            </div>
          </div>
        </>
      )}
      {/* Trip mode: Outstation/Tour = One Way / Round Trip; Airport = From Airport / To Airport - mobile/tablet only */}
      {(selectedTab === 'outstation' || selectedTab === 'tour') && (
        <motion.div 
          className="flex gap-2 sm:gap-2 mt-1 sm:mt-2 justify-center lg:hidden"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {[{label: 'One Way', value: 'one-way'}, {label: 'Round Trip', value: 'round-trip'}].map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => onTripModeChange(option.value as 'one-way' | 'round-trip')}
              className={`flex items-center gap-2 px-4 sm:px-3 py-2 sm:py-1 rounded-lg sm:rounded-full border transition-colors duration-200 focus:outline-none text-sm sm:text-xs font-bold sm:font-medium
                lg:rounded-full
                ${tripMode === option.value 
                  ? 'bg-white border-blue-600 text-blue-700 shadow-sm font-bold lg:bg-blue-600 lg:border-blue-600 lg:text-white' 
                  : 'bg-gray-50 border-gray-300 text-gray-700 font-semibold sm:font-medium lg:bg-gray-100 lg:border-gray-200 lg:text-gray-700'}`}
            >
              <span className="relative flex h-4 w-4 lg:hidden">
                <span className={`inline-block w-4 h-4 rounded-full border-2 ${tripMode === option.value ? 'border-blue-600 bg-white' : 'border-gray-400 bg-gray-100'}`}></span>
                {tripMode === option.value && (
                  <span className="absolute left-1/2 top-1/2 w-2 h-2 bg-blue-600 rounded-full -translate-x-1/2 -translate-y-1/2"></span>
                )}
              </span>
              {option.label}
            </button>
          ))}
        </motion.div>
      )}
      {selectedTab === 'airport' && onAirportDirectionChange && (
        <motion.div 
          className="flex gap-2 sm:gap-2 mt-1 sm:mt-2 justify-center lg:hidden"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <button
            type="button"
            onClick={() => onAirportDirectionChange('from-airport')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 sm:px-3 py-2 sm:py-1 rounded-lg sm:rounded-full border transition-colors duration-200 focus:outline-none text-xs font-medium whitespace-nowrap
              ${airportDirectionLabel === 'From Airport' ? 'bg-white border-blue-600 text-blue-700 shadow-sm font-bold lg:bg-blue-600 lg:text-white' : 'bg-gray-50 border-gray-300 text-gray-700 font-semibold sm:font-medium lg:bg-gray-100 lg:border-gray-200 lg:text-gray-700'}`}
          >
            From Airport
          </button>
          <button
            type="button"
            onClick={() => onAirportDirectionChange('to-airport')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 sm:px-3 py-2 sm:py-1 rounded-lg sm:rounded-full border transition-colors duration-200 focus:outline-none text-xs font-medium whitespace-nowrap
              ${airportDirectionLabel === 'To Airport' ? 'bg-white border-blue-600 text-blue-700 shadow-sm font-bold lg:bg-blue-600 lg:text-white' : 'bg-gray-50 border-gray-300 text-gray-700 font-semibold sm:font-medium lg:bg-gray-100 lg:border-gray-200 lg:text-gray-700'}`}
          >
            To Airport
          </button>
        </motion.div>
      )}
    </div>
  );
}