
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
require_once __DIR__ . '/../utils/response.php';

try {
    file_put_contents($logFile, "[$timestamp] Request started for direct airport fares\n", FILE_APPEND);
    file_put_contents($logFile, "[$timestamp] GET params: " . json_encode($_GET) . "\n", FILE_APPEND);
    file_put_contents($logFile, "[$timestamp] Headers: " . json_encode(getallheaders()) . "\n", FILE_APPEND);
    
    // Get database connection
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception('Database connection failed - check credentials');
    }
    
    // Ensure airport fares table exists
    if (!ensureAirportFaresTable($conn)) {
        throw new Exception('Failed to create or verify airport_transfer_fares table');
    }
    
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
            throw new Exception("Prepare failed: " . $conn->error);
        }
        
        $stmt->bind_param("s", $vehicleId);
        
        if (!$stmt->execute()) {
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
        
        if (count($fares) === 0) {
            // If no fare found for this vehicle, create a default structure
            file_put_contents($logFile, "[$timestamp] No fare found for vehicle $vehicleId, creating default\n", FILE_APPEND);
            
            // Try to insert a default fare
            $defaultPrices = [
                'sedan' => ['base_price' => 1200, 'price_per_km' => 12, 'tier1_price' => 1200, 'tier2_price' => 1800, 'tier3_price' => 2400, 'extra_km_charge' => 14],
                'suv' => ['base_price' => 1500, 'price_per_km' => 15, 'tier1_price' => 1500, 'tier2_price' => 2200, 'tier3_price' => 3000, 'extra_km_charge' => 16],
                'ertiga' => ['base_price' => 1500, 'price_per_km' => 14, 'tier1_price' => 1500, 'tier2_price' => 2200, 'tier3_price' => 3000, 'extra_km_charge' => 16],
                'innova' => ['base_price' => 2000, 'price_per_km' => 18, 'tier1_price' => 2000, 'tier2_price' => 2800, 'tier3_price' => 3600, 'extra_km_charge' => 18],
                'innova_crysta' => ['base_price' => 2200, 'price_per_km' => 20, 'tier1_price' => 2200, 'tier2_price' => 3000, 'tier3_price' => 3800, 'extra_km_charge' => 20]
            ];
            
            $defaultBasePrice = 1200;
            $defaultPricePerKm = 12;
            $defaultTier1Price = 1200;
            $defaultTier2Price = 1800;
            $defaultTier3Price = 2400;
            $defaultExtraKmCharge = 14;
            
            // Check if we have default values for this vehicle type
            foreach ($defaultPrices as $type => $prices) {
                if (stripos($vehicleId, $type) !== false) {
                    $defaultBasePrice = $prices['base_price'];
                    $defaultPricePerKm = $prices['price_per_km'];
                    $defaultTier1Price = $prices['tier1_price'];
                    $defaultTier2Price = $prices['tier2_price'];
                    $defaultTier3Price = $prices['tier3_price'];
                    $defaultExtraKmCharge = $prices['extra_km_charge'];
                    break;
                }
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
                    $defaultBasePrice,
                    $defaultPricePerKm,
                    $defaultTier1Price,
                    $defaultTier2Price,
                    $defaultTier3Price,
                    $defaultExtraKmCharge
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
                'basePrice' => $defaultBasePrice,
                'pricePerKm' => $defaultPricePerKm,
                'pickupPrice' => 0,
                'dropPrice' => 0,
                'tier1Price' => $defaultTier1Price,
                'tier2Price' => $defaultTier2Price,
                'tier3Price' => $defaultTier3Price,
                'tier4Price' => $defaultTier3Price, // Use tier3 as default for tier4 too
                'extraKmCharge' => $defaultExtraKmCharge,
            ];
        }
        
        // Send the response
        sendSuccessResponse(['fares' => $fares], 'Airport fares retrieved successfully');
        
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
                        $defaultPrices = [
                            'sedan' => ['base_price' => 1200, 'price_per_km' => 12, 'tier1_price' => 1200, 'tier2_price' => 1800, 'tier3_price' => 2400, 'extra_km_charge' => 14],
                            'suv' => ['base_price' => 1500, 'price_per_km' => 15, 'tier1_price' => 1500, 'tier2_price' => 2200, 'tier3_price' => 3000, 'extra_km_charge' => 16],
                            'ertiga' => ['base_price' => 1500, 'price_per_km' => 14, 'tier1_price' => 1500, 'tier2_price' => 2200, 'tier3_price' => 3000, 'extra_km_charge' => 16],
                            'innova' => ['base_price' => 2000, 'price_per_km' => 18, 'tier1_price' => 2000, 'tier2_price' => 2800, 'tier3_price' => 3600, 'extra_km_charge' => 18],
                            'innova_crysta' => ['base_price' => 2200, 'price_per_km' => 20, 'tier1_price' => 2200, 'tier2_price' => 3000, 'tier3_price' => 3800, 'extra_km_charge' => 20]
                        ];
                        
                        $basePrice = 1200;
                        $pricePerKm = 12;
                        $tier1Price = 1200;
                        $tier2Price = 1800;
                        $tier3Price = 2400;
                        $extraKmCharge = 14;
                        
                        // Check if we have default values for this vehicle type
                        foreach ($defaultPrices as $type => $prices) {
                            if (stripos($vehicleId, $type) !== false) {
                                $basePrice = $prices['base_price'];
                                $pricePerKm = $prices['price_per_km'];
                                $tier1Price = $prices['tier1_price'];
                                $tier2Price = $prices['tier2_price'];
                                $tier3Price = $prices['tier3_price'];
                                $extraKmCharge = $prices['extra_km_charge'];
                                break;
                            }
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
                        }
                    }
                }
            }
        }
        
        // Send the response
        sendSuccessResponse(['fares' => $fares], 'Airport fares retrieved successfully');
    }
    
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] Error: " . $e->getMessage() . "\n", FILE_APPEND);
    sendErrorResponse($e->getMessage());
}
