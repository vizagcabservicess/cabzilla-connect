
<?php
// Database initialization script - creates all required tables for the fare system

// Set CORS headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle OPTIONS request immediately for CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log directory setup
$logsDir = __DIR__ . '/../logs';
if (!is_dir($logsDir)) {
    mkdir($logsDir, 0755, true);
}

// Database Connection Function - super reliable with multiple fallbacks
function getDbConnection() {
    $attempts = 0;
    $maxAttempts = 3;
    $lastError = '';
    
    while ($attempts < $maxAttempts) {
        try {
            $attempts++;
            
            // First try using constants from config.php if available
            if (defined('DB_HOST') && defined('DB_DATABASE') && defined('DB_USERNAME') && defined('DB_PASSWORD')) {
                $conn = new mysqli(DB_HOST, DB_USERNAME, DB_PASSWORD, DB_DATABASE);
                if (!$conn->connect_error) {
                    return $conn;
                }
                $lastError = "Connection failed using constants: " . $conn->connect_error;
            }
            
            // Then try global variables that might be defined
            global $db_host, $db_name, $db_user, $db_pass;
            if (isset($db_host) && isset($db_name) && isset($db_user) && isset($db_pass)) {
                $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
                if (!$conn->connect_error) {
                    return $conn;
                }
                $lastError = "Connection failed using globals: " . $conn->connect_error;
            }
            
            // Hardcoded credentials as last resort
            $conn = new mysqli("localhost", "u644605165_new_bookingusr", "Vizag@1213", "u644605165_new_bookingdb");
            if (!$conn->connect_error) {
                return $conn;
            }
            $lastError = "Connection failed using hardcoded values: " . $conn->connect_error;
            
            // If we reach here, try with PDO as last resort
            try {
                $pdo = new PDO("mysql:host=localhost;dbname=u644605165_new_bookingdb", "u644605165_new_bookingusr", "Vizag@1213");
                $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                return $pdo; // Return PDO connection
            } catch (PDOException $e) {
                $lastError = "PDO connection failed: " . $e->getMessage();
            }
            
            // Wait briefly before retry
            usleep(250000); // 250ms
        } catch (Exception $e) {
            $lastError = "Exception in connection attempt $attempts: " . $e->getMessage();
        }
    }
    
    throw new Exception("Failed to connect to database after $maxAttempts attempts. Last error: $lastError");
}

try {
    // Connect to database
    $conn = getDbConnection();
    error_log("Database connection established", 3, "$logsDir/db-init.log");
    
    // Define table creation queries
    $tablesCreated = [];
    $tableErrors = [];
    
    $createTableQueries = [
        'local_package_fares' => "CREATE TABLE IF NOT EXISTS local_package_fares (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_id VARCHAR(100) NOT NULL,
            price_4hrs_40km DECIMAL(10,2) DEFAULT 0,
            price_8hrs_80km DECIMAL(10,2) DEFAULT 0,
            price_10hrs_100km DECIMAL(10,2) DEFAULT 0,
            price_extra_km DECIMAL(10,2) DEFAULT 0,
            price_extra_hour DECIMAL(10,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_vehicle_id (vehicle_id)
        )",
        
        'outstation_fares' => "CREATE TABLE IF NOT EXISTS outstation_fares (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_id VARCHAR(100) NOT NULL,
            base_price DECIMAL(10,2) DEFAULT 0,
            price_per_km DECIMAL(10,2) DEFAULT 0,
            driver_allowance DECIMAL(10,2) DEFAULT 0,
            night_halt_charge DECIMAL(10,2) DEFAULT 0,
            roundtrip_price_multiplier DECIMAL(5,2) DEFAULT 1.0,
            min_km_per_day DECIMAL(10,2) DEFAULT 250,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_vehicle_id (vehicle_id)
        )",
        
        'airport_fares' => "CREATE TABLE IF NOT EXISTS airport_fares (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_id VARCHAR(100) NOT NULL,
            base_price DECIMAL(10,2) DEFAULT 0,
            price_per_km DECIMAL(10,2) DEFAULT 0,
            pickup_price DECIMAL(10,2) DEFAULT 0,
            drop_price DECIMAL(10,2) DEFAULT 0,
            tier1_price DECIMAL(10,2) DEFAULT 0,
            tier2_price DECIMAL(10,2) DEFAULT 0,
            tier3_price DECIMAL(10,2) DEFAULT 0,
            tier4_price DECIMAL(10,2) DEFAULT 0,
            extra_km_charge DECIMAL(10,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_vehicle_id (vehicle_id)
        )",
        
        'vehicle_pricing' => "CREATE TABLE IF NOT EXISTS vehicle_pricing (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_type VARCHAR(100) NOT NULL,
            base_price DECIMAL(10,2) DEFAULT 0,
            price_per_km DECIMAL(10,2) DEFAULT 0,
            driver_allowance DECIMAL(10,2) DEFAULT 0,
            night_halt_charge DECIMAL(10,2) DEFAULT 0,
            local_package_4hr DECIMAL(10,2) DEFAULT 0,
            local_package_8hr DECIMAL(10,2) DEFAULT 0,
            local_package_10hr DECIMAL(10,2) DEFAULT 0,
            extra_km_charge DECIMAL(10,2) DEFAULT 0,
            extra_hour_charge DECIMAL(10,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_vehicle_type (vehicle_type)
        )",
        
        'tour_fares' => "CREATE TABLE IF NOT EXISTS tour_fares (
            id INT AUTO_INCREMENT PRIMARY KEY,
            tour_id VARCHAR(100) NOT NULL,
            tour_name VARCHAR(255) NOT NULL,
            sedan DECIMAL(10,2) DEFAULT 0,
            ertiga DECIMAL(10,2) DEFAULT 0,
            innova DECIMAL(10,2) DEFAULT 0,
            tempo DECIMAL(10,2) DEFAULT 0,
            luxury DECIMAL(10,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_tour_id (tour_id)
        )"
    ];
    
    // Create each table
    if ($conn instanceof mysqli) {
        foreach ($createTableQueries as $tableName => $query) {
            if ($conn->query($query) === TRUE) {
                $tablesCreated[] = $tableName;
                error_log("Table $tableName created or already exists", 3, "$logsDir/db-init.log");
            } else {
                $tableErrors[] = ["table" => $tableName, "error" => $conn->error];
                error_log("Error creating table $tableName: " . $conn->error, 3, "$logsDir/db-init.log");
            }
        }
    } else if ($conn instanceof PDO) {
        foreach ($createTableQueries as $tableName => $query) {
            try {
                $conn->exec($query);
                $tablesCreated[] = $tableName;
                error_log("Table $tableName created or already exists (PDO)", 3, "$logsDir/db-init.log");
            } catch (PDOException $e) {
                $tableErrors[] = ["table" => $tableName, "error" => $e->getMessage()];
                error_log("Error creating table $tableName: " . $e->getMessage(), 3, "$logsDir/db-init.log");
            }
        }
    }
    
    // Insert default data for common vehicles if tables are empty
    $defaultVehicles = [
        ["sedan", "Sedan", 4200, 14, 250, 700],
        ["ertiga", "Ertiga", 5400, 18, 250, 1000],
        ["innova", "Innova", 6000, 20, 250, 1000],
        ["innova_crysta", "Innova Crysta", 6500, 22, 300, 1200],
        ["tempo", "Tempo Traveller", 9000, 22, 300, 1500],
        ["luxury", "Luxury Sedan", 7500, 25, 350, 1500]
    ];
    
    if ($conn instanceof mysqli) {
        // Check if outstation_fares table is empty
        $result = $conn->query("SELECT COUNT(*) as count FROM outstation_fares");
        $row = $result->fetch_assoc();
        if ($row['count'] == 0) {
            // Insert default vehicles
            $stmt = $conn->prepare("INSERT INTO outstation_fares (vehicle_id, base_price, price_per_km, driver_allowance, night_halt_charge) VALUES (?, ?, ?, ?, ?)");
            foreach ($defaultVehicles as $vehicle) {
                $stmt->bind_param("sdddd", $vehicle[0], $vehicle[2], $vehicle[3], $vehicle[4], $vehicle[5]);
                $stmt->execute();
            }
            error_log("Inserted default vehicles into outstation_fares", 3, "$logsDir/db-init.log");
        }
        
        // Check if vehicle_pricing table is empty
        $result = $conn->query("SELECT COUNT(*) as count FROM vehicle_pricing");
        $row = $result->fetch_assoc();
        if ($row['count'] == 0) {
            // Insert default vehicles
            $stmt = $conn->prepare("INSERT INTO vehicle_pricing (vehicle_type, base_price, price_per_km, driver_allowance, night_halt_charge) VALUES (?, ?, ?, ?, ?)");
            foreach ($defaultVehicles as $vehicle) {
                $stmt->bind_param("sdddd", $vehicle[0], $vehicle[2], $vehicle[3], $vehicle[4], $vehicle[5]);
                $stmt->execute();
            }
            error_log("Inserted default vehicles into vehicle_pricing", 3, "$logsDir/db-init.log");
        }
    } else if ($conn instanceof PDO) {
        // Check if outstation_fares table is empty
        $stmt = $conn->query("SELECT COUNT(*) as count FROM outstation_fares");
        $count = $stmt->fetchColumn();
        if ($count == 0) {
            // Insert default vehicles
            $stmt = $conn->prepare("INSERT INTO outstation_fares (vehicle_id, base_price, price_per_km, driver_allowance, night_halt_charge) VALUES (?, ?, ?, ?, ?)");
            foreach ($defaultVehicles as $vehicle) {
                $stmt->execute([$vehicle[0], $vehicle[2], $vehicle[3], $vehicle[4], $vehicle[5]]);
            }
            error_log("Inserted default vehicles into outstation_fares (PDO)", 3, "$logsDir/db-init.log");
        }
        
        // Check if vehicle_pricing table is empty
        $stmt = $conn->query("SELECT COUNT(*) as count FROM vehicle_pricing");
        $count = $stmt->fetchColumn();
        if ($count == 0) {
            // Insert default vehicles
            $stmt = $conn->prepare("INSERT INTO vehicle_pricing (vehicle_type, base_price, price_per_km, driver_allowance, night_halt_charge) VALUES (?, ?, ?, ?, ?)");
            foreach ($defaultVehicles as $vehicle) {
                $stmt->execute([$vehicle[0], $vehicle[2], $vehicle[3], $vehicle[4], $vehicle[5]]);
            }
            error_log("Inserted default vehicles into vehicle_pricing (PDO)", 3, "$logsDir/db-init.log");
        }
    }
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'message' => 'Database initialized successfully',
        'tables_created' => $tablesCreated,
        'tables_with_errors' => $tableErrors,
        'timestamp' => time()
    ]);
    
} catch (Exception $e) {
    error_log("Error initializing database: " . $e->getMessage(), 3, "$logsDir/db-init.log");
    
    echo json_encode([
        'status' => 'error',
        'message' => 'An error occurred during database initialization: ' . $e->getMessage(),
        'timestamp' => time()
    ]);
}
