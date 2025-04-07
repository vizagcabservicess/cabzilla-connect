
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

// For debugging
error_log("Direct airport fares API called with: " . json_encode($_GET));

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
    
    // Debug: Log the vehicle ID found
    error_log("Processing airport fares for vehicle ID: $vehicleId");
    
    // Build query based on whether a specific vehicle ID was provided
    if ($vehicleId) {
        // Clean up vehicle ID for SQL query
        $vehicleId = $conn->real_escape_string($vehicleId);
        
        // Query for specific vehicle
        $query = "
            SELECT 
                atf.id, 
                atf.vehicle_id AS vehicleId,
                v.name,
                CAST(atf.base_price AS DECIMAL(10,2)) AS basePrice,
                CAST(atf.price_per_km AS DECIMAL(10,2)) AS pricePerKm,
                CAST(atf.pickup_price AS DECIMAL(10,2)) AS pickupPrice,
                CAST(atf.drop_price AS DECIMAL(10,2)) AS dropPrice,
                CAST(atf.tier1_price AS DECIMAL(10,2)) AS tier1Price,
                CAST(atf.tier2_price AS DECIMAL(10,2)) AS tier2Price,
                CAST(atf.tier3_price AS DECIMAL(10,2)) AS tier3Price,
                CAST(atf.tier4_price AS DECIMAL(10,2)) AS tier4Price,
                CAST(atf.extra_km_charge AS DECIMAL(10,2)) AS extraKmCharge
            FROM 
                airport_transfer_fares atf
            LEFT JOIN 
                vehicles v ON atf.vehicle_id = v.vehicle_id
            WHERE 
                atf.vehicle_id = '$vehicleId'
        ";
    } else {
        // Query for all vehicles
        $query = "
            SELECT 
                atf.id, 
                atf.vehicle_id AS vehicleId,
                v.name,
                CAST(atf.base_price AS DECIMAL(10,2)) AS basePrice,
                CAST(atf.price_per_km AS DECIMAL(10,2)) AS pricePerKm,
                CAST(atf.pickup_price AS DECIMAL(10,2)) AS pickupPrice,
                CAST(atf.drop_price AS DECIMAL(10,2)) AS dropPrice,
                CAST(atf.tier1_price AS DECIMAL(10,2)) AS tier1Price,
                CAST(atf.tier2_price AS DECIMAL(10,2)) AS tier2Price,
                CAST(atf.tier3_price AS DECIMAL(10,2)) AS tier3Price,
                CAST(atf.tier4_price AS DECIMAL(10,2)) AS tier4Price,
                CAST(atf.extra_km_charge AS DECIMAL(10,2)) AS extraKmCharge
            FROM 
                airport_transfer_fares atf
            LEFT JOIN 
                vehicles v ON atf.vehicle_id = v.vehicle_id
        ";
    }
    
    // Execute query
    $result = $conn->query($query);
    
    if (!$result) {
        error_log("Database query failed: " . $conn->error);
        throw new Exception("Database query failed: " . $conn->error);
    }
    
    // Fetch results
    $fares = [];
    while ($row = $result->fetch_assoc()) {
        // Clean up data - ensure values are properly cast to numeric values
        $fare = [
            'id' => (int)$row['id'],
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
    
    // Debug: Log the query results
    error_log("Airport fares query returned " . count($fares) . " results");
    error_log("Fares data: " . json_encode($fares));
    
    // Sync any missing vehicle entries if needed
    if (empty($fares) && $vehicleId) {
        error_log("No fares found for vehicleId $vehicleId, inserting default entry");
        
        // Before inserting, check if the vehicle exists in the vehicles table
        $checkVehicleQuery = "SELECT vehicle_id FROM vehicles WHERE vehicle_id = ?";
        $checkStmt = $conn->prepare($checkVehicleQuery);
        
        if ($checkStmt) {
            $checkStmt->bind_param('s', $vehicleId);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            
            if ($checkResult->num_rows === 0) {
                // Vehicle doesn't exist, try to insert it first with a default name
                $vehicleName = ucfirst(str_replace('_', ' ', $vehicleId));
                $insertVehicleQuery = "INSERT IGNORE INTO vehicles (vehicle_id, name, status) VALUES (?, ?, 'active')";
                $insertVehicleStmt = $conn->prepare($insertVehicleQuery);
                
                if ($insertVehicleStmt) {
                    $insertVehicleStmt->bind_param('ss', $vehicleId, $vehicleName);
                    $insertVehicleStmt->execute();
                    error_log("Inserted new vehicle: $vehicleId with name $vehicleName");
                }
            }
        }
        
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
            $result = $stmt->execute();
            error_log("Result of inserting default fare: " . ($result ? "success" : "failed"));
            
            // Now try to get the data again
            $refetchQuery = "
                SELECT 
                    atf.id, 
                    atf.vehicle_id AS vehicleId,
                    v.name,
                    CAST(atf.base_price AS DECIMAL(10,2)) AS basePrice,
                    CAST(atf.price_per_km AS DECIMAL(10,2)) AS pricePerKm,
                    CAST(atf.pickup_price AS DECIMAL(10,2)) AS pickupPrice,
                    CAST(atf.drop_price AS DECIMAL(10,2)) AS dropPrice,
                    CAST(atf.tier1_price AS DECIMAL(10,2)) AS tier1Price,
                    CAST(atf.tier2_price AS DECIMAL(10,2)) AS tier2Price,
                    CAST(atf.tier3_price AS DECIMAL(10,2)) AS tier3Price,
                    CAST(atf.tier4_price AS DECIMAL(10,2)) AS tier4Price,
                    CAST(atf.extra_km_charge AS DECIMAL(10,2)) AS extraKmCharge
                FROM 
                    airport_transfer_fares atf
                LEFT JOIN 
                    vehicles v ON atf.vehicle_id = v.vehicle_id
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
                        'id' => (int)$row['id'],
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
                    error_log("Successfully fetched newly inserted fare data");
                }
            }
        }
    }
    
    // If still no fares found for a specific vehicle, create a default response
    if (empty($fares) && $vehicleId) {
        error_log("No fares found even after attempted insert, using default object");
        $defaultFare = [
            'vehicleId' => $vehicleId,
            'vehicle_id' => $vehicleId,
            'name' => ucfirst(str_replace('_', ' ', $vehicleId)),
            'basePrice' => 0.00,
            'pricePerKm' => 0.00,
            'pickupPrice' => 0.00,
            'dropPrice' => 0.00,
            'tier1Price' => 0.00,
            'tier2Price' => 0.00,
            'tier3Price' => 0.00,
            'tier4Price' => 0.00,
            'extraKmCharge' => 0.00
        ];
        
        $fares[] = $defaultFare;
    }
    
    // Debug: Log the fares for troubleshooting
    error_log("Airport fares response for vehicleId $vehicleId: " . json_encode($fares));
    
    // Return success response
    sendSuccessResponse([
        'fares' => $fares,
        'count' => count($fares),
        'debug' => true,
        'timestamp' => time()
    ], 'Airport fares retrieved successfully');
    
} catch (Exception $e) {
    // Log error for troubleshooting
    error_log("Error fetching airport fares: " . $e->getMessage());
    
    // Return error response
    sendErrorResponse($e->getMessage(), [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}
