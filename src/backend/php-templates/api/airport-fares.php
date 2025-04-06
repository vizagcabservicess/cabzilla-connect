
<?php
/**
 * Airport Fares API
 * 
 * This endpoint retrieves airport transfer fare data for one or all vehicles.
 */

require_once '../config.php';

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Add debugging headers
header('X-Debug-File: airport-fares.php');
header('X-API-Version: 1.0.4');
header('X-Timestamp: ' . time());

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Setup error handling to return proper JSON responses
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Create log directory
$logDir = dirname(__FILE__) . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/airport_fares_' . date('Y-m-d') . '.log';
ini_set('error_log', $logFile);
$timestamp = date('Y-m-d H:i:s');

try {
    $conn = getDbConnection();
    
    // Check if the connection was successful
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Get vehicle_id parameter if present, supporting multiple parameter names
    $vehicleId = null;
    if (isset($_GET['vehicle_id'])) {
        $vehicleId = $_GET['vehicle_id'];
    } elseif (isset($_GET['vehicleId'])) {
        $vehicleId = $_GET['vehicleId'];
    } elseif (isset($_GET['id'])) {
        $vehicleId = $_GET['id'];
    }
    
    // Log the request parameters
    file_put_contents($logFile, "[$timestamp] Airport fares request: " . json_encode([
        'vehicle_id' => $vehicleId
    ]) . "\n", FILE_APPEND);
    
    // Check if airport_transfer_fares table exists
    $checkTableQuery = "SHOW TABLES LIKE 'airport_transfer_fares'";
    $checkResult = $conn->query($checkTableQuery);
    
    $airportTableExists = $checkResult && $checkResult->num_rows > 0;
    
    // Log which table will be used
    file_put_contents($logFile, "[$timestamp] Checking airport_transfer_fares table exists: " . ($airportTableExists ? 'yes' : 'no') . "\n", FILE_APPEND);
    
    // If airport_transfer_fares table exists, check if required columns exist
    if ($airportTableExists) {
        $columnCheck = $conn->query("SHOW COLUMNS FROM airport_transfer_fares LIKE 'night_charges'");
        $nightChargesExists = $columnCheck && $columnCheck->num_rows > 0;
        
        if (!$nightChargesExists) {
            // Add the missing column if it doesn't exist
            file_put_contents($logFile, "[$timestamp] Adding missing night_charges column to airport_transfer_fares table\n", FILE_APPEND);
            $conn->query("ALTER TABLE airport_transfer_fares ADD COLUMN night_charges DECIMAL(10,2) DEFAULT 150");
        }
        
        $columnCheck = $conn->query("SHOW COLUMNS FROM airport_transfer_fares LIKE 'extra_waiting_charges'");
        $extraWaitingChargesExists = $columnCheck && $columnCheck->num_rows > 0;
        
        if (!$extraWaitingChargesExists) {
            file_put_contents($logFile, "[$timestamp] Adding missing extra_waiting_charges column to airport_transfer_fares table\n", FILE_APPEND);
            $conn->query("ALTER TABLE airport_transfer_fares ADD COLUMN extra_waiting_charges DECIMAL(10,2) DEFAULT 100");
        }
    }
    
    $query = "";
    $useAirportTable = false;
    
    // Determine which table to use for airport fares
    if ($airportTableExists) {
        // Check if the airport_transfer_fares table has data
        $countQuery = "SELECT COUNT(*) as count FROM airport_transfer_fares";
        $countResult = $conn->query($countQuery);
        $row = $countResult->fetch_assoc();
        $hasData = $row['count'] > 0;
        
        file_put_contents($logFile, "[$timestamp] airport_transfer_fares table has data: " . ($hasData ? 'yes' : 'no') . "\n", FILE_APPEND);
        
        if ($hasData) {
            $useAirportTable = true;
            // QUERY SPECIALIZED AIRPORT FARES TABLE
            $query = "
                SELECT 
                    atf.id,
                    atf.vehicle_id,
                    atf.base_price AS basePrice,
                    atf.price_per_km AS pricePerKm,
                    atf.pickup_price AS pickupPrice,
                    atf.drop_price AS dropPrice,
                    atf.tier1_price AS tier1Price,
                    atf.tier2_price AS tier2Price,
                    atf.tier3_price AS tier3Price,
                    atf.tier4_price AS tier4Price,
                    atf.extra_km_charge AS extraKmCharge,
                    COALESCE(atf.night_charges, 150) AS nightCharges,
                    COALESCE(atf.extra_waiting_charges, 100) AS extraWaitingCharges
                FROM 
                    airport_transfer_fares atf
            ";
            
            // If vehicle_id parameter is provided, filter by it
            if ($vehicleId) {
                $query .= " WHERE atf.vehicle_id = '$vehicleId'";
            }
            
            file_put_contents($logFile, "[$timestamp] Using airport_transfer_fares table with query: $query\n", FILE_APPEND);
        }
    }
    
    // Fallback to vehicle_pricing table if needed
    if (!$useAirportTable) {
        file_put_contents($logFile, "[$timestamp] Falling back to vehicle_pricing table\n", FILE_APPEND);
        // FALLBACK TO vehicle_pricing TABLE
        $query = "
            SELECT 
                vp.id,
                vp.vehicle_id,
                vp.airport_base_price AS basePrice,
                vp.airport_price_per_km AS pricePerKm,
                vp.airport_pickup_price AS pickupPrice,
                vp.airport_drop_price AS dropPrice,
                vp.airport_tier1_price AS tier1Price,
                vp.airport_tier2_price AS tier2Price,
                vp.airport_tier3_price AS tier3Price,
                vp.airport_tier4_price AS tier4Price,
                vp.airport_extra_km_charge AS extraKmCharge,
                COALESCE(vp.airport_night_charges, 150) AS nightCharges,
                COALESCE(vp.airport_extra_waiting_charges, 100) AS extraWaitingCharges
            FROM 
                vehicle_pricing vp
            WHERE 
                vp.trip_type = 'airport'
        ";
        
        // If vehicle_id parameter is provided, filter by it
        if ($vehicleId) {
            $query .= " AND vp.vehicle_id = '$vehicleId'";
        }
        
        file_put_contents($logFile, "[$timestamp] Using vehicle_pricing table with query: $query\n", FILE_APPEND);
    }
    
    // Execute the query with error handling
    file_put_contents($logFile, "[$timestamp] Executing airport query: " . $query . "\n", FILE_APPEND);
    $result = $conn->query($query);
    
    if (!$result) {
        file_put_contents($logFile, "[$timestamp] Query failed: " . $conn->error . "\n", FILE_APPEND);
        throw new Exception("Database query failed: " . $conn->error);
    }
    
    // Process and structure the data
    $fares = [];
    while ($row = $result->fetch_assoc()) {
        $id = $row['vehicle_id'] ?? null;
        
        // Skip entries with null ID
        if (!$id) continue;
        
        file_put_contents($logFile, "[$timestamp] Processing row for vehicle: $id\n", FILE_APPEND);
        
        // Check if this row has any useful fare data
        $hasData = false;
        foreach (['basePrice', 'pickupPrice', 'dropPrice', 'tier1Price', 'tier2Price'] as $key) {
            if (!empty($row[$key])) {
                $hasData = true;
                break;
            }
        }
        
        if (!$hasData) {
            file_put_contents($logFile, "[$timestamp] Skipping row for $id as it has no useful data\n", FILE_APPEND);
            continue;
        }
        
        // Map to standardized properties
        $fares[$id] = [
            'vehicleId' => $id,
            'basePrice' => floatval($row['basePrice'] ?? 0),
            'pricePerKm' => floatval($row['pricePerKm'] ?? 0),
            'pickupPrice' => floatval($row['pickupPrice'] ?? 0),
            'dropPrice' => floatval($row['dropPrice'] ?? 0),
            'tier1Price' => floatval($row['tier1Price'] ?? 0),
            'tier2Price' => floatval($row['tier2Price'] ?? 0),
            'tier3Price' => floatval($row['tier3Price'] ?? 0),
            'tier4Price' => floatval($row['tier4Price'] ?? 0),
            'extraKmCharge' => floatval($row['extraKmCharge'] ?? 0),
            'nightCharges' => floatval($row['nightCharges'] ?? 150),
            'extraWaitingCharges' => floatval($row['extraWaitingCharges'] ?? 100)
        ];
        
        file_put_contents($logFile, "[$timestamp] Fare data for $id: " . json_encode($fares[$id]) . "\n", FILE_APPEND);
    }
    
    file_put_contents($logFile, "[$timestamp] Total fares found: " . count($fares) . "\n", FILE_APPEND);
    
    // Return response with debugging info
    echo json_encode([
        'status' => 'success',
        'fares' => $fares,
        'timestamp' => time(),
        'sourceTable' => $useAirportTable ? 'airport_transfer_fares' : 'vehicle_pricing',
        'fareCount' => count($fares),
        'vehicleId' => $vehicleId
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] Error in airport-fares.php: " . $e->getMessage() . "\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ], JSON_PRETTY_PRINT);
}
