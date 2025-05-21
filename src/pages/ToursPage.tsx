
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { LocationInput } from "@/components/LocationInput";
import { DateTimePicker } from "@/components/DateTimePicker";
import { CabOptions } from "@/components/CabOptions";
import { BookingSummary } from "@/components/BookingSummary";
import { GuestDetailsForm } from "@/components/GuestDetailsForm";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { Location, vizagLocations } from "@/lib/locationData";
import { convertToApiLocation, isLocationInVizag } from "@/lib/locationUtils";
import { cabTypes, formatPrice } from "@/lib/cabData";
import { availableTours, tourFares, loadTours, loadTourFares } from "@/lib/tourData";
import { TripType } from "@/lib/tripTypes";
import { CabType, TourInfo, TourFares } from "@/types/cab";
import { MapPin, Calendar, Check, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { bookingAPI } from "@/services/api";
import { BookingRequest } from "@/types/api";
import { toast } from "sonner";

const ToursPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [selectedTour, setSelectedTour] = useState<string | null>(null);
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [pickupDate, setPickupDate] = useState<Date | undefined>(new Date());
  const [selectedCab, setSelectedCab] = useState<CabType | null>(null);
  const [showGuestDetailsForm, setShowGuestDetailsForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for dynamic data
  const [tours, setTours] = useState<TourInfo[]>(availableTours);
  const [tourFareData, setTourFareData] = useState<TourFares>(tourFares);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  
  // Load tour data on component mount
  useEffect(() => {
    const fetchTourData = async () => {
      setIsLoading(true);
      setHasLoadError(false);
      
      try {
        // Fetch tour information and fares in parallel
        const [toursData, faresData] = await Promise.all([
          loadTours(),
          loadTourFares()
        ]);
        
        setTours(toursData);
        setTourFareData(faresData);
        console.log("Tours and fares loaded successfully", { toursData, faresData });
      } catch (error) {
        console.error("Error loading tour data:", error);
        setHasLoadError(true);
        toast({
          title: "Error loading tour data",
          description: "Please try refreshing the page.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTourData();
  }, []);
  
  const getTourFare = (tourId: string, cabId: string): number => {
    if (!tourId || !cabId) return 0;
    
    const tourFareMatrix = tourFareData[tourId];
    if (tourFareMatrix) {
      const fare = tourFareMatrix[cabId as keyof typeof tourFareMatrix];
      if (fare) return fare as number;
    }
    
    // Fallback fares if not found in the data
    if (cabId === 'sedan') return 3500;
    if (cabId === 'ertiga') return 4500;
    if (cabId === 'innova_crysta') return 5500;
    
    return 4000;
  };
  
  const handleTourSelect = (tourId: string) => {
    setSelectedTour(tourId);
    setSelectedCab(null);
  };
  
  const getTourById = (tourId: string): TourInfo | undefined => {
    return tours.find(tour => tour.id === tourId);
  };
  
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
      setIsSubmitting(true);
      
      const selectedTourDetails = getTourById(selectedTour!);
      
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
  
  const handlePickupLocationChange = (location: Location) => {
    if (!location) return;
    
    if (location.isInVizag === undefined) {
      location.isInVizag = isLocationInVizag(location);
    }
    
    console.log("Pickup location changed:", location);
    setPickupLocation(location);
  };
  
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
  
  // Retry loading function
  const handleRetryLoad = () => {
    setIsLoading(true);
    setHasLoadError(false);
    
    // Clear the cached data to force a fresh load
    sessionStorage.removeItem('tourData');
    sessionStorage.removeItem('tourFares');
    
    // Re-fetch the data
    Promise.all([loadTours(), loadTourFares()])
      .then(([toursData, faresData]) => {
        setTours(toursData);
        setTourFareData(faresData);
        toast({
          title: "Data refreshed",
          description: "Tour information has been updated.",
        });
      })
      .catch(error => {
        console.error("Error retrying tour data load:", error);
        setHasLoadError(true);
        toast({
          title: "Error loading tour data",
          description: "Please check your internet connection and try again.",
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };
  
  // Render tour cards with loading states
  const renderTourGrid = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={`skeleton-${i}`} className="border rounded-lg overflow-hidden">
              <Skeleton className="h-40 w-full" />
              <div className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    if (hasLoadError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-6">
          <div className="text-red-600 mb-4">
            <Info className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-red-700 mb-2">
            Unable to load tour packages
          </h3>
          <p className="text-red-600 mb-4">
            We're having trouble loading the tour information. Please try again later.
          </p>
          <Button 
            onClick={handleRetryLoad}
            variant="outline" 
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            Retry Loading
          </Button>
        </div>
      );
    }
    
    if (tours.length === 0) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center mb-6">
          <p className="text-gray-600">No tour packages are currently available.</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {tours.map((tour) => (
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
              {tour.image ? (
                <img 
                  src={tour.image} 
                  alt={tour.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fall back to a placeholder if image fails to load
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1500673922987-e212871fec22?auto=format&fit=crop&w=400&h=250';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <span className="text-gray-400">No image</span>
                </div>
              )}
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
              {tour.description && (
                <p className="mt-1 text-sm text-gray-600 line-clamp-2">{tour.description}</p>
              )}
              <div className="mt-2 text-sm text-blue-600">
                Starts from ₹{getTourFare(tour.id, 'sedan').toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-5xl mx-auto">
          {!showGuestDetailsForm ? (
            <div className="bg-white rounded-lg shadow-md overflow-hidden p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Tour Packages</h2>
              
              {renderTourGrid()}
              
              {selectedTour && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                    <LocationInput
                      label="PICKUP LOCATION"
                      placeholder="Enter your pickup location"
                      value={pickupLocation ? convertToApiLocation(pickupLocation) : undefined}
                      onLocationChange={handlePickupLocationChange}
                      isPickupLocation={true}
                    />
                    
                    <DateTimePicker
                      label="TOUR DATE & TIME"
                      date={pickupDate}
                      onDateChange={setPickupDate}
                      minDate={new Date()}
                    />
                  </div>
                  
                  <CabOptions
                    cabTypes={cabTypes.slice(0, 3)} // Only show the first 3 cab types for tours
                    selectedCab={selectedCab}
                    onSelectCab={handleCabSelect}
                    distance={getTourById(selectedTour)?.distance || 0}
                    tripType="tour"
                    tripMode="one-way" // Tours are considered one-way
                    pickupDate={pickupDate}
                  />
                  
                  <Button
                    onClick={handleBookNow}
                    disabled={!selectedTour || !pickupLocation || !pickupDate || !selectedCab}
                    className="bg-blue-600 text-white px-6 py-3 rounded-md mt-6 w-full md:w-auto"
                  >
                    BOOK NOW
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <GuestDetailsForm
                  onSubmit={handleGuestDetailsSubmit}
                  totalPrice={selectedTour && selectedCab ? 
                    getTourFare(selectedTour, selectedCab.id) : 0}
                  isSubmitting={isSubmitting}
                />
              </div>
              
              <div>
                {selectedTour && selectedCab && pickupLocation && pickupDate && (
                  <BookingSummary
                    pickupLocation={pickupLocation}
                    dropLocation={null} // Tours don't have drop locations
                    pickupDate={pickupDate}
                    selectedCab={selectedCab}
                    distance={getTourById(selectedTour)?.distance || 0}
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
    </div>
  );
};

export default ToursPage;
