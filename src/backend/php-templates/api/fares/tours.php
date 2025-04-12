
<?php
require_once '../../config.php';

// Allow only GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(['error' => 'Method not allowed'], 405);
}

// Connect to database
$conn = getDbConnection();

try {
    // Get ONLY vehicles from the vehicles table
    $vehiclesQuery = "SELECT id, vehicle_id, name FROM vehicles WHERE is_active = 1 ORDER BY name ASC";
    $vehiclesResult = $conn->query($vehiclesQuery);
    
    $vehicleMapping = [];
    $normalizedColumns = [];
    
    // Log for debugging
    error_log("Tours API: Fetching ONLY from vehicles table");
    
    // Build vehicle mapping ONLY from vehicles table
    if ($vehiclesResult) {
        while ($vehicle = $vehiclesResult->fetch_assoc()) {
            $id = $vehicle['id'];
            $vehicleId = $vehicle['vehicle_id'];
            $name = $vehicle['name'];
            
            if (empty($vehicleId)) continue;
            
            // Create normalized column name based on vehicle_id for consistent mapping
            $normalizedColumn = strtolower(preg_replace('/[^a-zA-Z0-9_]/', '_', $vehicleId));
            
            // Add to mapping
            $vehicleMapping[$id] = $normalizedColumn;
            $vehicleMapping[$vehicleId] = $normalizedColumn;
            
            // Also add lowercase versions
            $vehicleMapping[strtolower($vehicleId)] = $normalizedColumn;
            
            // Add to normalized columns
            $normalizedColumns[$normalizedColumn] = $vehicleId;
            
            error_log("Tours API: Vehicle mapping: {$id} -> {$normalizedColumn} (from vehicle_id: {$vehicleId})");
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
        
        // Process columns that match our vehicle mapping from the vehicles table ONLY
        foreach ($row as $key => $value) {
            // Skip non-vehicle columns
            if (in_array($key, ['id', 'tour_id', 'tour_name', 'distance', 'days', 'created_at', 'updated_at'])) {
                continue;
            }
            
            // Only include columns that match our vehicle mapping from the vehicles table
            $foundMatch = false;
            foreach ($normalizedColumns as $normalizedVehicleColumn => $originalVehicleId) {
                if (strtolower($key) === strtolower($normalizedVehicleColumn)) {
                    $tourFare[$normalizedVehicleColumn] = floatval($value);
                    $foundMatch = true;
                    error_log("Tours API: Found matching column {$key} for vehicle {$originalVehicleId}");
                    break;
                }
            }
            
            // Log skipped columns for debugging
            if (!$foundMatch) {
                error_log("Tours API: Skipping column {$key} as it doesn't match any vehicle from the vehicles table");
            }
        }
        
        $tourFares[] = $tourFare;
    }

    // Send response as a simple array and add original vehicle IDs for debugging
    sendJsonResponse([
        'fares' => $tourFares,
        'vehicleMappings' => $normalizedColumns
    ]);
    
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
