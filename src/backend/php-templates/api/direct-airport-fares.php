
<?php
// direct-airport-fares.php - Endpoint specifically for airport fare updates

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

// Include utility files
require_once __DIR__ . '/utils/database.php';
require_once __DIR__ . '/utils/response.php';

// Get raw input
$raw_input = file_get_contents('php://input');
error_log("Raw input for airport fare update: $raw_input", 3, __DIR__ . '/../../error.log');

// Function to ensure tables exist
function ensureTablesExist($conn) {
    // Check if vehicle_types table exists
    $checkVehicleTypes = $conn->query("SHOW TABLES LIKE 'vehicle_types'");
    if ($checkVehicleTypes->num_rows === 0) {
        // Create vehicle_types table
        $conn->query("
            CREATE TABLE IF NOT EXISTS vehicle_types (
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
        error_log("Created vehicle_types table");
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

    return true;
}

// Try to extract request data from multiple sources
$data = [];
$json_data = json_decode($raw_input, true);
if (json_last_error() === JSON_ERROR_NONE && !empty($json_data)) {
    $data = $json_data;
} else {
    parse_str($raw_input, $form_data);
    if (!empty($form_data)) {
        $data = $form_data;
    } else {
        $data = $_POST ?: $_REQUEST ?: [];
    }
}

// Log the request data
error_log("Airport fare update request data: " . print_r($data, true), 3, __DIR__ . '/../../error.log');

// Establish database connection
try {
    $conn = getDbConnection();
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Ensure necessary tables exist
    ensureTablesExist($conn);
    
    // Extract vehicle ID from various possible fields
    $vehicleId = $data['vehicleId'] ?? $data['vehicle_id'] ?? $data['vehicleType'] ?? $data['cabType'] ?? '';
    
    // Normalize the vehicle ID (remove any prefix)
    if (strpos($vehicleId, 'item-') === 0) {
        $vehicleId = substr($vehicleId, 5);
    }
    
    if (empty($vehicleId)) {
        throw new Exception("Vehicle ID is required");
    }
    
    // Create vehicle if it doesn't exist
    $checkVehicleStmt = $conn->prepare("SELECT vehicle_id FROM vehicle_types WHERE vehicle_id = ?");
    $checkVehicleStmt->bind_param("s", $vehicleId);
    $checkVehicleStmt->execute();
    $checkResult = $checkVehicleStmt->get_result();
    
    if ($checkResult->num_rows === 0) {
        // Format vehicle name from ID
        $vehicleName = ucwords(str_replace('_', ' ', $vehicleId));
        $insertVehicleStmt = $conn->prepare("
            INSERT INTO vehicle_types (vehicle_id, name, is_active) 
            VALUES (?, ?, 1)
        ");
        $insertVehicleStmt->bind_param("ss", $vehicleId, $vehicleName);
        $insertVehicleStmt->execute();
        error_log("Created new vehicle: $vehicleId");
    }
    
    // Extract values with multiple field name possibilities
    $basePrice = floatval($data['basePrice'] ?? $data['base_price'] ?? 0);
    $pricePerKm = floatval($data['pricePerKm'] ?? $data['price_per_km'] ?? 0);
    $pickupPrice = floatval($data['pickupPrice'] ?? $data['pickup_price'] ?? 0);
    $dropPrice = floatval($data['dropPrice'] ?? $data['drop_price'] ?? 0);
    $tier1Price = floatval($data['tier1Price'] ?? $data['tier1_price'] ?? 0);
    $tier2Price = floatval($data['tier2Price'] ?? $data['tier2_price'] ?? 0);
    $tier3Price = floatval($data['tier3Price'] ?? $data['tier3_price'] ?? 0);
    $tier4Price = floatval($data['tier4Price'] ?? $data['tier4_price'] ?? 0);
    $extraKmCharge = floatval($data['extraKmCharge'] ?? $data['extra_km_charge'] ?? 0);
    
    error_log("Airport fare update for $vehicleId: Base=$basePrice, PerKm=$pricePerKm, Pickup=$pickupPrice, Drop=$dropPrice", 3, __DIR__ . '/../../error.log');
    
    // Begin transaction
    $conn->begin_transaction();
    
    try {
        // 1. Update airport_transfer_fares table
        $stmt = $conn->prepare("
            INSERT INTO airport_transfer_fares 
            (vehicle_id, base_price, price_per_km, pickup_price, drop_price, 
             tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
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
        ");
        
        $stmt->bind_param("sddddddddd", 
            $vehicleId,
            $basePrice,
            $pricePerKm,
            $pickupPrice,
            $dropPrice,
            $tier1Price,
            $tier2Price,
            $tier3Price,
            $tier4Price,
            $extraKmCharge
        );
        
        $stmt->execute();
        $stmt->close();
        
        // Check if vehicle_pricing table exists
        $vehiclePricingExists = tableExists($conn, 'vehicle_pricing');
        
        if ($vehiclePricingExists) {
            // Check which columns exist in vehicle_pricing
            $hasVehicleId = columnExists($conn, 'vehicle_pricing', 'vehicle_id');
            $hasVehicleType = columnExists($conn, 'vehicle_pricing', 'vehicle_type');
            
            // Generate the appropriate query based on the columns present
            if ($hasVehicleId || $hasVehicleType) {
                $tripType = 'airport';
                
                // Build the insert part of the query
                $insertFields = [];
                $placeholders = [];
                $params = [];
                $types = "";
                
                // Add vehicle_id or vehicle_type
                if ($hasVehicleId) {
                    $insertFields[] = "vehicle_id";
                    $placeholders[] = "?";
                    $params[] = $vehicleId;
                    $types .= "s";
                }
                
                if ($hasVehicleType) {
                    $insertFields[] = "vehicle_type";
                    $placeholders[] = "?";
                    $params[] = $vehicleId;
                    $types .= "s";
                }
                
                // Add trip_type field
                $insertFields[] = "trip_type";
                $placeholders[] = "?";
                $params[] = $tripType;
                $types .= "s";
                
                // Add common fields
                $commonFields = [
                    "base_fare" => $basePrice,
                    "price_per_km" => $pricePerKm,
                    "airport_base_price" => $basePrice,
                    "airport_price_per_km" => $pricePerKm,
                    "airport_pickup_price" => $pickupPrice,
                    "airport_drop_price" => $dropPrice,
                    "airport_tier1_price" => $tier1Price,
                    "airport_tier2_price" => $tier2Price,
                    "airport_tier3_price" => $tier3Price,
                    "airport_tier4_price" => $tier4Price,
                    "airport_extra_km_charge" => $extraKmCharge
                ];
                
                foreach ($commonFields as $field => $value) {
                    // Only include fields that exist in the table
                    if (columnExists($conn, 'vehicle_pricing', $field)) {
                        $insertFields[] = $field;
                        $placeholders[] = "?";
                        $params[] = $value;
                        $types .= "d";
                    }
                }
                
                // Add the updated_at field
                $insertFields[] = "updated_at";
                $placeholders[] = "NOW()";
                
                // Build the update part of the query
                $updateParts = [];
                foreach ($commonFields as $field => $value) {
                    // Only include fields that exist in the table
                    if (columnExists($conn, 'vehicle_pricing', $field)) {
                        $updateParts[] = "$field = VALUES($field)";
                    }
                }
                $updateParts[] = "updated_at = NOW()";
                
                // Construct the final query
                $sql = "INSERT INTO vehicle_pricing 
                        (" . implode(", ", $insertFields) . ")
                        VALUES (" . implode(", ", $placeholders) . ")
                        ON DUPLICATE KEY UPDATE " . implode(", ", $updateParts);
                
                $stmt = $conn->prepare($sql);
                
                if ($stmt) {
                    $stmt->bind_param($types, ...$params);
                    $stmt->execute();
                    $stmt->close();
                    error_log("Updated vehicle_pricing for airport fares: $vehicleId");
                } else {
                    error_log("Error preparing vehicle_pricing statement: " . $conn->error);
                }
            }
        }
        
        // Commit transaction
        $conn->commit();
        
        error_log("Airport fare update successful for vehicle $vehicleId", 3, __DIR__ . '/../../error.log');
        
        sendSuccessResponse(
            [
                "vehicleId" => $vehicleId,
                "tripType" => "airport"
            ],
            "Airport fare updated successfully"
        );
        
    } catch (Exception $e) {
        // Rollback on error
        $conn->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Error in airport fare update: " . $e->getMessage(), 3, __DIR__ . '/../../error.log');
    sendErrorResponse($e->getMessage(), 500, [
        "file" => $e->getFile(),
        "line" => $e->getLine()
    ]);
}
