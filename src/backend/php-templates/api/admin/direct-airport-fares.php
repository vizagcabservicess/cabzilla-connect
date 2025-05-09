<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
/**
 * Direct airport fares API endpoint - Returns airport fares for vehicles
 * This endpoint handles both all fares and vehicle-specific fares
 */

// Set headers for CORS and caching
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include utility files
require_once __DIR__ . '/../utils/database.php';
require_once __DIR__ . '/../../config.php';

    // Get database connection
$conn = function_exists('getDbConnection') ? getDbConnection() : null;
if (!$conn && class_exists('mysqli')) {
    $dbHost = 'localhost';
    $dbName = 'u644605165_db_be';
    $dbUser = 'u644605165_usr_be';
    $dbPass = 'Vizag@1213';
    $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
    if ($conn->connect_error) {
        echo json_encode(['status' => 'error', 'message' => 'DB connect error: ' . $conn->connect_error]);
        exit;
    }
    $conn->set_charset("utf8mb4");
}
if (!$conn) {
    echo json_encode(['status' => 'error', 'message' => 'Could not connect to database']);
    exit;
}

// Get vehicle ID from query parameters (if provided)
$vehicleId = isset($_GET['vehicle_id']) ? $conn->real_escape_string($_GET['vehicle_id']) : null;
    
    // Build query based on whether a specific vehicle ID was provided
    if ($vehicleId) {
        // Query for specific vehicle - using a LOWER() function to handle case sensitivity
        $query = "
            SELECT 
                atf.id, 
                atf.vehicle_id,
                v.name,
                CAST(atf.base_price AS DECIMAL(10,2)) AS base_price,
                CAST(atf.price_per_km AS DECIMAL(10,2)) AS price_per_km,
                CAST(atf.pickup_price AS DECIMAL(10,2)) AS pickup_price,
                CAST(atf.drop_price AS DECIMAL(10,2)) AS drop_price,
                CAST(atf.tier1_price AS DECIMAL(10,2)) AS tier1_price,
                CAST(atf.tier2_price AS DECIMAL(10,2)) AS tier2_price,
                CAST(atf.tier3_price AS DECIMAL(10,2)) AS tier3_price,
                CAST(atf.tier4_price AS DECIMAL(10,2)) AS tier4_price,
                CAST(atf.extra_km_charge AS DECIMAL(10,2)) AS extra_km_charge
            FROM 
                airport_transfer_fares atf
            LEFT JOIN 
                vehicles v ON LOWER(atf.vehicle_id) = LOWER(v.vehicle_id)
            WHERE 
                LOWER(atf.vehicle_id) = LOWER('$vehicleId')
        ";
    } else {
        // Query for all vehicles - ensuring we get complete data with JOINs
        $query = "
            SELECT 
                atf.id, 
                atf.vehicle_id,
                v.name,
                CAST(atf.base_price AS DECIMAL(10,2)) AS base_price,
                CAST(atf.price_per_km AS DECIMAL(10,2)) AS price_per_km,
                CAST(atf.pickup_price AS DECIMAL(10,2)) AS pickup_price,
                CAST(atf.drop_price AS DECIMAL(10,2)) AS drop_price,
                CAST(atf.tier1_price AS DECIMAL(10,2)) AS tier1_price,
                CAST(atf.tier2_price AS DECIMAL(10,2)) AS tier2_price,
                CAST(atf.tier3_price AS DECIMAL(10,2)) AS tier3_price,
                CAST(atf.tier4_price AS DECIMAL(10,2)) AS tier4_price,
                CAST(atf.extra_km_charge AS DECIMAL(10,2)) AS extra_km_charge
            FROM 
                airport_transfer_fares atf
            LEFT JOIN 
                vehicles v ON LOWER(atf.vehicle_id) = LOWER(v.vehicle_id)
            ORDER BY 
                atf.id ASC
        ";
    }
    
    // Execute query
    $result = $conn->query($query);
    
    if (!$result) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Database query failed: ' . $conn->error
    ]);
    exit;
    }
    
    // Fetch results
    $fares = [];
    while ($row = $result->fetch_assoc()) {
        // Clean up data - ensure values are properly cast to numeric values
        $fare = [
            'id' => (int)$row['id'],
            'vehicleId' => $row['vehicle_id'],
            'vehicle_id' => $row['vehicle_id'], // Include both formats for compatibility
            'name' => $row['name'] ?? ucfirst(str_replace('_', ' ', $row['vehicle_id'])),
            'basePrice' => (float)$row['base_price'],
            'base_price' => (float)$row['base_price'], // Include both formats for compatibility
            'pricePerKm' => (float)$row['price_per_km'],
            'price_per_km' => (float)$row['price_per_km'], // Include both formats for compatibility
            'pickupPrice' => (float)$row['pickup_price'],
            'pickup_price' => (float)$row['pickup_price'], // Include both formats for compatibility
            'dropPrice' => (float)$row['drop_price'],
            'drop_price' => (float)$row['drop_price'], // Include both formats for compatibility
            'tier1Price' => (float)$row['tier1_price'],
            'tier1_price' => (float)$row['tier1_price'], // Include both formats for compatibility
            'tier2Price' => (float)$row['tier2_price'],
            'tier2_price' => (float)$row['tier2_price'], // Include both formats for compatibility
            'tier3Price' => (float)$row['tier3_price'],
            'tier3_price' => (float)$row['tier3_price'], // Include both formats for compatibility
            'tier4Price' => (float)$row['tier4_price'],
            'tier4_price' => (float)$row['tier4_price'], // Include both formats for compatibility
            'extraKmCharge' => (float)$row['extra_km_charge'],
            'extra_km_charge' => (float)$row['extra_km_charge'] // Include both formats for compatibility
        ];
        
        $fares[] = $fare;
    }
    
// Create response data structure
$responseData = [
        'status' => 'success',
    'fares' => $fares,
    'count' => count($fares)
];

// Send the JSON response
echo json_encode($responseData);
exit;
