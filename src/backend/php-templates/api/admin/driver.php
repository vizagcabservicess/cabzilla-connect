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

try {
    $tableCheckResult = $conn->query("SHOW TABLES LIKE 'drivers'");
    if ($tableCheckResult->num_rows === 0) {
        // Create drivers table with consistent schema
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
    }
} catch (Exception $e) {
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
