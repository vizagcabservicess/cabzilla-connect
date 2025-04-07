
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
require_once __DIR__ . '/../../config.php';

// Create log directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

$logFile = $logDir . '/airport_fares_api_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Run database setup to ensure tables exist
ensureDatabaseTables();

try {
    // Get database connection
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Set collation explicitly for this connection - CRITICAL FIX
    $conn->query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    $conn->query("SET collation_connection = 'utf8mb4_unicode_ci'");
    $conn->query("SET CHARACTER SET utf8mb4");
    
    file_put_contents($logFile, "[$timestamp] Database connection established successfully\n", FILE_APPEND);
    
    // Get vehicle ID from query parameters (if provided)
    $vehicleId = null;
    
    // Check for vehicle ID in various possible parameters
    $possibleParams = ['vehicleId', 'vehicle_id', 'id', 'cabType'];
    foreach ($possibleParams as $param) {
        if (isset($_GET[$param]) && !empty($_GET[$param])) {
            $vehicleId = $_GET[$param];
            file_put_contents($logFile, "[$timestamp] Found vehicle ID in parameter '$param': $vehicleId\n", FILE_APPEND);
            break;
        }
    }
    
    // Normalize vehicle ID
    if ($vehicleId) {
        // If it has a prefix like 'item-', remove it
        if (strpos($vehicleId, 'item-') === 0) {
            $vehicleId = substr($vehicleId, 5);
            file_put_contents($logFile, "[$timestamp] Removed 'item-' prefix from vehicle ID: $vehicleId\n", FILE_APPEND);
        }
    }
    
    file_put_contents($logFile, "[$timestamp] Using vehicle ID: " . ($vehicleId ?: "none (fetching all)") . "\n", FILE_APPEND);
    
    // Build query based on whether a specific vehicle ID was provided
    if ($vehicleId) {
        // Escape vehicle ID for SQL query
        $vehicleId = $conn->real_escape_string($vehicleId);
        
        // Query for specific vehicle using prepared statement
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
                vehicles v ON atf.vehicle_id = v.vehicle_id
            WHERE 
                atf.vehicle_id = ?
        ";
        
        $stmt = $conn->prepare($query);
        if (!$stmt) {
            throw new Exception("Failed to prepare query: " . $conn->error);
        }
        
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        file_put_contents($logFile, "[$timestamp] Executed query for vehicle ID: $vehicleId\n", FILE_APPEND);
    } else {
        // Query for all vehicles
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
                vehicles v ON atf.vehicle_id = v.vehicle_id
        ";
        
        $result = $conn->query($query);
        if (!$result) {
            throw new Exception("Failed to execute query: " . $conn->error);
        }
        
        file_put_contents($logFile, "[$timestamp] Executed query for all vehicles\n", FILE_APPEND);
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
    
    file_put_contents($logFile, "[$timestamp] Fetched " . count($fares) . " fare record(s)\n", FILE_APPEND);
    
    // Sync any missing vehicle entries if needed
    if (empty($fares) && $vehicleId) {
        file_put_contents($logFile, "[$timestamp] No fares found for vehicle ID: $vehicleId, creating default entry\n", FILE_APPEND);
        
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
            
            file_put_contents($logFile, "[$timestamp] Created default fare entry for vehicle ID: $vehicleId\n", FILE_APPEND);
            
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
                    file_put_contents($logFile, "[$timestamp] Refetched fare data successfully\n", FILE_APPEND);
                }
            }
        }
    }
    
    // If still no fares found for a specific vehicle, create a default response
    if (empty($fares) && $vehicleId) {
        file_put_contents($logFile, "[$timestamp] Creating fallback default fare entry for vehicle ID: $vehicleId\n", FILE_APPEND);
        
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
    
    // Check fare data before sending
    file_put_contents($logFile, "[$timestamp] Final fare count: " . count($fares) . "\n", FILE_APPEND);
    
    // Return success response
    $responseData = [
        'fares' => $fares,
        'count' => count($fares)
    ];
    
    // Ensure proper JSON encoding 
    file_put_contents($logFile, "[$timestamp] Sending response: " . json_encode($responseData) . "\n", FILE_APPEND);
    
    sendSuccessResponse($responseData, 'Airport fares retrieved successfully');
    
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    file_put_contents($logFile, "[$timestamp] ERROR TRACE: " . $e->getTraceAsString() . "\n", FILE_APPEND);
    
    // Return error response
    sendErrorResponse($e->getMessage());
}
