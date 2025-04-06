
<?php
/**
 * Direct Airport Fares API
 * 
 * This API endpoint retrieves airport transfer fares for vehicles.
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

// Create log directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

// Include database connection
require_once dirname(__FILE__) . '/../../config.php';

// Check for vehicle ID in GET parameters
$vehicleId = isset($_GET['id']) ? $_GET['id'] : null;
$forceCreation = isset($_SERVER['HTTP_X_FORCE_CREATION']) && $_SERVER['HTTP_X_FORCE_CREATION'] === 'true';

// Log the request
$logFile = $logDir . '/direct_airport_fares_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');
file_put_contents($logFile, "[$timestamp] Direct airport fares request received" . ($vehicleId ? " for vehicle: $vehicleId" : " for all vehicles") . "\n", FILE_APPEND);

try {
    // Connect to database
    $conn = getDbConnection();
    
    // Check if the airport_transfer_fares table exists
    $tableResult = $conn->query("SHOW TABLES LIKE 'airport_transfer_fares'");
    $tableExists = $tableResult->num_rows > 0;
    
    // If table doesn't exist or force creation is requested, sync from vehicles
    if (!$tableExists || $forceCreation) {
        // Make an internal request to sync-airport-fares.php
        $syncUrl = 'http' . (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 's' : '') . 
                  '://' . $_SERVER['HTTP_HOST'] . 
                  str_replace(basename($_SERVER['PHP_SELF']), 'sync-airport-fares.php', $_SERVER['PHP_SELF']);
        
        $ch = curl_init($syncUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'X-Admin-Mode: true',
            'X-Force-Creation: true'
        ]);
        $syncResponse = curl_exec($ch);
        curl_close($ch);
        
        file_put_contents($logFile, "[$timestamp] Synced airport fares: $syncResponse\n", FILE_APPEND);
        
        // Reload the table data
        $tableResult = $conn->query("SHOW TABLES LIKE 'airport_transfer_fares'");
        $tableExists = $tableResult->num_rows > 0;
    }
    
    // If table still doesn't exist, create it
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
    }
    
    // Check if there are any records in the table
    $countQuery = "SELECT COUNT(*) as total FROM airport_transfer_fares";
    $countResult = $conn->query($countQuery);
    $count = $countResult->fetch_assoc()['total'];
    
    // If no records, try to sync from vehicles
    if ($count == 0) {
        // Make an internal request to sync-airport-fares.php
        $syncUrl = 'http' . (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 's' : '') . 
                  '://' . $_SERVER['HTTP_HOST'] . 
                  str_replace(basename($_SERVER['PHP_SELF']), 'sync-airport-fares.php', $_SERVER['PHP_SELF']);
        
        $ch = curl_init($syncUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'X-Admin-Mode: true',
            'X-Force-Creation: true'
        ]);
        $syncResponse = curl_exec($ch);
        curl_close($ch);
        
        file_put_contents($logFile, "[$timestamp] Auto-synced airport fares due to empty table: $syncResponse\n", FILE_APPEND);
    }
    
    // Prepare the query based on whether a specific vehicle ID was requested
    if ($vehicleId) {
        $query = "SELECT 
                    id, 
                    vehicle_id,
                    base_price,
                    price_per_km,
                    pickup_price,
                    drop_price,
                    tier1_price,
                    tier2_price,
                    tier3_price,
                    tier4_price,
                    extra_km_charge,
                    night_charges,
                    extra_waiting_charges,
                    created_at,
                    updated_at
                FROM 
                    airport_transfer_fares
                WHERE 
                    vehicle_id = ?";
        
        $stmt = $conn->prepare($query);
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            // If no record found for this vehicle, try to create it by syncing
            $syncUrl = 'http' . (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 's' : '') . 
                      '://' . $_SERVER['HTTP_HOST'] . 
                      str_replace(basename($_SERVER['PHP_SELF']), 'sync-airport-fares.php', $_SERVER['PHP_SELF']);
            
            $postData = json_encode(['vehicleId' => $vehicleId]);
            
            $ch = curl_init($syncUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'X-Admin-Mode: true',
                'X-Force-Creation: true'
            ]);
            $syncResponse = curl_exec($ch);
            curl_close($ch);
            
            file_put_contents($logFile, "[$timestamp] Created airport fare for vehicle $vehicleId: $syncResponse\n", FILE_APPEND);
            
            // Try to fetch again
            $stmt->execute();
            $result = $stmt->get_result();
        }
        
        $fare = $result->fetch_assoc();
        
        // Format the API response
        $response = [
            'status' => 'success',
            'fare' => $fare ? [
                'id' => $fare['id'],
                'vehicleId' => $fare['vehicle_id'],
                'vehicle_id' => $fare['vehicle_id'],
                'basePrice' => (float)$fare['base_price'],
                'pricePerKm' => (float)$fare['price_per_km'],
                'pickupPrice' => (float)$fare['pickup_price'],
                'dropPrice' => (float)$fare['drop_price'],
                'tier1Price' => (float)$fare['tier1_price'],
                'tier2Price' => (float)$fare['tier2_price'],
                'tier3Price' => (float)$fare['tier3_price'],
                'tier4Price' => (float)$fare['tier4_price'],
                'extraKmCharge' => (float)$fare['extra_km_charge'],
                'nightCharges' => (float)$fare['night_charges'],
                'extraWaitingCharges' => (float)$fare['extra_waiting_charges'],
                'createdAt' => $fare['created_at'],
                'updatedAt' => $fare['updated_at']
            ] : null,
            'timestamp' => time()
        ];
        
        if (!$fare) {
            $response['message'] = "No airport fare found for vehicle ID: $vehicleId";
        }
    } else {
        // Fetch all fares
        $query = "SELECT 
                    id, 
                    vehicle_id,
                    base_price,
                    price_per_km,
                    pickup_price,
                    drop_price,
                    tier1_price,
                    tier2_price,
                    tier3_price,
                    tier4_price,
                    extra_km_charge,
                    night_charges,
                    extra_waiting_charges,
                    created_at,
                    updated_at
                FROM 
                    airport_transfer_fares
                ORDER BY 
                    vehicle_id";
        
        $result = $conn->query($query);
        $fares = [];
        
        while ($fare = $result->fetch_assoc()) {
            $fares[] = [
                'id' => $fare['id'],
                'vehicleId' => $fare['vehicle_id'],
                'vehicle_id' => $fare['vehicle_id'],
                'basePrice' => (float)$fare['base_price'],
                'pricePerKm' => (float)$fare['price_per_km'],
                'pickupPrice' => (float)$fare['pickup_price'],
                'dropPrice' => (float)$fare['drop_price'],
                'tier1Price' => (float)$fare['tier1_price'],
                'tier2Price' => (float)$fare['tier2_price'],
                'tier3Price' => (float)$fare['tier3_price'],
                'tier4Price' => (float)$fare['tier4_price'],
                'extraKmCharge' => (float)$fare['extra_km_charge'],
                'nightCharges' => (float)$fare['night_charges'],
                'extraWaitingCharges' => (float)$fare['extra_waiting_charges'],
                'createdAt' => $fare['created_at'],
                'updatedAt' => $fare['updated_at']
            ];
        }
        
        // Format the API response
        $response = [
            'status' => 'success',
            'fares' => $fares,
            'count' => count($fares),
            'timestamp' => time()
        ];
    }
    
    echo json_encode($response);
    
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] Error: " . $e->getMessage() . "\n", FILE_APPEND);
    
    // Format the error response
    $response = [
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ];
    
    echo json_encode($response);
}

