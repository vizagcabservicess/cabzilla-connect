
<?php
/**
 * get-vehicles.php - Fetch all vehicles with their pricing data
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Enable error reporting for debug
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Create log directory if it doesn't exist
$logDir = dirname(__FILE__) . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Logging function
function logMessage($message) {
    global $logDir;
    $timestamp = date('Y-m-d H:i:s');
    error_log("[$timestamp] " . $message . "\n", 3, $logDir . '/get-vehicles.log');
}

// Log request information
logMessage("Get vehicles request received: " . $_SERVER['REQUEST_METHOD']);
logMessage("Query string: " . $_SERVER['QUERY_STRING']);

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Initialize response
$response = [
    'status' => 'error',
    'message' => 'Unknown error',
    'timestamp' => time()
];

// Only allow GET method
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    $response['message'] = 'Only GET method is allowed';
    echo json_encode($response);
    exit;
}

// Get parameters
$includeInactive = isset($_GET['includeInactive']) && $_GET['includeInactive'] === 'true';
$isAdminMode = isset($_SERVER['HTTP_X_ADMIN_MODE']) && $_SERVER['HTTP_X_ADMIN_MODE'] === 'true';

// If admin mode is set via header, include inactive vehicles
if ($isAdminMode) {
    $includeInactive = true;
}

// Get database connection
try {
    // First try to use config if available
    if (file_exists(dirname(__FILE__) . '/../../config.php')) {
        require_once dirname(__FILE__) . '/../../config.php';
        $conn = getDbConnection();
        logMessage("Connected to database using config.php");
    } 
    // Fallback to hardcoded credentials
    else {
        logMessage("Config file not found, using hardcoded credentials");
        $dbHost = 'localhost';
        $dbName = 'u644605165_new_bookingdb';
        $dbUser = 'u644605165_new_bookingusr';
        $dbPass = 'Vizag@1213';
        
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        
        if ($conn->connect_error) {
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
        
        logMessage("Connected to database using hardcoded credentials");
    }
} catch (Exception $e) {
    $response['message'] = 'Database connection failed: ' . $e->getMessage();
    echo json_encode($response);
    exit;
}

try {
    // Main query to get all vehicles
    $vehicleQuery = "SELECT * FROM vehicles";
    
    // Add WHERE clause if not including inactive vehicles
    if (!$includeInactive) {
        $vehicleQuery .= " WHERE is_active = 1";
    }
    
    $vehicleQuery .= " ORDER BY name";
    $vehicleResult = $conn->query($vehicleQuery);
    
    if (!$vehicleResult) {
        // Try vehicle_types table as fallback
        $vehicleQuery = "SELECT * FROM vehicle_types";
        
        if (!$includeInactive) {
            $vehicleQuery .= " WHERE is_active = 1";
        }
        
        $vehicleQuery .= " ORDER BY name";
        $vehicleResult = $conn->query($vehicleQuery);
        
        if (!$vehicleResult) {
            throw new Exception("Error fetching vehicles: " . $conn->error);
        }
    }
    
    $vehicles = [];
    
    while ($vehicle = $vehicleResult->fetch_assoc()) {
        // Convert amenities from string to array if needed
        if (is_string($vehicle['amenities']) && !empty($vehicle['amenities'])) {
            $vehicle['amenities'] = explode(', ', $vehicle['amenities']);
        } else if (empty($vehicle['amenities'])) {
            $vehicle['amenities'] = ['AC'];
        }
        
        // Ensure vehicle has consistent ID property
        $vehicleId = $vehicle['vehicle_id'];
        $vehicle['id'] = $vehicleId;
        $vehicle['vehicleId'] = $vehicleId;
        
        // Add price alias
        $vehicle['price'] = $vehicle['base_price'];
        
        // Get local package prices
        $localQuery = "SELECT * FROM local_package_fares WHERE vehicle_id = ?";
        $localStmt = $conn->prepare($localQuery);
        $localStmt->bind_param('s', $vehicleId);
        $localStmt->execute();
        $localResult = $localStmt->get_result();
        
        if ($localResult && $localResult->num_rows > 0) {
            $localData = $localResult->fetch_assoc();
            $vehicle['local'] = [
                'price_4hrs_40km' => $localData['price_4hrs_40km'],
                'price_8hrs_80km' => $localData['price_8hrs_80km'],
                'price_10hrs_100km' => $localData['price_10hrs_100km'],
                'price_extra_km' => $localData['price_extra_km'],
                'price_extra_hour' => $localData['price_extra_hour']
            ];
        } else {
            // Try vehicle_pricing table as fallback
            $localPricingQuery = "SELECT * FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = 'local'";
            $localPricingStmt = $conn->prepare($localPricingQuery);
            $localPricingStmt->bind_param('s', $vehicleId);
            $localPricingStmt->execute();
            $localPricingResult = $localPricingStmt->get_result();
            
            if ($localPricingResult && $localPricingResult->num_rows > 0) {
                $localPricingData = $localPricingResult->fetch_assoc();
                $vehicle['local'] = [
                    'price_4hrs_40km' => $localPricingData['local_package_4hr'],
                    'price_8hrs_80km' => $localPricingData['local_package_8hr'],
                    'price_10hrs_100km' => $localPricingData['local_package_10hr'],
                    'price_extra_km' => $localPricingData['extra_km_charge'],
                    'price_extra_hour' => $localPricingData['extra_hour_charge']
                ];
            }
        }
        
        // Get airport transfer prices
        $airportQuery = "SELECT * FROM airport_transfer_fares WHERE vehicle_id = ?";
        $airportStmt = $conn->prepare($airportQuery);
        $airportStmt->bind_param('s', $vehicleId);
        $airportStmt->execute();
        $airportResult = $airportStmt->get_result();
        
        if ($airportResult && $airportResult->num_rows > 0) {
            $airportData = $airportResult->fetch_assoc();
            $vehicle['airport'] = [
                'base_price' => $airportData['base_price'],
                'price_per_km' => $airportData['price_per_km'],
                'pickup_price' => $airportData['pickup_price'],
                'drop_price' => $airportData['drop_price'],
                'tier1_price' => $airportData['tier1_price'],
                'tier2_price' => $airportData['tier2_price'],
                'tier3_price' => $airportData['tier3_price'],
                'tier4_price' => $airportData['tier4_price'],
                'extra_km_charge' => $airportData['extra_km_charge']
            ];
        } else {
            // Try vehicle_pricing table as fallback
            $airportPricingQuery = "SELECT * FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = 'airport'";
            $airportPricingStmt = $conn->prepare($airportPricingQuery);
            $airportPricingStmt->bind_param('s', $vehicleId);
            $airportPricingStmt->execute();
            $airportPricingResult = $airportPricingStmt->get_result();
            
            if ($airportPricingResult && $airportPricingResult->num_rows > 0) {
                $airportPricingData = $airportPricingResult->fetch_assoc();
                $vehicle['airport'] = [
                    'base_price' => $airportPricingData['airport_base_price'],
                    'price_per_km' => $airportPricingData['airport_price_per_km'],
                    'pickup_price' => $airportPricingData['airport_pickup_price'],
                    'drop_price' => $airportPricingData['airport_drop_price'],
                    'tier1_price' => $airportPricingData['airport_tier1_price'],
                    'tier2_price' => $airportPricingData['airport_tier2_price'],
                    'tier3_price' => $airportPricingData['airport_tier3_price'],
                    'tier4_price' => $airportPricingData['airport_tier4_price'],
                    'extra_km_charge' => $airportPricingData['airport_extra_km_charge']
                ];
            }
        }
        
        // Get outstation prices
        $outstationQuery = "SELECT * FROM outstation_fares WHERE vehicle_id = ?";
        $outstationStmt = $conn->prepare($outstationQuery);
        $outstationStmt->bind_param('s', $vehicleId);
        $outstationStmt->execute();
        $outstationResult = $outstationStmt->get_result();
        
        if ($outstationResult && $outstationResult->num_rows > 0) {
            $outstationData = $outstationResult->fetch_assoc();
            $vehicle['outstation'] = [
                'base_price' => $outstationData['base_price'],
                'price_per_km' => $outstationData['price_per_km'],
                'night_halt_charge' => $outstationData['night_halt_charge'],
                'driver_allowance' => $outstationData['driver_allowance'],
                'roundtrip_base_price' => $outstationData['roundtrip_base_price'],
                'roundtrip_price_per_km' => $outstationData['roundtrip_price_per_km']
            ];
        } else {
            // Try vehicle_pricing table as fallback
            $outstationPricingQuery = "SELECT * FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = 'outstation'";
            $outstationPricingStmt = $conn->prepare($outstationPricingQuery);
            $outstationPricingStmt->bind_param('s', $vehicleId);
            $outstationPricingStmt->execute();
            $outstationPricingResult = $outstationPricingStmt->get_result();
            
            if ($outstationPricingResult && $outstationPricingResult->num_rows > 0) {
                $outstationPricingData = $outstationPricingResult->fetch_assoc();
                $vehicle['outstation'] = [
                    'base_price' => $outstationPricingData['base_fare'] > 0 ? $outstationPricingData['base_fare'] : $outstationPricingData['base_price'],
                    'price_per_km' => $outstationPricingData['price_per_km'],
                    'night_halt_charge' => $outstationPricingData['night_halt_charge'],
                    'driver_allowance' => $outstationPricingData['driver_allowance']
                ];
            }
        }
        
        // Add created and updated dates
        if (!isset($vehicle['createdAt']) && isset($vehicle['created_at'])) {
            $vehicle['createdAt'] = $vehicle['created_at'];
        }
        
        if (!isset($vehicle['updatedAt']) && isset($vehicle['updated_at'])) {
            $vehicle['updatedAt'] = $vehicle['updated_at'];
        }
        
        $vehicles[] = $vehicle;
    }
    
    // Prepare successful response
    $response['status'] = 'success';
    $response['vehicles'] = $vehicles;
    $response['count'] = count($vehicles);
    $response['includeInactive'] = $includeInactive;
    $response['isAdminMode'] = $isAdminMode;
    
    logMessage("Successfully retrieved " . count($vehicles) . " vehicles");
    
} catch (Exception $e) {
    $response['message'] = $e->getMessage();
    logMessage("Error getting vehicles: " . $e->getMessage());
}

// Send response
echo json_encode($response);
