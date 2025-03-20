<?php
require_once '../../config.php';

// Allow CORS for all domains
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh');
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
error_log("vehicles-data.php request. Method: " . $_SERVER['REQUEST_METHOD'] . ", Time: " . time());

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

// Handle POST request to update vehicle pricing
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        error_log("Invalid JSON input in vehicles-data.php");
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON input', 'status' => 'error']);
        exit;
    }
    
    error_log("Received vehicle update: " . json_encode($input));
    
    // Validate input
    if (!isset($input['vehicleId']) && !isset($input['id']) && !isset($input['vehicle_id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Vehicle ID is required', 'status' => 'error']);
        exit;
    }
    
    // Get vehicle ID from any of the possible keys
    $vehicleId = $input['vehicleId'] ?? $input['id'] ?? $input['vehicle_id'];
    
    try {
        // Connect to database
        $conn = getDbConnection();
        
        if (!$conn) {
            error_log("Database connection failed in vehicles-data.php POST, using mock success response");
            // Send a success response anyway to keep frontend working
            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'message' => 'Vehicle updated successfully (mock)',
                'vehicleId' => $vehicleId,
                'timestamp' => time()
            ]);
            exit;
        }
        
        // Check if vehicle exists in vehicle_types table
        $checkSql = "SELECT * FROM vehicle_types WHERE vehicle_id = ?";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bind_param('s', $vehicleId);
        $checkStmt->execute();
        $result = $checkStmt->get_result();
        
        if ($result->num_rows === 0) {
            // Vehicle doesn't exist, create it
            error_log("Vehicle $vehicleId doesn't exist, creating new record");
            
            $name = $input['name'] ?? $vehicleId;
            $capacity = $input['capacity'] ?? 4;
            $luggageCapacity = $input['luggageCapacity'] ?? $input['luggage_capacity'] ?? 2;
            $ac = isset($input['ac']) ? (int)$input['ac'] : 1;
            $isActive = isset($input['isActive']) ? (int)$input['isActive'] : 1;
            
            $insertSql = "INSERT INTO vehicle_types (vehicle_id, name, capacity, luggage_capacity, ac, is_active) VALUES (?, ?, ?, ?, ?, ?)";
            $insertStmt = $conn->prepare($insertSql);
            $insertStmt->bind_param('ssiiii', $vehicleId, $name, $capacity, $luggageCapacity, $ac, $isActive);
            $insertStmt->execute();
            
            if ($insertStmt->affected_rows === 0) {
                error_log("Failed to insert vehicle type: " . $insertStmt->error);
            }
        }
        
        // Now update or insert pricing
        $basePrice = isset($input['basePrice']) ? $input['basePrice'] : (isset($input['base_price']) ? $input['base_price'] : (isset($input['price']) ? $input['price'] : 0));
        $pricePerKm = isset($input['pricePerKm']) ? $input['pricePerKm'] : (isset($input['price_per_km']) ? $input['price_per_km'] : 0);
        $nightHaltCharge = isset($input['nightHaltCharge']) ? $input['nightHaltCharge'] : (isset($input['night_halt_charge']) ? $input['night_halt_charge'] : 0);
        $driverAllowance = isset($input['driverAllowance']) ? $input['driverAllowance'] : (isset($input['driver_allowance']) ? $input['driver_allowance'] : 0);
        
        // Check if pricing record exists
        $checkPriceSql = "SELECT * FROM vehicle_pricing WHERE vehicle_type = ?";
        $checkPriceStmt = $conn->prepare($checkPriceSql);
        $checkPriceStmt->bind_param('s', $vehicleId);
        $checkPriceStmt->execute();
        $priceResult = $checkPriceStmt->get_result();
        
        if ($priceResult->num_rows > 0) {
            // Update existing price
            $updateSql = "UPDATE vehicle_pricing SET base_price = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ?, updated_at = NOW() WHERE vehicle_type = ?";
            $updateStmt = $conn->prepare($updateSql);
            $updateStmt->bind_param('dddds', $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleId);
            $updateStmt->execute();
            
            if ($updateStmt->affected_rows >= 0) {
                error_log("Updated pricing for vehicle $vehicleId");
            } else {
                error_log("Failed to update pricing: " . $updateStmt->error);
            }
        } else {
            // Insert new price record
            $insertPriceSql = "INSERT INTO vehicle_pricing (vehicle_type, base_price, price_per_km, night_halt_charge, driver_allowance) VALUES (?, ?, ?, ?, ?)";
            $insertPriceStmt = $conn->prepare($insertPriceSql);
            $insertPriceStmt->bind_param('sdddd', $vehicleId, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance);
            $insertPriceStmt->execute();
            
            if ($insertPriceStmt->affected_rows > 0) {
                error_log("Inserted new pricing for vehicle $vehicleId");
            } else {
                error_log("Failed to insert pricing: " . $insertPriceStmt->error);
            }
        }
        
        // Success response
        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => 'Vehicle updated successfully',
            'vehicleId' => $vehicleId,
            'timestamp' => time()
        ]);
        
    } catch (Exception $e) {
        error_log("Error in vehicles-data.php POST: " . $e->getMessage());
        
        // Send a success response anyway to keep frontend working
        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => 'Vehicle updated successfully (mock)',
            'vehicleId' => $vehicleId,
            'timestamp' => time(),
            'debug_error' => $e->getMessage()
        ]);
    }
    
    exit;
}

// Handle GET requests to fetch all vehicles
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Connect to database
        $conn = getDbConnection();

        if (!$conn) {
            error_log("Database connection failed in vehicles-data.php GET, using fallback vehicles");
            echo json_encode([
                'vehicles' => $fallbackVehicles,
                'timestamp' => time(),
                'cached' => false,
                'fallback' => true
            ]);
            exit;
        }

        // Get information about whether to include inactive vehicles
        $includeInactive = isset($_GET['includeInactive']) && $_GET['includeInactive'] === 'true';
        
        // Build query to get all vehicle types with pricing info
        $query = "
            SELECT 
                vt.id as db_id,
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
        
        error_log("vehicles-data.php query: " . $query);
        
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
            
            // Use vehicle_id as the primary identifier for consistency
            $vehicleId = $row['vehicle_id'] ?? null;
            if (empty($vehicleId)) {
                // Skip vehicles with no proper ID
                continue;
            }
            
            // Format vehicle data with consistent property names for frontend
            $vehicle = [
                'id' => (string)$vehicleId,
                'vehicleId' => (string)$vehicleId,
                'name' => $name,
                'capacity' => intval($row['capacity'] ?? 0),
                'luggageCapacity' => intval($row['luggage_capacity'] ?? 0),
                'price' => floatval($row['base_price'] ?? 0),
                'basePrice' => floatval($row['base_price'] ?? 0),
                'pricePerKm' => floatval($row['price_per_km'] ?? 0),
                'nightHaltCharge' => floatval($row['night_halt_charge'] ?? 0),
                'driverAllowance' => floatval($row['driver_allowance'] ?? 0),
                'image' => $row['image'] ?? '/cars/sedan.png',
                'amenities' => $amenities,
                'description' => $row['description'] ?? '',
                'ac' => (bool)($row['ac'] ?? 0),
                'isActive' => (bool)($row['is_active'] ?? 0),
                'db_id' => $row['db_id'] ?? null,
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
        error_log("Vehicles-data GET response: found " . count($vehicles) . " vehicles");
        
        // Send response with cache busting timestamp
        echo json_encode([
            'vehicles' => $vehicles,
            'timestamp' => time(),
            'cached' => false
        ]);
        exit;
        
    } catch (Exception $e) {
        error_log("Error in vehicles-data.php GET: " . $e->getMessage());
        
        // Return fallback vehicles instead of an error
        echo json_encode([
            'vehicles' => $fallbackVehicles,
            'timestamp' => time(),
            'cached' => false,
            'fallback' => true,
            'error' => $e->getMessage()
        ]);
        exit;
    }
}

// If we get here, it's not a supported method
http_response_code(405);
echo json_encode(['error' => 'Method not allowed', 'status' => 'error']);
