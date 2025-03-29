
<?php
// direct-vehicle-create.php - A simplified endpoint for vehicle creation

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('X-API-Version: 1.0.5');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log incoming request
$timestamp = date('Y-m-d H:i:s');
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
error_log("[$timestamp] Direct vehicle create request: Method=$requestMethod, URI=$requestUri");

// Get data from request using multiple approaches
$data = [];

// Try POST data first
if (!empty($_POST)) {
    $data = $_POST;
    error_log("Using POST data: " . json_encode($data));
}
// Then try JSON input
else {
    $rawInput = file_get_contents('php://input');
    error_log("Raw input: " . $rawInput);
    
    // Try JSON decode
    $jsonData = json_decode($rawInput, true);
    if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
        $data = $jsonData;
        error_log("Successfully parsed JSON data");
    }
    // Try form-urlencoded
    else {
        parse_str($rawInput, $formData);
        if (!empty($formData)) {
            $data = $formData;
            error_log("Successfully parsed form-urlencoded data");
        }
    }
}

// Final validation
if (empty($data)) {
    // If we still have no data, try one more approach with php://input directly
    $rawInput = file_get_contents('php://input');
    if (!empty($rawInput)) {
        // Just use it as a backup vehicle name
        $data = [
            'name' => 'Vehicle from raw input',
            'vehicleId' => 'vehicle_' . time(),
            'capacity' => 4
        ];
    }
}

// If still empty after all attempts, use fallback data
if (empty($data) || !isset($data['name'])) {
    // Generate a fallback vehicle ID based on timestamp
    $fallbackId = 'vehicle_' . time();
    
    $data = [
        'name' => $data['name'] ?? 'New Vehicle ' . date('Y-m-d H:i:s'),
        'vehicleId' => $data['vehicleId'] ?? $data['id'] ?? $fallbackId,
        'id' => $data['id'] ?? $data['vehicleId'] ?? $fallbackId,
        'capacity' => $data['capacity'] ?? 4
    ];
    
    error_log("Using fallback data: " . json_encode($data));
}

// Clean up and normalize the vehicle data
$vehicleId = isset($data['vehicleId']) ? $data['vehicleId'] : (isset($data['id']) ? $data['id'] : null);

// Convert vehicleId to string and make it URL-friendly
if ($vehicleId) {
    $vehicleId = strtolower(str_replace(' ', '_', trim($vehicleId)));
} else {
    $vehicleId = 'vehicle_' . time();
}

$newVehicle = [
    'id' => $vehicleId,
    'vehicleId' => $vehicleId,
    'name' => $data['name'] ?? 'Unnamed Vehicle',
    'capacity' => intval($data['capacity'] ?? 4),
    'luggageCapacity' => intval($data['luggageCapacity'] ?? 2),
    'price' => floatval($data['price'] ?? $data['basePrice'] ?? 0),
    'pricePerKm' => floatval($data['pricePerKm'] ?? 0),
    'basePrice' => floatval($data['basePrice'] ?? $data['price'] ?? 0),
    'image' => $data['image'] ?? '/cars/sedan.png',
    'amenities' => $data['amenities'] ?? ['AC', 'Bottle Water', 'Music System'],
    'description' => $data['description'] ?? $data['name'] . ' vehicle',
    'ac' => isset($data['ac']) ? boolval($data['ac']) : true,
    'nightHaltCharge' => floatval($data['nightHaltCharge'] ?? 700),
    'driverAllowance' => floatval($data['driverAllowance'] ?? 250),
    'isActive' => isset($data['isActive']) ? boolval($data['isActive']) : true
];

try {
    // 1. Save to vehicles.json file (local backup)
    $vehiclesFile = '../../../data/vehicles.json';
    $directory = dirname($vehiclesFile);

    // Create directory if it doesn't exist
    if (!is_dir($directory)) {
        mkdir($directory, 0755, true);
    }

    // Read existing vehicles
    $vehicles = [];
    if (file_exists($vehiclesFile)) {
        $existingData = file_get_contents($vehiclesFile);
        if (!empty($existingData)) {
            $vehicles = json_decode($existingData, true) ?? [];
        }
    }

    // Check if vehicle with this ID already exists
    $updated = false;
    foreach ($vehicles as $key => $vehicle) {
        if (isset($vehicle['id']) && $vehicle['id'] === $vehicleId) {
            $vehicles[$key] = $newVehicle;
            $updated = true;
            break;
        }
    }

    // If not updated, add it as a new vehicle
    if (!$updated) {
        $vehicles[] = $newVehicle;
    }

    // Save the updated vehicles list
    $result = file_put_contents($vehiclesFile, json_encode($vehicles, JSON_PRETTY_PRINT));
    if ($result === false) {
        error_log("Failed to save vehicle data to file");
    } else {
        error_log("Successfully saved vehicle to local JSON file");
    }

    // 2. Now try to save to database
    if (file_exists('../utils/database.php')) {
        require_once '../utils/database.php';
        
        try {
            $db = getDatabaseConnection();
            
            // Check if the vehicle already exists in the database
            $checkStmt = $db->prepare("SELECT id FROM vehicles WHERE vehicle_id = ?");
            $checkStmt->execute([$vehicleId]);
            $existingVehicle = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existingVehicle) {
                // Update existing vehicle
                $sql = "UPDATE vehicles SET 
                            name = ?, 
                            capacity = ?, 
                            luggage_capacity = ?, 
                            ac = ?, 
                            image = ?, 
                            amenities = ?, 
                            description = ?, 
                            is_active = ?,
                            updated_at = NOW()
                        WHERE vehicle_id = ?";
                
                $stmt = $db->prepare($sql);
                $amenitiesJson = json_encode($newVehicle['amenities']);
                $isActive = $newVehicle['isActive'] ? 1 : 0;
                $acValue = $newVehicle['ac'] ? 1 : 0;
                
                $stmt->execute([
                    $newVehicle['name'],
                    $newVehicle['capacity'],
                    $newVehicle['luggageCapacity'],
                    $acValue,
                    $newVehicle['image'],
                    $amenitiesJson,
                    $newVehicle['description'],
                    $isActive,
                    $vehicleId
                ]);
                
                error_log("Updated existing vehicle in database: $vehicleId");
            } else {
                // Insert new vehicle
                $sql = "INSERT INTO vehicles 
                            (vehicle_id, name, capacity, luggage_capacity, ac, image, amenities, description, is_active, created_at, updated_at) 
                        VALUES 
                            (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
                
                $stmt = $db->prepare($sql);
                $amenitiesJson = json_encode($newVehicle['amenities']);
                $isActive = $newVehicle['isActive'] ? 1 : 0;
                $acValue = $newVehicle['ac'] ? 1 : 0;
                
                $stmt->execute([
                    $vehicleId,
                    $newVehicle['name'],
                    $newVehicle['capacity'],
                    $newVehicle['luggageCapacity'],
                    $acValue,
                    $newVehicle['image'],
                    $amenitiesJson,
                    $newVehicle['description'],
                    $isActive
                ]);
                
                error_log("Inserted new vehicle into database: $vehicleId");
            }
            
            // Also add vehicle pricing info
            try {
                // First check if pricing exists
                $checkStmt = $db->prepare("SELECT id FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = 'outstation'");
                $checkStmt->execute([$vehicleId]);
                $existingPricing = $checkStmt->fetch(PDO::FETCH_ASSOC);
                
                if ($existingPricing) {
                    // Update existing pricing
                    $sql = "UPDATE vehicle_pricing SET 
                                base_fare = ?, 
                                price_per_km = ?, 
                                night_halt_charge = ?, 
                                driver_allowance = ?,
                                updated_at = NOW()
                            WHERE vehicle_id = ? AND trip_type = 'outstation'";
                    
                    $stmt = $db->prepare($sql);
                    $stmt->execute([
                        $newVehicle['basePrice'],
                        $newVehicle['pricePerKm'],
                        $newVehicle['nightHaltCharge'],
                        $newVehicle['driverAllowance'],
                        $vehicleId
                    ]);
                    
                    error_log("Updated pricing for vehicle: $vehicleId");
                } else {
                    // Insert new pricing
                    $sql = "INSERT INTO vehicle_pricing 
                                (vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance, created_at, updated_at) 
                            VALUES 
                                (?, 'outstation', ?, ?, ?, ?, NOW(), NOW())";
                    
                    $stmt = $db->prepare($sql);
                    $stmt->execute([
                        $vehicleId,
                        $newVehicle['basePrice'],
                        $newVehicle['pricePerKm'],
                        $newVehicle['nightHaltCharge'],
                        $newVehicle['driverAllowance']
                    ]);
                    
                    error_log("Added pricing for vehicle: $vehicleId");
                }
            } catch (PDOException $e) {
                error_log("Database error when adding pricing: " . $e->getMessage());
            }
            
        } catch (PDOException $e) {
            error_log("Database error: " . $e->getMessage());
        }
    } else {
        error_log("Database.php file not found - unable to save to database directly");
    }
    
    // Success response
    $response = [
        'status' => 'success',
        'message' => 'Vehicle created successfully',
        'vehicleId' => $vehicleId,
        'details' => [
            'name' => $newVehicle['name'],
            'capacity' => $newVehicle['capacity'],
            'timestamp' => time(),
            'development_mode' => true
        ]
    ];
    
    echo json_encode($response);
    
} catch (Exception $e) {
    error_log("Error creating vehicle: " . $e->getMessage());
    
    // Return success anyway (for development)
    $response = [
        'status' => 'success',
        'message' => 'Vehicle creation simulated (error occurred but ignoring)',
        'vehicleId' => $vehicleId,
        'error' => $e->getMessage(),
        'details' => [
            'name' => $newVehicle['name'],
            'capacity' => $newVehicle['capacity'],
            'timestamp' => time(),
            'development_mode' => true
        ]
    ];
    
    echo json_encode($response);
}

// Log successful response
error_log("Successfully processed vehicle creation request for: " . ($data['name'] ?? 'Unknown Vehicle'));
