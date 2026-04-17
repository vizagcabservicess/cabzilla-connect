import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { MobileNavigation } from '@/components/MobileNavigation';
import Footer from '@/components/Footer';
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
import { Helmet } from 'react-helmet-async';
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
import { CabType } from '@/types/cab';
import { tourDetailAPI } from '@/services/api/tourDetailAPI';
import { bookingAPI } from '@/services/api';
import { BookingRequest } from '@/types/api';
import { usePrivileges } from '@/hooks/usePrivileges';
import { usePDFExport } from '@/hooks/usePDFExport';
import { DateTimePicker } from '@/components/DateTimePicker';
import { formatDateForAPI } from '@/lib/dateUtils';
import { getTourIdFromSlug, getTourUrl, getTourIdVariantsForSlug } from '@/utils/tourUrlUtils';

interface VehicleWithPricing extends CabType {
  price: number;
}

const TourDetailPage = () => {
  const { tourSlug } = useParams<{ tourSlug: string }>();
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
  const [tripMode, setTripMode] = useState<'one-way' | 'round-trip'>('one-way');

  
  // Load pickup details from session storage or navigation state
  const loadPickupData = () => {
    try {
      // Check navigation state first (when coming from Hero or ToursPage)
      const navigationState = location.state as any;
      if (navigationState && navigationState.pickupLocation) {
        const loc = navigationState.pickupLocation;
        const locationName = typeof loc === 'object' && loc?.name ? loc.name : String(loc);
        const isInVizag = typeof loc === 'object' && loc?.isInVizag !== undefined ? loc.isInVizag : true;
        const location = typeof loc === 'object'
          ? { ...loc, name: locationName, isInVizag }
          : { name: locationName, isInVizag: true };
        return {
          location,
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
    const tourId = getTourIdFromSlug(tourSlug || '');
    navigate('/', { 
      state: { 
        tripType: 'tour',
        pickupLocation: pickupLocation.name,
        tourId: tourId 
      } 
    });
  };

  // Edit pickup location handler
  const handleEditPickupLocation = () => {
    // For now, navigate back to main page to edit location
    // In the future, this could open a location picker modal
    const tourId = getTourIdFromSlug(tourSlug || '');
    navigate('/', { 
      state: { 
        tripType: 'tour',
        pickupLocation: pickupLocation.name,
        tourId: tourId,
        editLocation: true
      } 
    });
  };

  // Edit pickup date handler
  const handleEditPickupDate = () => {
    // For now, navigate back to main page to edit date
    // In the future, this could open a date picker modal
    const tourId = getTourIdFromSlug(tourSlug || '');
    navigate('/', { 
      state: { 
        tripType: 'tour',
        pickupLocation: pickupLocation.name,
        pickupDate: pickupDate,
        tourId: tourId,
        editDate: true
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
    if (tourSlug) {
      loadTourDetail();
    }
  }, [tourSlug]);

  useEffect(() => {
    if (tour) {
      console.log("Tour Inclusions:", tour.inclusions);
      console.log("Tour Exclusions:", tour.exclusions);
    }
  }, [tour]);

  // Reset booking form state when coming back from payment page
  useEffect(() => {
    // Check if we're coming back from payment page
    const storedDetails = sessionStorage.getItem('bookingDetails');
    if (storedDetails) {
      try {
        const details = JSON.parse(storedDetails);
        // If this is a tour booking and we have a selected vehicle, 
        // but we want to show vehicle selection instead of booking form
        const tourId = getTourIdFromSlug(tourSlug || '');
        if (details.bookingType === 'tour' && details.tourId === tourId) {
          // Reset to vehicle selection view
          setShowBookingForm(false);
          // Keep the selected vehicle for the booking summary display
          if (details.selectedCab) {
            setSelectedVehicle(details.selectedCab);
          }
        }
      } catch (error) {
        console.error('Error parsing booking details:', error);
      }
    }
  }, [tourSlug]);

  // Scroll to top when booking form is shown (ensures correct position after React renders)
  useEffect(() => {
    if (showBookingForm) {
      const scroll = () => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      };
      requestAnimationFrame(() => {
        scroll();
        setTimeout(scroll, 100);
      });
    }
  }, [showBookingForm]);

  const loadTourDetail = async () => {
    if (!tourSlug) return;
    try {
      setIsLoading(true);

      // First, try to get all tours to find the correct tour ID
      const allTours = await tourDetailAPI.getTours();

      // Find the tour that matches our URL slug
      const matchingTour = allTours.find(tour => {
        const tourUrl = getTourUrl(tour);
        const urlSlug = tourUrl.replace('/tours/', '');
        return urlSlug === tourSlug;
      });

      // Build list of IDs to try (matchingTour first, then slug variants)
      const slugVariants = getTourIdVariantsForSlug(tourSlug);
      const idsToTry: string[] = matchingTour
        ? [matchingTour.tourId, ...slugVariants.filter(id => id !== matchingTour.tourId)]
        : slugVariants;

      let tourDetail = null;
      for (const tourId of idsToTry) {
        tourDetail = await tourDetailAPI.getTourDetail(tourId);
        if (tourDetail) break;
      }

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
        tour,
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
      id: vehicle.id || vehicle.vehicleId,
      name: vehicle.name,
      capacity: vehicle.capacity,
      luggageCapacity: vehicle.luggageCapacity || 0,
      image: vehicle.image || '',
      amenities: vehicle.amenities || [],
      description: vehicle.description || '',
      ac: vehicle.ac || true,
      price: vehicle.price,
      pricePerKm: vehicle.pricePerKm,
      nightHaltCharge: vehicle.nightHaltCharge,
      driverAllowance: vehicle.driverAllowance,
      vehicleId: vehicle.vehicleId || vehicle.id,
      vehicleType: vehicle.vehicleType || '',
      inactiveDates: vehicle.inactiveDates || [],
    };
  }

  const handleBookingSubmit = async (guestDetails: any) => {
    if (!tour || !selectedVehicle) return;
    
    try {
      setIsSubmitting(true);
      
      const computedTotal = selectedVehicle.price;
      const computedDistance = tour.distance;
      
      // For round-trip tours, drop location should be same as pickup location
      const dropLocation = tripMode === 'round-trip' 
        ? pickupLocation.name 
        : tour.tourName;
      
      const bookingData: BookingRequest = {
        pickupLocation: pickupLocation.name,
        dropLocation: dropLocation,
        pickupDate: formatDateForAPI(pickupDate),
        returnDate: null,
        vehicleType: selectedVehicle.vehicleType || selectedVehicle.name,
        cabType: selectedVehicle.name,
        vehicleCapacity: selectedVehicle.capacity,
        distance: computedDistance,
        tripType: 'tour',
        tripMode: tripMode,
        totalAmount: computedTotal,
        passengerName: guestDetails.name,
        passengerPhone: guestDetails.phone,
        passengerCountryCode: guestDetails.countryCode,
        passengerEmail: guestDetails.email,
        additionalRequirements: guestDetails.additionalRequirements,
        tourId: tour.tourId,
        tourName: tour.tourName,
        tourDuration: tour.duration || tour.timeDuration || '',
        tourDays: tour.days,
        tourItinerary: (tour.itinerary ?? []).map((d) => ({
          day: d.day,
          title: d.title,
          description: d.description,
          activities: Array.isArray(d.activities) ? d.activities : [],
        })),
        tourInclusions: tour.inclusions ?? [],
        tourExclusions: tour.exclusions ?? [],
        // Include GST details from guest form if provided
        gstEnabled: !!guestDetails.gstEnabled,
        gstDetails: guestDetails.gstEnabled ? {
          gstNumber: guestDetails.gstNumber,
          companyName: guestDetails.companyName,
          companyAddress: guestDetails.companyAddress,
          companyEmail: guestDetails.companyEmail,
        } : undefined,
      };
      
      const response = await bookingAPI.createBooking(bookingData);
      
      const bookingDataForStorage = {
        tourId: tour.tourId,
        tourName: tour.tourName,
        pickupLocation: pickupLocation,
        dropLocation: { name: dropLocation, address: '' },
        tourDistance: computedDistance,
        pickupDate: formatDateForAPI(pickupDate),
        returnDate: null,
        selectedCab: selectedVehicle,
        totalPrice: computedTotal,
        guestDetails,
        bookingType: 'tour',
        tripType: 'tour',
        tripMode: tripMode,
        bookingId: response.data?.id || response.id,
        bookingNumber: response.data?.bookingNumber || response.bookingNumber
      };
      
      sessionStorage.setItem('bookingDetails', JSON.stringify(bookingDataForStorage));
      
      toast({
        title: "Booking Created!",
        description: "Please complete payment to confirm your tour booking",
      });
      
      // Navigate to payment page instead of booking confirmation
      navigate("/payment");
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
      <>
        <Helmet>
          <title>Loading Tour Details - Vizag Taxi Hub</title>
          <meta name="description" content="Loading tour details and information..." />
        </Helmet>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
          <MobileNavigation />
        </div>
      </>
    );
  }

  if (!tour) {
    return (
      <>
        <Helmet>
          <title>Tour Not Found - Vizag Taxi Hub</title>
          <meta name="description" content="The requested tour could not be found. Browse our available tour packages in Visakhapatnam." />
        </Helmet>
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
      </>
    );
  }

  // Generate SEO-friendly content based on tour data
  const seoTitle = `${tour.tourName} - ${tour.duration} Tour Package | Vizag Taxi Hub`;
  const seoDescription = `${tour.tourName} - ${tour.duration} tour package from Visakhapatnam. ${tour.description.substring(0, 120)}... Book now for the best prices and professional service.`;
  const seoKeywords = `${tour.tourName.toLowerCase()}, ${tour.category.toLowerCase()} tour, ${tour.duration} package, tour from vizag, ${tour.difficulty.toLowerCase()} tour, vizag taxi hub tours`;
  const tourImage = tour.imageUrl || tour.gallery?.[0]?.url || '/og-image.png';
  const tourUrl = `https://vizagtaxihub.com${getTourUrl(tour)}`;

  return (
    <>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta name="keywords" content={seoKeywords} />
        <meta name="author" content="Vizag Taxi Hub" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={tourUrl} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:image" content={tourImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={tourUrl} />
        <meta property="twitter:title" content={seoTitle} />
        <meta property="twitter:description" content={seoDescription} />
        <meta property="twitter:image" content={tourImage} />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={tourUrl} />
        
        {/* Tour-specific structured data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TouristAttraction",
            "name": tour.tourName,
            "description": tour.description,
            "image": tourImage,
            "url": tourUrl,
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "44-66-22/4, near Singalamma Temple, Singalammapuram, Kailasapuram",
              "addressLocality": "Visakhapatnam",
              "addressRegion": "Andhra Pradesh",
              "postalCode": "530024",
              "addressCountry": "IN"
            },
            "touristType": tour.category,
            "duration": tour.duration,
            "distance": `${tour.distance} km`,
            "difficulty": tour.difficulty,
            "provider": {
              "@type": "Organization",
              "name": "Vizag Taxi Hub",
              "url": "https://vizagtaxihub.com"
            }
          })}
        </script>
      </Helmet>
      
      <div className="min-h-screen bg-gray-50 text-[14px] md:text-[15px]">
        <Navbar />
        
        <div className="container mx-auto px-3 py-4 pb-20 max-w-6xl">
          {/* Back Button */}
          <Button variant="ghost" onClick={() => navigate('/tours')} className="mb-4 text-sm py-2 px-3">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tours
          </Button>

          
          {/* Edit Module with PDF Export for Super Admin */}
          <div className="flex items-center justify-between gap-4 mb-4 py-8">
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
                        <p className="text-gray-700 mb-2 text-sm">
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
                              <p className="text-[13px] text-gray-600">{highlight.description}</p>
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
                              <p className="text-gray-700 mb-2 text-sm">{day.description}</p>
                              {day.activities && day.activities.length > 0 && (
                                <ul className="pl-4 list-disc">
                                  {day.activities.map((activity, actIdx) => (
                                    <li key={actIdx} className="text-sm text-gray-700">{activity}</li>
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
                      // Don't auto-navigate to booking form - let user click "Book Now"
                    }}
                    selectedVehicle={selectedVehicle}
                    onBookNow={() => {}}
                    tourDate={pickupDate}
                  />
                ) : !showBookingForm ? (
                  <div className="space-y-4">
                    {/* Trip Mode Selection */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-700 mb-3">Trip Mode</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setTripMode('one-way')}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            tripMode === 'one-way'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-center">
                            <div className="font-medium">One Way</div>
                            <div className="text-xs text-gray-500 mt-1">Start from pickup point</div>
                          </div>
                        </button>
                        <button
                          onClick={() => setTripMode('round-trip')}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            tripMode === 'round-trip'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-center">
                            <div className="font-medium">Round Trip</div>
                            <div className="text-xs text-gray-500 mt-1">Same day return to pickup point</div>
                          </div>
                        </button>
                      </div>
                      
                    </div>
                    
                    <BookingSummary
                      pickupLocation={pickupLocation}
                      dropLocation={tripMode === 'round-trip' ? pickupLocation : null}
                      pickupDate={pickupDate}
                      selectedCab={vehicleWithPricingToCabType(selectedVehicle)}
                      distance={tour.distance}
                      totalPrice={selectedVehicle.price}
                      tripType="tour"
                      tripMode={tripMode}
                      hourlyPackage="tour"
                      onEditPickupLocation={handleEditPickupLocation}
                      onEditPickupDate={handleEditPickupDate}
                    />
                    <div className="flex gap-2 mt-3 mb-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setSelectedVehicle(null)}
                      >
                        ← Back to Vehicles
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={handleBookNow}
                      >
                        Book Now
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <GuestDetailsForm
                  onSubmit={handleBookingSubmit}
                  // Pass computed price
                  totalPrice={selectedVehicle ? selectedVehicle.price : 0}
                  isLoading={isSubmitting}
                  onBack={() => {
                    setShowBookingForm(false);
                    setTimeout(() => {
                      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
                      document.documentElement.scrollTop = 0;
                      document.body.scrollTop = 0;
                    }, 200);
                  }}
                />
              </div>
              <div>
                {selectedVehicle && (
                  <BookingSummary
                    pickupLocation={pickupLocation}
                    dropLocation={tripMode === 'round-trip' ? pickupLocation : null}
                    pickupDate={pickupDate}
                    selectedCab={vehicleWithPricingToCabType(selectedVehicle)}
                    distance={tour.distance}
                    totalPrice={selectedVehicle.price}
                    tripType="tour"
                    tripMode={tripMode}
                    hourlyPackage="tour"
                    onEditPickupLocation={handleEditPickupLocation}
                    onEditPickupDate={handleEditPickupDate}
                  />
                )}
              </div>
            </div>
          )}
        </div>
        
        <Footer />
        <MobileNavigation />
      </div>
    </>
  );
};

export default TourDetailPage;
