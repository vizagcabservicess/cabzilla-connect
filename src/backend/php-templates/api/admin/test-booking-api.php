
<?php
/**
 * Diagnostic endpoint for testing booking API functionality
 */

// Set headers first
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create response array
$response = [
    'status' => 'success',
    'message' => 'Booking API test endpoint is working',
    'timestamp' => date('Y-m-d H:i:s'),
    'request_info' => [
        'method' => $_SERVER['REQUEST_METHOD'],
        'uri' => $_SERVER['REQUEST_URI'],
        'headers' => getallheaders(),
        'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown'
    ],
    'php_info' => [
        'version' => PHP_VERSION,
        'extensions' => get_loaded_extensions()
    ]
];

// Test database connection
$response['database_test'] = [
    'attempted' => true,
    'success' => false,
    'message' => 'Not tested yet',
    'error' => null,
    'config_file_exists' => false,
    'bookings_table_exists' => false,
    'bookings_count' => 0
];

try {
    // Check if config file exists
    $configPath = __DIR__ . '/../../config.php';
    $response['database_test']['config_file_exists'] = file_exists($configPath);
    
    // Database credentials
    $dbHost = 'localhost';
    $dbName = 'u644605165_db_be';
    $dbUser = 'u644605165_usr_be';
    $dbPass = 'Vizag@1213';
    
    // Create connection
    $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
    
    // Check connection
    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }
    
    $response['database_test']['success'] = true;
    $response['database_test']['message'] = "Successfully connected to database";
    
    // Check if bookings table exists
    $tableCheck = $conn->query("SHOW TABLES LIKE 'bookings'");
    $response['database_test']['bookings_table_exists'] = $tableCheck->num_rows > 0;
    
    if ($response['database_test']['bookings_table_exists']) {
        $countResult = $conn->query("SELECT COUNT(*) as count FROM bookings");
        $countData = $countResult->fetch_assoc();
        $response['database_test']['bookings_count'] = (int)$countData['count'];
        
        // Get a sample booking for verification
        $sampleResult = $conn->query("SELECT * FROM bookings ORDER BY id ASC LIMIT 1");
        if ($sampleResult && $sampleResult->num_rows > 0) {
            $sample = $sampleResult->fetch_assoc();
            $response['database_test']['sample_booking'] = [
                'id' => (int)$sample['id'],
                'booking_number' => $sample['booking_number'],
                'status' => $sample['status'],
                'passenger_name' => $sample['passenger_name'],
                'pickup_location' => $sample['pickup_location'],
                'created_at' => $sample['created_at']
            ];
        }
    }
    
    // Get table structure if exists
    if ($response['database_test']['bookings_table_exists']) {
        $structureResult = $conn->query("DESCRIBE bookings");
        $structure = [];
        
        while ($row = $structureResult->fetch_assoc()) {
            $structure[] = [
                'field' => $row['Field'],
                'type' => $row['Type'],
                'null' => $row['Null'],
                'key' => $row['Key']
            ];
        }
        
        $response['database_test']['table_structure'] = $structure;
    }
    
    // Add test booking data
    $response['test_bookings'] = [];
    
    $testBooking1 = [
        'id' => 9001,
        'bookingNumber' => "TEST9001",
        'pickupLocation' => "Test Airport",
        'dropLocation' => "Test Hotel",
        'pickupDate' => date('Y-m-d H:i:s'),
        'cabType' => "sedan",
        'status' => "pending"
    ];
    
    $testBooking2 = [
        'id' => 9002,
        'bookingNumber' => "TEST9002",
        'pickupLocation' => "Test Hotel",
        'dropLocation' => "Test Beach",
        'pickupDate' => date('Y-m-d H:i:s', strtotime('+1 day')),
        'cabType' => "suv",
        'status' => "confirmed"
    ];
    
    $response['test_bookings'][] = $testBooking1;
    $response['test_bookings'][] = $testBooking2;
    
    // Close database connection
    $conn->close();
} catch (Exception $e) {
    $response['database_test']['success'] = false;
    $response['database_test']['message'] = "Database test failed";
    $response['database_test']['error'] = $e->getMessage();
}

// Output the response
echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
