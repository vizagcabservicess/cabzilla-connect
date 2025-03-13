import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { LocationInput } from "@/components/LocationInput";
import { DateTimePicker } from "@/components/DateTimePicker";
import { CabOptions } from "@/components/CabOptions";
import { TripModeSelector } from "@/components/TripModeSelector";
import { LocalTripSelector } from "@/components/LocalTripSelector";
import { TabTripSelector } from "@/components/TabTripSelector";
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
import { CarTaxiFront, Clock, MapPin } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

const CabsPage = () => {
  const navigate = useNavigate();
  const { tripType: urlTripType } = useParams<{ tripType?: string }>();
  const { toast } = useToast();
  
  const [tripType, setTripType] = useState<TripType>(
    (urlTripType as TripType) || "outstation"
  );
  
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
  
  useEffect(() => {
    const fetchDistance = async () => {
      if (tripType === 'local') {
        const selectedPackage = hourlyPackages.find(pkg => pkg.id === hourlyPackage);
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
          
          if (result.status === 'OK') {
            setDistance(result.distance);
            setTravelTime(result.duration);
            
            toast({
              title: "Distance calculated",
              description: `Distance: ${result.distance} km, estimated travel time: ${formatTravelTime(result.duration)}`,
              duration: 3000,
            });
          } else {
            const calculatedDistance = getDistanceBetweenLocations(pickup.id, dropoff.id);
            setDistance(calculatedDistance);
            
            const estimatedTime = getEstimatedTravelTime(calculatedDistance);
            setTravelTime(estimatedTime);
            
            toast({
              title: "Distance calculation",
              description: "Using estimated distance calculation",
              variant: "default",
              duration: 3000,
            });
          }
        } catch (error) {
          console.error("Error fetching distance:", error);
          toast({
            title: "Error calculating distance",
            description: "Falling back to estimated distance",
            variant: "destructive",
            duration: 3000,
          });
          
          const calculatedDistance = getDistanceBetweenLocations(pickup.id, dropoff.id);
          setDistance(calculatedDistance);
          
          const estimatedTime = getEstimatedTravelTime(calculatedDistance);
          setTravelTime(estimatedTime);
        } finally {
          setIsCalculatingDistance(false);
        }
      } else {
        setDistance(0);
        setTravelTime(0);
      }
    };
    
    fetchDistance();
  }, [pickup, dropoff, tripType, hourlyPackage]);
  
  useEffect(() => {
    if (selectedCab && distance > 0) {
      const fare = calculateFare(
        selectedCab, 
        distance, 
        tripType, 
        tripMode, 
        tripType === 'local' ? hourlyPackage : undefined
      );
      setTotalPrice(fare);
    } else {
      setTotalPrice(0);
    }
  }, [selectedCab, distance, tripType, tripMode, hourlyPackage]);
  
  const handleHourlyPackageChange = (packageId: string) => {
    setHourlyPackage(packageId);
    
    const selectedPackage = hourlyPackages.find(pkg => pkg.id === packageId);
    if (selectedPackage) {
      setDistance(selectedPackage.kilometers);
      const estimatedTime = getEstimatedTravelTime(selectedPackage.kilometers);
      setTravelTime(estimatedTime);
    }
  };
  
  const handleBookNow = () => {
    if ((tripType !== 'local' && (!pickup || !dropoff)) || !pickupDate || !selectedCab) {
      toast({
        title: "Missing information",
        description: "Please fill all the required fields",
        variant: "destructive"
      });
      return;
    }
    
    if (tripType === 'outstation' && tripMode === 'round-trip' && !returnDate) {
      toast({
        title: "Missing information",
        description: "Please select a return date for your round trip",
        variant: "destructive"
      });
      return;
    }
    
    const bookingDetails = {
      tripType,
      tripMode: tripType === 'outstation' ? tripMode : undefined,
      tripPurpose: tripType === 'local' ? tripPurpose : undefined,
      hourlyPackage: tripType === 'local' ? hourlyPackage : undefined,
      pickup,
      dropoff: tripType === 'local' ? null : dropoff,
      pickupDate,
      returnDate: tripMode === 'round-trip' ? returnDate : undefined,
      selectedCab,
      distance,
      travelTime,
      totalPrice
    };
    
    sessionStorage.setItem("bookingDetails", JSON.stringify(bookingDetails));
    navigate("/booking-confirmation");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="bg-blue-600 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Book Cabs in Visakhapatnam</h1>
            <p className="mb-0 text-blue-100">
              {tripType === "outstation" && "Outstation cabs for intercity travel across Andhra Pradesh"}
              {tripType === "local" && "Local cabs for travel within Visakhapatnam"}
              {tripType === "airport" && "Airport transfers to and from Visakhapatnam International Airport"}
            </p>
          </div>
        </div>
      </div>
      
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <LocationInput 
                  label="PICKUP LOCATION" 
                  placeholder={tripType === "airport" ? "Visakhapatnam Airport (fixed)" : "Enter pickup location in Visakhapatnam"} 
                  value={pickup} 
                  onChange={setPickup}
                  isPickupLocation={true}
                  readOnly={tripType === "airport"}
                  className={tripType === "airport" ? "opacity-75" : ""}
                />
                
                {tripType === 'local' ? (
                  <LocalTripSelector 
                    tripPurpose={tripPurpose}
                    onTripPurposeChange={setTripPurpose}
                    hourlyPackage={hourlyPackage}
                    onHourlyPackageChange={handleHourlyPackageChange}
                  />
                ) : (
                  <LocationInput 
                    label="DROP LOCATION" 
                    placeholder={tripType === "local" ? "Select location in Visakhapatnam" : "Select destination in Andhra Pradesh"} 
                    value={dropoff} 
                    onChange={setDropoff}
                    isPickupLocation={false} 
                  />
                )}
                
                <DateTimePicker 
                  label="PICKUP DATE & TIME" 
                  date={pickupDate} 
                  onDateChange={setPickupDate} 
                  minDate={new Date()} 
                />
                
                {tripType === 'outstation' && tripMode === 'round-trip' && (
                  <DateTimePicker 
                    label="RETURN DATE & TIME" 
                    date={returnDate} 
                    onDateChange={setReturnDate} 
                    minDate={pickupDate} 
                  />
                )}
                
                <div className="md:flex items-center space-y-4 md:space-y-0 md:space-x-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-6 md:mt-9 flex-1 flex">
                    <div className="text-amber-500 mr-2">
                      <CarTaxiFront size={18} />
                    </div>
                    <div className="text-xs text-gray-700">
                      {isCalculatingDistance ? (
                        <p>Calculating distance...</p>
                      ) : (
                        <p>Est. {tripMode === 'round-trip' ? 'round-trip' : 'one-way'} distance: <span className="font-semibold">{distance} km</span></p>
                      )}
                    </div>
                  </div>
                  
                  {distance > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 md:mt-9 flex-1 flex">
                      <div className="text-blue-500 mr-2">
                        <Clock size={18} />
                      </div>
                      <div className="text-xs text-gray-700">
                        <p>Est. travel time: <span className="font-semibold">{formatTravelTime(travelTime)}</span></p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {tripType === "outstation" && (
                <div className="mb-6 bg-blue-50 p-3 rounded-md border border-blue-100 text-sm text-blue-800">
                  <p className="flex items-start">
                    <MapPin size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                    <span>
                      Note: Outstation trips have a minimum billing distance of 250 KM, even if actual distance is less.
                      {tripMode === 'round-trip' ? " Round trip rates are ₹14/km." : " One-way trips are ₹13/km after first 300 km."}
                    </span>
                  </p>
                </div>
              )}
              
              <div className="border-t border-gray-200 my-6"></div>
              
              <CabOptions 
                cabTypes={cabTypes} 
                selectedCab={selectedCab} 
                onSelectCab={setSelectedCab} 
                distance={distance}
                tripType={tripType}
                tripMode={tripMode}
                hourlyPackage={hourlyPackage}
                returnDate={returnDate}
                pickupDate={pickupDate}
              />
              
              {selectedCab && distance > 0 && (
                <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">Fare Summary</h3>
                      <p className="text-sm text-gray-600">
                        {tripType === "local" 
                          ? `${hourlyPackages.find(pkg => pkg.id === hourlyPackage)?.name || ''} Package` 
                          : `${tripMode === 'round-trip' ? 'Round Trip' : 'One Way'}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">₹{totalPrice}</div>
                      <p className="text-xs text-gray-500">Includes taxes & toll charges</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mt-8 flex justify-center">
                <Button 
                  onClick={handleBookNow}
                  className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white px-12 py-6 rounded-md font-semibold text-lg"
                  disabled={
                    (tripType !== 'local' && (!pickup || !dropoff)) || 
                    !pickupDate || 
                    (tripType === 'outstation' && tripMode === 'round-trip' && !returnDate) ||
                    !selectedCab || 
                    isCalculatingDistance
                  }
                >
                  SEARCH
                </Button>
              </div>
            </div>
          </div>
          
          <div className="mt-12">
            <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">Why Book Cabs with Us?</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xl">
                  CZ
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">Safety Assured</h3>
                <p className="text-sm text-gray-600">
                  Sanitized cabs with verified drivers and regular temperature checks
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xl">
                  CZ
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">Transparent Pricing</h3>
                <p className="text-sm text-gray-600">
                  Clear fare breakdown with no hidden charges or surge pricing
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xl">
                  CZ
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">Flexibility</h3>
                <p className="text-sm text-gray-600">
                  Free cancellation up to 2 hours before pickup and easy rescheduling
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-12 bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Frequently Asked Questions</h2>
            
            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-3">
                <h3 className="font-semibold text-gray-800 mb-1">How do I book an outstation cab?</h3>
                <p className="text-sm text-gray-600">
                  Simply select your trip type, enter pickup and drop locations, choose your preferred date and time, select a cab, and click 'Book Now'.
                </p>
              </div>
              
              <div className="border-b border-gray-200 pb-3">
                <h3 className="font-semibold text-gray-800 mb-1">What is the cancellation policy?</h3>
                <p className="text-sm text-gray-600">
                  Free cancellation up to 2 hours before the scheduled pickup time. Cancellations after that may incur charges.
                </p>
              </div>
              
              <div className="border-b border-gray-200 pb-3">
                <h3 className="font-semibold text-gray-800 mb-1">Is there any waiting charge?</h3>
                <p className="text-sm text-gray-600">
                  First 15 minutes are free, after which a waiting charge of ₹100 per hour applies.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">How are the fares calculated?</h3>
                <p className="text-sm text-gray-600">
                  Fares are calculated based on the distance, cab type, and duration. All taxes and tolls are included in the displayed price.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <footer className="bg-gray-100 py-10 mt-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between mb-8">
            <div className="mb-6 md:mb-0">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500 text-white flex items-center justify-center font-bold text-xl">
                  CZ
                </div>
                <span className="font-bold text-xl text-blue-800">
                  CabZilla
                </span>
              </div>
              <p className="text-gray-600 max-w-md">
                Book reliable and comfortable cab services for all your travel needs.
                Available 24/7 with transparent pricing and professional drivers.
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Company</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors text-sm">About Us</a></li>
                  <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors text-sm">Team</a></li>
                  <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors text-sm">Careers</a></li>
                  <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors text-sm">Blog</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Support</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors text-sm">Help Center</a></li>
                  <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors text-sm">Safety</a></li>
                  <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors text-sm">Terms of Service</a></li>
                  <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors text-sm">Privacy Policy</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Contact</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors text-sm">info@cabzilla.com</a></li>
                  <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors text-sm">+1 800 123 4567</a></li>
                  <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors text-sm">123 Travel Street</a></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-8 mt-8 text-center text-gray-600 text-sm">
            &copy; {new Date().getFullYear()} CabZilla. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CabsPage;
