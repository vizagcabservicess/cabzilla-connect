
<?php
/**
 * Fix Database API
 * 
 * This endpoint tests the database connection and attempts to repair/create
 * necessary tables for airport fares.
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Admin-Mode, X-Debug, X-Force-Creation');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include database connection
require_once dirname(__FILE__) . '/../../config.php';

// Log file setup
$logDir = dirname(__FILE__) . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}
$logFile = $logDir . '/fix_database_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

file_put_contents($logFile, "[$timestamp] Fix database request received\n", FILE_APPEND);

try {
    // Connect to database
    $conn = getDbConnection();
    
    // Test connection
    if (!$conn) {
        throw new Exception("Failed to connect to database");
    }
    
    file_put_contents($logFile, "[$timestamp] Successfully connected to database\n", FILE_APPEND);
    
    // Check if the airport_transfer_fares table exists
    $tableResult = $conn->query("SHOW TABLES LIKE 'airport_transfer_fares'");
    $tableExists = $tableResult && $tableResult->num_rows > 0;
    
    // Create the table if it doesn't exist
    if (!$tableExists) {
        $createTableQuery = "
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
        
        if (!$conn->query($createTableQuery)) {
            throw new Exception("Failed to create airport_transfer_fares table: " . $conn->error);
        }
        
        file_put_contents($logFile, "[$timestamp] Created airport_transfer_fares table\n", FILE_APPEND);
    } else {
        file_put_contents($logFile, "[$timestamp] Airport_transfer_fares table already exists\n", FILE_APPEND);
    }
    
    // Check if required columns exist and add them if they don't
    $columnsResult = $conn->query("SHOW COLUMNS FROM airport_transfer_fares LIKE 'night_charges'");
    if ($columnsResult && $columnsResult->num_rows === 0) {
        $conn->query("ALTER TABLE airport_transfer_fares ADD COLUMN night_charges DECIMAL(10,2) DEFAULT 0");
        file_put_contents($logFile, "[$timestamp] Added night_charges column\n", FILE_APPEND);
    }
    
    $columnsResult = $conn->query("SHOW COLUMNS FROM airport_transfer_fares LIKE 'extra_waiting_charges'");
    if ($columnsResult && $columnsResult->num_rows === 0) {
        $conn->query("ALTER TABLE airport_transfer_fares ADD COLUMN extra_waiting_charges DECIMAL(10,2) DEFAULT 0");
        file_put_contents($logFile, "[$timestamp] Added extra_waiting_charges column\n", FILE_APPEND);
    }
    
    // Get all vehicles
    $vehicles = [];
    $vehiclesResult = $conn->query("SELECT id, vehicle_id, name FROM vehicles ORDER BY name LIMIT 100");
    
    if ($vehiclesResult) {
        while ($vehicle = $vehiclesResult->fetch_assoc()) {
            $vehicleId = $vehicle['vehicle_id'] ?? $vehicle['id'];
            
            // Ensure vehicle has an entry in airport_transfer_fares
            $checkQuery = "SELECT id FROM airport_transfer_fares WHERE vehicle_id = ?";
            $checkStmt = $conn->prepare($checkQuery);
            $checkStmt->bind_param("s", $vehicleId);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            
            if ($checkResult->num_rows === 0) {
                // Create default entry
                $insertQuery = "INSERT INTO airport_transfer_fares 
                    (vehicle_id, base_price, price_per_km, pickup_price, drop_price, tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge)
                    VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0, 0)";
                $insertStmt = $conn->prepare($insertQuery);
                $insertStmt->bind_param("s", $vehicleId);
                $insertStmt->execute();
                
                file_put_contents($logFile, "[$timestamp] Created default airport fare for vehicle $vehicleId\n", FILE_APPEND);
            }
            
            $vehicles[] = [
                'id' => $vehicleId,
                'name' => $vehicle['name']
            ];
        }
    }
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'message' => 'Database check and repair completed successfully',
        'tables' => [
            'airport_transfer_fares' => $tableExists ? 'exists' : 'created'
        ],
        'vehicles' => $vehicles,
        'timestamp' => time()
    ]);
    
    file_put_contents($logFile, "[$timestamp] Database fix completed successfully\n", FILE_APPEND);
    
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
