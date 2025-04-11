
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, Cache-Control, Pragma');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Enhanced debugging
error_log("tour-fares.php called with method: " . $_SERVER['REQUEST_METHOD']);

// Get raw input data
$rawInput = file_get_contents('php://input');
error_log("Raw input data: " . $rawInput);

// Check authentication and admin role
$headers = getallheaders();
$isAdmin = false;

// Extract token from authorization header
$token = null;
if (isset($headers['Authorization']) || isset($headers['authorization'])) {
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    error_log("Found authorization header: " . $authHeader);
    
    // Extract token from Bearer format
    $token = str_replace('Bearer ', '', $authHeader);
    
    // For development/testing - assume admin for now
    if (!empty($token) && $token !== 'null' && $token !== 'undefined') {
        $isAdmin = true;
        error_log("Valid token found: " . substr($token, 0, 15) . "...");
    } else {
        error_log("Invalid token found in Authorization header: " . $token);
    }
} else {
    error_log("No authorization header found in the request");
}

if (!$isAdmin) {
    sendJsonResponse(['status' => 'error', 'message' => 'Unauthorized. Admin privileges required or invalid authentication token.'], 403);
    exit;
}

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
    exit;
}

try {
    // First, ensure the tour_fares table has columns for all vehicle types
    $vehiclesQuery = "SELECT id, vehicle_id, name FROM vehicles WHERE is_active = 1";
    $vehiclesResult = $conn->query($vehiclesQuery);
    
    // Get existing columns in tour_fares table
    $columnsQuery = "SHOW COLUMNS FROM tour_fares";
    $columnsResult = $conn->query($columnsQuery);
    
    if ($columnsResult) {
        $existingColumns = [];
        while ($column = $columnsResult->fetch_assoc()) {
            $existingColumns[] = $column['Field'];
        }
        error_log("Existing tour_fares columns: " . json_encode($existingColumns));
    }
    
    // Add columns for each vehicle if needed
    if ($vehiclesResult) {
        while ($row = $vehiclesResult->fetch_assoc()) {
            // Normalize the column name
            $columnName = strtolower(preg_replace('/[^a-zA-Z0-9_]/', '_', $row['vehicle_id']));
            
            // If column doesn't exist, add it
            if (!in_array($columnName, $existingColumns)) {
                try {
                    $alterTableSql = "ALTER TABLE tour_fares ADD COLUMN $columnName DECIMAL(10,2) DEFAULT 0.00";
                    error_log("Adding new column for vehicle {$row['name']}: $alterTableSql");
                    $conn->query($alterTableSql);
                } catch (Exception $e) {
                    error_log("Error adding column $columnName: " . $e->getMessage());
                }
            }
        }
    }
    
    // GET request - Return all tour fares
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Query tour fares from the database
        $query = "SELECT * FROM tour_fares";
        
        // Add filters if provided
        if (isset($_GET['tourId'])) {
            $tourId = $_GET['tourId'];
            $query .= " WHERE tour_id = '" . $conn->real_escape_string($tourId) . "'";
        }
        
        $result = $conn->query($query);
        
        if (!$result) {
            throw new Exception("Database query failed: " . $conn->error);
        }
        
        $tourFares = [];
        
        while ($row = $result->fetch_assoc()) {
            // Convert database columns to camelCase for frontend
            $tourFare = [
                'id' => intval($row['id']),
                'tourId' => $row['tour_id'],
                'tourName' => $row['tour_name']
            ];
            
            // Add all vehicle price columns
            foreach ($row as $key => $value) {
                if (!in_array($key, ['id', 'tour_id', 'tour_name', 'created_at', 'updated_at'])) {
                    // Keep original column name for database compatibility
                    $tourFare[$key] = floatval($value);
                }
            }
            
            $tourFares[] = $tourFare;
        }
        
        sendJsonResponse($tourFares);
    }
    // POST request to update existing tour fare
    else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Logic for updating tour fare
        // Redirect to the existing endpoint
        include_once __DIR__ . '/fares-update.php';
        exit;
    }
    // PUT request to add a new tour fare
    else if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        // Logic for adding a new tour fare
        // Redirect to the existing endpoint
        include_once __DIR__ . '/fares-update.php';
        exit;
    }
    // DELETE request to remove a tour fare
    else if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        // Logic for deleting a tour fare
        // Redirect to the existing endpoint
        include_once __DIR__ . '/fares-update.php';
        exit;
    }
    else {
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    error_log("Error in tour-fares.php: " . $e->getMessage());
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to process request: ' . $e->getMessage()], 500);
}

// Helper function
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}
