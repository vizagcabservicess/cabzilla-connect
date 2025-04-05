
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

// Log the fix attempt
$logFile = __DIR__ . '/../../logs/database_fix_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Create log directory if it doesn't exist
if (!file_exists(dirname($logFile))) {
    mkdir(dirname($logFile), 0777, true);
}

file_put_contents($logFile, "[$timestamp] Fix database attempt started\n", FILE_APPEND);

try {
    // Connect to database - using direct credentials to ensure connection
    $host = 'localhost';
    $dbname = 'u644605165_db_be';
    $username = 'u644605165_usr_be';
    $password = 'Vizag@1213';
    
    $conn = new mysqli($host, $username, $password, $dbname);
    
    if ($conn->connect_error) {
        throw new Exception("Failed to connect to database: " . $conn->connect_error);
    }
    
    // Log successful connection
    file_put_contents($logFile, "[$timestamp] Successfully connected to database\n", FILE_APPEND);
    
    // Check if vehicles table exists
    $tablesResult = $conn->query("SHOW TABLES LIKE 'vehicles'");
    $vehiclesTableExists = ($tablesResult && $tablesResult->num_rows > 0);
    
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
    }
    
    // Check for airport_transfer_fares table and create/fix if needed
    $airportTableResult = $conn->query("SHOW TABLES LIKE 'airport_transfer_fares'");
    $airportTableExists = ($airportTableResult && $airportTableResult->num_rows > 0);
    
    if (!$airportTableExists) {
        $createAirportTable = "
            CREATE TABLE IF NOT EXISTS airport_transfer_fares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_per_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                pickup_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                drop_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                tier1_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                tier2_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                tier3_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                tier4_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                extra_km_charge DECIMAL(5,2) NOT NULL DEFAULT 0,
                night_charges DECIMAL(10,2) DEFAULT 0,
                extra_waiting_charges DECIMAL(10,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        
        if ($conn->query($createAirportTable)) {
            $fixed[] = "Created airport_transfer_fares table";
            file_put_contents($logFile, "[$timestamp] Successfully created airport_transfer_fares table\n", FILE_APPEND);
        } else {
            throw new Exception("Failed to create airport_transfer_fares table: " . $conn->error);
        }
    } else {
        // Check if columns night_charges and extra_waiting_charges exist
        $columnsResult = $conn->query("SHOW COLUMNS FROM airport_transfer_fares LIKE 'night_charges'");
        $nightChargesExists = ($columnsResult && $columnsResult->num_rows > 0);
        
        if (!$nightChargesExists) {
            if ($conn->query("ALTER TABLE airport_transfer_fares ADD COLUMN night_charges DECIMAL(10,2) DEFAULT 0")) {
                $fixed[] = "Added night_charges column to airport_transfer_fares";
            }
        }
        
        $columnsResult = $conn->query("SHOW COLUMNS FROM airport_transfer_fares LIKE 'extra_waiting_charges'");
        $waitingChargesExists = ($columnsResult && $columnsResult->num_rows > 0);
        
        if (!$waitingChargesExists) {
            if ($conn->query("ALTER TABLE airport_transfer_fares ADD COLUMN extra_waiting_charges DECIMAL(10,2) DEFAULT 0")) {
                $fixed[] = "Added extra_waiting_charges column to airport_transfer_fares";
            }
        }
    }
    
    // Check for local_package_fares table and create/fix if needed
    $localTableResult = $conn->query("SHOW TABLES LIKE 'local_package_fares'");
    $localTableExists = ($localTableResult && $localTableResult->num_rows > 0);
    
    if (!$localTableExists) {
        $createLocalTable = "
            CREATE TABLE IF NOT EXISTS local_package_fares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id VARCHAR(50) NOT NULL,
                price_4hrs_40km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_8hrs_80km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_10hrs_100km DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_extra_km DECIMAL(5,2) NOT NULL DEFAULT 0,
                price_extra_hour DECIMAL(5,2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY vehicle_id (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        
        if ($conn->query($createLocalTable)) {
            $fixed[] = "Created local_package_fares table";
        } else {
            throw new Exception("Failed to create local_package_fares table: " . $conn->error);
        }
    }
    
    // Check for vehicles in the database
    $vehiclesCountResult = $conn->query("SELECT COUNT(*) as count FROM vehicles");
    $vehiclesCount = 0;
    if ($vehiclesCountResult && $row = $vehiclesCountResult->fetch_assoc()) {
        $vehiclesCount = $row['count'];
    }
    
    file_put_contents($logFile, "[$timestamp] Found $vehiclesCount vehicles in database\n", FILE_APPEND);
    
    // Sync airport transfer fares with vehicles
    $airportSync = "INSERT IGNORE INTO airport_transfer_fares (vehicle_id, base_price, price_per_km, pickup_price, drop_price, 
                     tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge, night_charges, extra_waiting_charges)
                   SELECT 
                     vehicle_id, 
                     CASE 
                       WHEN vehicle_id LIKE '%sedan%' THEN 3000
                       WHEN vehicle_id LIKE '%ertiga%' THEN 3500
                       WHEN vehicle_id LIKE '%innova%' AND vehicle_id LIKE '%hycross%' THEN 4500
                       WHEN vehicle_id LIKE '%innova%' THEN 4000
                       WHEN vehicle_id LIKE '%crysta%' THEN 4000
                       WHEN vehicle_id LIKE '%tempo%' THEN 6000
                       WHEN vehicle_id LIKE '%luxury%' THEN 7000
                       ELSE 3000
                     END as base_price,
                     CASE 
                       WHEN vehicle_id LIKE '%sedan%' THEN 12
                       WHEN vehicle_id LIKE '%ertiga%' THEN 15
                       WHEN vehicle_id LIKE '%innova%' AND vehicle_id LIKE '%hycross%' THEN 18
                       WHEN vehicle_id LIKE '%innova%' THEN 17
                       WHEN vehicle_id LIKE '%crysta%' THEN 17
                       WHEN vehicle_id LIKE '%tempo%' THEN 19
                       WHEN vehicle_id LIKE '%luxury%' THEN 22
                       ELSE 14
                     END as price_per_km,
                     CASE 
                       WHEN vehicle_id LIKE '%sedan%' THEN 800
                       WHEN vehicle_id LIKE '%ertiga%' THEN 1000
                       WHEN vehicle_id LIKE '%innova%' THEN 1200
                       WHEN vehicle_id LIKE '%crysta%' THEN 1200
                       WHEN vehicle_id LIKE '%tempo%' THEN 2000
                       WHEN vehicle_id LIKE '%luxury%' THEN 2500
                       ELSE 1000
                     END as pickup_price,
                     CASE 
                       WHEN vehicle_id LIKE '%sedan%' THEN 800
                       WHEN vehicle_id LIKE '%ertiga%' THEN 1000
                       WHEN vehicle_id LIKE '%innova%' THEN 1200
                       WHEN vehicle_id LIKE '%crysta%' THEN 1200
                       WHEN vehicle_id LIKE '%tempo%' THEN 2000
                       WHEN vehicle_id LIKE '%luxury%' THEN 2500
                       ELSE 1000
                     END as drop_price,
                     CASE 
                       WHEN vehicle_id LIKE '%sedan%' THEN 600
                       WHEN vehicle_id LIKE '%ertiga%' THEN 800
                       WHEN vehicle_id LIKE '%innova%' THEN 1000
                       WHEN vehicle_id LIKE '%crysta%' THEN 1000
                       WHEN vehicle_id LIKE '%tempo%' THEN 1600
                       WHEN vehicle_id LIKE '%luxury%' THEN 2000
                       ELSE 800
                     END as tier1_price,
                     CASE 
                       WHEN vehicle_id LIKE '%sedan%' THEN 800
                       WHEN vehicle_id LIKE '%ertiga%' THEN 1000
                       WHEN vehicle_id LIKE '%innova%' THEN 1200
                       WHEN vehicle_id LIKE '%crysta%' THEN 1200
                       WHEN vehicle_id LIKE '%tempo%' THEN 1800
                       WHEN vehicle_id LIKE '%luxury%' THEN 2200
                       ELSE 1000
                     END as tier2_price,
                     CASE 
                       WHEN vehicle_id LIKE '%sedan%' THEN 1000
                       WHEN vehicle_id LIKE '%ertiga%' THEN 1200
                       WHEN vehicle_id LIKE '%innova%' THEN 1400
                       WHEN vehicle_id LIKE '%crysta%' THEN 1400
                       WHEN vehicle_id LIKE '%tempo%' THEN 2000
                       WHEN vehicle_id LIKE '%luxury%' THEN 2500
                       ELSE 1200
                     END as tier3_price,
                     CASE 
                       WHEN vehicle_id LIKE '%sedan%' THEN 1200
                       WHEN vehicle_id LIKE '%ertiga%' THEN 1400
                       WHEN vehicle_id LIKE '%innova%' THEN 1600
                       WHEN vehicle_id LIKE '%crysta%' THEN 1600
                       WHEN vehicle_id LIKE '%tempo%' THEN 2500
                       WHEN vehicle_id LIKE '%luxury%' THEN 3000
                       ELSE 1400
                     END as tier4_price,
                     CASE 
                       WHEN vehicle_id LIKE '%sedan%' THEN 12
                       WHEN vehicle_id LIKE '%ertiga%' THEN 15
                       WHEN vehicle_id LIKE '%innova%' AND vehicle_id LIKE '%hycross%' THEN 18
                       WHEN vehicle_id LIKE '%innova%' THEN 17
                       WHEN vehicle_id LIKE '%crysta%' THEN 17
                       WHEN vehicle_id LIKE '%tempo%' THEN 19
                       WHEN vehicle_id LIKE '%luxury%' THEN 22
                       ELSE 14
                     END as extra_km_charge,
                     CASE 
                       WHEN vehicle_id LIKE '%sedan%' THEN 250
                       WHEN vehicle_id LIKE '%ertiga%' THEN 300
                       WHEN vehicle_id LIKE '%innova%' THEN 350
                       WHEN vehicle_id LIKE '%crysta%' THEN 350
                       WHEN vehicle_id LIKE '%tempo%' THEN 400
                       WHEN vehicle_id LIKE '%luxury%' THEN 450
                       ELSE 300
                     END as night_charges,
                     CASE 
                       WHEN vehicle_id LIKE '%sedan%' THEN 150
                       WHEN vehicle_id LIKE '%ertiga%' THEN 200
                       WHEN vehicle_id LIKE '%innova%' THEN 250
                       WHEN vehicle_id LIKE '%crysta%' THEN 250
                       WHEN vehicle_id LIKE '%tempo%' THEN 300
                       WHEN vehicle_id LIKE '%luxury%' THEN 350
                       ELSE 200
                     END as extra_waiting_charges
                   FROM vehicles";
                   
    if ($conn->query($airportSync)) {
        $affectedRows = $conn->affected_rows;
        if ($affectedRows > 0) {
            $fixed[] = "Synced $affectedRows airport fares";
            file_put_contents($logFile, "[$timestamp] Synced $affectedRows airport fares\n", FILE_APPEND);
        }
    }
    
    // Sync local package fares with vehicles
    $localSync = "INSERT IGNORE INTO local_package_fares (vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour)
                SELECT 
                  vehicle_id, 
                  CASE 
                    WHEN vehicle_id LIKE '%sedan%' THEN 1800
                    WHEN vehicle_id LIKE '%ertiga%' THEN 2200
                    WHEN vehicle_id LIKE '%innova%' AND vehicle_id LIKE '%hycross%' THEN 3000
                    WHEN vehicle_id LIKE '%innova%' THEN 2600
                    WHEN vehicle_id LIKE '%crysta%' THEN 2600
                    WHEN vehicle_id LIKE '%tempo%' THEN 4500
                    WHEN vehicle_id LIKE '%luxury%' THEN 3500
                    ELSE 2000
                  END as price_4hrs_40km,
                  CASE 
                    WHEN vehicle_id LIKE '%sedan%' THEN 3000
                    WHEN vehicle_id LIKE '%ertiga%' THEN 3600
                    WHEN vehicle_id LIKE '%innova%' AND vehicle_id LIKE '%hycross%' THEN 4500
                    WHEN vehicle_id LIKE '%innova%' THEN 4200
                    WHEN vehicle_id LIKE '%crysta%' THEN 4200
                    WHEN vehicle_id LIKE '%tempo%' THEN 7000
                    WHEN vehicle_id LIKE '%luxury%' THEN 5500
                    ELSE 3200
                  END as price_8hrs_80km,
                  CASE 
                    WHEN vehicle_id LIKE '%sedan%' THEN 3600
                    WHEN vehicle_id LIKE '%ertiga%' THEN 4500
                    WHEN vehicle_id LIKE '%innova%' AND vehicle_id LIKE '%hycross%' THEN 5500
                    WHEN vehicle_id LIKE '%innova%' THEN 5200
                    WHEN vehicle_id LIKE '%crysta%' THEN 5200
                    WHEN vehicle_id LIKE '%tempo%' THEN 8500
                    WHEN vehicle_id LIKE '%luxury%' THEN 6500
                    ELSE 4000
                  END as price_10hrs_100km,
                  CASE 
                    WHEN vehicle_id LIKE '%sedan%' THEN 12
                    WHEN vehicle_id LIKE '%ertiga%' THEN 15
                    WHEN vehicle_id LIKE '%innova%' AND vehicle_id LIKE '%hycross%' THEN 18
                    WHEN vehicle_id LIKE '%innova%' THEN 18
                    WHEN vehicle_id LIKE '%crysta%' THEN 18
                    WHEN vehicle_id LIKE '%tempo%' THEN 22
                    WHEN vehicle_id LIKE '%luxury%' THEN 22
                    ELSE 14
                  END as price_extra_km,
                  CASE 
                    WHEN vehicle_id LIKE '%sedan%' THEN 200
                    WHEN vehicle_id LIKE '%ertiga%' THEN 250
                    WHEN vehicle_id LIKE '%innova%' THEN 300
                    WHEN vehicle_id LIKE '%crysta%' THEN 300
                    WHEN vehicle_id LIKE '%tempo%' THEN 400
                    WHEN vehicle_id LIKE '%luxury%' THEN 350
                    ELSE 250
                  END as price_extra_hour
                FROM vehicles";
                
    if ($conn->query($localSync)) {
        $affectedRows = $conn->affected_rows;
        if ($affectedRows > 0) {
            $fixed[] = "Synced $affectedRows local fares";
            file_put_contents($logFile, "[$timestamp] Synced $affectedRows local fares\n", FILE_APPEND);
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
    ]);
    
    file_put_contents($logFile, "[$timestamp] Fix database completed successfully\n", FILE_APPEND);
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] Error: " . $e->getMessage() . "\n", FILE_APPEND);
    
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ]);
}

