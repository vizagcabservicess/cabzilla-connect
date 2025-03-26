
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
header('X-Debug-File: outstation-fares.php');
header('X-API-Version: 1.0.1');
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
    
    // Get origin and destination parameters if present
    $origin = isset($_GET['origin']) ? $_GET['origin'] : null;
    $destination = isset($_GET['destination']) ? $_GET['destination'] : null;
    $vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null;
    
    // Log the request parameters
    error_log("Outstation fares request: " . json_encode([
        'origin' => $origin,
        'destination' => $destination,
        'vehicle_id' => $vehicleId
    ]));
    
    // Check if outstation_fares table exists and has data
    $checkTableQuery = "SHOW TABLES LIKE 'outstation_fares'";
    $checkResult = $conn->query($checkTableQuery);
    
    $outstationTableExists = $checkResult && $checkResult->num_rows > 0;
    
    // Log which table will be used
    error_log("Checking outstation_fares table exists: " . ($outstationTableExists ? 'yes' : 'no'));
    
    $query = "";
    $useOutstationTable = false;
    
    if ($outstationTableExists) {
        // Check if the table has data
        $countQuery = "SELECT COUNT(*) as count FROM outstation_fares";
        $countResult = $conn->query($countQuery);
        $row = $countResult->fetch_assoc();
        $hasData = $row['count'] > 0;
        
        error_log("outstation_fares table has data: " . ($hasData ? 'yes' : 'no'));
        
        if ($hasData) {
            $useOutstationTable = true;
            // QUERY SPECIALIZED OUTSTATION FARES TABLE
            $query = "
                SELECT 
                    of.id,
                    of.vehicle_id,
                    of.base_price AS basePrice,
                    of.price_per_km AS pricePerKm,
                    of.night_halt_charge AS nightHaltCharge,
                    of.driver_allowance AS driverAllowance,
                    of.roundtrip_base_price AS roundTripBasePrice,
                    of.roundtrip_price_per_km AS roundTripPricePerKm
                FROM 
                    outstation_fares of
            ";
            
            // If vehicle_id parameter is provided, filter by it
            if ($vehicleId) {
                $query .= " WHERE of.vehicle_id = '$vehicleId'";
            }
            
            error_log("Using outstation_fares table with query: $query");
        }
    }
    
    // Fallback to vehicle_pricing table if needed
    if (!$useOutstationTable) {
        error_log("Falling back to vehicle_pricing table");
        // FALLBACK TO vehicle_pricing TABLE
        $query = "
            SELECT 
                vp.id,
                vp.vehicle_id,
                vp.base_fare AS basePrice,
                vp.price_per_km AS pricePerKm,
                vp.night_halt_charge AS nightHaltCharge,
                vp.driver_allowance AS driverAllowance,
                vp.round_trip_base_fare AS roundTripBasePrice,
                vp.round_trip_price_per_km AS roundTripPricePerKm
            FROM 
                vehicle_pricing vp
            WHERE 
                vp.trip_type = 'outstation-one-way' OR vp.trip_type = 'outstation'
        ";
        
        // If vehicle_id parameter is provided, filter by it
        if ($vehicleId) {
            $query = "
                SELECT 
                    vp.id,
                    vp.vehicle_id,
                    vp.base_fare AS basePrice,
                    vp.price_per_km AS pricePerKm,
                    vp.night_halt_charge AS nightHaltCharge,
                    vp.driver_allowance AS driverAllowance,
                    vp.round_trip_base_fare AS roundTripBasePrice,
                    vp.round_trip_price_per_km AS roundTripPricePerKm
                FROM 
                    vehicle_pricing vp
                WHERE 
                    (vp.trip_type = 'outstation-one-way' OR vp.trip_type = 'outstation')
                    AND vp.vehicle_id = '$vehicleId'
            ";
        }
        
        error_log("Using vehicle_pricing table with query: $query");
    }
    
    // Execute the query with error handling
    error_log("Executing outstation query: " . $query);
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

        // Add nightHalt as an alias for nightHaltCharge
        $nightHaltCharge = floatval($row['nightHaltCharge'] ?? 0);

        // Map to standardized properties
        $fares[$id] = [
            'basePrice' => floatval($row['basePrice'] ?? 0),
            'pricePerKm' => floatval($row['pricePerKm'] ?? 0),
            'nightHaltCharge' => $nightHaltCharge,
            'driverAllowance' => floatval($row['driverAllowance'] ?? 0),
            'roundTripBasePrice' => floatval($row['roundTripBasePrice'] ?? 0),
            'roundTripPricePerKm' => floatval($row['roundTripPricePerKm'] ?? 0),
            // Add aliases for backward compatibility
            'nightHalt' => $nightHaltCharge
        ];
        
        error_log("Fare data for $id: " . json_encode($fares[$id]));
    }
    
    error_log("Total fares found: " . count($fares));
    
    // Return response with debug information
    echo json_encode([
        'fares' => $fares,
        'origin' => $origin,
        'destination' => $destination,
        'timestamp' => time(),
        'sourceTable' => $useOutstationTable ? 'outstation_fares' : 'vehicle_pricing',
        'fareCount' => count($fares),
        'vehicleId' => $vehicleId
    ]);
    
} catch (Exception $e) {
    error_log("Error in outstation-fares.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
