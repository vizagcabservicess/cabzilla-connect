import { Booking } from '@/types/api';
import { formatLocationForDisplay } from '@/utils/locationUtils';
import {
  normalizeTripTypeForConfirmation,
  resolveLocalHoursKmFromHourlyPackageField,
} from '@/utils/localPackageLimitsForConfirmation';
import {
  coalesceTourInclusionsExclusions,
  coalesceTourItinerary,
  formatTourItineraryForWhatsApp,
  isTourBooking,
  resolveTourDurationForConfirmation,
} from '@/utils/tourConfirmationHelpers';
import { parseSeatsFromVehicleLabel } from '@/utils/enrichBookingForWhatsApp';
import { computeOutstationRoundTripIncludedKm } from '@/utils/outstationRoundTripLimits';

/** True if we should show this value in customer-facing messages (omit N/A clutter). */
function isPresentableValue(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  const s = String(v).trim().toLowerCase();
  return s !== '' && s !== 'n/a' && s !== 'na' && s !== 'null' && s !== 'undefined';
}

/**
 * Upper km bound for flat airport tier before per-km surcharge — matches `calculateAirportFare` buckets
 * (≤10, ≤20, ≤30, ≤40 km tiers; linear extra above 40 km).
 */
function airportBeyondKmThresholdForTrip(tripKmRounded: number): number {
  const d = Math.max(0, Math.round(Number(tripKmRounded) || 0));
  if (d <= 0) return 40;
  if (d > 40) return 40;
  if (d <= 10) return 10;
  if (d <= 20) return 20;
  if (d <= 30) return 30;
  return 40;
}

function stringifyOptionalNum(v: unknown): string {
  if (v === null || v === undefined) return '';
  const n = Number(v);
  if (Number.isFinite(n) && n >= 0) return String(Math.round(n));
  const s = String(v).trim();
  return s;
}

function resolveOneWayDistanceKm(booking: Booking): number {
  const raw = Number((booking as Booking & Record<string, unknown>).distance ?? booking.distance ?? 0);
  if (Number.isFinite(raw) && raw > 0) {
    return Math.round(raw);
  }

  const isRoundTrip =
    booking.trip_mode === 'round-trip' || booking.tripMode === 'round-trip';
  const kmi = Number(
    (booking as Booking & Record<string, unknown>).km_included ??
      booking.kmIncluded ??
      0
  );
  if (isRoundTrip && Number.isFinite(kmi) && kmi > 0) {
    return Math.round(kmi / 2);
  }

  return 0;
}

function resolveOutstationKmIncluded(
  booking: Booking,
  oneWayDistance: number,
  isRoundTrip: boolean
): string {
  const kmiRaw =
    (booking as Booking & Record<string, unknown>).km_included ?? booking.kmIncluded;
  const kmi = Number(kmiRaw);

  if (isRoundTrip) {
    if (Number.isFinite(kmi) && kmi > 0) {
      return String(Math.round(kmi));
    }
    const pickup = booking.pickup_date ?? booking.pickupDate;
    const returnDate =
      booking.return_date ?? (booking as Booking & { returnDate?: string }).returnDate;
    if (pickup) {
      return String(computeOutstationRoundTripIncludedKm(pickup, returnDate));
    }
    if (oneWayDistance > 0) {
      return String(oneWayDistance * 2);
    }
    return 'N/A';
  }

  if (Number.isFinite(kmi) && kmi > 0) {
    return String(Math.round(kmi));
  }
  return '0';
}

export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If it starts with country code (91 for India), use as is
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return cleaned;
  }
  
  // If it's a 10-digit number, add country code
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  
  return cleaned;
}

export function generateBookingConfirmationMessage(booking: Booking): string {
  
  const passengerName = booking.passengerName || booking.guest_name || 'Customer';
  const passengerPhone = booking.passengerPhone || booking.guest_phone || 'N/A';
  
  const passengerCountryCode = booking.passengerCountryCode || 
                               (booking as any).passengerCountryCode || 
                               (booking as any).passenger_country_code || 
                               '+91';
  const pickupLocation = typeof booking.pickup_location === 'string' 
    ? booking.pickup_location 
    : booking.pickup_location?.city || booking.pickupLocation || 'Unknown';

  // Get trip type and tour information early, as we'll need them for drop location
  let tripType = booking.tripType || booking.trip_type || '';
  const tripMode = booking.tripMode || booking.trip_mode || 'one-way';
  const tourId = booking.tour_id || booking.tourId;
  let tourName =
    booking.tour_name ||
    booking.tourName ||
    (booking as any).tour_title ||
    (booking as any).package_name ||
    '';
  
  // Smart fallback: If trip type is not set, try to infer it from the data
  if (!tripType || tripType === '') {
    if (tourId || tourName) {
      tripType = 'tour';
    } else if ((booking as any).hourlyPackage || (booking as any).hourly_package) {
      tripType = 'local';
    } else {
      // Check if it's an airport transfer or outstation
      const hasAirportInPickup = pickupLocation.toLowerCase().includes('airport');
      const dropLocationStr = booking.drop_location 
        ? (typeof booking.drop_location === 'string' ? booking.drop_location : booking.drop_location?.city || '')
        : '';
      const hasAirportInDrop = dropLocationStr.toLowerCase().includes('airport');
      
      // Extract cities from pickup and drop locations
      const pickupCity = pickupLocation.split(',')[0].trim().toLowerCase();
      const dropCity = dropLocationStr.split(',')[0].trim().toLowerCase();
      
      // For your specific case: Visakhapatnam -> Gopalpur (different cities)
      // This should always be outstation, not airport transfer
      
      // Airport transfer: Only if both locations are in the same city AND one involves airport
      // Examples: "Mumbai Airport" -> "Mumbai City" = Airport Transfer
      // Examples: "Visakhapatnam Airport" -> "Gopalpur Port" = Outstation (different cities)
      
      // More explicit logic: Check if cities are different
      const isSameCity = pickupCity === dropCity || 
                        pickupCity.includes(dropCity.split(' ')[0]) || 
                        dropCity.includes(pickupCity.split(' ')[0]);
      const isInterCityTrip = !isSameCity;
      
      
      if (isInterCityTrip) {
        // Different cities = always outstation
        tripType = 'outstation';
      } else if ((hasAirportInPickup || hasAirportInDrop)) {
        // Same city + airport involved = airport transfer
        tripType = 'airport';
      } else {
        // Same city, no airport = local (but this shouldn't happen in this context)
        tripType = 'outstation';
      }
    }
  }
  
  // Final fallback and safety check
  if (!tripType) {
    tripType = 'Unknown';
  }
  
  // Safety check: If we somehow got "airport" for inter-city trips, force it to "outstation"
  if (tripType === 'airport' && pickupLocation && booking.drop_location) {
    const pickupCity = pickupLocation.split(',')[0].trim().toLowerCase();
    const dropCity = String(booking.drop_location).split(',')[0].trim().toLowerCase();
    if (pickupCity !== dropCity && !pickupCity.includes(dropCity.split(' ')[0]) && !dropCity.includes(pickupCity.split(' ')[0])) {
      tripType = 'outstation';
    }
  }

  // API may send "Local", "Local City Ride", or outstation for airport + hourly rental; hourly_package wins
  tripType = normalizeTripTypeForConfirmation(tripType === 'Unknown' ? '' : tripType, booking);
  if (!tripType || tripType === '') {
    tripType = 'Unknown';
  }

  // For tour bookings, use tour name as destination
  let dropLocation = booking.drop_location 
    ? typeof booking.drop_location === 'string' 
      ? booking.drop_location 
      : booking.drop_location?.city || booking.dropLocation
    : booking.dropLocation || 'N/A';
  
  // If it's a tour booking, override the drop location with tour name
  if ((tripType === 'tour' || tourId) && tourName) {
    dropLocation = tourName;
  } else if (tripType === 'tour' && !tourName && dropLocation && pickupLocation) {
    const p0 = pickupLocation.split(',')[0].trim().toLowerCase();
    const d0 =
      typeof dropLocation === 'string'
        ? dropLocation.split(',')[0].trim().toLowerCase()
        : '';
    if (
      d0 &&
      d0 !== p0 &&
      (d0.includes('tour') ||
        d0.includes('araku') ||
        d0.includes('lambasingi') ||
        d0.includes('vanajangi') ||
        d0.includes('city'))
    ) {
      tourName = typeof dropLocation === 'string' ? dropLocation.split(',')[0].trim() : tourName;
      dropLocation = tourName;
    }
  }

  // Format pickup date and time
  const pickupDateTime = booking.pickup_date || booking.pickupDate;
  const formattedDateTime = pickupDateTime ? new Date(pickupDateTime).toLocaleString('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }) : 'N/A';
  
  // Determine trip type display with trip mode
  let tripTypeDisplay = tripType;
  if (tripType === 'local') {
    // Label updated after package hours/km are resolved (hourly rental ≠ one-way outstation)
    tripTypeDisplay = 'Local hourly rental';
  } else if (tripType === 'tour' || tourId) {
    const modeDisplay = tripMode === 'round-trip' ? 'round trip' : 'one-way';
    const tn = tourName || 'Tour package';
    tripTypeDisplay = `Tour: ${tn} (${modeDisplay})`;
  } else if (tripType === 'outstation') {
    // For outstation, include the trip mode (One Way or Round Trip)
    const modeDisplay = tripMode === 'round-trip' ? 'Round Trip' : 'One Way';
    tripTypeDisplay = `Outstation - ${modeDisplay}`;
  } else if (tripType === 'airport') {
    // For airport transfers, include the trip mode (One Way or Round Trip)
    const modeDisplay = tripMode === 'round-trip' ? 'Round Trip' : 'One Way';
    tripTypeDisplay = `Airport Transfer - ${modeDisplay}`;
  } else if (tripType !== 'Unknown') {
    // Capitalize first letter for other trip types
    tripTypeDisplay = tripType.charAt(0).toUpperCase() + tripType.slice(1);
  }

  // Get vehicle details with specifications
  const vehicleModel = booking.vehicle_type || booking.cabType || 'To be assigned';
  const vehicleRegNo = booking.vehicleNumber || 'to be shared';
  

  // Get vehicle specifications from booking data - check multiple possible field names
  const veh = (booking as any).vehicle;
  let vehicleCapacity =
    (booking as any).vehicleCapacity ??
    (booking as any).capacity ??
    (booking as any).vehicle_capacity ??
    (booking as any).seating_capacity ??
    (booking as any).max_passengers ??
    (booking as any).maxPassengers ??
    (booking as any).passenger_capacity ??
    (booking as any).vehicle_seats ??
    (veh && typeof veh === 'object' ? veh.capacity ?? veh.seating_capacity : undefined) ??
    'N/A';
  let vehicleLuggage = (booking as any).vehicleLuggage || 
                      (booking as any).luggageCapacity || 
                      (booking as any).vehicle_luggage ||
                      (booking as any).luggage_capacity ||
                      'N/A';
  let vehicleFuelType = (booking as any).vehicleFuelType || 
                       (booking as any).fuelType || 
                       (booking as any).vehicle_fuel_type ||
                       (booking as any).fuel_type ||
                       'N/A';
  let vehicleFeatures = (booking as any).vehicleFeatures || 
                       (booking as any).amenities || 
                       (booking as any).features ||
                       (booking as any).vehicle_features ||
                       (booking as any).vehicle_amenities ||
                       [];

  // If vehicle specifications are not available in booking data, provide defaults based on vehicle type
  const parsedSeatsFromLabel = parseSeatsFromVehicleLabel(vehicleModel);
  if (parsedSeatsFromLabel && (vehicleCapacity === 'N/A' || !String(vehicleCapacity).trim())) {
    vehicleCapacity = String(parsedSeatsFromLabel);
  }

  if (vehicleCapacity === 'N/A' && vehicleModel !== 'To be assigned') {
    // Provide default specifications based on vehicle type
    const vehicleType = vehicleModel.toLowerCase();
    
    if (vehicleType.includes('urbania')) {
      if (parsedSeatsFromLabel) {
        vehicleCapacity = String(parsedSeatsFromLabel);
      }
      vehicleLuggage = vehicleLuggage === 'N/A' ? '6' : vehicleLuggage;
      vehicleFuelType = vehicleFuelType === 'N/A' ? 'Diesel' : vehicleFuelType;
      vehicleFeatures = vehicleFeatures.length ? vehicleFeatures : ['AC', 'Music System', 'Spacious'];
    } else if (vehicleType.includes('swift') || vehicleType.includes('dzire')) {
      vehicleCapacity = '4';
      vehicleLuggage = '3';
      vehicleFuelType = 'Petrol';
      vehicleFeatures = ['AC', 'Music System', 'Charging Point'];
    } else if (vehicleType.includes('innova') || vehicleType.includes('crysta')) {
      vehicleCapacity = '7';
      vehicleLuggage = '4';
      vehicleFuelType = 'Petrol';
      vehicleFeatures = ['AC', 'Music System', 'Charging Point', 'Spacious'];
    } else if (vehicleType.includes('ertiga')) {
      vehicleCapacity = '7';
      vehicleLuggage = '4';
      vehicleFuelType = 'Petrol';
      vehicleFeatures = ['AC', 'Music System', 'Charging Point'];
    } else if (vehicleType.includes('wagon') || vehicleType.includes('r')) {
      vehicleCapacity = '7';
      vehicleLuggage = '4';
      vehicleFuelType = 'Petrol';
      vehicleFeatures = ['AC', 'Music System', 'Charging Point'];
    } else if (vehicleType.includes('tempo') || vehicleType.includes('traveller')) {
      /* Capacity varies by variant; do not invent a number (see capacity line below). */
    } else {
      // Default specifications for unknown vehicles
      vehicleCapacity = '4';
      vehicleLuggage = '2';
      vehicleFuelType = 'Petrol';
      vehicleFeatures = ['AC', 'Music System'];
    }
  }

  if (vehicleModel !== 'To be assigned') {
    const vm = vehicleModel.toLowerCase();
    if (vm.includes('tempo') || vm.includes('traveller')) {
      const n = Number(vehicleCapacity);
      if (/\b17\b|17\s*-?\s*seater|seventeen/i.test(vehicleModel)) {
        if (!Number.isFinite(n) || n < 17) vehicleCapacity = '17';
      } else if (/\b15\b|\b16\b/i.test(vehicleModel)) {
        if (!Number.isFinite(n) || n < 15) vehicleCapacity = '15';
      } else if (/\b14\b|14\s*-?\s*seater/i.test(vehicleModel)) {
        if (!Number.isFinite(n) || n < 14) vehicleCapacity = '14';
      } else if (/\b12\b|12\s*-?\s*seater/i.test(vehicleModel)) {
        if (!Number.isFinite(n) || n < 12) vehicleCapacity = '12';
      } else if (/\b9\b|10\b|11\b/.test(vehicleModel) && Number.isFinite(n) && n < 9) {
        const m = vehicleModel.match(/\b(9|10|11)\b/);
        if (m) vehicleCapacity = m[1];
      }
    }
  }

  const vmForCap = vehicleModel.toLowerCase();
  if (vmForCap.includes('urbania') && Number(vehicleCapacity) === 7) {
    vehicleCapacity = parsedSeatsFromLabel ? String(parsedSeatsFromLabel) : 'N/A';
  }
  const isTempoVehicle =
    vmForCap.includes('tempo') || vmForCap.includes('traveller') || vmForCap.includes('urbania');
  const capNum = Number(vehicleCapacity);
  const tempoLabelSpecifies7 =
    /\b7\s*-?\s*seater\b/i.test(vehicleModel) ||
    /\b7\s*\+\s*1\b/i.test(vehicleModel) ||
    /\bmini\s*tempo\b/i.test(vehicleModel) ||
    /\bforce\b/i.test(vehicleModel);
  const capacityLooksLikeSedanLeak =
    vehicleCapacity === '4' ||
    (isTempoVehicle && Number.isFinite(capNum) && capNum > 0 && capNum <= 6);
  /** Innova-class "7" often copied onto generic Tempo Traveller rows. */
  const capacityLooksLikeMpvLeakOnTempo =
    isTempoVehicle &&
    Number.isFinite(capNum) &&
    capNum === 7 &&
    !tempoLabelSpecifies7;
  const capacityLine = (() => {
    if (vehicleModel === 'To be assigned') {
      return '👥 *Capacity:* To be confirmed';
    }
    if (
      isTempoVehicle &&
      (vehicleCapacity === 'N/A' ||
        !String(vehicleCapacity).trim() ||
        capacityLooksLikeSedanLeak ||
        capacityLooksLikeMpvLeakOnTempo)
    ) {
      return '👥 *Capacity:* Depends on the booked Tempo variant (typically about 9–17 seats). Reply to this chat or call +91 9966363662 for the exact seating for your vehicle.';
    }
    if (vehicleCapacity === 'N/A' || !String(vehicleCapacity).trim()) {
      return '👥 *Capacity:* As per assigned vehicle';
    }
    return `👥 *Capacity:* ${vehicleCapacity} passengers`;
  })();

  const vehicleFeaturesText = Array.isArray(vehicleFeatures) ? vehicleFeatures.join(', ') : vehicleFeatures || 'AC, Music System';

  // Get driver details
  const driverName = booking.driverName || 'to be shared';
  const driverPhone = booking.driverPhone || 'to be shared';

  // Get fare details - using actual database fields
  const fareBase = booking.fare || booking.totalAmount || 0;
  const advanceAmount = booking.advance_paid_amount || 0;
  const advanceMode = booking.payment_method || 'N/A';
  const advanceTxnId = booking.razorpay_payment_id || 
                      (booking as any).razorpayPaymentId || 
                      (booking as any).transactionId || 
                      (booking as any).paymentId || 
                      'Payment completed via Razorpay';
  const paymentTime = booking.payment_timestamp || 
                     (booking as any).paymentTimestamp || 
                     (booking as any).paymentTime;
  
  const advanceDateTime = paymentTime
    ? new Date(paymentTime).toLocaleString('en-IN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    : booking.created_at 
      ? new Date(booking.created_at).toLocaleString('en-IN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      : 'Payment time not recorded';
  const pendingAmount = Math.max(0, fareBase - advanceAmount);
  const pendingDue = pendingAmount > 0 ? 'Yes' : 'No';

  // Get package details for local trips — prefer hourlyPackage id / DB fields; fare inference is last resort
  let hoursIncluded: string | number = tripType === 'local' ? '' : 'N/A';
  let kmIncluded: string | number = tripType === 'local' ? '' : 'N/A';
  let extraPerHour = tripType === 'local' ? (booking.extra_per_hour || (booking as any).extraPerHour) : 'N/A';
  let extraPerKm = tripType === 'local' ? (booking.extra_per_km || (booking as any).extraPerKm) : 'N/A';

  if (tripType === 'local') {
    const fromPkg = resolveLocalHoursKmFromHourlyPackageField(booking);
    if (fromPkg) {
      hoursIncluded = fromPkg.hours;
      kmIncluded = fromPkg.km;
    } else {
      const hi = booking.hours_included ?? (booking as any).hoursIncluded;
      const ki = booking.km_included ?? (booking as any).kmIncluded;
      hoursIncluded = hi != null && Number(hi) > 0 ? String(Math.round(Number(hi))) : '';
      kmIncluded = ki != null && Number(ki) > 0 ? String(Math.round(Number(ki))) : '';
    }
    const fareSanity = parseFloat(fareBase.toString());
    const vt0 = vehicleModel.toLowerCase();
    if (
      vt0.includes('innova') &&
      fareSanity >= 2800 &&
      fareSanity <= 4000 &&
      String(hoursIncluded) === '10' &&
      String(kmIncluded) === '100' &&
      !fromPkg
    ) {
      hoursIncluded = '8';
      kmIncluded = '80';
    }
  }

  // Smart inference for local trips only when hours/km or extra rates still missing (avoid wrong tier at ₹4k boundary)
  if (tripType === 'local' && (!hoursIncluded || !kmIncluded || !extraPerHour || !extraPerKm)) {
    const vehicleType = vehicleModel.toLowerCase();
    const fare = parseFloat(fareBase.toString());

    if (vehicleType.includes('innova')) {
      if (fare > 4000 && fare <= 5500) {
        hoursIncluded = hoursIncluded || '10';
        kmIncluded = kmIncluded || '100';
        extraPerHour = extraPerHour || '450';
        extraPerKm = extraPerKm || '20';
      } else if (fare >= 2800 && fare <= 4000) {
        hoursIncluded = hoursIncluded || '8';
        kmIncluded = kmIncluded || '80';
        extraPerHour = extraPerHour || '450';
        extraPerKm = extraPerKm || '20';
      }
    } else if (vehicleType.includes('ertiga')) {
      if (fare > 3500 && fare <= 4800) {
        hoursIncluded = hoursIncluded || '10';
        kmIncluded = kmIncluded || '100';
        extraPerHour = extraPerHour || '400';
        extraPerKm = extraPerKm || '18';
      } else if (fare >= 2400 && fare <= 3500) {
        hoursIncluded = hoursIncluded || '8';
        kmIncluded = kmIncluded || '80';
        extraPerHour = extraPerHour || '400';
        extraPerKm = extraPerKm || '18';
      }
    } else if (vehicleType.includes('tempo') || vehicleType.includes('traveller')) {
      if (fare > 7500 && fare <= 9200) {
        hoursIncluded = hoursIncluded || '10';
        kmIncluded = kmIncluded || '100';
        extraPerHour = extraPerHour || '850';
        extraPerKm = extraPerKm || '35';
      } else if (fare >= 5800 && fare <= 7500) {
        hoursIncluded = hoursIncluded || '8';
        kmIncluded = kmIncluded || '80';
        extraPerHour = extraPerHour || '850';
        extraPerKm = extraPerKm || '35';
      }
    } else {
      // Sedan (Swift/Dzire/Amaze/Glanza)
      if (fare > 3000 && fare <= 3600) {
        hoursIncluded = hoursIncluded || '10';
        kmIncluded = kmIncluded || '100';
        extraPerHour = extraPerHour || '300';
        extraPerKm = extraPerKm || '14';
      } else if (fare >= 1800 && fare <= 3000) {
        hoursIncluded = hoursIncluded || '8';
        kmIncluded = kmIncluded || '80';
        extraPerHour = extraPerHour || '300';
        extraPerKm = extraPerKm || '14';
      }
    }

    // Final fallback to defaults
      if (!hoursIncluded) {
        hoursIncluded = '8';
      }
      if (!kmIncluded) {
        kmIncluded = '80';
      }
      if (!extraPerHour || extraPerHour === 'N/A') {
        extraPerHour = '100';
      }
      if (!extraPerKm || extraPerKm === 'N/A') {
        extraPerKm = '12';
      }
  }

  if (tripType === 'local' && hoursIncluded && kmIncluded) {
    tripTypeDisplay = `Local hourly rental — ${hoursIncluded} hrs / ${kmIncluded} km`;
  }

  // Get billing details
  const billingBasis = 'Per trip'; // Default billing basis
  const waitingChargePerHour = booking.waiting_charge_per_hour || 'N/A';
  const graceMinutes = booking.grace_minutes || 'N/A';
  const nightWindow = booking.night_window || 'N/A';
  const nightChargeRate = booking.night_charge_rate || 'N/A';

  // Get route and notes
  const viaStops = booking.via_stops || 'N/A';
  const specialNotes = booking.special_notes || booking.adminNotes || 'N/A';
  
  const additionalRequirements = booking.additionalRequirements || 
                                 booking.additional_requirements || 
                                 '';
  
  // Ensure additional requirements are properly handled
  const hasAdditionalRequirements = additionalRequirements && 
                                   additionalRequirements.trim() !== '' && 
                                   additionalRequirements !== 'N/A' && 
                                   additionalRequirements !== 'null' &&
                                   additionalRequirements !== 'undefined';
  
  
  // Combine only special notes (additional requirements are shown separately in Trip Details)
  const allNotes = specialNotes !== 'N/A' ? `Special Notes: ${specialNotes}` : '';

  // Get policies - Different policies for tours vs regular trips
  const isTour = tripType === 'tour' || tripType === 'outstation';
  
  const cancellationPolicy = booking.cancellation_policy || (isTour 
    ? '30+ days: 100% refund. 16-30 days: 25% deduction. 7-15 days: 50% deduction. 2-6 days: 75% deduction. 1-48 hours: No refund. After driver details shared: No refund'
    : 'Cancellations within 4 hours of pickup: No refund. Between 4-24 hours: Cancellation charges apply, balance refunded within 21 days'
  );
  
  const noShowPolicy = booking.no_show_policy || (isTour 
    ? 'No refund after driver/vendor details are shared'
    : 'No-show if cancelled within 4 hours of pickup time'
  );
  
  const invoiceMode = booking.invoice_mode || 'Digital receipt provided';

  // Get support details - Updated with correct numbers
  const driverHelpline = booking.driver_helpline || '+91 9966363662';
  const customerSupport = booking.customer_support || '+91 9966363662';

  // Generate secure payment receipt link - provide contact information instead of direct access
  const receiptUrl = `${window.location.origin}/contact?receipt_request=true`;

  // Get inclusions and exclusions - handle both array and string formats
  let inclusions = booking.inclusions 
    ? Array.isArray(booking.inclusions) 
      ? booking.inclusions.join(', ') 
      : booking.inclusions
    : null;
  let exclusions = booking.exclusions 
    ? Array.isArray(booking.exclusions) 
      ? booking.exclusions.join(', ') 
      : booking.exclusions
    : null;

  const tourBookingForLists = isTourBooking(tripType, tourId, booking);
  if (tourBookingForLists) {
    const ti = coalesceTourInclusionsExclusions(booking, 'inclusions');
    const te = coalesceTourInclusionsExclusions(booking, 'exclusions');
    if (ti.length) {
      inclusions = ti.join('; ');
    }
    if (te.length) {
      exclusions = te.join('; ');
    }
  }

  // If no specific inclusions/exclusions found, provide defaults based on vehicle type
  if (!inclusions || inclusions === 'Standard inclusions apply') {
    const vehicleType = vehicleModel.toLowerCase();
    if (vehicleType.includes('swift') || vehicleType.includes('dzire') || 
        vehicleType.includes('innova') || vehicleType.includes('crysta') ||
        vehicleType.includes('ertiga') || vehicleType.includes('wagon')) {
      inclusions = 'Driver, Car, AC, Fuel';
    } else {
      inclusions = 'Driver, Car, AC, Fuel';
    }
  }

  if (!exclusions || exclusions === 'Standard exclusions apply') {
    exclusions = 'Toll gates, Parking fees, Entry fees, State and Route Permits (If applicable), During standby and ghat roads the A/C will be turned off';
  }

  // Get GST details
  const gstEnabled = booking.gstEnabled || (booking as any).gst_enabled || false;
  const gstDetails = booking.gstDetails || (booking as any).gst_details;
  const gstNumber = gstDetails?.gstNumber || gstDetails?.gst_number || 'N/A';
  const companyName = gstDetails?.companyName || gstDetails?.company_name || 'N/A';

  // Get return date for round-trip - check multiple possible field names
  const returnDate = booking.return_date || (booking as any).returnDate;
  
  const formattedReturnDate = returnDate ? new Date(returnDate).toLocaleString('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }) : 'N/A';
  

  // Calculate distance for round-trip (double the one-way distance); prefer saved booking km
  const oneWayDistance = resolveOneWayDistanceKm(booking);
  const isRoundTrip = booking.trip_mode === 'round-trip' || booking.tripMode === 'round-trip';
  const totalDistance = isRoundTrip ? oneWayDistance * 2 : oneWayDistance;

  // Get outstation and airport extra charges
  let outstationExtraKm = 'N/A';
  let outstationExtraHour = 'N/A';
  let outstationKmIncluded = 'N/A';
  
  if (tripType === 'outstation') {
    // Get extra charges from booking data (enriched from vehicle/outstation fare catalog when missing)
    const rawExtraKm =
      booking.extra_per_km ??
      (booking as any).extraPerKm ??
      (booking as any).price_per_km ??
      (booking as any).pricePerKm;
    outstationExtraKm =
      rawExtraKm !== null && rawExtraKm !== undefined && String(rawExtraKm).trim() !== ''
        ? String(rawExtraKm)
        : 'N/A';
    outstationExtraHour = booking.extra_per_hour || (booking as any).extraPerHour || (booking as any).price_per_hour || 'N/A';
    
    outstationKmIncluded = resolveOutstationKmIncluded(booking, oneWayDistance, isRoundTrip);
    
    // Fallback inference based on vehicle type if not found in booking data
    if (outstationExtraKm === 'N/A') {
      const vehicleType = vehicleModel.toLowerCase();
      if (vehicleType.includes('innova') || vehicleType.includes('crysta')) {
        outstationExtraKm = '20';
        outstationExtraHour = '450';
      } else if (vehicleType.includes('ertiga')) {
        outstationExtraKm = '18';
        outstationExtraHour = '400';
      } else if (vehicleType.includes('urbania')) {
        outstationExtraKm = '40';
        outstationExtraHour = '850';
      } else if (vehicleType.includes('tempo') || vehicleType.includes('traveller')) {
        outstationExtraKm = '35';
        outstationExtraHour = '850';
      } else if (vehicleType.includes('swift') || vehicleType.includes('dzire') || vehicleType.includes('amaze') || vehicleType.includes('glanza')) {
        // Sedan (Swift/Dzire/Amaze/Glanza)
        outstationExtraKm = '14';
        outstationExtraHour = '300';
      } else {
        // Default fallback
        outstationExtraKm = '14';
        outstationExtraHour = '300';
      }
    }
  }
  
  // Airport: guest-facing trip km = booking.distance; extra rate = saved extra_per_km (admin "Extra KM Charge") when available
  const tripKmRounded = Math.max(0, Math.round(Number(oneWayDistance) || 0));
  let airportExtraKmDisplay = '';
  let beyondKmForAirportExtra = '';
  if (tripType === 'airport') {
    const rawRate =
      booking.extra_per_km ??
      (booking as any).extraPerKm ??
      (booking as any).airport_extra_km_charge ??
      (booking as any).airportExtraKmCharge ??
      (booking as any).extra_km_charge ??
      (booking as any).airportExtraKm ??
      null;

    if (rawRate !== null && rawRate !== undefined && String(rawRate).trim() !== '') {
      airportExtraKmDisplay = stringifyOptionalNum(rawRate) || String(rawRate).trim();
    }

    const kmiRaw =
      booking.km_included ??
      (booking as any).kmIncluded ??
      (booking as any).included_km ??
      (booking as any).includedKm;
    if (kmiRaw !== undefined && kmiRaw !== null && String(kmiRaw).trim() !== '') {
      beyondKmForAirportExtra = stringifyOptionalNum(kmiRaw) || String(kmiRaw).trim();
    } else if (tripKmRounded > 0) {
      beyondKmForAirportExtra = String(airportBeyondKmThresholdForTrip(tripKmRounded));
    } else {
      beyondKmForAirportExtra = '40';
    }

    if (!isPresentableValue(airportExtraKmDisplay)) {
      const vehicleType = vehicleModel.toLowerCase();
      airportExtraKmDisplay = vehicleType.includes('ertiga') ? '18' : '14';
    }
  }

  // Prepare destination display
  let destinationDisplay = dropLocation;
  if (dropLocation === 'N/A' && tripType !== 'tour') {
    destinationDisplay = tripType === 'local' ? 'Local City Ride' : 'As per itinerary';
  }

  const hasWaitingInfo =
    isPresentableValue(waitingChargePerHour) && isPresentableValue(graceMinutes);
  const hasNightInfo =
    isPresentableValue(nightWindow) && isPresentableValue(nightChargeRate);
  const hasViaStops = isPresentableValue(viaStops);

  let billingAndChargesBlock = `*Billing and Charges*
📊 *Basis:* ${billingBasis}`;
  if (hasWaitingInfo) {
    billingAndChargesBlock += `\n⏳ *Waiting:* ₹${waitingChargePerHour} after ${graceMinutes} min grace`;
  }
  if (hasNightInfo) {
    billingAndChargesBlock += `\n🌙 *Night charges:* ${nightWindow} at ₹${nightChargeRate}`;
  }
  if (tripType === 'local') {
    billingAndChargesBlock += `\n📏 *Kilometers limit:* ${kmIncluded} km included, extra charges applicable beyond given kilometers on pro rate basis`;
  }

  let routeAndNotesBlock = '';
  if (hasViaStops || Boolean(allNotes)) {
    routeAndNotesBlock = '*Route and Notes*';
    if (hasViaStops) {
      routeAndNotesBlock += `\n🛣️ *Via/Stops:* ${viaStops}`;
    }
    if (allNotes) {
      routeAndNotesBlock += `\n📝 *Special Notes:*
${allNotes}`;
    }
  }

  const airportChargeLines: string[] = [];
  if (tripType === 'airport') {
    airportChargeLines.push('*Airport Charges*');
    if (tripKmRounded > 0) {
      airportChargeLines.push(
        `🛣️ *Booked trip distance:* ${tripKmRounded} km (same as shown when you booked)`
      );
    }
    if (isPresentableValue(airportExtraKmDisplay) && beyondKmForAirportExtra) {
      airportChargeLines.push(
        `📈 *Extra km charge:* ₹${airportExtraKmDisplay}/km beyond ${beyondKmForAirportExtra} km`
      );
    }
  }
  const airportChargesBlock =
    airportChargeLines.length > 1 ? airportChargeLines.join('\n') : '';

  const tourBooking = tourBookingForLists;
  const itineraryDays = coalesceTourItinerary(booking);
  const itineraryWhatsApp = formatTourItineraryForWhatsApp(itineraryDays);
  const tourRef = String(tourId || booking.tour_id || booking.tourId || '').trim();
  const tourDurationLine = resolveTourDurationForConfirmation(booking);

  return `🚗 *Booking Confirmation - Vizag Taxi Hub*

Hello ${passengerName}!


Your cab booking has been confirmed:

*Trip Details*
📍 *Pickup:* ${pickupLocation}
📍 *Destination:* ${destinationDisplay}
📅 *Pickup date & time:* ${formattedDateTime}
${returnDate ? `📅 *Return date & time:* ${formattedReturnDate}` : ''}
🚗 *Trip type:* ${tripTypeDisplay}
${tripType === 'outstation' ? `📏 *Total distance:* ${totalDistance} km${isRoundTrip ? ' (round-trip)' : ''}` : ''}
${tripType === 'airport' && tripKmRounded > 0 ? `📏 *Trip distance:* ${tripKmRounded} km` : ''}
🚗 *Vehicle:* ${vehicleModel} [${vehicleRegNo}]
${capacityLine}
👨‍💼 *Driver:* ${driverName}, ${driverPhone}
📞 *Guest contact:* ${passengerName}, ${passengerCountryCode} ${passengerPhone}
${hasAdditionalRequirements ? `✈️ *Additional Requirements:* ${additionalRequirements}` : ''}
${tourBooking ? `

*Your tour package*
📦 *Tour:* ${tourName || 'Tour package'}
🆔 *Tour reference:* ${tourRef || '—'}
${tourDurationLine ? `📆 *Duration:* ${tourDurationLine}
` : ''}${oneWayDistance > 0 ? `🛣️ *Approx. distance:* ${Math.round(oneWayDistance)} km
` : ''}
${itineraryWhatsApp ? `*Day-by-day itinerary*
${itineraryWhatsApp}
` : `*Day-by-day itinerary*
📋 Full day-wise plan was not included in this message. Contact +91 9966363662 with booking # *${booking.bookingNumber || booking.id}* for the complete itinerary for *${tourName || 'your tour'}*.
`}` : ''}

*Fare and Payments*
💰 *Fare (base):* ₹${fareBase}
💳 *Advance:* ₹${advanceAmount}, mode: ${advanceMode}
⏳ *Pending:* ₹${pendingAmount}, payable: ${pendingDue}
${gstEnabled && isPresentableValue(gstNumber) ? `🏢 *GST Details:* ${gstNumber}${isPresentableValue(companyName) ? ` (${companyName})` : ''}` : ''}
🧾 *Payment Receipt:* Contact support at +91 9966363662 with your booking number ${booking.bookingNumber || booking.id} to get your receipt

${tourBooking ? `*Tour inclusions & exclusions* (this booking)
📋 *Inclusions:* ${inclusions}
❌ *Exclusions:* ${exclusions}` : `*Trip Inclusions & Exclusions*
📋 *Inclusions:* ${inclusions}
❌ *Exclusions:* ${exclusions}`}

${tripType === 'local' ? `*Package Limits*
⏰ *Hours included:* ${hoursIncluded}
🛣️ *Kilometers limit:* ${kmIncluded} km
📈 *Extra charges:* ₹${extraPerHour}/hour beyond hours; ₹${extraPerKm}/km beyond km (pro rate basis)` : ''}

${tripType === 'outstation' ? `*Outstation Charges*
🛣️ *Kilometers included:* ${isRoundTrip ? `${outstationKmIncluded} km (round-trip distance)` : outstationKmIncluded === '0' ? '0 km (charges from km 1)' : `${outstationKmIncluded} km`}
📈 *Extra distance:* ₹${outstationExtraKm}/km${isRoundTrip ? '' : ' (charged on double distance i.e., distance × 2)'}
⏱️ *Extra charges:* ₹${outstationExtraHour}/hour${isRoundTrip ? ' (12 hours per day for round-trip)' : ''}
🔧 *Special:* During ghat roads and standby AC will turned off` : ''}

${airportChargesBlock ? `${airportChargesBlock}

` : ''}${billingAndChargesBlock}

${routeAndNotesBlock ? `${routeAndNotesBlock}

` : ''}*Policies*
❌ *Cancellation:* ${cancellationPolicy}
🚫 *No-show:* ${noShowPolicy}
💰 *Refund:* ${isTour ? 'Refunds processed within 21 working days based on cancellation timeframe' : 'Refunds processed within 21 working days'}
🧾 *Invoice/Receipt:* ${invoiceMode}

${(tripType === 'tour' || tourId || (booking as any).tour_id) ? `*Additional Terms & Conditions*
📋 *Important Notes:*
• Prices exclude driver's food, parking fees, and entry fees
• AC will be turned off during ghat roads and while on standby
• Places will be shown based on timing and conditions. We are not responsible for traffic delays or bandhs
• For Katiki Waterfalls, vehicles will go only to the parking lot. Guests need to take jeeps (extra charge)
• During peak season (October to January), will park at Borra Caves or Katiki waterfalls' parking area. Guests need to walk or take an auto at their own expense
• Exceeding the time limit will incur extra charges

` : ''}${tripType === 'outstation' ? `*Terms & Conditions*
📋 *Important Notes:*
• Please provide food for the driver
• The above prices do not include tolls, entry fees, parking fees
• From the garage to the garage, kilometers are calculated
• During standby and ghat roads the A/C will be turned off
• The prices quoted are for today's date and are subject to change
• The prices do not include any taxes or fees

` : ''}

*Support*
📞 *Driver helpline:* +91 9966363662
📞 *Customer support:* +91 9966363662

*Booking #:* ${booking.bookingNumber || booking.id}
${booking.bookingNumber ? `*Internal ID:* ${booking.id}` : ''}

Thank you for choosing Vizag Taxi Hub. Have a safe and comfortable ride! 🙏`;
}

export function generateDriverAssignmentMessage(booking: Booking): string {
  const passengerName = booking.passengerName || booking.guest_name || 'Customer';
  const passengerPhone = booking.passengerPhone || booking.guest_phone || 'N/A';
  const passengerCountryCode = (booking as any).passengerCountryCode || (booking as any).passenger_country_code || '+91';
  const pickupLocation = typeof booking.pickup_location === 'string' 
    ? booking.pickup_location 
    : booking.pickup_location?.city || booking.pickupLocation || 'Unknown';
  const dropLocation = booking.drop_location 
    ? typeof booking.drop_location === 'string' 
      ? booking.drop_location 
      : booking.drop_location?.city || booking.dropLocation
    : 'N/A';
  const additionalRequirements = (booking as any).additionalRequirements || (booking as any).additional_requirements || '';
  const specialNotes = booking.special_notes || booking.adminNotes || 'N/A';
  
  // Ensure additional requirements are properly handled
  const hasAdditionalRequirements = additionalRequirements && 
                                   additionalRequirements.trim() !== '' && 
                                   additionalRequirements !== 'N/A' && 
                                   additionalRequirements !== 'null' &&
                                   additionalRequirements !== 'undefined';
  
  // Combine only special notes (additional requirements are shown separately)
  const allNotes = specialNotes !== 'N/A' ? `Special Notes: ${specialNotes}` : '';

  return `🚗 *Driver Assignment - Vizag Taxi Hub*

Hello ${passengerName}!

Your driver has been assigned:

👨‍💼 *Driver:* ${booking.driverName}
📱 *Phone:* ${booking.driverPhone}
🚗 *Vehicle:* ${booking.vehicleNumber}

👤 *Passenger:* ${passengerName}
📱 *Passenger Phone:* ${passengerCountryCode} ${passengerPhone}

📍 *Pickup:* ${pickupLocation}
📍 *Drop:* ${dropLocation}
📅 *Date:* ${booking.pickup_date || booking.pickupDate}
${hasAdditionalRequirements ? `✈️ *Additional Requirements:* ${additionalRequirements}` : ''}
${allNotes ? `📝 *Special Notes:*
${allNotes}` : ''}

*Booking ID:* ${booking.id}

Your driver will contact you shortly. Safe travels! 🙏`;
}

/** Short reminder for admin-triggered WhatsApp from Upcoming Trips. */
export function generateUpcomingTripReminderMessage(booking: Booking): string {
  const name = booking.passengerName || booking.guest_name || 'Guest';
  const ref = booking.bookingNumber || String(booking.id);
  const pickupLoc = formatLocationForDisplay(booking.pickupLocation ?? booking.pickup_location ?? '').name;
  const dropLoc = formatLocationForDisplay(booking.dropLocation ?? booking.drop_location ?? '').name;
  const raw = booking.pickupDate || booking.pickup_date || '';
  const when = raw
    ? new Date(raw).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '—';
  const tt = booking.tripType || booking.trip_type || 'Trip';
  return `📅 *Trip reminder - Vizag Taxi Hub*

Hello ${name}!

Your booking *#${ref}* is coming up.

📍 *Pickup:* ${pickupLoc}
📍 *Drop:* ${dropLoc}
🕒 *When:* ${when}
🚘 *Type:* ${tt}

Please be ready at the pickup point on time. Need help? Call +91 9966363662.

Thank you for choosing Vizag Taxi Hub! 🙏`;
}

export function generateInvoiceMessage(booking: Booking, invoiceUrl?: string): string {
  const passengerName = booking.passengerName || booking.guest_name || 'Customer';
  const pickupRaw = booking.pickup_date || booking.pickupDate;
  const tripDateStr = pickupRaw
    ? new Date(pickupRaw).toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '—';
  const bookingRef = booking.bookingNumber || String(booking.id);

  return `🧾 *Invoice - Vizag Taxi Hub*

Hello ${passengerName}!

Your invoice is ready:

💰 *Amount:* ₹${booking.fare || booking.totalAmount}
📋 *Booking #:* ${bookingRef}
📅 *Trip date & time:* ${tripDateStr}
${booking.bookingNumber ? `🔢 *Reference ID:* ${booking.id}` : ''}

${invoiceUrl ? `📄 *Download Invoice:* ${invoiceUrl}` : ''}

Thank you for choosing Vizag Taxi Hub! 🙏`;
}

export function generateDriverNotificationMessage(booking: Booking): string {
  const passengerName = booking.passengerName || booking.guest_name || 'Customer';
  const passengerPhone = booking.passengerPhone || booking.guest_phone || 'N/A';
  const passengerCountryCode = (booking as any).passengerCountryCode || (booking as any).passenger_country_code || '+91';
  const pickupLocation = typeof booking.pickup_location === 'string' 
    ? booking.pickup_location 
    : booking.pickup_location?.city || booking.pickupLocation || 'Unknown';
  const dropLocation = booking.drop_location 
    ? typeof booking.drop_location === 'string' 
      ? booking.drop_location 
      : booking.drop_location?.city || booking.dropLocation
    : 'N/A';
  const additionalRequirements = (booking as any).additionalRequirements || (booking as any).additional_requirements || '';
  const specialNotes = booking.special_notes || booking.adminNotes || 'N/A';
  
  // Ensure additional requirements are properly handled
  const hasAdditionalRequirements = additionalRequirements && 
                                   additionalRequirements.trim() !== '' && 
                                   additionalRequirements !== 'N/A' && 
                                   additionalRequirements !== 'null' &&
                                   additionalRequirements !== 'undefined';
  
  // Combine only special notes (additional requirements are shown separately)
  const allNotes = specialNotes !== 'N/A' ? `Special Notes: ${specialNotes}` : '';

  return `🚗 *New Trip Assignment - Vizag Taxi Hub*

You have been assigned a new trip:

👤 *Passenger:* ${passengerName}
📱 *Phone:* ${passengerCountryCode} ${passengerPhone}

📍 *Pickup:* ${pickupLocation}
📍 *Drop:* ${dropLocation}
📅 *Date:* ${booking.pickup_date || booking.pickupDate}
${hasAdditionalRequirements ? `✈️ *Additional Requirements:* ${additionalRequirements}` : ''}
${allNotes ? `📝 *Special Notes:*
${allNotes}` : ''}

💰 *Fare:* ₹${booking.fare || booking.totalAmount}
📋 *Booking ID:* ${booking.id}

Please contact the passenger and proceed to pickup location. Safe driving! 🙏`;
}
