
<?php
// Simple test file to verify the booking API is working
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: *');

// Create a simple response
$response = [
    'status' => 'success',
    'message' => 'Booking API test endpoint is working',
    'timestamp' => date('Y-m-d H:i:s'),
    'test_bookings' => [
        [
            'id' => 9001,
            'bookingNumber' => 'TEST9001',
            'pickupLocation' => 'Test Airport',
            'dropLocation' => 'Test Hotel',
            'pickupDate' => date('Y-m-d H:i:s'),
            'cabType' => 'sedan',
            'status' => 'pending'
        ],
        [
            'id' => 9002,
            'bookingNumber' => 'TEST9002',
            'pickupLocation' => 'Test Hotel',
            'dropLocation' => 'Test Beach',
            'pickupDate' => date('Y-m-d H:i:s', strtotime('+1 day')),
            'cabType' => 'suv',
            'status' => 'confirmed'
        ]
    ]
];

// Return JSON response
echo json_encode($response, JSON_PRETTY_PRINT);
?>
