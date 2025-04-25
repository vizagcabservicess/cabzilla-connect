
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { TripMode, TripType } from '@/lib/tripTypes';
import { useIsMobile } from '@/hooks/use-mobile';

interface TabTripSelectorProps {
  selectedTab: TripType;
  tripMode: TripMode;
  onTabChange: (tab: TripType) => void;
  onTripModeChange: (mode: TripMode) => void;
}

export function TabTripSelector({
  selectedTab,
  tripMode,
  onTabChange,
  onTripModeChange
}: TabTripSelectorProps) {
  const isMobile = useIsMobile();
  
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap sm:flex-nowrap overflow-hidden rounded-md bg-gray-100">
        {(['outstation', 'airport', 'local'] as TripType[]).map((tab) => (
          <button
            key={tab}
            className={cn(
              "mobile-tab flex-auto md:flex-1",
              selectedTab === tab
                ? "border-blue-500 text-blue-600 bg-white"
                : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            )}
            onClick={() => onTabChange(tab)}
          >
            <span className="whitespace-nowrap">{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
          </button>
        ))}
      </div>

      {selectedTab === 'outstation' && (
        <div className={cn(
          "flex gap-2 w-full",
          isMobile ? "mobile-select-group" : ""
        )}>
          <button
            className={cn(
              "flex-1 py-2.5 px-3 rounded-md border text-center transition-colors duration-200 text-sm sm:text-base",
              tripMode === 'one-way'
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            )}
            onClick={() => onTripModeChange('one-way')}
          >
            One Way
          </button>
          <button
            className={cn(
              "flex-1 py-2.5 px-3 rounded-md border text-center transition-colors duration-200 text-sm sm:text-base",
              tripMode === 'round-trip'
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            )}
            onClick={() => onTripModeChange('round-trip')}
          >
            Round Trip
          </button>
        </div>
      )}
    </div>
  );
}

export default TabTripSelector;
