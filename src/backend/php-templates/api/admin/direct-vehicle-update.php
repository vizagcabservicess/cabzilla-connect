
<?php
/**
 * Direct vehicle update endpoint
 * Saves vehicle data to MySQL database with proper error handling
 */

// Set CORS headers for API access
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory if needed
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Create cache directory if needed
$cacheDir = __DIR__ . '/../../cache';
if (!file_exists($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}

$logFile = $logDir . '/vehicle_update_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Log request
file_put_contents($logFile, "[$timestamp] Direct vehicle update request received\n", FILE_APPEND);

// Check request method
if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Method not allowed. Use POST or PUT'
    ]);
    file_put_contents($logFile, "[$timestamp] Invalid method: " . $_SERVER['REQUEST_METHOD'] . "\n", FILE_APPEND);
    exit;
}

// Get request data
$inputData = file_get_contents('php://input');
$vehicleData = json_decode($inputData, true);

// If JSON parsing fails, try using POST data
if (!$vehicleData && !empty($_POST)) {
    $vehicleData = $_POST;
    file_put_contents($logFile, "[$timestamp] Using POST data\n", FILE_APPEND);
}

// Log request data
file_put_contents($logFile, "[$timestamp] Raw input data: " . $inputData . "\n", FILE_APPEND);
file_put_contents($logFile, "[$timestamp] Parsed vehicle data: " . json_encode($vehicleData) . "\n", FILE_APPEND);

// Check if vehicle data is valid
if (!$vehicleData) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid or missing vehicle data'
    ]);
    file_put_contents($logFile, "[$timestamp] Invalid or missing vehicle data\n", FILE_APPEND);
    exit;
}

// Check if vehicle ID is provided
if (!isset($vehicleData['id']) && !isset($vehicleData['vehicleId']) && !isset($vehicleData['vehicle_id'])) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required'
    ]);
    file_put_contents($logFile, "[$timestamp] Vehicle ID is required\n", FILE_APPEND);
    exit;
}

// Get the vehicle ID from various possible fields
$vehicleId = isset($vehicleData['id']) ? $vehicleData['id'] : 
            (isset($vehicleData['vehicleId']) ? $vehicleData['vehicleId'] : $vehicleData['vehicle_id']);

file_put_contents($logFile, "[$timestamp] Processing vehicle ID: $vehicleId\n", FILE_APPEND);

try {
    // Include database utilities
    require_once __DIR__ . '/../utils/database.php';
    require_once __DIR__ . '/../common/db_helper.php';
    
    // Connect to database
    $conn = getDbConnectionWithRetry(3);
    
    if (!$conn) {
        throw new Exception("Failed to connect to database");
    }
    
    file_put_contents($logFile, "[$timestamp] Connected to database successfully\n", FILE_APPEND);
    
    // Ensure required tables exist
    $tablesExist = tableExists($conn, 'vehicles') || tableExists($conn, 'vehicle_types');
    
    if (!$tablesExist) {
        file_put_contents($logFile, "[$timestamp] Vehicle tables don't exist, creating...\n", FILE_APPEND);
        
        // Create vehicles table if it doesn't exist
        $createTableSql = "CREATE TABLE IF NOT EXISTS `vehicles` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `vehicle_id` VARCHAR(50) NOT NULL UNIQUE,
            `name` VARCHAR(100) NOT NULL,
            `capacity` INT NOT NULL DEFAULT 4,
            `luggage_capacity` INT NOT NULL DEFAULT 2,
            `ac` TINYINT(1) NOT NULL DEFAULT 1,
            `image` VARCHAR(255),
            `amenities` TEXT,
            `description` TEXT,
            `is_active` TINYINT(1) NOT NULL DEFAULT 1,
            `base_price` DECIMAL(10, 2) NOT NULL DEFAULT 0,
            `price_per_km` DECIMAL(6, 2) NOT NULL DEFAULT 0,
            `night_halt_charge` DECIMAL(10, 2) NOT NULL DEFAULT 0,
            `driver_allowance` DECIMAL(10, 2) NOT NULL DEFAULT 0,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )";
        
        if (!$conn->query($createTableSql)) {
            throw new Exception("Failed to create vehicles table: " . $conn->error);
        }
        
        file_put_contents($logFile, "[$timestamp] Created vehicles table\n", FILE_APPEND);
    }
    
    // Determine the table name to use (vehicles is newer, vehicle_types is legacy)
    $tableName = tableExists($conn, 'vehicles') ? 'vehicles' : 'vehicle_types';
    file_put_contents($logFile, "[$timestamp] Using table: $tableName\n", FILE_APPEND);
    
    // Normalize data for database
    $name = isset($vehicleData['name']) ? $vehicleData['name'] : 'Unknown Vehicle';
    $capacity = isset($vehicleData['capacity']) ? intval($vehicleData['capacity']) : 4;
    $luggageCapacity = isset($vehicleData['luggageCapacity']) ? intval($vehicleData['luggageCapacity']) : 2;
    $ac = isset($vehicleData['ac']) ? ($vehicleData['ac'] ? 1 : 0) : 1;
    $image = isset($vehicleData['image']) ? $vehicleData['image'] : "/cars/{$vehicleId}.png";
    $basePrice = isset($vehicleData['basePrice']) ? floatval($vehicleData['basePrice']) : 
                (isset($vehicleData['price']) ? floatval($vehicleData['price']) : 1500);
    $pricePerKm = isset($vehicleData['pricePerKm']) ? floatval($vehicleData['pricePerKm']) : 14;
    $nightHaltCharge = isset($vehicleData['nightHaltCharge']) ? floatval($vehicleData['nightHaltCharge']) : 700;
    $driverAllowance = isset($vehicleData['driverAllowance']) ? floatval($vehicleData['driverAllowance']) : 250;
    $isActive = isset($vehicleData['isActive']) ? ($vehicleData['isActive'] ? 1 : 0) : 1;
    $description = isset($vehicleData['description']) ? $vehicleData['description'] : '';
    
    // Process amenities
    $amenities = isset($vehicleData['amenities']) ? $vehicleData['amenities'] : ['AC', 'Bottle Water', 'Music System'];
    if (is_string($amenities)) {
        try {
            $amenitiesData = json_decode($amenities, true);
            if (is_array($amenitiesData)) {
                $amenities = $amenitiesData;
            } else {
                // Fallback to comma-separated string
                $amenities = array_map('trim', explode(',', $amenities));
            }
        } catch (Exception $e) {
            // Fallback to comma-separated string
            $amenities = array_map('trim', explode(',', $amenities));
        }
    }
    
    $amenitiesJson = json_encode($amenities);
    
    // Check if vehicle already exists
    $checkSql = "SELECT id FROM `$tableName` WHERE vehicle_id = ?";
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->bind_param('s', $vehicleId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    $exists = $result->num_rows > 0;
    $checkStmt->close();
    
    if ($exists) {
        // Update existing vehicle
        file_put_contents($logFile, "[$timestamp] Updating existing vehicle in database\n", FILE_APPEND);
        
        $updateSql = "UPDATE `$tableName` SET 
            name = ?, 
            capacity = ?, 
            luggage_capacity = ?, 
            ac = ?, 
            image = ?, 
            amenities = ?, 
            description = ?, 
            is_active = ?, 
            base_price = ?, 
            price_per_km = ?,
            night_halt_charge = ?,
            driver_allowance = ?,
            updated_at = NOW()
            WHERE vehicle_id = ?";
            
        $updateStmt = $conn->prepare($updateSql);
        
        if (!$updateStmt) {
            throw new Exception("Failed to prepare update statement: " . $conn->error);
        }
        
        $updateStmt->bind_param('siissssiiddds', 
            $name, 
            $capacity, 
            $luggageCapacity, 
            $ac, 
            $image, 
            $amenitiesJson, 
            $description, 
            $isActive, 
            $basePrice, 
            $pricePerKm, 
            $nightHaltCharge, 
            $driverAllowance, 
            $vehicleId
        );
        
        if (!$updateStmt->execute()) {
            throw new Exception("Failed to update vehicle: " . $updateStmt->error);
        }
        
        $updateStmt->close();
        
        file_put_contents($logFile, "[$timestamp] Vehicle updated successfully in database\n", FILE_APPEND);
    } else {
        // Insert new vehicle
        file_put_contents($logFile, "[$timestamp] Inserting new vehicle into database\n", FILE_APPEND);
        
        $insertSql = "INSERT INTO `$tableName` (
            vehicle_id, 
            name, 
            capacity, 
            luggage_capacity, 
            ac, 
            image, 
            amenities, 
            description, 
            is_active, 
            base_price, 
            price_per_km,
            night_halt_charge,
            driver_allowance,
            created_at,
            updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
        
        $insertStmt = $conn->prepare($insertSql);
        
        if (!$insertStmt) {
            throw new Exception("Failed to prepare insert statement: " . $conn->error);
        }
        
        $insertStmt->bind_param('ssiissssiiddd', 
            $vehicleId, 
            $name, 
            $capacity, 
            $luggageCapacity, 
            $ac, 
            $image, 
            $amenitiesJson, 
            $description, 
            $isActive, 
            $basePrice, 
            $pricePerKm,
            $nightHaltCharge,
            $driverAllowance
        );
        
        if (!$insertStmt->execute()) {
            throw new Exception("Failed to insert vehicle: " . $insertStmt->error);
        }
        
        $insertStmt->close();
        
        file_put_contents($logFile, "[$timestamp] Vehicle inserted successfully into database\n", FILE_APPEND);
    }
    
    $conn->close();
    
    // Also update the persistent cache for backward compatibility
    $persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
    $persistentData = [];
    
    // Try to load existing persistent data
    if (file_exists($persistentCacheFile)) {
        $persistentJson = file_get_contents($persistentCacheFile);
        if ($persistentJson) {
            try {
                $data = json_decode($persistentJson, true);
                if (is_array($data)) {
                    $persistentData = $data;
                }
            } catch (Exception $e) {
                // Failed to parse JSON, start fresh
            }
        }
    }
    
    // Prepare vehicle data for the JSON cache
    $vehicleJsonData = [
        'id' => $vehicleId,
        'vehicleId' => $vehicleId,
        'name' => $name,
        'capacity' => $capacity,
        'luggageCapacity' => $luggageCapacity,
        'price' => $basePrice,
        'basePrice' => $basePrice,
        'pricePerKm' => $pricePerKm,
        'image' => $image,
        'amenities' => $amenities,
        'description' => $description,
        'ac' => $ac == 1,
        'nightHaltCharge' => $nightHaltCharge,
        'driverAllowance' => $driverAllowance,
        'isActive' => $isActive == 1
    ];
    
    // Find if the vehicle already exists in persistent data
    $vehicleIndex = -1;
    foreach ($persistentData as $index => $vehicle) {
        if ((isset($vehicle['id']) && $vehicle['id'] === $vehicleId) || 
            (isset($vehicle['vehicleId']) && $vehicle['vehicleId'] === $vehicleId)) {
            $vehicleIndex = $index;
            break;
        }
    }
    
    if ($vehicleIndex >= 0) {
        // Update existing vehicle
        $persistentData[$vehicleIndex] = array_merge($persistentData[$vehicleIndex], $vehicleJsonData);
    } else {
        // Add new vehicle
        $persistentData[] = $vehicleJsonData;
    }
    
    // Write updated data back to persistent cache
    file_put_contents($persistentCacheFile, json_encode($persistentData, JSON_PRETTY_PRINT));
    file_put_contents($logFile, "[$timestamp] Updated persistent cache file for backward compatibility\n", FILE_APPEND);
    
    // Clear regular cache files
    $cacheFiles = glob($cacheDir . '/vehicles_*.json');
    foreach ($cacheFiles as $file) {
        if ($file !== $persistentCacheFile) {
            @unlink($file);
        }
    }
    
    file_put_contents($logFile, "[$timestamp] Vehicle update completed successfully\n", FILE_APPEND);
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'message' => 'Vehicle updated successfully',
        'vehicle' => $vehicleJsonData,
        'database' => [
            'success' => true,
            'table' => $tableName,
            'operation' => $exists ? 'update' : 'insert'
        ]
    ]);
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] Error: " . $e->getMessage() . "\n", FILE_APPEND);
    
    // Return error response
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to update vehicle: ' . $e->getMessage()
    ]);
}
