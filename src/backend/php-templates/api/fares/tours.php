
<?php
require_once '../../config.php';

// Allow only GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(['error' => 'Method not allowed'], 405);
}

// Connect to database
$conn = getDbConnection();

try {
    // Get all vehicle types to ensure consistent mapping
    $vehiclesQuery = "SELECT id, vehicle_id, name FROM vehicles";
    $vehiclesResult = $conn->query($vehiclesQuery);
    
    $vehicleMapping = [];
    $normalizedColumns = [
        'sedan' => 'sedan',
        'ertiga' => 'ertiga',
        'innova' => 'innova',
        'tempo' => 'tempo',
        'luxury' => 'luxury',
        'innova_crysta' => 'innova_crysta',
        'tempo_traveller' => 'tempo_traveller',
        'mpv' => 'mpv',
        'toyota' => 'toyota',
        'dzire_cng' => 'dzire_cng',
        'etios' => 'etios'
    ];
    
    // Build complete vehicle mapping from database
    if ($vehiclesResult) {
        while ($vehicle = $vehiclesResult->fetch_assoc()) {
            $id = $vehicle['id'];
            $vehicleId = $vehicle['vehicle_id'];
            $name = $vehicle['name'];
            
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
        
        // Add all vehicle types from normalized columns
        foreach ($normalizedColumns as $columnKey => $columnName) {
            if (isset($row[$columnName])) {
                $tourFare[$columnKey] = floatval($row[$columnName]);
            } else {
                $tourFare[$columnKey] = 0;
            }
        }
        
        // Add any additional vehicle types that might be in the database
        foreach ($row as $key => $value) {
            // Skip non-vehicle columns and ones we've already processed
            if (in_array($key, ['id', 'tour_id', 'tour_name', 'distance', 'days', 'created_at', 'updated_at'])) {
                continue;
            }
            
            // Skip columns we've already added
            if (in_array($key, array_values($normalizedColumns))) {
                continue;
            }
            
            // Add any numeric value that might be a vehicle price
            if (is_numeric($value)) {
                $tourFare[$key] = floatval($value);
            }
        }
        
        $tourFares[] = $tourFare;
    }

    // Send response as a simple array, not an object with numbered keys
    sendJsonResponse($tourFares);
} catch (Exception $e) {
    logError("Error fetching tour fares", ['error' => $e->getMessage()]);
    sendJsonResponse(['error' => 'Failed to fetch tour fares: ' . $e->getMessage()], 500);
}

function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
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
