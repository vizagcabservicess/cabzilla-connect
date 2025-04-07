
<?php
/**
 * Direct airport fares API endpoint - Returns airport fares for vehicles
 * This endpoint handles both all fares and vehicle-specific fares
 */

// Set headers for CORS and caching
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Clear any existing output buffers to prevent contamination
while (ob_get_level()) {
    ob_end_clean();
}

// Include utility files
require_once __DIR__ . '/../utils/database.php';
require_once __DIR__ . '/../utils/response.php';

// Run database setup to ensure tables exist
require_once __DIR__ . '/db_setup.php';

try {
    // Get database connection
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Get vehicle ID from query parameters (if provided)
    $vehicleId = null;
    
    // Check for vehicle ID in various possible parameters
    $possibleParams = ['vehicleId', 'vehicle_id', 'id'];
    foreach ($possibleParams as $param) {
        if (isset($_GET[$param]) && !empty($_GET[$param])) {
            $vehicleId = $_GET[$param];
            break;
        }
    }
    
    // Build query based on whether a specific vehicle ID was provided
    if ($vehicleId) {
        // Clean up vehicle ID for SQL query
        $vehicleId = $conn->real_escape_string($vehicleId);
        
        // Query for specific vehicle - using the same collation for both tables
        $query = "
            SELECT 
                atf.id, 
                atf.vehicle_id AS vehicleId,
                v.name,
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
                airport_transfer_fares atf
            LEFT JOIN 
                vehicles v ON atf.vehicle_id = v.vehicle_id COLLATE " . DB_COLLATION . "
            WHERE 
                atf.vehicle_id = '$vehicleId'
        ";
    } else {
        // Query for all vehicles - using the same collation for both tables
        $query = "
            SELECT 
                atf.id, 
                atf.vehicle_id AS vehicleId,
                v.name,
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
                airport_transfer_fares atf
            LEFT JOIN 
                vehicles v ON atf.vehicle_id = v.vehicle_id COLLATE " . DB_COLLATION . "
        ";
    }
    
    // Execute query
    $result = $conn->query($query);
    
    if (!$result) {
        throw new Exception("Database query failed: " . $conn->error);
    }
    
    // Fetch results
    $fares = [];
    while ($row = $result->fetch_assoc()) {
        // Clean up data - convert numeric values properly
        $fare = [
            'id' => $row['id'],
            'vehicleId' => $row['vehicleId'],
            'vehicle_id' => $row['vehicleId'], // Include both formats for compatibility
            'name' => $row['name'] ?? ucfirst(str_replace('_', ' ', $row['vehicleId'])),
            'basePrice' => (float)$row['basePrice'],
            'pricePerKm' => (float)$row['pricePerKm'],
            'pickupPrice' => (float)$row['pickupPrice'],
            'dropPrice' => (float)$row['dropPrice'],
            'tier1Price' => (float)$row['tier1Price'],
            'tier2Price' => (float)$row['tier2Price'],
            'tier3Price' => (float)$row['tier3Price'],
            'tier4Price' => (float)$row['tier4Price'],
            'extraKmCharge' => (float)$row['extraKmCharge']
        ];
        
        $fares[] = $fare;
    }
    
    // Sync any missing vehicle entries if needed
    if (empty($fares) && $vehicleId) {
        // Insert default entry for this vehicle and then fetch it again
        $insertQuery = "
            INSERT IGNORE INTO airport_transfer_fares 
            (vehicle_id, base_price, price_per_km, pickup_price, drop_price, 
            tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge)
            VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0, 0)
        ";
        
        $stmt = $conn->prepare($insertQuery);
        if ($stmt) {
            $stmt->bind_param('s', $vehicleId);
            $stmt->execute();
            
            // Now try to get the data again
            $refetchQuery = "
                SELECT 
                    atf.id, 
                    atf.vehicle_id AS vehicleId,
                    v.name,
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
                    airport_transfer_fares atf
                LEFT JOIN 
                    vehicles v ON atf.vehicle_id = v.vehicle_id COLLATE " . DB_COLLATION . "
                WHERE 
                    atf.vehicle_id = ?
            ";
            
            $refetchStmt = $conn->prepare($refetchQuery);
            if ($refetchStmt) {
                $refetchStmt->bind_param('s', $vehicleId);
                $refetchStmt->execute();
                
                $refetchResult = $refetchStmt->get_result();
                if ($refetchResult && $row = $refetchResult->fetch_assoc()) {
                    $fare = [
                        'id' => $row['id'],
                        'vehicleId' => $row['vehicleId'],
                        'vehicle_id' => $row['vehicleId'], // Include both formats for compatibility
                        'name' => $row['name'] ?? ucfirst(str_replace('_', ' ', $row['vehicleId'])),
                        'basePrice' => (float)$row['basePrice'],
                        'pricePerKm' => (float)$row['pricePerKm'],
                        'pickupPrice' => (float)$row['pickupPrice'],
                        'dropPrice' => (float)$row['dropPrice'],
                        'tier1Price' => (float)$row['tier1Price'],
                        'tier2Price' => (float)$row['tier2Price'],
                        'tier3Price' => (float)$row['tier3Price'],
                        'tier4Price' => (float)$row['tier4Price'],
                        'extraKmCharge' => (float)$row['extraKmCharge']
                    ];
                    
                    $fares[] = $fare;
                }
            }
        }
    }
    
    // If still no fares found for a specific vehicle, create a default response
    if (empty($fares) && $vehicleId) {
        $defaultFare = [
            'vehicleId' => $vehicleId,
            'vehicle_id' => $vehicleId,
            'name' => ucfirst(str_replace('_', ' ', $vehicleId)),
            'basePrice' => 0,
            'pricePerKm' => 0,
            'pickupPrice' => 0,
            'dropPrice' => 0,
            'tier1Price' => 0,
            'tier2Price' => 0,
            'tier3Price' => 0,
            'tier4Price' => 0,
            'extraKmCharge' => 0
        ];
        
        $fares[] = $defaultFare;
    }
    
    // Return success response
    sendSuccessResponse([
        'fares' => $fares,
        'count' => count($fares)
    ], 'Airport fares retrieved successfully');
    
} catch (Exception $e) {
    // Return error response
    sendErrorResponse($e->getMessage(), [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}
