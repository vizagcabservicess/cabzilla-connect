
<?php
/**
 * Database utility functions for establishing connections
 */

// Get database connection
function getDbConnection() {
    // Database credentials
    $dbHost = 'localhost';
    $dbName = 'u644605165_db_be';
    $dbUser = 'u644605165_usr_be';
    $dbPass = 'Vizag@1213';
    
    try {
        // Create connection
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        
        // Check connection
        if ($conn->connect_error) {
            throw new Exception("Connection failed: " . $conn->connect_error);
        }
        
        // Set charset - CRITICAL: This must be utf8mb4 with collation utf8mb4_unicode_ci
        $conn->set_charset("utf8mb4");
        
        // Set collation explicitly to ensure consistency
        $conn->query("SET collation_connection = 'utf8mb4_unicode_ci'");
        
        return $conn;
    } catch (Exception $e) {
        // Log error
        $logDir = __DIR__ . '/../../logs';
        if (!file_exists($logDir)) {
            mkdir($logDir, 0777, true);
        }
        
        $logFile = $logDir . '/database_error_' . date('Y-m-d') . '.log';
        $timestamp = date('Y-m-d H:i:s');
        file_put_contents($logFile, "[$timestamp] Database connection error: " . $e->getMessage() . "\n", FILE_APPEND);
        
        return null;
    }
}

// Function to safely escape a value for database queries
function dbEscape($conn, $value) {
    if ($conn) {
        return $conn->real_escape_string($value);
    }
    
    // Fallback if no connection
    return str_replace(["'", "\""], ["\'", "\\\""], $value);
}

// Function to safely prepare a query if prepared statements are available
function safePrepare($conn, $query, $params = [], $types = '') {
    if (!$conn) {
        return false;
    }
    
    if (empty($params)) {
        return $conn->query($query);
    }
    
    $stmt = $conn->prepare($query);
    
    if (!$stmt) {
        return false;
    }
    
    if (!empty($params)) {
        if (empty($types)) {
            // Auto-generate types string
            $types = '';
            foreach ($params as $param) {
                if (is_int($param)) {
                    $types .= 'i';
                } else if (is_float($param) || is_double($param)) {
                    $types .= 'd';
                } else if (is_string($param)) {
                    $types .= 's';
                } else {
                    $types .= 's'; // Default to string
                }
            }
        }
        
        $stmt->bind_param($types, ...$params);
    }
    
    $stmt->execute();
    return $stmt;
}

/**
 * Function to synchronize airport fares between tables
 * This ensures data is consistent between airport_transfer_fares and vehicle_pricing
 */
function syncAirportFaresTables() {
    $conn = getDbConnection();
    if (!$conn) {
        return false;
    }
    
    try {
        // First ensure tables exist
        $tables = ['airport_transfer_fares', 'vehicle_pricing', 'vehicles'];
        foreach ($tables as $table) {
            $result = $conn->query("SHOW TABLES LIKE '$table'");
            if ($result->num_rows === 0) {
                // Table doesn't exist, call the global function
                require_once __DIR__ . '/../../config.php';
                ensureDatabaseTables();
                break;
            }
        }
        
        // Get all vehicles
        $vehiclesQuery = "SELECT id, vehicle_id, name FROM vehicles";
        $vehiclesResult = $conn->query($vehiclesQuery);
        
        if (!$vehiclesResult) {
            throw new Exception("Failed to fetch vehicles: " . $conn->error);
        }
        
        $vehicles = [];
        while ($row = $vehiclesResult->fetch_assoc()) {
            $vehicleId = $row['vehicle_id'];
            $vehicles[$vehicleId] = $row;
        }
        
        // For each vehicle, make sure it exists in airport_transfer_fares
        foreach ($vehicles as $vehicleId => $vehicle) {
            // Check if it exists in airport_transfer_fares
            $stmt = $conn->prepare("SELECT id FROM airport_transfer_fares WHERE vehicle_id = ?");
            $stmt->bind_param("s", $vehicleId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                // Not in airport_transfer_fares, insert with defaults
                $insertStmt = $conn->prepare("
                    INSERT INTO airport_transfer_fares 
                    (vehicle_id, base_price, price_per_km, pickup_price, drop_price, 
                    tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge)
                    VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0, 0)
                ");
                
                $insertStmt->bind_param("s", $vehicleId);
                $insertStmt->execute();
            }
            
            // Check if it exists in vehicle_pricing with trip_type='airport'
            $stmt = $conn->prepare("SELECT id FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = 'airport'");
            $stmt->bind_param("s", $vehicleId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                // Not in vehicle_pricing, insert with defaults
                $insertStmt = $conn->prepare("
                    INSERT INTO vehicle_pricing 
                    (vehicle_id, trip_type, base_fare, price_per_km,
                    airport_base_price, airport_price_per_km, airport_pickup_price, airport_drop_price,
                    airport_tier1_price, airport_tier2_price, airport_tier3_price, airport_tier4_price, 
                    airport_extra_km_charge)
                    VALUES (?, 'airport', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
                ");
                
                $insertStmt->bind_param("s", $vehicleId);
                $insertStmt->execute();
            }
        }
        
        // Now sync data from airport_transfer_fares to vehicle_pricing
        $syncFromAirportTransferQuery = "
            UPDATE vehicle_pricing vp
            JOIN airport_transfer_fares atf ON vp.vehicle_id = atf.vehicle_id
            SET 
                vp.airport_base_price = atf.base_price,
                vp.airport_price_per_km = atf.price_per_km,
                vp.airport_pickup_price = atf.pickup_price,
                vp.airport_drop_price = atf.drop_price,
                vp.airport_tier1_price = atf.tier1_price,
                vp.airport_tier2_price = atf.tier2_price,
                vp.airport_tier3_price = atf.tier3_price,
                vp.airport_tier4_price = atf.tier4_price,
                vp.airport_extra_km_charge = atf.extra_km_charge,
                vp.updated_at = NOW()
            WHERE vp.trip_type = 'airport'
        ";
        
        $conn->query($syncFromAirportTransferQuery);
        
        // Also sync from vehicle_pricing to airport_transfer_fares for any missing entries
        $syncFromVehiclePricingQuery = "
            UPDATE airport_transfer_fares atf
            JOIN vehicle_pricing vp ON atf.vehicle_id = vp.vehicle_id
            SET 
                atf.base_price = CASE WHEN atf.base_price = 0 THEN vp.airport_base_price ELSE atf.base_price END,
                atf.price_per_km = CASE WHEN atf.price_per_km = 0 THEN vp.airport_price_per_km ELSE atf.price_per_km END,
                atf.pickup_price = CASE WHEN atf.pickup_price = 0 THEN vp.airport_pickup_price ELSE atf.pickup_price END,
                atf.drop_price = CASE WHEN atf.drop_price = 0 THEN vp.airport_drop_price ELSE atf.drop_price END,
                atf.tier1_price = CASE WHEN atf.tier1_price = 0 THEN vp.airport_tier1_price ELSE atf.tier1_price END,
                atf.tier2_price = CASE WHEN atf.tier2_price = 0 THEN vp.airport_tier2_price ELSE atf.tier2_price END,
                atf.tier3_price = CASE WHEN atf.tier3_price = 0 THEN vp.airport_tier3_price ELSE atf.tier3_price END,
                atf.tier4_price = CASE WHEN atf.tier4_price = 0 THEN vp.airport_tier4_price ELSE atf.tier4_price END,
                atf.extra_km_charge = CASE WHEN atf.extra_km_charge = 0 THEN vp.airport_extra_km_charge ELSE atf.extra_km_charge END,
                atf.updated_at = NOW()
            WHERE vp.trip_type = 'airport'
        ";
        
        $conn->query($syncFromVehiclePricingQuery);
        
        return true;
    } catch (Exception $e) {
        error_log("Failed to sync airport fares tables: " . $e->getMessage());
        return false;
    } finally {
        if ($conn) {
            $conn->close();
        }
    }
}
