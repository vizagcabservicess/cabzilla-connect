
<?php
// Simple test file to verify the booking API is working
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: *');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Function to send JSON response
function sendTestResponse($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

// Verify PHP version and extensions
$phpInfo = [
    'version' => phpversion(),
    'extensions' => get_loaded_extensions(),
    'database_extensions' => [
        'mysqli' => extension_loaded('mysqli'),
        'pdo_mysql' => extension_loaded('pdo_mysql')
    ]
];

// Get request details
$requestInfo = [
    'method' => $_SERVER['REQUEST_METHOD'],
    'uri' => $_SERVER['REQUEST_URI'],
    'headers' => getallheaders(),
    'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown'
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
        $dbConnectionTest['config_file_exists'] = true;
        
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
                            'status' => $row['status'] ?? 'N/A',
                            'passenger_name' => $row['passenger_name'] ?? 'N/A',
                            'pickup_location' => substr($row['pickup_location'] ?? 'N/A', 0, 30) . '...',
                            'created_at' => $row['created_at'] ?? 'N/A'
                        ];
                    }
                }
                
                // Get table structure
                if ($dbConnectionTest['bookings_table_exists']) {
                    $structureResult = $conn->query("DESCRIBE bookings");
                    $tableStructure = [];
                    while ($structureRow = $structureResult->fetch_assoc()) {
                        $tableStructure[] = [
                            'field' => $structureRow['Field'],
                            'type' => $structureRow['Type'],
                            'null' => $structureRow['Null'],
                            'key' => $structureRow['Key']
                        ];
                    }
                    $dbConnectionTest['table_structure'] = $tableStructure;
                }
            } else {
                $dbConnectionTest['error'] = 'Failed to connect to database using getDbConnection()';
            }
        } else {
            // Try direct connection
            $dbHost = 'localhost';
            $dbName = 'u644605165_db_be';
            $dbUser = 'u644605165_usr_be';
            $dbPass = 'Vizag@1213';
            
            $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
            
            if (!$conn->connect_error) {
                $dbConnectionTest['success'] = true;
                $dbConnectionTest['message'] = 'Successfully connected to database using direct connection';
                $dbConnectionTest['method'] = 'direct';
                
                // Get database info
                $result = $conn->query("SELECT VERSION() as version");
                if ($result && $row = $result->fetch_assoc()) {
                    $dbConnectionTest['mysql_version'] = $row['version'];
                }
                
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
            } else {
                $dbConnectionTest['error'] = 'Direct connection failed: ' . $conn->connect_error;
            }
        }
    } else {
        $dbConnectionTest['error'] = 'Config file not found';
        $dbConnectionTest['searched_path'] = __DIR__ . '/../../config.php';
        
        // Try direct connection
        $dbHost = 'localhost';
        $dbName = 'u644605165_db_be';
        $dbUser = 'u644605165_usr_be';
        $dbPass = 'Vizag@1213';
        
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        
        if (!$conn->connect_error) {
            $dbConnectionTest['success'] = true;
            $dbConnectionTest['message'] = 'Successfully connected to database using direct connection';
            $dbConnectionTest['method'] = 'direct';
            
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
        } else {
            $dbConnectionTest['direct_connection_error'] = $conn->connect_error;
        }
    }
} catch (Exception $e) {
    $dbConnectionTest['error'] = $e->getMessage();
    $dbConnectionTest['trace'] = $e->getTraceAsString();
}

// Create a response with test data
$response = [
    'status' => 'success',
    'message' => 'Booking API test endpoint is working',
    'timestamp' => date('Y-m-d H:i:s'),
    'request_info' => $requestInfo,
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
sendTestResponse($response);
