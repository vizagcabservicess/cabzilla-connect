
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
logError("vehicles.php request", ['method' => $_SERVER['REQUEST_METHOD'], 'timestamp' => time()]);

// Handle requests
try {
    // Connect to database
    $conn = getDbConnection();

    if (!$conn) {
        throw new Exception("Database connection failed: " . mysqli_connect_error());
    }

    // Handle POST requests for updating vehicle pricing
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Get the JSON data from the request
        $inputJSON = file_get_contents('php://input');
        $input = json_decode($inputJSON, true);
        
        // Log the input data
        logError("Vehicle pricing update request", ['input' => $input]);
        
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
        $amenities = isset($input['amenities']) ? json_encode($input['amenities']) : '[]';
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
            
            logError("Created new vehicle type", ['vehicleId' => $vehicleId]);
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
            
            logError("Updated vehicle type", ['vehicleId' => $vehicleId]);
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
            
            logError("Vehicle pricing updated", ['vehicleId' => $vehicleId, 'basePrice' => $basePrice, 'pricePerKm' => $pricePerKm]);
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
            
            logError("Vehicle pricing created", ['vehicleId' => $vehicleId, 'basePrice' => $basePrice, 'pricePerKm' => $pricePerKm]);
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
        
        logError("vehicles.php GET request", [
            'includeInactive' => $includeInactive, 
            'cacheBuster' => $cacheBuster,
            'forceRefresh' => $forceRefresh,
            'headers' => getallheaders()
        ]);
        
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
        
        logError("vehicles.php query", ['query' => $query]);
        
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

        // Log success
        logError("Vehicles GET response success", [
            'count' => count($vehicles), 
            'activeFilter' => !$includeInactive, 
            'timestamp' => time()
        ]);
        
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
    logError("Error in vehicles.php", ['error' => $e->getMessage()]);
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
    exit;
}
