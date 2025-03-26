
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
    
    // Check if airport_transfer_fares exists
    $checkTableQuery = "SHOW TABLES LIKE 'airport_transfer_fares'";
    $checkResult = $conn->query($checkTableQuery);
    
    $airportTableExists = $checkResult && $checkResult->num_rows > 0;
    $query = "";
    
    if ($airportTableExists) {
        // QUERY SPECIALIZED AIRPORT FARES TABLE
        $query = "
            SELECT 
                v.vehicle_id AS id,
                atf.base_price AS basePrice,
                atf.price_per_km AS pricePerKm,
                atf.pickup_price AS pickupPrice,
                atf.drop_price AS dropPrice,
                atf.tier1_price AS tier1Price,
                atf.tier2_price AS tier2Price,
                atf.tier3_price AS tier3Price,
                atf.tier4_price AS tier4Price,
                atf.extra_km_charge AS extraKmCharge
            FROM 
                vehicle_types v
            LEFT JOIN 
                airport_transfer_fares atf ON v.vehicle_id = atf.vehicle_id
            WHERE 
                v.is_active = 1
        ";
    } else {
        // FALLBACK TO vehicle_pricing TABLE
        $query = "
            SELECT 
                vp.vehicle_type AS id,
                vp.airport_base_price AS basePrice,
                vp.airport_price_per_km AS pricePerKm,
                vp.airport_pickup_price AS pickupPrice,
                vp.airport_drop_price AS dropPrice,
                vp.airport_tier1_price AS tier1Price,
                vp.airport_tier2_price AS tier2Price,
                vp.airport_tier3_price AS tier3Price,
                vp.airport_tier4_price AS tier4Price,
                vp.airport_extra_km_charge AS extraKmCharge
            FROM 
                vehicle_pricing vp
            WHERE 
                vp.trip_type = 'airport'
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
        
        // Check if this row has any useful fare data
        $hasData = false;
        foreach (['basePrice', 'pickupPrice', 'dropPrice', 'tier1Price', 'tier2Price'] as $key) {
            if (!empty($row[$key])) {
                $hasData = true;
                break;
            }
        }
        
        if (!$hasData) continue;
        
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
            'extraKmCharge' => floatval($row['extraKmCharge'] ?? 0)
        ];
    }
    
    // Return response with debugging info
    echo json_encode([
        'fares' => $fares,
        'timestamp' => time(),
        'sourceTable' => $airportTableExists ? 'airport_transfer_fares' : 'vehicle_pricing',
        'fareCount' => count($fares)
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
