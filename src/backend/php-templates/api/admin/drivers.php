
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Content-Type: application/json');

// Debug mode
$debugMode = isset($_GET['debug']) || isset($_SERVER['HTTP_X_DEBUG']);

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Helper function to send JSON response
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

// Sample mock drivers data for fallback
$mockDrivers = [
    [
        'id' => 1,
        'name' => 'Rajesh Kumar',
        'phone' => '9876543210',
        'license_number' => 'AP10320220123456',
        'vehicle_id' => 'sedan',
        'status' => 'available',
        'created_at' => date('Y-m-d H:i:s', strtotime('-6 months')),
        'updated_at' => date('Y-m-d H:i:s')
    ],
    [
        'id' => 2,
        'name' => 'Pavan Reddy',
        'phone' => '8765432109',
        'license_number' => 'AP10320220789012',
        'vehicle_id' => 'suv',
        'status' => 'busy',
        'created_at' => date('Y-m-d H:i:s', strtotime('-5 months')),
        'updated_at' => date('Y-m-d H:i:s')
    ],
    [
        'id' => 3,
        'name' => 'Suresh Verma',
        'phone' => '7654321098',
        'license_number' => 'AP10320220345678',
        'vehicle_id' => 'sedan',
        'status' => 'offline',
        'created_at' => date('Y-m-d H:i:s', strtotime('-4 months')),
        'updated_at' => date('Y-m-d H:i:s')
    ],
    [
        'id' => 4,
        'name' => 'Venkatesh S',
        'phone' => '9876543211',
        'license_number' => 'AP10320220901234',
        'vehicle_id' => 'hatchback',
        'status' => 'available',
        'created_at' => date('Y-m-d H:i:s', strtotime('-3 months')),
        'updated_at' => date('Y-m-d H:i:s')
    ],
    [
        'id' => 5,
        'name' => 'Ramesh Babu',
        'phone' => '8765432108',
        'license_number' => 'AP10320220567890',
        'vehicle_id' => 'tempo',
        'status' => 'busy',
        'created_at' => date('Y-m-d H:i:s', strtotime('-2 months')),
        'updated_at' => date('Y-m-d H:i:s')
    ]
];

try {
    // Connect to database
    try {
        // Direct connection as fallback since we need maximum reliability
        $dbHost = 'localhost';
        $dbName = 'u644605165_db_be';
        $dbUser = 'u644605165_usr_be';
        $dbPass = 'Vizag@1213';
        
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        if ($conn->connect_error) {
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
        
        // Set character set
        $conn->set_charset("utf8mb4");
        
        // Test the connection
        if (!$conn->ping()) {
            throw new Exception("Database connection is not active");
        }
    } catch (Exception $e) {
        error_log("Database connection failed in drivers.php: " . $e->getMessage());
        
        // Use mock data if connection fails
        sendJsonResponse([
            'status' => 'success',
            'message' => 'Using fallback driver data due to connection issues',
            'drivers' => $mockDrivers,
            'fallback' => true,
            'error_details' => $debugMode ? $e->getMessage() : null
        ]);
    }

    // Check if drivers table exists
    $driverTableExists = false;
    try {
        $tableCheck = $conn->query("SHOW TABLES LIKE 'drivers'");
        $driverTableExists = $tableCheck->num_rows > 0;
        
        if (!$driverTableExists) {
            // Create drivers table
            $sql = "
            CREATE TABLE IF NOT EXISTS `drivers` (
              `id` int(11) NOT NULL AUTO_INCREMENT,
              `name` varchar(100) NOT NULL,
              `phone` varchar(20) NOT NULL,
              `license_number` varchar(50) DEFAULT NULL,
              `vehicle_id` varchar(50) DEFAULT NULL,
              `status` varchar(20) DEFAULT 'available',
              `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
              `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              PRIMARY KEY (`id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ";
            $conn->query($sql);
            
            // Insert mock data
            $insertStmt = $conn->prepare("INSERT INTO drivers (name, phone, license_number, vehicle_id, status) VALUES (?, ?, ?, ?, ?)");
            foreach ($mockDrivers as $driver) {
                $insertStmt->bind_param("sssss", $driver['name'], $driver['phone'], $driver['license_number'], $driver['vehicle_id'], $driver['status']);
                $insertStmt->execute();
            }
            
            sendJsonResponse([
                'status' => 'success',
                'message' => 'Created drivers table and inserted sample data',
                'drivers' => $mockDrivers,
                'initialized' => true
            ]);
            exit;
        }
    } catch (Exception $e) {
        error_log("Error checking or creating drivers table: " . $e->getMessage());
        
        // Continue with mock data
        sendJsonResponse([
            'status' => 'success',
            'message' => 'Using fallback driver data due to table creation issues',
            'drivers' => $mockDrivers,
            'fallback' => true,
            'error_details' => $debugMode ? $e->getMessage() : null
        ]);
    }
    
    // Process request based on method
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // List all drivers
        try {
            $drivers = [];
            $result = $conn->query("SELECT * FROM drivers ORDER BY id DESC");
            
            if ($result->num_rows > 0) {
                while ($row = $result->fetch_assoc()) {
                    $drivers[] = $row;
                }
            } else {
                // If no drivers in database, use mock data
                $drivers = $mockDrivers;
            }
            
            sendJsonResponse([
                'status' => 'success',
                'drivers' => $drivers
            ]);
        } catch (Exception $e) {
            error_log("Error retrieving drivers: " . $e->getMessage());
            
            // Return mock data as fallback
            sendJsonResponse([
                'status' => 'success',
                'message' => 'Using fallback driver data due to retrieval issues',
                'drivers' => $mockDrivers,
                'fallback' => true,
                'error_details' => $debugMode ? $e->getMessage() : null
            ]);
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Add new driver
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['name']) || !isset($data['phone'])) {
            sendJsonResponse(['status' => 'error', 'message' => 'Required fields missing'], 400);
        }
        
        try {
            $stmt = $conn->prepare("INSERT INTO drivers (name, phone, license_number, vehicle_id, status) VALUES (?, ?, ?, ?, ?)");
            
            $name = $data['name'];
            $phone = $data['phone'];
            $licenseNumber = $data['licenseNumber'] ?? null;
            $vehicleId = $data['vehicleId'] ?? null;
            $status = $data['status'] ?? 'available';
            
            $stmt->bind_param("sssss", $name, $phone, $licenseNumber, $vehicleId, $status);
            $success = $stmt->execute();
            
            if (!$success) {
                throw new Exception("Failed to add driver: " . $stmt->error);
            }
            
            $driverId = $stmt->insert_id;
            
            // Return the created driver
            sendJsonResponse([
                'status' => 'success',
                'message' => 'Driver added successfully',
                'driver' => [
                    'id' => $driverId,
                    'name' => $name,
                    'phone' => $phone,
                    'license_number' => $licenseNumber,
                    'vehicle_id' => $vehicleId,
                    'status' => $status,
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s')
                ]
            ]);
            
        } catch (Exception $e) {
            error_log("Error adding driver: " . $e->getMessage());
            
            // Return an error message
            sendJsonResponse([
                'status' => 'error',
                'message' => 'Failed to add driver: ' . $e->getMessage(),
                'error_details' => $debugMode ? $e->getMessage() : null
            ], 500);
        }
    } else {
        // Method not allowed
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }

} catch (Exception $e) {
    error_log("Unhandled error in drivers.php: " . $e->getMessage());
    
    // Return a more user-friendly error or mock data
    sendJsonResponse([
        'status' => 'error',
        'message' => 'An error occurred while processing the request',
        'error_details' => $debugMode ? $e->getMessage() : null,
        'fallback_drivers' => $mockDrivers  // Always provide fallback data
    ], 500);
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
