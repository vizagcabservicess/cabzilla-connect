
<?php
// Mock PHP file for direct-local-fares.php
// Note: This file won't actually be executed in the Lovable preview environment,
// but it helps document the expected API structure and responses.

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Content-Type: application/json');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get vehicle ID from query string
$vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null;

// If vehicle ID is not in query string, check for it in JSON body for POST requests
if (!$vehicleId && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $vehicleId = isset($data['vehicleId']) ? $data['vehicleId'] : (isset($data['vehicle_id']) ? $data['vehicle_id'] : null);
}

// If vehicle ID is not in JSON body, check POST data
if (!$vehicleId && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $vehicleId = isset($_POST['vehicleId']) ? $_POST['vehicleId'] : (isset($_POST['vehicle_id']) ? $_POST['vehicle_id'] : null);
}

// If still no vehicleId, set a default for the mock data
if (!$vehicleId) {
    $vehicleId = 'sedan';
}

// Sample fare data based on vehicle type - using dynamic calculation instead of hardcoded values
$localFares = [];

// Normalize vehicle ID for consistency
$normalizedVehicleId = strtolower($vehicleId);

// Base price values that will be used for calculations
$baseValue = 1000;

// Helper function to calculate package prices based on vehicle category
function calculateDynamicPrices($baseValue, $multiplier) {
    return [
        'price4hrs40km' => round($baseValue * $multiplier * 1.2),
        'price8hrs80km' => round($baseValue * $multiplier * 2.0),
        'price10hrs100km' => round($baseValue * $multiplier * 2.5),
        'priceExtraKm' => round($baseValue * $multiplier * 0.012),
        'priceExtraHour' => round($baseValue * $multiplier * 0.1)
    ];
}

// Determine vehicle category and apply appropriate multiplier
$vehicleCategory = 'standard';
$multiplier = 1.0;

if (strpos($normalizedVehicleId, 'sedan') !== false || 
    strpos($normalizedVehicleId, 'swift') !== false || 
    strpos($normalizedVehicleId, 'dzire') !== false ||
    strpos($normalizedVehicleId, 'amaze') !== false ||
    strpos($normalizedVehicleId, 'etios') !== false) {
    $vehicleCategory = 'sedan';
    $multiplier = 1.0;
} else if (strpos($normalizedVehicleId, 'ertiga') !== false || 
    strpos($normalizedVehicleId, 'suv') !== false) {
    $vehicleCategory = 'suv';
    $multiplier = 1.25;
} else if (strpos($normalizedVehicleId, 'innova') !== false) {
    $vehicleCategory = 'mpv';
    if (strpos($normalizedVehicleId, 'hycross') !== false) {
        $multiplier = 1.6;
    } else {
        $multiplier = 1.5;
    }
} else if (strpos($normalizedVehicleId, 'tempo') !== false || 
    strpos($normalizedVehicleId, 'traveller') !== false) {
    $vehicleCategory = 'tempo';
    $multiplier = 2.0;
} else {
    // Default - use standard sedan pricing
    $vehicleCategory = 'other';
    $multiplier = 1.0;
}

// Calculate prices dynamically
$prices = calculateDynamicPrices($baseValue, $multiplier);

// Create the response object
$localFares[] = [
    'vehicleId' => $vehicleId,
    'vehicleCategory' => $vehicleCategory,
    'price4hrs40km' => $prices['price4hrs40km'],
    'price8hrs80km' => $prices['price8hrs80km'],
    'price10hrs100km' => $prices['price10hrs100km'],
    'priceExtraKm' => $prices['priceExtraKm'],
    'priceExtraHour' => $prices['priceExtraHour']
];

// Return JSON response
echo json_encode([
    'status' => 'success',
    'message' => 'Local fares retrieved successfully',
    'fares' => $localFares,
    'dynamicallyGenerated' => true,
    'timestamp' => time()
]);
