<?php
require_once '../../config.php';
require_once __DIR__ . '/../utils/database.php';
require_once __DIR__ . '/../utils/response.php';

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

    // Handle GET requests for all vehicles
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && !isset($_GET['vehicleId'])) {
        $includeInactive = isset($_GET['includeInactive']) && $_GET['includeInactive'] === 'true';
        $timestamp = time();

        // Check if vehicle_types table exists
        if (!tableExists($conn, 'vehicle_types')) {
            error_log("vehicle_types table doesn't exist, using fallback vehicles");
            echo json_encode([
                'vehicles' => $fallbackVehicles,
                'timestamp' => $timestamp,
                'cached' => false,
                'fallback' => true,
                'reason' => 'table_not_found'
            ]);
            exit;
        }

        // Build query to get vehicles
        $sql = "SELECT * FROM vehicle_types";
        if (!$includeInactive) {
            $sql .= " WHERE is_active = 1";
        }
        $sql .= " ORDER BY name";

        $result = $conn->query($sql);
        $vehicles = [];

        if ($result && $result->num_rows > 0) {
            while ($row = $result->fetch_assoc()) {
                // Process amenities
                if (isset($row['amenities']) && !empty($row['amenities'])) {
                    try {
                        $amenities = json_decode($row['amenities'], true);
                        if (json_last_error() !== JSON_ERROR_NONE) {
                            $amenities = [$row['amenities']]; // Use as single item if not valid JSON
                        }
                    } catch (Exception $e) {
                        $amenities = ['AC']; // Default if parsing fails
                    }
                } else {
                    $amenities = ['AC']; // Default empty amenities
                }

                // Map database columns to API response format
                $vehicles[] = [
                    'id' => $row['vehicle_id'],
                    'vehicleId' => $row['vehicle_id'],
                    'name' => $row['name'],
                    'capacity' => (int)$row['capacity'],
                    'luggageCapacity' => (int)($row['luggage_capacity'] ?? 2),
                    'price' => 0, // Will be populated from fare tables later
                    'basePrice' => 0,
                    'pricePerKm' => 0,
                    'image' => $row['image'] ?? '/cars/sedan.png',
                    'amenities' => $amenities,
                    'description' => $row['description'] ?? '',
                    'ac' => (bool)$row['ac'],
                    'nightHaltCharge' => 0,
                    'driverAllowance' => 0,
                    'isActive' => (bool)$row['is_active'],
                ];
            }
        } else {
            error_log("No vehicles found in vehicle_types table");
        }

        // If no vehicles found in vehicle_types, try vehicle_pricing as fallback
        if (empty($vehicles) && tableExists($conn, 'vehicle_pricing')) {
            $vehicleIdColumn = columnExists($conn, 'vehicle_pricing', 'vehicle_id');
            $vehicleTypeColumn = columnExists($conn, 'vehicle_pricing', 'vehicle_type');

            if ($vehicleIdColumn || $vehicleTypeColumn) {
                $fallbackSql = "SELECT DISTINCT ";
                
                if ($vehicleIdColumn) {
                    $fallbackSql .= "vehicle_id";
                    $idColumnName = "vehicle_id";
                } else {
                    $fallbackSql .= "vehicle_type";
                    $idColumnName = "vehicle_type";
                }
                
                $fallbackSql .= " FROM vehicle_pricing";
                
                error_log("Fallback SQL: $fallbackSql");
                $fallbackResult = $conn->query($fallbackSql);
                
                if ($fallbackResult && $fallbackResult->num_rows > 0) {
                    while ($row = $fallbackResult->fetch_assoc()) {
                        $vehicleId = $row[$idColumnName];
                        
                        if (!empty($vehicleId)) {
                            $vehicleName = ucwords(str_replace('_', ' ', $vehicleId));
                            
                            $vehicles[] = [
                                'id' => $vehicleId,
                                'vehicleId' => $vehicleId,
                                'name' => $vehicleName,
                                'capacity' => 4,
                                'luggageCapacity' => 2,
                                'price' => 0,
                                'basePrice' => 0,
                                'pricePerKm' => 0,
                                'image' => '/cars/' . strtolower($vehicleId) . '.png',
                                'amenities' => ['AC'],
                                'description' => '',
                                'ac' => true,
                                'nightHaltCharge' => 0,
                                'driverAllowance' => 0,
                                'isActive' => true,
                            ];
                        }
                    }
                }
            }
        }

        // Return fallback vehicles if still no vehicles found
        if (empty($vehicles)) {
            error_log("No vehicles found in any table, using fallback vehicles");
            echo json_encode([
                'vehicles' => $fallbackVehicles,
                'timestamp' => $timestamp,
                'cached' => false,
                'fallback' => true,
                'reason' => 'no_vehicles_found'
            ]);
            exit;
        }

        // Now populate fare data for each vehicle
        foreach ($vehicles as &$vehicle) {
            $vehicleId = $vehicle['id'];
            
            // Try to get outstation fares
            if (tableExists($conn, 'outstation_fares')) {
                $outQuery = $conn->prepare("SELECT * FROM outstation_fares WHERE vehicle_id = ?");
                $outQuery->bind_param("s", $vehicleId);
                $outQuery->execute();
                $outResult = $outQuery->get_result();
                
                if ($outResult && $outResult->num_rows > 0) {
                    $outRow = $outResult->fetch_assoc();
                    
                    // Check both base_price and base_fare column names
                    $basePrice = 0;
                    if (isset($outRow['base_price'])) {
                        $basePrice = (float)$outRow['base_price'];
                    } else if (isset($outRow['base_fare'])) {
                        $basePrice = (float)$outRow['base_fare'];
                    }
                    
                    $vehicle['price'] = $basePrice;
                    $vehicle['basePrice'] = $basePrice;
                    $vehicle['pricePerKm'] = (float)($outRow['price_per_km'] ?? 0);
                    $vehicle['nightHaltCharge'] = (float)($outRow['night_halt_charge'] ?? 0);
                    $vehicle['driverAllowance'] = (float)($outRow['driver_allowance'] ?? 0);
                }
                $outQuery->close();
            }
            
            // If we didn't find outstation fares, try vehicle_pricing
            if ($vehicle['price'] === 0 && tableExists($conn, 'vehicle_pricing')) {
                $pricingQuery = null;
                
                if (columnExists($conn, 'vehicle_pricing', 'vehicle_id')) {
                    $pricingQuery = $conn->prepare("SELECT * FROM vehicle_pricing WHERE vehicle_id = ? LIMIT 1");
                    $pricingQuery->bind_param("s", $vehicleId);
                } else if (columnExists($conn, 'vehicle_pricing', 'vehicle_type')) {
                    $pricingQuery = $conn->prepare("SELECT * FROM vehicle_pricing WHERE vehicle_type = ? LIMIT 1");
                    $pricingQuery->bind_param("s", $vehicleId);
                }
                
                if ($pricingQuery) {
                    $pricingQuery->execute();
                    $pricingResult = $pricingQuery->get_result();
                    
                    if ($pricingResult && $pricingResult->num_rows > 0) {
                        $pricingRow = $pricingResult->fetch_assoc();
                        
                        // Check both base_price and base_fare column names
                        $basePrice = 0;
                        if (isset($pricingRow['base_price'])) {
                            $basePrice = (float)$pricingRow['base_price'];
                        } else if (isset($pricingRow['base_fare'])) {
                            $basePrice = (float)$pricingRow['base_fare'];
                        }
                        
                        $vehicle['price'] = $basePrice;
                        $vehicle['basePrice'] = $basePrice;
                        $vehicle['pricePerKm'] = (float)($pricingRow['price_per_km'] ?? 0);
                        $vehicle['nightHaltCharge'] = (float)($pricingRow['night_halt_charge'] ?? 0);
                        $vehicle['driverAllowance'] = (float)($pricingRow['driver_allowance'] ?? 0);
                    }
                    $pricingQuery->close();
                }
            }
        }

        // Return the vehicles
        echo json_encode([
            'vehicles' => $vehicles,
            'timestamp' => $timestamp,
            'cached' => false,
            'count' => count($vehicles)
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
        
        // First delete pricing records for this vehicle
        $fareTablesDeleted = [];
        
        // Check which columns exist in vehicle_pricing
        if (tableExists($conn, 'vehicle_pricing')) {
            $hasVehicleId = columnExists($conn, 'vehicle_pricing', 'vehicle_id');
            $hasVehicleType = columnExists($conn, 'vehicle_pricing', 'vehicle_type');
            
            if ($hasVehicleId && $hasVehicleType) {
                $deleteStmt = $conn->prepare("DELETE FROM vehicle_pricing WHERE vehicle_id = ? OR vehicle_type = ?");
                $deleteStmt->bind_param("ss", $vehicleId, $vehicleId);
                $deleteStmt->execute();
                $fareTablesDeleted[] = 'vehicle_pricing';
            } else if ($hasVehicleId) {
                $deleteStmt = $conn->prepare("DELETE FROM vehicle_pricing WHERE vehicle_id = ?");
                $deleteStmt->bind_param("s", $vehicleId);
                $deleteStmt->execute();
                $fareTablesDeleted[] = 'vehicle_pricing';
            } else if ($hasVehicleType) {
                $deleteStmt = $conn->prepare("DELETE FROM vehicle_pricing WHERE vehicle_type = ?");
                $deleteStmt->bind_param("s", $vehicleId);
                $deleteStmt->execute();
                $fareTablesDeleted[] = 'vehicle_pricing';
            }
        }
        
        // Delete from fare tables
        $fareTables = ["outstation_fares", "local_package_fares", "airport_transfer_fares"];
        foreach ($fareTables as $table) {
            if (tableExists($conn, $table)) {
                $stmt = $conn->prepare("DELETE FROM $table WHERE vehicle_id = ?");
                if ($stmt) {
                    $stmt->bind_param("s", $vehicleId);
                    $stmt->execute();
                    if ($stmt->affected_rows > 0) {
                        $fareTablesDeleted[] = $table;
                    }
                    $stmt->close();
                }
            }
        }
        
        // Now delete the vehicle type
        $vehicleDeleted = false;
        if (tableExists($conn, 'vehicle_types')) {
            $deleteStmt = $conn->prepare("DELETE FROM vehicle_types WHERE vehicle_id = ?");
            if ($deleteStmt) {
                $deleteStmt->bind_param("s", $vehicleId);
                $deleteStmt->execute();
                $vehicleDeleted = $deleteStmt->affected_rows > 0;
                $deleteStmt->close();
            }
        }
        
        sendSuccessResponse([
            'vehicleId' => $vehicleId,
            'tablesAffected' => $fareTablesDeleted,
            'vehicleDeleted' => $vehicleDeleted
        ], 'Vehicle deleted successfully');
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
        $image = isset($input['image']) ? $input['image'] : '';
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
        
        $isActive = isset($input['isActive']) ? ($input['isActive'] ? 1 : 0) : 1;
        
        // First check if vehicle types table exists
        if (!tableExists($conn, 'vehicle_types')) {
            // Create vehicle_types table
            $createTable = "CREATE TABLE IF NOT EXISTS vehicle_types (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                name VARCHAR(100) NOT NULL,
                capacity INT NOT NULL DEFAULT 4,
                luggage_capacity INT NOT NULL DEFAULT 2,
                ac TINYINT(1) NOT NULL DEFAULT 1,
                image VARCHAR(255),
                amenities TEXT,
                description TEXT,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
            
            if (!$conn->query($createTable)) {
                throw new Exception("Error creating vehicle_types table: " . $conn->error);
            }
            
            error_log("Created vehicle_types table");
        }
        
        // Check if the vehicle exists
        $checkStmt = $conn->prepare("SELECT id FROM vehicle_types WHERE vehicle_id = ?");
        if (!$checkStmt) {
            throw new Exception("Database prepare error on check: " . $conn->error);
        }
        
        $checkStmt->bind_param("s", $vehicleId);
        if (!$checkStmt->execute()) {
            throw new Exception("Failed to check vehicle type: " . $checkStmt->error);
        }
        
        $result = $checkStmt->get_result();
        $vehicleExists = $result->num_rows > 0;
        $checkStmt->close();
        
        // Update or insert the vehicle
        if ($vehicleExists) {
            // Update existing record
            $updateStmt = $conn->prepare("
                UPDATE vehicle_types 
                SET name = ?, capacity = ?, luggage_capacity = ?, ac = ?, 
                    image = ?, description = ?, amenities = ?, is_active = ?
                WHERE vehicle_id = ?
            ");
            
            if (!$updateStmt) {
                throw new Exception("Database prepare error on update: " . $conn->error);
            }
            
            $updateStmt->bind_param("siiisssis", 
                $name, $capacity, $luggageCapacity, $ac, 
                $image, $description, $amenities, $isActive, $vehicleId
            );
            
            if (!$updateStmt->execute()) {
                throw new Exception("Failed to update vehicle: " . $updateStmt->error);
            }
            
            $updateStmt->close();
            error_log("Updated vehicle: " . $vehicleId);
        } else {
            // Insert new record
            $insertStmt = $conn->prepare("
                INSERT INTO vehicle_types 
                (vehicle_id, name, capacity, luggage_capacity, ac, image, description, amenities, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            if (!$insertStmt) {
                throw new Exception("Database prepare error on insert: " . $conn->error);
            }
            
            $insertStmt->bind_param("ssiisssis", 
                $vehicleId, $name, $capacity, $luggageCapacity, $ac, 
                $image, $description, $amenities, $isActive
            );
            
            if (!$insertStmt->execute()) {
                throw new Exception("Failed to insert vehicle: " . $insertStmt->error);
            }
            
            $insertStmt->close();
            error_log("Created new vehicle: " . $vehicleId);
        }
        
        // Update fare tables
        $fareTables = [
            'outstation_fares' => [
                'createSql' => "
                    CREATE TABLE IF NOT EXISTS outstation_fares (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        vehicle_id VARCHAR(50) NOT NULL,
                        base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                        price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                        night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
                        driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 0,
                        roundtrip_base_price DECIMAL(10,2) DEFAULT 0,
                        roundtrip_price_per_km DECIMAL(5,2) DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        UNIQUE KEY vehicle_id (vehicle_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                ",
                'valuesMap' => [
                    'base_price' => $basePrice,
                    'price_per_km' => $pricePerKm,
                    'night_halt_charge' => $nightHaltCharge,
                    'driver_allowance' => $driverAllowance
                ]
            ],
            'local_package_fares' => [
                'createSql' => "
                    CREATE TABLE IF NOT EXISTS local_package_fares (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        vehicle_id VARCHAR(50) NOT NULL,
                        price_4hrs_40km DECIMAL(10,2) NOT NULL DEFAULT 0,
                        price_8hrs_80km DECIMAL(10,2) NOT NULL DEFAULT 0,
                        price_10hrs_100km DECIMAL(10,2) NOT NULL DEFAULT 0,
                        price_extra_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                        price_extra_hour DECIMAL(5,2) NOT NULL DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        UNIQUE KEY vehicle_id (vehicle_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                ",
                'valuesMap' => [
                    'price_4hrs_40km' => $basePrice * 0.4,
                    'price_8hrs_80km' => $basePrice * 0.7,
                    'price_10hrs_100km' => $basePrice * 0.9,
                    'price_extra_km' => $pricePerKm,
                    'price_extra_hour' => 150
                ]
            ],
            'airport_transfer_fares' => [
                'createSql' => "
                    CREATE TABLE IF NOT EXISTS airport_transfer_fares (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        vehicle_id VARCHAR(50) NOT NULL,
                        base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                        price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                        pickup_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                        drop_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                        tier1_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                        tier2_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                        tier3_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                        tier4_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                        extra_km_charge DECIMAL(5,2) NOT NULL DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        UNIQUE KEY vehicle_id (vehicle_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                ",
                'valuesMap' => [
                    'base_price' => $basePrice * 0.4,
                    'price_per_km' => $pricePerKm,
                    'pickup_price' => $basePrice * 0.4,
                    'drop_price' => $basePrice * 0.38,
                    'tier1_price' => $basePrice * 0.4,
                    'tier2_price' => $basePrice * 0.45,
                    'tier3_price' => $basePrice * 0.55,
                    'tier4_price' => $basePrice * 0.65,
                    'extra_km_charge' => $pricePerKm
                ]
            ]
        ];
        
        // Update each fare table
        foreach ($fareTables as $tableName => $tableData) {
            // Create table if it doesn't exist
            if (!tableExists($conn, $tableName)) {
                if (!$conn->query($tableData['createSql'])) {
                    error_log("Error creating table $tableName: " . $conn->error);
                    continue;
                }
            }
            
            // Check if vehicle already exists in the table
            $checkStmt = $conn->prepare("SELECT id FROM $tableName WHERE vehicle_id = ?");
            $checkStmt->bind_param("s", $vehicleId);
            $checkStmt->execute();
            $result = $checkStmt->get_result();
            $exists = $result->num_rows > 0;
            $checkStmt->close();
            
            // Prepare column names and placeholders
            $columnNames = ['vehicle_id'];
            $placeholders = ['?'];
            $updateParts = [];
            $bindParams = [$vehicleId];
            $bindTypes = 's';
            
            foreach ($tableData['valuesMap'] as $column => $value) {
                $columnNames[] = $column;
                $placeholders[] = '?';
                $updateParts[] = "$column = VALUES($column)";
                $bindParams[] = $value;
                $bindTypes .= 'd';
            }
            
            // Construct SQL
            $sql = "INSERT INTO $tableName (" . implode(', ', $columnNames) . ") 
                    VALUES (" . implode(', ', $placeholders) . ") 
                    ON DUPLICATE KEY UPDATE " . implode(', ', $updateParts);
            
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                error_log("Error preparing statement for $tableName: " . $conn->error);
                continue;
            }
            
            $stmt->bind_param($bindTypes, ...$bindParams);
            if (!$stmt->execute()) {
                error_log("Error executing statement for $tableName: " . $stmt->error);
            }
            $stmt->close();
        }
        
        // Also update vehicle_pricing for compatibility
        if (tableExists($conn, 'vehicle_pricing')) {
            // Check which columns exist
            $hasVehicleId = columnExists($conn, 'vehicle_pricing', 'vehicle_id');
            $hasVehicleType = columnExists($conn, 'vehicle_pricing', 'vehicle_type');
            
            if ($hasVehicleId || $hasVehicleType) {
                // Determine base price column name
                $basePriceColumn = 'base_price';
                if (!columnExists($conn, 'vehicle_pricing', 'base_price') && 
                    columnExists($conn, 'vehicle_pricing', 'base_fare')) {
                    $basePriceColumn = 'base_fare';
                }
                
                // Prepare column list for query
                $columns = [];
                $placeholders = [];
                $params = [];
                $types = '';
                
                // Add ID columns
                if ($hasVehicleId) {
                    $columns[] = 'vehicle_id';
                    $placeholders[] = '?';
                    $params[] = $vehicleId;
                    $types .= 's';
                }
                
                if ($hasVehicleType) {
                    $columns[] = 'vehicle_type';
                    $placeholders[] = '?';
                    $params[] = $vehicleId;
                    $types .= 's';
                }
                
                // Add trip_type
                $columns[] = 'trip_type';
                $placeholders[] = '?';
                $params[] = 'all';
                $types .= 's';
                
                // Add pricing columns if they exist
                $priceColumns = [
                    $basePriceColumn => $basePrice,
                    'price_per_km' => $pricePerKm,
                    'night_halt_charge' => $nightHaltCharge,
                    'driver_allowance' => $driverAllowance
                ];
                
                foreach ($priceColumns as $column => $value) {
                    if (columnExists($conn, 'vehicle_pricing', $column)) {
                        $columns[] = $column;
                        $placeholders[] = '?';
                        $params[] = $value;
                        $types .= 'd';
                    }
                }
                
                // Build insert query
                $sql = "INSERT INTO vehicle_pricing (" . implode(', ', $columns) . ") 
                        VALUES (" . implode(', ', $placeholders) . ")";
                
                $stmt = $conn->prepare($sql);
                if (!$stmt) {
                    error_log("Error preparing statement for vehicle_pricing: " . $conn->error);
                } else {
                    $stmt->bind_param($types, ...$params);
                    if (!$stmt->execute()) {
                        error_log("Error executing statement for vehicle_pricing: " . $stmt->error);
                    }
                    $stmt->close();
                }
            }
        }
        
        sendSuccessResponse([
            'vehicleId' => $vehicleId,
            'id' => $vehicleTypeId,
            'name' => $name,
            'created' => true
        ], 'Vehicle created successfully');
    }

    // If we got here, the request wasn't handled
    sendErrorResponse("Unsupported request method or action", 400);
    
} catch (Exception $e) {
    error_log("Error in vehicles.php: " . $e->getMessage());
    sendErrorResponse($e->getMessage(), 500, [
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
}
