
<?php
/**
 * direct-outstation-fares.php - Direct access to outstation fares
 * Retrieves outstation fares for all vehicles and creates placeholder entries
 * when they don't exist to ensure all vehicles are displayed
 */

// Set CORS headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory if it doesn't exist
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Log the request
$timestamp = date('Y-m-d H:i:s');
error_log("[$timestamp] Direct outstation fares accessed", 3, $logDir . '/outstation-fares.log');

// Function to get database connection
function getDbConnection() {
    try {
        $host = 'localhost';
        $dbname = 'u644605165_db_be';
        $username = 'u644605165_usr_be';
        $password = 'Vizag@1213';
        
        $conn = new mysqli($host, $username, $password, $dbname);
        
        if ($conn->connect_error) {
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
        
        return $conn;
    } catch (Exception $e) {
        global $timestamp, $logDir;
        error_log("[$timestamp] DB Connection Error: " . $e->getMessage(), 3, $logDir . '/outstation-fares.log');
        throw $e;
    }
}

try {
    // Connect to database
    $conn = getDbConnection();
    
    // Get all active vehicles first
    $vehiclesQuery = "SELECT id, vehicle_id, name FROM vehicles WHERE is_active = 1";
    $vehiclesResult = $conn->query($vehiclesQuery);
    $vehicles = [];
    
    while ($vehicle = $vehiclesResult->fetch_assoc()) {
        $vehicles[$vehicle['vehicle_id']] = $vehicle;
    }
    
    // Get all outstation fares
    $faresQuery = "SELECT * FROM outstation_fares";
    $faresResult = $conn->query($faresQuery);
    $fares = [];
    
    while ($fare = $faresResult->fetch_assoc()) {
        $fares[$fare['vehicle_id']] = $fare;
    }
    
    // Combine data and create placeholder fares for vehicles without fares
    $combinedData = [];
    
    foreach ($vehicles as $vehicleId => $vehicle) {
        if (isset($fares[$vehicleId])) {
            // Vehicle has fares, use them
            $combinedData[] = [
                'id' => $fares[$vehicleId]['id'],
                'vehicleId' => $vehicleId,
                'vehicle_id' => $vehicleId,
                'vehicleName' => $vehicle['name'],
                'basePrice' => (float)$fares[$vehicleId]['base_price'],
                'pricePerKm' => (float)$fares[$vehicleId]['price_per_km'],
                'nightHaltCharge' => (float)$fares[$vehicleId]['night_halt_charge'] ?: 700,
                'driverAllowance' => (float)$fares[$vehicleId]['driver_allowance'] ?: 250,
                'roundtripBasePrice' => (float)$fares[$vehicleId]['roundtrip_base_price'] ?: null,
                'roundtripPricePerKm' => (float)$fares[$vehicleId]['roundtrip_price_per_km'] ?: null
            ];
        } else {
            // Vehicle has no fares, create placeholder
            $combinedData[] = [
                'id' => null,
                'vehicleId' => $vehicleId,
                'vehicle_id' => $vehicleId,
                'vehicleName' => $vehicle['name'],
                'basePrice' => 0,
                'pricePerKm' => 0,
                'nightHaltCharge' => 700,
                'driverAllowance' => 250,
                'roundtripBasePrice' => null,
                'roundtripPricePerKm' => null
            ];
        }
    }
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'count' => count($combinedData),
        'fares' => $combinedData,
        'timestamp' => time()
    ]);
    
} catch (Exception $e) {
    error_log("[$timestamp] ERROR: " . $e->getMessage(), 3, $logDir . '/outstation-fares.log');
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => "Database error: " . $e->getMessage(),
        'timestamp' => time()
    ]);
}
