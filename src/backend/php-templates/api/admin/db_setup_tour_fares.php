
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, Cache-Control, Pragma, Expires');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Enhanced debugging
error_log("db_setup_tour_fares.php called with method: " . $_SERVER['REQUEST_METHOD']);
error_log("Headers received: " . json_encode(getallheaders()));

// Check authentication and admin role
$headers = getallheaders();
$isAdmin = false;

if (isset($headers['Authorization']) || isset($headers['authorization'])) {
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    $token = str_replace('Bearer ', '', $authHeader);
    
    if (!empty($token) && $token !== 'null' && $token !== 'undefined') {
        // For development/testing - assume admin for now
        $isAdmin = true;
        error_log("Valid token found in db_setup_tour_fares: " . substr($token, 0, 15) . "...");
    } else {
        error_log("Empty or invalid token found in db_setup_tour_fares: " . $token);
    }
} else {
    error_log("No Authorization header found in db_setup_tour_fares");
}

if (!$isAdmin) {
    error_log("Unauthorized attempt to access db_setup_tour_fares.php - missing or invalid token");
    sendJsonResponse(['status' => 'error', 'message' => 'Unauthorized. Admin privileges required.'], 403);
    exit;
}

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    error_log("Database connection failed in db_setup_tour_fares.php");
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
    exit;
}

try {
    // Get all vehicle IDs from vehicles table
    $vehiclesQuery = "SELECT id, vehicle_id, name FROM vehicles";
    $vehiclesResult = $conn->query($vehiclesQuery);
    
    if (!$vehiclesResult) {
        throw new Exception("Error fetching vehicles: " . $conn->error);
    }
    
    $vehicles = [];
    while ($row = $vehiclesResult->fetch_assoc()) {
        $vehicles[] = [
            'id' => $row['id'],
            'vehicle_id' => $row['vehicle_id'],
            'name' => $row['name']
        ];
    }
    
    error_log("Found " . count($vehicles) . " vehicles in the database");
    
    // Check if tour_fares table exists
    $checkTableQuery = "SHOW TABLES LIKE 'tour_fares'";
    $tableResult = $conn->query($checkTableQuery);
    
    if ($tableResult->num_rows == 0) {
        // Create tour_fares table if it doesn't exist
        $createTableSQL = "
        CREATE TABLE tour_fares (
            id INT AUTO_INCREMENT PRIMARY KEY,
            tour_id VARCHAR(100) NOT NULL UNIQUE,
            tour_name VARCHAR(255) NOT NULL,
            sedan DECIMAL(10,2) DEFAULT 0,
            ertiga DECIMAL(10,2) DEFAULT 0,
            innova DECIMAL(10,2) DEFAULT 0,
            tempo DECIMAL(10,2) DEFAULT 0,
            luxury DECIMAL(10,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )";
        
        if (!$conn->query($createTableSQL)) {
            throw new Exception("Failed to create tour_fares table: " . $conn->error);
        }
        
        error_log("Created tour_fares table");
    } else {
        error_log("tour_fares table already exists");
    }
    
    // Get existing columns from tour_fares table
    $columnsQuery = "SHOW COLUMNS FROM tour_fares";
    $columnsResult = $conn->query($columnsQuery);
    
    if (!$columnsResult) {
        throw new Exception("Error fetching tour_fares columns: " . $conn->error);
    }
    
    $existingColumns = [];
    while ($column = $columnsResult->fetch_assoc()) {
        $existingColumns[] = $column['Field'];
    }
    
    error_log("Existing columns in tour_fares: " . implode(", ", $existingColumns));
    
    // Add missing vehicle columns
    $addedColumns = [];
    
    foreach ($vehicles as $vehicle) {
        // Map vehicle IDs to database-safe column names
        $columnName = preg_replace('/[^a-zA-Z0-9_]/', '_', strtolower($vehicle['vehicle_id']));
        
        // Skip common columns that should already exist
        if (in_array($columnName, ['id', 'tour_id', 'tour_name', 'created_at', 'updated_at'])) {
            continue;
        }
        
        // Check if column already exists
        if (!in_array($columnName, $existingColumns)) {
            $alterTableSQL = "ALTER TABLE tour_fares ADD COLUMN `{$columnName}` DECIMAL(10,2) DEFAULT 0";
            
            if (!$conn->query($alterTableSQL)) {
                error_log("Failed to add column {$columnName}: " . $conn->error);
            } else {
                $addedColumns[] = $columnName;
                error_log("Added column {$columnName} to tour_fares table");
            }
        }
    }
    
    // Send response with success message and details
    sendJsonResponse([
        'status' => 'success',
        'message' => 'Tour fares table sync completed',
        'data' => [
            'vehicles' => $vehicles,
            'existingColumns' => $existingColumns,
            'addedColumns' => $addedColumns
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Error in db_setup_tour_fares endpoint: " . $e->getMessage());
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to sync tour fares table: ' . $e->getMessage()], 500);
}

// Helper function
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}
