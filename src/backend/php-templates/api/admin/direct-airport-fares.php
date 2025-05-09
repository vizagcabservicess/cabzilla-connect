
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

// Start output buffering to ensure clean output
ob_start();

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
file_put_contents($logFile, "[$timestamp] Headers: " . json_encode(getallheaders()) . "\n", FILE_APPEND);

try {
    // Get database connection
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Get vehicle ID from query parameters (if provided)
    $vehicleId = null;
    
    // Check for vehicle ID in various possible parameters
    $possibleParams = ['vehicleId', 'vehicle_id', 'id', 'cabType', 'cab_type', 'type'];
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
        // Normalize vehicle ID - remove any 'item-' prefix if present
        if (strpos($vehicleId, 'item-') === 0) {
            $vehicleId = substr($vehicleId, 5);
            file_put_contents($logFile, "[$timestamp] Normalized vehicle ID by removing 'item-' prefix: $vehicleId\n", FILE_APPEND);
        }
        
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
                vehicles v ON LOWER(atf.vehicle_id) = LOWER(v.vehicle_id)
            WHERE 
                LOWER(atf.vehicle_id) = LOWER('$vehicleId')
        ";
        
        file_put_contents($logFile, "[$timestamp] Vehicle-specific query: $query\n", FILE_APPEND);
    } else {
        // Query for all vehicles - ensuring we get complete data with JOINs
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
                vehicles v ON LOWER(atf.vehicle_id) = LOWER(v.vehicle_id)
            ORDER BY 
                atf.id ASC
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
    
    // Check if we found any fares
    if (empty($fares)) {
        // Try to create a default entry if we have a vehicle ID
        if ($vehicleId) {
            file_put_contents($logFile, "[$timestamp] No fares found for vehicleId $vehicleId, creating default entry\n", FILE_APPEND);
            
            // First check if the vehicle exists
            $checkVehicleQuery = "SELECT id, vehicle_id, name FROM vehicles WHERE vehicle_id = ? OR LOWER(vehicle_id) = LOWER(?)";
            $stmt = $conn->prepare($checkVehicleQuery);
            if (!$stmt) {
                throw new Exception("Failed to prepare vehicle check statement: " . $conn->error);
            }
            
            $stmt->bind_param("ss", $vehicleId, $vehicleId);
            $stmt->execute();
            $vehicleResult = $stmt->get_result();
            $vehicleExists = ($vehicleResult->num_rows > 0);
            
            // Get vehicle name if it exists
            $vehicleName = ucfirst(str_replace('_', ' ', $vehicleId));
            if ($vehicleExists) {
                $vehicleRow = $vehicleResult->fetch_assoc();
                if (!empty($vehicleRow['name'])) {
                    $vehicleName = $vehicleRow['name'];
                }
            } else {
                // Try to create the vehicle
                $insertVehicleQuery = "INSERT INTO vehicles (vehicle_id, name, is_active) VALUES (?, ?, 1)";
                $stmt = $conn->prepare($insertVehicleQuery);
                if (!$stmt) {
                    throw new Exception("Failed to prepare vehicle insert statement: " . $conn->error);
                }
                
                $stmt->bind_param("ss", $vehicleId, $vehicleName);
                $stmt->execute();
                
                file_put_contents($logFile, "[$timestamp] Created new vehicle: $vehicleId, $vehicleName\n", FILE_APPEND);
            }
            
            // Create default fare record
            $createFareQuery = "
                INSERT INTO airport_transfer_fares 
                (vehicle_id, base_price, price_per_km, pickup_price, drop_price, tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge) 
                VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0, 0)
            ";
            
            $stmt = $conn->prepare($createFareQuery);
            if (!$stmt) {
                throw new Exception("Failed to prepare fare insert statement: " . $conn->error);
            }
            
            $stmt->bind_param("s", $vehicleId);
            $stmt->execute();
            
            file_put_contents($logFile, "[$timestamp] Created default airport fare for vehicle: $vehicleId\n", FILE_APPEND);
            
            // Add the default fare to our response
            $fares[] = [
                'id' => $conn->insert_id,
                'vehicleId' => $vehicleId,
                'vehicle_id' => $vehicleId,
                'name' => $vehicleName,
                'basePrice' => 0,
                'base_price' => 0,
                'pricePerKm' => 0,
                'price_per_km' => 0,
                'pickupPrice' => 0,
                'pickup_price' => 0,
                'dropPrice' => 0,
                'drop_price' => 0,
                'tier1Price' => 0,
                'tier1_price' => 0,
                'tier2Price' => 0,
                'tier2_price' => 0,
                'tier3Price' => 0,
                'tier3_price' => 0,
                'tier4Price' => 0,
                'tier4_price' => 0,
                'extraKmCharge' => 0,
                'extra_km_charge' => 0
            ];
        }
    }
    
    // Create response data structure
    $responseData = [
        'status' => 'success',
        'message' => 'Airport fares retrieved successfully',
        'count' => count($fares),
        'fares' => $fares,
        'timestamp' => time()
    ];
    
    // Log the response for debugging
    file_put_contents($logFile, "[$timestamp] Sending response: " . json_encode($responseData, JSON_PARTIAL_OUTPUT_ON_ERROR) . "\n", FILE_APPEND);
    
    // Clean any previous output
    ob_end_clean();
    
    // Send the JSON response
    echo json_encode($responseData);
    
} catch (Exception $e) {
    // Log the error
    file_put_contents($logFile, "[$timestamp] ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    
    // Clean any previous output
    ob_end_clean();
    
    // Create error response
    $errorResponse = [
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ];
    
    // Send the error response
    echo json_encode($errorResponse);
}
