# Driver Hire Request – Pickup Location & Date/Time in Email

## Frontend (done)

The Hire Driver form submits **JSON** with both camelCase and snake_case keys:

- `pickupLocation` / `pickup_location` – full pickup address
- `pickupDateTime` / `pickup_date_time` – ISO string (e.g. `2026-02-04T20:13:00.000Z`)

## Backend fix required

The PHP script `api/driver-hire-request.php` must read these from the decoded JSON and use them in the email. Add this where you build the email body:

```php
// After: $data = json_decode(file_get_contents('php://input'), true);

$pickup_location = $data['pickup_location'] ?? $data['pickupLocation'] ?? '';
$pickup_date_time = $data['pickup_date_time'] ?? $data['pickupDateTime'] ?? '';

$pickup_location_display = !empty($pickup_location) ? $pickup_location : 'Not provided';

$pickup_date_time_display = 'Not provided';
if (!empty($pickup_date_time)) {
    $dt = new DateTime($pickup_date_time);
    $pickup_date_time_display = $dt->format('F j, Y \a\t g:i A');
}

// In your email HTML template use:
// Pickup Location: <?php echo htmlspecialchars($pickup_location_display); ?>
// Pickup Date & Time: <?php echo htmlspecialchars($pickup_date_time_display); ?>
```

Also ensure your database insert (if any) includes `pickup_location` and `pickup_date_time` columns so stored requests have this data.
