
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { MobileTabSelector } from "./MobileTabSelector";
import { MobileTripModeToggle } from "./MobileTripModeToggle";
import { MobileLocationField } from "./MobileLocationField";
import { MobileAddStopsButton } from "./MobileAddStopsButton";
import { MobileDateTimePicker } from "./MobileDateTimePicker";
import { MobileSearchButton } from "./MobileSearchButton";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  TripType,
  TripMode,
  ensureCustomerTripType 
} from "@/lib/tripTypes";
import { 
  Location, 
  vizagLocations 
} from "@/lib/locationData";
import { isLocationInVizag } from "@/lib/locationUtils";

interface MobileBookingInterfaceProps {
  onSubmit: (formData: {
    tripType: TripType;
    tripMode: TripMode;
    pickupLocation: Location | null;
    dropLocation: Location | null;
    pickupDate: Date | undefined;
  }) => void;
}

export function MobileBookingInterface({ onSubmit }: MobileBookingInterfaceProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [tripType, setTripType] = useState<TripType>("outstation");
  const [tripMode, setTripMode] = useState<TripMode>("one-way");
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropLocation, setDropLocation] = useState<Location | null>(null);
  const [pickupDate, setPickupDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    if (tripType === "airport") {
      const airport = vizagLocations.find(loc => loc.type === 'airport');
      if (airport) {
        if (!pickupLocation && !dropLocation) {
          setPickupLocation(airport);
        }
      }
    }
  }, [tripType, pickupLocation, dropLocation]);

  useEffect(() => {
    if (tripType === "local") {
      setDropLocation(null);
    }
  }, [tripType]);

  const handleTabChange = (tab: TripType) => {
    setTripType(tab);
    setTripMode("one-way");
  };

  const handleSearch = () => {
    if (!pickupLocation) {
      toast({
        title: "Missing pickup location",
        description: "Please enter your pickup location",
        variant: "destructive",
      });
      return;
    }

    if (tripType !== "local" && !dropLocation) {
      toast({
        title: "Missing drop location",
        description: "Please enter your destination",
        variant: "destructive",
      });
      return;
    }

    if (!pickupDate) {
      toast({
        title: "Missing date and time",
        description: "Please select your trip date and time",
        variant: "destructive",
      });
      return;
    }

    onSubmit({
      tripType,
      tripMode,
      pickupLocation,
      dropLocation,
      pickupDate,
    });
  };

  const handlePickupLocationChange = (location: Location) => {
    if (!location) return;
    
    if (location.isInVizag === undefined) {
      location.isInVizag = isLocationInVizag(location);
    }
    
    setPickupLocation(location);
  };
  
  const handleDropLocationChange = (location: Location) => {
    if (!location) return;
    
    if (location.isInVizag === undefined) {
      location.isInVizag = isLocationInVizag(location);
    }
    
    setDropLocation(location);
  };

  if (!isMobile) return null;

  return (
    <div className="bg-white rounded-xl p-4 shadow-md">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center mb-2">
          <div className="bg-blue-500 text-white w-10 h-10 rounded-md flex items-center justify-center text-xl font-bold">
            CC
          </div>
          <h3 className="text-blue-600 font-medium ml-2 text-lg">BOOK A CAB IN MINUTES</h3>
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Your Journey, Our Priority</h1>
      </div>
      
      <MobileTabSelector 
        selectedTab={ensureCustomerTripType(tripType)} 
        onTabChange={handleTabChange} 
      />
      
      <div className="mt-4">
        <MobileTripModeToggle 
          tripMode={tripMode} 
          onTripModeChange={setTripMode} 
          disabled={tripType === "local"}
        />
      </div>
      
      <div className="mt-4 space-y-3">
        <MobileLocationField
          type="pickup"
          location={pickupLocation}
          onLocationChange={handlePickupLocationChange}
          placeholder="Enter pickup location"
          isAirportTransfer={tripType === "airport"}
          readOnly={tripType === "airport" && pickupLocation?.type === "airport"}
        />
        
        {tripType !== "local" && (
          <MobileLocationField
            type="dropoff"
            location={dropLocation}
            onLocationChange={handleDropLocationChange}
            placeholder="Enter drop location"
            isAirportTransfer={tripType === "airport"}
            readOnly={tripType === "airport" && dropLocation?.type === "airport"}
          />
        )}
      </div>
      
      {tripType !== "local" && (
        <div className="mt-3">
          <MobileAddStopsButton />
        </div>
      )}
      
      <div className="mt-3">
        <MobileDateTimePicker
          date={pickupDate}
          onDateChange={setPickupDate}
          minDate={new Date()}
        />
      </div>
      
      <div className="mt-6">
        <MobileSearchButton 
          onClick={handleSearch}
          disabled={!pickupLocation || (tripType !== "local" && !dropLocation) || !pickupDate}
        />
      </div>
    </div>
  );
}
