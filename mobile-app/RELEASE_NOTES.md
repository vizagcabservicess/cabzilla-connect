# Vizag Taxi Hub — Release Notes

## Version 1.0.1

**Release date:** 4 November 2026

### What’s new

Drivers get a clearer camera for fuel pumps and odometer readings, and a trip alert that keeps sounding until the trip is opened. The office can follow live trips, close a duty, and share the assigned driver with the guest.

### For drivers

- Fuel pump and odometer photos wait until the frame is sharp, then read the display. If litres or kg are missing but the amount and rate are clear, the quantity is filled in.
- A new trip plays an alarm, including on the lock screen, and keeps chiming until you open the trip.
- Live location is shared with the office only during an active trip or event duty, and only after you accept the disclosure.
- The GPS prompt no longer repeats when location is already on.

### For the office

- Live map of drivers who are on a trip.
- Start and close a duty with opening and closing kilometres, extras, and fuel (company paid, UPI, card, or customer advance).
- Download trip lists and fuel records as PDF.
- WhatsApp the guest the driver and vehicle details. The action is available only after the trip is assigned, on the website and in the app.
- Assignment lists leave out inactive, offline, and blocked drivers.
- People list can be filtered by active, inactive, drivers, guests, and admins.
- Super admins can mute push alerts.
- Outstation round-trip quotations use the trip’s real duration instead of a default two-day tour.

### For guests

- Mobile website shows a banner to install the Android app.
- Privacy policy covers location shared during an active trip or duty.

### Play Store (What’s new)

```
Sharper fuel and odometer photos. Missed quantity is filled in from the amount and rate.

Trip alerts sound until the driver opens the trip, including on the lock screen. Location is shared with the office only during an active trip or duty, after you agree.

Office: live driver map, close a duty with km, extras, and fuel, and download trip and fuel PDFs. WhatsApp the guest the assigned driver and vehicle. Inactive drivers stay off assignment lists. Outstation quotes use the real duration.
```

---

## Version 1.0.0

**Release date:** March 2025

---

### For Customers

#### Book a ride
- **Outstation trips** — One-way and round-trip cab booking with real-time distance and fare calculation
- **Airport transfer** — Pickup and drop at Visakhapatnam International Airport (one-way)
- **Hourly rentals** — 8hr-80km and other local packages
- **Tour packages** — Browse and book pre-defined tours with pickup and drop selection

#### Services
- **Hire a driver** — Book a driver for your own vehicle
- **Call now** — Quick access to call the taxi service
- **WhatsApp** — Chat directly with support

#### Booking flow
- Pickup and drop location selection with map search
- Date and time picker for scheduled bookings
- Vehicle selection with capacity and amenities
- Passenger details and optional remarks
- Partial or full payment options

#### Payments
- **Razorpay** — Secure online payment (UPI, cards, netbanking)
- Partial payment support for bookings

#### Account & profile
- Sign up and login
- My bookings dashboard (upcoming and past trips)
- Profile and account settings
- Data deletion request

#### Support
- Help center
- Contact us
- In-app WebView for terms, privacy, and other static content

#### Push notifications
- Booking confirmations and reminders
- Trip updates

---

### For Administrators

#### Dashboard
- Overview of today’s bookings, revenue, and key metrics

#### Bookings
- Bookings list with filters
- Upcoming trips view
- Create booking on behalf of customers
- Booking details, edit booking
- Assign driver and vehicle
- Generate and share invoices

#### Fleet
- Manage vehicles (add, edit)
- Fleet overview

#### People
- Manage drivers (add, edit)
- Manage users

#### Operations
- Fares management
- Commission settings
- Fuel tracking
- Maintenance records
- Payroll

#### Finance
- Ledger
- Expenses
- Payments
- Payment tracking

#### Reports
- Reports and analytics (drivers, vehicles, and more)

#### Other
- Group tours management
- Contact us submissions

---

### Technical

- Built with **Expo SDK 54** and **React Native**
- Push notifications via **expo-notifications** (FCM on Android)
- Secure storage with **expo-secure-store**
- Maps and location search
- Adaptive icons for Android (foreground, background, monochrome)
- Portrait orientation, light theme

---

### Store listing suggestions (short descriptions)

**Short (80 chars):**
```
Book cabs in Visakhapatnam — outstation, airport, hourly & tours. Safe & easy.
```

**Medium (132 chars):**
```
Vizag Taxi Hub: Book outstation trips, airport transfers, hourly rentals & tours. Hire a driver. Secure payment. Available across Visakhapatnam.
```

**Full:**
```
Vizag Taxi Hub lets you book cabs across Visakhapatnam and beyond. Choose from outstation trips, airport transfers, hourly rentals, or curated tour packages. Hire a driver for your own car, pay securely online, and track your bookings. Get pickup reminders and trip updates via push notifications. Call or WhatsApp for instant help.
```
