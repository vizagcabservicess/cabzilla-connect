<?php
// Test script to verify timezone conversion fix
require_once __DIR__ . '/utils/email.php';

echo "=== TIMEZONE CONVERSION TEST ===\n\n";

// Test the actual time from the booking confirmation page
$utcTime = "2025-08-13 07:48:00";
echo "UTC time from database: $utcTime\n";
echo "IST time (should be): 13 Aug 2025 at 01:18 PM\n";
echo "formatDateTimeForEmail result: " . formatDateTimeForEmail($utcTime) . "\n\n";

// Test with current time
$currentUTC = date('Y-m-d H:i:s');
echo "Current UTC time: $currentUTC\n";
echo "Current IST time: " . formatDateTimeForEmail($currentUTC) . "\n\n";

// Test with different times
$testTimes = [
    "2025-08-13 12:00:00" => "Should be 05:30 PM IST",
    "2025-08-13 06:00:00" => "Should be 11:30 AM IST",
    "2025-08-13 00:00:00" => "Should be 05:30 AM IST"
];

foreach ($testTimes as $utc => $expected) {
    echo "UTC: $utc\n";
    echo "Expected: $expected\n";
    echo "Result: " . formatDateTimeForEmail($utc) . "\n\n";
}

echo "=== END TEST ===\n";
?>
