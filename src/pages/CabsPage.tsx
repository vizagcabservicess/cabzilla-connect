
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { LocationInput } from "@/components/LocationInput";
import { DateTimePicker } from "@/components/DateTimePicker";
import { CabOptions } from "@/components/CabOptions";
import { TripModeSelector } from "@/components/TripModeSelector";
import { LocalTripSelector } from "@/components/LocalTripSelector";
import { TabTripSelector } from "@/components/TabTripSelector";
import GoogleMapComponent from "@/components/GoogleMapComponent";

import { 
  Location, 
  vizagLocations, 
  apDestinations, 
  getDistanceBetweenLocations, 
  getEstimatedTravelTime, 
  formatTravelTime 
} from "@/lib/locationData";
import { 
  CabType, 
  cabTypes, 
  calculateFare, 
  TripType, 
  TripMode, 
  LocalTripPurpose,
  hourlyPackages 
} from "@/lib/cabData";
import { calculateDistanceMatrix } from "@/lib/distanceService";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useGoogleMaps } from "@/providers/GoogleMapsProvider";

const CabsPage = () => {
  const navigate = useNavigate();
  const { tripType: urlTripType } = useParams<{ tripType?: string }>();
  const { toast } = useToast();
  const { isLoaded: mapsLoaded } = useGoogleMaps();
  
  const [tripType, setTripType] = useState<TripType>((urlTripType as TripType) || "outstation");
  const [tripMode, setTripMode] = useState<TripMode>("one-way");
  const [tripPurpose, setTripPurpose] = useState<LocalTripPurpose>("business");
  const [hourlyPackage, setHourlyPackage] = useState(hourlyPackages[0].id);
  
  const [pickup, setPickup] = useState<Location | null>(null);
  const [dropoff, setDropoff] = useState<Location | null>(null);
  const [pickupDate, setPickupDate] = useState<Date | undefined>(new Date());
  const [returnDate, setReturnDate] = useState<Date | undefined>(undefined);
  const [selectedCab, setSelectedCab] = useState<CabType | null>(null);
  const [distance, setDistance] = useState<number>(0);
  const [travelTime, setTravelTime] = useState<number>(0);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState<boolean>(false);
  const [showMap, setShowMap] = useState<boolean>(false);

  const handleTripTypeChange = (type: TripType) => {
    setTripType(type);
    navigate(`/cabs/${type}`);
    setSelectedCab(null);

    if (type === "airport") {
      const airport = vizagLocations.find(loc => loc.id === 'vizag_airport');
      setPickup(airport || null);
    } else if (type === "local") {
      setPickup(null);
      setDropoff(null);
      setHourlyPackage(hourlyPackages[0].id);
    }
  };

  // ✅ Distance Calculation Logic (Google Maps API)
  useEffect(() => {
    const fetchDistance = async () => {
      if (tripType === "local") {
        const selectedPackage = hourlyPackages.find((pkg) => pkg.id === hourlyPackage);
        if (selectedPackage) {
          setDistance(selectedPackage.kilometers);
          const estimatedTime = getEstimatedTravelTime(selectedPackage.kilometers);
          setTravelTime(estimatedTime);
        }
        return;
      }
  
      if (pickup && dropoff) {
        setIsCalculatingDistance(true);
  
        try {
          const result = await calculateDistanceMatrix(pickup, dropoff);
          
          console.log("🚀 API Response:", result); // 🔍 DEBUG: Ensure the correct distance is received
  
          if (result.status === "OK") {
            setDistance(result.distance);
            setTravelTime(result.duration);
            setShowMap(true);
  
            toast({
              title: "✅ Distance Updated",
              description: `Distance: ${result.distance} km, Estimated Time: ${formatTravelTime(result.duration)}`,
              duration: 3000,
            });
          } else {
            console.warn("⚠️ Using Fallback Distance Calculation");
            const calculatedDistance = getDistanceBetweenLocations(pickup.id, dropoff.id);
            setDistance(calculatedDistance);
  
            const estimatedTime = getEstimatedTravelTime(calculatedDistance);
            setTravelTime(estimatedTime);
          }
        } catch (error) {
          console.error("❌ Error fetching distance:", error);
        } finally {
          setIsCalculatingDistance(false);
        }
      } else {
        setDistance(0);
        setTravelTime(0);
      }
    };
  
    fetchDistance();
  }, [pickup, dropoff, tripType, hourlyPackage, toast]);
        
  

  useEffect(() => {
    if (selectedCab && distance > 0) {
      const fare = calculateFare(
        selectedCab, 
        distance, 
        tripType, 
        tripMode, 
        tripType === "local" ? hourlyPackage : undefined,
        pickupDate,
        returnDate
      );
      setTotalPrice(fare);
    } else {
      setTotalPrice(0);
    }
  }, [selectedCab, distance, tripType, tripMode, hourlyPackage, pickupDate, returnDate]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4">
              <TabTripSelector 
                selectedTab={tripType}
                tripMode={tripMode}
                onTabChange={handleTripTypeChange}
                onTripModeChange={setTripMode}
              />
            </div>

            <div className="p-6">
              <LocationInput 
                label="PICKUP LOCATION" 
                placeholder="Enter pickup location" 
                value={pickup} 
                onChange={setPickup}
                isPickupLocation={true}
              />
              
              <LocationInput 
                label="DROP LOCATION" 
                placeholder="Enter drop location" 
                value={dropoff} 
                onChange={setDropoff}
                isPickupLocation={false} 
              />

              <DateTimePicker label="PICKUP DATE & TIME" date={pickupDate} onDateChange={setPickupDate} minDate={new Date()} />

              {tripType === "outstation" && tripMode === "round-trip" && (
                <DateTimePicker label="RETURN DATE & TIME" date={returnDate} onDateChange={setReturnDate} minDate={pickupDate} />
              )}

              <div className="text-xl font-bold text-gray-900">
                {isCalculatingDistance ? "Calculating..." : `${distance} km`}
              </div>
              
              <CabOptions 
                cabTypes={cabTypes} 
                selectedCab={selectedCab} 
                onSelectCab={setSelectedCab} 
                distance={distance} 
                // Pass hourlyPackage only when tripType is local
                {...(tripType === "local" ? { hourlyPackage } : {})}
              />

              {showMap && pickup && dropoff && mapsLoaded && (
                <div className="mt-6 w-full overflow-hidden rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold mb-2">Route Map</h3>
                  <GoogleMapComponent 
                    pickupLocation={pickup} 
                    dropLocation={dropoff} 
                  />
                </div>
              )}

              <Button onClick={() => console.log("Booking...")} className="bg-blue-600 text-white px-12 py-6 rounded-md mt-6">
                SEARCH
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CabsPage;
