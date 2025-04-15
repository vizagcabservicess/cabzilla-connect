
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { TabTripSelector } from "@/components/TabTripSelector";
import { LocationInput } from "@/components/LocationInput";
import { DateTimePicker } from "@/components/DateTimePicker";
import { Calendar, MapPin, Search } from "lucide-react";
import { TripType, TripMode } from "@/lib/tripTypes";
import { Location } from "@/lib/locationData";
import { useToast } from "@/components/ui/use-toast";
import { useGoogleMaps } from "@/providers/GoogleMapsProvider";
import { HeroFeatureSection } from "@/components/HeroFeatureSection";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isLoaded } = useGoogleMaps();

  const [tripType, setTripType] = useState<TripType>("outstation");
  const [tripMode, setTripMode] = useState<TripMode>("one-way");
  const [pickup, setPickup] = useState<Location | null>(null);
  const [dropoff, setDropoff] = useState<Location | null>(null);
  const [pickupDate, setPickupDate] = useState<Date | undefined>(new Date());
  const [returnDate, setReturnDate] = useState<Date | undefined>(undefined);

  // Handle trip type change
  const handleTripTypeChange = (type: TripType) => {
    setTripType(type);
    
    // Reset form when changing trip type
    setPickup(null);
    setDropoff(null);
    
    if (type === "local") {
      setTripMode("one-way"); // Local trips are always one-way
    }
  };

  // Handle form submission
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

    // Store search parameters in session storage
    sessionStorage.setItem('pickupLocation', JSON.stringify(pickup));
    sessionStorage.setItem('dropLocation', JSON.stringify(dropoff));
    sessionStorage.setItem('pickupDate', JSON.stringify(pickupDate));
    sessionStorage.setItem('returnDate', JSON.stringify(returnDate));
    sessionStorage.setItem('tripMode', tripMode);
    sessionStorage.setItem('tripType', tripType);

    // Navigate to cabs page with the selected trip type
    navigate(`/cabs/${tripType}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <div className="relative">
        {/* Hero Section */}
        <section className="relative pt-24 pb-16 md:pb-24 bg-gradient-to-r from-cabBlue-50 to-cabGray-50">
          <div className="container mx-auto px-4 pt-12">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-bold text-cabGray-900 mb-3">
                  Your Journey, Our Priority
                </h1>
                <p className="text-cabBlue-600 text-lg font-medium uppercase tracking-wider">
                  BOOK A CAB IN MINUTES
                </p>
              </div>

              {/* Trip Search Card */}
              <div className="bg-white rounded-xl shadow-xl p-6 mb-8">
                {/* Trip Type Selector */}
                <TabTripSelector 
                  selectedTab={tripType}
                  tripMode={tripMode}
                  onTabChange={handleTripTypeChange}
                  onTripModeChange={setTripMode}
                />
                
                <div className="mt-6 space-y-4">
                  {/* Location Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <LocationInput 
                      label="PICKUP LOCATION" 
                      placeholder="Enter pickup location"
                      value={pickup}
                      onLocationChange={setPickup}
                      isPickupLocation={true}
                    />
                    
                    <LocationInput 
                      label="DROP LOCATION" 
                      placeholder="Enter destination location"
                      value={dropoff}
                      onLocationChange={setDropoff}
                      isPickupLocation={false}
                    />
                  </div>
                  
                  {/* Date Time Pickers */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DateTimePicker 
                      label="PICKUP DATE & TIME" 
                      date={pickupDate} 
                      onDateChange={setPickupDate} 
                      minDate={new Date()} 
                    />
                    
                    {tripMode === "round-trip" && (
                      <DateTimePicker 
                        label="RETURN DATE & TIME" 
                        date={returnDate} 
                        onDateChange={setReturnDate} 
                        minDate={pickupDate} 
                      />
                    )}
                  </div>
                  
                  {/* Search Button */}
                  <Button 
                    onClick={handleSearch}
                    className="w-full md:w-auto mt-4 bg-cabBlue-600 hover:bg-cabBlue-700"
                    size="lg"
                  >
                    <Search className="mr-2 h-5 w-5" />
                    Search Cabs
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Features Section */}
      <HeroFeatureSection />
      
      <footer className="bg-cabGray-100 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between mb-8">
            <div className="mb-6 md:mb-0">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-10 rounded-lg bg-cabBlue-500 text-white flex items-center justify-center font-bold text-xl">
                  CC
                </div>
                <span className="font-bold text-xl text-cabBlue-800">
                  CabZilla
                </span>
              </div>
              <p className="text-cabGray-600 max-w-md">
                Book reliable and comfortable cab services for all your travel needs.
                Available 24/7 with transparent pricing and professional drivers.
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div>
                <h4 className="font-semibold text-cabGray-800 mb-3">Company</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-cabGray-600 hover:text-cabBlue-600 transition-colors">About Us</a></li>
                  <li><a href="#" className="text-cabGray-600 hover:text-cabBlue-600 transition-colors">Team</a></li>
                  <li><a href="#" className="text-cabGray-600 hover:text-cabBlue-600 transition-colors">Careers</a></li>
                  <li><a href="#" className="text-cabGray-600 hover:text-cabBlue-600 transition-colors">Blog</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-cabGray-800 mb-3">Support</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-cabGray-600 hover:text-cabBlue-600 transition-colors">Help Center</a></li>
                  <li><a href="#" className="text-cabGray-600 hover:text-cabBlue-600 transition-colors">Safety</a></li>
                  <li><a href="#" className="text-cabGray-600 hover:text-cabBlue-600 transition-colors">Terms of Service</a></li>
                  <li><a href="#" className="text-cabGray-600 hover:text-cabBlue-600 transition-colors">Privacy Policy</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-cabGray-800 mb-3">Contact</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-cabGray-600 hover:text-cabBlue-600 transition-colors">info@cabzilla.com</a></li>
                  <li><a href="#" className="text-cabGray-600 hover:text-cabBlue-600 transition-colors">+1 800 123 4567</a></li>
                  <li><a href="#" className="text-cabGray-600 hover:text-cabBlue-600 transition-colors">123 Travel Street</a></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="border-t border-cabGray-200 pt-8 mt-8 text-center text-cabGray-600 text-sm">
            &copy; {new Date().getFullYear()} CabZilla. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
