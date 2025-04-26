
<?php
// driver.php - Handle individual driver operations (GET, UPDATE, DELETE)
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
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

// Get database connection
try {
    $conn = getDbConnectionWithRetry();
} catch (Exception $e) {
    sendResponse(['status' => 'error', 'message' => 'Database connection failed: ' . $e->getMessage()], 500);
}

// Get driver ID from query string or request body
$driverId = isset($_GET['id']) ? (int)$_GET['id'] : null;

if (!$driverId && $_SERVER['REQUEST_METHOD'] === 'POST') {
    // For POST requests, try to get ID from the request body
    $jsonData = file_get_contents('php://input');
    $data = json_decode($jsonData, true);
    $driverId = isset($data['id']) ? (int)$data['id'] : null;
}

// Ensure we have a driver ID for all methods except POST (which is for creating new drivers)
if (!$driverId && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['status' => 'error', 'message' => 'Driver ID is required'], 400);
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
    }
} catch (Exception $e) {
    // Log error but continue - we'll handle no table case in the specific methods
    error_log("Error checking/creating drivers table: " . $e->getMessage());
}

// Handle different HTTP methods
switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        // Get driver details
        try {
            $stmt = $conn->prepare("SELECT * FROM drivers WHERE id = ?");
            $stmt->bind_param("i", $driverId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                sendResponse(['status' => 'error', 'message' => 'Driver not found'], 404);
            }
            
            $driver = $result->fetch_assoc();
            sendResponse(['status' => 'success', 'driver' => $driver]);
        } catch (Exception $e) {
            sendResponse(['status' => 'error', 'message' => 'Failed to retrieve driver: ' . $e->getMessage()], 500);
        }
        break;
        
    case 'PUT':
    case 'POST': // For requests that use POST for updates
        // Update driver details
        try {
            $jsonData = file_get_contents('php://input');
            $data = json_decode($jsonData, true);
            
            if (!$data) {
                sendResponse(['status' => 'error', 'message' => 'Invalid request data'], 400);
            }
            
            // Build update query
            $updateFields = [];
            $types = '';
            $params = [];
            
            // Map allowed fields
            $allowedFields = [
                'name' => 's',
                'phone' => 's',
                'email' => 's',
                'license_no' => 's',
                'status' => 's',
                'location' => 's',
                'vehicle' => 's',
                'total_rides' => 'i',
                'earnings' => 'd',
                'rating' => 'd'
            ];
            
            foreach ($allowedFields as $field => $type) {
                if (isset($data[$field])) {
                    $updateFields[] = "`$field` = ?";
                    $types .= $type;
                    $params[] = $data[$field];
                }
            }
            
            if (empty($updateFields)) {
                sendResponse(['status' => 'error', 'message' => 'No fields to update'], 400);
            }
            
            // Add driver ID to params
            $types .= 'i';
            $params[] = $driverId;
            
            $sql = "UPDATE drivers SET " . implode(', ', $updateFields) . " WHERE id = ?";
            $stmt = $conn->prepare($sql);
            
            // Dynamically bind parameters
            $bindParams = array_merge([$types], $params);
            $bindParamsRef = [];
            foreach ($bindParams as $key => $value) {
                $bindParamsRef[$key] = &$bindParams[$key];
            }
            
            call_user_func_array([$stmt, 'bind_param'], $bindParamsRef);
            $stmt->execute();
            
            if ($stmt->affected_rows === 0) {
                sendResponse(['status' => 'error', 'message' => 'Driver not found or no changes made'], 404);
            }
            
            sendResponse(['status' => 'success', 'message' => 'Driver updated successfully']);
        } catch (Exception $e) {
            sendResponse(['status' => 'error', 'message' => 'Failed to update driver: ' . $e->getMessage()], 500);
        }
        break;
        
    case 'DELETE':
        // Delete driver
        try {
            $stmt = $conn->prepare("DELETE FROM drivers WHERE id = ?");
            $stmt->bind_param("i", $driverId);
            $stmt->execute();
            
            if ($stmt->affected_rows === 0) {
                sendResponse(['status' => 'error', 'message' => 'Driver not found'], 404);
            }
            
            sendResponse(['status' => 'success', 'message' => 'Driver deleted successfully']);
        } catch (Exception $e) {
            sendResponse(['status' => 'error', 'message' => 'Failed to delete driver: ' . $e->getMessage()], 500);
        }
        break;
        
    default:
        sendResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
}

// Close connection
$conn->close();
