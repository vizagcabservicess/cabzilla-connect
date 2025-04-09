
<?php
// Simple test file to verify the booking API is working
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: *');

// Include configuration and database utilities
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../utils/database.php';

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

// Test database connection with retry mechanism
$dbConnectionTest = [
    'attempted' => false,
    'success' => false,
    'message' => 'Database connection not tested',
    'error' => null
];

try {
    // Get a database connection with retry
    $conn = getDbConnectionWithRetry(3);
    $dbConnectionTest['attempted'] = true;
    
    if ($conn) {
        $dbConnectionTest['success'] = true;
        $dbConnectionTest['message'] = 'Successfully connected to database';
        
        // Run database diagnostic
        $diagnostic = runDatabaseDiagnostic($conn);
        $dbConnectionTest['diagnostic'] = $diagnostic;
        
        // Verify database integrity
        $integrityCheck = verifyDatabaseIntegrity($conn);
        $dbConnectionTest['integrity'] = $integrityCheck;
        
        // Ensure bookings table exists
        $ensureBookingsTable = ensureBookingsTableExists($conn);
        $dbConnectionTest['bookings_table_created'] = $ensureBookingsTable;
        
        // Check if bookings table exists
        $tableCheck = $conn->query("SHOW TABLES LIKE 'bookings'");
        $dbConnectionTest['bookings_table_exists'] = ($tableCheck && $tableCheck->num_rows > 0);
        
        // Count bookings if table exists
        if ($dbConnectionTest['bookings_table_exists']) {
            $countResult = $conn->query("SELECT COUNT(*) as total FROM bookings");
            if ($countResult && $row = $countResult->fetch_assoc()) {
                $dbConnectionTest['bookings_count'] = (int)$row['total'];
            }
            
            // Get sample booking if available
            if (isset($dbConnectionTest['bookings_count']) && $dbConnectionTest['bookings_count'] > 0) {
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
        $dbConnectionTest['error'] = 'Failed to connect to database after multiple attempts';
        
        // Try direct connection as fallback
        $dbHost = 'localhost';
        $dbName = 'u644605165_db_be';
        $dbUser = 'u644605165_usr_be';
        $dbPass = 'Vizag@1213';
        
        $directConn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        
        if (!$directConn->connect_error) {
            $dbConnectionTest['direct_connection'] = [
                'success' => true,
                'message' => 'Direct connection successful'
            ];
            
            // Check if bookings table exists with direct connection
            $tableCheck = $directConn->query("SHOW TABLES LIKE 'bookings'");
            $dbConnectionTest['direct_bookings_table_exists'] = ($tableCheck && $tableCheck->num_rows > 0);
            
            // Count bookings with direct connection
            if ($dbConnectionTest['direct_bookings_table_exists']) {
                $countResult = $directConn->query("SELECT COUNT(*) as total FROM bookings");
                if ($countResult && $row = $countResult->fetch_assoc()) {
                    $dbConnectionTest['direct_bookings_count'] = (int)$row['total'];
                }
            }
        } else {
            $dbConnectionTest['direct_connection'] = [
                'success' => false,
                'error' => $directConn->connect_error
            ];
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
