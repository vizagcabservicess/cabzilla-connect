
<?php
/**
 * Direct Airport Fares API
 * Fetches airport transfer fares for a specific vehicle or all vehicles
 */

// Clear any existing output buffers to prevent contamination
while (ob_get_level()) {
    ob_end_clean();
}

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode, X-Debug');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/direct_airport_fares_admin_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// Include database utilities
require_once __DIR__ . '/../utils/database.php';
require_once __DIR__ . '/../utils/response.php';

try {
    file_put_contents($logFile, "[$timestamp] Request started for direct airport fares\n", FILE_APPEND);
    file_put_contents($logFile, "[$timestamp] GET params: " . json_encode($_GET) . "\n", FILE_APPEND);
    file_put_contents($logFile, "[$timestamp] Headers: " . json_encode(getallheaders()) . "\n", FILE_APPEND);
    
    // Get database connection
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    
    // Get vehicle ID if provided
    $vehicleId = null;
    $possibleKeys = ['vehicleId', 'vehicle_id', 'vehicle-id', 'id'];
    
    foreach ($possibleKeys as $key) {
        if (isset($_GET[$key]) && !empty($_GET[$key])) {
            $vehicleId = $_GET[$key];
            file_put_contents($logFile, "[$timestamp] Found vehicle ID in parameter $key: $vehicleId\n", FILE_APPEND);
            break;
        }
    }
    
    // Execute the appropriate query based on whether we have a vehicle ID
    if ($vehicleId) {
        file_put_contents($logFile, "[$timestamp] Querying for specific vehicle: $vehicleId\n", FILE_APPEND);
        
        // Query for a specific vehicle
        $query = "SELECT * FROM airport_transfer_fares WHERE vehicle_id = ?";
        $stmt = $conn->prepare($query);
        
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }
        
        $stmt->bind_param("s", $vehicleId);
        
        if (!$stmt->execute()) {
            throw new Exception("Execute failed: " . $stmt->error);
        }
        
        $result = $stmt->get_result();
        $fares = [];
        
        while ($row = $result->fetch_assoc()) {
            // Normalize field names to camelCase for frontend
            $fares[] = [
                'id' => $row['id'],
                'vehicleId' => $row['vehicle_id'],
                'vehicle_id' => $row['vehicle_id'],
                'basePrice' => (float)$row['base_price'],
                'pricePerKm' => (float)$row['price_per_km'],
                'pickupPrice' => (float)$row['pickup_price'],
                'dropPrice' => (float)$row['drop_price'],
                'tier1Price' => (float)$row['tier1_price'],
                'tier2Price' => (float)$row['tier2_price'],
                'tier3Price' => (float)$row['tier3_price'],
                'tier4Price' => (float)$row['tier4_price'],
                'extraKmCharge' => (float)$row['extra_km_charge'],
            ];
        }
        
        if (count($fares) === 0) {
            // If no fare found for this vehicle, create a default structure
            file_put_contents($logFile, "[$timestamp] No fare found for vehicle $vehicleId, creating default\n", FILE_APPEND);
            
            $fares[] = [
                'vehicleId' => $vehicleId,
                'vehicle_id' => $vehicleId,
                'basePrice' => 0,
                'pricePerKm' => 0,
                'pickupPrice' => 0,
                'dropPrice' => 0,
                'tier1Price' => 0,
                'tier2Price' => 0,
                'tier3Price' => 0,
                'tier4Price' => 0,
                'extraKmCharge' => 0,
            ];
        }
        
        // Send the response
        sendSuccessResponse(['fares' => $fares], 'Airport fares retrieved successfully');
        
    } else {
        file_put_contents($logFile, "[$timestamp] Querying for all vehicles\n", FILE_APPEND);
        
        // Query for all vehicles
        $query = "SELECT * FROM airport_transfer_fares";
        $result = $conn->query($query);
        
        if (!$result) {
            throw new Exception("Query failed: " . $conn->error);
        }
        
        $fares = [];
        
        while ($row = $result->fetch_assoc()) {
            // Normalize field names to camelCase for frontend
            $fares[] = [
                'id' => $row['id'],
                'vehicleId' => $row['vehicle_id'],
                'vehicle_id' => $row['vehicle_id'],
                'basePrice' => (float)$row['base_price'],
                'pricePerKm' => (float)$row['price_per_km'],
                'pickupPrice' => (float)$row['pickup_price'],
                'dropPrice' => (float)$row['drop_price'],
                'tier1Price' => (float)$row['tier1_price'],
                'tier2Price' => (float)$row['tier2_price'],
                'tier3Price' => (float)$row['tier3_price'],
                'tier4Price' => (float)$row['tier4_price'],
                'extraKmCharge' => (float)$row['extra_km_charge'],
            ];
        }
        
        // Send the response
        sendSuccessResponse(['fares' => $fares], 'Airport fares retrieved successfully');
    }
    
} catch (Exception $e) {
    file_put_contents($logFile, "[$timestamp] Error: " . $e->getMessage() . "\n", FILE_APPEND);
    sendErrorResponse($e->getMessage());
}
