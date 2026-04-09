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
  /** Show top-level One Way / Round Trip pills (admin create booking use-case). */
  showTripModeToggle?: boolean;
  /**
   * When true with showTripModeToggle: only render trip mode on viewports below lg
   * (e.g. Hero already has One Way / Round Trip in the desktop field row — avoids duplicate UI).
   */
  tripModeToggleMobileOnly?: boolean;
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
  showTripModeToggle = false,
  tripModeToggleMobileOnly = false,
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

  const allTabs = [
    { id: 'outstation' as const, label: 'Outstation', mobileLine1: 'Outstation', mobileLine2: 'Trips' },
    { id: 'local' as const, label: 'Local', mobileLine1: 'Hourly', mobileLine2: 'Rentals' },
    { id: 'airport' as const, label: 'Airport', mobileLine1: 'Airport', mobileLine2: 'Transfer' },
    { id: 'tour' as const, label: 'Tour', mobileLine1: 'Tour', mobileLine2: 'Packages' },
  ];
  const tabs = visibleTabs ? allTabs.filter((tab) => visibleTabs.includes(tab.id)) : allTabs;

  const showTabBar = !visibleTabs || visibleTabs.length > 1;
  const showTripMode =
    showTripModeToggle && (selectedTab === 'outstation' || selectedTab === 'tour');
  const showAirportDirection = selectedTab === 'airport' && Boolean(onAirportDirectionChange);

  /** Local-only embed: single tab + no trip-mode row → avoid empty bordered box on mobile */
  if (!showTabBar && !showTripMode && !showAirportDirection) {
    return null;
  }

  return (
    <div
      className="space-y-2 sm:space-y-4 max-lg:space-y-1.5 max-lg:rounded-2xl max-lg:border max-lg:border-gray-200 max-lg:bg-white max-lg:px-2.5 max-lg:py-2.5 max-lg:shadow-md max-lg:shadow-gray-900/5"
      id="tab-trip-selector"
    >
      {/* Tab bar - Hidden when only one tab is visible */}
      {showTabBar && (
        <>
          {/* Mobile/Tablet: pill tabs */}
          <div className="mb-0 sm:mb-4 lg:hidden">
            <div className="relative flex w-full justify-center">
              <div className="flex w-full gap-0.5 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
                {tabs.map((tab, idx) => {
                  const isActive = selectedTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      ref={(el) => {
                        if (el) tabRefs.current[idx] = el;
                      }}
                      type="button"
                      className={`flex min-h-[3.75rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-md px-0.5 py-1.5 text-center transition-colors duration-200 focus:outline-none ${isActive ? "z-10 border border-blue-600 bg-white text-blue-600 shadow-sm" : "border border-transparent bg-transparent text-gray-500"}`}
                      onClick={() => handleTabChange(tab.id)}
                      style={{ zIndex: isActive ? 2 : 1 }}
                    >
                      <span
                        className={`flex shrink-0 items-center justify-center [&_svg]:h-[18px] [&_svg]:w-[18px] ${isActive ? "text-blue-600" : "text-gray-400"}`}
                      >
                        {tabIcons[tab.id]}
                      </span>
                      <span className="flex max-w-full flex-col items-center justify-center gap-0.5 px-0.5 text-center leading-tight">
                        <span
                          className={`w-full whitespace-normal text-[11px] font-bold leading-[1.2] tracking-tight ${isActive ? "text-blue-600" : "text-gray-700"}`}
                        >
                          {tab.mobileLine1}
                        </span>
                        <span
                          className={`w-full whitespace-normal text-[10px] font-semibold leading-[1.2] tracking-tight ${isActive ? "text-blue-600" : "text-gray-500"}`}
                        >
                          {tab.mobileLine2}
                        </span>
                      </span>
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
      {/* Trip mode: mobile = app-style tiles; desktop = compact pills (unless mobile-only — desktop row lives in Hero) */}
      {showTripMode && (
        <>
          <motion.div
            className="mt-1 flex w-full max-w-full items-stretch gap-2 sm:mt-2 lg:hidden"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {(
              [
                { label: "One Way", sub: "Get dropped off", value: "one-way" },
                { label: "Round Trip", sub: "Keep cab till return", value: "round-trip" },
              ] as const
            ).map((option) => {
              const active = tripMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onTripModeChange(option.value)}
                  className={`flex min-h-[3.5rem] flex-1 basis-0 flex-col items-center justify-center rounded-lg border-2 bg-white px-2 py-2.5 text-center shadow-sm transition-colors duration-200 focus:outline-none ${
                    active ? "border-blue-600 ring-1 ring-blue-600/20" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className={`text-sm font-bold leading-tight ${active ? "text-blue-600" : "text-gray-700"}`}>
                    {option.label}
                  </span>
                  <span className={`mt-0.5 max-w-[11rem] text-[10px] font-medium leading-snug ${active ? "text-blue-500" : "text-gray-500"}`}>
                    {option.sub}
                  </span>
                </button>
              );
            })}
          </motion.div>
          {!tripModeToggleMobileOnly && (
            <motion.div
              className="mt-1 hidden gap-2 sm:mt-2 lg:flex lg:justify-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {(
                [
                  { label: "One Way", value: "one-way" as const },
                  { label: "Round Trip", value: "round-trip" as const },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onTripModeChange(option.value)}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-200 focus:outline-none sm:px-4 sm:py-2 sm:text-sm ${
                    tripMode === option.value
                      ? "border-blue-600 bg-blue-600 font-bold text-white shadow-sm"
                      : "border-gray-200 bg-gray-100 text-gray-700 hover:text-gray-900"
                  }`}
                >
                  <span className="relative flex h-4 w-4 shrink-0">
                    <span
                      className={`inline-block h-4 w-4 rounded-full border-2 ${
                        tripMode === option.value ? "border-white bg-blue-600" : "border-gray-400 bg-gray-100"
                      }`}
                    />
                    {tripMode === option.value && (
                      <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
                    )}
                  </span>
                  {option.label}
                </button>
              ))}
            </motion.div>
          )}
        </>
      )}
      {showAirportDirection && (
        <motion.div
          className="mt-1 flex w-full items-stretch gap-2 sm:mt-2 max-lg:mt-2 lg:hidden"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <button
            type="button"
            onClick={() => onAirportDirectionChange("from-airport")}
            className={`flex min-h-[3.5rem] flex-1 basis-0 flex-col items-center justify-center rounded-lg border-2 bg-white px-2 py-2.5 text-center shadow-sm transition-colors focus:outline-none ${
              airportDirectionLabel === "From Airport"
                ? "border-blue-600 text-blue-600 ring-1 ring-blue-600/20"
                : "border-gray-200 text-gray-700 hover:border-gray-300"
            }`}
          >
            <span className="text-sm font-bold leading-tight">From Airport</span>
            <span className="mt-0.5 max-w-[11rem] text-[10px] font-medium leading-snug text-gray-500">
              Pickup at terminal
            </span>
          </button>
          <button
            type="button"
            onClick={() => onAirportDirectionChange("to-airport")}
            className={`flex min-h-[3.5rem] flex-1 basis-0 flex-col items-center justify-center rounded-lg border-2 bg-white px-2 py-2.5 text-center shadow-sm transition-colors focus:outline-none ${
              airportDirectionLabel === "To Airport"
                ? "border-blue-600 text-blue-600 ring-1 ring-blue-600/20"
                : "border-gray-200 text-gray-700 hover:border-gray-300"
            }`}
          >
            <span className="text-sm font-bold leading-tight">To Airport</span>
            <span className="mt-0.5 max-w-[11rem] text-[10px] font-medium leading-snug text-gray-500">
              Drop at terminal
            </span>
          </button>
        </motion.div>
      )}
    </div>
  );
}