
<?php
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
header('X-API-Version: 1.0.2');
header('X-Timestamp: ' . time());

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $conn = getDbConnection();
    
    // Check if the connection was successful
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Get vehicle_id parameter if present
    $vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null;
    
    // Log the request parameters
    error_log("Airport fares request: " . json_encode([
        'vehicle_id' => $vehicleId
    ]));
    
    // Check if airport_transfer_fares table exists
    $checkTableQuery = "SHOW TABLES LIKE 'airport_transfer_fares'";
    $checkResult = $conn->query($checkTableQuery);
    
    $airportTableExists = $checkResult && $checkResult->num_rows > 0;
    
    // Log which table will be used
    error_log("Checking airport_transfer_fares table exists: " . ($airportTableExists ? 'yes' : 'no'));
    
    $query = "";
    $useAirportTable = false;
    
    if ($airportTableExists) {
        // Check if the required columns exist
        $columnCheck = $conn->query("SHOW COLUMNS FROM airport_transfer_fares LIKE 'night_charges'");
        $nightChargesExists = $columnCheck && $columnCheck->num_rows > 0;
        
        if (!$nightChargesExists) {
            // Add the missing columns if they don't exist
            error_log("Adding missing night_charges column to airport_transfer_fares table");
            $conn->query("ALTER TABLE airport_transfer_fares ADD COLUMN night_charges DECIMAL(10,2) DEFAULT 0");
        }
        
        $columnCheck = $conn->query("SHOW COLUMNS FROM airport_transfer_fares LIKE 'extra_waiting_charges'");
        $extraWaitingChargesExists = $columnCheck && $columnCheck->num_rows > 0;
        
        if (!$extraWaitingChargesExists) {
            error_log("Adding missing extra_waiting_charges column to airport_transfer_fares table");
            $conn->query("ALTER TABLE airport_transfer_fares ADD COLUMN extra_waiting_charges DECIMAL(10,2) DEFAULT 0");
        }
        
        // First check if the airport_transfer_fares table has data
        $countQuery = "SELECT COUNT(*) as count FROM airport_transfer_fares";
        $countResult = $conn->query($countQuery);
        $row = $countResult->fetch_assoc();
        $hasData = $row['count'] > 0;
        
        error_log("airport_transfer_fares table has data: " . ($hasData ? 'yes' : 'no'));
        
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
                    atf.night_charges AS nightCharges,
                    atf.extra_waiting_charges AS extraWaitingCharges
                FROM 
                    airport_transfer_fares atf
            ";
            
            // If vehicle_id parameter is provided, filter by it
            if ($vehicleId) {
                $query .= " WHERE atf.vehicle_id = '$vehicleId'";
            }
            
            error_log("Using airport_transfer_fares table with query: $query");
        }
    }
    
    // Fallback to vehicle_pricing table if needed
    if (!$useAirportTable) {
        error_log("Falling back to vehicle_pricing table");
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
                vp.airport_night_charges AS nightCharges,
                vp.airport_extra_waiting_charges AS extraWaitingCharges
            FROM 
                vehicle_pricing vp
            WHERE 
                vp.trip_type = 'airport'
        ";
        
        // If vehicle_id parameter is provided, filter by it
        if ($vehicleId) {
            $query .= " AND vp.vehicle_id = '$vehicleId'";
        }
        
        error_log("Using vehicle_pricing table with query: $query");
    }
    
    // Execute the query with error handling
    error_log("Executing airport query: " . $query);
    $result = $conn->query($query);
    
    if (!$result) {
        error_log("Query failed: " . $conn->error);
        throw new Exception("Database query failed: " . $conn->error);
    }
    
    // Process and structure the data
    $fares = [];
    while ($row = $result->fetch_assoc()) {
        $id = $row['vehicle_id'] ?? null;
        
        // Skip entries with null ID
        if (!$id) continue;
        
        error_log("Processing row for vehicle: $id");
        
        // Check if this row has any useful fare data
        $hasData = false;
        foreach (['basePrice', 'pickupPrice', 'dropPrice', 'tier1Price', 'tier2Price'] as $key) {
            if (!empty($row[$key])) {
                $hasData = true;
                break;
            }
        }
        
        if (!$hasData) {
            error_log("Skipping row for $id as it has no useful data");
            continue;
        }
        
        // Map to standardized properties
        $fares[$id] = [
            'basePrice' => floatval($row['basePrice'] ?? 0),
            'pricePerKm' => floatval($row['pricePerKm'] ?? 0),
            'pickupPrice' => floatval($row['pickupPrice'] ?? 0),
            'dropPrice' => floatval($row['dropPrice'] ?? 0),
            'tier1Price' => floatval($row['tier1Price'] ?? 0),
            'tier2Price' => floatval($row['tier2Price'] ?? 0),
            'tier3Price' => floatval($row['tier3Price'] ?? 0),
            'tier4Price' => floatval($row['tier4Price'] ?? 0),
            'extraKmCharge' => floatval($row['extraKmCharge'] ?? 0),
            'nightCharges' => floatval($row['nightCharges'] ?? 0),
            'extraWaitingCharges' => floatval($row['extraWaitingCharges'] ?? 0)
        ];
        
        error_log("Fare data for $id: " . json_encode($fares[$id]));
    }
    
    error_log("Total fares found: " . count($fares));
    
    // Return response with debugging info
    echo json_encode([
        'fares' => $fares,
        'timestamp' => time(),
        'sourceTable' => $useAirportTable ? 'airport_transfer_fares' : 'vehicle_pricing',
        'fareCount' => count($fares),
        'vehicleId' => $vehicleId
    ]);
    
} catch (Exception $e) {
    error_log("Error in airport-fares.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
