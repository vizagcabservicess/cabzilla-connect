<?php
// Suppress warnings and errors in output
error_reporting(E_ERROR | E_PARSE);
ini_set('display_errors', 0);

// Include configuration file
require_once __DIR__ . '/../../config.php';

// CRITICAL: Set all response headers first before any output
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Clear any potential output buffer to avoid content contamination
while (ob_get_level()) ob_end_clean();

// Debug mode
$debugMode = isset($_GET['debug']) || isset($_SERVER['HTTP_X_DEBUG']);

// Log request
error_log("Admin get-drivers endpoint called: " . $_SERVER['REQUEST_METHOD']);

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Function to send JSON response
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    if (ob_get_level()) ob_end_clean();
    echo json_encode($data);
    exit;
}

// Function to log errors with details
function logDriversError($message, $data = []) {
    error_log("DRIVERS ERROR: $message " . json_encode($data));
    $logFile = __DIR__ . '/../../logs/drivers_errors.log';
    $dir = dirname($logFile);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    file_put_contents(
        $logFile,
        date('Y-m-d H:i:s') . " - $message - " . json_encode($data) . "\n",
        FILE_APPEND
    );
}

try {
    // Only allow GET requests
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }

    // Connect to the database using the common function
    try {
        $conn = getDbConnection();
        logDriversError("Database connection established successfully");
    } catch (Exception $e) {
        logDriversError("Database connection error", ['error' => $e->getMessage()]);
        throw new Exception("Database connection failed: " . $e->getMessage());
    }
    
    // Check if drivers table exists
    $tableExists = false;
    $checkTableResult = $conn->query("SHOW TABLES LIKE 'drivers'");
    
    if ($checkTableResult) {
        $tableExists = $checkTableResult->num_rows > 0;
    }
    
    // Create drivers table if it doesn't exist
    if (!$tableExists) {
        logDriversError("Creating drivers table as it doesn't exist");
        
        $createTableQuery = "
            CREATE TABLE IF NOT EXISTS drivers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                email VARCHAR(100),
                license_no VARCHAR(50),
                status ENUM('available', 'busy', 'offline') DEFAULT 'available',
                total_rides INT DEFAULT 0,
                earnings DECIMAL(10,2) DEFAULT 0,
                rating DECIMAL(3,2) DEFAULT 5.0,
                location VARCHAR(255) DEFAULT 'Visakhapatnam',
                vehicle VARCHAR(100),
                vehicle_id VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY (phone)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
        
        $createResult = $conn->query($createTableQuery);
        
        if ($conn->error) {
            logDriversError("Error creating drivers table", ['error' => $conn->error]);
            throw new Exception("Failed to create drivers table: " . $conn->error);
        }
        
        // Insert some sample data if we just created the table
        $sampleDataExists = $conn->query("SELECT COUNT(*) as count FROM drivers")->fetch_assoc()['count'] > 0;
        
        if (!$sampleDataExists) {
            logDriversError("Adding sample data to drivers table");
            
            $insertSampleData = "
                INSERT INTO drivers (name, phone, email, license_no, status, location, vehicle) 
                VALUES 
                ('Rajesh Kumar', '9966363662', 'rajesh@example.com', 'AP12345678901234', 'available', 'Visakhapatnam', 'Sedan'),
                ('Suresh Reddy', '8765432109', 'suresh@example.com', 'AP98765432109876', 'busy', 'Visakhapatnam', 'SUV'),
                ('Mahesh Babu', '7654321098', 'mahesh@example.com', 'AP45678901234567', 'available', 'Visakhapatnam', 'Hatchback')
            ";
            
            $insertResult = $conn->query($insertSampleData);
            
            if ($conn->error) {
                logDriversError("Error inserting sample data", ['error' => $conn->error]);
                // Non-fatal error, continue execution
            } else {
                logDriversError("Sample data inserted successfully");
            }
        }
        
        $tableExists = true; // Table should now exist
    }
    
    // Get all drivers
    if ($tableExists) {
        try {
            $result = $conn->query("SELECT * FROM drivers ORDER BY name ASC");
            
            if (!$result) {
                throw new Exception("Query failed: " . $conn->error);
            }
            
            $drivers = [];
            while ($row = $result->fetch_assoc()) {
                $drivers[] = [
                    'id' => (int)$row['id'],
                    'name' => $row['name'],
                    'phone' => $row['phone'],
                    'licenseNumber' => isset($row['license_no']) ? $row['license_no'] : (isset($row['license_number']) ? $row['license_number'] : null),
                    'vehicleType' => isset($row['vehicle_type']) ? $row['vehicle_type'] : null,
                    'vehicleNumber' => isset($row['vehicle_number']) ? $row['vehicle_number'] : null,
                    'status' => $row['status'],
                    'address' => isset($row['address']) ? $row['address'] : '',
                    'dateJoined' => isset($row['date_joined']) ? $row['date_joined'] : ''
                ];
            }
            
            // If no drivers found, log but return empty array, not sample data
            if (empty($drivers)) {
                logDriversError("No drivers found in the database");
                
                // Return a success message but with an empty array
                sendJsonResponse([
                    'status' => 'success',
                    'message' => 'No drivers found',
                    'data' => []
                ]);
            } else {
                // Return all drivers
                sendJsonResponse([
                    'status' => 'success',
                    'message' => 'Drivers retrieved successfully',
                    'data' => $drivers
                ]);
            }
            
        } catch (Exception $e) {
            logDriversError("Error fetching drivers", ['error' => $e->getMessage()]);
            throw $e;
        }
    } else {
        // Should never reach here as we create the table above
        logDriversError("Drivers table does not exist after creation attempt");
        throw new Exception("Failed to verify drivers table existence");
    }

} catch (Exception $e) {
    logDriversError("Critical error in get-drivers.php", ['error' => $e->getMessage()]);
    
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Failed to retrieve drivers from database: ' . $e->getMessage(),
        'error_details' => $debugMode ? $e->getTraceAsString() : null
    ], 500);
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
