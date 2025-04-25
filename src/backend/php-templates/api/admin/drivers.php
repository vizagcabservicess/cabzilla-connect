
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';

// CRITICAL: Set all response headers first before any output
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Debug mode
$debugMode = isset($_GET['debug']) || isset($_SERVER['HTTP_X_DEBUG']);

// Log request
error_log("Admin drivers endpoint called: " . $_SERVER['REQUEST_METHOD']);

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Function to send JSON response
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    if (ob_get_level()) ob_end_clean();
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

// Helper function to get mock drivers data
function getMockDrivers() {
    return [
        [
            'id' => 1,
            'name' => 'Rajesh Kumar',
            'phone' => '9876543210',
            'email' => 'rajesh@example.com',
            'licenseNo' => 'DL-1234567890',
            'status' => 'available',
            'totalRides' => 352,
            'earnings' => 120000,
            'rating' => 4.8,
            'location' => 'Hyderabad Central',
            'vehicle' => 'Sedan - AP 31 XX 1234'
        ],
        [
            'id' => 2,
            'name' => 'Pavan Reddy',
            'phone' => '8765432109',
            'email' => 'pavan@example.com',
            'licenseNo' => 'DL-0987654321',
            'status' => 'busy',
            'totalRides' => 215,
            'earnings' => 85500,
            'rating' => 4.6,
            'location' => 'Gachibowli',
            'vehicle' => 'SUV - AP 32 XX 5678'
        ],
        [
            'id' => 3,
            'name' => 'Suresh Verma',
            'phone' => '7654321098',
            'email' => 'suresh@example.com',
            'licenseNo' => 'DL-5678901234',
            'status' => 'offline',
            'totalRides' => 180,
            'earnings' => 72000,
            'rating' => 4.5,
            'location' => 'Offline',
            'vehicle' => 'Sedan - AP 33 XX 9012'
        ],
        [
            'id' => 4,
            'name' => 'Venkatesh S',
            'phone' => '9876543211',
            'email' => 'venkat@example.com',
            'licenseNo' => 'DL-4321098765',
            'status' => 'available',
            'totalRides' => 298,
            'earnings' => 110000,
            'rating' => 4.7,
            'location' => 'Kukatpally',
            'vehicle' => 'Hatchback - AP 34 XX 3456'
        ],
        [
            'id' => 5,
            'name' => 'Ramesh Babu',
            'phone' => '8765432108',
            'email' => 'ramesh@example.com',
            'licenseNo' => 'DL-2345678901',
            'status' => 'busy',
            'totalRides' => 175,
            'earnings' => 65000,
            'rating' => 4.4,
            'location' => 'Ameerpet',
            'vehicle' => 'Tempo - AP 35 XX 7890'
        ]
    ];
}

// Check if drivers table exists and create it if necessary
function ensureDriversTableExists($conn) {
    try {
        // Check if drivers table exists
        $tableCheck = $conn->query("SHOW TABLES LIKE 'drivers'");
        
        if ($tableCheck->num_rows == 0) {
            // Create drivers table
            $createTable = "CREATE TABLE IF NOT EXISTS `drivers` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `name` VARCHAR(100) NOT NULL,
                `phone` VARCHAR(20) NOT NULL,
                `email` VARCHAR(100) NOT NULL,
                `license_no` VARCHAR(50) NOT NULL,
                `status` ENUM('available', 'busy', 'offline') DEFAULT 'offline',
                `total_rides` INT DEFAULT 0,
                `earnings` DECIMAL(10,2) DEFAULT 0.00,
                `rating` DECIMAL(3,1) DEFAULT 0.0,
                `location` VARCHAR(255) DEFAULT 'Offline',
                `vehicle` VARCHAR(100) DEFAULT '',
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
            
            if (!$conn->query($createTable)) {
                throw new Exception("Failed to create drivers table: " . $conn->error);
            }
            
            // Insert sample driver data
            $mockDrivers = getMockDrivers();
            $insertSuccess = true;
            
            foreach ($mockDrivers as $driver) {
                $insertStmt = $conn->prepare("INSERT INTO drivers 
                    (name, phone, email, license_no, status, total_rides, earnings, rating, location, vehicle) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                
                if (!$insertStmt) {
                    $insertSuccess = false;
                    break;
                }
                
                $insertStmt->bind_param(
                    "sssssiidss",
                    $driver['name'],
                    $driver['phone'],
                    $driver['email'],
                    $driver['licenseNo'],
                    $driver['status'],
                    $driver['totalRides'],
                    $driver['earnings'],
                    $driver['rating'],
                    $driver['location'],
                    $driver['vehicle']
                );
                
                if (!$insertStmt->execute()) {
                    $insertSuccess = false;
                    break;
                }
            }
            
            error_log("Created drivers table and " . ($insertSuccess ? "successfully" : "failed to") . " insert sample data");
            return true;
        }
        
        return true;
    } catch (Exception $e) {
        error_log("Error setting up drivers table: " . $e->getMessage());
        return false;
    }
}

try {
    // Only allow GET requests
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }

    // Connect to database with improved error handling
    $conn = getDbConnectionWithRetry();
    
    // Ensure drivers table exists
    $tableExists = ensureDriversTableExists($conn);
    
    // Fetch drivers from the database
    $driversQuery = "SELECT * FROM drivers";
    $result = $conn->query($driversQuery);
    
    if (!$result) {
        throw new Exception("Database query failed: " . $conn->error);
    }
    
    $drivers = [];
    
    while ($row = $result->fetch_assoc()) {
        // Map database fields to the format expected by the frontend
        $drivers[] = [
            'id' => (int)$row['id'],
            'name' => $row['name'],
            'phone' => $row['phone'],
            'email' => $row['email'],
            'licenseNo' => $row['license_no'],
            'status' => $row['status'],
            'totalRides' => (int)$row['total_rides'],
            'earnings' => (float)$row['earnings'],
            'rating' => (float)$row['rating'],
            'location' => $row['location'],
            'vehicle' => $row['vehicle']
        ];
    }
    
    // If no drivers found, use mock data
    if (empty($drivers)) {
        $drivers = getMockDrivers();
    }
    
    // Send successful response with drivers data
    sendJsonResponse([
        'status' => 'success',
        'message' => 'Drivers loaded successfully',
        'count' => count($drivers),
        'drivers' => $drivers
    ]);

} catch (Exception $e) {
    error_log("Error in drivers.php: " . $e->getMessage());
    
    // Return mock data in case of error
    sendJsonResponse([
        'status' => 'success',
        'message' => 'Drivers mock data (fallback)',
        'error_details' => $debugMode ? $e->getMessage() : null,
        'drivers' => getMockDrivers()
    ]);
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
?>
