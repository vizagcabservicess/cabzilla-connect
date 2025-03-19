
<?php
require_once '../../config.php';

// Allow CORS for all domains
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

// Respond to preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log the request for debugging
logError("vehicles.php request", ['method' => $_SERVER['REQUEST_METHOD']]);

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
        if (!$input || !isset($input['vehicleType']) || !isset($input['basePrice']) || !isset($input['pricePerKm'])) {
            throw new Exception("Invalid input data. Required fields: vehicleType, basePrice, pricePerKm");
        }
        
        // Convert values to appropriate types
        $basePrice = floatval($input['basePrice']);
        $pricePerKm = floatval($input['pricePerKm']);
        $nightHaltCharge = isset($input['nightHaltCharge']) ? floatval($input['nightHaltCharge']) : 0;
        $driverAllowance = isset($input['driverAllowance']) ? floatval($input['driverAllowance']) : 0;
        $vehicleType = $input['vehicleType'];
        
        // First check if vehicle type exists
        $checkStmt = $conn->prepare("SELECT COUNT(*) as count FROM vehicle_types WHERE vehicle_id = ?");
        if (!$checkStmt) {
            throw new Exception("Database prepare error on check: " . $conn->error);
        }
        
        $checkStmt->bind_param("s", $vehicleType);
        if (!$checkStmt->execute()) {
            throw new Exception("Failed to check vehicle type: " . $checkStmt->error);
        }
        
        $result = $checkStmt->get_result();
        $row = $result->fetch_assoc();
        
        // If vehicle type doesn't exist, create it
        if ($row['count'] == 0) {
            $insertVehicleStmt = $conn->prepare("
                INSERT INTO vehicle_types (vehicle_id, name, capacity, luggage_capacity, is_active) 
                VALUES (?, ?, 4, 2, 1)
            ");
            
            if (!$insertVehicleStmt) {
                throw new Exception("Database prepare error on insert vehicle: " . $conn->error);
            }
            
            $insertVehicleStmt->bind_param("ss", $vehicleType, $vehicleType);
            
            if (!$insertVehicleStmt->execute()) {
                throw new Exception("Failed to insert vehicle type: " . $insertVehicleStmt->error);
            }
            
            logError("Created new vehicle type", ['vehicleType' => $vehicleType]);
        }
        
        // Now check if pricing record exists
        $checkPricingStmt = $conn->prepare("SELECT COUNT(*) as count FROM vehicle_pricing WHERE vehicle_type = ?");
        if (!$checkPricingStmt) {
            throw new Exception("Database prepare error on pricing check: " . $conn->error);
        }
        
        $checkPricingStmt->bind_param("s", $vehicleType);
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
            
            $updateStmt->bind_param("dddds", $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleType);
            
            if (!$updateStmt->execute()) {
                throw new Exception("Failed to update vehicle pricing: " . $updateStmt->error);
            }
            
            logError("Vehicle pricing updated", ['vehicleType' => $vehicleType, 'basePrice' => $basePrice, 'pricePerKm' => $pricePerKm]);
            echo json_encode(['status' => 'success', 'message' => 'Vehicle pricing updated successfully', 'vehicleType' => $vehicleType, 'timestamp' => time()]);
        } else {
            // Insert new record
            $insertStmt = $conn->prepare("
                INSERT INTO vehicle_pricing (vehicle_type, base_price, price_per_km, night_halt_charge, driver_allowance, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, NOW(), NOW())
            ");
            
            if (!$insertStmt) {
                throw new Exception("Database prepare error on insert: " . $conn->error);
            }
            
            $insertStmt->bind_param("sdddd", $vehicleType, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance);
            
            if (!$insertStmt->execute()) {
                throw new Exception("Failed to insert vehicle pricing: " . $insertStmt->error);
            }
            
            logError("Vehicle pricing created", ['vehicleType' => $vehicleType, 'basePrice' => $basePrice, 'pricePerKm' => $pricePerKm]);
            echo json_encode(['status' => 'success', 'message' => 'Vehicle pricing created successfully', 'vehicleType' => $vehicleType, 'timestamp' => time()]);
        }
        exit;
    }

    // Handle GET requests
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Check if we should include inactive vehicles (admin only)
        $includeInactive = isset($_GET['includeInactive']) && $_GET['includeInactive'] === 'true';
        
        logError("vehicles.php GET request", ['includeInactive' => $includeInactive]);
        
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
                'vehicleType' => (string)$row['vehicle_id']
            ];
            
            // Only add active vehicles for non-admin requests or if specifically including inactive
            if ($includeInactive || $vehicle['isActive']) {
                $vehicles[] = $vehicle;
            }
        }

        // Log success
        logError("Vehicles GET response success", ['count' => count($vehicles), 'activeFilter' => !$includeInactive, 'timestamp' => time()]);
        
        // Add cache busting timestamp to response
        $response = [
            'vehicles' => $vehicles,
            'timestamp' => time(),
            'cached' => false
        ];
        
        // Send response
        echo json_encode($vehicles);
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
