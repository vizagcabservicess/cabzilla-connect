
<?php
/**
 * sync-local-fares.php - Synchronize local package fares tables
 * Ensures all versions of the local fare tables have consistent data
 */

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Clear any existing output buffer to prevent corrupt JSON
ob_clean();
ob_start();

// Disable displaying PHP errors in output
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Create log directory if it doesn't exist
$logDir = dirname(__FILE__) . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Logging function
function logMessage($message) {
    global $logDir;
    $timestamp = date('Y-m-d H:i:s');
    error_log("[$timestamp] " . $message . "\n", 3, $logDir . '/sync-local-fares.log');
}

// Handle OPTIONS request
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

try {
    // Include the database helper
    require_once __DIR__ . '/../common/db_helper.php';
    
    // Get database connection
    $conn = getDbConnectionWithRetry(3);
    
    // First, ensure local_package_fares table exists with correct column names
    ensureLocalPackageFaresTable($conn);
    
    // Check if vehicle_pricing table exists
    $vpTableCheck = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'");
    $vpTableExists = $vpTableCheck && $vpTableCheck->num_rows > 0;
    
    $syncedVehicles = [];
    $errors = [];
    
    // Sync data in both directions
    if ($vpTableExists) {
        logMessage("Beginning synchronization between local_package_fares and vehicle_pricing tables");
        
        // First, sync from local_package_fares to vehicle_pricing
        $localFaresQuery = "SELECT * FROM local_package_fares";
        $localFaresResult = $conn->query($localFaresQuery);
        
        if ($localFaresResult && $localFaresResult->num_rows > 0) {
            while ($row = $localFaresResult->fetch_assoc()) {
                $vehicleId = $row['vehicle_id'];
                
                try {
                    // Check if this vehicle exists in vehicle_pricing
                    $checkQuery = "SELECT id FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = 'local'";
                    $checkStmt = $conn->prepare($checkQuery);
                    $checkStmt->bind_param("s", $vehicleId);
                    $checkStmt->execute();
                    $checkResult = $checkStmt->get_result();
                    
                    if ($checkResult->num_rows > 0) {
                        // Update existing record
                        $updateQuery = "
                            UPDATE vehicle_pricing SET
                            local_package_4hr = ?,
                            local_package_8hr = ?,
                            local_package_10hr = ?,
                            extra_km_charge = ?,
                            extra_hour_charge = ?,
                            updated_at = NOW()
                            WHERE vehicle_id = ? AND trip_type = 'local'
                        ";
                        
                        $updateStmt = $conn->prepare($updateQuery);
                        $updateStmt->bind_param(
                            "ddddds",
                            $row['price_4hrs_40km'],
                            $row['price_8hrs_80km'],
                            $row['price_10hrs_100km'],
                            $row['price_extra_km'],
                            $row['price_extra_hour'],
                            $vehicleId
                        );
                        $updateStmt->execute();
                        
                        $syncedVehicles[$vehicleId] = "Updated in vehicle_pricing";
                    } else {
                        // Insert new record
                        $insertQuery = "
                            INSERT INTO vehicle_pricing 
                            (vehicle_id, trip_type, local_package_4hr, local_package_8hr, local_package_10hr, 
                            extra_km_charge, extra_hour_charge, created_at, updated_at)
                            VALUES (?, 'local', ?, ?, ?, ?, ?, NOW(), NOW())
                        ";
                        
                        $insertStmt = $conn->prepare($insertQuery);
                        $insertStmt->bind_param(
                            "sddddd",
                            $vehicleId,
                            $row['price_4hrs_40km'],
                            $row['price_8hrs_80km'],
                            $row['price_10hrs_100km'],
                            $row['price_extra_km'],
                            $row['price_extra_hour']
                        );
                        $insertStmt->execute();
                        
                        $syncedVehicles[$vehicleId] = "Inserted into vehicle_pricing";
                    }
                } catch (Exception $e) {
                    $errors[] = "Error syncing $vehicleId to vehicle_pricing: " . $e->getMessage();
                    logMessage("Error syncing $vehicleId to vehicle_pricing: " . $e->getMessage());
                }
            }
        }
        
        // Now sync from vehicle_pricing to local_package_fares
        $vpQuery = "SELECT * FROM vehicle_pricing WHERE trip_type = 'local'";
        $vpResult = $conn->query($vpQuery);
        
        if ($vpResult && $vpResult->num_rows > 0) {
            while ($row = $vpResult->fetch_assoc()) {
                $vehicleId = $row['vehicle_id'];
                
                // Skip if we already synced this vehicle
                if (isset($syncedVehicles[$vehicleId]) && $syncedVehicles[$vehicleId] !== "Synced from vehicle_pricing") {
                    continue;
                }
                
                try {
                    // Check if this vehicle exists in local_package_fares
                    $checkQuery = "SELECT id FROM local_package_fares WHERE vehicle_id = ?";
                    $checkStmt = $conn->prepare($checkQuery);
                    $checkStmt->bind_param("s", $vehicleId);
                    $checkStmt->execute();
                    $checkResult = $checkStmt->get_result();
                    
                    if ($checkResult->num_rows > 0) {
                        // Update existing record
                        $updateQuery = "
                            UPDATE local_package_fares SET
                            price_4hrs_40km = ?,
                            price_8hrs_80km = ?,
                            price_10hrs_100km = ?,
                            price_extra_km = ?,
                            price_extra_hour = ?,
                            updated_at = NOW()
                            WHERE vehicle_id = ?
                        ";
                        
                        $updateStmt = $conn->prepare($updateQuery);
                        $updateStmt->bind_param(
                            "ddddds",
                            $row['local_package_4hr'],
                            $row['local_package_8hr'],
                            $row['local_package_10hr'],
                            $row['extra_km_charge'],
                            $row['extra_hour_charge'],
                            $vehicleId
                        );
                        $updateStmt->execute();
                        
                        $syncedVehicles[$vehicleId] = "Updated in local_package_fares";
                    } else {
                        // Insert new record
                        $insertQuery = "
                            INSERT INTO local_package_fares
                            (vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, 
                            price_extra_km, price_extra_hour, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
                        ";
                        
                        $insertStmt = $conn->prepare($insertQuery);
                        $insertStmt->bind_param(
                            "sddddd",
                            $vehicleId,
                            $row['local_package_4hr'],
                            $row['local_package_8hr'],
                            $row['local_package_10hr'],
                            $row['extra_km_charge'],
                            $row['extra_hour_charge']
                        );
                        $insertStmt->execute();
                        
                        $syncedVehicles[$vehicleId] = "Inserted into local_package_fares";
                    }
                } catch (Exception $e) {
                    $errors[] = "Error syncing $vehicleId to local_package_fares: " . $e->getMessage();
                    logMessage("Error syncing $vehicleId to local_package_fares: " . $e->getMessage());
                }
            }
        }
    }
    
    // Clear any cache files
    $cacheDir = dirname(__FILE__) . '/../../cache';
    if (file_exists($cacheDir)) {
        $cacheFiles = glob($cacheDir . '/fares_*.json');
        foreach ($cacheFiles as $file) {
            @unlink($file);
        }
        $response['cache_cleared'] = count($cacheFiles);
    }
    
    // Success response
    $response = [
        'status' => 'success',
        'message' => 'Local package fares tables synchronized successfully',
        'synchronized_vehicles' => $syncedVehicles,
        'errors' => $errors,
        'timestamp' => time()
    ];
    
    logMessage("Synchronization completed successfully: " . count($syncedVehicles) . " vehicles processed");
    
} catch (Exception $e) {
    logMessage("Error in sync-local-fares.php: " . $e->getMessage());
    $response['message'] = $e->getMessage();
}

// Ensure clean output
ob_end_clean();
echo json_encode($response);
exit;
