
<?php
/**
 * Sync airport fares between tables - Ensures all vehicle pricing data is consistent
 */

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/sync_airport_fares_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Include database utility
require_once __DIR__ . '/../utils/database.php';
require_once __DIR__ . '/../utils/response.php';

// Get database connection
$conn = getDbConnection();
if (!$conn) {
    sendErrorResponse('Failed to connect to database');
    exit;
}

// Log sync start
file_put_contents($logFile, "[$timestamp] Starting airport fares sync\n", FILE_APPEND);

// Step 1: Ensure the airport_transfer_fares table exists
$createAirportTableSql = "
CREATE TABLE IF NOT EXISTS airport_transfer_fares (
    id INT(11) NOT NULL AUTO_INCREMENT,
    vehicle_id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
    pickup_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    drop_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    tier1_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    tier2_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    tier3_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    tier4_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    extra_km_charge DECIMAL(5,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY vehicle_id (vehicle_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
";

if (!$conn->query($createAirportTableSql)) {
    file_put_contents($logFile, "[$timestamp] Failed to create airport_transfer_fares table: " . $conn->error . "\n", FILE_APPEND);
    sendErrorResponse('Failed to create airport_transfer_fares table: ' . $conn->error);
    exit;
}

// Step 2: Ensure the vehicle_pricing table exists
$createVehiclePricingTableSql = "
CREATE TABLE IF NOT EXISTS vehicle_pricing (
    id INT(11) NOT NULL AUTO_INCREMENT,
    vehicle_id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    trip_type VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    airport_base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    airport_price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
    airport_pickup_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    airport_drop_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    airport_tier1_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    airport_tier2_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    airport_tier3_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    airport_tier4_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    airport_extra_km_charge DECIMAL(5,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY vehicle_trip_type (vehicle_id, trip_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
";

if (!$conn->query($createVehiclePricingTableSql)) {
    file_put_contents($logFile, "[$timestamp] Failed to create vehicle_pricing table: " . $conn->error . "\n", FILE_APPEND);
    sendErrorResponse('Failed to create vehicle_pricing table: ' . $conn->error);
    exit;
}

// Step 3: Sync data from airport_transfer_fares to vehicle_pricing
$syncToVehiclePricingSql = "
INSERT INTO vehicle_pricing (
    vehicle_id, 
    trip_type, 
    airport_base_price, 
    airport_price_per_km, 
    airport_pickup_price, 
    airport_drop_price, 
    airport_tier1_price, 
    airport_tier2_price, 
    airport_tier3_price, 
    airport_tier4_price, 
    airport_extra_km_charge
)
SELECT 
    vehicle_id, 
    'airport', 
    base_price, 
    price_per_km, 
    pickup_price, 
    drop_price, 
    tier1_price, 
    tier2_price, 
    tier3_price, 
    tier4_price, 
    extra_km_charge
FROM 
    airport_transfer_fares
ON DUPLICATE KEY UPDATE 
    airport_base_price = VALUES(airport_base_price),
    airport_price_per_km = VALUES(airport_price_per_km),
    airport_pickup_price = VALUES(airport_pickup_price),
    airport_drop_price = VALUES(airport_drop_price),
    airport_tier1_price = VALUES(airport_tier1_price),
    airport_tier2_price = VALUES(airport_tier2_price),
    airport_tier3_price = VALUES(airport_tier3_price),
    airport_tier4_price = VALUES(airport_tier4_price),
    airport_extra_km_charge = VALUES(airport_extra_km_charge),
    updated_at = NOW()
";

$syncToVehiclePricingResult = $conn->query($syncToVehiclePricingSql);
if (!$syncToVehiclePricingResult) {
    file_put_contents($logFile, "[$timestamp] Failed to sync data to vehicle_pricing: " . $conn->error . "\n", FILE_APPEND);
    sendErrorResponse('Failed to sync data to vehicle_pricing: ' . $conn->error);
    exit;
}

// Step 4: Sync data from vehicle_pricing to airport_transfer_fares
$syncToAirportFaresSql = "
INSERT INTO airport_transfer_fares (
    vehicle_id, 
    base_price, 
    price_per_km, 
    pickup_price, 
    drop_price, 
    tier1_price, 
    tier2_price, 
    tier3_price, 
    tier4_price, 
    extra_km_charge
)
SELECT 
    vehicle_id, 
    airport_base_price, 
    airport_price_per_km, 
    airport_pickup_price, 
    airport_drop_price, 
    airport_tier1_price, 
    airport_tier2_price, 
    airport_tier3_price, 
    airport_tier4_price, 
    airport_extra_km_charge
FROM 
    vehicle_pricing
WHERE 
    trip_type = 'airport'
ON DUPLICATE KEY UPDATE 
    base_price = VALUES(base_price),
    price_per_km = VALUES(price_per_km),
    pickup_price = VALUES(pickup_price),
    drop_price = VALUES(drop_price),
    tier1_price = VALUES(tier1_price),
    tier2_price = VALUES(tier2_price),
    tier3_price = VALUES(tier3_price),
    tier4_price = VALUES(tier4_price),
    extra_km_charge = VALUES(extra_km_charge),
    updated_at = NOW()
";

$syncToAirportFaresResult = $conn->query($syncToAirportFaresSql);
if (!$syncToAirportFaresResult) {
    file_put_contents($logFile, "[$timestamp] Failed to sync data to airport_transfer_fares: " . $conn->error . "\n", FILE_APPEND);
    sendErrorResponse('Failed to sync data to airport_transfer_fares: ' . $conn->error);
    exit;
}

// Step 5: Create default entries for all vehicles that don't have airport fare data
$insertDefaultFaresSql = "
INSERT IGNORE INTO airport_transfer_fares (
    vehicle_id, 
    base_price, 
    price_per_km, 
    pickup_price, 
    drop_price, 
    tier1_price, 
    tier2_price, 
    tier3_price, 
    tier4_price, 
    extra_km_charge
)
SELECT 
    v.vehicle_id,
    0, 0, 0, 0, 0, 0, 0, 0, 0
FROM 
    vehicles v
LEFT JOIN 
    airport_transfer_fares atf ON v.vehicle_id = atf.vehicle_id
WHERE 
    atf.id IS NULL
";

$insertDefaultFaresResult = $conn->query($insertDefaultFaresSql);
if (!$insertDefaultFaresResult) {
    file_put_contents($logFile, "[$timestamp] Failed to insert default fares: " . $conn->error . "\n", FILE_APPEND);
}

// Get the count of synced fares
$countQuery = "SELECT COUNT(*) as count FROM airport_transfer_fares";
$countResult = $conn->query($countQuery);
$count = 0;
if ($countResult && $row = $countResult->fetch_assoc()) {
    $count = $row['count'];
}

// Log sync completion
file_put_contents($logFile, "[$timestamp] Airport fares sync completed. Found {$count} fares.\n", FILE_APPEND);

// Return success response
sendSuccessResponse([
    'synced_fares_count' => $count
], 'Airport fares synced successfully');
