
<?php
// Mock PHP file for get-vehicles.php
// Note: This file won't actually be executed in the Lovable preview environment,
// but it helps document the expected API structure and responses.

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check if we need to include inactive vehicles
$includeInactive = isset($_GET['includeInactive']) && ($_GET['includeInactive'] === 'true' || $_GET['includeInactive'] === '1');

// Hardcoded vehicle data for demonstration
$vehicles = [
    [
        'id' => 'sedan',
        'vehicleId' => 'sedan',
        'name' => 'Sedan',
        'capacity' => 4,
        'luggageCapacity' => 2,
        'price' => 2500,
        'basePrice' => 2500,
        'pricePerKm' => 14,
        'image' => '/cars/sedan.png',
        'amenities' => ['AC', 'Bottle Water', 'Music System'],
        'description' => 'Comfortable sedan suitable for 4 passengers.',
        'ac' => true,
        'nightHaltCharge' => 700,
        'driverAllowance' => 250,
        'isActive' => true,
        'inactiveDates' => []
    ],
    [
        'id' => 'ertiga',
        'vehicleId' => 'ertiga',
        'name' => 'Ertiga',
        'capacity' => 6,
        'luggageCapacity' => 3,
        'price' => 3200,
        'basePrice' => 3200,
        'pricePerKm' => 18,
        'image' => '/cars/ertiga.png',
        'amenities' => ['AC', 'Bottle Water', 'Music System', 'Extra Legroom'],
        'description' => 'Spacious SUV suitable for 6 passengers.',
        'ac' => true,
        'nightHaltCharge' => 1000,
        'driverAllowance' => 250,
        'isActive' => true,
        'inactiveDates' => []
    ],
    [
        'id' => 'innova_crysta',
        'vehicleId' => 'innova_crysta',
        'name' => 'Innova Crysta',
        'capacity' => 7,
        'luggageCapacity' => 4,
        'price' => 3800,
        'basePrice' => 3800,
        'pricePerKm' => 20,
        'image' => '/cars/innova.png',
        'amenities' => ['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point'],
        'description' => 'Premium SUV with ample space for 7 passengers.',
        'ac' => true,
        'nightHaltCharge' => 1000,
        'driverAllowance' => 250,
        'isActive' => true,
        'inactiveDates' => []
    ],
    [
        'id' => 'luxury',
        'vehicleId' => 'luxury',
        'name' => 'Luxury Sedan',
        'capacity' => 4,
        'luggageCapacity' => 3,
        'price' => 4500,
        'basePrice' => 4500,
        'pricePerKm' => 25,
        'image' => '/cars/luxury.png',
        'amenities' => ['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point', 'Premium Amenities'],
        'description' => 'Premium luxury sedan with high-end amenities for a comfortable journey.',
        'ac' => true,
        'nightHaltCharge' => 1200,
        'driverAllowance' => 300,
        'isActive' => true,
        'inactiveDates' => []
    ],
    [
        'id' => 'tempo_traveller',
        'vehicleId' => 'tempo_traveller',
        'name' => 'Tempo Traveller',
        'capacity' => 17,
        'luggageCapacity' => 8,
        'price' => 10500,
        'basePrice' => 10500,
        'pricePerKm' => 35,
        'image' => '/cars/tempo.png',
        'amenities' => ['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point', 'Pushback Seats'],
        'description' => 'Large mini bus suitable for groups of up to 17 passengers.',
        'ac' => true,
        'nightHaltCharge' => 1200,
        'driverAllowance' => 300,
        'isActive' => true,
        'inactiveDates' => []
    ]
];

// Filter inactive vehicles if needed
if (!$includeInactive) {
    $vehicles = array_filter($vehicles, function($vehicle) {
        return $vehicle['isActive'] === true;
    });
    $vehicles = array_values($vehicles); // Re-index array
}

// Return JSON response
echo json_encode([
    'status' => 'success',
    'message' => 'Vehicles retrieved successfully',
    'vehicles' => $vehicles
]);
