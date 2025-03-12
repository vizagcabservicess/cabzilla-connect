
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { LocationInput } from "@/components/LocationInput";
import { DateTimePicker } from "@/components/DateTimePicker";
import { CabOptions } from "@/components/CabOptions";
import { Location } from "@/lib/locationData";
import { CabType, cabTypes } from "@/lib/cabData";
import { CarTaxiFront } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

type TripType = "outstation" | "local" | "airport";

const CabsPage = () => {
  const navigate = useNavigate();
  const [pickup, setPickup] = useState<Location | null>(null);
  const [dropoff, setDropoff] = useState<Location | null>(null);
  const [pickupDate, setPickupDate] = useState<Date | undefined>(new Date());
  const [selectedCab, setSelectedCab] = useState<CabType | null>(null);
  const [tripType, setTripType] = useState<TripType>("outstation");
  
  // Default distance - in a real app, this would be calculated based on pickup and dropoff
  const distance = 18; // 18 km
  
  const handleTripTypeChange = (type: TripType) => {
    setTripType(type);
    // Reset form when trip type changes
    setSelectedCab(null);
  };
  
  const handleBookNow = () => {
    if (pickup && dropoff && pickupDate && selectedCab) {
      // In a real app, you would save the booking details to state/context
      const bookingDetails = {
        tripType,
        pickup,
        dropoff,
        pickupDate,
        selectedCab,
        distance,
        totalPrice: selectedCab.price + (distance * selectedCab.pricePerKm)
      };
      
      // Save booking details to session storage
      sessionStorage.setItem("bookingDetails", JSON.stringify(bookingDetails));
      
      navigate("/booking-confirmation");
    } else {
      // Show validation errors
      toast({
        title: "Missing information",
        description: "Please fill all the required fields",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Page Header with Banner */}
      <div className="bg-blue-600 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Book Outstation and Local Cabs</h1>
            <p className="mb-0 text-blue-100">
              AC cabs for intercity travel, local & airport transfers with safety assured
            </p>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Booking Form Header */}
            <div className="bg-blue-50 p-4 border-b border-blue-100">
              <div className="flex space-x-6">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="radio" 
                    name="trip-type" 
                    className="sr-only peer" 
                    checked={tripType === "outstation"}
                    onChange={() => handleTripTypeChange("outstation")}
                  />
                  <div className="w-5 h-5 border border-blue-500 rounded-full peer peer-checked:bg-blue-500 peer-checked:border-0 transition-all"></div>
                  <span className="ml-2 text-sm font-medium text-gray-700">Outstation</span>
                </label>
                
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="radio" 
                    name="trip-type" 
                    className="sr-only peer"
                    checked={tripType === "local"}
                    onChange={() => handleTripTypeChange("local")}
                  />
                  <div className="w-5 h-5 border border-gray-300 rounded-full peer peer-checked:bg-blue-500 peer-checked:border-0 transition-all"></div>
                  <span className="ml-2 text-sm font-medium text-gray-700">Local</span>
                </label>
                
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="radio" 
                    name="trip-type" 
                    className="sr-only peer"
                    checked={tripType === "airport"}
                    onChange={() => handleTripTypeChange("airport")}
                  />
                  <div className="w-5 h-5 border border-gray-300 rounded-full peer peer-checked:bg-blue-500 peer-checked:border-0 transition-all"></div>
                  <span className="ml-2 text-sm font-medium text-gray-700">Airport</span>
                </label>
              </div>
            </div>
            
            {/* Form Inputs */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <LocationInput 
                  label="PICKUP LOCATION" 
                  placeholder="Enter pickup location" 
                  value={pickup} 
                  onChange={setPickup} 
                />
                
                <LocationInput 
                  label="DROP LOCATION" 
                  placeholder="Enter drop location" 
                  value={dropoff} 
                  onChange={setDropoff} 
                />
                
                <DateTimePicker 
                  label="PICKUP DATE & TIME" 
                  date={pickupDate} 
                  onDateChange={setPickupDate} 
                  minDate={new Date()} 
                />
                
                <div className="md:flex">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-6 md:mt-9 w-full flex">
                    <div className="text-amber-500 mr-2">
                      <CarTaxiFront size={18} />
                    </div>
                    <div className="text-xs text-gray-700">
                      <p>Est. one-way distance: <span className="font-semibold">{distance} km</span></p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Divider */}
              <div className="border-t border-gray-200 my-6"></div>
              
              {/* Cabs List */}
              <CabOptions 
                cabTypes={cabTypes} 
                selectedCab={selectedCab} 
                onSelectCab={setSelectedCab} 
                distance={distance} 
              />
              
              {/* Book Now Button */}
              <div className="mt-8 flex justify-center">
                <Button 
                  onClick={handleBookNow}
                  className="bg-red-500 hover:bg-red-600 text-white px-8 py-6 rounded-md font-semibold text-lg"
                  disabled={!pickup || !dropoff || !pickupDate || !selectedCab}
                >
                  Book Now
                </Button>
              </div>
            </div>
          </div>
          
          {/* Why Book With Us Section */}
          <div className="mt-12">
            <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">Why Book Outstation Cabs with Us?</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">Safety Assured</h3>
                <p className="text-sm text-gray-600">
                  Sanitized cabs with verified drivers and regular temperature checks
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"></path>
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">Transparent Pricing</h3>
                <p className="text-sm text-gray-600">
                  Clear fare breakdown with no hidden charges or surge pricing
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                    <path d="M3 11.5h18"></path>
                    <path d="M5 7.5l4 4-4 4"></path>
                    <path d="M19 17.5l-4-4 4-4"></path>
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">Flexibility</h3>
                <p className="text-sm text-gray-600">
                  Free cancellation up to 2 hours before pickup and easy rescheduling
                </p>
              </div>
            </div>
          </div>
          
          {/* FAQ Section */}
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
      
      {/* Footer */}
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
