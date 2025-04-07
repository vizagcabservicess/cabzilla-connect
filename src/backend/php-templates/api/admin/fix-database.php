
<?php
/**
 * Fix database tables and structure
 * This script recreates necessary tables if they're missing or have structure issues
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Load configuration
require_once dirname(__FILE__) . '/../../config.php';

// Log the fix attempt
$logFile = LOG_DIR . '/database_fix_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');
file_put_contents($logFile, "[$timestamp] Fix database attempt started\n", FILE_APPEND);

try {
    // Connect to database
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Failed to connect to database. Check credentials.");
    }
    
    // Log successful connection
    file_put_contents($logFile, "[$timestamp] Successfully connected to database\n", FILE_APPEND);
    
    // Check if vehicles table exists
    $tablesResult = $conn->query("SHOW TABLES LIKE 'vehicles'");
    $vehiclesTableExists = ($tablesResult->num_rows > 0);
    
    file_put_contents($logFile, "[$timestamp] Vehicles table exists: " . ($vehiclesTableExists ? 'Yes' : 'No') . "\n", FILE_APPEND);
    
    // Array to track what was fixed
    $fixed = [];
    
    // Create or recreate vehicles table if needed
    if (!$vehiclesTableExists) {
        $createVehiclesTable = "
            CREATE TABLE IF NOT EXISTS vehicles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL UNIQUE,
                name VARCHAR(100) NOT NULL,
                capacity INT NOT NULL DEFAULT 4,
                luggage_capacity INT NOT NULL DEFAULT 2,
                ac BOOLEAN NOT NULL DEFAULT TRUE,
                image VARCHAR(255),
                amenities TEXT,
                description TEXT,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_per_km DECIMAL(10,2) NOT NULL DEFAULT 0,
                night_halt_charge DECIMAL(10,2) DEFAULT 0,
                driver_allowance DECIMAL(10,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        
        if ($conn->query($createVehiclesTable)) {
            $fixed[] = "Created vehicles table";
            file_put_contents($logFile, "[$timestamp] Successfully created vehicles table\n", FILE_APPEND);
        } else {
            throw new Exception("Failed to create vehicles table: " . $conn->error);
        }
    } else {
        // Table exists, check its structure
        $missingColumns = [];
        
        // Define expected columns and their definitions
        $expectedColumns = [
            'id' => 'INT AUTO_INCREMENT PRIMARY KEY',
            'vehicle_id' => 'VARCHAR(50) NOT NULL UNIQUE',
            'name' => 'VARCHAR(100) NOT NULL',
            'capacity' => 'INT NOT NULL DEFAULT 4',
            'luggage_capacity' => 'INT NOT NULL DEFAULT 2',
            'ac' => 'BOOLEAN NOT NULL DEFAULT TRUE',
            'image' => 'VARCHAR(255)',
            'amenities' => 'TEXT',
            'description' => 'TEXT',
            'is_active' => 'BOOLEAN NOT NULL DEFAULT TRUE',
            'base_price' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'price_per_km' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'night_halt_charge' => 'DECIMAL(10,2) DEFAULT 0',
            'driver_allowance' => 'DECIMAL(10,2) DEFAULT 0',
            'created_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
            'updated_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        ];
        
        // Get existing columns
        $columns = [];
        $columnsResult = $conn->query("DESCRIBE vehicles");
        while ($column = $columnsResult->fetch_assoc()) {
            $columns[$column['Field']] = true;
        }
        
        // Check for missing columns
        foreach ($expectedColumns as $column => $definition) {
            if (!isset($columns[$column])) {
                $missingColumns[] = $column;
                
                // Add the missing column
                $query = "ALTER TABLE vehicles ADD COLUMN $column $definition";
                if ($conn->query($query)) {
                    $fixed[] = "Added column $column to vehicles table";
                    file_put_contents($logFile, "[$timestamp] Added column $column to vehicles table\n", FILE_APPEND);
                } else {
                    file_put_contents($logFile, "[$timestamp] Failed to add column $column: " . $conn->error . "\n", FILE_APPEND);
                }
            }
        }
    }
    
    // Check for vehicles in the database
    $vehiclesCountResult = $conn->query("SELECT COUNT(*) as count FROM vehicles");
    $vehiclesCount = ($vehiclesCountResult->fetch_assoc())['count'];
    
    file_put_contents($logFile, "[$timestamp] Found $vehiclesCount vehicles in database\n", FILE_APPEND);
    
    // If no vehicles exist, try loading from JSON
    if ($vehiclesCount == 0) {
        // Check for default vehicles file
        $defaultVehiclesFile = dirname(__FILE__) . '/../../data/default_vehicles.json';
        $persistentCacheFile = dirname(__FILE__) . '/../../cache/vehicles_persistent.json';
        
        // Try loading from persistent cache first
        if (file_exists($persistentCacheFile)) {
            $vehiclesJson = file_get_contents($persistentCacheFile);
            file_put_contents($logFile, "[$timestamp] Loading vehicles from persistent cache\n", FILE_APPEND);
        } 
        // Then try default vehicles file
        else if (file_exists($defaultVehiclesFile)) {
            $vehiclesJson = file_get_contents($defaultVehiclesFile);
            file_put_contents($logFile, "[$timestamp] Loading vehicles from default vehicles file\n", FILE_APPEND);
        } 
        // Fallback to create sample vehicles
        else {
            $vehiclesJson = json_encode([
                [
                    "id" => "sedan",
                    "vehicleId" => "sedan",
                    "name" => "Sedan",
                    "capacity" => 4,
                    "luggageCapacity" => 2,
                    "price" => 2500,
                    "basePrice" => 2500,
                    "pricePerKm" => 14,
                    "image" => "/cars/sedan.png",
                    "amenities" => ["AC", "Bottle Water", "Music System"],
                    "description" => "Comfortable sedan suitable for 4 passengers.",
                    "ac" => true,
                    "nightHaltCharge" => 700,
                    "driverAllowance" => 250,
                    "isActive" => true
                ],
                [
                    "id" => "ertiga",
                    "vehicleId" => "ertiga",
                    "name" => "Ertiga",
                    "capacity" => 6,
                    "luggageCapacity" => 3,
                    "price" => 3200,
                    "basePrice" => 3200,
                    "pricePerKm" => 18,
                    "image" => "/cars/ertiga.png",
                    "amenities" => ["AC", "Bottle Water", "Music System", "Extra Legroom"],
                    "description" => "Spacious SUV suitable for 6 passengers.",
                    "ac" => true,
                    "nightHaltCharge" => 1000,
                    "driverAllowance" => 250,
                    "isActive" => true
                ]
            ]);
            file_put_contents($logFile, "[$timestamp] Creating default sample vehicles\n", FILE_APPEND);
        }
        
        // Parse the vehicles JSON
        $vehicles = json_decode($vehiclesJson, true);
        
        if (is_array($vehicles) && !empty($vehicles)) {
            // Insert each vehicle into the database
            $insertCount = 0;
            
            foreach ($vehicles as $vehicle) {
                // Prepare insert statement
                $stmt = $conn->prepare("
                    INSERT INTO vehicles 
                    (vehicle_id, name, capacity, luggage_capacity, ac, image, amenities, 
                    description, is_active, base_price, price_per_km, night_halt_charge, driver_allowance)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                
                if (!$stmt) {
                    file_put_contents($logFile, "[$timestamp] Prepare failed: " . $conn->error . "\n", FILE_APPEND);
                    continue;
                }
                
                // Set default values for missing fields
                $vehicleId = $vehicle['id'] ?? $vehicle['vehicleId'] ?? uniqid('v_');
                $name = $vehicle['name'] ?? 'Unnamed Vehicle';
                $capacity = $vehicle['capacity'] ?? 4;
                $luggageCapacity = $vehicle['luggageCapacity'] ?? 2;
                $ac = isset($vehicle['ac']) ? ($vehicle['ac'] ? 1 : 0) : 1;
                $image = $vehicle['image'] ?? '';
                $amenitiesJson = isset($vehicle['amenities']) ? json_encode($vehicle['amenities']) : null;
                $description = $vehicle['description'] ?? '';
                $isActive = isset($vehicle['isActive']) ? ($vehicle['isActive'] ? 1 : 0) : 1;
                $basePrice = $vehicle['basePrice'] ?? $vehicle['price'] ?? 0;
                $pricePerKm = $vehicle['pricePerKm'] ?? 0;
                $nightHaltCharge = $vehicle['nightHaltCharge'] ?? 700;
                $driverAllowance = $vehicle['driverAllowance'] ?? 250;
                
                $stmt->bind_param(
                    "ssiissssiiddd",
                    $vehicleId, $name, $capacity, $luggageCapacity, $ac, $image, $amenitiesJson,
                    $description, $isActive, $basePrice, $pricePerKm, $nightHaltCharge, $driverAllowance
                );
                
                if ($stmt->execute()) {
                    $insertCount++;
                } else {
                    file_put_contents($logFile, "[$timestamp] Failed to insert vehicle: " . $stmt->error . "\n", FILE_APPEND);
                }
                
                $stmt->close();
            }
            
            if ($insertCount > 0) {
                $fixed[] = "Imported $insertCount vehicles from JSON";
                file_put_contents($logFile, "[$timestamp] Successfully imported $insertCount vehicles\n", FILE_APPEND);
            }
        }
    }
    
    // Close the database connection
    $conn->close();
    
    // Return success response with details of what was fixed
    echo json_encode([
        'status' => 'success',
        'message' => 'Database fix completed successfully',
        'fixes' => $fixed,
        'timestamp' => time()
    ], JSON_PRETTY_PRINT);
    
    file_put_contents($logFile, "[$timestamp] Fix database completed successfully\n", FILE_APPEND);
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] Error: " . $e->getMessage() . "\n", FILE_APPEND);
    
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ], JSON_PRETTY_PRINT);
}
