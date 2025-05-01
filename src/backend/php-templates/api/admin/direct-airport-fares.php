
<?php
/**
 * Direct Airport Fares API
 * Fetches airport transfer fares for a specific vehicle or all vehicles
 */

// Clear any existing output buffers to prevent contamination
while (ob_get_level()) {
    ob_end_clean();
}

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/direct_airport_fares_admin_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Include database utilities
require_once __DIR__ . '/../utils/database.php';
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../utils/response.php';

try {
    file_put_contents($logFile, "[$timestamp] Request started for direct airport fares\n", FILE_APPEND);
    file_put_contents($logFile, "[$timestamp] GET params: " . json_encode($_GET) . "\n", FILE_APPEND);
    file_put_contents($logFile, "[$timestamp] Headers: " . json_encode(getallheaders()) . "\n", FILE_APPEND);
    
    // Get database connection
    $conn = getDbConnectionWithRetry(5, 1000);
    
    if (!$conn) {
        throw new Exception('Database connection failed - check credentials');
    }
    
    file_put_contents($logFile, "[$timestamp] Database connection successful\n", FILE_APPEND);
    
    // Ensure airport fares table exists
    if (!ensureAirportFaresTable($conn)) {
        throw new Exception('Failed to create or verify airport_transfer_fares table');
    }
    
    file_put_contents($logFile, "[$timestamp] Airport fares table verified\n", FILE_APPEND);
    
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
    
    // Execute the appropriate query based on whether we have a vehicle ID
    if ($vehicleId) {
        file_put_contents($logFile, "[$timestamp] Querying for specific vehicle: $vehicleId\n", FILE_APPEND);
        
        // Query for a specific vehicle
        $query = "SELECT * FROM airport_transfer_fares WHERE vehicle_id = ?";
        $stmt = $conn->prepare($query);
        
        if (!$stmt) {
            file_put_contents($logFile, "[$timestamp] Prepare failed: " . $conn->error . "\n", FILE_APPEND);
            throw new Exception("Prepare failed: " . $conn->error);
        }
        
        $stmt->bind_param("s", $vehicleId);
        
        if (!$stmt->execute()) {
            file_put_contents($logFile, "[$timestamp] Execute failed: " . $stmt->error . "\n", FILE_APPEND);
            throw new Exception("Execute failed: " . $stmt->error);
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
        
        file_put_contents($logFile, "[$timestamp] Query results: " . count($fares) . " fares found\n", FILE_APPEND);
        
        if (count($fares) === 0) {
            file_put_contents($logFile, "[$timestamp] No fare found for vehicle $vehicleId, creating default\n", FILE_APPEND);
            
            // Default values based on vehicle type
            $basePrice = 800;
            $pricePerKm = 12;
            $tier1Price = 800;
            $tier2Price = 1600;
            $tier3Price = 2400;
            $extraKmCharge = 14;
            
            // Set different defaults based on vehicle type keywords
            if (stripos($vehicleId, 'suv') !== false || 
                stripos($vehicleId, 'ertiga') !== false) {
                $basePrice = 1000;
                $pricePerKm = 15;
                $tier1Price = 1000;
                $tier2Price = 2000;
                $tier3Price = 3000;
                $extraKmCharge = 16;
            } else if (stripos($vehicleId, 'innova') !== false || 
                       stripos($vehicleId, 'crysta') !== false) {
                $basePrice = 1200;
                $pricePerKm = 18;
                $tier1Price = 1200;
                $tier2Price = 2400;
                $tier3Price = 3600;
                $extraKmCharge = 18;
            }
            
            // Insert default fare for this vehicle
            $insertSql = "INSERT INTO airport_transfer_fares 
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
                
                if ($insertStmt->execute()) {
                    file_put_contents($logFile, "[$timestamp] Inserted default fare for $vehicleId\n", FILE_APPEND);
                } else {
                    file_put_contents($logFile, "[$timestamp] Failed to insert default fare: " . $insertStmt->error . "\n", FILE_APPEND);
                }
            }
            
            // Return the default values
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
                'tier4Price' => $tier3Price, // Use tier3 as default for tier4 too
                'extraKmCharge' => $extraKmCharge,
            ];
        }
        
        // Format the response correctly
        $responseData = [
            'status' => 'success',
            'message' => 'Airport fares retrieved successfully',
            'data' => [
                'fares' => $fares
            ]
        ];
        
        // Log the outgoing response
        file_put_contents($logFile, "[$timestamp] Sending response with data\n", FILE_APPEND);
        
        // Send the response
        sendJsonResponse($responseData, 200);
    } else {
        file_put_contents($logFile, "[$timestamp] Querying for all vehicles\n", FILE_APPEND);
        
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
        
        file_put_contents($logFile, "[$timestamp] Query results: " . count($fares) . " fares found\n", FILE_APPEND);
        
        // If we have no fares, but have vehicles, create default fares for all vehicles
        if (count($fares) === 0) {
            file_put_contents($logFile, "[$timestamp] No fares found, checking for vehicles\n", FILE_APPEND);
            
            // Check if we have any vehicles in the system
            if (ensureVehiclesTable($conn)) {
                $vehicleQuery = "SELECT id, vehicle_id FROM vehicles WHERE is_active = 1";
                $vehicleResult = $conn->query($vehicleQuery);
                
                if ($vehicleResult && $vehicleResult->num_rows > 0) {
                    file_put_contents($logFile, "[$timestamp] Found " . $vehicleResult->num_rows . " vehicles, creating default fares\n", FILE_APPEND);
                    
                    while ($vehicle = $vehicleResult->fetch_assoc()) {
                        $vehicleId = $vehicle['vehicle_id'];
                        
                        // Get default prices based on vehicle type
                        $basePrice = 800;
                        $pricePerKm = 12;
                        $tier1Price = 800;
                        $tier2Price = 1600;
                        $tier3Price = 2400;
                        $extraKmCharge = 14;
                        
                        // Set different defaults based on vehicle type keywords
                        if (stripos($vehicleId, 'suv') !== false || 
                            stripos($vehicleId, 'ertiga') !== false) {
                            $basePrice = 1000;
                            $pricePerKm = 15;
                            $tier1Price = 1000;
                            $tier2Price = 2000;
                            $tier3Price = 3000;
                            $extraKmCharge = 16;
                        } else if (stripos($vehicleId, 'innova') !== false || 
                                   stripos($vehicleId, 'crysta') !== false) {
                            $basePrice = 1200;
                            $pricePerKm = 18;
                            $tier1Price = 1200;
                            $tier2Price = 2400;
                            $tier3Price = 3600;
                            $extraKmCharge = 18;
                        }
                        
                        // Add default fare to array for response
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
                        
                        // Also insert into the database
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
                    }
                }
            }
        }
        
        // Format the response correctly
        $responseData = [
            'status' => 'success',
            'message' => 'Airport fares retrieved successfully',
            'data' => [
                'fares' => $fares
            ]
        ];
        
        // Log the outgoing response
        file_put_contents($logFile, "[$timestamp] Sending response with " . count($fares) . " fares\n", FILE_APPEND);
        
        // Send the response
        sendJsonResponse($responseData, 200);
    }
    
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] Error: " . $e->getMessage() . "\n", FILE_APPEND);
    sendErrorResponse($e->getMessage());
}
