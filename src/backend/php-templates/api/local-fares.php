
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
    
    // Check if pricing_data exists, if not try to fetch from specialized table
    $checkTableQuery = "SHOW TABLES LIKE 'local_package_fares'";
    $checkResult = $conn->query($checkTableQuery);
    
    $localTableExists = $checkResult && $checkResult->num_rows > 0;
    $query = "";
    
    // Use the specialized local_package_fares table if it exists
    if ($localTableExists) {
        // QUERY SPECIALIZED LOCAL FARES TABLE
        $query = "
            SELECT 
                v.vehicle_id as id,
                lpf.price_4hrs_40km as price4hrs40km,
                lpf.price_8hrs_80km as price8hrs80km,
                lpf.price_10hrs_100km as price10hrs100km,
                lpf.price_extra_km as priceExtraKm,
                lpf.price_extra_hour as priceExtraHour
            FROM 
                vehicle_types v
            LEFT JOIN 
                local_package_fares lpf ON v.vehicle_id = lpf.vehicle_id
            WHERE 
                v.is_active = 1
        ";
    } else {
        // FALLBACK TO vehicle_pricing TABLE
        $query = "
            SELECT 
                vp.vehicle_type as id,
                vp.local_package_4hr as price4hrs40km,
                vp.local_package_8hr as price8hrs80km,
                vp.local_package_10hr as price10hrs100km,
                vp.extra_km_charge as priceExtraKm,
                vp.extra_hour_charge as priceExtraHour
            FROM 
                vehicle_pricing vp
            WHERE 
                vp.trip_type = 'local'
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
            'price4hrs40km' => floatval($row['price4hrs40km'] ?? 0),
            'price8hrs80km' => floatval($row['price8hrs80km'] ?? 0),
            'price10hrs100km' => floatval($row['price10hrs100km'] ?? 0),
            'priceExtraKm' => floatval($row['priceExtraKm'] ?? 0),
            'priceExtraHour' => floatval($row['priceExtraHour'] ?? 0)
        ];
    }
    
    // Return response
    echo json_encode([
        'fares' => $fares,
        'timestamp' => time(),
        'sourceTable' => $localTableExists ? 'local_package_fares' : 'vehicle_pricing'
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
