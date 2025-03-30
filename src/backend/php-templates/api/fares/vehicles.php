<?php
require_once '../../config.php';

// Allow CORS for all domains
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Force-Refresh, X-Requested-With');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Add extra cache busting headers
header('X-Cache-Timestamp: ' . time());

// Respond to preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log the request for debugging
error_log("vehicles.php request. Method: " . $_SERVER['REQUEST_METHOD'] . ", Time: " . time());

// Global fallback vehicles to return in case of database issues
$fallbackVehicles = [
    [
        'id' => 'sedan',
        'name' => 'Sedan',
        'capacity' => 4,
        'luggageCapacity' => 2,
        'price' => 4200,
        'basePrice' => 4200,
        'pricePerKm' => 14,
        'image' => '/cars/sedan.png',
        'amenities' => ['AC', 'Bottle Water', 'Music System'],
        'description' => 'Comfortable sedan suitable for 4 passengers.',
        'ac' => true,
        'nightHaltCharge' => 700,
        'driverAllowance' => 250,
        'isActive' => true,
        'vehicleId' => 'sedan'
    ],
    [
        'id' => 'ertiga',
        'name' => 'Ertiga',
        'capacity' => 6,
        'luggageCapacity' => 3,
        'price' => 5400,
        'basePrice' => 5400,
        'pricePerKm' => 18,
        'image' => '/cars/ertiga.png',
        'amenities' => ['AC', 'Bottle Water', 'Music System', 'Extra Legroom'],
        'description' => 'Spacious SUV suitable for 6 passengers.',
        'ac' => true,
        'nightHaltCharge' => 1000,
        'driverAllowance' => 250,
        'isActive' => true,
        'vehicleId' => 'ertiga'
    ],
    [
        'id' => 'innova_crysta',
        'name' => 'Innova Crysta',
        'capacity' => 7,
        'luggageCapacity' => 4,
        'price' => 6000,
        'basePrice' => 6000,
        'pricePerKm' => 20,
        'image' => '/cars/innova.png',
        'amenities' => ['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point'],
        'description' => 'Premium SUV with ample space for 7 passengers.',
        'ac' => true,
        'nightHaltCharge' => 1000,
        'driverAllowance' => 250,
        'isActive' => true,
        'vehicleId' => 'innova_crysta'
    ]
];

// Save vehicles to a local JSON file for fast access
function saveVehiclesToJson($vehicles) {
    try {
        // Ensure the directory exists
        $dir = __DIR__ . '/../../../public/data';
        if (!is_dir($dir)) {
            if (!mkdir($dir, 0755, true)) {
                error_log("Failed to create directory: $dir");
                return false;
            }
        }
        
        $jsonFile = $dir . '/vehicles.json';
        $jsonData = json_encode($vehicles, JSON_PRETTY_PRINT);
        
        // Write to file
        if (file_put_contents($jsonFile, $jsonData)) {
            error_log("Successfully saved vehicles to JSON file: $jsonFile");
            return true;
        } else {
            error_log("Failed to write vehicles to JSON file: $jsonFile");
            return false;
        }
    } catch (Exception $e) {
        error_log("Exception saving vehicles to JSON: " . $e->getMessage());
        return false;
    }
}

// Parse the input data either from POST body or PUT body
function getRequestData() {
    $contentType = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '';
    
    // For JSON content
    if (strpos($contentType, 'application/json') !== false) {
        $inputJSON = file_get_contents('php://input');
        return json_decode($inputJSON, true);
    }
    
    // For form data
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        return $_POST;
    }
    
    // For other PUT or DELETE requests
    if ($_SERVER['REQUEST_METHOD'] === 'PUT' || $_SERVER['REQUEST_METHOD'] === 'DELETE') {
        parse_str(file_get_contents('php://input'), $data);
        return $data;
    }
    
    return [];
}

// Clean vehicle ID by removing prefixes if present
function cleanVehicleId($id) {
    if (empty($id)) return '';
    
    // Remove 'item-' prefix if it exists
    if (strpos($id, 'item-') === 0) {
        return substr($id, 5);
    }
    
    return $id;
}

// Check if a column exists in a table
function columnExists($conn, $table, $column) {
    try {
        $query = "SHOW COLUMNS FROM `$table` LIKE '$column'";
        $result = $conn->query($query);
        return ($result && $result->num_rows > 0);
    } catch (Exception $e) {
        error_log("Error checking if column exists: " . $e->getMessage());
        return false;
    }
}

// Check if a table exists
function tableExists($conn, $table) {
    try {
        $result = $conn->query("SHOW TABLES LIKE '$table'");
        return ($result && $result->num_rows > 0);
    } catch (Exception $e) {
        error_log("Error checking if table exists: " . $e->getMessage());
        return false;
    }
}

// Normalize image path to ensure consistent format
function normalizeImagePath($path) {
    if (empty($path)) return '';
    
    // Fix paths that don't have correct prefix
    if (strpos($path, '/cars/') === 0) {
        return $path; // Already has correct format
    } else if (strpos($path, 'cars/') === 0) {
        return '/' . $path; // Add leading slash
    } else if (strpos($path, '/') === 0) {
        return $path; // Already starts with slash, leave it
    } else {
        // If it doesn't have a path prefix, assume it's a car image
        return '/cars/' . $path;
    }
}

// Handle requests
try {
    // Connect to database
    $conn = getDbConnection();

    if (!$conn) {
        error_log("Database connection failed in vehicles.php, using fallback vehicles");
        echo json_encode([
            'vehicles' => $fallbackVehicles,
            'timestamp' => time(),
            'cached' => false,
            'fallback' => true
        ]);
        exit;
    }
    
    // Check if required tables exist, if not use fallback
    if (!tableExists($conn, 'vehicle_types')) {
        error_log("Required table vehicle_types doesn't exist in the database, using fallback vehicles");
        echo json_encode([
            'vehicles' => $fallbackVehicles,
            'timestamp' => time(),
            'cached' => false,
            'fallback' => true,
            'reason' => 'missing_tables'
        ]);
        exit;
    }

    // Handle DELETE requests for vehicle deletion
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        // Get vehicle ID from query string
        $vehicleId = isset($_GET['vehicleId']) ? cleanVehicleId($_GET['vehicleId']) : null;
        
        if (!$vehicleId) {
            throw new Exception("Vehicle ID is required for deletion");
        }
        
        error_log("DELETE request for vehicle ID: " . $vehicleId);
        
        // Begin transaction
        $conn->begin_transaction();
        
        try {
            // First delete pricing records for this vehicle
            if (tableExists($conn, 'vehicle_pricing')) {
                $deleteStmt = $conn->prepare("DELETE FROM vehicle_pricing WHERE vehicle_id = ?");
                if (!$deleteStmt) {
                    throw new Exception("Database prepare error on pricing delete: " . $conn->error);
                }
                
                $deleteStmt->bind_param("s", $vehicleId);
                $deleteSuccess = $deleteStmt->execute();
                
                if (!$deleteSuccess) {
                    error_log("Failed to delete vehicle pricing: " . $deleteStmt->error);
                } else {
                    error_log("Deleted pricing for vehicle ID: " . $vehicleId);
                }
            }
            
            // Delete from outstation_fares, local_package_fares, and airport_transfer_fares if they exist
            $tables = ["outstation_fares", "local_package_fares", "airport_transfer_fares"];
            foreach ($tables as $table) {
                if (tableExists($conn, $table)) {
                    $stmt = $conn->prepare("DELETE FROM $table WHERE vehicle_id = ?");
                    if ($stmt) {
                        $stmt->bind_param("s", $vehicleId);
                        $stmt->execute();
                    }
                }
            }
            
            // Now delete the vehicle type
            $deleteStmt = $conn->prepare("DELETE FROM vehicle_types WHERE vehicle_id = ?");
            if (!$deleteStmt) {
                throw new Exception("Database prepare error on vehicle delete: " . $conn->error);
            }
            
            $deleteStmt->bind_param("s", $vehicleId);
            $deleteSuccess = $deleteStmt->execute();
            
            if (!$deleteSuccess) {
                throw new Exception("Failed to delete vehicle: " . $deleteStmt->error);
            }
            
            // Commit transaction
            $conn->commit();
            
            // Get updated vehicle list and save to JSON
            $updatedVehicles = [];
            $query = "SELECT * FROM vehicle_types";
            $result = $conn->query($query);
            
            if ($result) {
                while ($row = $result->fetch_assoc()) {
                    // Create basic vehicle object
                    $vehicle = [
                        'id' => $row['vehicle_id'],
                        'vehicleId' => $row['vehicle_id'],
                        'name' => $row['name'],
                        'capacity' => intval($row['capacity']),
                        'luggageCapacity' => intval($row['luggage_capacity']),
                        'image' => normalizeImagePath($row['image']),
                        'description' => $row['description'] ?: '',
                        'ac' => (bool)$row['ac'],
                        'isActive' => (bool)$row['is_active']
                    ];
                    
                    // Add pricing info if available
                    if (tableExists($conn, 'vehicle_pricing')) {
                        $pricingQuery = "SELECT * FROM vehicle_pricing WHERE vehicle_id = ?";
                        $stmt = $conn->prepare($pricingQuery);
                        if ($stmt) {
                            $stmt->bind_param("s", $row['vehicle_id']);
                            $stmt->execute();
                            $pricingResult = $stmt->get_result();
                            
                            if ($pricingResult && $pricingRow = $pricingResult->fetch_assoc()) {
                                $basePrice = isset($pricingRow['base_price']) ? $pricingRow['base_price'] : 
                                            (isset($pricingRow['base_fare']) ? $pricingRow['base_fare'] : 0);
                                            
                                $vehicle['price'] = floatval($basePrice);
                                $vehicle['basePrice'] = floatval($basePrice);
                                $vehicle['pricePerKm'] = floatval($pricingRow['price_per_km']);
                                $vehicle['nightHaltCharge'] = floatval($pricingRow['night_halt_charge']);
                                $vehicle['driverAllowance'] = floatval($pricingRow['driver_allowance']);
                            }
                        }
                    }
                    
                    $updatedVehicles[] = $vehicle;
                }
                
                // Save updated vehicles to JSON
                saveVehiclesToJson($updatedVehicles);
            }
            
            echo json_encode([
                'status' => 'success',
                'message' => 'Vehicle deleted successfully',
                'vehicleId' => $vehicleId,
                'timestamp' => time()
            ]);
        } catch (Exception $e) {
            // Rollback on error
            $conn->rollback();
            throw $e;
        }
        exit;
    }

    // Handle POST requests for updating vehicle pricing
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Get the JSON data from the request
        $input = getRequestData();
        
        // Log the input data
        error_log("Vehicle pricing update request: " . json_encode($input));
        
        // Validate input
        if (!$input || !isset($input['vehicleId'])) {
            throw new Exception("Invalid input data. Required field: vehicleId");
        }
        
        // Clean the vehicle ID
        $vehicleId = cleanVehicleId($input['vehicleId']);
        
        // Convert values to appropriate types
        $basePrice = isset($input['basePrice']) ? floatval($input['basePrice']) : 0;
        $pricePerKm = isset($input['pricePerKm']) ? floatval($input['pricePerKm']) : 0;
        $nightHaltCharge = isset($input['nightHaltCharge']) ? floatval($input['nightHaltCharge']) : 0;
        $driverAllowance = isset($input['driverAllowance']) ? floatval($input['driverAllowance']) : 0;
        $name = isset($input['name']) ? $input['name'] : $vehicleId;
        $capacity = isset($input['capacity']) ? intval($input['capacity']) : 4;
        $luggageCapacity = isset($input['luggageCapacity']) ? intval($input['luggageCapacity']) : 2;
        $ac = isset($input['ac']) ? ($input['ac'] ? 1 : 0) : 1;
        $image = isset($input['image']) ? normalizeImagePath($input['image']) : '';
        $description = isset($input['description']) ? $input['description'] : '';
        
        // Process amenities - convert array to JSON or keep string
        $amenities = '';
        if (isset($input['amenities'])) {
            if (is_array($input['amenities'])) {
                $amenities = json_encode($input['amenities']);
            } else {
                $amenities = $input['amenities'];
            }
        } else {
            $amenities = json_encode(['AC']);
        }
        
        // Explicitly handle isActive field
        $isActive = 1; // Default to active
        if (isset($input['isActive'])) {
            if (is_bool($input['isActive'])) {
                $isActive = $input['isActive'] ? 1 : 0;
            } else if (is_string($input['isActive'])) {
                $isActive = (strtolower($input['isActive']) === 'true' || $input['isActive'] === '1') ? 1 : 0;
            } else if (is_numeric($input['isActive'])) {
                $isActive = (int)$input['isActive'];
            }
        }
        
        // Begin transaction
        $conn->begin_transaction();
        
        try {
            // First check if vehicle type exists
            $checkStmt = $conn->prepare("SELECT COUNT(*) as count FROM vehicle_types WHERE vehicle_id = ?");
            if (!$checkStmt) {
                throw new Exception("Database prepare error on check: " . $conn->error);
            }
            
            $checkStmt->bind_param("s", $vehicleId);
            if (!$checkStmt->execute()) {
                throw new Exception("Failed to check vehicle type: " . $checkStmt->error);
            }
            
            $result = $checkStmt->get_result();
            $row = $result->fetch_assoc();
            
            // If vehicle type doesn't exist, create it
            if ($row['count'] == 0) {
                // INSERT operation (completely new vehicle)
                $insertVehicleStmt = $conn->prepare("
                    INSERT INTO vehicle_types (vehicle_id, name, capacity, luggage_capacity, ac, image, description, amenities, is_active) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                
                if (!$insertVehicleStmt) {
                    throw new Exception("Database prepare error on insert vehicle: " . $conn->error);
                }
                
                $insertVehicleStmt->bind_param("ssiisssis", $vehicleId, $name, $capacity, $luggageCapacity, $ac, $image, $description, $amenities, $isActive);
                
                if (!$insertVehicleStmt->execute()) {
                    throw new Exception("Failed to insert vehicle type: " . $insertVehicleStmt->error);
                }
                
                error_log("Created new vehicle type: " . $vehicleId . " with isActive=" . $isActive);
            } else {
                // UPDATE operation (updating existing vehicle)
                $updateVehicleStmt = $conn->prepare("
                    UPDATE vehicle_types 
                    SET name = ?, capacity = ?, luggage_capacity = ?, ac = ?, image = ?, description = ?, amenities = ?, is_active = ?
                    WHERE vehicle_id = ?
                ");
                
                if (!$updateVehicleStmt) {
                    throw new Exception("Database prepare error on update vehicle: " . $conn->error);
                }
                
                $updateVehicleStmt->bind_param("siiisssis", $name, $capacity, $luggageCapacity, $ac, $image, $description, $amenities, $isActive, $vehicleId);
                
                if (!$updateVehicleStmt->execute()) {
                    throw new Exception("Failed to update vehicle type: " . $updateVehicleStmt->error);
                }
                
                error_log("Updated vehicle type: " . $vehicleId . " with isActive=" . $isActive);
            }
            
            // Update pricing if vehicle_pricing table exists
            if (tableExists($conn, 'vehicle_pricing')) {
                // Check which column name is used in vehicle_pricing
                $baseColumn = "base_price";
                if (!columnExists($conn, "vehicle_pricing", "base_price") && columnExists($conn, "vehicle_pricing", "base_fare")) {
                    $baseColumn = "base_fare";
                }
                
                // Now check if pricing record exists
                $checkPricingStmt = $conn->prepare("SELECT COUNT(*) as count FROM vehicle_pricing WHERE vehicle_id = ?");
                if (!$checkPricingStmt) {
                    throw new Exception("Database prepare error on pricing check: " . $conn->error);
                }
                
                $checkPricingStmt->bind_param("s", $vehicleId);
                if (!$checkPricingStmt->execute()) {
                    throw new Exception("Failed to check vehicle pricing: " . $checkPricingStmt->error);
                }
                
                $pricingResult = $checkPricingStmt->get_result();
                $pricingRow = $pricingResult->fetch_assoc();
                
                if ($pricingRow['count'] > 0) {
                    // Update existing record in vehicle_pricing
                    $updateStmt = $conn->prepare("
                        UPDATE vehicle_pricing 
                        SET $baseColumn = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ?, updated_at = NOW()
                        WHERE vehicle_id = ?
                    ");
                    
                    if (!$updateStmt) {
                        throw new Exception("Database prepare error on update: " . $conn->error);
                    }
                    
                    $updateStmt->bind_param("dddds", $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleId);
                    
                    if (!$updateStmt->execute()) {
                        throw new Exception("Failed to update vehicle pricing: " . $updateStmt->error);
                    }
                    
                    error_log("Vehicle pricing updated for: " . $vehicleId);
                } else {
                    // Insert new record in vehicle_pricing
                    $insertStmt = $conn->prepare("
                        INSERT INTO vehicle_pricing (vehicle_id, $baseColumn, price_per_km, night_halt_charge, driver_allowance, trip_type, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, 'all', NOW(), NOW())
                    ");
                    
                    if (!$insertStmt) {
                        throw new Exception("Database prepare error on insert: " . $conn->error);
                    }
                    
                    $insertStmt->bind_param("sdddd", $vehicleId, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance);
                    
                    if (!$insertStmt->execute()) {
                        throw new Exception("Failed to insert vehicle pricing: " . $insertStmt->error);
                    }
                    
                    error_log("Vehicle pricing created for: " . $vehicleId);
                }
            }
            
            // Commit transaction
            $conn->commit();
            
            // Return success with a complete vehicle object
            echo json_encode([
                'status' => 'success', 
                'message' => 'Vehicle and pricing updated successfully', 
                'vehicleId' => $vehicleId, 
                'basePrice' => $basePrice,
                'pricePerKm' => $pricePerKm,
                'isActive' => (bool)$isActive,
                'timestamp' => time(),
                'vehicle' => [
                    'id' => $vehicleId,
                    'vehicleId' => $vehicleId,
                    'name' => $name,
                    'capacity' => $capacity,
                    'luggageCapacity' => $luggageCapacity,
                    'price' => $basePrice,
                    'basePrice' => $basePrice,
                    'pricePerKm' => $pricePerKm,
                    'image' => $image,
                    'amenities' => is_array($input['amenities']) ? $input['amenities'] : json_decode($amenities, true),
                    'description' => $description,
                    'ac' => (bool)$ac,
                    'nightHaltCharge' => $nightHaltCharge,
                    'driverAllowance' => $driverAllowance,
                    'isActive' => (bool)$isActive
                ]
            ]);
        } catch (Exception $e) {
            // Rollback on error
            $conn->rollback();
            throw $e;
        }
        
        exit;
    }

    // Handle GET requests
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Check if we should include inactive vehicles (admin only)
        $includeInactive = isset($_GET['includeInactive']) && $_GET['includeInactive'] === 'true';
        
        // Check if a specific vehicle ID was requested
        $specificVehicleId = isset($_GET['vehicleId']) ? $_GET['vehicleId'] : null;
        
        // Add cache busting parameter
        $cacheBuster = isset($_GET['_t']) ? $_GET['_t'] : time();
        $forceRefresh = isset($_GET['force']) && $_GET['force'] === 'true';
        
        error_log("vehicles.php GET request params: " . json_encode([
            'includeInactive' => $includeInactive, 
            'vehicleId' => $specificVehicleId,
            'cacheBuster' => $cacheBuster,
            'forceRefresh' => $forceRefresh
        ]));
        
        try {
            // Build the base query
            $baseQuery = "
                SELECT 
                    vt.* 
                FROM 
                    vehicle_types vt 
            ";
            
            // Add filter for active/inactive status
            if (!$includeInactive) {
                $baseQuery .= " WHERE vt.is_active = 1 ";
            }
            
            // Add filter for specific vehicle ID if provided
            if ($specificVehicleId) {
                if (strpos($baseQuery, "WHERE") !== false) {
                    $baseQuery .= " AND vt.vehicle_id = '" . $conn->real_escape_string($specificVehicleId) . "' ";
                } else {
                    $baseQuery .= " WHERE vt.vehicle_id = '" . $conn->real_escape_string($specificVehicleId) . "' ";
                }
            }
            
            // Execute the query
            $vehicleResult = $conn->query($baseQuery);
            
            if (!$vehicleResult) {
                throw new Exception("Error querying vehicles: " . $conn->error);
            }
            
            $vehicles = [];
            
            while ($row = $vehicleResult->fetch_assoc()) {
                // Create basic vehicle object
                $vehicle = [
                    'id' => $row['vehicle_id'],
                    'vehicleId' => $row['vehicle_id'],
                    'name' => $row['name'],
                    'capacity' => intval($row['capacity']),
                    'luggageCapacity' => intval($row['luggage_capacity']),
                    'image' => normalizeImagePath($row['image']),
                    'description' => $row['description'] ?: '',
                    'ac' => (bool)$row['ac'],
                    'isActive' => (bool)$row['is_active'],
                    'price' => 0,
                    'basePrice' => 0,
                    'pricePerKm' => 0,
                    'nightHaltCharge' => 0,
                    'driverAllowance' => 0
                ];
                
                // Try to parse amenities from JSON
                $amenities = [];
                if (!empty($row['amenities'])) {
                    try {
                        $amenitiesData = json_decode($row['amenities'], true);
                        if (is_array($amenitiesData)) {
                            $amenities = $amenitiesData;
                        } else {
                            $amenities = [$row['amenities']];
                        }
                    } catch (Exception $e) {
                        $amenities = [$row['amenities']];
                    }
                    $vehicle['amenities'] = $amenities;
                } else {
                    $vehicle['amenities'] = ['AC'];
                }
                
                // Add pricing info if available
                if (tableExists($conn, 'vehicle_pricing')) {
                    $pricingQuery = "SELECT * FROM vehicle_pricing WHERE vehicle_id = ?";
                    $stmt = $conn->prepare($pricingQuery);
                    if ($stmt) {
                        $stmt->bind_param("s", $row['vehicle_id']);
                        $stmt->execute();
                        $pricingResult = $stmt->get_result();
                        
                        if ($pricingResult && $pricingRow = $pricingResult->fetch_assoc()) {
                            $basePrice = isset($pricingRow['base_price']) ? $pricingRow['base_price'] : 
                                      (isset($pricingRow['base_fare']) ? $pricingRow['base_fare'] : 0);
                                      
                            $vehicle['price'] = floatval($basePrice);
                            $vehicle['basePrice'] = floatval($basePrice);
                            $vehicle['pricePerKm'] = floatval($pricingRow['price_per_km']);
                            $vehicle['nightHaltCharge'] = floatval($pricingRow['night_halt_charge']);
                            $vehicle['driverAllowance'] = floatval($pricingRow['driver_allowance']);
                        }
                    }
                }
                
                $vehicles[] = $vehicle;
            }
            
            // If no vehicles were found in the database
            if (empty($vehicles)) {
                error_log("No vehicles found in database, returning fallbacks");
                echo json_encode([
                    'vehicles' => $fallbackVehicles,
                    'timestamp' => time(),
                    'cached' => false,
                    'fallback' => true,
                    'reason' => 'no_data_found'
                ]);
                exit;
            }
            
            // Save the vehicles to the JSON file for faster access
            if (!$specificVehicleId) {
                saveVehiclesToJson($vehicles);
            }
            
            // Return the vehicles
            echo json_encode([
                'vehicles' => $vehicles,
                'timestamp' => time(),
                'cached' => false,
                'count' => count($vehicles)
            ]);
        } catch (Exception $e) {
            // Log the error
            error_log("Error fetching vehicles: " . $e->getMessage());
            
            // Return fallback vehicles on error
            echo json_encode([
                'vehicles' => $fallbackVehicles,
                'timestamp' => time(),
                'cached' => false,
                'fallback' => true,
                'error' => $e->getMessage()
            ]);
        }
        exit;
    }

    // If we get here, it's an unsupported method
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Method not allowed',
        'method' => $_SERVER['REQUEST_METHOD']
    ]);

} catch (Exception $e) {
    // Log the error
    error_log("Exception in vehicles.php: " . $e->getMessage());
    
    // Return error response
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'error' => $e->getMessage(),
        'code' => 500
    ]);
}
