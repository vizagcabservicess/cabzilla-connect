
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { LocationInput } from "@/components/LocationInput";
import { DateTimePicker } from "@/components/DateTimePicker";
import { CabOptions } from "@/components/CabOptions";
import { TabTripSelector } from "@/components/TabTripSelector";
import GoogleMapComponent from "@/components/GoogleMapComponent";
import { GuestDetailsForm } from "@/components/GuestDetailsForm";
import { BookingSummary } from "@/components/BookingSummary";

import { 
  Location, 
  vizagLocations, 
  apDestinations,
  formatTravelTime 
} from "@/lib/locationData";
import { 
  CabType, 
  cabTypes, 
  calculateFare, 
  TripType, 
  TripMode, 
  hourlyPackages 
} from "@/lib/cabData";
import { calculateDistanceMatrix } from "@/lib/distanceService";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useGoogleMaps } from "@/providers/GoogleMapsProvider";
import { Check, MapPin } from "lucide-react";

const CabsPage = () => {
  const navigate = useNavigate();
  const { tripType: urlTripType } = useParams<{ tripType?: string }>();
  const { toast } = useToast();
  const { isLoaded } = useGoogleMaps();
  
  const [tripType, setTripType] = useState<TripType>((urlTripType as TripType) || "outstation");
  const [tripMode, setTripMode] = useState<TripMode>("one-way");
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
  
  // New states for booking flow
  const [showGuestDetailsForm, setShowGuestDetailsForm] = useState<boolean>(false);
  const [bookingComplete, setBookingComplete] = useState<boolean>(false);

  // Set initial airport values for airport transfers
  useEffect(() => {
    if (tripType === "airport") {
      // For airport transfers, find the airport location
      const airport = vizagLocations.find(loc => loc.type === 'airport');
      if (airport) {
        // If pickup is at airport, set pickup to airport, otherwise set dropoff to airport
        if (!pickup && !dropoff) {
          setPickup(airport);
        }
      }
    }
  }, [tripType, pickup, dropoff]);

  const handleTripTypeChange = (type: TripType) => {
    setTripType(type);
    navigate(`/cabs/${type}`);
    setSelectedCab(null);
    setDistance(0);
    setTravelTime(0);
    setShowMap(false);

    if (type === "airport") {
      // For airport transfers, automatically set the airport as one of the locations
      const airport = vizagLocations.find(loc => loc.type === 'airport');
      if (airport) {
        setPickup(airport);
        setDropoff(null);
      }
    } else if (type === "local") {
      // For local trips, reset locations and set hourly package
      setPickup(null);
      setDropoff(null);
      setHourlyPackage(hourlyPackages[0].id);
    } else {
      // For outstation, just reset locations
      setPickup(null);
      setDropoff(null);
    }
  };

  // Direct distance update from GoogleMapComponent
  const handleMapDistanceCalculated = (mapDistance: number, mapDuration: number) => {
    console.log(`Map calculated: ${mapDistance} km, ${mapDuration} min`);
    if (mapDistance > 0 && mapDistance !== distance) {
      setDistance(mapDistance);
      setTravelTime(mapDuration);
      
      toast({
        title: "✅ Distance Updated",
        description: `Distance: ${mapDistance} km, Time: ${formatTravelTime(mapDuration)}`,
        duration: 3000,
      });
    }
  };

  // Distance Calculation Logic
  useEffect(() => {
    const fetchDistance = async () => {
      if (tripType === "local") {
        // For local trips, use the package's kilometers
        const selectedPackage = hourlyPackages.find((pkg) => pkg.id === hourlyPackage);
        if (selectedPackage) {
          setDistance(selectedPackage.kilometers);
          const estimatedTime = selectedPackage.hours * 60; // Convert hours to minutes
          setTravelTime(estimatedTime);
        }
        return;
      }
  
      if (pickup && dropoff) {
        setIsCalculatingDistance(true);
        setShowMap(false);
  
        try {
          const result = await calculateDistanceMatrix(pickup, dropoff);
          
          console.log("🚀 Distance Calculation Result:", result);
  
          if (result.status === "OK") {
            setDistance(result.distance);
            setTravelTime(result.duration);
            setShowMap(true);
  
            toast({
              title: "✅ Distance Updated",
              description: `Distance: ${result.distance} km, Time: ${formatTravelTime(result.duration)}`,
              duration: 3000,
            });
          }
        } catch (error) {
          console.error("❌ Error fetching distance:", error);
          toast({
            title: "Error calculating distance",
            description: "Please try again or select different locations",
            variant: "destructive",
          });
        } finally {
          setIsCalculatingDistance(false);
        }
      } else {
        setDistance(0);
        setTravelTime(0);
        setShowMap(false);
      }
    };
  
    fetchDistance();
  }, [pickup, dropoff, tripType, hourlyPackage, toast]);

  // Calculate fare when relevant parameters change
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

  // Handle hourly package change for local trips
  const handleHourlyPackageChange = (packageId: string) => {
    setHourlyPackage(packageId);
    
    // Update distance based on selected package
    const selectedPackage = hourlyPackages.find((pkg) => pkg.id === packageId);
    if (selectedPackage) {
      setDistance(selectedPackage.kilometers);
      const estimatedTime = selectedPackage.hours * 60; // Convert hours to minutes
      setTravelTime(estimatedTime);
    }
  };

  // Handle search button click
  const handleSearch = () => {
    if (!pickup || !dropoff) {
      toast({
        title: "Missing locations",
        description: "Please select both pickup and drop-off locations",
        variant: "destructive",
      });
      return;
    }

    if (!pickupDate) {
      toast({
        title: "Missing date",
        description: "Please select pickup date and time",
        variant: "destructive",
      });
      return;
    }

    if (tripMode === "round-trip" && !returnDate) {
      toast({
        title: "Missing return date",
        description: "Please select return date and time for round trip",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCab) {
      toast({
        title: "No cab selected",
        description: "Please select a cab type",
        variant: "destructive",
      });
      return;
    }

    // All validations passed, show guest details form
    setShowGuestDetailsForm(true);
  };

  // Handle guest details submission
  const handleGuestDetailsSubmit = (guestDetails: any) => {
    // Create booking data
    const bookingData = {
      pickupLocation: pickup,
      dropLocation: dropoff,
      pickupDate: pickupDate?.toISOString(),
      returnDate: returnDate?.toISOString(),
      selectedCab,
      distance,
      totalPrice,
      discountAmount: 0,
      finalPrice: totalPrice,
      guestDetails,
      tripType,
      tripMode,
    };

    // Store booking details in session storage
    sessionStorage.setItem('bookingDetails', JSON.stringify(bookingData));
    
    // Show success message
    toast({
      title: "Booking Confirmed!",
      description: "Your cab has been booked successfully",
      variant: "default",
    });
    
    // Redirect to booking confirmation page
    navigate("/booking-confirmation");
  };

  // Show loading state when Google Maps is not loaded
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold">Loading Map Services...</h2>
            <p className="text-gray-500">Please wait while we initialize the map.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-5xl mx-auto">
          {!showGuestDetailsForm ? (
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
                  label={tripType === "airport" ? "AIRPORT LOCATION" : "PICKUP LOCATION"} 
                  placeholder={tripType === "airport" ? "Visakhapatnam Airport" : "Enter pickup location"} 
                  value={pickup} 
                  onChange={setPickup}
                  isPickupLocation={true}
                  isAirportTransfer={tripType === "airport"}
                  readOnly={tripType === "airport" && !!pickup && pickup.type === "airport"}
                />
                
                <LocationInput 
                  label={tripType === "airport" ? "DESTINATION LOCATION" : "DROP LOCATION"} 
                  placeholder="Enter destination location" 
                  value={dropoff} 
                  onChange={setDropoff}
                  isPickupLocation={false}
                  isAirportTransfer={tripType === "airport"}
                  readOnly={tripType === "airport" && !!dropoff && dropoff.type === "airport"} 
                />

                <DateTimePicker 
                  label="PICKUP DATE & TIME" 
                  date={pickupDate} 
                  onDateChange={setPickupDate} 
                  minDate={new Date()} 
                />

                {tripType === "outstation" && tripMode === "round-trip" && (
                  <DateTimePicker 
                    label="RETURN DATE & TIME" 
                    date={returnDate} 
                    onDateChange={setReturnDate} 
                    minDate={pickupDate} 
                  />
                )}

                {tripType === "local" && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">SELECT PACKAGE</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {hourlyPackages.map((pkg) => (
                        <button
                          key={pkg.id}
                          type="button"
                          className={`p-3 border rounded-md text-left ${
                            hourlyPackage === pkg.id
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-300 hover:bg-gray-50"
                          }`}
                          onClick={() => handleHourlyPackageChange(pkg.id)}
                        >
                          <div className="font-medium">{pkg.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Base price: ₹{pkg.basePrice}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xl font-bold text-gray-900 mt-4 mb-2">
                  {isCalculatingDistance ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                      Calculating...
                    </div>
                  ) : (
                    distance > 0 ? `${distance} km (approx. ${formatTravelTime(travelTime)})` : "Select locations to calculate distance"
                  )}
                </div>
                
                <CabOptions 
                  cabTypes={cabTypes} 
                  selectedCab={selectedCab} 
                  onSelectCab={setSelectedCab} 
                  distance={distance}
                  tripType={tripType}
                  tripMode={tripMode}
                  pickupDate={pickupDate}
                  returnDate={returnDate}
                  hourlyPackage={tripType === "local" ? hourlyPackage : undefined}
                />

                {showMap && pickup && dropoff && (
                  <div className="mt-6 w-full overflow-hidden rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold mb-2">Route Map</h3>
                    <GoogleMapComponent 
                      pickupLocation={pickup} 
                      dropLocation={dropoff} 
                      onDistanceCalculated={handleMapDistanceCalculated}
                    />
                  </div>
                )}

                <Button 
                  onClick={handleSearch} 
                  disabled={!pickup || !dropoff || !selectedCab || distance <= 0}
                  className="bg-blue-600 text-white px-6 py-3 rounded-md mt-6 w-full md:w-auto"
                >
                  {isCalculatingDistance ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Please wait...
                    </div>
                  ) : "BOOK NOW"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <GuestDetailsForm 
                  onSubmit={handleGuestDetailsSubmit}
                  totalPrice={totalPrice}
                />
              </div>
              
              <div>
                <BookingSummary
                  pickupLocation={pickup}
                  dropLocation={dropoff}
                  pickupDate={pickupDate}
                  returnDate={returnDate}
                  selectedCab={selectedCab}
                  distance={distance}
                  totalPrice={totalPrice}
                  tripType={tripType}
                  tripMode={tripMode}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CabsPage;
