
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
header('X-Debug-File: local-fares.php');
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
    
    // Get vehicle_id parameter if present
    $vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null;
    
    // Log the request parameters
    error_log("Local fares request: " . json_encode([
        'vehicle_id' => $vehicleId
    ]));
    
    // Check if local_package_fares exists, if not try to fetch from specialized table
    $checkTableQuery = "SHOW TABLES LIKE 'local_package_fares'";
    $checkResult = $conn->query($checkTableQuery);
    
    $localTableExists = $checkResult && $checkResult->num_rows > 0;
    
    // Log which table will be used
    error_log("Checking local_package_fares table exists: " . ($localTableExists ? 'yes' : 'no'));
    
    $query = "";
    $useLocalTable = false;
    
    // Use the specialized local_package_fares table if it exists and has data
    if ($localTableExists) {
        // Check if the table has data
        $countQuery = "SELECT COUNT(*) as count FROM local_package_fares";
        $countResult = $conn->query($countQuery);
        $row = $countResult->fetch_assoc();
        $hasData = $row['count'] > 0;
        
        error_log("local_package_fares table has data: " . ($hasData ? 'yes' : 'no'));
        
        if ($hasData) {
            $useLocalTable = true;
            // QUERY SPECIALIZED LOCAL FARES TABLE
            $query = "
                SELECT 
                    lpf.id,
                    lpf.vehicle_id,
                    lpf.price_4hrs_40km as price4hrs40km,
                    lpf.price_8hrs_80km as price8hrs80km,
                    lpf.price_10hrs_100km as price10hrs100km,
                    lpf.price_extra_km as priceExtraKm,
                    lpf.price_extra_hour as priceExtraHour
                FROM 
                    local_package_fares lpf
            ";
            
            // If vehicle_id parameter is provided, filter by it
            if ($vehicleId) {
                $query .= " WHERE lpf.vehicle_id = '$vehicleId'";
            }
            
            error_log("Using local_package_fares table with query: $query");
        }
    }
    
    // Fallback to vehicle_pricing table if needed
    if (!$useLocalTable) {
        error_log("Falling back to vehicle_pricing table");
        // FALLBACK TO vehicle_pricing TABLE
        $query = "
            SELECT 
                vp.id,
                vp.vehicle_id,
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
        
        // If vehicle_id parameter is provided, filter by it
        if ($vehicleId) {
            $query .= " AND vp.vehicle_id = '$vehicleId'";
        }
        
        error_log("Using vehicle_pricing table with query: $query");
    }
    
    // Execute the query with error handling
    error_log("Executing local query: " . $query);
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
        
        // Map to standardized properties
        $fares[$id] = [
            'price4hrs40km' => floatval($row['price4hrs40km'] ?? 0),
            'price8hrs80km' => floatval($row['price8hrs80km'] ?? 0),
            'price10hrs100km' => floatval($row['price10hrs100km'] ?? 0),
            'priceExtraKm' => floatval($row['priceExtraKm'] ?? 0),
            'priceExtraHour' => floatval($row['priceExtraHour'] ?? 0),
            // Add alias properties for compatibility
            'package4hr40km' => floatval($row['price4hrs40km'] ?? 0),
            'package8hr80km' => floatval($row['price8hrs80km'] ?? 0),
            'package10hr100km' => floatval($row['price10hrs100km'] ?? 0),
            'extraKmRate' => floatval($row['priceExtraKm'] ?? 0),
            'extraHourRate' => floatval($row['priceExtraHour'] ?? 0)
        ];
        
        error_log("Fare data for $id: " . json_encode($fares[$id]));
    }
    
    error_log("Total fares found: " . count($fares));
    
    // Return response
    echo json_encode([
        'fares' => $fares,
        'timestamp' => time(),
        'sourceTable' => $useLocalTable ? 'local_package_fares' : 'vehicle_pricing',
        'fareCount' => count($fares),
        'vehicleId' => $vehicleId
    ]);
    
} catch (Exception $e) {
    error_log("Error in local-fares.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
