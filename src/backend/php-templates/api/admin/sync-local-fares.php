
<?php
/**
 * This script synchronizes data between local_package_fares and vehicle_pricing tables
 * It handles different column name variations between tables
 */

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');

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

// Log function to help with debugging
function logMessage($message) {
    global $logDir;
    $logFile = $logDir . '/sync_local_fares_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

// Include database utilities
require_once __DIR__ . '/../utils/database.php';

try {
    // Connect to database
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    logMessage("Database connection successful");
    
    // Check if local_package_fares table exists
    $checkTableStmt = $conn->query("SHOW TABLES LIKE 'local_package_fares'");
    $localFaresTableExists = $checkTableStmt->num_rows > 0;
    
    // If local_package_fares table doesn't exist, create it
    if (!$localFaresTableExists) {
        $createTableSql = "
            CREATE TABLE IF NOT EXISTS local_package_fares (
                id INT(11) NOT NULL AUTO_INCREMENT,
                vehicle_id VARCHAR(50) NOT NULL,
                price_4hrs_40km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_8hrs_80km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_10hrs_100km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_extra_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                price_extra_hour DECIMAL(5,2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        $conn->query($createTableSql);
        logMessage("Created local_package_fares table");
    }
    
    // Get vehicles from vehicles table
    $vehiclesQuery = "SELECT id, vehicle_id, name FROM vehicles WHERE is_active = 1";
    $vehiclesResult = $conn->query($vehiclesQuery);
    
    $vehicles = [];
    $syncedCount = 0;
    
    if ($vehiclesResult) {
        while ($row = $vehiclesResult->fetch_assoc()) {
            $vehicleId = $row['vehicle_id'] ?? $row['id'];
            $vehicles[] = $vehicleId;
            
            // Insert default values if no data exists
            $stmt = $conn->prepare("
                INSERT IGNORE INTO local_package_fares 
                (vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour, updated_at)
                VALUES (?, 0, 0, 0, 0, 0, NOW())
            ");
            
            $stmt->bind_param("s", $vehicleId);
            $stmt->execute();
            
            if ($stmt->affected_rows > 0) {
                $syncedCount++;
                logMessage("Added default local package fare for vehicle: $vehicleId");
            }
            
            // Now sync with vehicle_pricing table (for compatibility)
            $updateVehiclePricing = $conn->prepare("
                INSERT INTO vehicle_pricing 
                (vehicle_id, trip_type, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour, updated_at)
                SELECT 
                    lpf.vehicle_id, 
                    'local-package',
                    lpf.price_4hrs_40km,
                    lpf.price_8hrs_80km,
                    lpf.price_10hrs_100km,
                    lpf.price_extra_km,
                    lpf.price_extra_hour,
                    NOW()
                FROM 
                    local_package_fares lpf
                WHERE 
                    lpf.vehicle_id = ?
                ON DUPLICATE KEY UPDATE
                    price_4hrs_40km = lpf.price_4hrs_40km,
                    price_8hrs_80km = lpf.price_8hrs_80km,
                    price_10hrs_100km = lpf.price_10hrs_100km,
                    price_extra_km = lpf.price_extra_km,
                    price_extra_hour = lpf.price_extra_hour,
                    updated_at = NOW()
            ");
            
            $updateVehiclePricing->bind_param("s", $vehicleId);
            $updateVehiclePricing->execute();
            
            logMessage("Synced local package fare for vehicle $vehicleId with vehicle_pricing table");
        }
    } else {
        logMessage("No vehicles found in database");
        $vehicles = ['sedan', 'ertiga', 'innova_crysta', 'luxury', 'tempo_traveller'];
    }
    
    // Close database connection
    $conn->close();
    
    logMessage("Synced local fares for " . count($vehicles) . " vehicles");
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'message' => 'Local fares synced successfully',
        'synced' => $syncedCount,
        'vehicles' => $vehicles,
        'timestamp' => time()
    ]);
} catch (Exception $e) {
    logMessage("Error: " . $e->getMessage());
    
    // Return error response
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
