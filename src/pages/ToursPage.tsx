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
    <Card className="bg-white shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-medium text-gray-800">Available Tour Packages</h2>
          <Button 
            variant="outline" 
            onClick={() => {
              setSearchInitiated(false);
              setTours([]);
            }}
            className="text-sm"
          >
            Modify Search
          </Button>
        </div>
        
        {isLoadingTours ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
            <p className="text-gray-600">Loading available tours...</p>
          </div>
        ) : tours.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No tours available for the selected date.</p>
            <Button 
              variant="outline" 
              onClick={() => setSearchInitiated(false)} 
              className="mt-4"
            >
              Try Another Date
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tours.map((tour) => (
              <Card 
                key={tour.tourId}
                className="cursor-pointer transition-all hover:shadow-md hover:scale-105"
                onClick={() => handleTourSelect(tour.tourId)}
              >
                <CardContent className="p-0">
                  <div className="relative">
                    <img
                      src={tour.imageUrl}
                      alt={tour.tourName}
                      className="w-full h-40 object-cover rounded-t-lg"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=300&fit=crop';
                      }}
                    />
                    <div className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow">
                      {tour.timeDuration && tour.timeDuration.trim() !== '' ? tour.timeDuration : `${tour.days} Day${tour.days > 1 ? 's' : ''}`}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-1 line-clamp-2">{tour.tourName}</h3>
                    <div className="flex items-center gap-4 text-gray-600 text-sm mb-2">
                      <span className="flex items-center gap-1">
                        <MapPin size={16} /> {tour.distance} km
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={16} /> {tour.days} day{tour.days > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 mb-2 line-clamp-2">{tour.description}</div>
                    <div className="text-blue-700 font-semibold text-right">
                      Starting from ₹{tour.minPrice.toLocaleString('en-IN')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
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
