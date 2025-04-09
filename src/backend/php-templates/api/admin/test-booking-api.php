
<?php
// Simple test file to verify the booking API is working
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: *');

// Verify PHP version and extensions
$phpInfo = [
    'version' => phpversion(),
    'extensions' => get_loaded_extensions(),
    'database_extensions' => [
        'mysqli' => extension_loaded('mysqli'),
        'pdo_mysql' => extension_loaded('pdo_mysql')
    ]
];

// Test database connection
$dbConnectionTest = [
    'attempted' => false,
    'success' => false,
    'message' => 'Database connection not tested',
    'error' => null
];

try {
    if (file_exists(__DIR__ . '/../../config.php')) {
        require_once __DIR__ . '/../../config.php';
        $dbConnectionTest['attempted'] = true;
        
        if (function_exists('getDbConnection')) {
            $conn = getDbConnection();
            if ($conn && $conn instanceof mysqli) {
                $dbConnectionTest['success'] = true;
                $dbConnectionTest['message'] = 'Successfully connected to database';
                
                // Check if bookings table exists
                $tableCheck = $conn->query("SHOW TABLES LIKE 'bookings'");
                $dbConnectionTest['bookings_table_exists'] = ($tableCheck && $tableCheck->num_rows > 0);
                
                // Count bookings if table exists
                if ($dbConnectionTest['bookings_table_exists']) {
                    $countResult = $conn->query("SELECT COUNT(*) as total FROM bookings");
                    if ($countResult && $row = $countResult->fetch_assoc()) {
                        $dbConnectionTest['bookings_count'] = (int)$row['total'];
                    }
                }
                
                // Get sample booking if available
                if ($dbConnectionTest['bookings_table_exists'] && isset($dbConnectionTest['bookings_count']) && $dbConnectionTest['bookings_count'] > 0) {
                    $sampleResult = $conn->query("SELECT * FROM bookings LIMIT 1");
                    if ($sampleResult && $row = $sampleResult->fetch_assoc()) {
                        $dbConnectionTest['sample_booking'] = [
                            'id' => (int)$row['id'],
                            'booking_number' => $row['booking_number'] ?? 'N/A',
                            'status' => $row['status'] ?? 'N/A'
                        ];
                    }
                }
            } else {
                $dbConnectionTest['error'] = 'Failed to connect to database';
            }
        } else {
            $dbConnectionTest['error'] = 'getDbConnection function not found';
        }
    } else {
        $dbConnectionTest['error'] = 'Config file not found';
    }
} catch (Exception $e) {
    $dbConnectionTest['error'] = $e->getMessage();
}

// Create a simple response with test bookings
$response = [
    'status' => 'success',
    'message' => 'Booking API test endpoint is working',
    'timestamp' => date('Y-m-d H:i:s'),
    'php_info' => $phpInfo,
    'database_test' => $dbConnectionTest,
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
exit;
?>
