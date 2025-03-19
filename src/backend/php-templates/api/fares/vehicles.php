
<?php
require_once '../../config.php';

// Allow CORS for all domains
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Force-Refresh');
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

    // Handle POST requests for updating vehicle pricing
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Get the JSON data from the request
        $inputJSON = file_get_contents('php://input');
        $input = json_decode($inputJSON, true);
        
        // Log the input data
        error_log("Vehicle pricing update request: " . json_encode($input));
        
        // Validate input
        if (!$input || !isset($input['vehicleId']) || !isset($input['basePrice']) || !isset($input['pricePerKm'])) {
            throw new Exception("Invalid input data. Required fields: vehicleId, basePrice, pricePerKm");
        }
        
        // Convert values to appropriate types
        $basePrice = floatval($input['basePrice']);
        $pricePerKm = floatval($input['pricePerKm']);
        $nightHaltCharge = isset($input['nightHaltCharge']) ? floatval($input['nightHaltCharge']) : 0;
        $driverAllowance = isset($input['driverAllowance']) ? floatval($input['driverAllowance']) : 0;
        $vehicleId = $input['vehicleId'];
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
            
            error_log("Created new vehicle type: " . $vehicleId);
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
            
            error_log("Updated vehicle type: " . $vehicleId);
        }
        
        // Now check if pricing record exists
        $checkPricingStmt = $conn->prepare("SELECT COUNT(*) as count FROM vehicle_pricing WHERE vehicle_type = ?");
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
            // Update existing record
            $updateStmt = $conn->prepare("
                UPDATE vehicle_pricing 
                SET base_price = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ?, updated_at = NOW()
                WHERE vehicle_type = ?
            ");
            
            if (!$updateStmt) {
                throw new Exception("Database prepare error on update: " . $conn->error);
            }
            
            $updateStmt->bind_param("dddds", $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleId);
            
            if (!$updateStmt->execute()) {
                throw new Exception("Failed to update vehicle pricing: " . $updateStmt->error);
            }
            
            error_log("Vehicle pricing updated for: " . $vehicleId);
            echo json_encode([
                'status' => 'success', 
                'message' => 'Vehicle pricing updated successfully', 
                'vehicleId' => $vehicleId, 
                'basePrice' => $basePrice,
                'pricePerKm' => $pricePerKm,
                'timestamp' => time()
            ]);
        } else {
            // Insert new record
            $insertStmt = $conn->prepare("
                INSERT INTO vehicle_pricing (vehicle_type, base_price, price_per_km, night_halt_charge, driver_allowance, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, NOW(), NOW())
            ");
            
            if (!$insertStmt) {
                throw new Exception("Database prepare error on insert: " . $conn->error);
            }
            
            $insertStmt->bind_param("sdddd", $vehicleId, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance);
            
            if (!$insertStmt->execute()) {
                throw new Exception("Failed to insert vehicle pricing: " . $insertStmt->error);
            }
            
            error_log("Vehicle pricing created for: " . $vehicleId);
            echo json_encode([
                'status' => 'success', 
                'message' => 'Vehicle pricing created successfully', 
                'vehicleId' => $vehicleId, 
                'basePrice' => $basePrice,
                'pricePerKm' => $pricePerKm,
                'timestamp' => time()
            ]);
        }
        exit;
    }

    // Handle GET requests
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Check if we should include inactive vehicles (admin only)
        $includeInactive = isset($_GET['includeInactive']) && $_GET['includeInactive'] === 'true';
        
        // Add cache busting parameter
        $cacheBuster = isset($_GET['_t']) ? $_GET['_t'] : time();
        $forceRefresh = isset($_GET['force']) && $_GET['force'] === 'true';
        
        error_log("vehicles.php GET request params: " . json_encode([
            'includeInactive' => $includeInactive, 
            'cacheBuster' => $cacheBuster,
            'forceRefresh' => $forceRefresh
        ]));
        
        // Build query to get all vehicle types with pricing info
        $query = "
            SELECT 
                vt.vehicle_id, 
                vt.name, 
                vt.capacity, 
                vt.luggage_capacity,
                vt.ac, 
                vt.image, 
                vt.amenities, 
                vt.description, 
                vt.is_active,
                vp.base_price, 
                vp.price_per_km, 
                vp.night_halt_charge, 
                vp.driver_allowance
            FROM 
                vehicle_types vt
            LEFT JOIN 
                vehicle_pricing vp ON vt.vehicle_id = vp.vehicle_type
        ";
        
        // Only add the WHERE clause if we're not including inactive vehicles
        if (!$includeInactive) {
            $query .= " WHERE vt.is_active = 1";
        }
        
        $query .= " ORDER BY vt.name";
        
        error_log("vehicles.php query: " . $query);
        
        $result = $conn->query($query);
        
        if (!$result) {
            throw new Exception("Database query failed: " . $conn->error);
        }

        $vehicles = [];
        while ($row = $result->fetch_assoc()) {
            // Parse amenities from JSON string or comma-separated list
            $amenities = [];
            if (!empty($row['amenities'])) {
                $decoded = json_decode($row['amenities'], true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $amenities = $decoded;
                } else {
                    $amenities = array_map('trim', explode(',', $row['amenities']));
                }
            }
            
            // Ensure name is always a string, use vehicle_id as fallback
            $name = $row['name'] ?? '';
            if (empty($name) || $name === '0') {
                $name = "Vehicle ID: " . $row['vehicle_id'];
            }
            
            // Format vehicle data with consistent property names for frontend
            $vehicle = [
                'id' => (string)$row['vehicle_id'],
                'name' => $name,
                'capacity' => intval($row['capacity'] ?? 0),
                'luggageCapacity' => intval($row['luggage_capacity'] ?? 0),
                'price' => floatval($row['base_price'] ?? 0),
                'basePrice' => floatval($row['base_price'] ?? 0),
                'pricePerKm' => floatval($row['price_per_km'] ?? 0),
                'nightHaltCharge' => floatval($row['night_halt_charge'] ?? 0),
                'driverAllowance' => floatval($row['driver_allowance'] ?? 0),
                'image' => $row['image'] ?? '',
                'amenities' => $amenities,
                'description' => $row['description'] ?? '',
                'ac' => (bool)($row['ac'] ?? 0),
                'isActive' => (bool)($row['is_active'] ?? 0),
                'vehicleId' => (string)$row['vehicle_id']
            ];
            
            // Only add active vehicles for non-admin requests or if specifically including inactive
            if ($includeInactive || $vehicle['isActive']) {
                $vehicles[] = $vehicle;
            }
        }

        // If no vehicles found in database, use fallback
        if (empty($vehicles)) {
            error_log("No vehicles found in database, using fallback vehicles");
            $vehicles = $fallbackVehicles;
        }

        // Log success
        error_log("Vehicles GET response: found " . count($vehicles) . " vehicles");
        
        // Send response with cache busting timestamp
        echo json_encode([
            'vehicles' => $vehicles,
            'timestamp' => time(),
            'cached' => false
        ]);
        exit;
    }
    
    // If we get here, the request method is not supported
    throw new Exception("Method not allowed: " . $_SERVER['REQUEST_METHOD']);
    
} catch (Exception $e) {
    error_log("Error in vehicles.php: " . $e->getMessage());
    
    // For GET requests, return fallback vehicles instead of an error
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        error_log("Returning fallback vehicles due to error");
        echo json_encode([
            'vehicles' => $fallbackVehicles,
            'timestamp' => time(),
            'cached' => false,
            'fallback' => true
        ]);
        exit;
    }
    
    // For other methods, return error
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage(), 'timestamp' => time()]);
    exit;
}
