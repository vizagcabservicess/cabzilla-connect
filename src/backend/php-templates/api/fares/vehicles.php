
<?php
require_once '../../config.php';

// Allow CORS for all domains
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

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
        
        // Prepare statement to update vehicle pricing
        $stmt = $conn->prepare("
            UPDATE vehicle_pricing 
            SET base_price = ?, price_per_km = ?, night_halt_charge = ?, driver_allowance = ?
            WHERE vehicle_type = ?
        ");
        
        if (!$stmt) {
            throw new Exception("Database prepare error: " . $conn->error);
        }
        
        // Convert values to appropriate types
        $basePrice = floatval($input['basePrice']);
        $pricePerKm = floatval($input['pricePerKm']);
        $nightHaltCharge = isset($input['nightHaltCharge']) ? floatval($input['nightHaltCharge']) : 0;
        $driverAllowance = isset($input['driverAllowance']) ? floatval($input['driverAllowance']) : 0;
        $vehicleType = $input['vehicleType'];
        
        // Bind parameters
        $stmt->bind_param("dddds", $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance, $vehicleType);
        
        // Execute statement
        if (!$stmt->execute()) {
            throw new Exception("Failed to update vehicle pricing: " . $stmt->error);
        }
        
        // Check if any rows were affected
        if ($stmt->affected_rows === 0) {
            // No rows updated, check if the vehicle type exists
            $checkStmt = $conn->prepare("SELECT COUNT(*) as count FROM vehicle_pricing WHERE vehicle_type = ?");
            if (!$checkStmt) {
                throw new Exception("Database prepare error on check: " . $conn->error);
            }
            
            $checkStmt->bind_param("s", $vehicleType);
            if (!$checkStmt->execute()) {
                throw new Exception("Failed to check vehicle pricing: " . $checkStmt->error);
            }
            
            $result = $checkStmt->get_result();
            $row = $result->fetch_assoc();
            
            if ($row['count'] === 0) {
                // Vehicle type doesn't exist, create it
                $insertStmt = $conn->prepare("
                    INSERT INTO vehicle_pricing (vehicle_type, base_price, price_per_km, night_halt_charge, driver_allowance, is_active)
                    VALUES (?, ?, ?, ?, ?, 1)
                ");
                
                if (!$insertStmt) {
                    throw new Exception("Database prepare error on insert: " . $conn->error);
                }
                
                $insertStmt->bind_param("sdddd", $vehicleType, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance);
                
                if (!$insertStmt->execute()) {
                    throw new Exception("Failed to insert vehicle pricing: " . $insertStmt->error);
                }
                
                echo json_encode(['message' => 'Vehicle pricing created successfully', 'vehicleType' => $vehicleType]);
                exit;
            } else {
                // Vehicle type exists but no change in values
                echo json_encode(['message' => 'No changes made to vehicle pricing', 'vehicleType' => $vehicleType]);
                exit;
            }
        }
        
        echo json_encode(['message' => 'Vehicle pricing updated successfully', 'vehicleType' => $vehicleType]);
        exit;
    }

    // Handle GET requests
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get all vehicle types with their pricing data with a simpler query
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
            WHERE 
                vt.is_active = 1
            ORDER BY 
                vt.name
        ";
        
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
            
            // Format vehicle data with consistent property names for frontend
            $vehicle = [
                'id' => (string)$row['vehicle_id'],
                'name' => $row['name'] ?? '',
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
            
            $vehicles[] = $vehicle;
        }

        // Log success
        logError("Vehicles GET response success", ['count' => count($vehicles)]);
        
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
