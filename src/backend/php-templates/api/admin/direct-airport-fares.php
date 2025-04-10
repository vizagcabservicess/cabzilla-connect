
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

// Create log directory if it doesn't exist
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/admin_airport_fares_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// For debugging
file_put_contents($logFile, "[$timestamp] Direct airport fares API called with: " . json_encode($_GET) . "\n", FILE_APPEND);

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
            $vehicleId = trim($_GET[$param]);
            file_put_contents($logFile, "[$timestamp] Found vehicle ID in param $param: $vehicleId\n", FILE_APPEND);
            break;
        }
    }
    
    // Debug: Log the vehicle ID found
    file_put_contents($logFile, "[$timestamp] Processing airport fares for vehicle ID: $vehicleId\n", FILE_APPEND);
    
    // Build query based on whether a specific vehicle ID was provided
    if ($vehicleId) {
        // Clean up vehicle ID for SQL query
        $vehicleId = $conn->real_escape_string($vehicleId);
        
        // Query for specific vehicle - using a LOWER() function to handle case sensitivity
        $query = "
            SELECT 
                atf.id, 
                atf.vehicle_id,
                v.name,
                CAST(atf.base_price AS DECIMAL(10,2)) AS base_price,
                CAST(atf.price_per_km AS DECIMAL(10,2)) AS price_per_km,
                CAST(atf.pickup_price AS DECIMAL(10,2)) AS pickup_price,
                CAST(atf.drop_price AS DECIMAL(10,2)) AS drop_price,
                CAST(atf.tier1_price AS DECIMAL(10,2)) AS tier1_price,
                CAST(atf.tier2_price AS DECIMAL(10,2)) AS tier2_price,
                CAST(atf.tier3_price AS DECIMAL(10,2)) AS tier3_price,
                CAST(atf.tier4_price AS DECIMAL(10,2)) AS tier4_price,
                CAST(atf.extra_km_charge AS DECIMAL(10,2)) AS extra_km_charge
            FROM 
                airport_transfer_fares atf
            LEFT JOIN 
                vehicles v ON atf.vehicle_id = v.vehicle_id
            WHERE 
                LOWER(atf.vehicle_id) = LOWER('$vehicleId')
        ";
        
        file_put_contents($logFile, "[$timestamp] Vehicle-specific query: $query\n", FILE_APPEND);
    } else {
        // Query for all vehicles
        $query = "
            SELECT 
                atf.id, 
                atf.vehicle_id,
                v.name,
                CAST(atf.base_price AS DECIMAL(10,2)) AS base_price,
                CAST(atf.price_per_km AS DECIMAL(10,2)) AS price_per_km,
                CAST(atf.pickup_price AS DECIMAL(10,2)) AS pickup_price,
                CAST(atf.drop_price AS DECIMAL(10,2)) AS drop_price,
                CAST(atf.tier1_price AS DECIMAL(10,2)) AS tier1_price,
                CAST(atf.tier2_price AS DECIMAL(10,2)) AS tier2_price,
                CAST(atf.tier3_price AS DECIMAL(10,2)) AS tier3_price,
                CAST(atf.tier4_price AS DECIMAL(10,2)) AS tier4_price,
                CAST(atf.extra_km_charge AS DECIMAL(10,2)) AS extra_km_charge
            FROM 
                airport_transfer_fares atf
            LEFT JOIN 
                vehicles v ON atf.vehicle_id = v.vehicle_id
        ";
        
        file_put_contents($logFile, "[$timestamp] All vehicles query: $query\n", FILE_APPEND);
    }
    
    // Execute query
    $result = $conn->query($query);
    
    if (!$result) {
        file_put_contents($logFile, "[$timestamp] Database query failed: " . $conn->error . "\n", FILE_APPEND);
        throw new Exception("Database query failed: " . $conn->error);
    }
    
    // Fetch results
    $fares = [];
    while ($row = $result->fetch_assoc()) {
        // Clean up data - ensure values are properly cast to numeric values
        $fare = [
            'id' => (int)$row['id'],
            'vehicleId' => $row['vehicle_id'],
            'vehicle_id' => $row['vehicle_id'], // Include both formats for compatibility
            'name' => $row['name'] ?? ucfirst(str_replace('_', ' ', $row['vehicle_id'])),
            'basePrice' => (float)$row['base_price'],
            'base_price' => (float)$row['base_price'], // Include both formats for compatibility
            'pricePerKm' => (float)$row['price_per_km'],
            'price_per_km' => (float)$row['price_per_km'], // Include both formats for compatibility
            'pickupPrice' => (float)$row['pickup_price'],
            'pickup_price' => (float)$row['pickup_price'], // Include both formats for compatibility
            'dropPrice' => (float)$row['drop_price'],
            'drop_price' => (float)$row['drop_price'], // Include both formats for compatibility
            'tier1Price' => (float)$row['tier1_price'],
            'tier1_price' => (float)$row['tier1_price'], // Include both formats for compatibility
            'tier2Price' => (float)$row['tier2_price'],
            'tier2_price' => (float)$row['tier2_price'], // Include both formats for compatibility
            'tier3Price' => (float)$row['tier3_price'],
            'tier3_price' => (float)$row['tier3_price'], // Include both formats for compatibility
            'tier4Price' => (float)$row['tier4_price'],
            'tier4_price' => (float)$row['tier4_price'], // Include both formats for compatibility
            'extraKmCharge' => (float)$row['extra_km_charge'],
            'extra_km_charge' => (float)$row['extra_km_charge'] // Include both formats for compatibility
        ];
        
        $fares[] = $fare;
    }
    
    // Debug: Log the query results
    file_put_contents($logFile, "[$timestamp] Airport fares query returned " . count($fares) . " results\n", FILE_APPEND);
    
    // Sync any missing vehicle entries if needed
    if (empty($fares) && $vehicleId) {
        file_put_contents($logFile, "[$timestamp] No fares found for vehicleId $vehicleId, inserting default entry\n", FILE_APPEND);
        
        // Before inserting, check if the vehicle exists in the vehicles table
        $checkVehicleQuery = "SELECT vehicle_id FROM vehicles WHERE LOWER(vehicle_id) = LOWER(?)";
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
                    file_put_contents($logFile, "[$timestamp] Inserted new vehicle: $vehicleId with name $vehicleName\n", FILE_APPEND);
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
            file_put_contents($logFile, "[$timestamp] Result of inserting default fare: " . ($result ? "success" : "failed") . "\n", FILE_APPEND);
            
            // Now try to get the data again
            $refetchQuery = "
                SELECT 
                    atf.id, 
                    atf.vehicle_id,
                    v.name,
                    CAST(atf.base_price AS DECIMAL(10,2)) AS base_price,
                    CAST(atf.price_per_km AS DECIMAL(10,2)) AS price_per_km,
                    CAST(atf.pickup_price AS DECIMAL(10,2)) AS pickup_price,
                    CAST(atf.drop_price AS DECIMAL(10,2)) AS drop_price,
                    CAST(atf.tier1_price AS DECIMAL(10,2)) AS tier1_price,
                    CAST(atf.tier2_price AS DECIMAL(10,2)) AS tier2_price,
                    CAST(atf.tier3_price AS DECIMAL(10,2)) AS tier3_price,
                    CAST(atf.tier4_price AS DECIMAL(10,2)) AS tier4_price,
                    CAST(atf.extra_km_charge AS DECIMAL(10,2)) AS extra_km_charge
                FROM 
                    airport_transfer_fares atf
                LEFT JOIN 
                    vehicles v ON atf.vehicle_id = v.vehicle_id
                WHERE 
                    LOWER(atf.vehicle_id) = LOWER(?)
            ";
            
            $refetchStmt = $conn->prepare($refetchQuery);
            if ($refetchStmt) {
                $refetchStmt->bind_param('s', $vehicleId);
                $refetchStmt->execute();
                
                $refetchResult = $refetchStmt->get_result();
                if ($refetchResult && $row = $refetchResult->fetch_assoc()) {
                    $fare = [
                        'id' => (int)$row['id'],
                        'vehicleId' => $row['vehicle_id'],
                        'vehicle_id' => $row['vehicle_id'], // Include both formats for compatibility
                        'name' => $row['name'] ?? ucfirst(str_replace('_', ' ', $row['vehicle_id'])),
                        'basePrice' => (float)$row['base_price'],
                        'base_price' => (float)$row['base_price'],
                        'pricePerKm' => (float)$row['price_per_km'],
                        'price_per_km' => (float)$row['price_per_km'],
                        'pickupPrice' => (float)$row['pickup_price'],
                        'pickup_price' => (float)$row['pickup_price'],
                        'dropPrice' => (float)$row['drop_price'],
                        'drop_price' => (float)$row['drop_price'],
                        'tier1Price' => (float)$row['tier1_price'],
                        'tier1_price' => (float)$row['tier1_price'],
                        'tier2Price' => (float)$row['tier2_price'],
                        'tier2_price' => (float)$row['tier2_price'],
                        'tier3Price' => (float)$row['tier3_price'],
                        'tier3_price' => (float)$row['tier3_price'],
                        'tier4Price' => (float)$row['tier4_price'],
                        'tier4_price' => (float)$row['tier4_price'],
                        'extraKmCharge' => (float)$row['extra_km_charge'],
                        'extra_km_charge' => (float)$row['extra_km_charge']
                    ];
                    
                    $fares[] = $fare;
                    file_put_contents($logFile, "[$timestamp] Successfully fetched newly inserted fare data\n", FILE_APPEND);
                }
            }
        }
    }
    
    // If still no fares found for a specific vehicle, create a default response
    if (empty($fares) && $vehicleId) {
        file_put_contents($logFile, "[$timestamp] No fares found even after attempted insert, using default object\n", FILE_APPEND);
        $defaultFare = [
            'vehicleId' => $vehicleId,
            'vehicle_id' => $vehicleId,
            'name' => ucfirst(str_replace('_', ' ', $vehicleId)),
            'basePrice' => 0.00,
            'base_price' => 0.00,
            'pricePerKm' => 0.00,
            'price_per_km' => 0.00,
            'pickupPrice' => 0.00,
            'pickup_price' => 0.00,
            'dropPrice' => 0.00,
            'drop_price' => 0.00,
            'tier1Price' => 0.00,
            'tier1_price' => 0.00,
            'tier2Price' => 0.00,
            'tier2_price' => 0.00,
            'tier3Price' => 0.00,
            'tier3_price' => 0.00,
            'tier4Price' => 0.00,
            'tier4_price' => 0.00,
            'extraKmCharge' => 0.00,
            'extra_km_charge' => 0.00
        ];
        
        $fares[] = $defaultFare;
    }
    
    // Debug: Log the fares for troubleshooting
    file_put_contents($logFile, "[$timestamp] Airport fares response for vehicleId $vehicleId: " . json_encode($fares) . "\n", FILE_APPEND);
    
    // Return success response
    sendSuccessResponse([
        'fares' => $fares,
        'count' => count($fares),
        'debug' => true,
        'timestamp' => time()
    ], 'Airport fares retrieved successfully');
    
} catch (Exception $e) {
    // Log error for troubleshooting
    file_put_contents($logFile, "[$timestamp] Error fetching airport fares: " . $e->getMessage() . "\n", FILE_APPEND);
    
    // Return error response
    sendErrorResponse($e->getMessage(), [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}
