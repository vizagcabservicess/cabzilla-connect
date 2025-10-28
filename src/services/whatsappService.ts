
import { Booking } from '@/types/api';

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
  const tourName = booking.tour_name || booking.tourName;
  
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
  
  // For tour bookings, use tour name as destination
  let dropLocation = booking.drop_location 
    ? typeof booking.drop_location === 'string' 
      ? booking.drop_location 
      : booking.drop_location?.city || booking.dropLocation
    : booking.dropLocation || 'N/A';
  
  // If it's a tour booking, override the drop location with tour name
  if ((tripType === 'tour' || tourId) && tourName) {
    dropLocation = tourName;
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
    // For local trips, include the trip mode (One Way or Round Trip)
    const modeDisplay = tripMode === 'round-trip' ? 'Round Trip' : 'One Way';
    tripTypeDisplay = `Local City Ride - ${modeDisplay}`;
  } else if (tripType === 'tour' || tourId) {
    // For tours, include the trip mode (One Way or Round Trip)
    const modeDisplay = tripMode === 'round-trip' ? 'Round Trip' : 'One Way';
    tripTypeDisplay = `Tour - ${modeDisplay}`;
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
  let vehicleCapacity = (booking as any).vehicleCapacity || 
                       (booking as any).capacity || 
                       (booking as any).vehicle_capacity ||
                       (booking as any).seating_capacity ||
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
  if (vehicleCapacity === 'N/A' && vehicleModel !== 'To be assigned') {
    // Provide default specifications based on vehicle type
    const vehicleType = vehicleModel.toLowerCase();
    
    if (vehicleType.includes('swift') || vehicleType.includes('dzire')) {
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
    } else {
      // Default specifications for unknown vehicles
      vehicleCapacity = '4';
      vehicleLuggage = '2';
      vehicleFuelType = 'Petrol';
      vehicleFeatures = ['AC', 'Music System'];
    }
  }

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

  // Get package details for local trips only - use actual booking data or smart inference
  let hoursIncluded = tripType === 'local' ? (booking.hours_included || (booking as any).hoursIncluded) : 'N/A';
  let kmIncluded = tripType === 'local' ? (booking.km_included || (booking as any).kmIncluded) : 'N/A';
  let extraPerHour = tripType === 'local' ? (booking.extra_per_hour || (booking as any).extraPerHour) : 'N/A';
  let extraPerKm = tripType === 'local' ? (booking.extra_per_km || (booking as any).extraPerKm) : 'N/A';
  
  // Smart inference for local trips based on fare and vehicle type
  if (tripType === 'local' && (!hoursIncluded || !kmIncluded || !extraPerHour || !extraPerKm)) {
    const vehicleType = vehicleModel.toLowerCase();
    const fare = parseFloat(fareBase.toString());
    
    // Infer package based on fare and vehicle type
    if (vehicleType.includes('innova')) {
      if (fare >= 4000 && fare <= 5000) {
        // 10hrs 100km package for Innova Crysta
        hoursIncluded = '10';
        kmIncluded = '100';
        extraPerHour = '450';
        extraPerKm = '20';
      } else if (fare >= 3000 && fare <= 4000) {
        // 8hrs 80km package for Innova Crysta
        hoursIncluded = '8';
        kmIncluded = '80';
        extraPerHour = '450';
        extraPerKm = '20';
      }
    } else if (vehicleType.includes('ertiga')) {
      if (fare >= 3500 && fare <= 4500) {
        hoursIncluded = '10';
        kmIncluded = '100';
        extraPerHour = '400';
        extraPerKm = '18';
      } else if (fare >= 2500 && fare <= 3500) {
        hoursIncluded = '8';
        kmIncluded = '80';
        extraPerHour = '400';
        extraPerKm = '18';
      }
    } else if (vehicleType.includes('tempo') || vehicleType.includes('traveller')) {
      if (fare >= 7500 && fare <= 9000) {
        hoursIncluded = '10';
        kmIncluded = '100';
        extraPerHour = '850';
        extraPerKm = '35';
      } else if (fare >= 6000 && fare <= 8000) {
        hoursIncluded = '8';
        kmIncluded = '80';
        extraPerHour = '850';
        extraPerKm = '35';
      }
    } else {
      // Sedan (Swift/Dzire/Amaze/Glanza)
      if (fare >= 2500 && fare <= 3500) {
        hoursIncluded = '10';
        kmIncluded = '100';
        extraPerHour = '300';
        extraPerKm = '14';
      } else if (fare >= 2000 && fare <= 3000) {
        hoursIncluded = '8';
        kmIncluded = '80';
        extraPerHour = '300';
        extraPerKm = '14';
      }
    }
    
    // Final fallback to defaults
    if (!hoursIncluded) {
      hoursIncluded = '8';
      kmIncluded = '80';
      extraPerHour = '100';
      extraPerKm = '12';
    }
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
  

  // Calculate distance for round-trip (double the one-way distance)
  const oneWayDistance = (booking as any).distance || 0;
  const isRoundTrip = booking.trip_mode === 'round-trip' || booking.tripMode === 'round-trip';
  const totalDistance = isRoundTrip ? oneWayDistance * 2 : oneWayDistance;

  // Prepare destination display
  let destinationDisplay = dropLocation;
  if (dropLocation === 'N/A' && tripType !== 'tour') {
    destinationDisplay = tripType === 'local' ? 'Local City Ride' : 'As per itinerary';
  }


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
🚗 *Vehicle:* ${vehicleModel} [${vehicleRegNo}]
👥 *Capacity:* ${vehicleCapacity} passengers
👨‍💼 *Driver:* ${driverName}, ${driverPhone}
📞 *Guest contact:* ${passengerName}, ${passengerCountryCode} ${passengerPhone}
${hasAdditionalRequirements ? `✈️ *Additional Requirements:* ${additionalRequirements}` : ''}

*Fare and Payments*
💰 *Fare (base):* ₹${fareBase}
💳 *Advance:* ₹${advanceAmount}, mode: ${advanceMode}
⏳ *Pending:* ₹${pendingAmount}, payable: ${pendingDue}
${gstEnabled ? `🏢 *GST Details:* ${gstNumber} (${companyName})` : ''}
🧾 *Payment Receipt:* Contact support at +91 9966363662 with your booking number ${booking.bookingNumber || booking.id} to get your receipt

*Trip Inclusions & Exclusions*
📋 *Inclusions:* ${inclusions}
❌ *Exclusions:* ${exclusions}

${tripType === 'local' ? `*Package Limits*
⏰ *Hours included:* ${hoursIncluded}
🛣️ *Kilometers limit:* ${kmIncluded} km
📈 *Extra charges:* ₹${extraPerHour} beyond hours; ₹${extraPerKm} beyond km (pro rate basis)` : ''}

*Billing and Charges*
📊 *Basis:* ${billingBasis}
⏳ *Waiting:* ₹${waitingChargePerHour} after ${graceMinutes} min grace
🌙 *Night charges:* ${nightWindow} at ₹${nightChargeRate}
${tripType === 'local' ? `📏 *Kilometers limit:* ${kmIncluded} km included, extra charges applicable beyond given kilometers on pro rate basis` : ''}

*Route and Notes*
🛣️ *Via/Stops:* ${viaStops}
${allNotes ? `📝 *Special Notes:*
${allNotes}` : ''}

${(tripType === 'tour' || tourId) && (booking as any).tour_itinerary && Array.isArray((booking as any).tour_itinerary) && (booking as any).tour_itinerary.length > 0 ? `*Tour Itinerary*
${(booking as any).tour_itinerary.map((day: any) => {
  const activities = Array.isArray(day.activities) ? day.activities.join(', ') : '';
  return `📅 *Day ${day.day}: ${day.title}*
${day.description}
${activities ? `🎯 Activities: ${activities}` : ''}`;
}).join('\n\n')}

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

*Booking ID:* ${booking.id}

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

export function generateInvoiceMessage(booking: Booking, invoiceUrl?: string): string {
  const passengerName = booking.passengerName || booking.guest_name || 'Customer';
  
  return `🧾 *Invoice - Vizag Taxi Hub*

Hello ${passengerName}!

Your invoice is ready:

💰 *Amount:* ₹${booking.fare || booking.totalAmount}
📋 *Booking ID:* ${booking.id}
📅 *Date:* ${booking.pickup_date || booking.pickupDate}

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
