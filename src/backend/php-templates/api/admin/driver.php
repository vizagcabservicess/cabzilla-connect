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
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

// Function to validate driver data
function validateDriverData($data) {
    $errors = [];
    
    if (empty($data['name'])) {
        $errors[] = 'Name is required';
    }
    
    if (empty($data['phone'])) {
        $errors[] = 'Phone number is required';
    } elseif (!preg_match('/^\d{10}$/', $data['phone'])) {
        $errors[] = 'Invalid phone number format';
    }
    
    if (!empty($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Invalid email format';
    }
    
    if (empty($data['license_no'])) {
        $errors[] = 'License number is required';
    }
    
    if (!empty($data['status']) && !in_array($data['status'], ['available', 'busy', 'offline'])) {
        $errors[] = 'Invalid status value';
    }
    
    return $errors;
}

// Get database connection
try {
    $conn = getDbConnectionWithRetry();
} catch (Exception $e) {
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed: ' . $e->getMessage()], 500);
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
    sendJsonResponse(['status' => 'error', 'message' => 'Driver ID is required'], 400);
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
            $stmt = $conn->prepare("
                SELECT d.*, 
                       COUNT(dt.id) as total_trips,
                       AVG(dr.rating) as average_rating
                FROM drivers d
                LEFT JOIN driver_trips dt ON d.id = dt.driver_id
                LEFT JOIN driver_ratings dr ON d.id = dr.driver_id
                WHERE d.id = ?
                GROUP BY d.id
            ");
            
            $stmt->bind_param("i", $driverId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                sendJsonResponse(['status' => 'error', 'message' => 'Driver not found'], 404);
            }
            
            $driver = $result->fetch_assoc();
            
            // Get driver documents
            $docStmt = $conn->prepare("SELECT * FROM driver_documents WHERE driver_id = ?");
            $docStmt->bind_param("i", $driverId);
            $docStmt->execute();
            $docResult = $docStmt->get_result();
            
            $documents = [];
            while ($doc = $docResult->fetch_assoc()) {
                $documents[] = $doc;
            }
            
            $driver['documents'] = $documents;
            
            sendJsonResponse(['status' => 'success', 'data' => $driver]);
        } catch (Exception $e) {
            sendJsonResponse(['status' => 'error', 'message' => 'Failed to retrieve driver: ' . $e->getMessage()], 500);
        }
        break;
        
    case 'PUT':
    case 'POST': // For requests that use POST for updates
        // Update driver details
        try {
            $jsonData = file_get_contents('php://input');
            $data = json_decode($jsonData, true);
            
            if (!$data) {
                sendJsonResponse(['status' => 'error', 'message' => 'Invalid request data'], 400);
            }
            
            // Validate input data
            $errors = validateDriverData($data);
            if (!empty($errors)) {
                sendJsonResponse(['status' => 'error', 'message' => 'Validation failed', 'errors' => $errors], 400);
            }
            
            // Check for duplicate phone and license (excluding current driver)
            $stmt = $conn->prepare("
                SELECT id FROM drivers 
                WHERE (phone = ? OR license_no = ?) 
                AND id != ?
            ");
            $stmt->bind_param("ssi", $data['phone'], $data['license_no'], $driverId);
            $stmt->execute();
            
            if ($stmt->get_result()->num_rows > 0) {
                sendJsonResponse([
                    'status' => 'error',
                    'message' => 'Driver with this phone number or license number already exists'
                ], 409);
            }
            
            // Ensure vehicle_id is set
            if (!isset($data['vehicle_id'])) {
                $data['vehicle_id'] = '';
            }
            // Update driver details
            $stmt = $conn->prepare("
                UPDATE drivers SET 
                    name = ?, 
                    phone = ?, 
                    email = ?, 
                    license_no = ?,
                    vehicle = ?,
                    vehicle_id = ?,
                    status = ?,
                    location = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ");
            
            $stmt->bind_param(
                "ssssssssi",
                $data['name'],
                $data['phone'],
                $data['email'],
                $data['license_no'],
                $data['vehicle'],
                $data['vehicle_id'],
                $data['status'],
                $data['location'],
                $driverId
            );
            
            if ($stmt->execute()) {
                error_log('Driver update executed: ' . print_r($data, true));
                // Update documents if provided
                if (!empty($data['documents'])) {
                    foreach ($data['documents'] as $doc) {
                        $docStmt = $conn->prepare("
                            INSERT INTO driver_documents (
                                driver_id, document_type, document_number, 
                                expiry_date, document_url, status
                            ) VALUES (?, ?, ?, ?, ?, ?)
                            ON DUPLICATE KEY UPDATE
                                document_number = VALUES(document_number),
                                expiry_date = VALUES(expiry_date),
                                document_url = VALUES(document_url),
                                status = VALUES(status)
                        ");
                        
                        $docStatus = $doc['status'] ?? 'pending';
                        $docStmt->bind_param(
                            "isssss",
                            $driverId,
                            $doc['type'],
                            $doc['number'],
                            $doc['expiry'],
                            $doc['url'],
                            $docStatus
                        );
                        $docStmt->execute();
                    }
                }
                
                sendJsonResponse([
                    'status' => 'success',
                    'message' => 'Driver updated successfully'
                ]);
            } else {
                throw new Exception("Failed to update driver: " . $stmt->error);
            }
        } catch (Exception $e) {
            sendJsonResponse(['status' => 'error', 'message' => 'Failed to update driver: ' . $e->getMessage()], 500);
        }
        break;
        
    case 'DELETE':
        // Delete driver
        try {
            // Check if driver has any ongoing trips
            $stmt = $conn->prepare("
                SELECT COUNT(*) as active_trips 
                FROM driver_trips 
                WHERE driver_id = ? 
                AND status IN ('assigned', 'started')
            ");
            
            $stmt->bind_param("i", $driverId);
            $stmt->execute();
            $result = $stmt->get_result();
            $activeTrips = $result->fetch_assoc()['active_trips'];
            
            if ($activeTrips > 0) {
                sendJsonResponse([
                    'status' => 'error',
                    'message' => 'Cannot delete driver with active trips'
                ], 400);
            }
            
            // Delete driver (cascade will handle related records)
            $stmt = $conn->prepare("DELETE FROM drivers WHERE id = ?");
            $stmt->bind_param("i", $driverId);
            
            if ($stmt->execute()) {
                sendJsonResponse([
                    'status' => 'success',
                    'message' => 'Driver deleted successfully'
                ]);
            } else {
                throw new Exception("Failed to delete driver: " . $stmt->error);
            }
        } catch (Exception $e) {
            sendJsonResponse(['status' => 'error', 'message' => 'Failed to delete driver: ' . $e->getMessage()], 500);
        }
        break;
        
    default:
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
}

// Close connection
$conn->close();
