import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { MobileNavigation } from '@/components/MobileNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookingSummary } from '@/components/BookingSummary';
import { GuestDetailsForm } from '@/components/GuestDetailsForm';
import { TourGallery } from '@/components/tour/TourGallery';
import { TourEditModule } from '@/components/tour/TourEditModule';
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
  Loader2,
  Download
} from 'lucide-react';
import { TourDetail } from '@/types/tour';
import { VehicleWithPricing } from '@/types/vehicle';
import { tourDetailAPI } from '@/services/api/tourDetailAPI';
import { bookingAPI } from '@/services/api';
import { BookingRequest } from '@/types/api';
import { usePrivileges } from '@/hooks/usePrivileges';
import { usePDFExport } from '@/hooks/usePDFExport';

const TourDetailPage = () => {
  const { tourId } = useParams<{ tourId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isSuperAdmin } = usePrivileges();
  const { generateAndDownloadPDF, isGenerating } = usePDFExport();
  
  const [tour, setTour] = useState<TourDetail | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleWithPricing | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Load pickup details from session storage or navigation state
  const loadPickupData = () => {
    try {
      // Check navigation state first (when coming from Hero component)
      const navigationState = location.state as any;
      if (navigationState && navigationState.pickupLocation) {
        return {
          location: { name: navigationState.pickupLocation, isInVizag: true },
          date: navigationState.pickupDate ? new Date(navigationState.pickupDate) : new Date()
        };
      }
      
      // Fallback to session storage
      const pickupLocationData = sessionStorage.getItem('pickupLocation');
      const pickupDateData = sessionStorage.getItem('pickupDate');
      
      return {
        location: pickupLocationData ? JSON.parse(pickupLocationData) : { name: 'Visakhapatnam', isInVizag: true },
        date: pickupDateData ? new Date(JSON.parse(pickupDateData)) : new Date()
      };
    } catch (error) {
      console.error('Error loading pickup data:', error);
      return {
        location: { name: 'Visakhapatnam', isInVizag: true },
        date: new Date()
      };
    }
  };

  const pickupData = loadPickupData();
  const [pickupLocation, setPickupLocation] = useState(pickupData.location);
  const [pickupDate, setPickupDate] = useState(pickupData.date);
  
  // Edit functionality
  const handleEditTrip = () => {
    // Navigate back to main booking page with tour context
    navigate('/', { 
      state: { 
        tripType: 'tour',
        pickupLocation: pickupLocation.name,
        tourId: tourId 
      } 
    });
  };

  // Helper: Get the actual tour fare for the selected vehicle using correct DB column names.
  const getTourFare = (
    vehicle: VehicleWithPricing | null,
    pricing: Record<string, number>
  ): number => {
    if (!vehicle) return 0;
    // Ensure we use lowercase just as in your DB
    const vehId = (vehicle.id || '').toLowerCase();
    const price = pricing[vehId];
    console.log('Tour Fare Lookup:', { vehId, price, pricing });
    if (typeof price === 'number') return price;
    return 0;
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

  // PDF Export functionality (Super Admin only)
  const handleExportPDF = async () => {
    if (!tour) return;

    try {
      // Prepare vehicle fares data for PDF
      const vehicleFares = Object.entries(tour.pricing).map(([vehicleType, fare]) => ({
        vehicleType: vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1),
        fare: Number(fare),
        seatingCapacity: getSeatingCapacity(vehicleType)
      })).filter(v => v.fare > 0);

      const result = await generateAndDownloadPDF({
        tour: {
          ...tour,
          name: tour.tourName
        },
        pickupLocation: pickupLocation.name,
        pickupDate: pickupDate,
        vehicleFares
      });

      if (result.success) {
        toast({
          title: "PDF Generated!",
          description: `Quotation PDF downloaded as ${result.fileName}`,
        });
      } else {
        toast({
          title: "PDF Generation Failed",
          description: result.error || "Failed to generate PDF",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export PDF quotation",
        variant: "destructive",
      });
    }
  };

  // Helper function to get seating capacity based on vehicle type
  const getSeatingCapacity = (vehicleType: string): number => {
    const capacityMap: Record<string, number> = {
      sedan: 4,
      ertiga: 6,
      innova: 7,
      tempo: 12,
      luxury: 4
    };
    return capacityMap[vehicleType.toLowerCase()] || 4;
  };

  // Helper to map VehicleWithPricing to CabType (minimal, for BookingSummary)
  function vehicleWithPricingToCabType(vehicle: VehicleWithPricing | null) {
    if (!vehicle) return null;
    return {
      id: vehicle.id || vehicle.vehicle_id,
      name: vehicle.name,
      capacity: vehicle.capacity,
      luggageCapacity: 0, // or a sensible default or from vehicle if available
      image: vehicle.image || '',
      amenities: [], // or from vehicle if available
      description: '', // or from vehicle if available
      ac: true, // or from vehicle if available
      price: vehicle.price,
      pricePerKm: vehicle.pricePerKm,
      nightHaltCharge: vehicle.nightHaltCharge,
      driverAllowance: vehicle.driverAllowance,
      vehicleId: vehicle.vehicle_id || vehicle.id,
      vehicleType: vehicle.type || '',
    };
  }

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

        
        {/* Edit Module with PDF Export for Super Admin */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex-1">
            <TourEditModule
              pickupLocation={pickupLocation.name}
              destinationLocation={tour.tourName}
              pickupDate={pickupDate}
              onEdit={handleEditTrip}
            />
          </div>
          
          {/* PDF Export Button - Super Admin Only */}
          {isSuperAdmin() && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={isGenerating}
              className="flex items-center gap-2 px-3 py-2 text-sm"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isGenerating ? 'Generating...' : 'Export PDF'}
            </Button>
          )}
        </div>

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
                            {day.activities && day.activities.length > 0 && (
                              <ul className="pl-4 list-disc">
                                {day.activities.map((activity, actIdx) => (
                                  <li key={actIdx} className="text-xs text-gray-700">{activity}</li>
                                ))}
                              </ul>
                            )}
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
                    selectedCab={vehicleWithPricingToCabType(selectedVehicle)}
                    distance={tour.distance}
                    // FIX: Pass the price already on the selected vehicle
                    totalPrice={selectedVehicle.price}
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
                // FIX: Pass selected vehicle's price
                totalPrice={selectedVehicle ? selectedVehicle.price : 0}
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
                  selectedCab={vehicleWithPricingToCabType(selectedVehicle)}
                  distance={tour.distance}
                  // FIX: Pass selected vehicle's price
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
