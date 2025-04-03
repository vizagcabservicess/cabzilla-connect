
<?php
/**
 * get-vehicles.php - Fetch all vehicles with their pricing data
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Enable error reporting for debug
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Create log directory if it doesn't exist
$logDir = dirname(__FILE__) . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Logging function
function logMessage($message) {
    global $logDir;
    $timestamp = date('Y-m-d H:i:s');
    error_log("[$timestamp] " . $message . "\n", 3, $logDir . '/get-vehicles.log');
}

// Log request information
logMessage("Get vehicles request received: " . $_SERVER['REQUEST_METHOD']);
logMessage("Query string: " . $_SERVER['QUERY_STRING']);

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Initialize response
$response = [
    'status' => 'error',
    'message' => 'Unknown error',
    'timestamp' => time()
];

// Only allow GET method
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    $response['message'] = 'Only GET method is allowed';
    echo json_encode($response);
    exit;
}

// Get parameters
$includeInactive = isset($_GET['includeInactive']) && $_GET['includeInactive'] === 'true';
$isAdminMode = isset($_SERVER['HTTP_X_ADMIN_MODE']) && $_SERVER['HTTP_X_ADMIN_MODE'] === 'true';

// If admin mode is set via header, include inactive vehicles
if ($isAdminMode) {
    $includeInactive = true;
}

// Get database connection
try {
    // First try to use config if available
    if (file_exists(dirname(__FILE__) . '/../../config.php')) {
        require_once dirname(__FILE__) . '/../../config.php';
        $conn = getDbConnection();
        logMessage("Connected to database using config.php");
    } 
    // Fallback to hardcoded credentials
    else {
        logMessage("Config file not found, using hardcoded credentials");
        $dbHost = 'localhost';
        $dbName = 'u644605165_new_bookingdb';
        $dbUser = 'u644605165_new_bookingusr';
        $dbPass = 'Vizag@1213';
        
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        
        if ($conn->connect_error) {
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
        
        logMessage("Connected to database using hardcoded credentials");
    }
} catch (Exception $e) {
    $response['message'] = 'Database connection failed: ' . $e->getMessage();
    echo json_encode($response);
    exit;
}

try {
    // Check if outstation_fares table exists, as it contains the most comprehensive vehicle list
    $outstationTableExists = $conn->query("SHOW TABLES LIKE 'outstation_fares'")->num_rows > 0;
    
    // Use a JOIN approach to collect all vehicle data from multiple tables
    $allVehicleIds = [];
    $vehicles = [];
    
    // 1. First, collect all vehicle IDs from outstation_fares if it exists
    if ($outstationTableExists) {
        logMessage("Checking outstation_fares table for vehicles");
        $outstationFaresQuery = "SELECT DISTINCT vehicle_id FROM outstation_fares";
        $outstationResult = $conn->query($outstationFaresQuery);
        
        if ($outstationResult && $outstationResult->num_rows > 0) {
            while ($row = $outstationResult->fetch_assoc()) {
                if (!empty($row['vehicle_id']) && !in_array($row['vehicle_id'], $allVehicleIds)) {
                    $allVehicleIds[] = $row['vehicle_id'];
                }
            }
        }
    }
    
    // 2. Also collect from local_package_fares
    $localTableExists = $conn->query("SHOW TABLES LIKE 'local_package_fares'")->num_rows > 0;
    if ($localTableExists) {
        logMessage("Checking local_package_fares table for vehicles");
        $localFaresQuery = "SELECT DISTINCT vehicle_id FROM local_package_fares";
        $localResult = $conn->query($localFaresQuery);
        
        if ($localResult && $localResult->num_rows > 0) {
            while ($row = $localResult->fetch_assoc()) {
                if (!empty($row['vehicle_id']) && !in_array($row['vehicle_id'], $allVehicleIds)) {
                    $allVehicleIds[] = $row['vehicle_id'];
                }
            }
        }
    }
    
    // 3. Get from airport_transfer_fares
    $airportTableExists = $conn->query("SHOW TABLES LIKE 'airport_transfer_fares'")->num_rows > 0;
    if ($airportTableExists) {
        logMessage("Checking airport_transfer_fares table for vehicles");
        $airportFaresQuery = "SELECT DISTINCT vehicle_id FROM airport_transfer_fares";
        $airportResult = $conn->query($airportFaresQuery);
        
        if ($airportResult && $airportResult->num_rows > 0) {
            while ($row = $airportResult->fetch_assoc()) {
                if (!empty($row['vehicle_id']) && !in_array($row['vehicle_id'], $allVehicleIds)) {
                    $allVehicleIds[] = $row['vehicle_id'];
                }
            }
        }
    }
    
    // 4. Get from vehicles table if it exists
    $vehiclesTableExists = $conn->query("SHOW TABLES LIKE 'vehicles'")->num_rows > 0;
    if ($vehiclesTableExists) {
        logMessage("Checking vehicles table for vehicles");
        $vehiclesQuery = "SELECT id, vehicle_id FROM vehicles";
        $vehiclesResult = $conn->query($vehiclesQuery);
        
        if ($vehiclesResult && $vehiclesResult->num_rows > 0) {
            while ($row = $vehiclesResult->fetch_assoc()) {
                $vid = !empty($row['vehicle_id']) ? $row['vehicle_id'] : $row['id'];
                if (!empty($vid) && !in_array($vid, $allVehicleIds)) {
                    $allVehicleIds[] = $vid;
                }
            }
        }
    }
    
    // 5. Get from vehicle_types table if it exists
    $vehicleTypesTableExists = $conn->query("SHOW TABLES LIKE 'vehicle_types'")->num_rows > 0;
    if ($vehicleTypesTableExists) {
        logMessage("Checking vehicle_types table for vehicles");
        $vehicleTypesQuery = "SELECT vehicle_id FROM vehicle_types";
        if (!$includeInactive) {
            $vehicleTypesQuery .= " WHERE is_active = 1";
        }
        $vehicleTypesResult = $conn->query($vehicleTypesQuery);
        
        if ($vehicleTypesResult && $vehicleTypesResult->num_rows > 0) {
            while ($row = $vehicleTypesResult->fetch_assoc()) {
                if (!empty($row['vehicle_id']) && !in_array($row['vehicle_id'], $allVehicleIds)) {
                    $allVehicleIds[] = $row['vehicle_id'];
                }
            }
        }
    }
    
    logMessage("Total unique vehicle IDs found across tables: " . count($allVehicleIds));
    
    // Now process each vehicle ID to gather comprehensive information
    foreach ($allVehicleIds as $vehicleId) {
        $vehicleData = [
            'id' => $vehicleId,
            'vehicle_id' => $vehicleId,
            'vehicleId' => $vehicleId,
            'name' => ucwords(str_replace('_', ' ', $vehicleId)),
            'capacity' => 4,
            'luggage_capacity' => 2,
            'ac' => 1,
            'image' => '/cars/sedan.png',
            'amenities' => ['AC'],
            'description' => '',
            'is_active' => 1,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ];
        
        // Get vehicle details from vehicle_types (primary source)
        if ($vehicleTypesTableExists) {
            $vQuery = "SELECT * FROM vehicle_types WHERE vehicle_id = ?";
            $stmt = $conn->prepare($vQuery);
            $stmt->bind_param('s', $vehicleId);
            $stmt->execute();
            $vResult = $stmt->get_result();
            
            if ($vResult && $vResult->num_rows > 0) {
                $vData = $vResult->fetch_assoc();
                
                // Override basic fields with more specific data
                $vehicleData['name'] = $vData['name'] ?: $vehicleData['name'];
                $vehicleData['capacity'] = $vData['capacity'] ?: $vehicleData['capacity'];
                $vehicleData['luggage_capacity'] = $vData['luggage_capacity'] ?: $vehicleData['luggage_capacity'];
                $vehicleData['ac'] = isset($vData['ac']) ? $vData['ac'] : $vehicleData['ac'];
                $vehicleData['image'] = $vData['image'] ?: $vehicleData['image'];
                $vehicleData['description'] = $vData['description'] ?: $vehicleData['description'];
                $vehicleData['is_active'] = isset($vData['is_active']) ? $vData['is_active'] : $vehicleData['is_active'];
                $vehicleData['created_at'] = $vData['created_at'] ?: $vehicleData['created_at'];
                $vehicleData['updated_at'] = $vData['updated_at'] ?: $vehicleData['updated_at'];
                
                // Parse amenities
                if (!empty($vData['amenities'])) {
                    $amenities = $vData['amenities'];
                    if (is_string($amenities)) {
                        // Try JSON decode first
                        $decodedAmenities = json_decode($amenities, true);
                        if (is_array($decodedAmenities)) {
                            $vehicleData['amenities'] = $decodedAmenities;
                        } else {
                            // Try comma separated list
                            $vehicleData['amenities'] = explode(',', $amenities);
                        }
                    }
                }
            }
        }
        
        // Get vehicle details from vehicles table (secondary source)
        if ($vehiclesTableExists) {
            $vQuery = "SELECT * FROM vehicles WHERE vehicle_id = ? OR id = ?";
            $stmt = $conn->prepare($vQuery);
            $stmt->bind_param('ss', $vehicleId, $vehicleId);
            $stmt->execute();
            $vResult = $stmt->get_result();
            
            if ($vResult && $vResult->num_rows > 0) {
                $vData = $vResult->fetch_assoc();
                
                // Only override if fields are empty or missing
                if (empty($vehicleData['name']) && !empty($vData['name'])) {
                    $vehicleData['name'] = $vData['name'];
                }
                
                if (empty($vehicleData['capacity']) && !empty($vData['capacity'])) {
                    $vehicleData['capacity'] = $vData['capacity'];
                }
                
                if (empty($vehicleData['luggage_capacity']) && !empty($vData['luggage_capacity'])) {
                    $vehicleData['luggage_capacity'] = $vData['luggage_capacity'];
                }
                
                if (empty($vehicleData['image']) && !empty($vData['image'])) {
                    $vehicleData['image'] = $vData['image'];
                }
                
                if (empty($vehicleData['description']) && !empty($vData['description'])) {
                    $vehicleData['description'] = $vData['description'];
                }
                
                // Override is_active only if specifically set
                if (isset($vData['is_active'])) {
                    $vehicleData['is_active'] = $vData['is_active'];
                }
                
                // Parse amenities if needed
                if (!empty($vData['amenities']) && (empty($vehicleData['amenities']) || $vehicleData['amenities'] === ['AC'])) {
                    $amenities = $vData['amenities'];
                    if (is_string($amenities)) {
                        // Try JSON decode first
                        $decodedAmenities = json_decode($amenities, true);
                        if (is_array($decodedAmenities)) {
                            $vehicleData['amenities'] = $decodedAmenities;
                        } else {
                            // Try comma separated list
                            $vehicleData['amenities'] = explode(',', $amenities);
                        }
                    }
                }
            }
        }
        
        // Skip inactive vehicles if not including them
        if (!$includeInactive && $vehicleData['is_active'] !== 1) {
            continue;
        }
        
        // Get outstation fares
        if ($outstationTableExists) {
            $outQuery = "SELECT * FROM outstation_fares WHERE vehicle_id = ?";
            $stmt = $conn->prepare($outQuery);
            $stmt->bind_param('s', $vehicleId);
            $stmt->execute();
            $outResult = $stmt->get_result();
            
            if ($outResult && $outResult->num_rows > 0) {
                $outData = $outResult->fetch_assoc();
                
                $vehicleData['base_price'] = $outData['base_price'];
                $vehicleData['price'] = $outData['base_price']; // Alias for consistency
                $vehicleData['price_per_km'] = $outData['price_per_km'];
                $vehicleData['night_halt_charge'] = $outData['night_halt_charge'];
                $vehicleData['driver_allowance'] = $outData['driver_allowance'];
                
                $vehicleData['outstation'] = [
                    'base_price' => $outData['base_price'],
                    'price_per_km' => $outData['price_per_km'],
                    'night_halt_charge' => $outData['night_halt_charge'],
                    'driver_allowance' => $outData['driver_allowance'],
                    'roundtrip_base_price' => $outData['roundtrip_base_price'] ?? $outData['base_price'],
                    'roundtrip_price_per_km' => $outData['roundtrip_price_per_km'] ?? $outData['price_per_km']
                ];
            }
        }
        
        // Get local package fares
        if ($localTableExists) {
            $localQuery = "SELECT * FROM local_package_fares WHERE vehicle_id = ?";
            $stmt = $conn->prepare($localQuery);
            $stmt->bind_param('s', $vehicleId);
            $stmt->execute();
            $localResult = $stmt->get_result();
            
            if ($localResult && $localResult->num_rows > 0) {
                $localData = $localResult->fetch_assoc();
                
                $vehicleData['local'] = [
                    'price_4hrs_40km' => $localData['price_4hrs_40km'] ?? 0,
                    'price_8hrs_80km' => $localData['price_8hrs_80km'] ?? 0,
                    'price_10hrs_100km' => $localData['price_10hrs_100km'] ?? 0,
                    'price_extra_km' => $localData['price_extra_km'] ?? 0,
                    'price_extra_hour' => $localData['price_extra_hour'] ?? 0
                ];
            }
        }
        
        // Get airport transfer fares
        if ($airportTableExists) {
            $airportQuery = "SELECT * FROM airport_transfer_fares WHERE vehicle_id = ?";
            $stmt = $conn->prepare($airportQuery);
            $stmt->bind_param('s', $vehicleId);
            $stmt->execute();
            $airportResult = $stmt->get_result();
            
            if ($airportResult && $airportResult->num_rows > 0) {
                $airportData = $airportResult->fetch_assoc();
                
                $vehicleData['airport'] = [
                    'base_price' => $airportData['base_price'] ?? 0,
                    'price_per_km' => $airportData['price_per_km'] ?? 0,
                    'pickup_price' => $airportData['pickup_price'] ?? 0,
                    'drop_price' => $airportData['drop_price'] ?? 0,
                    'tier1_price' => $airportData['tier1_price'] ?? 0,
                    'tier2_price' => $airportData['tier2_price'] ?? 0,
                    'tier3_price' => $airportData['tier3_price'] ?? 0,
                    'tier4_price' => $airportData['tier4_price'] ?? 0,
                    'extra_km_charge' => $airportData['extra_km_charge'] ?? 0
                ];
            }
        }
        
        // Make sure all required nested objects exist
        if (!isset($vehicleData['local'])) {
            $vehicleData['local'] = [
                'price_4hrs_40km' => 0,
                'price_8hrs_80km' => 0,
                'price_10hrs_100km' => 0,
                'price_extra_km' => 0,
                'price_extra_hour' => 0
            ];
        }
        
        if (!isset($vehicleData['airport'])) {
            $vehicleData['airport'] = [
                'base_price' => 0,
                'price_per_km' => 0,
                'pickup_price' => 0,
                'drop_price' => 0,
                'tier1_price' => 0,
                'tier2_price' => 0,
                'tier3_price' => 0,
                'tier4_price' => 0,
                'extra_km_charge' => 0
            ];
        }
        
        if (!isset($vehicleData['outstation'])) {
            $vehicleData['outstation'] = [
                'base_price' => $vehicleData['base_price'] ?? 0,
                'price_per_km' => $vehicleData['price_per_km'] ?? 0,
                'night_halt_charge' => $vehicleData['night_halt_charge'] ?? 700,
                'driver_allowance' => $vehicleData['driver_allowance'] ?? 300,
                'roundtrip_base_price' => $vehicleData['base_price'] ?? 0,
                'roundtrip_price_per_km' => $vehicleData['price_per_km'] ?? 0
            ];
        }
        
        // Add created and updated dates aliases
        $vehicleData['createdAt'] = $vehicleData['created_at'];
        $vehicleData['updatedAt'] = $vehicleData['updated_at'];
        
        $vehicles[] = $vehicleData;
    }
    
    // Sort vehicles by name for consistency
    usort($vehicles, function($a, $b) {
        return strcmp($a['name'], $b['name']);
    });
    
    // Log the vehicles we found
    logMessage("Successfully retrieved " . count($vehicles) . " vehicles after merging data");
    
    // If no vehicles found, return default set
    if (empty($vehicles)) {
        logMessage("No vehicles found, using default set");
        $vehicles = [
            [
                'id' => 'sedan',
                'vehicle_id' => 'sedan',
                'vehicleId' => 'sedan',
                'name' => 'Sedan',
                'capacity' => 4,
                'luggage_capacity' => 2,
                'basePrice' => 2500,
                'price' => 2500,
                'pricePerKm' => 14,
                'image' => '/cars/sedan.png',
                'amenities' => ['AC', 'Bottle Water', 'Music System'],
                'description' => 'Comfortable sedan suitable for 4 passengers.',
                'ac' => true,
                'nightHaltCharge' => 700,
                'driverAllowance' => 250,
                'isActive' => true,
                'createdAt' => date('Y-m-d H:i:s'),
                'updatedAt' => date('Y-m-d H:i:s'),
                'local' => [
                    'price_4hrs_40km' => 1200,
                    'price_8hrs_80km' => 2200,
                    'price_10hrs_100km' => 2500,
                    'price_extra_km' => 14,
                    'price_extra_hour' => 250
                ],
                'airport' => [
                    'base_price' => 3000,
                    'price_per_km' => 12,
                    'pickup_price' => 800,
                    'drop_price' => 800,
                    'tier1_price' => 600,
                    'tier2_price' => 800,
                    'tier3_price' => 1000,
                    'tier4_price' => 1200,
                    'extra_km_charge' => 12
                ],
                'outstation' => [
                    'base_price' => 3900,
                    'price_per_km' => 13,
                    'night_halt_charge' => 700,
                    'driver_allowance' => 250,
                    'roundtrip_base_price' => 4200,
                    'roundtrip_price_per_km' => 14
                ]
            ],
            // Add other default vehicles as needed
        ];
    }
    
    // Prepare successful response
    $response['status'] = 'success';
    $response['vehicles'] = $vehicles;
    $response['count'] = count($vehicles);
    $response['includeInactive'] = $includeInactive;
    $response['isAdminMode'] = $isAdminMode;
    
} catch (Exception $e) {
    $response['message'] = $e->getMessage();
    logMessage("Error getting vehicles: " . $e->getMessage());
}

// Send response
echo json_encode($response);
