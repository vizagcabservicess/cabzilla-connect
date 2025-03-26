
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
    
    // Check if outstation_fares exists
    $checkTableQuery = "SHOW TABLES LIKE 'outstation_fares'";
    $checkResult = $conn->query($checkTableQuery);
    
    $outstationTableExists = $checkResult && $checkResult->num_rows > 0;
    $query = "";
    
    if ($outstationTableExists) {
        // QUERY SPECIALIZED OUTSTATION FARES TABLE
        $query = "
            SELECT 
                v.vehicle_id AS id,
                of.base_price AS basePrice,
                of.price_per_km AS pricePerKm,
                of.night_halt_charge AS nightHaltCharge,
                of.driver_allowance AS driverAllowance,
                of.roundtrip_base_price AS roundTripBasePrice,
                of.roundtrip_price_per_km AS roundTripPricePerKm
            FROM 
                vehicle_types v
            LEFT JOIN 
                outstation_fares of ON v.vehicle_id = of.vehicle_id
            WHERE 
                v.is_active = 1
        ";
    } else {
        // FALLBACK TO vehicle_pricing TABLE
        $query = "
            SELECT 
                vp1.vehicle_type AS id,
                vp1.base_fare AS basePrice,
                vp1.price_per_km AS pricePerKm,
                vp1.night_halt_charge AS nightHaltCharge,
                vp1.driver_allowance AS driverAllowance,
                vp2.base_fare AS roundTripBasePrice,
                vp2.price_per_km AS roundTripPricePerKm
            FROM 
                vehicle_pricing vp1
            LEFT JOIN 
                vehicle_pricing vp2 ON vp1.vehicle_type = vp2.vehicle_type AND vp2.trip_type = 'outstation-round-trip'
            WHERE 
                vp1.trip_type = 'outstation-one-way' OR vp1.trip_type = 'outstation'
        ";
    }
    
    // Execute the query
    $result = $conn->query($query);
    
    if (!$result) {
        throw new Exception("Database query failed: " . $conn->error);
    }
    
    // Process and structure the data
    $fares = [];
    while ($row = $result->fetch_assoc()) {
        $id = $row['id'];
        
        // Skip entries with null ID
        if (!$id) continue;

        // Map to standardized properties
        $fares[$id] = [
            'basePrice' => floatval($row['basePrice'] ?? 0),
            'pricePerKm' => floatval($row['pricePerKm'] ?? 0),
            'nightHaltCharge' => floatval($row['nightHaltCharge'] ?? 0),
            'driverAllowance' => floatval($row['driverAllowance'] ?? 0),
            'roundTripBasePrice' => floatval($row['roundTripBasePrice'] ?? 0),
            'roundTripPricePerKm' => floatval($row['roundTripPricePerKm'] ?? 0)
        ];
    }
    
    // Return response
    echo json_encode([
        'fares' => $fares,
        'origin' => $origin,
        'destination' => $destination,
        'timestamp' => time(),
        'sourceTable' => $outstationTableExists ? 'outstation_fares' : 'vehicle_pricing'
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
