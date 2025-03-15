
# PHP Backend Templates for Cab Booking System

These PHP files are templates that you should upload to your Hostinger hosting account to handle API requests from the frontend. They implement the database interactions and API endpoints required for the application.

## Setup Instructions

1. Create a MySQL database on your Hostinger account named `u644605165_db_booking`
2. Import the `database.sql` file to create all required tables
3. Upload all PHP files to your server (typically in the `public_html` directory)
4. Update the `config.php` file with your database credentials
5. Set up appropriate .htaccess rules for API routing (template included)

## Database Schema

The database contains the following main tables:

- `users` - Store user authentication and profile data
- `bookings` - Store ride, tour, and outstation trip records
- `tour_fares` - Store pricing for different tours and vehicle types
- `vehicle_pricing` - Store kilometer pricing for different vehicles

## API Endpoints

The backend implements the following API endpoints:

### User Authentication
- POST /api/signup - Create a new user account
- POST /api/login - Authenticate a user
- GET /api/user/dashboard - Fetch bookings for the logged-in user

### Booking Management
- POST /api/book - Create a new booking
- PUT /api/book/edit/:id - Edit an existing booking
- GET /api/admin/bookings - Retrieve all bookings (admin only)

### Fare Management
- GET /api/fares/tours - Fetch tour fare pricing
- GET /api/fares/vehicles - Fetch vehicle kilometer pricing
- POST /api/admin/fares/update - Update tour fare pricing (admin only)
- POST /api/admin/km-price/update - Update vehicle kilometer pricing (admin only)

## Security Notes

- All API endpoints that modify data require authentication
- Admin endpoints require admin role verification
- API uses JWT tokens for authentication
- Passwords are hashed using bcrypt
- Input validation is performed on all endpoints
