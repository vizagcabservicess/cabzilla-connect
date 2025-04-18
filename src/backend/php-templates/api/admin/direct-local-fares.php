
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

// Include database utilities
require_once __DIR__ . '/../utils/database.php';

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

// If still no vehicleId, return error - NEVER default to any vehicle
if (!$vehicleId) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required',
        'timestamp' => time()
    ]);
    exit;
}

// Normalize the vehicle ID for comparison
function normalizeVehicleId($vehicleId) {
    // Convert to lowercase and replace spaces/special chars with underscores
    $normalized = strtolower(trim($vehicleId));
    $normalized = preg_replace('/[^a-z0-9_]/', '_', str_replace(' ', '_', $normalized));
    
    // Handle common vehicle name variations with an exact mapping table
    $exactMappings = [
        'innovahycross' => 'innova_hycross',
        'innovacrystal' => 'innova_crysta',
        'innovacrista' => 'innova_crysta',
        'innova_crista' => 'innova_crysta',
        'innovahicross' => 'innova_hycross',
        'innova_hicross' => 'innova_hycross',
        'tempotraveller' => 'tempo_traveller',
        'tempo_traveler' => 'tempo_traveller',
        'cng' => 'dzire_cng',
        'dzirecng' => 'dzire_cng',
        'sedancng' => 'dzire_cng',
        'swift' => 'sedan',
        'swiftdzire' => 'dzire',
        'swift_dzire' => 'dzire',
        'innovaold' => 'innova_crysta',
        'mpv' => 'innova_hycross',
        'bus' => 'urbania',
        'urbana' => 'urbania'
    ];
    
    // Return the mapped value if it exists
    if (isset($exactMappings[$normalized])) {
        return $exactMappings[$normalized];
    }
    
    return $normalized;
}

// Normalize vehicle ID for consistency
$normalizedVehicleId = normalizeVehicleId($vehicleId);

// Record the original request for debugging
$originalRequest = [
    'requestedVehicleId' => $vehicleId,
    'normalizedVehicleId' => $normalizedVehicleId,
    'timestamp' => time()
];

// Initialize empty fares array
$localFares = [];
$dbSuccess = false;

try {
    // Connect to database
    $conn = getDbConnection();
    
    if ($conn) {
        // FIXED: Use prepared statement with DIRECT equality match only, never LIKE
        $query = "SELECT * FROM local_package_fares WHERE vehicle_id = ? LIMIT 1";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("s", $normalizedVehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result && $result->num_rows > 0) {
            $row = $result->fetch_assoc();
            
            // CRITICAL: Verify that the fetched row actually matches our vehicle
            $fetchedVehicleId = normalizeVehicleId($row['vehicle_id'] ?? '');
            if ($fetchedVehicleId === $normalizedVehicleId) {
                $localFares[] = [
                    'vehicleId' => $vehicleId, // Return the original vehicle ID for client reference
                    'matchedWith' => $normalizedVehicleId,
                    'price4hrs40km' => (float)($row['price_4hrs_40km'] ?? $row['price_4hr_40km'] ?? 0),
                    'price8hrs80km' => (float)($row['price_8hrs_80km'] ?? $row['price_8hr_80km'] ?? 0),
                    'price10hrs100km' => (float)($row['price_10hrs_100km'] ?? $row['price_10hr_100km'] ?? 0),
                    'priceExtraKm' => (float)($row['price_extra_km'] ?? $row['extra_km_rate'] ?? 0),
                    'priceExtraHour' => (float)($row['price_extra_hour'] ?? $row['extra_hour_rate'] ?? 0),
                    'source' => 'database',
                    'timestamp' => time()
                ];
                $dbSuccess = true;
            } else {
                // Log mismatch for debugging
                error_log("Vehicle ID mismatch: requested {$normalizedVehicleId}, but found {$fetchedVehicleId}");
            }
        }
        
        // If no exact match was found for the normalized ID, try with special vehicle types
        if (!$dbSuccess) {
            // Special mapping for MPV/Innova Hycross
            if ($normalizedVehicleId === 'mpv' || strpos($normalizedVehicleId, 'hycross') !== false) {
                $specialIds = ['innova_hycross', 'innovahycross', 'mpv'];
                
                foreach ($specialIds as $specialId) {
                    $query = "SELECT * FROM local_package_fares WHERE vehicle_id = ? LIMIT 1";
                    $stmt = $conn->prepare($query);
                    $stmt->bind_param("s", $specialId);
                    $stmt->execute();
                    $result = $stmt->get_result();
                    
                    if ($result && $result->num_rows > 0) {
                        $row = $result->fetch_assoc();
                        
                        $localFares[] = [
                            'vehicleId' => $vehicleId,
                            'matchedWith' => 'mpv/innova_hycross',
                            'price4hrs40km' => (float)($row['price_4hrs_40km'] ?? $row['price_4hr_40km'] ?? 0),
                            'price8hrs80km' => (float)($row['price_8hrs_80km'] ?? $row['price_8hr_80km'] ?? 0),
                            'price10hrs100km' => (float)($row['price_10hrs_100km'] ?? $row['price_10hr_100km'] ?? 0),
                            'priceExtraKm' => (float)($row['price_extra_km'] ?? $row['extra_km_rate'] ?? 0),
                            'priceExtraHour' => (float)($row['price_extra_hour'] ?? $row['extra_hour_rate'] ?? 0),
                            'source' => 'database_special_mapping',
                            'timestamp' => time()
                        ];
                        $dbSuccess = true;
                        break;
                    }
                }
            }
            
            // Special mapping for Bus/Urbania
            else if ($normalizedVehicleId === 'bus' || $normalizedVehicleId === 'urbania') {
                $specialIds = ['urbania', 'bus', 'force_urbania'];
                
                foreach ($specialIds as $specialId) {
                    $query = "SELECT * FROM local_package_fares WHERE vehicle_id = ? LIMIT 1";
                    $stmt = $conn->prepare($query);
                    $stmt->bind_param("s", $specialId);
                    $stmt->execute();
                    $result = $stmt->get_result();
                    
                    if ($result && $result->num_rows > 0) {
                        $row = $result->fetch_assoc();
                        
                        $localFares[] = [
                            'vehicleId' => $vehicleId,
                            'matchedWith' => 'bus/urbania',
                            'price4hrs40km' => (float)($row['price_4hrs_40km'] ?? $row['price_4hr_40km'] ?? 0),
                            'price8hrs80km' => (float)($row['price_8hrs_80km'] ?? $row['price_8hr_80km'] ?? 0),
                            'price10hrs100km' => (float)($row['price_10hrs_100km'] ?? $row['price_10hr_100km'] ?? 0),
                            'priceExtraKm' => (float)($row['price_extra_km'] ?? $row['extra_km_rate'] ?? 0),
                            'priceExtraHour' => (float)($row['price_extra_hour'] ?? $row['extra_hour_rate'] ?? 0),
                            'source' => 'database_special_mapping',
                            'timestamp' => time()
                        ];
                        $dbSuccess = true;
                        break;
                    }
                }
            }
        }
        
        // Close the database connection
        $conn->close();
    }
} catch (Exception $e) {
    error_log("Database error in direct-local-fares.php: " . $e->getMessage());
    // We'll fall back to dynamic calculation below
}

// If database query failed, generate dynamic prices based on the specific vehicle
if (!$dbSuccess) {
    // Generate dynamic prices based on vehicle type
    function calculateDynamicPrices($baseValue, $multiplier) {
        return [
            'price4hrs40km' => round($baseValue['4hr'] * $multiplier),
            'price8hrs80km' => round($baseValue['8hr'] * $multiplier),
            'price10hrs100km' => round($baseValue['10hr'] * $multiplier),
            'priceExtraKm' => round(($baseValue['8hr'] * $multiplier) * 0.01),
            'priceExtraHour' => round(($baseValue['8hr'] * $multiplier) * 0.1)
        ];
    }

    // Base price values
    $basePrices = [
        '4hr' => 1200,
        '8hr' => 2000,
        '10hr' => 2500
    ];

    // Determine vehicle category and apply appropriate multiplier
    $vehicleCategory = 'standard';
    $multiplier = 1.0;

    // Apply specific multipliers based on normalized vehicle ID
    if ($normalizedVehicleId === 'bus' || $normalizedVehicleId === 'urbania') {
        $vehicleCategory = 'bus';
        $multiplier = 3.5;
    } else if ($normalizedVehicleId === 'tempo_traveller' || strpos($normalizedVehicleId, 'tempo') !== false) {
        $vehicleCategory = 'tempo';
        $multiplier = 2.0; // FIXED: Ensure Tempo Traveller has multiplier of 2.0
    } else if ($normalizedVehicleId === 'innova_hycross' || $normalizedVehicleId === 'mpv' || strpos($normalizedVehicleId, 'hycross') !== false) {
        $vehicleCategory = 'innova_hycross';
        $multiplier = 2.0; // FIXED: Ensure Innova Hycross has multiplier of 2.0
    } else if (strpos($normalizedVehicleId, 'innova') !== false) {
        $vehicleCategory = 'innova';
        $multiplier = 1.5;
    } else if (strpos($normalizedVehicleId, 'crysta') !== false) {
        $vehicleCategory = 'innova_crysta';
        $multiplier = 1.75;
    } else if (strpos($normalizedVehicleId, 'ertiga') !== false || strpos($normalizedVehicleId, 'suv') !== false) {
        $vehicleCategory = 'ertiga';
        $multiplier = 1.25;
    } else if (strpos($normalizedVehicleId, 'sedan') !== false || 
        strpos($normalizedVehicleId, 'dzire') !== false ||
        strpos($normalizedVehicleId, 'etios') !== false) {
        $vehicleCategory = 'sedan';
        $multiplier = 1.0;
    } else if (strpos($normalizedVehicleId, 'cng') !== false) {
        $vehicleCategory = 'cng';
        $multiplier = 1.0;
    } else {
        // Default case
        $vehicleCategory = 'sedan';
        $multiplier = 1.0;
    }

    // Calculate prices
    $prices = calculateDynamicPrices($basePrices, $multiplier);

    // Create the response object
    $localFares[] = [
        'vehicleId' => $vehicleId,
        'vehicleCategory' => $vehicleCategory,
        'multiplier' => $multiplier,
        'matchedWith' => 'dynamic_calculation',
        'price4hrs40km' => $prices['price4hrs40km'],
        'price8hrs80km' => $prices['price8hrs80km'],
        'price10hrs100km' => $prices['price10hrs100km'],
        'priceExtraKm' => $prices['priceExtraKm'],
        'priceExtraHour' => $prices['priceExtraHour'],
        'source' => 'dynamic',
        'timestamp' => time()
    ];
}

// Return JSON response with debug info
echo json_encode([
    'status' => 'success',
    'message' => $dbSuccess ? 'Local fares retrieved from database' : 'Local fares dynamically generated',
    'fares' => $localFares,
    'requestInfo' => $originalRequest,
    'dynamicallyGenerated' => !$dbSuccess,
    'timestamp' => time()
]);
