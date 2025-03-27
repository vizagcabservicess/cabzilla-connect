
// We need to update the getTourFare function and related calculations
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { LocationInput } from "@/components/LocationInput";
import { DateTimePicker } from "@/components/DateTimePicker";
import { CabOptions } from "@/components/CabOptions";
import { BookingSummary } from "@/components/BookingSummary";
import { GuestDetailsForm } from "@/components/GuestDetailsForm";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { Location, vizagLocations } from "@/lib/locationData";
import { convertToApiLocation, createLocationChangeHandler, isLocationInVizag, safeIncludes } from "@/lib/locationUtils";
import { cabTypes, formatPrice } from "@/lib/cabData";
import { availableTours, tourFares } from "@/lib/tourData";
import { TripType } from "@/lib/tripTypes";
import { CabType } from "@/types/cab";
import { MapPin, Calendar, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { bookingAPI } from "@/services/api";
import { BookingRequest } from "@/types/api";

const ToursPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [selectedTour, setSelectedTour] = useState<string | null>(null);
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [pickupDate, setPickupDate] = useState<Date | undefined>(new Date());
  const [selectedCab, setSelectedCab] = useState<CabType | null>(null);
  const [showGuestDetailsForm, setShowGuestDetailsForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // This function gets the direct tour fare without adding GST
  const getTourFare = (tourId: string, cabId: string): number => {
    if (!tourId || !cabId) return 0;
    
    const tourFareMatrix = tourFares[tourId];
    if (tourFareMatrix) {
      return tourFareMatrix[cabId as keyof typeof tourFareMatrix] || 0;
    }
    return 0;
  };
  
  const handleTourSelect = (tourId: string) => {
    setSelectedTour(tourId);
    setSelectedCab(null);
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
  
  const handlePickupLocationChange = (location: Location) => {
    if (!location) return;
    
    if (location.isInVizag === undefined) {
      location.isInVizag = isLocationInVizag(location);
    }
    
    console.log("Pickup location changed:", location);
    setPickupLocation(location);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-5xl mx-auto">
          {!showGuestDetailsForm ? (
            <div className="bg-white rounded-lg shadow-md overflow-hidden p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Available Tour Packages</h2>
              
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
                      {tour.image ? (
                        <img 
                          src={tour.image} 
                          alt={tour.name} 
                          className="w-full h-full object-cover"
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
                      <div className="mt-2 text-sm text-blue-600">
                        Starts from ₹{getTourFare(tour.id, 'sedan').toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
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
                    onSelectCab={setSelectedCab}
                    distance={availableTours.find(t => t.id === selectedTour)?.distance || 0}
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
                    distance={availableTours.find(t => t.id === selectedTour)?.distance || 0}
                    totalPrice={getTourFare(selectedTour, selectedCab.id)}
                    tripType="tour"
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
