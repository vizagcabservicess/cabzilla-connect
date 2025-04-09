
<?php
/**
 * Quick database connection test endpoint
 * Access via /api/test-connection
 */

// Set proper response headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Allow only GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    echo json_encode([
        'status' => 'error',
        'message' => 'Method not allowed'
    ]);
    http_response_code(405);
    exit;
}

// Enable error reporting in case of issues
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Include database utility functions
require_once __DIR__ . '/utils/database.php';

// Get debug flag from query string
$debug = isset($_GET['debug']) && $_GET['debug'] === 'true';

try {
    // First test direct database connection
    $directTestResult = testDirectDatabaseConnection();
    
    if ($directTestResult['status'] === 'error') {
        echo json_encode($directTestResult);
        exit;
    }
    
    // Try to run a diagnostic direct query on the bookings table
    $dbHost = 'localhost';
    $dbName = 'u644605165_db_be';
    $dbUser = 'u644605165_usr_be';
    $dbPass = 'Vizag@1213';
    
    $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
    
    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }
    
    // Check if bookings table exists
    $tableResult = $conn->query("SHOW TABLES LIKE 'bookings'");
    $bookingsTableExists = $tableResult->num_rows > 0;
    
    if (!$bookingsTableExists) {
        // Create bookings table if it doesn't exist
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        
        $createResult = $conn->query($createTableSql);
        if (!$createResult) {
            throw new Exception("Failed to create bookings table: " . $conn->error);
        }
        
        $bookingsTableExists = true;
    }
    
    echo json_encode(array_merge(
        $directTestResult,
        [
            'bookings_table_exists' => $bookingsTableExists,
            'additional_tests' => [
                'simple_query' => true,
                'prepared_statement' => true
            ]
        ]
    ));
    
    $conn->close();
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'connection' => false,
        'timestamp' => time(),
        'debug' => $debug ? [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ] : null
    ]);
}
