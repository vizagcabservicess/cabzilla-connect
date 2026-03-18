# Web Application Analysis - API & UI Map

## 1. Location Search (Pickup / Drop)

**No dedicated backend API for location search.** The web app uses **Google Places Autocomplete** exclusively (client-side).

### Google Places Autocomplete
- **Library**: `@googlemaps/js-api-loader` with `libraries: ['places']`
- **Component**: `src/components/LocationInput.tsx`
- **Implementation**:
  - `new google.maps.places.Autocomplete(inputElement, options)`
  - Options: `types: ["geocode", "establishment"]`, `componentRestrictions: { country: "in" }`
  - Bounds: Circle around Vizag (17.6868, 83.2185) with radius 35km * 1000 meters
  - `strictBounds: true` for pickup only (drop can be outside for outstation)
- **On place selection** (`place_changed`):
  - Store: `place.formatted_address`, `place.geometry.location.lat()`, `place.geometry.location.lng()`
  - Validation: Pickup must be within 35km of Visakhapatnam (tour: 15km)
  - Callback: `onLocationChange({ id, name, address, lat, lng, ... })`
- **Helper text for pickup**: "Please select a location within 35km of Visakhapatnam" (tour: "within 15km")

## 2. Distance / Route Calculation

**Google Maps APIs** - used for fare calculation, not a custom backend.

### Distance Matrix API (Primary)
- **Service**: `google.maps.DistanceMatrixService`
- **File**: `src/lib/distanceService.ts`
- **Function**: `calculateDistanceMatrix(origin: Location, destination: Location)`
- **Request**: `getDistanceMatrix({ origins, destinations, travelMode: DRIVING, unitSystem: METRIC })`
- **Returns**: `{ distance: number (km), duration: number (min), status }`
- **Fallback**: DirectionsService if Distance Matrix fails

### Directions API (Fallback)
- **Service**: `google.maps.DirectionsService`
- **Used when**: Distance Matrix fails or returns invalid result

## 3. Cab / Vehicle APIs

**No "cab search" API.** Vehicles are loaded once; fares are calculated client-side using distance + fare tables.

### Vehicle Data (Cab Types)
- **Endpoints** (tried in order):
  1. `GET /api/admin/direct-vehicle-modify.php?action=load&includeInactive=...`
  2. `GET /api/admin/vehicles-data.php?_t=...&includeInactive=...`
  3. `GET /api/admin/get-vehicles.php?_t=...&includeInactive=...`
  4. `GET /api/admin/direct-vehicle-pricing.php?action=load_vehicles`
- **File**: `src/services/vehicleDataService.ts`, `src/lib/cabData.ts`
- **Function**: `loadCabTypes()`, `getVehicleData()`

## 4. Fare Calculation APIs

Fares are fetched per trip type. Calculation happens client-side using distance + per-km or package rates.

### Outstation Fares
- **Endpoint**: `GET /api/outstation-fares.php` (or `direct-outstation-fares.php`)
- **File**: `src/services/fareService.ts`
- **Functions**: `getOutstationFares()`, `getOutstationFaresForVehicle(vehicleId)`

### Local Fares (Hourly Packages)
- **Endpoint**: `GET /api/local-fares.php`
- **Packages**: "8hrs-80km", "10hrs-100km"
- **Functions**: `getLocalFares()`, `getLocalFaresForVehicle(vehicleId)`

### Airport Fares
- **Endpoint**: `GET /api/airport-fares.php` or `GET /api/direct-airport-fares.php`
- **Functions**: `getAirportFares()`, `getAirportFaresForVehicle(vehicleId)`

## 5. Booking API

- **Endpoint**: `POST /api/book.php`
- **File**: `src/services/api/bookingAPI.ts`
- **Function**: `createBooking(bookingData: BookingRequest)`
- **Headers**: `Content-Type: application/json`, optionally `Authorization: Bearer <token>`

### BookingRequest Payload
```typescript
{
  pickupLocation: string,      // address/name
  dropLocation?: string,
  pickupDate: string,         // ISO date
  pickupTime?: string,
  returnDate?: string,
  tripType: string,           // 'outstation' | 'local' | 'airport' | 'tour'
  tripMode?: string,          // 'one-way' | 'round-trip'
  vehicleType: string,
  cabType?: string,
  passengerName: string,
  passengerPhone: string,
  passengerCountryCode?: string,
  passengerEmail: string,
  additionalRequirements?: string,
  distance?: number,
  totalAmount?: number,
  hourlyPackage?: string | null,
  // ... more optional fields
}
```

**Location format for API**: `convertToApiLocation(location)` produces:
`{ id, name, address, city, state, lat, lng, isInVizag }`

## 6. Google Maps Provider

- **File**: `src/providers/GoogleMapsProvider.tsx`
- **Loader**: `@googlemaps/js-api-loader` with `libraries: ['places']`
- **API Key**: From `VITE_GOOGLE_MAPS_API_KEY` or fallback

## 7. Web UI Structure (Index / Hero)

### Header (Navbar)
- Logo: `/uploads/vizagtaxihub-logo.png` ("Vizag Taxi Hub")
- Hamburger menu (Sheet/SheetTrigger) on right for mobile

### Tabs (exact order)
- Outstation | Local | Airport | Tour
- **Component**: `TabTripSelector`, `TabBar`

### Trip Type Toggle
- **Outstation/Tour**: One Way | Round Trip
- **Airport**: From Airport | To Airport

### Booking Form Fields
1. **Pickup location** (LocationInput)
   - Label: "Pickup location"
   - Placeholder: "Enter Pickup location"
   - Helper: "Please select a location within 35km of Visakhapatnam"
2. **Drop location** (outstation/airport only)
   - Label: "Drop location"
   - Placeholder: "Enter Drop location"
3. **Date of journey** (DateTimePicker)
   - Label: "Date of journey"
   - Single date-time picker (calendar + time input)
   - Min: current time + 1 hour
4. **Return date** (round-trip only)

### Button
- Text: **Search Cabs**
- Action: `handleContinue()` → validate → calculate distance → set currentStep to 2 (cab selection)

### Below Form Section
- **Title**: "Explore Amazing Destinations"
- **Description**: "Discover the beauty of Andhra Pradesh with our carefully curated tour packages."
- **Component**: `DestinationsShowcase` (fetches from `tourAPI.getAvailableTours()`)
- **Tour API**: `GET /api/fares/tours.php` or `GET /api/tours.php`

## 8. Form Validation
- Pickup location required
- Drop location required (outstation/airport)
- Date required, min 1 hour from now
- Return date required for round-trip
- Tour: pickup within 15km; others: pickup within 35km

## 9. API Base URL
- **Production**: `https://www.vizagtaxihub.com`
- **Config**: `src/config.ts`, `src/config/index.ts`
