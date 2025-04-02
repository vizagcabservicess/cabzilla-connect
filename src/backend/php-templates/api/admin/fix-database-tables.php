
<?php
/**
 * fix-database-tables.php - Fix database issues
 * 
 * This script fixes common database issues such as NULL values in critical fields
 * and ensures proper table structure.
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Error reporting
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Response array
$response = [
    'status' => 'error',
    'message' => 'Unknown error occurred',
    'details' => [
        'tables_fixed' => [],
        'vehicle_pricing_entries' => [],
        'tables_failed' => [],
        'errors' => []
    ],
    'timestamp' => time()
];

try {
    // Define database connection 
    $dbHost = 'localhost';
    $dbName = 'u644605165_db_be';
    $dbUser = 'u644605165_usr_be';
    $dbPass = 'Vizag@1213';
    
    // Create connection
    $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
    
    // Check connection
    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }
    
    // Enable logging
    $logDir = dirname(__FILE__) . '/../../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    $logFile = $logDir . '/fix-database.log';
    error_log(date('Y-m-d H:i:s') . " - Starting database fix\n", 3, $logFile);
    
    // Begin transaction
    $conn->begin_transaction();
    
    try {
        // Fix 1: Check if vehicles table exists and fix night_halt_charge and driver_allowance fields
        if ($conn->query("SHOW TABLES LIKE 'vehicles'")->num_rows > 0) {
            error_log(date('Y-m-d H:i:s') . " - Fixing vehicles table\n", 3, $logFile);
            
            // Ensure night_halt_charge and driver_allowance are NOT NULL with DEFAULT values
            $conn->query("
                ALTER TABLE vehicles 
                MODIFY night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 700,
                MODIFY driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 250
            ");
            
            // Update any NULL values in vehicles table
            $updateResult = $conn->query("UPDATE vehicles SET night_halt_charge = 700 WHERE night_halt_charge IS NULL");
            $updateResult2 = $conn->query("UPDATE vehicles SET driver_allowance = 250 WHERE driver_allowance IS NULL");
            
            $response['details']['tables_fixed'][] = 'vehicles table - NULL values fixed in night_halt_charge and driver_allowance';
        }
        
        // Fix 2: Check if outstation_fares table exists and fix its columns
        if ($conn->query("SHOW TABLES LIKE 'outstation_fares'")->num_rows > 0) {
            error_log(date('Y-m-d H:i:s') . " - Fixing outstation_fares table\n", 3, $logFile);
            
            // Ensure night_halt_charge and driver_allowance are NOT NULL with DEFAULT values
            $conn->query("
                ALTER TABLE outstation_fares 
                MODIFY night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 700,
                MODIFY driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 250
            ");
            
            // Update any NULL values in outstation_fares table
            $conn->query("UPDATE outstation_fares SET night_halt_charge = 700 WHERE night_halt_charge IS NULL");
            $conn->query("UPDATE outstation_fares SET driver_allowance = 250 WHERE driver_allowance IS NULL");
            
            $response['details']['tables_fixed'][] = 'outstation_fares table - NULL values fixed in night_halt_charge and driver_allowance';
        }
        
        // Fix 3: Look for other tables with these columns and fix there too
        $tables = [];
        $tablesResult = $conn->query("SHOW TABLES");
        while ($table = $tablesResult->fetch_array(MYSQLI_NUM)) {
            $tables[] = $table[0];
        }
        
        foreach ($tables as $table) {
            $columnsResult = $conn->query("SHOW COLUMNS FROM `$table`");
            $columns = [];
            while ($column = $columnsResult->fetch_assoc()) {
                $columns[] = $column['Field'];
            }
            
            if (in_array('night_halt_charge', $columns)) {
                error_log(date('Y-m-d H:i:s') . " - Found night_halt_charge in $table, fixing\n", 3, $logFile);
                $conn->query("UPDATE `$table` SET night_halt_charge = 700 WHERE night_halt_charge IS NULL");
                $response['details']['tables_fixed'][] = "$table - NULL values fixed in night_halt_charge";
            }
            
            if (in_array('driver_allowance', $columns)) {
                error_log(date('Y-m-d H:i:s') . " - Found driver_allowance in $table, fixing\n", 3, $logFile);
                $conn->query("UPDATE `$table` SET driver_allowance = 250 WHERE driver_allowance IS NULL");
                $response['details']['tables_fixed'][] = "$table - NULL values fixed in driver_allowance";
            }
        }
        
        // Fix 4: Ensure all vehicles have corresponding entries in pricing tables
        $vehiclesResult = $conn->query("SELECT id, vehicle_id FROM vehicles");
        while ($vehicle = $vehiclesResult->fetch_assoc()) {
            $vehicleId = $vehicle['id'] ?? $vehicle['vehicle_id'];
            
            // Check outstation_fares
            $checkOutstation = $conn->query("SELECT COUNT(*) as count FROM outstation_fares WHERE vehicle_id = '$vehicleId'");
            $outstationCount = $checkOutstation->fetch_assoc()['count'];
            
            if ($outstationCount == 0) {
                // Create entry with default values
                $insertOutstation = $conn->query("
                    INSERT INTO outstation_fares (
                        vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance, 
                        roundtrip_base_price, roundtrip_price_per_km, created_at, updated_at
                    ) VALUES (
                        '$vehicleId', 3000, 15, 700, 250, 2850, 12.75, NOW(), NOW()
                    )
                ");
                
                if ($insertOutstation) {
                    $response['details']['vehicle_pricing_entries'][] = "Created outstation pricing for $vehicleId";
                }
            }
            
            // Check local_package_fares
            $checkLocal = $conn->query("SELECT COUNT(*) as count FROM local_package_fares WHERE vehicle_id = '$vehicleId'");
            $localCount = $checkLocal->fetch_assoc()['count'];
            
            if ($localCount == 0) {
                // Create entry with default values
                $insertLocal = $conn->query("
                    INSERT INTO local_package_fares (
                        vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, 
                        price_extra_km, price_extra_hour, created_at, updated_at
                    ) VALUES (
                        '$vehicleId', 1200, 2200, 2500, 14, 250, NOW(), NOW()
                    )
                ");
                
                if ($insertLocal) {
                    $response['details']['vehicle_pricing_entries'][] = "Created local package pricing for $vehicleId";
                }
            }
            
            // Check airport_transfer_fares
            $checkAirport = $conn->query("SELECT COUNT(*) as count FROM airport_transfer_fares WHERE vehicle_id = '$vehicleId'");
            $airportCount = $checkAirport->fetch_assoc()['count'];
            
            if ($airportCount == 0) {
                // Create entry with default values
                $insertAirport = $conn->query("
                    INSERT INTO airport_transfer_fares (
                        vehicle_id, base_price, price_per_km, pickup_price, drop_price, 
                        tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge,
                        created_at, updated_at
                    ) VALUES (
                        '$vehicleId', 3000, 12, 800, 800, 600, 800, 1000, 1200, 12, NOW(), NOW()
                    )
                ");
                
                if ($insertAirport) {
                    $response['details']['vehicle_pricing_entries'][] = "Created airport transfer pricing for $vehicleId";
                }
            }
        }
        
        // Commit all changes
        $conn->commit();
        
        // Success response
        $response['status'] = 'success';
        $response['message'] = 'Database tables fixed successfully';
        
    } catch (Exception $e) {
        // Roll back transaction on error
        $conn->rollback();
        throw $e;
    }
    
    // Close connection
    $conn->close();
    
} catch (Exception $e) {
    $errorMessage = "Error fixing database tables: " . $e->getMessage();
    error_log(date('Y-m-d H:i:s') . " - $errorMessage\n", 3, $logFile ?? null);
    
    $response['status'] = 'error';
    $response['message'] = $errorMessage;
    $response['details']['errors'][] = $e->getMessage();
}

// Send response
echo json_encode($response);
exit;
