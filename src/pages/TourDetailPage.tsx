import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { MobileNavigation } from '@/components/MobileNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookingSummary } from '@/components/BookingSummary';
import { GuestDetailsForm } from '@/components/GuestDetailsForm';
import { TourGallery } from '@/components/tour/TourGallery';
import { TourVehicleSelection } from '@/components/tour/TourVehicleSelection';
import { useToast } from '@/components/ui/use-toast';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  Camera,
  Mountain,
  Coffee,
  ArrowLeft,
  Check,
  X,
  Loader2
} from 'lucide-react';
import { TourDetail } from '@/types/tour';
import { VehicleWithPricing } from '@/types/vehicle';
import { tourDetailAPI } from '@/services/api/tourDetailAPI';
import { bookingAPI } from '@/services/api';
import { BookingRequest } from '@/types/api';

const TourDetailPage = () => {
  const { tourId } = useParams<{ tourId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [tour, setTour] = useState<TourDetail | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleWithPricing | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Mock pickup details for booking
  const [pickupLocation] = useState({ name: 'Visakhapatnam', isInVizag: true });
  const [pickupDate] = useState(new Date());

  // Helper: get the actual tour fare for the selected vehicle
  const getTourFare = (
    vehicle: VehicleWithPricing | null,
    pricing: Record<string, number>
  ): number => {
    if (!vehicle) return 0;
    // Try by id first
    if (vehicle.id && pricing[vehicle.id] !== undefined) {
      return pricing[vehicle.id];
    }
    // Fallback to lowercased name
    const key = (vehicle.name || '').toLowerCase();
    return pricing[key] || 0;
  };

  useEffect(() => {
    if (tourId) {
      loadTourDetail();
    }
  }, [tourId]);

  useEffect(() => {
    if (tour) {
      console.log("Tour Inclusions:", tour.inclusions);
      console.log("Tour Exclusions:", tour.exclusions);
    }
  }, [tour]);

  const loadTourDetail = async () => {
    if (!tourId) return;
    try {
      setIsLoading(true);
      const tourDetail = await tourDetailAPI.getTourDetail(tourId);
      console.log('Fetched Tour Detail:', tourDetail);
      if (tourDetail) {
        setTour(tourDetail);
      } else {
        toast({
          title: "Tour not found",
          description: "The requested tour could not be found",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading tour detail:', error);
      toast({
        title: "Error loading tour",
        description: "Failed to load tour details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Debug: See what the `tour` state looks like in the render
  if (tour) {
    console.log('Tour State in Render:', tour);
  }

  const handleVehicleSelect = (vehicle: VehicleWithPricing) => {
    setSelectedVehicle(vehicle);
  };

  const handleBookNow = () => {
    if (!selectedVehicle) {
      toast({
        title: "No vehicle selected",
        description: "Please select a vehicle to continue",
        variant: "destructive",
      });
      return;
    }
    setShowBookingForm(true);
  };

  const handleBookingSubmit = async (guestDetails: any) => {
    if (!tour || !selectedVehicle) return;
    
    try {
      setIsSubmitting(true);
      
      const bookingData: BookingRequest = {
        pickupLocation: pickupLocation.name,
        dropLocation: '',
        pickupDate: pickupDate.toISOString(),
        returnDate: null,
        cabType: selectedVehicle.name,
        distance: tour.distance,
        tripType: 'tour',
        tripMode: 'one-way',
        totalAmount: selectedVehicle.price,
        passengerName: guestDetails.name,
        passengerPhone: guestDetails.phone,
        passengerEmail: guestDetails.email,
        tourId: tour.tourId
      };
      
      const response = await bookingAPI.createBooking(bookingData);
      
      const bookingDataForStorage = {
        tourId: tour.tourId,
        tourName: tour.tourName,
        pickupLocation: pickupLocation,
        tourDistance: tour.distance,
        pickupDate: pickupDate.toISOString(),
        selectedCab: selectedVehicle,
        totalPrice: selectedVehicle.price,
        guestDetails,
        bookingType: 'tour',
        bookingId: response.id,
        bookingNumber: response.bookingNumber
      };
      
      sessionStorage.setItem('bookingDetails', JSON.stringify(bookingDataForStorage));
      
      toast({
        title: "Booking Confirmed!",
        description: "Your tour has been booked successfully",
      });
      
      navigate("/booking-confirmation", { state: { newBooking: true } });
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Booking Failed",
        description: "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
        <MobileNavigation />
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Tour Not Found</h1>
          <Button onClick={() => navigate('/tours')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tours
          </Button>
        </div>
        <MobileNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-[14px] md:text-[15px]">
      <Navbar />
      
      <div className="container mx-auto px-3 py-4 pb-20 max-w-5xl">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate('/tours')} className="mb-4 text-sm py-2 px-3">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tours
        </Button>

        {!showBookingForm ? (
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Left Section - Tour Details */}
            <div className="lg:col-span-2 space-y-4">
              {/* Header */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-xs">{tour.category}</Badge>
                  <Badge variant="outline" className="text-xs">{tour.difficulty}</Badge>
                </div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">{tour.tourName}</h1>
                <div className="flex items-center gap-3 text-gray-600 text-xs">
                  <span className="flex items-center gap-1">
                    <MapPin size={15} />
                    {tour.distance} km
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={15} />
                    {tour.days} day{tour.days > 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={15} />
                    {tour.timeDuration && tour.timeDuration.trim() !== '' ? tour.timeDuration : 'Full Day'}
                  </span>
                </div>
              </div>

              {/* Image Gallery */}
              <Card>
                <CardContent className="p-0">
                  <TourGallery 
                    gallery={tour.gallery} 
                    tourName={tour.tourName}
                    imageUrl={tour.imageUrl}
                  />
                </CardContent>
              </Card>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="overview" className="text-xs md:text-sm">Overview</TabsTrigger>
                  <TabsTrigger value="itinerary" className="text-xs md:text-sm">Itinerary</TabsTrigger>
                  <TabsTrigger value="inclusions" className="text-xs md:text-sm">
                    Inclusions & Exclusions
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-3">
                  <Card>
                    <CardHeader className="py-2 px-3">
                      <CardTitle className="text-sm">About This Tour</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 py-2">
                      <p className="text-gray-700 mb-2 text-xs">
                        {tour.description || 'No description available.'}
                      </p>
                      <div className="grid md:grid-cols-3 gap-2">
                        {tour.highlights.map((highlight, idx) => (
                          <div key={idx} className="text-center">
                            <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                              {highlight.icon === 'mountain' && <Mountain className="h-5 w-5 text-blue-600" />}
                              {highlight.icon === 'camera' && <Camera className="h-5 w-5 text-blue-600" />}
                              {highlight.icon === 'coffee' && <Coffee className="h-5 w-5 text-blue-600" />}
                            </div>
                            <h4 className="font-semibold mb-0.5 text-xs">{highlight.title}</h4>
                            <p className="text-[11px] text-gray-600">{highlight.description}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="itinerary">
                  <Card>
                    <CardHeader className="py-2 px-3">
                      <CardTitle className="text-sm">Tour Itinerary</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 py-2">
                      {tour.itinerary.length > 0 ? (
                        tour.itinerary.map((day, idx) => (
                          <div key={idx} className="mb-4 last:mb-0">
                            <h4 className="font-semibold text-xs md:text-sm mb-1">
                              Day {day.day}: {day.title}
                            </h4>
                            <p className="text-gray-700 mb-2 text-xs">{day.description}</p>
                            <ul className="space-y-1">
                              {day.activities.map((activity, actIndex) => (
                                <li key={actIndex} className="flex items-start gap-2 text-[12px]">
                                  <Check className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                  {activity}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-[12px]">No itinerary information available.</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="inclusions">
                  <div className="grid md:grid-cols-2 gap-4 mt-2">
                    {/* Included */}
                    <div className="border border-gray-200 bg-white rounded-lg p-4 min-h-[120px]">
                      <h3 className="text-green-600 font-semibold text-sm mb-2">Included</h3>
                      <ul className="space-y-1">
                        {Array.isArray(tour.inclusions) && tour.inclusions.filter(i => i && i.trim() !== '').length > 0 ? (
                          tour.inclusions.filter(i => i && i.trim() !== '').map((item, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm text-gray-800">
                              <span className="text-green-500 text-base">✔</span>
                              <span className="text-[13px]">{item}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-gray-400 text-xs pl-6">No inclusions listed</li>
                        )}
                      </ul>
                    </div>
                    {/* Not Included */}
                    <div className="border border-gray-200 bg-white rounded-lg p-4 min-h-[120px]">
                      <h3 className="text-red-600 font-semibold text-sm mb-2">Not Included</h3>
                      <ul className="space-y-1">
                        {Array.isArray(tour.exclusions) && tour.exclusions.filter(e => e && e.trim() !== '').length > 0 ? (
                          tour.exclusions.filter(e => e && e.trim() !== '').map((item, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm text-gray-800">
                              <span className="text-red-500 text-base">✖</span>
                              <span className="text-[13px]">{item}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-gray-400 text-xs pl-6">No exclusions listed</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Right Section - Vehicle Selection & Booking */}
            <div className="space-y-4">
              {!selectedVehicle ? (
                <TourVehicleSelection
                  pricing={tour.pricing}
                  onVehicleSelect={(vehicle) => {
                    setSelectedVehicle(vehicle);
                    setShowBookingForm(true); // auto-navigate to summary form
                  }}
                  selectedVehicle={selectedVehicle}
                  onBookNow={() => {}}
                />
              ) : (
                // Show Booking Summary and "Book Now" at bottom
                <div>
                  <BookingSummary
                    pickupLocation={pickupLocation}
                    dropLocation={null}
                    pickupDate={pickupDate}
                    selectedCab={selectedVehicle}
                    distance={tour.distance}
                    // !!! Pass correct fare:
                    totalPrice={getTourFare(selectedVehicle, tour.pricing)}
                    tripType="tour"
                    hourlyPackage="tour"
                  />
                  <Button
                    className="w-full mt-3 mb-2"
                    onClick={() => setShowBookingForm(true)}
                  >
                    Book Now
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <GuestDetailsForm
                onSubmit={handleBookingSubmit}
                // Pass correct fare:
                totalPrice={getTourFare(selectedVehicle, tour.pricing)}
                isLoading={isSubmitting}
                onBack={() => setShowBookingForm(false)}
              />
            </div>
            <div>
              {selectedVehicle && (
                <BookingSummary
                  pickupLocation={pickupLocation}
                  dropLocation={null}
                  pickupDate={pickupDate}
                  selectedCab={selectedVehicle}
                  distance={tour.distance}
                  // Pass correct fare:
                  totalPrice={getTourFare(selectedVehicle, tour.pricing)}
                  tripType="tour"
                  hourlyPackage="tour"
                />
              )}
            </div>
          </div>
        )}
      </div>
      
      <MobileNavigation />
    </div>
  );
};

export default TourDetailPage;
