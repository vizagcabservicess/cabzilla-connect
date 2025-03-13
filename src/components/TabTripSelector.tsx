
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
  return (
    <div className="w-full mb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1 bg-gray-100 p-1 rounded-lg">
        {/* Outstation One-Way Tab */}
        <button
          onClick={() => {
            onTabChange("outstation");
            if (onTripModeChange) onTripModeChange("one-way");
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
            onTabChange("outstation");
            if (onTripModeChange) onTripModeChange("round-trip");
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
          onClick={() => onTabChange("airport")}
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
          onClick={() => onTabChange("local")}
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
