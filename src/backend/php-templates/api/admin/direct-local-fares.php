
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

// If still no vehicleId, set a default for the mock data
if (!$vehicleId) {
    $vehicleId = 'sedan';
}

// Normalize vehicle ID for consistency
$normalizedVehicleId = strtolower($vehicleId);

// First attempt to get data directly from database
$localFares = [];
$dbSuccess = false;

try {
    // Connect to database
    $conn = getDbConnection();
    
    if ($conn) {
        // Query the local_package_fares table directly
        $query = "SELECT * FROM local_package_fares WHERE vehicle_id = ? LIMIT 1";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("s", $normalizedVehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result && $row = $result->fetch_assoc()) {
            // Successfully found data in database
            $localFares[] = [
                'vehicleId' => $row['vehicle_id'],
                'price4hrs40km' => (float)$row['price_4hrs_40km'],
                'price8hrs80km' => (float)$row['price_8hrs_80km'],
                'price10hrs100km' => (float)$row['price_10hrs_100km'],
                'priceExtraKm' => (float)$row['price_extra_km'],
                'priceExtraHour' => (float)$row['price_extra_hour'],
                'source' => 'database'
            ];
            $dbSuccess = true;
        }
        
        // Close the database connection
        $conn->close();
    }
} catch (Exception $e) {
    // Log error but continue to fallback calculation
    error_log("Database error: " . $e->getMessage());
}

// If database query failed, generate dynamic prices as fallback
if (!$dbSuccess) {
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

    // Base price values that will be used for calculations
    $baseValue = 1000;

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
        'priceExtraHour' => $prices['priceExtraHour'],
        'source' => 'dynamic'
    ];
}

// Return JSON response
echo json_encode([
    'status' => 'success',
    'message' => $dbSuccess ? 'Local fares retrieved from database' : 'Local fares dynamically generated',
    'fares' => $localFares,
    'dynamicallyGenerated' => !$dbSuccess,
    'timestamp' => time()
]);
