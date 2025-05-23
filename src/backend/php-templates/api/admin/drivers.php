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
function sendJsonResponse($data, $statusCode = 200) {
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
    if (!$conn) {
        sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
    }
} catch (Exception $e) {
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed: ' . $e->getMessage()], 500);
}

// Ensure the drivers table exists
try {
    $tableCheckResult = $conn->query("SHOW TABLES LIKE 'drivers'");
    if ($tableCheckResult->num_rows === 0) {
        // Create drivers table with email as NOT NULL
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
        
        // Add sample data
        $conn->query("INSERT INTO drivers (name, phone, email, license_no, status, total_rides, earnings, rating, location, vehicle) 
                      VALUES 
                      ('Rajesh Kumar', '9876543210', 'rajesh@example.com', 'DL-1234567890', 'available', 352, 120000, 4.8, 'Hyderabad Central', 'Sedan - AP 31 XX 1234'),
                      ('Pavan Reddy', '8765432109', 'pavan@example.com', 'DL-0987654321', 'busy', 215, 85500, 4.6, 'Gachibowli', 'SUV - AP 32 XX 5678'),
                      ('Suresh Verma', '7654321098', 'suresh@example.com', 'DL-5678901234', 'offline', 180, 72000, 4.5, 'Offline', 'Sedan - AP 33 XX 9012')");
    } else {
        // Check if we need to update the schema
        $result = $conn->query("SHOW COLUMNS FROM drivers");
        $columns = [];
        while ($row = $result->fetch_assoc()) {
            $columns[$row['Field']] = $row;
        }

        // Start transaction for schema updates
        $conn->begin_transaction();

        try {
            // Add missing columns
            if (!isset($columns['email'])) {
                $conn->query("ALTER TABLE drivers ADD COLUMN email VARCHAR(100) NOT NULL DEFAULT ''");
            }
            if (!isset($columns['total_rides'])) {
                $conn->query("ALTER TABLE drivers ADD COLUMN total_rides INT DEFAULT 0");
            }
            if (!isset($columns['earnings'])) {
                $conn->query("ALTER TABLE drivers ADD COLUMN earnings DECIMAL(10,2) DEFAULT 0");
            }
            if (!isset($columns['rating'])) {
                $conn->query("ALTER TABLE drivers ADD COLUMN rating DECIMAL(3,2) DEFAULT 5.0");
            }
            if (!isset($columns['location'])) {
                $conn->query("ALTER TABLE drivers ADD COLUMN location VARCHAR(255) DEFAULT 'Visakhapatnam'");
            }
            if (!isset($columns['vehicle'])) {
                $conn->query("ALTER TABLE drivers ADD COLUMN vehicle VARCHAR(100)");
            }
            if (!isset($columns['created_at'])) {
                $conn->query("ALTER TABLE drivers ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
            }
            if (!isset($columns['updated_at'])) {
                $conn->query("ALTER TABLE drivers ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
            }

            // Update column names if they differ
            if (isset($columns['license_number']) && !isset($columns['license_no'])) {
                $conn->query("ALTER TABLE drivers CHANGE COLUMN license_number license_no VARCHAR(50)");
            }
            if (isset($columns['vehicle_id']) && !isset($columns['vehicle'])) {
                $conn->query("ALTER TABLE drivers CHANGE COLUMN vehicle_id vehicle VARCHAR(100)");
            }

            // Update status enum if needed
            if (isset($columns['status']) && strpos($columns['status']['Type'], 'active') !== false) {
                $conn->query("ALTER TABLE drivers MODIFY COLUMN status ENUM('available', 'busy', 'offline') DEFAULT 'available'");
                // Update status values
                $conn->query("UPDATE drivers SET status = 'available' WHERE status = 'active'");
                $conn->query("UPDATE drivers SET status = 'busy' WHERE status = 'on_trip'");
                $conn->query("UPDATE drivers SET status = 'offline' WHERE status = 'inactive'");
            }

            $conn->commit();
        } catch (Exception $e) {
            $conn->rollback();
            error_log("Failed to update drivers table schema: " . $e->getMessage());
        }
    }
} catch (Exception $e) {
    // Log error but continue - we'll handle no table case in the specific methods
    error_log("Error checking/creating drivers table: " . $e->getMessage());
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

// Handle different HTTP methods
switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        // List all drivers
        try {
            // Check if we need to filter by status
            $statusFilter = isset($_GET['status']) ? $_GET['status'] : null;
            $searchTerm = isset($_GET['search']) ? $_GET['search'] : null;
            
            // Start transaction
            $conn->begin_transaction();
            
            try {
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
                
                if (!$stmt) {
                    throw new Exception("Failed to prepare statement: " . $conn->error);
                }
                
                if (!$stmt->execute()) {
                    throw new Exception("Failed to execute statement: " . $stmt->error);
                }
                
                $result = $stmt->get_result();
                $drivers = [];
                
                while ($row = $result->fetch_assoc()) {
                    $drivers[] = $row;
                }
                
                // Commit transaction
                $conn->commit();
                
                sendJsonResponse([
                    'status' => 'success',
                    'data' => $drivers
                ]);
                
            } catch (Exception $e) {
                // Rollback transaction on error
                $conn->rollback();
                throw $e;
            }
            
        } catch (Exception $e) {
            sendJsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch drivers: ' . $e->getMessage()
            ], 500);
        }
        break;
        
    case 'POST':
        // Create new driver
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            // Validate driver data
            $errors = validateDriverData($data);
            if (!empty($errors)) {
                sendJsonResponse([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $errors
                ], 400);
            }
            
            // Start transaction
            $conn->begin_transaction();
            
            try {
                // Check if driver with same phone/email exists
                $checkStmt = $conn->prepare("SELECT id FROM drivers WHERE phone = ? OR email = ?");
                if (!$checkStmt) {
                    throw new Exception("Failed to prepare check statement: " . $conn->error);
                }
                
                $checkStmt->bind_param("ss", $data['phone'], $data['email']);
                if (!$checkStmt->execute()) {
                    throw new Exception("Failed to check existing driver: " . $checkStmt->error);
                }
                
                $checkResult = $checkStmt->get_result();
                if ($checkResult->num_rows > 0) {
                    throw new Exception("Driver with same phone or email already exists");
                }
                
                // Insert new driver
                $sql = "INSERT INTO drivers (name, phone, email, license_no, status, vehicle) VALUES (?, ?, ?, ?, ?, ?)";
                $stmt = $conn->prepare($sql);
                if (!$stmt) {
                    throw new Exception("Failed to prepare insert statement: " . $conn->error);
                }
                
                $status = $data['status'] ?? 'available';
                $stmt->bind_param("ssssss", 
                    $data['name'],
                    $data['phone'],
                    $data['email'],
                    $data['license_no'],
                    $status,
                    $data['vehicle']
                );
                
                if (!$stmt->execute()) {
                    throw new Exception("Failed to create driver: " . $stmt->error);
                }
                
                $newDriverId = $stmt->insert_id;
                
                // Fetch the created driver
                $getStmt = $conn->prepare("SELECT * FROM drivers WHERE id = ?");
                if (!$getStmt) {
                    throw new Exception("Failed to prepare select statement: " . $conn->error);
                }
                
                $getStmt->bind_param("i", $newDriverId);
                if (!$getStmt->execute()) {
                    throw new Exception("Failed to fetch created driver: " . $getStmt->error);
                }
                
                $result = $getStmt->get_result();
                $driver = $result->fetch_assoc();
                
                // Commit transaction
                $conn->commit();
                
                sendJsonResponse([
                    'status' => 'success',
                    'message' => 'Driver created successfully',
                    'data' => $driver
                ], 201);
                
            } catch (Exception $e) {
                // Rollback transaction on error
                $conn->rollback();
                throw $e;
            }
            
        } catch (Exception $e) {
            sendJsonResponse([
                'status' => 'error',
                'message' => 'Failed to create driver: ' . $e->getMessage()
            ], 500);
        }
        break;
        
    default:
        sendJsonResponse([
            'status' => 'error',
            'message' => 'Method not allowed'
        ], 405);
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
