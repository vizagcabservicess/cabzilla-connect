import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useEffect, useCallback, useState, useRef, useLayoutEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";
import { reloadCabTypes } from "@/lib/cabData";
import { TabBar } from "@/components/TabBar";
import { fareService } from "@/services/fareService";

interface TabTripSelectorProps {
  selectedTab: 'outstation' | 'local' | 'airport' | 'tour';
  tripMode: 'one-way' | 'round-trip';
  onTabChange: (tab: 'outstation' | 'local' | 'airport' | 'tour') => void;
  onTripModeChange: (mode: 'one-way' | 'round-trip') => void;
  onClearLocations?: () => void;
  visibleTabs?: Array<'outstation' | 'local' | 'airport' | 'tour'>; // <-- new prop
}

export function TabTripSelector({ 
  selectedTab, 
  tripMode, 
  onTabChange, 
  onTripModeChange, 
  onClearLocations,
  visibleTabs
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
    
    // Only clear locations if we're not in a single-tab mode (Hero widgets)
    // This prevents clearing locations when navigating between pages
    if (!visibleTabs || visibleTabs.length > 1) {
      sessionStorage.removeItem('pickupLocation');
      sessionStorage.removeItem('dropLocation');
      sessionStorage.removeItem('pickupCoordinates');
      sessionStorage.removeItem('dropCoordinates');
      if (onClearLocations) onClearLocations();
    }
    
    onTabChange(value as 'outstation' | 'local' | 'airport' | 'tour');
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
      {/* Tab bar with top border/line - Hidden when only one tab is visible */}
      {(!visibleTabs || visibleTabs.length > 1) && (
        <div className="mb-2 sm:mb-4">
          <div className="relative w-full flex justify-center">
            <div className="flex w-full bg-gray-50 sm:bg-gray-100 rounded-lg sm:rounded-full p-0.5 sm:p-1 border border-gray-200" style={{boxShadow: 'none'}}>
              {tabs.map((tab, idx) => {
                const isActive = selectedTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    ref={el => tabRefs.current[idx] = el}
                    className={`flex-1 min-w-0 py-2.5 sm:py-2 px-2 sm:px-4 flex items-center justify-center rounded-md sm:rounded-full font-bold sm:font-medium transition-colors duration-200 text-sm sm:text-sm text-center focus:outline-none ${isActive ? "bg-white border border-blue-600 shadow-sm z-10 text-blue-700 font-bold" : "bg-transparent text-gray-600 font-semibold sm:font-medium"}`}
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
      )}
      {/* Trip mode radio group */}
      {selectedTab === 'outstation' && (
        <motion.div 
          className="flex gap-2 sm:gap-2 mt-1 sm:mt-2 justify-center"
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
                ${tripMode === option.value ? 'bg-white border-blue-600 text-blue-700 shadow-sm font-bold' : 'bg-gray-50 border-gray-300 text-gray-700 font-semibold sm:font-medium'}`}
            >
              <span className="relative flex h-4 w-4">
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
    </div>
  );
}
