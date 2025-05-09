
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
    
    // Sync any missing vehicle entries if needed
    if (empty($fares) && $vehicleId) {
        file_put_contents($logFile, "[$timestamp] No fares found for vehicleId $vehicleId, checking alternative spellings\n", FILE_APPEND);
        
        // Try alternative queries with different cases and formats
        $altQuery = "
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
                LOWER(atf.vehicle_id) LIKE LOWER('%$vehicleId%')
        ";
        
        file_put_contents($logFile, "[$timestamp] Trying fuzzy vehicle_id matching: $altQuery\n", FILE_APPEND);
        $altResult = $conn->query($altQuery);
        
        if ($altResult && $altResult->num_rows > 0) {
            while ($row = $altResult->fetch_assoc()) {
                $fare = [
                    'id' => (int)$row['id'],
                    'vehicleId' => $row['vehicle_id'],
                    'vehicle_id' => $row['vehicle_id'],
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
                file_put_contents($logFile, "[$timestamp] Found partial match: " . $row['vehicle_id'] . "\n", FILE_APPEND);
            }
            
            file_put_contents($logFile, "[$timestamp] Found " . count($fares) . " partial matches\n", FILE_APPEND);
        } else {
            file_put_contents($logFile, "[$timestamp] No partial matches found, inserting default entry\n", FILE_APPEND);
            
            // Before inserting, check if the vehicle exists in the vehicles table
            $checkVehicleQuery = "SELECT vehicle_id, name FROM vehicles WHERE LOWER(vehicle_id) = LOWER(?)";
            $checkStmt = $conn->prepare($checkVehicleQuery);
            
            if ($checkStmt) {
                $checkStmt->bind_param('s', $vehicleId);
                $checkStmt->execute();
                $checkResult = $checkStmt->get_result();
                
                $vehicleName = ucfirst(str_replace('_', ' ', $vehicleId));
                
                if ($checkResult->num_rows > 0) {
                    // Vehicle exists, get its name
                    $vehicleData = $checkResult->fetch_assoc();
                    $vehicleName = $vehicleData['name'] ?? $vehicleName;
                    file_put_contents($logFile, "[$timestamp] Found vehicle in vehicles table: {$vehicleData['vehicle_id']} with name {$vehicleName}\n", FILE_APPEND);
                } else {
                    // Vehicle doesn't exist, try to insert it first with a default name
                    $insertVehicleQuery = "INSERT IGNORE INTO vehicles (vehicle_id, name, status) VALUES (?, ?, 'active')";
                    $insertVehicleStmt = $conn->prepare($insertVehicleQuery);
                    
                    if ($insertVehicleStmt) {
                        $insertVehicleStmt->bind_param('ss', $vehicleId, $vehicleName);
                        $insertVehicleStmt->execute();
                        file_put_contents($logFile, "[$timestamp] Inserted new vehicle: $vehicleId with name $vehicleName\n", FILE_APPEND);
                    }
                }
                
                // Now insert a default entry for this vehicle in the airport_transfer_fares table
                // Use values based on vehicle type
                $basePrice = 0;
                $pricePerKm = 0;
                $pickupPrice = 0;
                $dropPrice = 0;
                $tier1Price = 0;
                $tier2Price = 0;
                $tier3Price = 0;
                $tier4Price = 0;
                $extraKmCharge = 0;
                
                // Set default values based on vehicle type
                $lcVehicleId = strtolower($vehicleId);
                if (strpos($lcVehicleId, 'sedan') !== false) {
                    $basePrice = 800;
                    $pricePerKm = 12;
                    $pickupPrice = 800;
                    $dropPrice = 800;
                    $tier1Price = 800;
                    $tier2Price = 1000;
                    $tier3Price = 1000;
                    $tier4Price = 1200;
                    $extraKmCharge = 12;
                } elseif (strpos($lcVehicleId, 'ertiga') !== false) {
                    $basePrice = 1000;
                    $pricePerKm = 15;
                    $pickupPrice = 1000;
                    $dropPrice = 1000;
                    $tier1Price = 800;
                    $tier2Price = 1000;
                    $tier3Price = 1200;
                    $tier4Price = 1400;
                    $extraKmCharge = 15;
                } elseif (strpos($lcVehicleId, 'innova') !== false || strpos($lcVehicleId, 'crysta') !== false) {
                    $basePrice = 1200;
                    $pricePerKm = 17;
                    $pickupPrice = 1200;
                    $dropPrice = 1200;
                    $tier1Price = 1000;
                    $tier2Price = 1200;
                    $tier3Price = 1400;
                    $tier4Price = 1600;
                    $extraKmCharge = 17;
                } elseif (strpos($lcVehicleId, 'tempo') !== false) {
                    $basePrice = 2000;
                    $pricePerKm = 19;
                    $pickupPrice = 2000;
                    $dropPrice = 2000;
                    $tier1Price = 1600;
                    $tier2Price = 1800;
                    $tier3Price = 2000;
                    $tier4Price = 2500;
                    $extraKmCharge = 19;
                }
                
                file_put_contents($logFile, "[$timestamp] Using intelligent defaults for vehicle type: $lcVehicleId\n", FILE_APPEND);
                
                // Insert default entry for this vehicle
                $insertQuery = "
                    INSERT INTO airport_transfer_fares 
                    (vehicle_id, base_price, price_per_km, pickup_price, drop_price, 
                    tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                    base_price = VALUES(base_price),
                    price_per_km = VALUES(price_per_km),
                    pickup_price = VALUES(pickup_price),
                    drop_price = VALUES(drop_price),
                    tier1_price = VALUES(tier1_price),
                    tier2_price = VALUES(tier2_price),
                    tier3_price = VALUES(tier3_price),
                    tier4_price = VALUES(tier4_price),
                    extra_km_charge = VALUES(extra_km_charge)
                ";
                
                $stmt = $conn->prepare($insertQuery);
                if ($stmt) {
                    $stmt->bind_param('sddddddddd', 
                        $vehicleId, 
                        $basePrice, 
                        $pricePerKm, 
                        $pickupPrice, 
                        $dropPrice, 
                        $tier1Price, 
                        $tier2Price, 
                        $tier3Price, 
                        $tier4Price, 
                        $extraKmCharge
                    );
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
                            vehicles v ON LOWER(atf.vehicle_id) = LOWER(v.vehicle_id)
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
    
    // Return success response with a differently structured response to match what the client expects
    $response = [
        'status' => 'success',
        'message' => 'Airport fares retrieved successfully',
        'data' => [
            'fares' => $fares
        ],
        'fares' => $fares, // Include at the top level too for compatibility
        'count' => count($fares),
        'debug' => true,
        'timestamp' => time()
    ];
    
    // Send the response
    echo json_encode($response);
    exit;
    
} catch (Exception $e) {
    // Log error for troubleshooting
    file_put_contents($logFile, "[$timestamp] Error fetching airport fares: " . $e->getMessage() . "\n", FILE_APPEND);
    
    // Return error response
    sendErrorResponse($e->getMessage(), [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}