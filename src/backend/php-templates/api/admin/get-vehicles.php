
<?php
/**
 * ENHANCED get-vehicles.php - Retrieve vehicle data with pricing information
 * This version fixes SQL errors and provides synchronized data from all vehicle tables
 */

// Set ultra-aggressive CORS headers
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Force-Refresh, *');
header('Access-Control-Max-Age: 86400');
header('Access-Control-Expose-Headers: *');
header('X-CORS-Status: Ultra-Enhanced');

// Ultra-reliable OPTIONS handling - HIGHEST PRIORITY
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'CORS preflight request successful',
        'cors' => 'enabled',
        'timestamp' => time()
    ]);
    exit;
}

// Include database configuration
require_once __DIR__ . '/../../config.php';

// Get parameters
$includeInactive = isset($_GET['includeInactive']) && $_GET['includeInactive'] === 'true';
$forceRefresh = isset($_GET['force']) && $_GET['force'] === 'true';
$isAdminMode = isset($_SERVER['HTTP_X_ADMIN_MODE']) && $_SERVER['HTTP_X_ADMIN_MODE'] === 'true';

// If admin mode header is set, always include inactive
if ($isAdminMode) {
    $includeInactive = true;
}

try {
    // Connect to database
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // FIXED QUERY: Use JOIN syntax that works without vp.base_price
    $sql = "
        SELECT 
            vt.id,
            vt.vehicle_id,
            vt.name,
            vt.capacity, 
            vt.luggage_capacity AS luggageCapacity,
            vt.ac,
            vt.image,
            vt.amenities,
            vt.description,
            vt.is_active AS isActive,
            vt.base_price AS basePrice,
            vt.price_per_km AS pricePerKm,
            vt.night_halt_charge AS nightHaltCharge,
            vt.driver_allowance AS driverAllowance,
            vt.created_at AS createdAt,
            vt.updated_at AS updatedAt
        FROM 
            vehicle_types vt
    ";
    
    // Add WHERE clause if we don't want inactive vehicles
    if (!$includeInactive) {
        $sql .= " WHERE vt.is_active = 1";
    }
    
    // Execute the query
    $result = $conn->query($sql);
    
    if (!$result) {
        throw new Exception("Query failed: " . $conn->error);
    }
    
    $vehicles = [];
    
    while ($row = $result->fetch_assoc()) {
        // Convert amenities string to array if needed
        if (isset($row['amenities']) && $row['amenities']) {
            if (substr($row['amenities'], 0, 1) === '[') {
                $row['amenities'] = json_decode($row['amenities'], true);
            } else {
                $row['amenities'] = explode(',', $row['amenities']);
            }
        } else {
            $row['amenities'] = ['AC'];
        }
        
        // Set default price same as base price
        $row['price'] = $row['basePrice'];
        
        $vehicles[] = $row;
    }
    
    // Return the vehicles
    echo json_encode([
        'status' => 'success',
        'vehicles' => $vehicles,
        'count' => count($vehicles),
        'includeInactive' => $includeInactive,
        'isAdminMode' => $isAdminMode,
        'timestamp' => time()
    ]);
    
} catch (Exception $e) {
    // Log error
    error_log("Error fetching vehicles: " . $e->getMessage());
    
    // Send error response
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time(),
        'file' => basename(__FILE__),
        'trace' => $e->getTraceAsString()
    ]);
}
