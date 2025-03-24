
<?php
// airport.php - Endpoint for airport fares

require_once '../../config.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Database connection function with error handling
function getDbConnection() {
    try {
        // Try using constants from config.php
        if (defined('DB_HOST') && defined('DB_DATABASE') && defined('DB_USERNAME') && defined('DB_PASSWORD')) {
            $conn = new mysqli(DB_HOST, DB_USERNAME, DB_PASSWORD, DB_DATABASE);
            if ($conn->connect_error) {
                throw new Exception("Connection failed using constants: " . $conn->connect_error);
            }
            error_log("Connected to database using constants");
            return $conn;
        }

        // Try using global variables from config.php
        global $db_host, $db_name, $db_user, $db_pass;
        if (isset($db_host) && isset($db_name) && isset($db_user) && isset($db_pass)) {
            $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
            if ($conn->connect_error) {
                throw new Exception("Connection failed using globals: " . $conn->connect_error);
            }
            error_log("Connected to database using globals");
            return $conn;
        }

        // Fallback to hardcoded credentials as last resort (for development only)
        $conn = new mysqli("localhost", "u644605165_new_bookingusr", "Vizag@1213", "u644605165_new_bookingdb");
        if ($conn->connect_error) {
            throw new Exception("Connection failed using hardcoded values: " . $conn->connect_error);
        }
        error_log("Connected to database using hardcoded values");
        return $conn;
    } catch (Exception $e) {
        error_log("Database connection error: " . $e->getMessage());
        throw $e; // Re-throw to be caught by the main try-catch
    }
}

try {
    // Get the vehicle ID from the request
    $vehicleId = isset($_GET['vehicleId']) ? $_GET['vehicleId'] : null;
    
    if (!$vehicleId) {
        throw new Exception("Vehicle ID is required");
    }
    
    // Clean vehicle ID - remove any prefix
    if (strpos($vehicleId, 'item-') === 0) {
        $vehicleId = substr($vehicleId, 5);
    }
    
    // Connect to database
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // First try to get from airport_fares table
    $stmt = $conn->prepare("SELECT * FROM airport_fares WHERE vehicle_id = ?");
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $fare = $result->fetch_assoc();
        echo json_encode([
            'status' => 'success',
            'data' => [
                'basePrice' => (float)$fare['base_price'],
                'pricePerKm' => (float)$fare['price_per_km'],
                'dropPrice' => (float)$fare['drop_price'],
                'pickupPrice' => (float)$fare['pickup_price'],
                'tier1Price' => (float)$fare['tier1_price'],
                'tier2Price' => (float)$fare['tier2_price'],
                'tier3Price' => (float)$fare['tier3_price'],
                'tier4Price' => (float)$fare['tier4_price'],
                'extraKmCharge' => (float)$fare['extra_km_charge']
            ]
        ]);
        exit;
    }
    
    // If not found in airport_fares, try vehicle_pricing table
    $stmt = $conn->prepare("SELECT * FROM vehicle_pricing WHERE vehicle_type = ? AND trip_type = 'airport'");
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $fare = $result->fetch_assoc();
        echo json_encode([
            'status' => 'success',
            'data' => [
                'basePrice' => (float)$fare['base_price'],
                'pricePerKm' => (float)$fare['price_per_km'],
                'dropPrice' => 0,
                'pickupPrice' => 0,
                'tier1Price' => 0,
                'tier2Price' => 0,
                'tier3Price' => 0,
                'tier4Price' => 0,
                'extraKmCharge' => 0
            ]
        ]);
        exit;
    }
    
    // Get default values based on vehicle name
    $stmt = $conn->prepare("SELECT name FROM vehicle_types WHERE vehicle_id = ?");
    $stmt->bind_param("s", $vehicleId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $vehicleName = '';
    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $vehicleName = strtolower($row['name']);
    } else {
        $vehicleName = strtolower($vehicleId);
    }
    
    // Set default values based on vehicle name
    $basePrice = 1000;
    $pricePerKm = 14;
    
    if (strpos($vehicleName, 'sedan') !== false || strpos($vehicleName, 'dzire') !== false || 
        strpos($vehicleName, 'etios') !== false || strpos($vehicleName, 'swift') !== false) {
        $basePrice = 1200;
        $pricePerKm = 14;
    } else if (strpos($vehicleName, 'ertiga') !== false || strpos($vehicleName, 'suv') !== false) {
        $basePrice = 1500;
        $pricePerKm = 16;
    } else if (strpos($vehicleName, 'innova') !== false) {
        $basePrice = 1800;
        $pricePerKm = 18;
    } else if (strpos($vehicleName, 'tempo') !== false || strpos($vehicleName, 'traveller') !== false) {
        $basePrice = 2500;
        $pricePerKm = 22;
    }
    
    echo json_encode([
        'status' => 'success',
        'source' => 'default',
        'data' => [
            'basePrice' => $basePrice,
            'pricePerKm' => $pricePerKm,
            'dropPrice' => 0,
            'pickupPrice' => 0,
            'tier1Price' => 0,
            'tier2Price' => 0,
            'tier3Price' => 0,
            'tier4Price' => 0,
            'extraKmCharge' => 0
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Error in airport.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
