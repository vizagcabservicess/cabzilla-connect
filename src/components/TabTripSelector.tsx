
import { useEffect } from "react";
import { TripMode, TripType } from "@/lib/cabData";
import { cn } from "@/lib/utils";
import { CarTaxiFront, Clock, Plane, RotateCw } from "lucide-react";

interface TabTripSelectorProps {
  selectedTab: TripType | string;
  tripMode?: TripMode;
  onTabChange: (tab: TripType) => void;
  onTripModeChange?: (mode: TripMode) => void;
}

export function TabTripSelector({
  selectedTab,
  tripMode = "one-way",
  onTabChange,
  onTripModeChange,
}: TabTripSelectorProps) {
  // Load previously selected tab and trip mode from session storage on component mount
  useEffect(() => {
    const savedTab = sessionStorage.getItem('selectedTab') as TripType;
    const savedTripMode = sessionStorage.getItem('tripMode') as TripMode;
    
    if (savedTab && savedTab !== selectedTab) {
      onTabChange(savedTab);
    }
    
    if (savedTripMode && onTripModeChange && savedTripMode !== tripMode) {
      onTripModeChange(savedTripMode);
    }
  }, []);

  const clearCachedFares = () => {
    // Clear any cached fare data when changing tabs
    localStorage.removeItem('cachedFares');
    localStorage.removeItem('cachedVehiclePricing');
    localStorage.removeItem('cachedTourFares');
    
    // Also remove from session storage if used there
    sessionStorage.removeItem('cachedFares');
    sessionStorage.removeItem('cachedVehiclePricing');
    sessionStorage.removeItem('cachedTourFares');
    
    console.log('Cleared cached fare data');
  };

  const handleTabChange = (tab: TripType) => {
    // Clear cached fares before changing tab
    clearCachedFares();
    
    onTabChange(tab);
    // Save selected tab in session storage
    sessionStorage.setItem('selectedTab', tab);
  };

  const handleTripModeChange = (mode: TripMode) => {
    if (onTripModeChange) {
      // Clear cached fares before changing trip mode
      clearCachedFares();
      
      onTripModeChange(mode);
      // Save trip mode in session storage
      sessionStorage.setItem('tripMode', mode);
    }
  };

  return (
    <div className="w-full mb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1 bg-gray-100 p-1 rounded-lg">
        {/* Outstation One-Way Tab */}
        <button
          onClick={() => {
            handleTabChange("outstation");
            handleTripModeChange("one-way");
          }}
          className={cn(
            "flex items-center justify-center py-3 px-4 rounded-md transition-all text-sm font-medium",
            (selectedTab === "outstation" && tripMode === "one-way")
              ? "bg-white shadow-sm text-blue-600"
              : "hover:bg-white/50 text-gray-600"
          )}
        >
          <CarTaxiFront size={18} className="mr-2" />
          <span>Outstation One-Way</span>
        </button>

        {/* Outstation Round-Trip Tab */}
        <button
          onClick={() => {
            handleTabChange("outstation");
            handleTripModeChange("round-trip");
          }}
          className={cn(
            "flex items-center justify-center py-3 px-4 rounded-md transition-all text-sm font-medium",
            (selectedTab === "outstation" && tripMode === "round-trip")
              ? "bg-white shadow-sm text-blue-600"
              : "hover:bg-white/50 text-gray-600"
          )}
        >
          <RotateCw size={18} className="mr-2" />
          <span>Outstation Round-Trip</span>
        </button>

        {/* Airport Transfers Tab */}
        <button
          onClick={() => handleTabChange("airport")}
          className={cn(
            "flex items-center justify-center py-3 px-4 rounded-md transition-all text-sm font-medium",
            selectedTab === "airport"
              ? "bg-white shadow-sm text-blue-600"
              : "hover:bg-white/50 text-gray-600"
          )}
        >
          <Plane size={18} className="mr-2" />
          <span>Airport Transfers</span>
        </button>

        {/* Hourly Rentals Tab */}
        <button
          onClick={() => handleTabChange("local")}
          className={cn(
            "flex items-center justify-center py-3 px-4 rounded-md transition-all text-sm font-medium",
            selectedTab === "local"
              ? "bg-white shadow-sm text-blue-600"
              : "hover:bg-white/50 text-gray-600"
          )}
        >
          <Clock size={18} className="mr-2" />
          <span>Hourly Rentals</span>
        </button>
      </div>
    </div>
  );
}
