import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { LocationInput } from "@/components/LocationInput";
import { DateTimePicker } from "@/components/DateTimePicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Location } from "@/lib/locationData";
import { isLocationInVizag } from "@/lib/locationUtils";
import { MapPin, Calendar, Loader2, Search } from "lucide-react";
import { MobileNavigation } from "@/components/MobileNavigation";
import { TourListItem } from "@/types/tour";
import { tourDetailAPI } from "@/services/api/tourDetailAPI";
import { TourCard } from "@/components/tour/TourCard";
import { Hero } from "@/components/Hero";

const ToursPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const locationState = useLocation().state as { 
    pickupLocation?: Location, 
    pickupDate?: Date 
  } | null;
  
  const [pickupLocation, setPickupLocation] = useState<Location | null>(
    locationState?.pickupLocation || null
  );
  const [pickupDate, setPickupDate] = useState<Date | undefined>(
    locationState?.pickupDate || new Date()
  );
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchInitiated, setSearchInitiated] = useState<boolean>(false);
  const [tours, setTours] = useState<TourListItem[]>([]);
  const [isLoadingTours, setIsLoadingTours] = useState<boolean>(false);
  
  // Load tours on component mount if location state is provided
  useEffect(() => {
    if (locationState?.pickupLocation && locationState?.pickupDate) {
      handleSearchTours();
    }
  }, []);
  
  const handleSearchTours = async () => {
    if (!pickupLocation) {
      toast({
        title: "No pickup location",
        description: "Please enter your pickup location",
        variant: "destructive",
      });
      return;
    }
    
    const isInVizag = pickupLocation.isInVizag !== undefined ? 
      pickupLocation.isInVizag : 
      isLocationInVizag(pickupLocation);
      
    if (!isInVizag) {
      toast({
        title: "Invalid pickup location",
        description: "Pickup location must be within Visakhapatnam city limits.",
        variant: "destructive",
      });
      return;
    }
    
    if (!pickupDate) {
      toast({
        title: "No date selected",
        description: "Please select a date for your tour",
        variant: "destructive",
      });
      return;
    }
    
    setIsSearching(true);
    setIsLoadingTours(true);
    setSearchInitiated(true);
    
    try {
      const toursList = await tourDetailAPI.getTours();
      setTours(toursList);
      
      if (!toursList.length) {
        toast({
          title: "No tours available",
          description: "We couldn't find any tours available for your selected date",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading tours:", error);
      setTours([]);
      toast({
        title: "Error loading tours",
        description: "We encountered an error while loading tours. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTours(false);
      setIsSearching(false);
    }
  };

  const handleTourSelect = (tourId: string) => {
    navigate(`/tours/${tourId}`);
  };

  // Only use what is available from backend for each card
  const buildTourCardProps = (tour: TourListItem) => {
    // Use the real inclusions and sightseeingPlaces passed from props or API
    // If missing, send as empty lists (don't inject demo data!)
    return {
      ...tour,
      inclusions: (tour as any).inclusions || [],
      sightseeingPlaces: (tour as any).sightseeingPlaces || [],
    };
  };

  const renderSearchForm = () => (
    <Card className="bg-white shadow-lg">
      <CardContent className="p-6">
        <h2 className="text-2xl font-medium text-gray-800 mb-6">Find Available Tours</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LocationInput
            label="PICKUP LOCATION"
            placeholder="Enter your pickup location"
            location={pickupLocation || undefined}
            onLocationChange={setPickupLocation}
            isPickupLocation={true}
          />
          
          <DateTimePicker
            label="TOUR DATE & TIME"
            date={pickupDate}
            onDateChange={setPickupDate}
            minDate={new Date()}
          />
        </div>
        
        <Button
          onClick={handleSearchTours}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md mt-6 w-full md:w-auto"
          disabled={isSearching}
        >
          {isSearching ? (
            <div className="flex items-center justify-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Searching...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <Search className="mr-2 h-4 w-4" />
              <span>SEARCH TOURS</span>
            </div>
          )}
        </Button>
      </CardContent>
    </Card>
  );
  
  const renderTourListing = () => (
    <div className="bg-white rounded-2xl shadow p-5 px-7 mb-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-bold text-2xl text-gray-900">Available Tour Packages</h2>
        <button className="px-3 py-1 border rounded-lg font-semibold text-sm hover:bg-blue-50 transition">
          Modify Search
        </button>
      </div>
      {/* Tour Cards Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
        {tours.length > 0 ? (
          tours.map((tour) => (
            <TourCard
              key={tour.tourId}
              tour={buildTourCardProps(tour)}
              onClick={() => handleTourSelect(tour.tourId)}
            />
          ))
        ) : (
          <div className="col-span-full text-center text-gray-500 py-6">
            No tours found.
          </div>
        )}
      </div>
    </div>
  );
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {/* Only show the Tour tab in the Hero for tours */}
      <div className="container mx-auto px-4 py-6 pb-20">
        <div className="max-w-7xl mx-auto">
          {!searchInitiated ? (
            <>
              {/* Hero Section */}
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  Discover Amazing Tours
                </h1>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Explore breathtaking destinations around Visakhapatnam with our carefully crafted tour packages.
                  From scenic hill stations to cultural experiences, find your perfect adventure.
                </p>
              </div>
              {renderSearchForm()}
            </>
          ) : (
            renderTourListing()
          )}
        </div>
      </div>
      
      <MobileNavigation />
    </div>
  );
};

export default ToursPage;
