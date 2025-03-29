
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include configuration
require_once __DIR__ . '/../../config.php';

// Parse input data
$rawData = file_get_contents('php://input');
$data = json_decode($rawData, true);

// If JSON parsing failed, try POST data
if (!$data) {
    $data = $_POST;
}

// Ensure all fields are set to prevent database errors
$vehicleId = $data['vehicleId'] ?? $data['id'] ?? null;

// Validate vehicle ID
if (!$vehicleId) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required',
        'data' => $data
    ]);
    exit;
}

// Remove 'item-' prefix if it exists
if (strpos($vehicleId, 'item-') === 0) {
    $vehicleId = substr($vehicleId, 5);
}

// Prepare the update data
$name = $data['name'] ?? ucfirst(str_replace('_', ' ', $vehicleId));
$capacity = (int)($data['capacity'] ?? 4);
$luggageCapacity = (int)($data['luggageCapacity'] ?? 2);
$isActive = isset($data['isActive']) ? (int)$data['isActive'] : 1;
$image = $data['image'] ?? '/cars/sedan.png';
$ac = isset($data['ac']) ? (int)$data['ac'] : 1;
$description = $data['description'] ?? '';

// Process amenities
$amenities = $data['amenities'] ?? ['AC', 'Bottle Water', 'Music System'];
if (is_array($amenities)) {
    $amenitiesJson = json_encode($amenities);
} else {
    $amenitiesJson = $amenities;
}

// Establish DB connection
try {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }
    
    // Check if vehicle_types table exists
    $conn->query("
        CREATE TABLE IF NOT EXISTS vehicle_types (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_id VARCHAR(50) NOT NULL UNIQUE,
            name VARCHAR(100) NOT NULL,
            capacity INT NOT NULL DEFAULT 4,
            luggage_capacity INT NOT NULL DEFAULT 2,
            ac TINYINT(1) NOT NULL DEFAULT 1,
            image VARCHAR(255) DEFAULT '/cars/sedan.png',
            amenities TEXT DEFAULT NULL,
            description TEXT DEFAULT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    
    // Check if vehicle already exists
    $checkStmt = $conn->prepare("SELECT id FROM vehicle_types WHERE vehicle_id = ?");
    $checkStmt->bind_param("s", $vehicleId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    
    if ($result->num_rows > 0) {
        // Update existing vehicle
        $updateStmt = $conn->prepare("
            UPDATE vehicle_types 
            SET name = ?, capacity = ?, luggage_capacity = ?, is_active = ?, 
                image = ?, ac = ?, amenities = ?, description = ?, updated_at = NOW() 
            WHERE vehicle_id = ?
        ");
        
        $updateStmt->bind_param(
            "siisisisss", 
            $name, 
            $capacity, 
            $luggageCapacity, 
            $isActive, 
            $image, 
            $ac, 
            $amenitiesJson, 
            $description, 
            $vehicleId
        );
        
        if (!$updateStmt->execute()) {
            throw new Exception("Error updating vehicle: " . $updateStmt->error);
        }
        
        $message = "Vehicle updated successfully";
    } else {
        // Insert new vehicle
        $insertStmt = $conn->prepare("
            INSERT INTO vehicle_types 
            (vehicle_id, name, capacity, luggage_capacity, is_active, image, ac, amenities, description) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $insertStmt->bind_param(
            "ssiisisis", 
            $vehicleId, 
            $name, 
            $capacity, 
            $luggageCapacity, 
            $isActive, 
            $image, 
            $ac, 
            $amenitiesJson, 
            $description
        );
        
        if (!$insertStmt->execute()) {
            throw new Exception("Error creating vehicle: " . $insertStmt->error);
        }
        
        $message = "Vehicle created successfully";
    }
    
    // Also update the JSON file
    $jsonFile = __DIR__ . '/../../../data/vehicles.json';
    try {
        $vehicles = [];
        if (file_exists($jsonFile)) {
            $jsonContent = file_get_contents($jsonFile);
            if (!empty($jsonContent)) {
                $vehicles = json_decode($jsonContent, true) ?: [];
            }
        }
        
        // Find and update or add the vehicle
        $vehicleFound = false;
        foreach ($vehicles as &$vehicle) {
            if ($vehicle['id'] === $vehicleId || $vehicle['vehicleId'] === $vehicleId) {
                $vehicle['name'] = $name;
                $vehicle['capacity'] = $capacity;
                $vehicle['luggageCapacity'] = $luggageCapacity;
                $vehicle['isActive'] = (bool)$isActive;
                $vehicle['image'] = $image;
                $vehicle['ac'] = (bool)$ac;
                $vehicle['amenities'] = is_array($amenities) ? $amenities : [$amenities];
                $vehicle['description'] = $description;
                $vehicleFound = true;
                break;
            }
        }
        
        if (!$vehicleFound) {
            // Get pricing data if available
            $pricingData = [];
            $pricingStmt = $conn->prepare("
                SELECT base_price, price_per_km, night_halt_charge, driver_allowance 
                FROM vehicle_pricing 
                WHERE vehicle_id = ? AND trip_type = 'all'
                LIMIT 1
            ");
            
            if ($pricingStmt) {
                $pricingStmt->bind_param("s", $vehicleId);
                $pricingStmt->execute();
                $pricingResult = $pricingStmt->get_result();
                
                if ($pricingResult->num_rows > 0) {
                    $pricingData = $pricingResult->fetch_assoc();
                }
            }
            
            // Add new vehicle to the array
            $vehicles[] = [
                'id' => $vehicleId,
                'vehicleId' => $vehicleId,
                'name' => $name,
                'capacity' => $capacity,
                'luggageCapacity' => $luggageCapacity,
                'basePrice' => $pricingData['base_price'] ?? 0,
                'price' => $pricingData['base_price'] ?? 0,
                'pricePerKm' => $pricingData['price_per_km'] ?? 0,
                'nightHaltCharge' => $pricingData['night_halt_charge'] ?? 0,
                'driverAllowance' => $pricingData['driver_allowance'] ?? 0,
                'image' => $image,
                'amenities' => is_array($amenities) ? $amenities : [$amenities],
                'description' => $description,
                'ac' => (bool)$ac,
                'isActive' => (bool)$isActive
            ];
        }
        
        // Save the updated JSON file
        file_put_contents($jsonFile, json_encode($vehicles, JSON_PRETTY_PRINT));
        
        // Update cache invalidation marker
        file_put_contents(__DIR__ . '/../../../data/vehicle_cache_invalidated.txt', time());
        
    } catch (Exception $e) {
        error_log("Error updating JSON file: " . $e->getMessage());
    }
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'message' => $message,
        'vehicleId' => $vehicleId
    ]);
    
    // Dispatch a vehicle refresh event
    echo "
    <script>
        if (window.parent && window.parent.dispatchEvent) {
            window.parent.dispatchEvent(new CustomEvent('vehicle-data-refreshed', {
                detail: {
                    vehicleId: '$vehicleId',
                    timestamp: " . time() . "
                }
            }));
        }
    </script>
    ";
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
    error_log("Direct vehicle update error: " . $e->getMessage());
}
