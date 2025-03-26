
<?php
// airport.php - Endpoint for airport fares

// Set headers for CORS and cache control - HIGHEST PRIORITY
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Custom-Timestamp');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle preflight OPTIONS request immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Load config file - try multiple locations to ensure it works
if (file_exists(__DIR__ . '/../../config.php')) {
    require_once __DIR__ . '/../../config.php';
} elseif (file_exists(__DIR__ . '/../config.php')) {
    require_once __DIR__ . '/../config.php';
} else {
    // Create a minimal config if it doesn't exist
    define('DB_HOST', 'localhost');
    define('DB_USERNAME', 'u644605165_new_bookingusr');
    define('DB_PASSWORD', 'Vizag@1213');
    define('DB_DATABASE', 'u644605165_new_bookingdb');
}

// Log request for debugging
error_log("Airport fare request received: " . print_r($_REQUEST, true));

// Database connection function with enhanced error handling
function getDbConnection() {
    try {
        // Try using constants from config.php
        if (defined('DB_HOST') && defined('DB_DATABASE') && defined('DB_USERNAME') && defined('DB_PASSWORD')) {
            $conn = new mysqli(DB_HOST, DB_USERNAME, DB_PASSWORD, DB_DATABASE);
            if ($conn->connect_error) {
                error_log("Connection failed using constants: " . $conn->connect_error);
            } else {
                error_log("Connected to database using constants");
                return $conn;
            }
        }

        // Try using global variables from config.php
        global $db_host, $db_name, $db_user, $db_pass;
        if (isset($db_host) && isset($db_name) && isset($db_user) && isset($db_pass)) {
            $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
            if ($conn->connect_error) {
                error_log("Connection failed using globals: " . $conn->connect_error);
            } else {
                error_log("Connected to database using globals");
                return $conn;
            }
        }

        // Fallback to hardcoded credentials as last resort
        $conn = new mysqli("localhost", "u644605165_new_bookingusr", "Vizag@1213", "u644605165_new_bookingdb");
        if ($conn->connect_error) {
            error_log("Connection failed using hardcoded values: " . $conn->connect_error);
            throw new Exception("All connection attempts failed");
        } else {
            error_log("Connected to database using hardcoded values");
            return $conn;
        }
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
    
    // Ensure necessary tables exist
    $tableQueries = [
        "CREATE TABLE IF NOT EXISTS airport_fares (
            id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            vehicle_id VARCHAR(50) NOT NULL,
            base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            price_per_km DECIMAL(10,2) NOT NULL DEFAULT 0,
            drop_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            pickup_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            tier1_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            tier2_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            tier3_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            tier4_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            extra_km_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY vehicle_id (vehicle_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        
        "CREATE TABLE IF NOT EXISTS vehicle_pricing (
            id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            vehicle_id VARCHAR(50) NOT NULL,
            vehicle_type VARCHAR(50) NULL,
            trip_type VARCHAR(50) NOT NULL,
            base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            price_per_km DECIMAL(10,2) NOT NULL DEFAULT 0,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY vehicle_trip (vehicle_id, trip_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        
        "CREATE TABLE IF NOT EXISTS vehicle_types (
            vehicle_id VARCHAR(50) NOT NULL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ];
    
    // Execute each table creation query
    foreach ($tableQueries as $query) {
        if (!$conn->query($query)) {
            error_log("Error creating table: " . $conn->error);
            // Continue to next query even if this one fails
        }
    }
    
    // First try to get from airport_fares table
    $stmt = $conn->prepare("SELECT * FROM airport_fares WHERE vehicle_id = ?");
    if (!$stmt) {
        error_log("Prepare failed for airport_fares: " . $conn->error);
    } else {
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $fare = $result->fetch_assoc();
            echo json_encode([
                'status' => 'success',
                'source' => 'airport_fares',
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
        $stmt->close();
    }
    
    // If not found in airport_fares, try vehicle_pricing table
    $stmt = $conn->prepare("SELECT * FROM vehicle_pricing WHERE (vehicle_id = ? OR vehicle_type = ?) AND trip_type = 'airport'");
    if (!$stmt) {
        error_log("Prepare failed for vehicle_pricing: " . $conn->error);
    } else {
        $stmt->bind_param("ss", $vehicleId, $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $fare = $result->fetch_assoc();
            echo json_encode([
                'status' => 'success',
                'source' => 'vehicle_pricing',
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
        $stmt->close();
    }
    
    // Get default values based on vehicle name
    $vehicleName = '';
    $stmt = $conn->prepare("SELECT name FROM vehicle_types WHERE vehicle_id = ?");
    if (!$stmt) {
        error_log("Prepare failed for vehicle_types: " . $conn->error);
        $vehicleName = strtolower($vehicleId);
    } else {
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $row = $result->fetch_assoc();
            $vehicleName = strtolower($row['name']);
        } else {
            $vehicleName = strtolower($vehicleId);
        }
        $stmt->close();
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
    
    // Since data wasn't found, let's insert default values for future use
    $stmt = $conn->prepare("INSERT IGNORE INTO airport_fares 
        (vehicle_id, base_price, price_per_km, drop_price, pickup_price, 
        tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge) 
        VALUES (?, ?, ?, 0, 0, 0, 0, 0, 0, 0)");
    
    if ($stmt) {
        $stmt->bind_param("sdd", $vehicleId, $basePrice, $pricePerKm);
        $stmt->execute();
        $stmt->close();
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
