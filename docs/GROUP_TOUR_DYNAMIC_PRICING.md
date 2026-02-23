# Group Tour Dynamic Seat Pricing

This document describes the dynamic seat pricing feature for Vizag Taxi Hub Tempo Traveller seat-sharing.

## Setup

### 1. Run Database Migration

Execute the SQL in `src/backend/php-templates/api/sql/group_tour_dynamic_pricing.sql`:

1. Creates `group_tour_seat_prices` table for per-seat price overrides
2. Adds `seat_amount` column to `group_tour_booking_seats` (run manually if needed):
   ```sql
   ALTER TABLE group_tour_booking_seats ADD COLUMN seat_amount DECIMAL(10,2) NULL DEFAULT NULL AFTER tour_id;
   ```

## Features

### Base Price
- Each tour has `price_per_seat` (in `group_tour_tours`) as the default price
- Set via admin Tour form when creating/editing a tour

### Per-Seat Override
- Admin can set custom price for individual seats in the Seat Occupancy dialog
- Click "Edit price" on any available seat, enter amount, click OK
- Override is stored in `group_tour_seat_prices`

### Bulk Adjustment
- **All seats**: Increase/decrease all seats by fixed amount or percentage
- **Available only**: Apply to remaining available seats only (booked seats unchanged)
- Use the Bulk price adjustment section in the Seat Occupancy dialog

### Reset to Base
- Click "Reset to base" to remove all overrides and revert to tour base price

### Search Results
- Tour cards show "Starting from ₹X per seat" (lowest available seat price)
- Improves conversion by highlighting best value

### Seat Selection
- Each seat displays its price (e.g. S1 ₹678, S2 ₹799)
- Booking summary shows per-seat breakdown and total
- Total = sum of selected seat prices

### Booking
- `seat_amount` is stored per seat in `group_tour_booking_seats`
- Price is locked at booking time and never changes
- `total_amount` in `group_tour_bookings` = sum of seat amounts

## API

### Seat Availability (public)
- Returns `price` for each seat
- Returns `base_price` and `price_from` (min available price)

### Admin Seat Management
- `set_price`: Set price for one seat
- `bulk_adjust`: Adjust multiple seats (scope: all | available)
- `reset_prices`: Remove all overrides
