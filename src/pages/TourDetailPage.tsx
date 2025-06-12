
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

  useEffect(() => {
    if (tourId) {
      loadTourDetail();
    }
  }, [tourId]);

  const loadTourDetail = async () => {
    if (!tourId) return;
    
    try {
      setIsLoading(true);
      const tourDetail = await tourDetailAPI.getTourDetail(tourId);
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6 pb-20">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate('/tours')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tours
        </Button>

        {!showBookingForm ? (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Section - Tour Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">{tour.category}</Badge>
                  <Badge variant="outline">{tour.difficulty}</Badge>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{tour.tourName}</h1>
                <div className="flex items-center gap-4 text-gray-600">
                  <span className="flex items-center gap-1">
                    <MapPin size={16} />
                    {tour.distance} km
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={16} />
                    {tour.days} day{tour.days > 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={16} />
                    {tour.duration}
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
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
                  <TabsTrigger value="inclusions">Inclusions</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>About This Tour</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 mb-4">{tour.description || 'No description available.'}</p>
                      
                      <div className="grid md:grid-cols-3 gap-4">
                        {tour.highlights.map((highlight, idx) => (
                          <div key={idx} className="text-center">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                              {highlight.icon === 'mountain' && <Mountain className="h-6 w-6 text-blue-600" />}
                              {highlight.icon === 'camera' && <Camera className="h-6 w-6 text-blue-600" />}
                              {highlight.icon === 'coffee' && <Coffee className="h-6 w-6 text-blue-600" />}
                            </div>
                            <h4 className="font-semibold mb-1">{highlight.title}</h4>
                            <p className="text-sm text-gray-600">{highlight.description}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="itinerary">
                  <Card>
                    <CardHeader>
                      <CardTitle>Tour Itinerary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {tour.itinerary.length > 0 ? (
                        tour.itinerary.map((day, idx) => (
                          <div key={idx} className="mb-6 last:mb-0">
                            <h4 className="font-semibold text-lg mb-2">Day {day.day}: {day.title}</h4>
                            <p className="text-gray-700 mb-3">{day.description}</p>
                            <ul className="space-y-1">
                              {day.activities.map((activity, actIndex) => (
                                <li key={actIndex} className="flex items-start gap-2 text-sm">
                                  <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                  {activity}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500">No itinerary information available.</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="inclusions">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-green-600">Included</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {tour.inclusions.length > 0 ? (
                            tour.inclusions.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                {item}
                              </li>
                            ))
                          ) : (
                            <li className="text-gray-500">No inclusions listed</li>
                          )}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-red-600">Not Included</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {tour.exclusions.length > 0 ? (
                            tour.exclusions.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <X className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                {item}
                              </li>
                            ))
                          ) : (
                            <li className="text-gray-500">No exclusions listed</li>
                          )}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Right Section - Vehicle Selection & Booking */}
            <div className="space-y-6">
              <TourVehicleSelection
                pricing={tour.pricing}
                onVehicleSelect={handleVehicleSelect}
                selectedVehicle={selectedVehicle}
                onBookNow={handleBookNow}
              />

              {/* Booking Summary */}
              {selectedVehicle && (
                <BookingSummary
                  pickupLocation={pickupLocation}
                  dropLocation={null}
                  pickupDate={pickupDate}
                  selectedCab={selectedVehicle}
                  distance={tour.distance}
                  totalPrice={selectedVehicle.price}
                  tripType="tour"
                  hourlyPackage="tour"
                />
              )}
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <GuestDetailsForm
                onSubmit={handleBookingSubmit}
                totalPrice={selectedVehicle?.price || 0}
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
                  totalPrice={selectedVehicle.price}
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
