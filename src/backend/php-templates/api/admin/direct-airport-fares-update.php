
<?php
/**
 * Direct Airport Fares Update API - Simple reliable version
 * 
 * This endpoint updates airport fare data and persists it to a file-based
 * storage system for maximum reliability.
 */

// Set headers for maximum compatibility
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Admin-Mode, X-Debug, X-Force-Creation, Accept');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Setup error handling
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Create log directory if it doesn't exist
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/direct_airport_fares_update_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

try {
    // Verify request method
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Only POST method is allowed');
    }
    
    // Get request data
    $json = file_get_contents('php://input');
    file_put_contents($logFile, "[$timestamp] Raw input: $json\n", FILE_APPEND);
    
    if (empty($json)) {
        throw new Exception('No data received in request body');
    }
    
    $data = json_decode($json, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON: ' . json_last_error_msg());
    }
    
    // Check for vehicle ID in multiple possible fields
    $vehicleId = null;
    if (!empty($data['vehicleId'])) {
        $vehicleId = $data['vehicleId'];
    } elseif (!empty($data['vehicle_id'])) {
        $vehicleId = $data['vehicle_id'];
    } elseif (!empty($data['id'])) {
        $vehicleId = $data['id'];
    }
    
    if (!$vehicleId) {
        throw new Exception('Vehicle ID is required');
    }
    
    file_put_contents($logFile, "[$timestamp] Processing fare update for vehicle: $vehicleId\n", FILE_APPEND);
    
    // Extract and validate fare data
    $fareData = [
        'id' => abs(crc32($vehicleId)) % 10000, // Generate a stable ID
        'vehicleId' => $vehicleId,
        'vehicle_id' => $vehicleId,
        'basePrice' => isset($data['basePrice']) ? floatval($data['basePrice']) : 0,
        'pricePerKm' => isset($data['pricePerKm']) ? floatval($data['pricePerKm']) : 0,
        'pickupPrice' => isset($data['pickupPrice']) ? floatval($data['pickupPrice']) : 0,
        'dropPrice' => isset($data['dropPrice']) ? floatval($data['dropPrice']) : 0,
        'tier1Price' => isset($data['tier1Price']) ? floatval($data['tier1Price']) : 0,
        'tier2Price' => isset($data['tier2Price']) ? floatval($data['tier2Price']) : 0,
        'tier3Price' => isset($data['tier3Price']) ? floatval($data['tier3Price']) : 0,
        'tier4Price' => isset($data['tier4Price']) ? floatval($data['tier4Price']) : 0,
        'extraKmCharge' => isset($data['extraKmCharge']) ? floatval($data['extraKmCharge']) : 0,
        'nightCharges' => isset($data['nightCharges']) ? floatval($data['nightCharges']) : 150,
        'extraWaitingCharges' => isset($data['extraWaitingCharges']) ? floatval($data['extraWaitingCharges']) : 100,
        'updatedAt' => date('Y-m-d H:i:s'),
        'createdAt' => date('Y-m-d H:i:s')
    ];
    
    // First, save to file-based storage
    $mockDataDir = __DIR__ . '/../../data/airport_fares';
    if (!file_exists($mockDataDir)) {
        mkdir($mockDataDir, 0777, true);
    }
    $fareDataFile = $mockDataDir . '/' . $vehicleId . '.json';
    
    file_put_contents($fareDataFile, json_encode($fareData, JSON_PRETTY_PRINT));
    file_put_contents($logFile, "[$timestamp] Saved fare data to file for vehicle: $vehicleId\n", FILE_APPEND);
    
    // Try to update the database if available
    $dbUpdated = false;
    
    try {
        // Include config for database access if available
        if (file_exists(__DIR__ . '/../../config.php')) {
            require_once __DIR__ . '/../../config.php';
            
            if (function_exists('getDbConnection')) {
                $conn = getDbConnection();
                
                if ($conn) {
                    // Check if airport_transfer_fares table exists
                    $result = $conn->query("SHOW TABLES LIKE 'airport_transfer_fares'");
                    
                    if ($result && $result->num_rows > 0) {
                        // Prepare statement
                        $stmt = $conn->prepare("
                            INSERT INTO airport_transfer_fares 
                            (vehicle_id, base_price, price_per_km, pickup_price, drop_price, 
                             tier1_price, tier2_price, tier3_price, tier4_price, 
                             extra_km_charge, night_charges, extra_waiting_charges, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
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
                             night_charges = VALUES(night_charges),
                             extra_waiting_charges = VALUES(extra_waiting_charges),
                             updated_at = NOW()
                        ");
                        
                        $stmt->bind_param(
                            "sddddddddddd", 
                            $vehicleId, 
                            $fareData['basePrice'], 
                            $fareData['pricePerKm'], 
                            $fareData['pickupPrice'], 
                            $fareData['dropPrice'], 
                            $fareData['tier1Price'], 
                            $fareData['tier2Price'], 
                            $fareData['tier3Price'], 
                            $fareData['tier4Price'], 
                            $fareData['extraKmCharge'],
                            $fareData['nightCharges'],
                            $fareData['extraWaitingCharges']
                        );
                        
                        if ($stmt->execute()) {
                            file_put_contents($logFile, "[$timestamp] Updated fare in database for vehicle: $vehicleId\n", FILE_APPEND);
                            $dbUpdated = true;
                        } else {
                            file_put_contents($logFile, "[$timestamp] Database update failed: " . $stmt->error . "\n", FILE_APPEND);
                        }
                    } else {
                        file_put_contents($logFile, "[$timestamp] airport_transfer_fares table doesn't exist\n", FILE_APPEND);
                    }
                } else {
                    file_put_contents($logFile, "[$timestamp] Database connection failed\n", FILE_APPEND);
                }
            } else {
                file_put_contents($logFile, "[$timestamp] getDbConnection function not available\n", FILE_APPEND);
            }
        } else {
            file_put_contents($logFile, "[$timestamp] config.php not found\n", FILE_APPEND);
        }
    } catch (Exception $e) {
        file_put_contents($logFile, "[$timestamp] Database update error: " . $e->getMessage() . "\n", FILE_APPEND);
    }
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'message' => 'Airport fare updated successfully',
        'data' => $fareData,
        'storedInFile' => true,
        'storedInDatabase' => $dbUpdated,
        'timestamp' => time()
    ]);
    
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] Error: " . $e->getMessage() . "\n", FILE_APPEND);
    
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
