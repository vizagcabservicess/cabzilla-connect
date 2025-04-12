
<?php
require_once '../../config.php';

// Allow only GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(['error' => 'Method not allowed'], 405);
}

// Connect to database
$conn = getDbConnection();

try {
    // Get all vehicle types from the vehicles table ONLY
    $vehiclesQuery = "SELECT id, vehicle_id, name FROM vehicles WHERE is_active = 1";
    $vehiclesResult = $conn->query($vehiclesQuery);
    
    $vehicleMapping = [];
    $normalizedColumns = [];
    
    // Log for debugging
    error_log("Fetching vehicles from ONLY the vehicles table for tours.php");
    
    // Build complete vehicle mapping from vehicles table only
    if ($vehiclesResult) {
        while ($vehicle = $vehiclesResult->fetch_assoc()) {
            $id = $vehicle['id'];
            $vehicleId = $vehicle['vehicle_id'];
            $name = $vehicle['name'];
            
            if (empty($vehicleId) && empty($name)) continue;
            
            // Create normalized column name
            $normalizedColumn = strtolower(preg_replace('/[^a-zA-Z0-9_]/', '_', $vehicleId ?: $name));
            
            // Add to mapping
            $vehicleMapping[$id] = $normalizedColumn;
            $vehicleMapping[$vehicleId] = $normalizedColumn;
            $vehicleMapping[$name] = $normalizedColumn;
            $vehicleMapping[strtolower($vehicleId)] = $normalizedColumn;
            $vehicleMapping[strtolower($name)] = $normalizedColumn;
            
            // Add to normalized columns
            $normalizedColumns[$normalizedColumn] = $normalizedColumn;
            
            error_log("Vehicle mapping: {$id} -> {$normalizedColumn}");
        }
    }
    
    // Get all tour fares
    $stmt = $conn->prepare("SELECT * FROM tour_fares ORDER BY tour_name");
    $stmt->execute();
    $result = $stmt->get_result();

    $tourFares = [];
    while ($row = $result->fetch_assoc()) {
        // Convert numeric strings to actual numbers
        $tourFare = [
            'id' => intval($row['id']),
            'tourId' => $row['tour_id'],
            'tourName' => $row['tour_name'],
            'distance' => isset($row['distance']) ? floatval($row['distance']) : 0,
            'days' => isset($row['days']) ? intval($row['days']) : 1
        ];
        
        // Process all vehicle columns from the row
        foreach ($row as $key => $value) {
            // Skip non-vehicle columns
            if (in_array($key, ['id', 'tour_id', 'tour_name', 'distance', 'days', 'created_at', 'updated_at'])) {
                continue;
            }
            
            // Add any numeric value that might be a vehicle price
            if (is_numeric($value)) {
                $tourFare[$key] = floatval($value);
            }
        }
        
        $tourFares[] = $tourFare;
    }

    // Send response as a simple array
    sendJsonResponse($tourFares);
} catch (Exception $e) {
    logError("Error fetching tour fares", ['error' => $e->getMessage()]);
    sendJsonResponse(['error' => 'Failed to fetch tour fares: ' . $e->getMessage()], 500);
}

function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function logError($message, $data = []) {
    $logFile = __DIR__ . '/../../logs/api_error.log';
    $timestamp = date('Y-m-d H:i:s');
    $logData = "[$timestamp] $message: " . json_encode($data) . PHP_EOL;
    file_put_contents($logFile, $logData, FILE_APPEND);
    error_log("$message: " . json_encode($data));
}
