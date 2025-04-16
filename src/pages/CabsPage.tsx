import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { LocationInput } from "@/components/LocationInput";
import { DateTimePicker } from "@/components/DateTimePicker";
import { CabOptions } from "@/components/CabOptions";
import { TabTripSelector } from "@/components/TabTripSelector";
import GoogleMapComponent from "@/components/GoogleMapComponent";
import { GuestDetailsForm } from "@/components/GuestDetailsForm";
import { BookingSummary } from "@/components/BookingSummary"; 
import { BookingSummaryHelper } from "@/components/cab-options/BookingSummaryHelper";
import { LocalTripSelector } from "@/components/LocalTripSelector";
import { 
  Location, 
  vizagLocations, 
  apDestinations,
  formatTravelTime,
  isVizagLocation
} from "@/lib/locationData";
import { convertToApiLocation, createLocationChangeHandler, isLocationInVizag, safeIncludes } from "@/lib/locationUtils";
import { 
  cabTypes, 
  formatPrice
} from "@/lib/cabData";
import { calculateFare } from "@/lib/fareCalculationService";
import { TripType, TripMode, ensureCustomerTripType } from "@/lib/tripTypes";
import { hourlyPackages, HourlyPackage } from '@/lib/packageData';
import { CabType } from "@/types/cab";
import { calculateDistanceMatrix } from "@/lib/distanceService";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useGoogleMaps } from "@/providers/GoogleMapsProvider";
import { Check, MapPin } from "lucide-react";
import { bookingAPI } from "@/services/api";
import { BookingRequest } from "@/types/api";
import { getApiUrl } from "@/config/api";
import { toast as sonnerToast } from "sonner";

const CabsPage = () => {
  const navigate = useNavigate();
  const { tripType: urlTripType } = useParams<{ tripType?: string }>();
  const { toast } = useToast();
  const { isLoaded } = useGoogleMaps();
  
  const getInitialFromSession = (key: string, defaultValue: any) => {
    try {
      const value = sessionStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (e) {
      console.error(`Error loading ${key} from session storage:`, e);
      return defaultValue;
    }
  };
  
  const [tripType, setTripType] = useState<TripType>((urlTripType as TripType) || "outstation");
  const [tripMode, setTripMode] = useState<TripMode>(getInitialFromSession('tripMode', "one-way"));
  const [hourlyPackage, setHourlyPackage] = useState(getInitialFromSession('hourlyPackage', hourlyPackages[0].id));
  
  const [pickup, setPickup] = useState<Location | null>(getInitialFromSession('pickupLocation', null));
  const [dropoff, setDropoff] = useState<Location | null>(getInitialFromSession('dropLocation', null));
  const [pickupDate, setPickupDate] = useState<Date | undefined>(
    getInitialFromSession('pickupDate', new Date())
  );
  const [returnDate, setReturnDate] = useState<Date | undefined>(
    getInitialFromSession('returnDate', undefined)
  );
  const [selectedCab, setSelectedCab] = useState<CabType | null>(getInitialFromSession('selectedCab', null));
  const [distance, setDistance] = useState<number>(0);
  const [travelTime, setTravelTime] = useState<number>(0);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState<boolean>(false);
  const [showMap, setShowMap] = useState<boolean>(false);
  
  const [showGuestDetailsForm, setShowGuestDetailsForm] = useState<boolean>(false);
  const [bookingComplete, setBookingComplete] = useState<boolean>(false);
  
  useEffect(() => {
    if (pickup) sessionStorage.setItem('pickupLocation', JSON.stringify(pickup));
    if (dropoff) sessionStorage.setItem('dropLocation', JSON.stringify(dropoff));
    if (pickupDate) sessionStorage.setItem('pickupDate', JSON.stringify(pickupDate));
    if (returnDate) sessionStorage.setItem('returnDate', JSON.stringify(returnDate));
    if (selectedCab) sessionStorage.setItem('selectedCab', JSON.stringify(selectedCab));
    sessionStorage.setItem('tripMode', tripMode);
    sessionStorage.setItem('hourlyPackage', hourlyPackage);
    sessionStorage.setItem('tripType', tripType);
  }, [pickup, dropoff, pickupDate, returnDate, selectedCab, tripMode, hourlyPackage, tripType]);

  useEffect(() => {
    setSelectedCab(null);
    setTotalPrice(0);
  }, [tripType, tripMode]);

  useEffect(() => {
    if (tripType === "airport") {
      const airport = vizagLocations.find(loc => loc.type === 'airport');
      if (airport) {
        if (!pickup && !dropoff) {
          setPickup(airport);
        }
      }
    }
  }, [tripType, pickup, dropoff]);

  useEffect(() => {
    if (pickup && dropoff) {
      console.log("Validating locations:", { pickup, dropoff });
      
      const isPickupInVizag = pickup && pickup.isInVizag !== undefined ? 
                             pickup.isInVizag : 
                             isLocationInVizag(pickup);
      
      if (!isPickupInVizag) {
        toast({
          title: "Invalid pickup location",
          description: "Pickup location must be within Visakhapatnam city limits.",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }
      
      if (tripType === "airport") {
        const isDropoffInVizag = dropoff && dropoff.isInVizag !== undefined ? 
                                dropoff.isInVizag : 
                                isLocationInVizag(dropoff);
        
        if (!isDropoffInVizag) {
          console.log("Dropoff not in Vizag, switching to outstation");
          toast({
            title: "Trip type updated",
            description: "Your destination is outside Vizag city limits. We've updated your trip type to Outstation.",
            duration: 3000,
          });
          setTripType("outstation");
          setTripMode("one-way");
          navigate("/cabs/outstation");
        }
      }
    }
  }, [pickup, dropoff, tripType, toast, navigate]);

  useEffect(() => {
    setSelectedCab(null);
    setTotalPrice(0);
  }, [pickup, dropoff]);

  const handleTripTypeChange = (type: TripType) => {
    setSelectedCab(null);
    setDistance(0);
    setTravelTime(0);
    setShowMap(false);
    setTotalPrice(0);
    
    setTripType(type);
    navigate(`/cabs/${type}`);

    if (type === "airport") {
      const airport = vizagLocations.find(loc => loc.type === 'airport');
      if (airport) {
        setPickup(airport);
      }
    } else if (type === "local") {
      setDropoff(null);
      setHourlyPackage(hourlyPackages[0].id);
    }
  };
  
  const handlePickupLocationChange = (location: Location) => {
    if (!location) return; // Safety check
    
    if (location.isInVizag === undefined) {
      location.isInVizag = isLocationInVizag(location);
    }
    
    console.log("Pickup location changed:", location);
    setPickup(location);
  };
  
  const handleDropoffLocationChange = (location: Location) => {
    if (!location) return; // Safety check
    
    if (location.isInVizag === undefined) {
      location.isInVizag = isLocationInVizag(location);
    }
    
    console.log("Dropoff location changed:", location);
    setDropoff(location);
  };

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

  useEffect(() => {
    const fetchDistance = async () => {
      if (tripType === "local") {
        // For local trips, use the hourly package distance
        const selectedPackage = hourlyPackages.find((pkg) => pkg.id === hourlyPackage);
        if (selectedPackage) {
          // Reset to exactly the package kilometers
          setDistance(selectedPackage.kilometers);
          const estimatedTime = selectedPackage.hours * 60;
          setTravelTime(estimatedTime);
          setSelectedCab(null);
          setShowMap(false);
          console.log(`Local trip: setting distance to ${selectedPackage.kilometers}km (${selectedPackage.hours} hours)`);
        }
        return;
      }
  
      if (pickup && dropoff) {
        setIsCalculatingDistance(true);
        setShowMap(false);
        setSelectedCab(null);
  
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
  
  // When trip type changes to local, reset any cached distance from previous trip types
  useEffect(() => {
    if (tripType === "local") {
      const selectedPackage = hourlyPackages.find((pkg) => pkg.id === hourlyPackage);
      if (selectedPackage) {
        // Reset to exactly the package kilometers
        setDistance(selectedPackage.kilometers);
        console.log(`Trip type changed to local: resetting distance to ${selectedPackage.kilometers}km`);
      }
    }
  }, [tripType, hourlyPackage]);

  // Handle fare updates from global events
  useEffect(() => {
    const handleFareUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.cabId && customEvent.detail.fare !== undefined) {
        if (selectedCab && customEvent.detail.cabId === selectedCab.id.toLowerCase().replace(/\s+/g, '_')) {
          console.log(`CabsPage: Received fare update for selected cab: ${customEvent.detail.fare} from ${customEvent.detail.source || 'unknown'}`);
          
          setTotalPrice(customEvent.detail.fare);
          
          // Show a notification to make the price change more visible
          if (Math.abs(totalPrice - customEvent.detail.fare) > 100) {
            sonnerToast.info(`Price updated: ₹${customEvent.detail.fare}`, {
              id: `price-update-${customEvent.detail.cabId}`,
              duration: 3000
            });
          }
        }
      }
    };
    
    const handleDatabaseFareUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.cabId && customEvent.detail.fare !== undefined) {
        if (selectedCab && customEvent.detail.cabId === selectedCab.id.toLowerCase().replace(/\s+/g, '_')) {
          console.log(`CabsPage: Received database fare update for selected cab: ${customEvent.detail.fare} from ${customEvent.detail.source || 'unknown'}`);
          
          setTotalPrice(customEvent.detail.fare);
          
          // Show a notification for significant price changes
          if (Math.abs(totalPrice - customEvent.detail.fare) > 100) {
            sonnerToast.info(`Price updated from database: ₹${customEvent.detail.fare}`, {
              id: `price-update-${customEvent.detail.cabId}`,
              duration: 3000
            });
          }
        }
      }
    };
    
    window.addEventListener('global-fare-update', handleFareUpdate);
    window.addEventListener('booking-summary-update', handleDatabaseFareUpdate);
    
    return () => {
      window.removeEventListener('global-fare-update', handleFareUpdate);
      window.removeEventListener('booking-summary-update', handleDatabaseFareUpdate);
    };
  }, [selectedCab, totalPrice]);

  useEffect(() => {
    if (selectedCab && distance > 0) {
      const fetchFare = async () => {
        try {
          // For local trips, try to fetch directly from database first
          if (tripType === "local" && hourlyPackage) {
            try {
              const normalizedCabId = selectedCab.id.toLowerCase().replace(/\s+/g, '_');
              const apiUrl = getApiUrl(`api/user/direct-booking-data.php?check_sync=true&vehicle_id=${normalizedCabId}&package_id=${hourlyPackage}`);
              
              console.log(`CabsPage: Fetching local fare directly from database for ${normalizedCabId} - ${hourlyPackage}`);
              const response = await fetch(apiUrl, {
                headers: {
                  'Cache-Control': 'no-cache',
                  'Pragma': 'no-cache',
                  'X-Force-Refresh': 'true'
                }
              });
              
              if (response.ok) {
                const data = await response.json();
                
                if (data.status === 'success' && data.price && Number(data.price) > 0) {
                  const price = Number(data.price);
                  console.log(`CabsPage: Retrieved fare directly from database API: ₹${price}`);
                  setTotalPrice(price);
                  
                  // Dispatch both events to maximize price consistency
                  dispatchFareUpdateEvents(normalizedCabId, 'local', price, hourlyPackage);
                  
                  return; // Skip the regular fare calculation
                } else if (data.data) {
                  // Try alternative response format
                  let price = 0;
                  
                  if (hourlyPackage.includes('4hrs-40km') && data.data.price4hrs40km) {
                    price = Number(data.data.price4hrs40km);
                  } else if (hourlyPackage.includes('8hrs-80km') && data.data.price8hrs80km) {
                    price = Number(data.data.price8hrs80km);
                  } else if (hourlyPackage.includes('10hrs-100km') && data.data.price10hrs100km) {
                    price = Number(data.data.price10hrs100km);
                  }
                  
                  if (price > 0) {
                    console.log(`CabsPage: Retrieved fare from alternative response format: ₹${price}`);
                    setTotalPrice(price);
                    
                    dispatchFareUpdateEvents(normalizedCabId, 'local', price, hourlyPackage);
                    
                    return; // Skip the regular fare calculation
                  }
                }
              }
            } catch (error) {
              console.error('Error fetching local fare from database:', error);
              // Try fallback endpoint
              await fetchFromFallbackEndpoint(selectedCab.id, hourlyPackage);
            }
          }
          
          // Regular fare calculation as fallback
          const fare = await calculateFare({
            cabType: selectedCab, 
            distance, 
            tripType, 
            tripMode, 
            hourlyPackage: tripType === "local" ? hourlyPackage : undefined,
            pickupDate,
            returnDate
          });
          
          setTotalPrice(fare);
          
          // Dispatch both events to maximize price consistency
          if (tripType === 'local' && hourlyPackage) {
            dispatchFareUpdateEvents(selectedCab.id.toLowerCase().replace(/\s+/g, '_'), tripType, fare, hourlyPackage);
          } else {
            dispatchFareUpdateEvents(selectedCab.id.toLowerCase().replace(/\s+/g, '_'), tripType, fare);
          }
        } catch (error) {
          console.error("Error calculating fare:", error);
          setTotalPrice(0);
        }
      };
      
      fetchFare();
    } else {
      setTotalPrice(0);
    }
  }, [selectedCab, distance, tripType, tripMode, hourlyPackage, pickupDate, returnDate]);

  const dispatchFareUpdateEvents = (cabId: string, tripType: string, fare: number, packageId?: string) => {
    try {
      // Dispatch global fare update first
      window.dispatchEvent(new CustomEvent('global-fare-update', {
        detail: {
          cabId: cabId.toLowerCase(),
          tripType,
          tripMode,
          calculated: true,
          fare: fare,
          packageId: packageId,
          source: 'cabspage-calculation',
          timestamp: Date.now()
        }
      }));
      
      // Also dispatch fare-calculated event for other components
      window.dispatchEvent(new CustomEvent('fare-calculated', {
        detail: {
          cabId: cabId.toLowerCase(),
          tripType,
          tripMode,
          calculated: true,
          fare: fare,
          packageId: packageId,
          source: 'cabspage-calculation',
          timestamp: Date.now() + 1
        }
      }));
      
      console.log(`CabsPage: Dispatched fare update events for ${cabId}: ${fare}`);
    } catch (error) {
      console.error('Error dispatching fare events:', error);
    }
  };
  
  const fetchFromFallbackEndpoint = async (vehicleId: string, packageId: string) => {
    try {
      console.log(`CabsPage: Trying fallback endpoint for ${vehicleId} - ${packageId}`);
      
      const normalizedCabId = vehicleId.toLowerCase().replace(/\s+/g, '_');
      const apiUrl = getApiUrl(`api/admin/direct-local-fares.php?vehicle_id=${normalizedCabId}`);
      
      const response = await fetch(apiUrl, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Force-Refresh': 'true'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.fares && Array.isArray(data.fares) && data.fares.length > 0) {
          const fareData = data.fares[0];
          
          // Extract the right price for the selected package
          let price = 0;
          if (packageId.includes('4hrs-40km')) {
            price = Number(fareData.price4hrs40km || 0);
          } else if (packageId.includes('8hrs-80km')) {
            price = Number(fareData.price8hrs80km || 0);
          } else if (packageId.includes('10hrs-100km')) {
            price = Number(fareData.price10hrs100km || 0);
          }
          
          if (price > 0) {
            console.log(`CabsPage: Retrieved fare from fallback endpoint: ₹${price}`);
            setTotalPrice(price);
            
            dispatchFareUpdateEvents(normalizedCabId, 'local', price, packageId);
            
            return true;
          }
        }
      }
      return false;
    } catch (error) {
      console.error('Error fetching from fallback endpoint:', error);
      return false;
    }
  };

  const handleHourlyPackageChange = (packageId: string) => {
    setHourlyPackage(packageId);
    setSelectedCab(null);
    
    const selectedPackage = hourlyPackages.find((pkg) => pkg.id === packageId);
    if (selectedPackage) {
      // Reset to exactly the package kilometers
      setDistance(selectedPackage.kilometers);
      const estimatedTime = selectedPackage.hours * 60;
      setTravelTime(estimatedTime);
      console.log(`Hourly package changed to ${packageId}: setting distance to ${selectedPackage.kilometers}km`);
    }
  };

  const handleSearch = () => {
    if (!pickup || (tripType !== "local" && !dropoff)) {
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

    setShowGuestDetailsForm(true);
  };

  const handleGuestDetailsSubmit = async (guestDetails: any) => {
    try {
      if (!pickup || (tripType !== "local" && !dropoff) || !selectedCab || !pickupDate) {
        toast({
          title: "Missing information",
          description: "Please complete all required fields",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }
      
      const bookingData: BookingRequest = {
        pickupLocation: pickup.address || pickup.name || '',
        dropLocation: dropoff ? (dropoff.address || dropoff.name || '') : '',
        pickupDate: pickupDate.toISOString(),
        returnDate: returnDate?.toISOString() || null,
        cabType: selectedCab.name,
        distance: distance,
        tripType: tripType,
        tripMode: tripMode,
        totalAmount: totalPrice,
        passengerName: guestDetails.name,
        passengerPhone: guestDetails.phone,
        passengerEmail: guestDetails.email,
        hourlyPackage: tripType === 'local' ? hourlyPackage : null
      };
      
      console.log("Sending booking data:", bookingData);
      
      const response = await bookingAPI.createBooking(bookingData);
      console.log('Booking created:', response);
      
      const bookingDataForStorage = {
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
      sessionStorage.setItem('bookingDetails', JSON.stringify(bookingDataForStorage));
      
      toast({
        title: "Booking Confirmed!",
        description: "Your cab has been booked successfully",
        duration: 3000,
      });
      
      // Fix the navigation to match the route in router.tsx
      navigate(`/booking-confirmation`);
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Booking Failed",
        description: error instanceof Error ? error.message : "Failed to create booking. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const handleBackToSelection = () => {
    setShowGuestDetailsForm(false);
  };

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
                  selectedTab={ensureCustomerTripType(tripType)}
                  tripMode={tripMode}
                  onTabChange={handleTripTypeChange}
                  onTripModeChange={setTripMode}
                />
              </div>

              <div className="p-6">
                <LocationInput 
                  label={tripType === "airport" ? "AIRPORT LOCATION" : "PICKUP LOCATION"} 
                  placeholder={tripType === "airport" ? "Visakhapatnam Airport" : "Enter pickup location"} 
                  value={pickup ? convertToApiLocation(pickup) : undefined}
                  onLocationChange={handlePickupLocationChange}
                  isPickupLocation={true}
                  isAirportTransfer={tripType === "airport"}
                  readOnly={tripType === "airport" && !!pickup && pickup.type === "airport"}
                />
                
                <LocationInput 
                  label={tripType === "airport" ? "DESTINATION LOCATION" : "DROP LOCATION"} 
                  placeholder="Enter destination location" 
                  value={dropoff ? convertToApiLocation(dropoff) : undefined}
                  onLocationChange={handleDropoffLocationChange}
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
                  <LocalTripSelector
                    selectedPackage={hourlyPackage}
                    onPackageSelect={handleHourlyPackageChange}
                    selectedCabId={selectedCab?.id}
                  />
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
                  disabled={!pickup || (tripType !== "local" && !dropoff) || !selectedCab || distance <= 0}
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
                  onBack={handleBackToSelection}
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
                  tripType={ensureCustomerTripType(tripType)}
                  tripMode={tripMode}
                />
                
                {selectedCab && tripType === "local" && (
                  <BookingSummaryHelper
                    tripType={tripType}
                    selectedCabId={selectedCab.id}
                    totalPrice={totalPrice}
                    hourlyPackage={hourlyPackage}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CabsPage;
