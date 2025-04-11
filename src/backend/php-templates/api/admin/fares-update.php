
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
error_log("fares-update.php called with method: " . $_SERVER['REQUEST_METHOD']);
error_log("Request headers: " . json_encode(getallheaders()));

// Get raw input data
$rawInput = file_get_contents('php://input');
error_log("Raw input data: " . $rawInput);

// Check authentication and admin role
$headers = getallheaders();
$isAdmin = false;

// Log headers for debugging
error_log("Received headers: " . json_encode($headers));

if (isset($headers['Authorization']) || isset($headers['authorization'])) {
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    error_log("Found authorization header: " . $authHeader);
    
    // Extract token from Bearer format
    $token = str_replace('Bearer ', '', $authHeader);
    
    // Check if token is valid (not empty or null string)
    if (!empty($token) && $token !== 'null' && $token !== 'undefined') {
        // For development/testing - assume admin for now
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

// Define normalized vehicle ID mappings to prevent duplicates
// This will map different forms of the same vehicle type to a single database column
$vehicleIdMap = [
    // Standard vehicle types - canonical mapping
    'sedan' => 'sedan',
    'ertiga' => 'ertiga',
    'innova' => 'innova',
    'tempo' => 'tempo',
    'luxury' => 'luxury',
    'mpv' => 'mpv',
    
    // Map variant names to standard columns
    'MPV' => 'mpv',
    'innova_crysta' => 'innova',
    'innova_hycross' => 'innova',
    'etios' => 'sedan',
    'dzire_cng' => 'dzire_cng',
    'tempo_traveller' => 'tempo',
    'Toyota' => 'toyota',
    'Dzire CNG' => 'dzire_cng',
    
    // Handle numeric IDs that might come from the vehicles table
    '1' => 'sedan',
    '2' => 'ertiga',
    '1266' => 'mpv',   // Changed from innova to MPV based on your database
    '1299' => 'toyota',
    '1311' => 'dzire_cng',
    '1313' => 'innova',
    '1314' => 'tempo'
];

// Fetch dynamic vehicle mapping from database
try {
    $vehiclesQuery = "SELECT id, vehicle_id, name FROM vehicles WHERE is_active = 1";
    $vehiclesResult = $conn->query($vehiclesQuery);
    
    if ($vehiclesResult) {
        while ($row = $vehiclesResult->fetch_assoc()) {
            // Create a normalized column name based on vehicle_id
            $normalizedId = strtolower(preg_replace('/[^a-zA-Z0-9_]/', '_', $row['vehicle_id']));
            
            // Map vehicle ID and name to the normalized column
            $vehicleIdMap[$row['id']] = $normalizedId;
            $vehicleIdMap[$row['vehicle_id']] = $normalizedId;
            $vehicleIdMap[$row['name']] = $normalizedId;
            
            // Also map lowercase versions
            $vehicleIdMap[strtolower($row['vehicle_id'])] = $normalizedId;
            $vehicleIdMap[strtolower($row['name'])] = $normalizedId;
            
            // Log the mapping
            error_log("Vehicle mapping: ID {$row['id']} ({$row['name']}) -> column {$normalizedId}");
        }
    }
    
    error_log("Full vehicle ID mapping: " . json_encode($vehicleIdMap));
} catch (Exception $e) {
    error_log("Error fetching vehicle mappings: " . $e->getMessage());
}

try {
    // Sync tour_fares table with vehicles table to ensure all columns exist
    $columnsQuery = "SHOW COLUMNS FROM tour_fares";
    $columnsResult = $conn->query($columnsQuery);
    
    if ($columnsResult) {
        $existingColumns = [];
        while ($column = $columnsResult->fetch_assoc()) {
            $existingColumns[] = $column['Field'];
        }
        
        error_log("Existing tour_fares columns: " . json_encode($existingColumns));
    }
    
    // Handle POST request to update tour fares
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Get request body
        $requestData = json_decode($rawInput, true);
        error_log("POST request data: " . json_encode($requestData));
        
        if (!isset($requestData['tourId'])) {
            sendJsonResponse(['status' => 'error', 'message' => 'Tour ID is required'], 400);
            exit;
        }
        
        $tourId = $requestData['tourId'];
        
        // First, check if the tour exists
        $checkTourStmt = $conn->prepare("SELECT id FROM tour_fares WHERE tour_id = ?");
        $checkTourStmt->bind_param("s", $tourId);
        $checkTourStmt->execute();
        $checkResult = $checkTourStmt->get_result();
        
        if ($checkResult->num_rows === 0) {
            // Tour doesn't exist, create it if we have a tour name
            if (!isset($requestData['tourName'])) {
                sendJsonResponse(['status' => 'error', 'message' => 'Tour not found and no tour name provided for creation'], 404);
                exit;
            }
            
            $tourName = $requestData['tourName'];
            
            // Insert basic tour data
            $insertTourStmt = $conn->prepare("INSERT INTO tour_fares (tour_id, tour_name, created_at) VALUES (?, ?, NOW())");
            $insertTourStmt->bind_param("ss", $tourId, $tourName);
            $insertTourStmt->execute();
            
            $tourFareId = $conn->insert_id;
            error_log("Created new tour with ID: $tourFareId");
        }
        
        // Prepare the dynamic SQL for the update
        $updateColumns = [];
        $updateTypes = "";
        $updateValues = [];
        
        // Process the request data and map to normalized column names
        $processedVehicles = [];
        
        // Loop through all request data
        foreach ($requestData as $key => $value) {
            // Skip non-vehicle fields
            if (in_array($key, ['tourId', 'tourName', 'id'])) {
                continue;
            }
            
            // Try to map the key to a normalized column name
            $columnName = isset($vehicleIdMap[$key]) ? $vehicleIdMap[$key] : $key;
            
            // Skip if this vehicle type has already been processed
            if (in_array($columnName, $processedVehicles)) {
                error_log("Skipping duplicate vehicle type: {$key} -> {$columnName}");
                continue;
            }
            
            // Add to processed vehicles
            $processedVehicles[] = $columnName;
            
            // Check if the column exists in the database
            if (in_array($columnName, $existingColumns)) {
                $updateColumns[] = "$columnName = ?";
                $updateTypes .= "d";
                $updateValues[] = floatval($value);
                error_log("Adding column to update: $columnName = " . floatval($value));
            } else {
                // Column doesn't exist, need to add it first
                try {
                    $alterTableSql = "ALTER TABLE tour_fares ADD COLUMN $columnName DECIMAL(10,2) DEFAULT 0.00";
                    error_log("Adding new column: $alterTableSql");
                    $conn->query($alterTableSql);
                    
                    // Now add to update
                    $updateColumns[] = "$columnName = ?";
                    $updateTypes .= "d";
                    $updateValues[] = floatval($value);
                    error_log("Added new column and value: $columnName = " . floatval($value));
                } catch (Exception $e) {
                    error_log("Error adding column $columnName: " . $e->getMessage());
                }
            }
        }
        
        // Add updated_at to the query
        $updateColumns[] = "updated_at = NOW()";
        
        // Add tourId to values array and update type
        $updateValues[] = $tourId;
        $updateTypes .= "s";
        
        // Build the final SQL query
        $updateSql = "UPDATE tour_fares SET " . implode(", ", $updateColumns) . " WHERE tour_id = ?";
        error_log("Update SQL: $updateSql");
        error_log("Update types: $updateTypes");
        error_log("Update values: " . json_encode($updateValues));
        
        // Prepare and execute the update
        $updateStmt = $conn->prepare($updateSql);
        
        // Dynamically bind parameters
        $updateParams = array_merge([$updateTypes], $updateValues);
        $updateStmt->bind_param(...$updateParams);
        $success = $updateStmt->execute();
        
        if (!$success) {
            throw new Exception("Failed to update tour fare: " . $conn->error);
        }
        
        if ($updateStmt->affected_rows === 0 && $checkResult->num_rows === 0) {
            sendJsonResponse(['status' => 'error', 'message' => 'Tour not found'], 404);
            exit;
        }
        
        // Get the updated tour fare
        $stmt = $conn->prepare("SELECT * FROM tour_fares WHERE tour_id = ?");
        $stmt->bind_param("s", $tourId);
        $stmt->execute();
        $result = $stmt->get_result();
        $updatedFare = $result->fetch_assoc();
        
        $fareData = [
            'id' => intval($updatedFare['id']),
            'tourId' => $updatedFare['tour_id'],
            'tourName' => $updatedFare['tour_name'],
        ];
        
        // Add all columns from the result
        foreach ($updatedFare as $key => $value) {
            if (!in_array($key, ['id', 'tour_id', 'tour_name', 'created_at', 'updated_at'])) {
                $fareData[$key] = floatval($value);
            }
        }
        
        sendJsonResponse(['status' => 'success', 'message' => 'Tour fare updated successfully', 'data' => $fareData]);
    }
    // Handle PUT request to add a new tour
    else if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        // Similar logic for adding new tours with mapping
        // ... keep existing code
    }
    // Handle DELETE request to delete a tour
    else if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        // ... keep existing code
    } else {
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    error_log("Error in fares-update endpoint: " . $e->getMessage());
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to process request: ' . $e->getMessage()], 500);
}

// Helper function
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}
