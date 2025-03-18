
<?php
require_once '../../config.php';

// Allow only GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(['error' => 'Method not allowed'], 405);
}

// Connect to database
$conn = getDbConnection();

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
    sendJsonResponse(['error' => 'Database query failed: ' . $conn->error], 500);
    exit;
}

$vehicles = [];
while ($row = $result->fetch_assoc()) {
    // Format data with camelCase keys for frontend consistency
    $vehicle = [
        'id' => $row['vehicle_id'],
        'name' => $row['name'],
        'capacity' => (int)$row['capacity'],
        'luggageCapacity' => (int)$row['luggage_capacity'],
        'basePrice' => (float)$row['base_price'],
        'pricePerKm' => (float)$row['price_per_km'],
        'image' => $row['image'],
        'amenities' => $row['amenities'] ? explode(', ', $row['amenities']) : [],
        'description' => $row['description'],
        'ac' => (bool)$row['ac'],
        'nightHaltCharge' => (float)$row['night_halt_charge'],
        'driverAllowance' => (float)$row['driver_allowance'],
        // Also include the original field names for backward compatibility
        'price' => (float)$row['base_price'],
        'vehicleType' => $row['vehicle_id']
    ];
    
    $vehicles[] = $vehicle;
}

// Send response
sendJsonResponse($vehicles);
