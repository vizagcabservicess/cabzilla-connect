
<?php
require_once '../../config.php';

// Allow CORS for all domains
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Respond to preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log the request for debugging
logError("vehicles-data.php request", ['method' => $_SERVER['REQUEST_METHOD']]);

// Allow only GET requests for this endpoint
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(['error' => 'Method not allowed'], 405);
    exit;
}

// Connect to database
try {
    $conn = getDbConnection();

    if (!$conn) {
        throw new Exception("Database connection failed: " . mysqli_connect_error());
    }

    // Check if we should include inactive vehicles (admin only)
    $includeInactive = isset($_GET['includeInactive']) && $_GET['includeInactive'] === 'true';
    
    // Debug log for includeInactive parameter
    logError("vehicles-data.php includeInactive", ['includeInactive' => $includeInactive]);
    
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
    ";
    
    // Only add the WHERE clause if we're not including inactive vehicles
    if (!$includeInactive) {
        $query .= " WHERE vt.is_active = 1";
    }
    
    $query .= " ORDER BY vt.name";

    logError("vehicles-data.php query", ['query' => $query]);
    
    $result = $conn->query($query);

    if (!$result) {
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
        
        // Ensure name is always a string, use vehicle_id as fallback
        $name = $row['name'] ?? '';
        if (empty($name) || $name === '0') {
            $name = "Vehicle ID: " . $row['vehicle_id'];
        }
        
        // Format data with camelCase keys for frontend consistency
        $vehicle = [
            'id' => (string)$row['vehicle_id'], // Ensure string type
            'name' => $name,
            'capacity' => intval($row['capacity'] ?? 0),
            'luggageCapacity' => intval($row['luggage_capacity'] ?? 0),
            'basePrice' => floatval($row['base_price'] ?? 0),
            'pricePerKm' => floatval($row['price_per_km'] ?? 0),
            'image' => $row['image'] ?? '',
            'amenities' => $amenities,
            'description' => $row['description'] ?? '',
            'ac' => (bool)($row['ac'] ?? 0),
            'isActive' => (bool)($row['is_active'] ?? 0),
            'nightHaltCharge' => floatval($row['night_halt_charge'] ?? 0),
            'driverAllowance' => floatval($row['driver_allowance'] ?? 0),
            // Also include the original field names for backward compatibility
            'price' => floatval($row['base_price'] ?? 0),
            'vehicleType' => (string)$row['vehicle_id'] // Ensure string type
        ];
        
        // Only add active vehicles for non-admin requests
        if ($includeInactive || $vehicle['isActive']) {
            $vehicles[] = $vehicle;
        }
    }

    // Log success with safe data to avoid memory issues
    logError("Vehicles data response success", ['count' => count($vehicles), 'activeFilter' => !$includeInactive]);
    
    // Send response with explicit content type
    header('Content-Type: application/json');
    echo json_encode($vehicles);
    exit;
    
} catch (Exception $e) {
    logError("Error fetching vehicle data", ['error' => $e->getMessage()]);
    sendJsonResponse(['error' => 'Failed to fetch vehicle data: ' . $e->getMessage()], 500);
}

// Helper function to send JSON responses (in case it's not defined in config.php)
if (!function_exists('sendJsonResponse')) {
    function sendJsonResponse($data, $statusCode = 200) {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }
}
