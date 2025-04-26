
<?php
// drivers.php - List all drivers and handle new driver creation
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Debug, *');
header('Cache-Control: no-cache, no-store, must-revalidate');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Function to send JSON response
function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

// Log request details for debugging
$debugMode = isset($_GET['debug']) || isset($_SERVER['HTTP_X_DEBUG']);
if ($debugMode) {
    error_log("Drivers API called: " . $_SERVER['REQUEST_METHOD'] . " " . $_SERVER['REQUEST_URI']);
}

// Get database connection
try {
    $conn = getDbConnectionWithRetry();
} catch (Exception $e) {
    sendResponse(['status' => 'error', 'message' => 'Database connection failed: ' . $e->getMessage()], 500);
}

// Ensure the drivers table exists
try {
    $tableCheckResult = $conn->query("SHOW TABLES LIKE 'drivers'");
    if ($tableCheckResult->num_rows === 0) {
        // Create drivers table
        $createTableSql = "CREATE TABLE drivers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            phone VARCHAR(20) NOT NULL,
            email VARCHAR(100) NOT NULL,
            license_no VARCHAR(50),
            status ENUM('available', 'busy', 'offline') DEFAULT 'available',
            total_rides INT DEFAULT 0,
            earnings DECIMAL(10,2) DEFAULT 0,
            rating DECIMAL(3,2) DEFAULT 5.0,
            location VARCHAR(255) DEFAULT 'Visakhapatnam',
            vehicle VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
        
        $conn->query($createTableSql);
        
        // Add some sample data for testing
        $conn->query("INSERT INTO drivers (name, phone, email, license_no, status, total_rides, earnings, rating, vehicle) 
                      VALUES 
                      ('Rajesh Kumar', '9876543210', 'rajesh@example.com', 'DL-1234567890', 'available', 352, 120000, 4.8, 'Sedan - AP 31 XX 1234'),
                      ('Pavan Reddy', '8765432109', 'pavan@example.com', 'DL-0987654321', 'busy', 215, 85500, 4.6, 'SUV - AP 32 XX 5678'),
                      ('Suresh Verma', '7654321098', 'suresh@example.com', 'DL-5678901234', 'offline', 180, 72000, 4.5, 'Sedan - AP 33 XX 9012')");
                      
        if ($debugMode) {
            error_log("Created drivers table with sample data");
        }
    }
} catch (Exception $e) {
    // Log error but continue - we'll handle no table case in the specific methods
    error_log("Error checking/creating drivers table: " . $e->getMessage());
}

// Handle different HTTP methods
switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        // List all drivers
        try {
            // Check if we need to filter by status
            $statusFilter = isset($_GET['status']) ? $_GET['status'] : null;
            $searchTerm = isset($_GET['search']) ? $_GET['search'] : null;
            
            if ($statusFilter && $searchTerm) {
                $sql = "SELECT * FROM drivers WHERE status = ? AND (name LIKE ? OR phone LIKE ? OR email LIKE ? OR location LIKE ?)";
                $stmt = $conn->prepare($sql);
                $searchParam = "%$searchTerm%";
                $stmt->bind_param("sssss", $statusFilter, $searchParam, $searchParam, $searchParam, $searchParam);
            } 
            elseif ($statusFilter) {
                $sql = "SELECT * FROM drivers WHERE status = ?";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("s", $statusFilter);
            }
            elseif ($searchTerm) {
                $sql = "SELECT * FROM drivers WHERE name LIKE ? OR phone LIKE ? OR email LIKE ? OR location LIKE ?";
                $stmt = $conn->prepare($sql);
                $searchParam = "%$searchTerm%";
                $stmt->bind_param("ssss", $searchParam, $searchParam, $searchParam, $searchParam);
            }
            else {
                $sql = "SELECT * FROM drivers";
                $stmt = $conn->prepare($sql);
            }
            
            $stmt->execute();
            $result = $stmt->get_result();
            
            $drivers = [];
            while ($row = $result->fetch_assoc()) {
                $drivers[] = $row;
            }
            
            sendResponse(['status' => 'success', 'drivers' => $drivers]);
        } catch (Exception $e) {
            sendResponse(['status' => 'error', 'message' => 'Failed to retrieve drivers: ' . $e->getMessage()], 500);
        }
        break;
        
    case 'POST':
        // Create new driver
        try {
            $jsonData = file_get_contents('php://input');
            $data = json_decode($jsonData, true);
            
            if (!$data) {
                sendResponse(['status' => 'error', 'message' => 'Invalid request data'], 400);
            }
            
            // Validate required fields
            if (empty($data['name']) || empty($data['phone'])) {
                sendResponse(['status' => 'error', 'message' => 'Name and phone are required'], 400);
            }
            
            // Set default values for optional fields
            $email = isset($data['email']) ? $data['email'] : '';
            $licenseNo = isset($data['license_no']) || isset($data['licenseNo']) ? 
                (isset($data['license_no']) ? $data['license_no'] : $data['licenseNo']) : '';
            $status = isset($data['status']) ? $data['status'] : 'available';
            $location = isset($data['location']) ? $data['location'] : 'Visakhapatnam';
            $vehicle = isset($data['vehicle']) ? $data['vehicle'] : '';
            
            $sql = "INSERT INTO drivers (name, phone, email, license_no, status, location, vehicle) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("sssssss", 
                $data['name'], 
                $data['phone'], 
                $email, 
                $licenseNo, 
                $status, 
                $location, 
                $vehicle
            );
            $stmt->execute();
            
            if ($stmt->affected_rows === 0) {
                sendResponse(['status' => 'error', 'message' => 'Failed to create driver'], 500);
            }
            
            $newDriverId = $stmt->insert_id;
            
            // Get the newly created driver
            $stmt = $conn->prepare("SELECT * FROM drivers WHERE id = ?");
            $stmt->bind_param("i", $newDriverId);
            $stmt->execute();
            $result = $stmt->get_result();
            $newDriver = $result->fetch_assoc();
            
            sendResponse(['status' => 'success', 'message' => 'Driver created successfully', 'driver' => $newDriver]);
        } catch (Exception $e) {
            sendResponse(['status' => 'error', 'message' => 'Failed to create driver: ' . $e->getMessage()], 500);
        }
        break;
        
    default:
        sendResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
}

// Close connection
$conn->close();
