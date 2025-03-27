
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
    
    // Get vehicle_id parameter if present
    $vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null;
    
    // Log the request parameters
    error_log("Local fares request: " . json_encode([
        'vehicle_id' => $vehicleId
    ]));
    
    // First check if local_package_fares table exists
    $localFaresTableExists = $conn->query("SHOW TABLES LIKE 'local_package_fares'")->num_rows > 0;
    $vehiclePricingTableExists = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'")->num_rows > 0;
    
    $fares = [];
    $sourceTable = 'none';
    
    // Try to fetch from local_package_fares first (preferred source)
    if ($localFaresTableExists) {
        $query = "
            SELECT 
                vehicle_id,
                price_4hrs_40km,
                price_8hrs_80km,
                price_10hrs_100km,
                price_extra_km,
                price_extra_hour
            FROM 
                local_package_fares
        ";
        
        // If vehicle_id parameter is provided, filter by it
        if ($vehicleId) {
            $query .= " WHERE vehicle_id = '$vehicleId'";
        }
        
        error_log("Using local_package_fares table with query: $query");
        
        $result = $conn->query($query);
        
        if ($result && $result->num_rows > 0) {
            $sourceTable = 'local_package_fares';
            
            while ($row = $result->fetch_assoc()) {
                $id = $row['vehicle_id'] ?? null;
                
                // Skip entries with null ID
                if (!$id) continue;
                
                error_log("Processing local_package_fares row for vehicle: $id");
                
                // Map to standardized properties with all naming variants
                $fares[$id] = [
                    // Standard API property names
                    'price4hrs40km' => floatval($row['price_4hrs_40km'] ?? 0),
                    'price8hrs80km' => floatval($row['price_8hrs_80km'] ?? 0),
                    'price10hrs100km' => floatval($row['price_10hrs_100km'] ?? 0),
                    'priceExtraKm' => floatval($row['price_extra_km'] ?? 0),
                    'priceExtraHour' => floatval($row['price_extra_hour'] ?? 0),
                    
                    // Include original column names for direct mapping
                    'price_4hrs_40km' => floatval($row['price_4hrs_40km'] ?? 0),
                    'price_8hrs_80km' => floatval($row['price_8hrs_80km'] ?? 0),
                    'price_10hrs_100km' => floatval($row['price_10hrs_100km'] ?? 0),
                    'price_extra_km' => floatval($row['price_extra_km'] ?? 0),
                    'price_extra_hour' => floatval($row['price_extra_hour'] ?? 0),
                    
                    // Include alias properties for compatibility
                    'package4hr40km' => floatval($row['price_4hrs_40km'] ?? 0),
                    'package8hr80km' => floatval($row['price_8hrs_80km'] ?? 0),
                    'package10hr100km' => floatval($row['price_10hrs_100km'] ?? 0),
                    'extraKmRate' => floatval($row['price_extra_km'] ?? 0),
                    'extraHourRate' => floatval($row['price_extra_hour'] ?? 0),
                    
                    // Vehicle pricing table names for compatibility
                    'local_package_4hr' => floatval($row['price_4hrs_40km'] ?? 0),
                    'local_package_8hr' => floatval($row['price_8hrs_80km'] ?? 0),
                    'local_package_10hr' => floatval($row['price_10hrs_100km'] ?? 0),
                    'extra_km_charge' => floatval($row['price_extra_km'] ?? 0),
                    'extra_hour_charge' => floatval($row['price_extra_hour'] ?? 0)
                ];
            }
        }
    }
    
    // If no data from local_package_fares, or it doesn't exist, try vehicle_pricing
    if (empty($fares) && $vehiclePricingTableExists) {
        $query = "
            SELECT 
                vehicle_type as vehicle_id,
                local_package_4hr,
                local_package_8hr,
                local_package_10hr,
                extra_km_charge,
                extra_hour_charge
            FROM 
                vehicle_pricing
            WHERE 
                trip_type = 'local'
        ";
        
        // If vehicle_id parameter is provided, filter by it
        if ($vehicleId) {
            $query .= " AND vehicle_type = '$vehicleId'";
        }
        
        error_log("Using vehicle_pricing table with query: $query");
        
        $result = $conn->query($query);
        
        if ($result && $result->num_rows > 0) {
            $sourceTable = 'vehicle_pricing';
            
            while ($row = $result->fetch_assoc()) {
                $id = $row['vehicle_id'] ?? null;
                
                // Skip entries with null ID
                if (!$id) continue;
                
                error_log("Processing vehicle_pricing row for vehicle: $id");
                
                // Map to standardized properties with all naming variants
                $fares[$id] = [
                    // Standard API property names
                    'price4hrs40km' => floatval($row['local_package_4hr'] ?? 0),
                    'price8hrs80km' => floatval($row['local_package_8hr'] ?? 0),
                    'price10hrs100km' => floatval($row['local_package_10hr'] ?? 0),
                    'priceExtraKm' => floatval($row['extra_km_charge'] ?? 0),
                    'priceExtraHour' => floatval($row['extra_hour_charge'] ?? 0),
                    
                    // Include original column names for direct mapping
                    'local_package_4hr' => floatval($row['local_package_4hr'] ?? 0),
                    'local_package_8hr' => floatval($row['local_package_8hr'] ?? 0),
                    'local_package_10hr' => floatval($row['local_package_10hr'] ?? 0),
                    'extra_km_charge' => floatval($row['extra_km_charge'] ?? 0),
                    'extra_hour_charge' => floatval($row['extra_hour_charge'] ?? 0),
                    
                    // Include alias properties for compatibility
                    'package4hr40km' => floatval($row['local_package_4hr'] ?? 0),
                    'package8hr80km' => floatval($row['local_package_8hr'] ?? 0),
                    'package10hr100km' => floatval($row['local_package_10hr'] ?? 0),
                    'extraKmRate' => floatval($row['extra_km_charge'] ?? 0),
                    'extraHourRate' => floatval($row['extra_hour_charge'] ?? 0),
                    
                    // Local package fares column names for compatibility
                    'price_4hrs_40km' => floatval($row['local_package_4hr'] ?? 0),
                    'price_8hrs_80km' => floatval($row['local_package_8hr'] ?? 0),
                    'price_10hrs_100km' => floatval($row['local_package_10hr'] ?? 0),
                    'price_extra_km' => floatval($row['extra_km_charge'] ?? 0),
                    'price_extra_hour' => floatval($row['extra_hour_charge'] ?? 0)
                ];
            }
        }
    }
    
    error_log("Total fares found: " . count($fares));
    
    // Return response
    echo json_encode([
        'fares' => $fares,
        'timestamp' => time(),
        'sourceTable' => $sourceTable,
        'fareCount' => count($fares),
        'vehicleId' => $vehicleId,
        'tablesChecked' => [
            'local_package_fares' => $localFaresTableExists,
            'vehicle_pricing' => $vehiclePricingTableExists
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Error in local-fares.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
