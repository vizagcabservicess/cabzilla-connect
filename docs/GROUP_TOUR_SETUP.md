# Vizag Taxi Hub – Group Tour (Tempo Traveller Seat Sharing) Setup

## Overview

This document describes the Tempo Traveller group seat-sharing booking platform for Vizag Taxi Hub. It provides a RedBus-style flow for 17-seater Tempo Traveller with Razorpay payments and WhatsApp confirmation.

## Features

- **17-Seater Layout**: Row 1 (1 seat), Rows 2–5 (4 seats each) + Driver (unbookable)
- **Seat Statuses**: Available, Selected, Reserved (10 min), Booked
- **Reservation Logic**: 10 min expiration, max 6 seats per booking
- **Fixed Price**: ₹500 per seat
- **Razorpay**: Order creation, payment, signature verification
- **WhatsApp**: Confirmation message with booking details

## Database Setup

1. Run the migration (from project root):

```bash
mysql -u your_user -p your_database < sql/group_tour_migration.sql
```

Or from `src/backend/php-templates/`:

```bash
mysql -u your_user -p your_database < api/sql/group_tour_migration.sql
```

2. Ensure the following tables exist:
   - `group_tour_tours`
   - `group_tour_seats`
   - `group_tour_bookings`
   - `group_tour_booking_seats`

## Backend (PHP) Deployment

1. All group tour backend files are in `src/backend/php-templates/api/group-tour/`.
2. Deploy using your existing php-templates deployment process. The `api/group-tour/` folder should be copied to the server's API root (e.g. `/api/group-tour/`).

2. Configure environment variables (create or update `.env` in the project root):

```
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
RAZORPAY_KEY_ID=rzp_live_xxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
WHATSAPP_PHONE=919966363662
```

3. Ensure `config.php` can read these (it looks for `.env` in the parent directory).

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/group-tour/search-tours?pickup=&dropoff=&date=` | Search tours |
| GET | `/api/group-tour/seat-availability?tour_id=` | Get seat status |
| POST | `/api/group-tour/reserve-seats` | Reserve seats (10 min) |
| POST | `/api/group-tour/create-order` | Create Razorpay order |
| POST | `/api/group-tour/verify-payment` | Verify payment & confirm booking |
| GET | `/api/group-tour/booking-details?booking_id=` | Fetch booking for confirmation |
| POST | `/api/group-tour/webhook` | Razorpay webhook (optional) |

## Frontend Routes

| Path | Page |
|------|------|
| `/group-tours` | Landing with search form |
| `/group-tours/search` | Search results |
| `/group-tours/seat-selection/:tourId` | Seat map + payment |
| `/group-tours/confirmation/:bookingId` | Booking confirmation |

## Adding Sample Tours

Run the seed file to add Vizag City, Vizag, and Visakhapatnam Airport → Araku Valley routes (next 15–30 days):

```bash
mysql -u your_user -p your_database < src/backend/php-templates/api/sql/group_tour_seed.sql
```

Or manually insert specific tours:

```sql
INSERT INTO group_tour_tours (pickup_location, dropoff_location, travel_date, price_per_seat, capacity, status)
VALUES
  ('Visakhapatnam Airport', 'Araku Valley', '2025-03-01', 500, 17, 'active'),
  ('Vizag City', 'Araku Valley', '2025-03-01', 500, 17, 'active');
```

Seats (S1–S17) are created automatically when the first seat availability request is made for a tour.

## Production Checklist

- [ ] Run `group_tour_migration.sql`
- [ ] Deploy `public/api/group-tour/` to the server
- [ ] Set `RAZORPAY_KEY_SECRET` and other env vars
- [ ] Test search, seat selection, and payment flow
- [ ] Configure Razorpay webhook URL if needed
