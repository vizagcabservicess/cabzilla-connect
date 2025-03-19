
<?php
require_once '../../config.php';

// Allow CORS for all domains
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Force-Refresh');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Add timestamp for cache-busting
header('X-Response-Time: ' . time());

// Respond to preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log the request for debugging
logError("vehicles-data.php request", ['method' => $_SERVER['REQUEST_METHOD'], 'timestamp' => time(), 'headers' => getallheaders()]);

// Allow only GET requests for this endpoint
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    echo json_encode(['error' => 'Method not allowed']);
    http_response_code(405);
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
    logError("vehicles-data.php includeInactive", ['includeInactive' => $includeInactive, 'timestamp' => time()]);
    
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

    logError("vehicles-data.php query", ['query' => $query, 'timestamp' => time()]);
    
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
            'vehicleType' => (string)$row['vehicle_id'], // Ensure string type
            'vehicleId' => (string)$row['vehicle_id'] // Add for form consistency
        ];
        
        // Only add active vehicles for non-admin requests
        if ($includeInactive || $vehicle['isActive']) {
            $vehicles[] = $vehicle;
        }
    }

    // If no vehicles found in database, return hardcoded defaults
    if (empty($vehicles)) {
        $vehicles = [
            [
                'id' => 'sedan',
                'name' => 'Sedan',
                'capacity' => 4,
                'luggageCapacity' => 2,
                'price' => 4200,
                'basePrice' => 4200,
                'pricePerKm' => 14,
                'image' => '/cars/sedan.png',
                'amenities' => ['AC', 'Bottle Water', 'Music System'],
                'description' => 'Comfortable sedan suitable for 4 passengers.',
                'ac' => true,
                'nightHaltCharge' => 700,
                'driverAllowance' => 250,
                'isActive' => true,
                'vehicleId' => 'sedan',
                'vehicleType' => 'sedan'
            ],
            [
                'id' => 'ertiga',
                'name' => 'Ertiga',
                'capacity' => 6,
                'luggageCapacity' => 3,
                'price' => 5400,
                'basePrice' => 5400,
                'pricePerKm' => 18,
                'image' => '/cars/ertiga.png',
                'amenities' => ['AC', 'Bottle Water', 'Music System', 'Extra Legroom'],
                'description' => 'Spacious SUV suitable for 6 passengers.',
                'ac' => true,
                'nightHaltCharge' => 1000,
                'driverAllowance' => 250,
                'isActive' => true,
                'vehicleId' => 'ertiga',
                'vehicleType' => 'ertiga'
            ],
            [
                'id' => 'innova_crysta',
                'name' => 'Innova Crysta',
                'capacity' => 7,
                'luggageCapacity' => 4,
                'price' => 6000,
                'basePrice' => 6000,
                'pricePerKm' => 20,
                'image' => '/cars/innova.png',
                'amenities' => ['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point'],
                'description' => 'Premium SUV with ample space for 7 passengers.',
                'ac' => true,
                'nightHaltCharge' => 1000,
                'driverAllowance' => 250,
                'isActive' => true,
                'vehicleId' => 'innova_crysta',
                'vehicleType' => 'innova_crysta'
            ]
        ];
        
        logError("No vehicles found in database, using default vehicles", ['count' => count($vehicles)]);
    }

    // Log success with safe data to avoid memory issues
    logError("Vehicles data response success", [
        'count' => count($vehicles), 
        'activeFilter' => !$includeInactive, 
        'timestamp' => time()
    ]);
    
    // Send response with explicit content type and cache headers
    header('Content-Type: application/json');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    echo json_encode($vehicles);
    exit;
    
} catch (Exception $e) {
    logError("Error fetching vehicle data", ['error' => $e->getMessage(), 'timestamp' => time()]);
    
    // Return error response
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Failed to fetch vehicle data: ' . $e->getMessage()]);
    http_response_code(500);
    exit;
}
