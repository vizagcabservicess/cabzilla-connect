<?php
// Test script to debug date formatting issues
require_once __DIR__ . '/utils/email.php';

echo "=== DATE FORMATTING DEBUG TEST ===\n\n";

// Test with the actual time from the booking confirmation page
$testDateString = "2025-08-13 07:48:00"; // This is what's showing on the page

echo "1. Testing the actual time from booking confirmation page:\n";
echo "   Input date: $testDateString\n";
echo "   Current timezone: " . date_default_timezone_get() . "\n";
echo "   formatDateTimeForEmail result: " . formatDateTimeForEmail($testDateString) . "\n\n";

// Test with different timezone interpretations
echo "2. Testing timezone interpretations:\n";

// If the time is stored as UTC, convert to IST
$utcTime = "2025-08-13 07:48:00";
$istTime = date('Y-m-d H:i:s', strtotime($utcTime . ' UTC') + (5.5 * 3600)); // Add 5.5 hours for IST
echo "   If 07:48 is UTC, IST would be: $istTime\n";
echo "   formatDateTimeForEmail for IST: " . formatDateTimeForEmail($istTime) . "\n\n";

// Test with the expected time (12:31 PM)
$expectedTime = "2025-08-13 12:31:00";
echo "3. Testing expected time:\n";
echo "   Expected time: $expectedTime\n";
echo "   formatDateTimeForEmail: " . formatDateTimeForEmail($expectedTime) . "\n\n";

// Test with current time
echo "4. Testing current time:\n";
echo "   Current time: " . date('Y-m-d H:i:s') . "\n";
echo "   Current timezone: " . date_default_timezone_get() . "\n";
echo "   formatDateTimeForEmail current: " . formatDateTimeForEmail(date('Y-m-d H:i:s')) . "\n\n";

// Test with actual database query
echo "5. Testing with actual database data:\n";
try {
    require_once __DIR__ . '/../../config.php';
    
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Get the most recent booking
    $stmt = $pdo->query("SELECT id, bookingNumber, pickupDate, created_at FROM bookings ORDER BY id DESC LIMIT 1");
    $booking = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($booking) {
        echo "   Latest booking ID: " . $booking['id'] . "\n";
        echo "   Booking number: " . $booking['bookingNumber'] . "\n";
        echo "   Raw pickupDate from DB: " . $booking['pickupDate'] . "\n";
        echo "   Raw created_at from DB: " . $booking['created_at'] . "\n";
        echo "   formatDateTimeForEmail pickupDate: " . formatDateTimeForEmail($booking['pickupDate']) . "\n";
        echo "   formatDateTimeForEmail created_at: " . formatDateTimeForEmail($booking['created_at']) . "\n";
        
        // Test UTC to IST conversion
        $utcPickupDate = $booking['pickupDate'];
        $istPickupDate = date('Y-m-d H:i:s', strtotime($utcPickupDate . ' UTC') + (5.5 * 3600));
        echo "   If pickupDate is UTC, IST would be: $istPickupDate\n";
        echo "   formatDateTimeForEmail for IST pickupDate: " . formatDateTimeForEmail($istPickupDate) . "\n";
        
        // Test different parsing methods
        echo "   strtotime(pickupDate): " . strtotime($booking['pickupDate']) . "\n";
        echo "   date() from strtotime: " . date('Y-m-d H:i:s T', strtotime($booking['pickupDate'])) . "\n";
        echo "   DateTime::createFromFormat: " . (DateTime::createFromFormat('Y-m-d H:i:s', $booking['pickupDate']) ? 'Success' : 'Failed') . "\n";
    } else {
        echo "   No bookings found in database\n";
    }
    
} catch (Exception $e) {
    echo "   Database error: " . $e->getMessage() . "\n";
}

echo "\n=== END TEST ===\n";
?>
