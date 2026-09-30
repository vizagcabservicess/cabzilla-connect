import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Navigate, useSearchParams } from 'react-router-dom';
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
  Download,
  ChevronDown
} from 'lucide-react';
import { TourDetail, TourListItem } from '@/types/tour';
import { CabType } from '@/types/cab';
import { tourDetailAPI } from '@/services/api/tourDetailAPI';
import { bookingAPI } from '@/services/api';
import { BookingRequest } from '@/types/api';
import { usePrivileges } from '@/hooks/usePrivileges';
import { usePDFExport } from '@/hooks/usePDFExport';
import { DateTimePicker } from '@/components/DateTimePicker';
import { formatDateForAPI } from '@/lib/dateUtils';
import { getTourIdFromSlug, getTourUrl, getTourIdVariantsForSlug, getTourDisplayName } from '@/utils/tourUrlUtils';
import { getVehicleData } from '@/services/vehicleDataService';
import { addTourToBookingWidget, readTourCartCheckout, readTourCartTripExtras, removeTourFromCart } from '@/lib/addTourToBookingWidget';
import { useTourCart } from '@/hooks/useTourCart';
import { LocationInput } from '@/components/LocationInput';
import { Location } from '@/lib/locationData';

interface VehicleWithPricing extends CabType {
  price: number;
}

type TourDetailNavState = {
  pickupLocation?: { name?: string; isInVizag?: boolean } & Record<string, unknown>;
  pickupDate?: Date | string;
  selectedVehicle?: VehicleWithPricing;
  openGuestForm?: boolean;
  tourId?: string;
};

const TourDetailPage = () => {
  const { tourSlug } = useParams<{ tourSlug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { items: tourCartItems } = useTourCart();
  const { isSuperAdmin } = usePrivileges();
  const { generateAndDownloadPDF, isGenerating } = usePDFExport();
  
  const [tour, setTour] = useState<TourDetail | null>(null);
  const [catalogTours, setCatalogTours] = useState<TourListItem[]>([]);
  const navigationState = (location.state as TourDetailNavState | null) ?? null;
  const shouldOpenGuestForm =
    Boolean(navigationState?.openGuestForm) || searchParams.get('step') === 'guest';
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleWithPricing | null>(
    () => navigationState?.selectedVehicle ?? null
  );
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(
    () => shouldOpenGuestForm && Boolean(navigationState?.selectedVehicle)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tripMode, setTripMode] = useState<'one-way' | 'round-trip'>('one-way');
  const [aiPrefillDone, setAiPrefillDone] = useState(false);
  const [isEditingPickup, setIsEditingPickup] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [pickupDraft, setPickupDraft] = useState<Location | null>(null);
  const [showSelectedTourList, setShowSelectedTourList] = useState(true);
  const checkoutSnapshot = readTourCartCheckout();
  const checkoutLines = (checkoutSnapshot?.lines ?? []).map((line) => {
    if (line.distance && line.distance > 0) return line;
    const catalog = catalogTours.find((item) => item.tourId === line.tourId);
    const fallback = tour && line.tourId === tour.tourId ? tour.distance : 0;
    return {
      ...line,
      distance: catalog?.distance || fallback || 0,
    };
  });
  const checkoutCombinedTotal = checkoutLines.reduce((sum, line) => sum + (line.price || 0), 0);
  const checkoutAirportFare =
    Number(checkoutSnapshot?.additionalAirportFare) > 0
      ? Number(checkoutSnapshot?.additionalAirportFare)
      : Number(readTourCartTripExtras()?.additionalAirportFare) || 0;
  const checkoutAirportTransfers =
    checkoutSnapshot?.airportTransfers?.length
      ? checkoutSnapshot.airportTransfers
      : readTourCartTripExtras()?.airportTransfers || [];
  const checkoutCombinedDistance = checkoutLines.reduce((sum, line) => sum + (line.distance || 0), 0);
  
  // Load pickup details from session storage or navigation state
  const loadPickupData = () => {
    try {
      // Check navigation state first (when coming from Hero or ToursPage)
      const navState = location.state as TourDetailNavState | null;
      if (navState && navState.pickupLocation) {
        const loc = navState.pickupLocation;
        const locationName = typeof loc === 'object' && loc?.name ? loc.name : String(loc);
        const isInVizag = typeof loc === 'object' && loc?.isInVizag !== undefined ? loc.isInVizag : true;
        const location = typeof loc === 'object'
          ? { ...loc, name: locationName, isInVizag }
          : { name: locationName, isInVizag: true };
        return {
          location,
          date: navState.pickupDate ? new Date(navState.pickupDate) : new Date()
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

  
  const handleReturnToSelectedTours = () => {
    const snapshot = readTourCartCheckout();
    const cartIds = snapshot?.cartTourIds?.length
      ? snapshot.cartTourIds
      : tourCartItems.map((item) => item.tourId);
    if (cartIds.length > 1) {
      navigate('/tours', {
        state: {
          pickupLocation: snapshot?.pickupLocation || pickupLocation,
          pickupDate: pickupDate,
          cartTourIds: cartIds,
        },
      });
      return;
    }
    navigate('/tours', {
      state: {
        pickupLocation: snapshot?.pickupLocation || pickupLocation,
        pickupDate: pickupDate,
      },
    });
  };

  const handleEditTrip = () => {
    handleReturnToSelectedTours();
  };

  const handleEditPickupLocation = () => {
    setIsEditingDate(false);
    setPickupDraft(null);
    setIsEditingPickup((open) => !open);
  };

  const handleEditPickupDate = () => {
    setIsEditingPickup(false);
    setIsEditingDate((open) => !open);
  };

  const pickupAsLocation: Location = {
    id: String((pickupLocation as Location | undefined)?.id || 'tour-pickup'),
    name: pickupLocation.name || 'Visakhapatnam',
    city: (pickupLocation as Location | undefined)?.city || 'Visakhapatnam',
    state: (pickupLocation as Location | undefined)?.state || 'Andhra Pradesh',
    lat: Number((pickupLocation as Location | undefined)?.lat) || 17.6868,
    lng: Number((pickupLocation as Location | undefined)?.lng) || 83.2185,
    type: (pickupLocation as Location | undefined)?.type || 'other',
    popularityScore: 50,
    address: (pickupLocation as Location | undefined)?.address || pickupLocation.name || 'Visakhapatnam',
    isInVizag: pickupLocation.isInVizag !== false,
  };

  const pickupEditor = isEditingPickup ? (
    <LocationInput
      label=""
      placeholder="Search pickup location"
      location={pickupDraft ?? pickupAsLocation}
      onLocationChange={(loc) => {
        const name = String(loc?.name || loc?.address || '').trim();
        const lat = Number(loc?.lat);
        const lng = Number(loc?.lng);
        const picked = Boolean(
          name && Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)
        );
        if (!picked) {
          setPickupDraft({
            ...pickupAsLocation,
            id: '',
            name: '',
            address: '',
            lat: 0,
            lng: 0,
          });
          return;
        }
        const next = { ...loc, name: loc.name || name, isInVizag: loc.isInVizag !== false };
        setPickupLocation(next);
        setPickupDraft(null);
        sessionStorage.setItem('pickupLocation', JSON.stringify(next));
        setIsEditingPickup(false);
      }}
      isPickupLocation={true}
      tripType="tour"
    />
  ) : null;

  const dateEditor = isEditingDate ? (
    <DateTimePicker
      label=""
      date={pickupDate}
      onDateChange={(date) => {
        if (!date) return;
        setPickupDate(date);
        sessionStorage.setItem('pickupDate', JSON.stringify(date.toISOString()));
        setIsEditingDate(false);
      }}
      minDate={new Date()}
    />
  ) : null;

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

  // VTH AI deep-link: /tours/araku-valley-tour?source=vth_ai&step=guest&vehicle=Sedan&...
  useEffect(() => {
    if (!tour || aiPrefillDone) return;
    if (searchParams.get('source') !== 'vth_ai') return;

    let cancelled = false;
    (async () => {
      try {
        const vehicleHint = (searchParams.get('vehicle') || 'Sedan').toLowerCase();
        const from = searchParams.get('from') || 'Visakhapatnam';
        const dateRaw = searchParams.get('date');
        const timeRaw = searchParams.get('time');
        const name = searchParams.get('name') || '';
        const phone = searchParams.get('phone') || '';
        const openGuest = searchParams.get('step') === 'guest';

        if (name) sessionStorage.setItem('guestName', name);
        if (phone) {
          const digits = phone.replace(/\D/g, '').slice(-10);
          sessionStorage.setItem('guestPhone', digits);
          sessionStorage.setItem('countryCode', '+91');
        }

        // Pickup / date from AI
        setPickupLocation({ name: from, isInVizag: true });
        if (dateRaw) {
          let d = new Date(dateRaw);
          if (Number.isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
            const [y, m, day] = dateRaw.split('-').map(Number);
            d = new Date(y, m - 1, day, 10, 0, 0);
          }
          if (timeRaw && !Number.isNaN(d.getTime())) {
            const tm = timeRaw.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
            if (tm) {
              let h = parseInt(tm[1], 10);
              const min = tm[2] ? parseInt(tm[2], 10) : 0;
              const ap = (tm[3] || '').toLowerCase();
              if (ap === 'pm' && h < 12) h += 12;
              if (ap === 'am' && h === 12) h = 0;
              d.setHours(h, min, 0, 0);
            }
          }
          if (!Number.isNaN(d.getTime())) setPickupDate(d);
        }

        const vehicles = await getVehicleData(false, false);
        const pricing = tour.pricing || {};
        const withPrices = (vehicles || [])
          .map((v) => {
            const id = (v.vehicleId || v.id || '').toLowerCase();
            const price =
              pricing[id] ||
              pricing[v.vehicleId || ''] ||
              pricing[v.id] ||
              0;
            return { ...v, price } as VehicleWithPricing;
          })
          .filter((v) => v.price > 0);

        const match =
          withPrices.find((v) => {
            const n = `${v.name} ${v.id} ${v.vehicleId || ''}`.toLowerCase();
            if (vehicleHint.includes('innova') || vehicleHint.includes('crysta')) {
              return n.includes('innova') || n.includes('crysta');
            }
            if (vehicleHint.includes('ertiga')) return n.includes('ertiga');
            if (vehicleHint.includes('tempo')) return n.includes('tempo');
            if (vehicleHint.includes('urbania')) return n.includes('urbania');
            if (vehicleHint.includes('luxury')) return n.includes('luxury');
            return n.includes('sedan') || n.includes('dzire') || n.includes('swift');
          }) || withPrices[0];

        if (cancelled || !match) return;
        setSelectedVehicle(match);
        if (openGuest) setShowBookingForm(true);
        setAiPrefillDone(true);
      } catch (err) {
        console.error('VTH AI tour prefill failed', err);
        setAiPrefillDone(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tour, searchParams, aiPrefillDone]);

  // Reset booking form state when coming back from payment page
  useEffect(() => {
    if (shouldOpenGuestForm) return;
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
  }, [tourSlug, shouldOpenGuestForm]);

  useEffect(() => {
    if (selectedVehicle) return;
    const snapshot = readTourCartCheckout();
    if (!snapshot?.vehiclesByTourId) return;
    const tourId =
      navigationState?.tourId ||
      snapshot.activeTourId ||
      getTourIdFromSlug(tourSlug || '');
    const stored = snapshot.vehiclesByTourId[tourId];
    if (stored && typeof stored === 'object' && stored !== null && 'price' in stored) {
      setSelectedVehicle(stored as VehicleWithPricing);
    }
  }, [navigationState?.tourId, selectedVehicle, tourSlug]);

  useEffect(() => {
    if (!tour || !shouldOpenGuestForm || !selectedVehicle) return;
    setShowBookingForm(true);
  }, [tour, shouldOpenGuestForm, selectedVehicle]);

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
      setCatalogTours(allTours);

      // Find the tour that matches our URL slug
      const matchingTour = allTours.find(tour => {
        const tourUrl = getTourUrl(tour);
        const urlSlug = tourUrl.replace('/tours/', '');
        return urlSlug === tourSlug;
      });

      // Build list of IDs to try (cart/nav tourId first, then matchingTour, then slug variants)
      const slugVariants = getTourIdVariantsForSlug(tourSlug);
      const navTourId = String(navigationState?.tourId || '').trim();
      const idsToTry: string[] = [];
      if (navTourId) idsToTry.push(navTourId);
      if (matchingTour?.tourId && !idsToTry.includes(matchingTour.tourId)) {
        idsToTry.push(matchingTour.tourId);
      }
      for (const id of slugVariants) {
        if (!idsToTry.includes(id)) idsToTry.push(id);
      }

      let tourDetail = null;
      for (const tourId of idsToTry) {
        tourDetail = await tourDetailAPI.getTourDetail(tourId);
        if (tourDetail) break;
      }

      if (tourDetail) {
        setTour(tourDetail);
      } else {
        setTour(null);
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

  const handleAddToBook = () => {
    if (!tour) return;
    addTourToBookingWidget(
      { tourId: tour.tourId, tourName: tour.tourName },
      { navigate }
    );
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
      
      const pricedCheckoutLines = checkoutLines.filter((line) => line.price > 0);
      const isMultiTourCheckout = pricedCheckoutLines.length > 1;
      const computedTotal = isMultiTourCheckout
        ? pricedCheckoutLines.reduce((sum, line) => sum + line.price, 0)
        : selectedVehicle.price;
      const computedDistance = isMultiTourCheckout
        ? pricedCheckoutLines.reduce((sum, line) => sum + (line.distance || 0), 0) || tour.distance
        : tour.distance;
      const packageLabel = isMultiTourCheckout
        ? pricedCheckoutLines.map((line) => line.tourName).join(' + ')
        : tour.tourName;
      const tourListNote = isMultiTourCheckout
        ? `Selected tours: ${pricedCheckoutLines
            .map((line) => `${line.tourName} · ${line.vehicleName || selectedVehicle.name} · ₹${line.price.toLocaleString('en-IN')}`)
            .join('; ')}`
        : '';
      
      const dropLocation = packageLabel;
      
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
        additionalRequirements: [guestDetails.additionalRequirements, tourListNote]
          .map((part) => String(part || '').trim())
          .filter(Boolean)
          .join('\n'),
        tourId: tour.tourId,
        tourName: packageLabel,
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
        tourName: packageLabel,
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
      if (isMultiTourCheckout) {
        for (const line of pricedCheckoutLines) {
          removeTourFromCart(line.tourId);
        }
      } else {
        removeTourFromCart(tour.tourId);
      }
      
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
      <Navigate
        to="/tours"
        replace
        state={{ tourNotFound: getTourDisplayName(tourSlug || '') }}
      />
    );
  }

  // Generate SEO-friendly content based on tour data
  const seoTitle = `${tour.tourName} - ${tour.duration} Tour Package | Vizag Taxi Hub`;
  const seoDescription = `${tour.tourName} - ${tour.duration} tour package from Visakhapatnam. ${tour.description.substring(0, 120)}... Book now for the best prices and professional service.`;
  const seoKeywords = `${tour.tourName.toLowerCase()}, ${tour.category.toLowerCase()} tour, ${tour.duration} package, tour from vizag, ${tour.difficulty.toLowerCase()} tour, vizag taxi hub tours`;
  const tourImage = tour.imageUrl || tour.gallery?.[0]?.url || '/og-image.png';
  const tourUrl = `https://vizagtaxihub.com${getTourUrl(tour)}`;
  const payableTotal =
    (checkoutLines.length > 1 && checkoutCombinedTotal > 0
      ? checkoutCombinedTotal
      : (selectedVehicle?.price ?? 0)) + checkoutAirportFare;
  const payableDistance =
    checkoutLines.length > 1 && checkoutCombinedDistance > 0
      ? checkoutCombinedDistance
      : tour.distance;
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
      
      <div className="min-h-screen max-w-[100%] overflow-x-clip bg-gray-50 text-[14px] md:text-[15px]">
        <Navbar />
        
        <div className="mx-auto max-w-6xl min-w-0 overflow-x-clip pb-24 md:container md:px-3 md:py-4 md:pb-20">
          <Button
            variant="ghost"
            onClick={handleReturnToSelectedTours}
            className="mb-4 hidden text-sm py-2 px-3 md:inline-flex"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {checkoutLines.length > 1 ? 'Back to selected tours' : 'Back to Tours'}
          </Button>
          {checkoutLines.length > 1 && (
            <div className="mb-3 mx-4 rounded-xl border border-slate-200 bg-white px-3 py-2.5 md:mx-0">
              <div className="mb-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="flex min-w-0 items-center gap-1.5 text-left"
                  aria-expanded={showSelectedTourList}
                  onClick={() => setShowSelectedTourList((open) => !open)}
                >
                  <p className="text-sm font-semibold text-gray-900">
                    Your selected tours ({checkoutLines.length})
                  </p>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${
                      showSelectedTourList ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <button
                  type="button"
                  className="text-xs font-medium text-blue-600 hover:underline"
                  onClick={handleReturnToSelectedTours}
                >
                  Edit list
                </button>
              </div>
              {showSelectedTourList && (
                <ul className="space-y-1.5">
                  {checkoutLines.map((line) => {
                    const isCurrent = line.tourId === tour.tourId;
                    const lineDate = line.dateIso ? new Date(line.dateIso) : null;
                    return (
                      <li key={line.tourId} className="flex items-start justify-between gap-3 text-sm">
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-gray-900">
                            {line.tourName}
                            {isCurrent ? ' · this booking' : ''}
                          </span>
                          <span className="block text-xs text-gray-500">
                            {lineDate && !Number.isNaN(lineDate.getTime())
                              ? lineDate.toLocaleString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })
                              : 'Set a date'}
                            {line.vehicleName ? ` · ${line.vehicleName}` : ''}
                          </span>
                        </span>
                        <span className="shrink-0 font-semibold text-gray-900">
                          {line.price > 0 ? `₹${line.price.toLocaleString('en-IN')}` : '—'}
                        </span>
                      </li>
                    );
                  })}
                  {checkoutAirportTransfers.map((transfer, index) => (
                    <li key={`airport-${index}`} className="flex items-start justify-between gap-3 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-gray-900">
                          {transfer.direction === 'from-airport' ? 'Airport pickup' : 'Airport drop'}
                        </span>
                        <span className="block text-xs text-gray-500">
                          {transfer.placeName || 'Vizag airport transfer'}
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold text-gray-900">
                        {Number(transfer.fare) > 0
                          ? `₹${Number(transfer.fare).toLocaleString('en-IN')}`
                          : checkoutAirportFare > 0
                            ? ''
                            : '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className={`${showSelectedTourList ? 'mt-2 border-t border-slate-100 pt-2' : ''} flex items-center justify-between`}>
                <span className="text-sm font-semibold text-gray-900">
                  Combined fare · {checkoutLines.filter((line) => line.price > 0).length} tours
                  {checkoutAirportFare > 0 ? ' + airport' : ''}
                </span>
                <span className="text-base font-bold text-blue-600">
                  ₹{(checkoutCombinedTotal + checkoutAirportFare).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}

          
          {/* Edit Module with PDF Export for Super Admin */}
          <div className="mb-4 hidden items-center justify-between gap-4 md:flex">
            <div className="flex-1">
              <TourEditModule
                pickupLocation={pickupLocation.name}
                destinationLocation={
                  checkoutLines.length > 1
                    ? `${checkoutLines.length} selected tours`
                    : tour.tourName
                }
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
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Left Section - Tour Details */}
              <div className="lg:col-span-2 md:space-y-4">
                <div className="hidden md:block">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{tour.category}</Badge>
                    <Badge variant="outline" className="text-xs">{tour.difficulty}</Badge>
                  </div>
                  <h1 className="mb-2 text-xl font-bold text-gray-900 md:text-2xl">{tour.tourName}</h1>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
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

                <div className="overflow-hidden bg-white md:rounded-xl md:border md:border-slate-200 md:shadow-sm">
                  <TourGallery
                    gallery={tour.gallery}
                    tourName={tour.tourName}
                    imageUrl={tour.imageUrl}
                    overlay={(
                      <button
                        type="button"
                        onClick={handleReturnToSelectedTours}
                        className="absolute left-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md md:hidden"
                        aria-label={checkoutLines.length > 1 ? 'Back to selected tours' : 'Back to Tours'}
                      >
                        <ArrowLeft className="h-5 w-5 text-slate-800" />
                      </button>
                    )}
                  />
                </div>

                <div className="relative z-10 -mt-12 rounded-t-3xl bg-white px-5 pb-2 pt-8 shadow-xl md:mt-0 md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:shadow-none">
                  <div className="md:hidden">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{tour.category}</Badge>
                      <Badge variant="outline" className="text-xs">{tour.difficulty}</Badge>
                    </div>
                    <h1 className="text-2xl font-bold leading-tight text-slate-900">{tour.tourName}</h1>
                    <div className="mt-3 flex flex-nowrap items-center gap-3 overflow-x-auto text-sm text-slate-600 [&::-webkit-scrollbar]:hidden">
                      <span className="inline-flex shrink-0 items-center gap-1.5">
                        <MapPin className="h-4 w-4 shrink-0 text-slate-500" />
                        {tour.distance} km
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1.5">
                        <Calendar className="h-4 w-4 shrink-0 text-slate-500" />
                        {tour.days} day{tour.days > 1 ? 's' : ''}
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1.5">
                        <Clock className="h-4 w-4 shrink-0 text-slate-500" />
                        {tour.timeDuration && tour.timeDuration.trim() !== '' ? tour.timeDuration : 'Full Day'}
                      </span>
                    </div>
                  </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-5 md:mt-0">
                  <TabsList className="h-auto w-full justify-start gap-6 overflow-x-auto rounded-none border-b border-slate-200 bg-transparent p-0 md:h-10 md:w-auto md:justify-center md:gap-0 md:overflow-visible md:rounded-md md:border-0 md:bg-muted md:p-1">
                    <TabsTrigger
                      value="overview"
                      className="shrink-0 rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 text-sm shadow-none data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none md:rounded-sm md:border-b-0 md:px-3 md:pb-1.5 md:data-[state=active]:bg-background md:data-[state=active]:text-foreground md:data-[state=active]:shadow-sm"
                    >
                      Overview
                    </TabsTrigger>
                    <TabsTrigger
                      value="itinerary"
                      className="shrink-0 rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 text-sm shadow-none data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none md:rounded-sm md:border-b-0 md:px-3 md:pb-1.5 md:data-[state=active]:bg-background md:data-[state=active]:text-foreground md:data-[state=active]:shadow-sm"
                    >
                      Itinerary
                    </TabsTrigger>
                    <TabsTrigger
                      value="inclusions"
                      className="shrink-0 rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 text-sm shadow-none data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none md:rounded-sm md:border-b-0 md:px-3 md:pb-1.5 md:data-[state=active]:bg-background md:data-[state=active]:text-foreground md:data-[state=active]:shadow-sm"
                    >
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
              </div>

              {/* Right Section - Vehicle Selection & Booking */}
              <div className="space-y-4 px-4 md:px-0">
                {!selectedVehicle ? (
                  <>
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
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleAddToBook}
                    >
                      Add to book
                    </Button>
                  </>
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
                      distance={payableDistance}
                      totalPrice={payableTotal}
                      tripType="tour"
                      tripMode={tripMode}
                      hourlyPackage="tour"
                      tourLines={checkoutLines}
                      breakdown={{
                        basePrice: payableTotal,
                        driverAllowance: 0,
                        nightCharges: 0,
                        extraDistanceFare: 0,
                      }}
                      onEditPickupLocation={handleEditPickupLocation}
                      onEditPickupDate={handleEditPickupDate}
                      pickupEditor={pickupEditor}
                      dateEditor={dateEditor}
                    />
                    <div className="mt-3 mb-2 flex min-w-0 flex-col gap-2 sm:flex-row">
                      <Button
                        variant="outline"
                        className="min-w-0 flex-1"
                        onClick={() => setSelectedVehicle(null)}
                      >
                        ← Back to Vehicles
                      </Button>
                      <Button
                        variant="outline"
                        className="min-w-0 flex-1"
                        onClick={handleAddToBook}
                      >
                        Add to book
                      </Button>
                      <Button
                        className="min-w-0 flex-1"
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
            <div className="grid gap-6 px-4 md:grid-cols-2 md:px-0">
              <div>
                <GuestDetailsForm
                  onSubmit={handleBookingSubmit}
                  // Pass computed price
                  totalPrice={payableTotal}
                  isLoading={isSubmitting}
                  onBack={() => {
                    if (checkoutLines.length > 1) {
                      handleReturnToSelectedTours();
                      return;
                    }
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
                {checkoutLines.length > 1 && (
                  <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      All selected tours
                    </p>
                    <p className="mt-1 text-lg font-bold text-blue-600">
                      ₹{checkoutCombinedTotal.toLocaleString('en-IN')}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Part pay and full pay use this combined fare for all {checkoutLines.length} tours.
                    </p>
                  </div>
                )}
                {selectedVehicle && (
                  <BookingSummary
                    pickupLocation={pickupLocation}
                    dropLocation={tripMode === 'round-trip' ? pickupLocation : null}
                    pickupDate={pickupDate}
                    selectedCab={vehicleWithPricingToCabType(selectedVehicle)}
                    distance={payableDistance}
                    totalPrice={payableTotal}
                    tripType="tour"
                    tripMode={tripMode}
                    hourlyPackage="tour"
                    tourLines={checkoutLines}
                    breakdown={{
                      basePrice: payableTotal,
                      driverAllowance: 0,
                      nightCharges: 0,
                      extraDistanceFare: 0,
                    }}
                    onEditPickupLocation={handleEditPickupLocation}
                    onEditPickupDate={handleEditPickupDate}
                    pickupEditor={pickupEditor}
                    dateEditor={dateEditor}
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
