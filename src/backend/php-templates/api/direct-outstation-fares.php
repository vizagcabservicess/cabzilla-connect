
<?php
// CORS headers for API endpoints
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory if it doesn't exist
$logDir = __DIR__ . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

$logFile = $logDir . '/direct-outstation-fares.log';
$timestamp = date('Y-m-d H:i:s');

// Function to get database connection
function getDbConnection() {
    $host = 'localhost';
    $dbname = 'u644605165_db_be';
    $username = 'u644605165_usr_be';
    $password = 'Vizag@1213';
    
    try {
        $conn = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $conn;
    } catch (PDOException $e) {
        file_put_contents($GLOBALS['logFile'], "[$timestamp] Database connection error: " . $e->getMessage() . "\n", FILE_APPEND);
        throw new Exception("Database connection error: " . $e->getMessage());
    }
}

// Normalize vehicle ID function
function normalizeVehicleId($vehicleId) {
    if (!$vehicleId) return null;
    // Convert to lowercase and replace spaces and special chars with underscores
    $normalized = strtolower(preg_replace('/[^a-zA-Z0-9_]/', '_', trim($vehicleId)));
    
    // If it's "innova_crysta" or similar variations, standardize it
    if (strpos($normalized, 'innova') !== false) {
        return 'innova_crysta';
    }
    
    return $normalized;
}

try {
    // Get parameters from query string
    $vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : 
                (isset($_GET['vehicleId']) ? $_GET['vehicleId'] : null);
    $tripMode = isset($_GET['trip_mode']) ? $_GET['trip_mode'] : 
               (isset($_GET['tripMode']) ? $_GET['tripMode'] : 'one-way');
    $distance = isset($_GET['distance']) ? (float)$_GET['distance'] : 0;
    
    // Normalize vehicle ID
    $originalVehicleId = $vehicleId;
    $vehicleId = normalizeVehicleId($vehicleId);
    
    // Log request
    file_put_contents($logFile, "[$timestamp] Outstation fares request: originalVehicleId=$originalVehicleId, normalizedVehicleId=$vehicleId, tripMode=$tripMode, distance=$distance\n", FILE_APPEND);
    
    if (!$vehicleId) {
        throw new Exception("Vehicle ID is required");
    }
    
    // Connect to database
    $conn = getDbConnection();
    
    // Query outstation_fares by normalized vehicle_id
    $query = "SELECT * FROM outstation_fares WHERE LOWER(REPLACE(vehicle_id, ' ', '_')) = :vehicle_id";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':vehicle_id', $vehicleId);
    
    // Log the query and parameters
    file_put_contents($logFile, "[$timestamp] SQL Query: $query\n", FILE_APPEND);
    file_put_contents($logFile, "[$timestamp] Parameters: vehicleId=$vehicleId\n", FILE_APPEND);
    
    $stmt->execute();
    
    // Fetch result
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Log query result
    file_put_contents($logFile, "[$timestamp] Query result: " . json_encode($result) . "\n", FILE_APPEND);
    
    if ($result) {
        // Determine pricing variables
        $basePrice = (float)$result['base_price'] ?? 0;
        $pricePerKm = (float)$result['price_per_km'] ?? 0;
        $driverAllowance = (float)$result['driver_allowance'] ?? 0;
        
        // Calculate total price with minimums
        $minimumKm = 300; // minimum distance covered
        $calculatedPrice = 0;
        
        if ($tripMode === 'round-trip') {
            // For round-trip, calculate with the provided distance * 2
            $effectiveDistance = $distance * 2;
            $roundTripPerKm = $pricePerKm * 0.85; // 15% discount for round trip
            $roundTripBase = $basePrice * 0.9; // 10% discount on base price
            
            if ($effectiveDistance < $minimumKm) {
                $calculatedPrice = $roundTripBase + $driverAllowance;
            } else {
                $extraDistance = $effectiveDistance - $minimumKm;
                $extraDistanceFare = $extraDistance * $roundTripPerKm;
                $calculatedPrice = $roundTripBase + $extraDistanceFare + $driverAllowance;
            }
        } else {
            // For one-way trips, calculate with the distance * 2 (for driver's return)
            $effectiveDistance = $distance * 2;
            
            if ($effectiveDistance > $minimumKm) {
                $extraDistance = $effectiveDistance - $minimumKm;
                $extraDistanceFare = $extraDistance * $pricePerKm;
                $calculatedPrice = $basePrice + $extraDistanceFare + $driverAllowance;
            } else {
                $calculatedPrice = $basePrice + $driverAllowance;
            }
        }
        
        // Format fare breakdown
        $fare = [
            'vehicleId' => $result['vehicle_id'],
            'basePrice' => $basePrice,
            'pricePerKm' => $pricePerKm,
            'driverAllowance' => $driverAllowance,
            'totalPrice' => $calculatedPrice,
            'tripMode' => $tripMode,
            'distance' => $distance,
            'breakdown' => [
                'Base fare' => $basePrice,
                'Distance charge' => $calculatedPrice - $basePrice - $driverAllowance,
                'Driver allowance' => $driverAllowance
            ]
        ];
        
        // Return success response with fare data
        echo json_encode([
            'status' => 'success',
            'message' => 'Outstation fares retrieved successfully',
            'fare' => $fare
        ]);
        
    } else {
        // No result found for this vehicle ID, log this
        file_put_contents($logFile, "[$timestamp] No outstation fare found for vehicle ID: $vehicleId\n", FILE_APPEND);
        
        // Try to find a matching vehicle with similar name (fuzzy match)
        $fuzzyQuery = "SELECT vehicle_id FROM outstation_fares LIMIT 1";
        $fuzzyStmt = $conn->prepare($fuzzyQuery);
        $fuzzyStmt->execute();
        $anyVehicle = $fuzzyStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($anyVehicle) {
            file_put_contents($logFile, "[$timestamp] Found at least one vehicle in database: " . $anyVehicle['vehicle_id'] . "\n", FILE_APPEND);
            
            // Get all vehicles for debugging
            $allVehiclesQuery = "SELECT vehicle_id FROM outstation_fares";
            $allVehiclesStmt = $conn->prepare($allVehiclesQuery);
            $allVehiclesStmt->execute();
            $allVehicles = $allVehiclesStmt->fetchAll(PDO::FETCH_COLUMN);
            
            file_put_contents($logFile, "[$timestamp] All vehicles in database: " . implode(", ", $allVehicles) . "\n", FILE_APPEND);
            file_put_contents($logFile, "[$timestamp] Looking for vehicle_id: $vehicleId (original: $originalVehicleId)\n", FILE_APPEND);
            
            // Try another normalization approach as fallback
            $alternateNormalizedId = strtolower(str_replace(' ', '_', trim($originalVehicleId)));
            if ($alternateNormalizedId !== $vehicleId) {
                file_put_contents($logFile, "[$timestamp] Trying alternate normalization: $alternateNormalizedId\n", FILE_APPEND);
                
                $altQuery = "SELECT * FROM outstation_fares WHERE LOWER(REPLACE(vehicle_id, ' ', '_')) = :alt_id";
                $altStmt = $conn->prepare($altQuery);
                $altStmt->bindParam(':alt_id', $alternateNormalizedId);
                $altStmt->execute();
                $altResult = $altStmt->fetch(PDO::FETCH_ASSOC);
                
                if ($altResult) {
                    file_put_contents($logFile, "[$timestamp] Found match with alternate normalization: " . $altResult['vehicle_id'] . "\n", FILE_APPEND);
                    // Process this result using the same logic as above
                    // (This is a fallback that might help in some cases)
                }
            }
        }
        
        // If no match found after all attempts, return a default structure with empty values
        $fare = [
            'vehicleId' => $originalVehicleId,
            'basePrice' => 0,
            'pricePerKm' => 0,
            'driverAllowance' => 0,
            'totalPrice' => 0,
            'tripMode' => $tripMode,
            'distance' => $distance,
            'breakdown' => [
                'Base fare' => 0,
                'Distance charge' => 0,
                'Driver allowance' => 0
            ]
        ];
        
        echo json_encode([
            'status' => 'success',
            'message' => 'No fare data found for this vehicle',
            'fare' => $fare
        ]);
    }
    
} catch (Exception $e) {
    // Log error
    file_put_contents($logFile, "[$timestamp] Error: " . $e->getMessage() . "\n", FILE_APPEND);
    
    // Return error response
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
