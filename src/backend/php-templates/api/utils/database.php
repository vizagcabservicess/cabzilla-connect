
<?php
/**
 * Database connection utility functions
 */

// Function to get the database connection
function getDbConnection() {
    // Load environment variables if available
    $envFile = __DIR__ . '/../.env';
    if (file_exists($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
                list($key, $value) = explode('=', $line, 2);
                $_ENV[$key] = $value;
                putenv("$key=$value");
            }
        }
    }
    
    // First check environment variables
    $dbHost = getenv('DB_HOST') ?: 'localhost';
    $dbUser = getenv('DB_USER') ?: 'u644605165_usr_be';
    $dbPass = getenv('DB_PASS') ?: 'Vizag@1213';
    $dbName = getenv('DB_NAME') ?: 'u644605165_db_be';
    
    // Log connection attempt for debugging
    $logDir = __DIR__ . '/../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0777, true);
    }
    $logFile = $logDir . '/db_connection_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] Attempting database connection to $dbName@$dbHost as $dbUser\n", FILE_APPEND);
    
    // Create connection with improved error handling
    $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
    
    // Check connection
    if ($conn->connect_error) {
        file_put_contents($logFile, "[$timestamp] Database connection failed: " . $conn->connect_error . "\n", FILE_APPEND);
        error_log("Database connection failed: " . $conn->connect_error);
        
        // Try alternative credentials if primary fails
        $altUser = 'u644605165_usr_be'; // Primary credential
        $altPass = 'Vizag@1213';
        
        if ($dbUser !== $altUser) {
            file_put_contents($logFile, "[$timestamp] Trying alternative credentials: $altUser@$dbHost\n", FILE_APPEND);
            $conn = new mysqli($dbHost, $altUser, $altPass, $dbName);
            if (!$conn->connect_error) {
                file_put_contents($logFile, "[$timestamp] Connected successfully with alternative credentials\n", FILE_APPEND);
                
                // Set character set
                $conn->set_charset("utf8mb4");
                return $conn;
            }
        }
        
        return null;
    }
    
    // Set character set
    $conn->set_charset("utf8mb4");
    file_put_contents($logFile, "[$timestamp] Database connection successful\n", FILE_APPEND);
    
    // Return connection
    return $conn;
}

// Function to check database table exists
function checkTableExists($conn, $tableName) {
    $result = $conn->query("SHOW TABLES LIKE '$tableName'");
    return ($result && $result->num_rows > 0);
}

// Function to get database version
function getDatabaseVersion($conn) {
    $result = $conn->query("SELECT version() as version");
    if ($result && $row = $result->fetch_assoc()) {
        return $row['version'];
    }
    return 'Unknown';
}

// Function to create the airport_transfer_fares table if it doesn't exist
function ensureAirportFaresTable($conn) {
    $tableName = 'airport_transfer_fares';
    
    if (!checkTableExists($conn, $tableName)) {
        $sql = "CREATE TABLE $tableName (
            id INT(11) NOT NULL AUTO_INCREMENT,
            vehicle_id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
            base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
            pickup_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            drop_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            tier1_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            tier2_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            tier3_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            tier4_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            extra_km_charge DECIMAL(5,2) NOT NULL DEFAULT 0,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY vehicle_id (vehicle_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        if (!$conn->query($sql)) {
            return false;
        }
        
        // Add default values for common vehicle types
        $defaultVehicles = [
            'sedan' => ['base_price' => 1200, 'price_per_km' => 12, 'tier1_price' => 1200, 'tier2_price' => 1800, 'tier3_price' => 2400, 'extra_km_charge' => 14],
            'suv' => ['base_price' => 1500, 'price_per_km' => 15, 'tier1_price' => 1500, 'tier2_price' => 2200, 'tier3_price' => 3000, 'extra_km_charge' => 16],
            'ertiga' => ['base_price' => 1500, 'price_per_km' => 14, 'tier1_price' => 1500, 'tier2_price' => 2200, 'tier3_price' => 3000, 'extra_km_charge' => 16],
            'innova' => ['base_price' => 2000, 'price_per_km' => 18, 'tier1_price' => 2000, 'tier2_price' => 2800, 'tier3_price' => 3600, 'extra_km_charge' => 18],
            'innova_crysta' => ['base_price' => 2200, 'price_per_km' => 20, 'tier1_price' => 2200, 'tier2_price' => 3000, 'tier3_price' => 3800, 'extra_km_charge' => 20]
        ];
        
        foreach ($defaultVehicles as $vehicleId => $prices) {
            $insertSql = "INSERT IGNORE INTO $tableName (vehicle_id, base_price, price_per_km, tier1_price, tier2_price, tier3_price, extra_km_charge) 
                          VALUES (?, ?, ?, ?, ?, ?, ?)";
            $stmt = $conn->prepare($insertSql);
            $stmt->bind_param(
                'sdddddd',
                $vehicleId,
                $prices['base_price'],
                $prices['price_per_km'],
                $prices['tier1_price'],
                $prices['tier2_price'],
                $prices['tier3_price'],
                $prices['extra_km_charge']
            );
            $stmt->execute();
            $stmt->close();
        }
    }
    
    return true;
}

// Function to create the vehicles table if it doesn't exist
function ensureVehiclesTable($conn) {
    $tableName = 'vehicles';
    
    if (!checkTableExists($conn, $tableName)) {
        $sql = "CREATE TABLE $tableName (
            id VARCHAR(50) PRIMARY KEY,
            vehicle_id VARCHAR(50) NOT NULL,
            name VARCHAR(100) NOT NULL,
            capacity INT DEFAULT 4,
            luggage_capacity INT DEFAULT 2,
            price DECIMAL(10,2) DEFAULT 0,
            price_per_km DECIMAL(5,2) DEFAULT 0,
            image VARCHAR(255),
            description TEXT,
            ac TINYINT(1) DEFAULT 1,
            is_active TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY (vehicle_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        if (!$conn->query($sql)) {
            return false;
        }
        
        // Add default values for common vehicle types
        $defaultVehicles = [
            ['id' => 'sedan', 'vehicle_id' => 'sedan', 'name' => 'Sedan', 'capacity' => 4, 'luggage_capacity' => 2],
            ['id' => 'suv', 'vehicle_id' => 'suv', 'name' => 'SUV', 'capacity' => 6, 'luggage_capacity' => 3],
            ['id' => 'ertiga', 'vehicle_id' => 'ertiga', 'name' => 'Ertiga', 'capacity' => 6, 'luggage_capacity' => 3],
            ['id' => 'innova', 'vehicle_id' => 'innova', 'name' => 'Innova', 'capacity' => 7, 'luggage_capacity' => 4],
            ['id' => 'innova_crysta', 'vehicle_id' => 'innova_crysta', 'name' => 'Innova Crysta', 'capacity' => 7, 'luggage_capacity' => 4]
        ];
        
        foreach ($defaultVehicles as $vehicle) {
            $insertSql = "INSERT IGNORE INTO $tableName (id, vehicle_id, name, capacity, luggage_capacity, is_active) 
                          VALUES (?, ?, ?, ?, ?, 1)";
            $stmt = $conn->prepare($insertSql);
            $stmt->bind_param(
                'sssii',
                $vehicle['id'],
                $vehicle['vehicle_id'],
                $vehicle['name'],
                $vehicle['capacity'],
                $vehicle['luggage_capacity']
            );
            $stmt->execute();
            $stmt->close();
        }
    }
    
    return true;
}
