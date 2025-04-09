
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

// Include database utilities
require_once __DIR__ . '/../utils/database.php';

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
    
    // Attempt connection with retry
    $conn = getDbConnectionWithRetry(2);
    
    if (!$conn) {
        throw new Exception("Could not establish database connection after retries");
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
    } else {
        // Try to create the bookings table
        $response['database_test']['table_creation_attempted'] = true;
        
        $createTableSql = "
        CREATE TABLE IF NOT EXISTS bookings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            booking_number VARCHAR(50) NOT NULL UNIQUE,
            pickup_location TEXT NOT NULL,
            drop_location TEXT,
            pickup_date DATETIME NOT NULL,
            return_date DATETIME,
            cab_type VARCHAR(50) NOT NULL,
            distance DECIMAL(10,2),
            trip_type VARCHAR(20) NOT NULL,
            trip_mode VARCHAR(20) NOT NULL,
            total_amount DECIMAL(10,2) NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            passenger_name VARCHAR(100) NOT NULL,
            passenger_phone VARCHAR(20) NOT NULL,
            passenger_email VARCHAR(100) NOT NULL,
            hourly_package VARCHAR(50),
            tour_id VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
        
        $tableCreationResult = $conn->query($createTableSql);
        $response['database_test']['table_creation_success'] = !!$tableCreationResult;
        
        if (!$tableCreationResult) {
            $response['database_test']['table_creation_error'] = $conn->error;
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
    
    // Try to insert a test booking
    if ($response['database_test']['bookings_table_exists']) {
        $response['database_test']['test_insert_attempted'] = true;
        
        // Generate test booking number
        $testBookingNumber = 'TEST' . time() . mt_rand(1000, 9999);
        
        // Start transaction
        $conn->begin_transaction();
        
        // Prepare the insert statement
        $testSql = "INSERT INTO bookings 
            (booking_number, pickup_location, drop_location, pickup_date, 
             cab_type, distance, trip_type, trip_mode, 
             total_amount, passenger_name, passenger_phone, passenger_email, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
        $testStmt = $conn->prepare($testSql);
        
        if (!$testStmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }
        
        // Test data
        $pickupLocation = "Test Pickup";
        $dropLocation = "Test Dropoff";
        $pickupDate = date('Y-m-d H:i:s');
        $cabType = "sedan";
        $distance = 10.5;
        $tripType = "local";
        $tripMode = "one-way";
        $totalAmount = 500;
        $passengerName = "Test User";
        $passengerPhone = "1234567890";
        $passengerEmail = "test@example.com";
        $status = "test";
        
        $testStmt->bind_param(
            "ssssdsssdsss",
            $testBookingNumber, $pickupLocation, $dropLocation, $pickupDate,
            $cabType, $distance, $tripType, $tripMode,
            $totalAmount, $passengerName, $passengerPhone, $passengerEmail, $status
        );
        
        $testInsertSuccess = $testStmt->execute();
        $response['database_test']['test_insert_success'] = $testInsertSuccess;
        
        if (!$testInsertSuccess) {
            $response['database_test']['test_insert_error'] = $testStmt->error;
        } else {
            $testBookingId = $conn->insert_id;
            $response['database_test']['test_booking_id'] = $testBookingId;
            
            // Delete the test booking to clean up
            $deleteSql = "DELETE FROM bookings WHERE id = ?";
            $deleteStmt = $conn->prepare($deleteSql);
            $deleteStmt->bind_param("i", $testBookingId);
            $deleteSuccess = $deleteStmt->execute();
            
            $response['database_test']['test_delete_success'] = $deleteSuccess;
        }
        
        // Commit or rollback the transaction
        if ($testInsertSuccess) {
            $conn->commit();
        } else {
            $conn->rollback();
        }
    }
    
    // Check server permissions and PHP configurations
    $response['server_info'] = [
        'open_basedir' => ini_get('open_basedir'),
        'disable_functions' => ini_get('disable_functions'),
        'max_execution_time' => ini_get('max_execution_time'),
        'memory_limit' => ini_get('memory_limit'),
        'file_uploads' => ini_get('file_uploads'),
        'upload_max_filesize' => ini_get('upload_max_filesize'),
        'post_max_size' => ini_get('post_max_size')
    ];
    
    $testDir = __DIR__ . '/../../logs';
    $response['permissions'] = [
        'logs_dir_exists' => file_exists($testDir),
        'logs_dir_writable' => is_writable($testDir) || (!file_exists($testDir) && is_writable(dirname($testDir))),
        'api_dir_writable' => is_writable(__DIR__),
        'tmp_dir_writable' => is_writable(sys_get_temp_dir())
    ];
    
    // Close database connection
    $conn->close();
} catch (Exception $e) {
    $response['database_test']['success'] = false;
    $response['database_test']['message'] = "Database test failed";
    $response['database_test']['error'] = $e->getMessage();
    $response['database_test']['error_trace'] = $e->getTraceAsString();
}

// Output the response
echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
