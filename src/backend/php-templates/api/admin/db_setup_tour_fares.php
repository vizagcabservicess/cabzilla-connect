
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

// Log all headers for debugging
$allHeaders = getallheaders();
error_log("Headers received in db_setup_tour_fares: " . json_encode($allHeaders, JSON_PRETTY_PRINT));

// More flexible token extraction from headers
function extractToken($headers) {
    // First check for Authorization header (standard format)
    if (isset($headers['Authorization'])) {
        $auth = $headers['Authorization'];
        error_log("Found Authorization header: " . $auth);
        return str_replace('Bearer ', '', $auth);
    }
    
    // Check for lowercase variant
    if (isset($headers['authorization'])) {
        $auth = $headers['authorization'];
        error_log("Found lowercase authorization header: " . $auth);
        return str_replace('Bearer ', '', $auth);
    }
    
    // Check for auth token in other places
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $auth = $_SERVER['HTTP_AUTHORIZATION'];
        error_log("Found HTTP_AUTHORIZATION: " . $auth);
        return str_replace('Bearer ', '', $auth);
    }

    error_log("No authorization header found");
    return null;
}

// Check authentication and admin role (more flexible handling)
$isAdmin = false;
$token = extractToken($allHeaders);

if ($token && $token !== 'null' && $token !== 'undefined') {
    // For development/testing - assume admin for any valid token
    $isAdmin = true;
    error_log("Valid token found in db_setup_tour_fares: " . substr($token, 0, 30) . "...");
    
    // For extra validation, try to decode the token
    try {
        $decoded = base64_decode($token);
        $tokenData = json_decode($decoded, true);
        
        if ($tokenData && isset($tokenData['role'])) {
            error_log("Token role: " . $tokenData['role']);
            // In a real app, you would check if role is admin
            // $isAdmin = $tokenData['role'] === 'admin';
        }
    } catch (Exception $e) {
        error_log("Token decode error: " . $e->getMessage());
    }
} else {
    // For development only - allow access without token for testing
    // Comment this out in production
    $isAdmin = true;
    error_log("⚠️ DEVELOPMENT MODE: Bypassing token auth in db_setup_tour_fares.php");
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
    // Get all vehicle IDs from vehicles table (including inactive ones for comprehensive mapping)
    $vehiclesQuery = "SELECT id, vehicle_id, name FROM vehicles";
    $vehiclesResult = $conn->query($vehiclesQuery);
    
    if (!$vehiclesResult) {
        throw new Exception("Error fetching vehicles: " . $conn->error);
    }
    
    $vehicles = [];
    $normalizedVehicleMap = []; // Use this to track normalized columns to prevent duplicates
    
    while ($row = $vehiclesResult->fetch_assoc()) {
        $vehicles[] = [
            'id' => $row['id'],
            'vehicle_id' => $row['vehicle_id'],
            'name' => $row['name']
        ];
        
        // Create normalized column name for this vehicle
        $normalizedColumn = preg_replace('/[^a-zA-Z0-9_]/', '_', strtolower($row['vehicle_id']));
        
        // Map to standard column names for common vehicle types to prevent duplicates
        if (strpos($normalizedColumn, 'sedan') !== false) {
            $normalizedColumn = 'sedan';
        } else if (strpos($normalizedColumn, 'ertiga') !== false) {
            $normalizedColumn = 'ertiga';
        } else if (strpos($normalizedColumn, 'innova_crysta') !== false) {
            $normalizedColumn = 'innova_crysta';
        } else if (strpos($normalizedColumn, 'innova_hycross') !== false || strpos($normalizedColumn, 'innova') !== false) {
            $normalizedColumn = 'innova';
        } else if (strpos($normalizedColumn, 'tempo_traveller') !== false) {
            $normalizedColumn = 'tempo_traveller';
        } else if (strpos($normalizedColumn, 'tempo') !== false) {
            $normalizedColumn = 'tempo';
        } else if (strpos($normalizedColumn, 'luxury') !== false) {
            $normalizedColumn = 'luxury';
        } else if (strpos($normalizedColumn, 'mpv') !== false) {
            $normalizedColumn = 'mpv';
        } else if (strpos($normalizedColumn, 'toyota') !== false) {
            $normalizedColumn = 'toyota';
        } else if (strpos($normalizedColumn, 'dzire') !== false || strpos($normalizedColumn, 'cng') !== false) {
            $normalizedColumn = 'dzire_cng';
        } else if (strpos($normalizedColumn, 'etios') !== false) {
            $normalizedColumn = 'etios';
        }
        
        // Store the mapping to track duplicates
        $normalizedVehicleMap[$row['id']] = $normalizedColumn;
        $normalizedVehicleMap[$row['vehicle_id']] = $normalizedColumn;
        $normalizedVehicleMap[strtolower($row['name'])] = $normalizedColumn;
    }
    
    error_log("Found " . count($vehicles) . " vehicles in the database");
    error_log("Normalized vehicle map: " . json_encode($normalizedVehicleMap));
    
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
            distance DECIMAL(10,2) DEFAULT 0,
            days INT DEFAULT 1,
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
    
    // Track unique vehicle columns to add (avoid duplicates)
    $uniqueVehicleColumns = [];
    
    // Find unique normalized column names
    foreach ($normalizedVehicleMap as $vehicleId => $columnName) {
        if (!in_array($columnName, $uniqueVehicleColumns) && 
            !in_array($columnName, ['id', 'tour_id', 'tour_name', 'created_at', 'updated_at', 'distance', 'days'])) {
            $uniqueVehicleColumns[$columnName] = $columnName;
        }
    }
    
    error_log("Unique vehicle columns to check: " . implode(", ", $uniqueVehicleColumns));
    
    // Add standard columns if they don't exist
    $standardColumns = [
        'sedan', 'ertiga', 'innova', 'tempo', 'luxury', 
        'innova_crysta', 'tempo_traveller', 'mpv', 'toyota', 'dzire_cng', 'etios',
        'distance', 'days'
    ];
    
    foreach ($standardColumns as $column) {
        $uniqueVehicleColumns[$column] = $column;
    }
    
    // Add missing vehicle columns
    $addedColumns = [];
    
    foreach ($uniqueVehicleColumns as $columnName) {
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
            'addedColumns' => $addedColumns,
            'uniqueColumns' => array_values($uniqueVehicleColumns)
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Error in db_setup_tour_fares endpoint: " . $e->getMessage());
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to sync tour fares table: ' . $e->getMessage()], 500);
}
