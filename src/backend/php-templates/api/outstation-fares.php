
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
header('X-API-Version: 1.0.3');
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
    
    // Sync outstation_fares to vehicle_pricing if needed
    if (isset($_GET['sync']) && $_GET['sync'] === 'true') {
        $syncQuery = "
            UPDATE vehicle_pricing vp
            JOIN outstation_fares of ON vp.vehicle_id = of.vehicle_id
            SET 
                vp.base_fare = of.base_price,
                vp.price_per_km = of.price_per_km,
                vp.night_halt_charge = of.night_halt_charge,
                vp.driver_allowance = of.driver_allowance,
                vp.updated_at = CURRENT_TIMESTAMP
            WHERE vp.trip_type IN ('outstation', 'outstation-one-way')
        ";
        
        $syncRtQuery = "
            UPDATE vehicle_pricing vp
            JOIN outstation_fares of ON vp.vehicle_id = of.vehicle_id
            SET 
                vp.base_fare = of.roundtrip_base_price,
                vp.price_per_km = of.roundtrip_price_per_km,
                vp.night_halt_charge = of.night_halt_charge,
                vp.driver_allowance = of.driver_allowance,
                vp.updated_at = CURRENT_TIMESTAMP
            WHERE vp.trip_type = 'outstation-round-trip'
        ";
        
        $conn->query($syncQuery);
        $conn->query($syncRtQuery);
        
        error_log("Synced outstation_fares to vehicle_pricing");
    }
    
    // Only use outstation_fares table - no more conditional fallback
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
    
    // Execute the query with error handling
    $result = $conn->query($query);
    
    if (!$result) {
        error_log("Query failed: " . $conn->error);
        throw new Exception("Failed to query outstation_fares: " . $conn->error);
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
    
    // If no outstation_fares were found or we have a sync param, check if we need to sync from vehicle_pricing
    if ((count($fares) === 0 || isset($_GET['check_sync'])) && !isset($_GET['sync'])) {
        error_log("No fares found in outstation_fares, checking if we need to sync from vehicle_pricing");
        
        // Check if there are any rows in vehicle_pricing that need to be synced
        $checkQuery = "
            SELECT 
                vp.vehicle_id,
                vp.base_fare,
                vp.price_per_km,
                vp.night_halt_charge,
                vp.driver_allowance
            FROM 
                vehicle_pricing vp
            LEFT JOIN
                outstation_fares of ON vp.vehicle_id = of.vehicle_id
            WHERE 
                (vp.trip_type = 'outstation' OR vp.trip_type = 'outstation-one-way')
                AND of.id IS NULL
        ";
        
        $checkResult = $conn->query($checkQuery);
        
        if ($checkResult && $checkResult->num_rows > 0) {
            error_log("Found " . $checkResult->num_rows . " vehicles in vehicle_pricing that need to be synced to outstation_fares");
            
            // Import data from vehicle_pricing to outstation_fares
            while ($row = $checkResult->fetch_assoc()) {
                $vId = $row['vehicle_id'];
                $baseFare = $row['base_fare'];
                $pricePerKm = $row['price_per_km'];
                $nightHaltCharge = $row['night_halt_charge'];
                $driverAllowance = $row['driver_allowance'];
                
                error_log("Syncing vehicle $vId from vehicle_pricing to outstation_fares");
                
                // Get roundtrip values if available
                $rtQuery = "
                    SELECT base_fare, price_per_km 
                    FROM vehicle_pricing 
                    WHERE vehicle_id = '$vId' AND trip_type = 'outstation-round-trip'
                ";
                
                $rtResult = $conn->query($rtQuery);
                $rtBaseFare = 0;
                $rtPricePerKm = 0;
                
                if ($rtResult && $rtResult->num_rows > 0) {
                    $rtRow = $rtResult->fetch_assoc();
                    $rtBaseFare = $rtRow['base_fare'];
                    $rtPricePerKm = $rtRow['price_per_km'];
                }
                
                // Insert into outstation_fares
                $insertQuery = "
                    INSERT INTO outstation_fares (
                        vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance, 
                        roundtrip_base_price, roundtrip_price_per_km
                    ) VALUES (
                        '$vId', $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance,
                        $rtBaseFare, $rtPricePerKm
                    )
                ";
                
                if ($conn->query($insertQuery)) {
                    error_log("Successfully synced vehicle $vId to outstation_fares");
                } else {
                    error_log("Failed to sync vehicle $vId to outstation_fares: " . $conn->error);
                }
            }
            
            // Now try to query again from outstation_fares
            $result = $conn->query($query);
            
            if ($result) {
                $fares = [];
                while ($row = $result->fetch_assoc()) {
                    $id = $row['vehicle_id'] ?? null;
                    
                    if (!$id) continue;
                    
                    $nightHaltCharge = floatval($row['nightHaltCharge'] ?? 0);
                    
                    $fares[$id] = [
                        'basePrice' => floatval($row['basePrice'] ?? 0),
                        'pricePerKm' => floatval($row['pricePerKm'] ?? 0),
                        'nightHaltCharge' => $nightHaltCharge,
                        'driverAllowance' => floatval($row['driverAllowance'] ?? 0),
                        'roundTripBasePrice' => floatval($row['roundTripBasePrice'] ?? 0),
                        'roundTripPricePerKm' => floatval($row['roundTripPricePerKm'] ?? 0),
                        'nightHalt' => $nightHaltCharge
                    ];
                }
                
                error_log("After sync, found " . count($fares) . " outstation fares");
            }
        }
    }
    
    // Return response with debug information
    echo json_encode([
        'fares' => $fares,
        'origin' => $origin,
        'destination' => $destination,
        'timestamp' => time(),
        'sourceTable' => 'outstation_fares',
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
