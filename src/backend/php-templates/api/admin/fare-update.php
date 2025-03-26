
<?php
// fare-update.php - Universal endpoint for all fare updates

// Include any necessary configs
require_once __DIR__ . '/../../config.php';

// Set headers to prevent caching
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log the incoming request
$timestamp = date('Y-m-d H:i:s');
$request_method = $_SERVER['REQUEST_METHOD'];
$request_uri = $_SERVER['REQUEST_URI'];
$raw_input = file_get_contents('php://input');

error_log("[$timestamp] FARE UPDATE REQUEST: $request_method $request_uri\n", 3, __DIR__ . '/../logs/fare-updates.log');
error_log("Raw input: $raw_input\n", 3, __DIR__ . '/../logs/fare-updates.log');

// Check if we need to initialize the database
if (isset($_GET['initialize']) && $_GET['initialize'] === 'true') {
    require_once __DIR__ . '/db_setup.php';
    exit;
}

// Create a function to ensure tables exist before operations
function ensureTables($conn) {
    // Check if vehicles table exists
    $checkVehicles = $conn->query("SHOW TABLES LIKE 'vehicles'");
    if ($checkVehicles->num_rows === 0) {
        // Create vehicles table
        $conn->query("
            CREATE TABLE IF NOT EXISTS vehicles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL UNIQUE,
                name VARCHAR(100) NOT NULL,
                capacity INT NOT NULL DEFAULT 4,
                luggage_capacity INT NOT NULL DEFAULT 2,
                ac TINYINT(1) NOT NULL DEFAULT 1,
                image VARCHAR(255) DEFAULT '/cars/sedan.png',
                amenities TEXT DEFAULT NULL,
                description TEXT DEFAULT NULL,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        error_log("Created vehicles table");
    }

    // Check if outstation_fares table exists
    $checkOutstation = $conn->query("SHOW TABLES LIKE 'outstation_fares'");
    if ($checkOutstation->num_rows === 0) {
        // Create outstation_fares table
        $conn->query("
            CREATE TABLE IF NOT EXISTS outstation_fares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
                driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 0,
                roundtrip_base_price DECIMAL(10,2) DEFAULT 0,
                roundtrip_price_per_km DECIMAL(5,2) DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        error_log("Created outstation_fares table");
    }

    // Check if local_package_fares table exists
    $checkLocal = $conn->query("SHOW TABLES LIKE 'local_package_fares'");
    if ($checkLocal->num_rows === 0) {
        // Create local_package_fares table
        $conn->query("
            CREATE TABLE IF NOT EXISTS local_package_fares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                price_4hrs_40km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_8hrs_80km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_10hrs_100km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_extra_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                price_extra_hour DECIMAL(5,2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        error_log("Created local_package_fares table");
    }

    // Check if airport_transfer_fares table exists
    $checkAirport = $conn->query("SHOW TABLES LIKE 'airport_transfer_fares'");
    if ($checkAirport->num_rows === 0) {
        // Create airport_transfer_fares table
        $conn->query("
            CREATE TABLE IF NOT EXISTS airport_transfer_fares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                pickup_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                drop_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                tier1_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                tier2_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                tier3_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                tier4_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                extra_km_charge DECIMAL(5,2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        error_log("Created airport_transfer_fares table");
    }

    // Check if vehicle_pricing table exists (compatibility layer)
    $checkVehiclePricing = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'");
    if ($checkVehiclePricing->num_rows === 0) {
        // Create vehicle_pricing table
        $conn->query("
            CREATE TABLE IF NOT EXISTS vehicle_pricing (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                trip_type VARCHAR(50) NOT NULL DEFAULT 'outstation',
                base_fare DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
                driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 0,
                local_package_4hr DECIMAL(10,2) DEFAULT NULL,
                local_package_8hr DECIMAL(10,2) DEFAULT NULL,
                local_package_10hr DECIMAL(10,2) DEFAULT NULL,
                extra_km_charge DECIMAL(5,2) DEFAULT NULL,
                extra_hour_charge DECIMAL(5,2) DEFAULT NULL,
                airport_base_price DECIMAL(10,2) DEFAULT NULL,
                airport_price_per_km DECIMAL(5,2) DEFAULT NULL,
                airport_drop_price DECIMAL(10,2) DEFAULT NULL,
                airport_pickup_price DECIMAL(10,2) DEFAULT NULL,
                airport_tier1_price DECIMAL(10,2) DEFAULT NULL,
                airport_tier2_price DECIMAL(10,2) DEFAULT NULL,
                airport_tier3_price DECIMAL(10,2) DEFAULT NULL,
                airport_tier4_price DECIMAL(10,2) DEFAULT NULL,
                airport_extra_km_charge DECIMAL(5,2) DEFAULT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY vehicle_trip_type (vehicle_id, trip_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        error_log("Created vehicle_pricing table");
    }

    return true;
}

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Database connection failed"
    ]);
    exit;
}

// Ensure tables exist
ensureTables($conn);

// Detect trip type from URL or parameters
$tripType = 'unknown';
if (isset($_GET['tripType'])) {
    $tripType = $_GET['tripType'];
} else {
    // Try to detect from URL
    if (strpos($_SERVER['REQUEST_URI'], 'outstation') !== false) {
        $tripType = 'outstation';
    } else if (strpos($_SERVER['REQUEST_URI'], 'local') !== false) {
        $tripType = 'local';
    } else if (strpos($_SERVER['REQUEST_URI'], 'airport') !== false) {
        $tripType = 'airport';
    }
}

// Handle the fare update based on trip type
switch ($tripType) {
    case 'outstation':
        // Redirect to outstation fare update handler
        require_once __DIR__ . '/direct-fare-update.php';
        break;
    case 'local':
        // Redirect to local fare update handler
        require_once __DIR__ . '/direct-fare-update.php';
        break;
    case 'airport':
        // Redirect to airport fare update handler
        require_once __DIR__ . '/direct-fare-update.php';
        break;
    default:
        // Use direct-fare-update as fallback for all fare types
        require_once __DIR__ . '/direct-fare-update.php';
        break;
}
