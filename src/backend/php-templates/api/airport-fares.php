
<?php
// Improved API endpoint for airport fares

// Clear any existing output buffers to prevent contamination
while (ob_get_level()) {
    ob_end_clean();
}

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json'); 
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory
$logDir = __DIR__ . '/logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/airport_fares_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Log this request
file_put_contents($logFile, "[$timestamp] Airport fares request received\n", FILE_APPEND);
file_put_contents($logFile, "[$timestamp] GET params: " . json_encode($_GET) . "\n", FILE_APPEND);
file_put_contents($logFile, "[$timestamp] Headers: " . json_encode(getallheaders()) . "\n", FILE_APPEND);

// Include utilities
require_once __DIR__ . '/utils/database.php';
require_once __DIR__ . '/utils/response.php';

try {
    // Get vehicle ID if provided
    $vehicleId = null;
    $possibleKeys = ['vehicleId', 'vehicle_id', 'vehicle-id', 'id'];
    
    foreach ($possibleKeys as $key) {
        if (isset($_GET[$key]) && !empty($_GET[$key])) {
            $vehicleId = $_GET[$key];
            file_put_contents($logFile, "[$timestamp] Found vehicle ID in parameter $key: $vehicleId\n", FILE_APPEND);
            break;
        }
    }
    
    // Check if we should handle this directly
    $directHandling = true;
    
    if ($directHandling) {
        // Get database connection
        $conn = getDbConnection();
        
        if (!$conn) {
            throw new Exception('Database connection failed, check credentials');
        }
        
        // Ensure airport fares table exists and has default data
        if (!ensureAirportFaresTable($conn)) {
            throw new Exception('Failed to ensure airport_transfer_fares table');
        }
        
        // Execute the appropriate query based on whether we have a vehicle ID
        if ($vehicleId) {
            file_put_contents($logFile, "[$timestamp] Querying for specific vehicle: $vehicleId\n", FILE_APPEND);
            
            // Clean up vehicle ID if it has a prefix like 'item-'
            if (strpos($vehicleId, 'item-') === 0) {
                $vehicleId = substr($vehicleId, 5);
                file_put_contents($logFile, "[$timestamp] Cleaned vehicle ID from prefix: $vehicleId\n", FILE_APPEND);
            }
            
            // Query for a specific vehicle
            $query = "SELECT * FROM airport_transfer_fares WHERE vehicle_id = ?";
            $stmt = $conn->prepare($query);
            
            if (!$stmt) {
                throw new Exception("Query preparation failed: " . $conn->error);
            }
            
            $stmt->bind_param("s", $vehicleId);
            
            if (!$stmt->execute()) {
                throw new Exception("Query execution failed: " . $stmt->error);
            }
            
            $result = $stmt->get_result();
            $fares = [];
            
            while ($row = $result->fetch_assoc()) {
                // Normalize field names to camelCase for frontend
                $fares[] = [
                    'id' => $row['id'],
                    'vehicleId' => $row['vehicle_id'],
                    'vehicle_id' => $row['vehicle_id'],
                    'basePrice' => (float)$row['base_price'],
                    'pricePerKm' => (float)$row['price_per_km'],
                    'pickupPrice' => (float)$row['pickup_price'],
                    'dropPrice' => (float)$row['drop_price'],
                    'tier1Price' => (float)$row['tier1_price'],
                    'tier2Price' => (float)$row['tier2_price'],
                    'tier3Price' => (float)$row['tier3_price'],
                    'tier4Price' => (float)$row['tier4_price'],
                    'extraKmCharge' => (float)$row['extra_km_charge'],
                ];
            }
            
            if (count($fares) === 0) {
                // Default values based on vehicle type
                $basePrice = 1200;
                $pricePerKm = 12;
                $tier1Price = 1200;
                $tier2Price = 1800;
                $tier3Price = 2400;
                $extraKmCharge = 14;
                
                // Set different defaults based on vehicle type keywords
                if (stripos($vehicleId, 'suv') !== false || 
                    stripos($vehicleId, 'ertiga') !== false) {
                    $basePrice = 1500;
                    $pricePerKm = 15;
                    $tier1Price = 1500;
                    $tier2Price = 2200;
                    $tier3Price = 3000;
                    $extraKmCharge = 16;
                } else if (stripos($vehicleId, 'innova') !== false || 
                           stripos($vehicleId, 'crysta') !== false) {
                    $basePrice = 2000;
                    $pricePerKm = 18;
                    $tier1Price = 2000;
                    $tier2Price = 2800;
                    $tier3Price = 3600;
                    $extraKmCharge = 18;
                }
                
                // Try to insert default values
                $insertSql = "INSERT IGNORE INTO airport_transfer_fares 
                    (vehicle_id, base_price, price_per_km, tier1_price, tier2_price, tier3_price, extra_km_charge) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)";
                    
                $insertStmt = $conn->prepare($insertSql);
                if ($insertStmt) {
                    $insertStmt->bind_param(
                        "sdddddd", 
                        $vehicleId,
                        $basePrice,
                        $pricePerKm,
                        $tier1Price,
                        $tier2Price,
                        $tier3Price,
                        $extraKmCharge
                    );
                    
                    $insertStmt->execute();
                    file_put_contents($logFile, "[$timestamp] Inserted default fare for $vehicleId\n", FILE_APPEND);
                }
                
                // Return default values
                $fares[] = [
                    'vehicleId' => $vehicleId,
                    'vehicle_id' => $vehicleId,
                    'basePrice' => $basePrice,
                    'pricePerKm' => $pricePerKm,
                    'pickupPrice' => 0,
                    'dropPrice' => 0,
                    'tier1Price' => $tier1Price,
                    'tier2Price' => $tier2Price,
                    'tier3Price' => $tier3Price,
                    'tier4Price' => $tier3Price,
                    'extraKmCharge' => $extraKmCharge,
                ];
            }
            
            // Send the response
            sendSuccessResponse(['fares' => $fares], 'Airport fares retrieved successfully');
        } else {
            // Query for all vehicles
            $query = "SELECT * FROM airport_transfer_fares";
            $result = $conn->query($query);
            
            if (!$result) {
                throw new Exception("Query failed: " . $conn->error);
            }
            
            $fares = [];
            
            while ($row = $result->fetch_assoc()) {
                // Normalize field names to camelCase for frontend
                $fares[] = [
                    'id' => $row['id'],
                    'vehicleId' => $row['vehicle_id'],
                    'vehicle_id' => $row['vehicle_id'],
                    'basePrice' => (float)$row['base_price'],
                    'pricePerKm' => (float)$row['price_per_km'],
                    'pickupPrice' => (float)$row['pickup_price'],
                    'dropPrice' => (float)$row['drop_price'],
                    'tier1Price' => (float)$row['tier1_price'],
                    'tier2Price' => (float)$row['tier2_price'],
                    'tier3Price' => (float)$row['tier3_price'],
                    'tier4Price' => (float)$row['tier4_price'],
                    'extraKmCharge' => (float)$row['extra_km_charge'],
                ];
            }
            
            // Send the response
            sendSuccessResponse(['fares' => $fares], 'Airport fares retrieved successfully');
        }
    } else {
        // Forward the request to the admin endpoint
        
        // Set the X-Force-Refresh header to ensure we get fresh data
        $_SERVER['HTTP_X_FORCE_REFRESH'] = 'true';
        // Set admin mode for direct access to tables
        $_SERVER['HTTP_X_ADMIN_MODE'] = 'true';
        
        // Force cache-busting 
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');
        header('Expires: 0');
        
        // Capture output from the included file
        ob_start();
        require_once __DIR__ . '/admin/direct-airport-fares.php';
        $output = ob_get_clean();
        
        // Check if the output is valid JSON
        $isValidJson = false;
        $jsonData = json_decode($output);
        if (json_last_error() === JSON_ERROR_NONE) {
            $isValidJson = true;
        }
        
        // If the output is not valid JSON, clean it and return a structured response
        if (!$isValidJson) {
            file_put_contents($logFile, "[$timestamp] Invalid JSON detected in output. Cleaning up response.\n", FILE_APPEND);
            file_put_contents($logFile, "[$timestamp] Raw output: " . substr($output, 0, 500) . "\n", FILE_APPEND);
            
            // Return a clean JSON response
            sendErrorResponse('Failed to fetch airport fares. The server returned invalid JSON.');
        } else {
            // Output was valid JSON, pass it through
            echo $output;
        }
    }
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] Error: " . $e->getMessage() . "\n", FILE_APPEND);
    sendErrorResponse($e->getMessage());
}
