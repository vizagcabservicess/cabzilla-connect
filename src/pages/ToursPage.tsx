import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { LocationInput } from "@/components/LocationInput";
import { DateTimePicker } from "@/components/DateTimePicker";
import { CabOptions } from "@/components/CabOptions";
import { BookingSummary } from "@/components/BookingSummary";
import { GuestDetailsForm } from "@/components/GuestDetailsForm";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { Location, vizagLocations } from "@/lib/locationData";
import { convertToApiLocation, createLocationChangeHandler, isLocationInVizag, safeIncludes } from "@/lib/locationUtils";
import { cabTypes, formatPrice } from "@/lib/cabData";
import { loadAvailableTours, getTourFare, loadTourFares } from "@/lib/tourData";
import { TripType } from "@/lib/tripTypes";
import { CabType, TourInfo } from "@/types/cab";
import { MapPin, Calendar, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { bookingAPI } from "@/services/api";
import { BookingRequest } from "@/types/api";
import { MobileNavigation } from "@/components/MobileNavigation";
import { formatDate, formatTime } from "@/lib/dateUtils";

const ToursPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const locationState = useLocation().state as { 
    pickupLocation?: Location, 
    pickupDate?: Date 
  } | null;
  
  // State variables for search criteria
  const [pickupLocation, setPickupLocation] = useState<Location | null>(
    locationState?.pickupLocation || null
  );
  const [pickupDate, setPickupDate] = useState<Date | undefined>(
    locationState?.pickupDate || new Date()
  );
  
  // State variables for tour selection and booking
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchInitiated, setSearchInitiated] = useState<boolean>(false);
  const [availableTours, setAvailableTours] = useState<TourInfo[]>([]);
  const [isLoadingTours, setIsLoadingTours] = useState<boolean>(false);
  const [selectedTour, setSelectedTour] = useState<string | null>(null);
  const [selectedCab, setSelectedCab] = useState<CabType | null>(null);
  const [showGuestDetailsForm, setShowGuestDetailsForm] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoadingFares, setIsLoadingFares] = useState(true);
  
  // Load tours on component mount
  useEffect(() => {
    // If we have location and date from navigation state, trigger search
    if (locationState?.pickupLocation && locationState?.pickupDate) {
      handleSearchTours();
    }
  }, []);
  
  useEffect(() => {
    setIsLoadingFares(true);
    loadTourFares().finally(() => setIsLoadingFares(false));
  }, []);
  
  // Function to search for available tours
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
    setSelectedTour(null);
    setSelectedCab(null);
    
    try {
      // Load tours from API
      const tours = await loadAvailableTours();
      setAvailableTours(tours);
      
      // Pre-load tour fares for faster selection later
      loadTourFares().catch(err => console.error("Failed to preload tour fares:", err));
      
      // If no tours found
      if (!tours.length) {
        toast({
          title: "No tours available",
          description: "We couldn't find any tours available for your selected date",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading tours:", error);
      setAvailableTours([]);
      toast({
        title: "Error loading tours",
        description: "We encountered an error while loading tours. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTours(false);
    }
  };
  
  // Handle tour selection
  const handleTourSelect = (tourId: string) => {
    setSelectedTour(tourId);
    setSelectedCab(null);
  };
  
  // Handle cab selection for a tour
  const handleCabSelect = (cab: CabType) => {
    setSelectedCab(cab);
    
    if (selectedTour) {
      const fare = getTourFare(selectedTour, cab.id);
      
      try {
        localStorage.setItem(`selected_fare_${cab.id}_tour_${selectedTour}`, JSON.stringify({
          fare,
          source: 'calculated',
          timestamp: Date.now(),
          packageType: 'tour',
          cabId: cab.id,
          tourId: selectedTour
        }));
        console.log(`Stored selected tour fare for ${cab.name}: ₹${fare}`);
      } catch (e) {
        console.error('Error storing selected tour fare:', e);
      }
    }
  };
  
  // Handle booking now button click
  const handleBookNow = () => {
    if (!selectedTour) {
      toast({
        title: "No tour selected",
        description: "Please select a tour package",
        variant: "destructive",
      });
      return;
    }
    
    if (!pickupLocation) {
      toast({
        title: "No pickup location",
        description: "Please enter your pickup location",
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
  
  // Handle guest details submission for booking
  const handleGuestDetailsSubmit = async (guestDetails: any) => {
    try {
      setIsSubmitting(true);
      
      const selectedTourDetails = availableTours.find(tour => tour.id === selectedTour);
      
      if (!selectedTourDetails || !selectedCab || !pickupLocation || !pickupDate) {
        toast({
          title: "Missing information",
          description: "Please complete all required fields",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }
      
      const fare = getTourFare(selectedTour!, selectedCab!.id);
      
      const bookingData: BookingRequest = {
        pickupLocation: pickupLocation.name || '',
        dropLocation: '', // Tours don't have specific drop locations
        pickupDate: pickupDate.toISOString(),
        returnDate: null, // Tours are considered one-way
        cabType: selectedCab.name,
        distance: selectedTourDetails.distance,
        tripType: 'tour',
        tripMode: 'one-way', // Tours are considered one-way
        totalAmount: fare,
        passengerName: guestDetails.name,
        passengerPhone: guestDetails.phone,
        passengerEmail: guestDetails.email,
        tourId: selectedTour
      };
      
      console.log('Submitting tour booking:', bookingData);
      
      const response = await bookingAPI.createBooking(bookingData);
      console.log('Tour booking created:', response);
      
      const bookingDataForStorage = {
        tourId: selectedTour,
        tourName: selectedTourDetails.name,
        pickupLocation: pickupLocation,
        tourDistance: selectedTourDetails.distance,
        pickupDate: pickupDate?.toISOString(),
        selectedCab,
        totalPrice: fare,
        guestDetails,
        bookingType: 'tour',
        bookingId: response.id,
        bookingNumber: response.bookingNumber
      };
      
      sessionStorage.setItem('bookingDetails', JSON.stringify(bookingDataForStorage));
      
      toast({
        title: "Tour Booking Confirmed!",
        description: "Your tour has been booked successfully",
        variant: "default",
      });
      
      navigate("/booking-confirmation", { state: { newBooking: true } });
    } catch (error) {
      console.error('Error creating tour booking:', error);
      toast({
        title: "Booking Failed",
        description: error instanceof Error ? error.message : "Failed to create booking. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Function to render the search form
  const renderSearchForm = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
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
        className="bg-blue-600 text-white px-6 py-2 rounded-md mt-6 w-full md:w-auto"
        disabled={isLoadingTours}
      >
        {isLoadingTours ? (
          <div className="flex items-center justify-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span>Searching...</span>
          </div>
        ) : 'SEARCH TOURS'}
      </Button>
    </div>
  );
  
  // Function to render the tour listings
  const renderTourListing = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-medium text-gray-800">Available Tour Packages</h2>
        <Button 
          variant="outline" 
          onClick={() => {
            setSearchInitiated(false);
            setSelectedTour(null);
            setSelectedCab(null);
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
      ) : availableTours.length === 0 ? (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {availableTours.map((tour) => (
            <div 
              key={tour.id}
              className={cn(
                "border rounded-lg overflow-hidden cursor-pointer transition-all",
                selectedTour === tour.id 
                  ? "border-blue-500 shadow-md ring-2 ring-blue-200" 
                  : "border-gray-200 hover:border-blue-300"
              )}
              onClick={() => handleTourSelect(tour.id)}
            >
              <div className="h-40 bg-gray-200 relative">
                <img
                  src={tour.image && tour.image.trim() !== '' ? tour.image : 'https://cdn.pixabay.com/photo/2016/11/29/09/32/auto-1868726_1280.jpg'}
                  alt={tour.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes('pixabay.com')) {
                      target.src = 'https://cdn.pixabay.com/photo/2016/11/29/09/32/auto-1868726_1280.jpg';
                    }
                  }}
                />
                {selectedTour === tour.id && (
                  <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                    <Check size={16} />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg">{tour.name}</h3>
                <div className="flex items-center mt-1 text-sm text-gray-500">
                  <MapPin size={14} className="mr-1" />
                  <span>{tour.distance} km journey</span>
                </div>
                <div className="mt-2 text-sm text-blue-600">
                  {(() => {
                    const fares = tour.pricing ? Object.values(tour.pricing).filter(f => f > 0) : [];
                    const minFare = fares.length ? Math.min(...fares) : 0;
                    return `Starts from ₹${minFare.toLocaleString('en-IN')}`;
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {selectedTour && (() => {
        const tour = availableTours.find(t => t.id === selectedTour);
        if (!tour || !tour.pricing) return null;
        const dynamicCabTypes = Object.keys(tour.pricing)
          .map(vehicleId => {
            const cab = cabTypes.find(c => c.id === vehicleId);
            const fare = tour.pricing[vehicleId];
            if (cab) return { ...cab, price: fare };
            // Fallback for unknown vehicles
            return {
              id: vehicleId,
              name: vehicleId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              capacity: 4,
              luggageCapacity: 2,
              image: 'https://cdn.pixabay.com/photo/2016/11/29/09/32/auto-1868726_1280.jpg',
              amenities: ['AC'],
              description: 'Tour vehicle',
              ac: true,
              fuelType: 'CNG',
              price: fare,
            };
          });
        console.log('tour.pricing keys:', Object.keys(tour.pricing));
        console.log('dynamicCabTypes:', dynamicCabTypes.map(c => c.id));
        console.log('dynamicCabTypes full:', dynamicCabTypes);
        // PATCH: Show all vehicles, even if price is 0 or missing
        const cabTypesWithFare = dynamicCabTypes;
        console.log('cabTypesWithFare:', cabTypesWithFare);
        if (cabTypesWithFare.length === 0) {
          return <div className="text-gray-500">No vehicles available for this tour.</div>;
        }
        return (
          <>
            {cabTypesWithFare.some(cab => !cab.price || cab.price === 0) && (
              <div className="text-amber-600 text-sm mb-2">Some vehicles have no price set. Please update fares in the admin panel.</div>
            )}
            <CabOptions
              cabTypes={cabTypesWithFare}
              selectedCab={selectedCab}
              onSelectCab={handleCabSelect}
              distance={tour.distance || 0}
              tripType="tour"
              tripMode="one-way"
              pickupDate={pickupDate}
              isCalculatingFares={false}
            />
          </>
        );
      })()}
      
      <Button
        onClick={handleBookNow}
        disabled={!selectedTour || !selectedCab}
        className="bg-blue-600 text-white px-6 py-2 rounded-md mt-6 w-full md:w-auto"
      >
        BOOK NOW
      </Button>
    </div>
  );
  
  if (isLoadingFares) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="text-lg text-gray-500">Loading fares...</span>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6 pb-20">
        <div className="max-w-5xl mx-auto">
          {!searchInitiated ? (
            renderSearchForm()
          ) : !showGuestDetailsForm ? (
            renderTourListing()
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <GuestDetailsForm
                  onSubmit={handleGuestDetailsSubmit}
                  totalPrice={selectedTour && selectedCab ? getTourFare(selectedTour, selectedCab.id) : 0}
                  isLoading={isSubmitting}
                  onBack={() => setShowGuestDetailsForm(false)}
                />
              </div>
              
              <div>
                {selectedTour && selectedCab && pickupLocation && pickupDate && (
                  <BookingSummary
                    pickupLocation={pickupLocation}
                    dropLocation={null} // Tours don't have drop locations
                    pickupDate={pickupDate}
                    selectedCab={selectedCab}
                    distance={availableTours.find(t => t.id === selectedTour)?.distance || 0}
                    totalPrice={getTourFare(selectedTour, selectedCab.id)}
                    tripType="tour"
                    hourlyPackage="tour"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <MobileNavigation />
    </div>
  );
};

export default ToursPage;
