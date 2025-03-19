
<?php
require_once '../../config.php';

// Allow CORS for all domains
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Respond to preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log the request for debugging
logError("vehicles-data.php request", ['method' => $_SERVER['REQUEST_METHOD'], 'request' => $_SERVER]);

// Allow only GET requests for this endpoint
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(['error' => 'Method not allowed'], 405);
    exit;
}

// Connect to database
$conn = getDbConnection();

if (!$conn) {
    logError("Database connection failed", ['error' => mysqli_connect_error()]);
    sendJsonResponse(['error' => 'Database connection failed: ' . mysqli_connect_error()], 500);
    exit;
}

try {
    // Get all vehicle data (including types and pricing)
    $query = "
        SELECT 
            vt.*, 
            vp.base_price, 
            vp.price_per_km, 
            vp.night_halt_charge, 
            vp.driver_allowance
        FROM 
            vehicle_types vt
        LEFT JOIN 
            vehicle_pricing vp ON vt.vehicle_id = vp.vehicle_type
        WHERE
            vt.is_active = 1
        ORDER BY 
            vt.name
    ";

    $result = $conn->query($query);

    if (!$result) {
        logError("Database query failed", ['error' => $conn->error]);
        throw new Exception("Database query failed: " . $conn->error);
    }

    $vehicles = [];
    while ($row = $result->fetch_assoc()) {
        // Parse amenities
        $amenities = [];
        if (!empty($row['amenities'])) {
            $decoded = json_decode($row['amenities'], true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $amenities = $decoded;
            } else {
                $amenities = array_map('trim', explode(',', $row['amenities']));
            }
        }
        
        // Format data with camelCase keys for frontend consistency
        $vehicle = [
            'id' => $row['vehicle_id'],
            'name' => $row['name'],
            'capacity' => intval($row['capacity']),
            'luggageCapacity' => intval($row['luggage_capacity']),
            'basePrice' => floatval($row['base_price'] ?? 0),
            'pricePerKm' => floatval($row['price_per_km'] ?? 0),
            'image' => $row['image'],
            'amenities' => $amenities,
            'description' => $row['description'],
            'ac' => (bool)$row['ac'],
            'nightHaltCharge' => floatval($row['night_halt_charge'] ?? 0),
            'driverAllowance' => floatval($row['driver_allowance'] ?? 0),
            // Also include the original field names for backward compatibility
            'price' => floatval($row['base_price'] ?? 0),
            'vehicleType' => $row['vehicle_id']
        ];
        
        $vehicles[] = $vehicle;
    }

    // Log success
    logError("Vehicles data response success", ['count' => count($vehicles)]);
    
    // Send response
    sendJsonResponse($vehicles);
} catch (Exception $e) {
    logError("Error fetching vehicle data", ['error' => $e->getMessage()]);
    sendJsonResponse(['error' => 'Failed to fetch vehicle data: ' . $e->getMessage()], 500);
}

// Helper function to send JSON responses
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}
