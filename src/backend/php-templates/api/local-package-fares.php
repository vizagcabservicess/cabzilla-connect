
<?php
// Mock PHP file for local-package-fares.php
// This serves as a direct API endpoint for package fares

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Content-Type: application/json');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get vehicle ID and package ID from query string
$vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null;
$packageId = isset($_GET['package_id']) ? $_GET['package_id'] : null;

// If params are not in query string, check for it in JSON body for POST requests
if ((!$vehicleId || !$packageId) && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $vehicleId = isset($data['vehicleId']) ? $data['vehicleId'] : (isset($data['vehicle_id']) ? $data['vehicle_id'] : $vehicleId);
    $packageId = isset($data['packageId']) ? $data['packageId'] : (isset($data['package_id']) ? $data['package_id'] : $packageId);
}

// Normalize the vehicle ID
function normalizeVehicleId($vehicleId) {
    // Convert to lowercase and replace spaces with underscores
    $result = strtolower(trim($vehicleId));
    $result = preg_replace('/[^a-z0-9_]/', '', str_replace(' ', '_', $result));
    
    // Handle common variations
    $mappings = [
        'innovahycross' => 'innova_hycross',
        'innovacrystal' => 'innova_crysta',
        'innovacrista' => 'innova_crysta',
        'innova_crista' => 'innova_crysta',
        'innovahicross' => 'innova_hycross',
        'innova_hicross' => 'innova_hycross',
        'tempotraveller' => 'tempo_traveller',
        'tempo_traveler' => 'tempo_traveller',
        'tempo' => 'tempo_traveller',
        'mpv' => 'innova_hycross'
    ];
    
    foreach ($mappings as $search => $replace) {
        if ($result === $search) {
            return $replace;
        }
    }
    
    return $result;
}

// Normalize the package ID
function normalizePackageId($packageId) {
    if (empty($packageId)) {
        return '8hrs-80km';
    }
    
    // Remove spaces and convert to lowercase
    $result = strtolower(trim($packageId));
    
    // Handle common variations
    $mappings = [
        '4hr_40km' => '4hrs-40km',
        '04hr_40km' => '4hrs-40km',
        '04hrs_40km' => '4hrs-40km',
        '4hrs_40km' => '4hrs-40km',
        '8hr_80km' => '8hrs-80km',
        '8hrs_80km' => '8hrs-80km', 
        '10hr_100km' => '10hrs-100km',
        '10hrs_100km' => '10hrs-100km'
    ];
    
    // Normalize to lowercase and replace underscores with hyphens
    $result = str_replace('_', '-', $result);
    
    foreach ($mappings as $search => $replace) {
        if (strtolower($result) === strtolower($search)) {
            return $replace;
        }
    }
    
    return $result;
}

// Normalize IDs for consistency
$normalizedVehicleId = normalizeVehicleId($vehicleId);
$normalizedPackageId = normalizePackageId($packageId);

// Vehicle-specific pricing table with consistent pricing
$packagePrices = [
    'sedan' => [
        '4hrs-40km' => 1400,
        '8hrs-80km' => 2400,
        '10hrs-100km' => 3000
    ],
    'ertiga' => [
        '4hrs-40km' => 1800,
        '8hrs-80km' => 3000,
        '10hrs-100km' => 3600
    ],
    'innova_crysta' => [
        '4hrs-40km' => 2400,
        '8hrs-80km' => 4000,
        '10hrs-100km' => 4800
    ],
    'innova_hycross' => [
        '4hrs-40km' => 2600,
        '8hrs-80km' => 4200,
        '10hrs-100km' => 5000
    ],
    'tempo_traveller' => [
        '4hrs-40km' => 3000,
        '8hrs-80km' => 5000,
        '10hrs-100km' => 6000
    ],
    'luxury' => [
        '4hrs-40km' => 2800,
        '8hrs-80km' => 4500,
        '10hrs-100km' => 5500
    ],
    'dzire_cng' => [
        '4hrs-40km' => 1400,
        '8hrs-80km' => 2400,
        '10hrs-100km' => 3000
    ]
];

// Default to sedan if the vehicle type is not found
if (!isset($packagePrices[$normalizedVehicleId])) {
    $normalizedVehicleId = 'sedan';
}

// Default to 8hrs-80km if the package is not found
if (!isset($packagePrices[$normalizedVehicleId][$normalizedPackageId])) {
    $normalizedPackageId = '8hrs-80km';
}

// Get the price for the vehicle and package
$price = $packagePrices[$normalizedVehicleId][$normalizedPackageId];

// Return the price as JSON
echo json_encode([
    'status' => 'success',
    'message' => 'Package price retrieved',
    'vehicle_id' => $normalizedVehicleId,
    'package_id' => $normalizedPackageId,
    'original_vehicle_id' => $vehicleId,
    'original_package_id' => $packageId,
    'price' => $price,
    'currency' => 'INR',
    'source' => 'local-package-fares'
]);
