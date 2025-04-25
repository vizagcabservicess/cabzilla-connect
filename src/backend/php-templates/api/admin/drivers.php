
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';

// CRITICAL: Set all response headers first before any output
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Debug mode
$debugMode = isset($_GET['debug']) || isset($_SERVER['HTTP_X_DEBUG']);

// Log request
error_log("Admin drivers endpoint called: " . $_SERVER['REQUEST_METHOD']);

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Function to send JSON response
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    if (ob_get_level()) ob_end_clean();
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

try {
    // Only allow GET requests
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }

    // Connect to database with improved error handling
    $conn = getDbConnectionWithRetry();
    
    // First check if the drivers table exists
    $checkTableResult = $conn->query("SHOW TABLES LIKE 'drivers'");
    
    if ($checkTableResult->num_rows === 0) {
        // Table doesn't exist, return mock data
        sendJsonResponse([
            'status' => 'success',
            'message' => 'Drivers mock data',
            'drivers' => [
                [
                    'id' => 1,
                    'name' => 'Rajesh Kumar',
                    'phone' => '9876543210',
                    'email' => 'rajesh@example.com',
                    'licenseNo' => 'DL-1234567890',
                    'status' => 'available',
                    'totalRides' => 352,
                    'earnings' => 120000,
                    'rating' => 4.8,
                    'location' => 'Hyderabad Central',
                    'vehicle' => 'Sedan - AP 31 XX 1234'
                ],
                [
                    'id' => 2,
                    'name' => 'Pavan Reddy',
                    'phone' => '8765432109',
                    'email' => 'pavan@example.com',
                    'licenseNo' => 'DL-0987654321',
                    'status' => 'busy',
                    'totalRides' => 215,
                    'earnings' => 85500,
                    'rating' => 4.6,
                    'location' => 'Gachibowli',
                    'vehicle' => 'SUV - AP 32 XX 5678'
                ],
                [
                    'id' => 3,
                    'name' => 'Suresh Verma',
                    'phone' => '7654321098',
                    'email' => 'suresh@example.com',
                    'licenseNo' => 'DL-5678901234',
                    'status' => 'offline',
                    'totalRides' => 180,
                    'earnings' => 72000,
                    'rating' => 4.5,
                    'location' => 'Offline',
                    'vehicle' => 'Sedan - AP 33 XX 9012'
                ],
                [
                    'id' => 4,
                    'name' => 'Venkatesh S',
                    'phone' => '9876543211',
                    'email' => 'venkat@example.com',
                    'licenseNo' => 'DL-4321098765',
                    'status' => 'available',
                    'totalRides' => 298,
                    'earnings' => 110000,
                    'rating' => 4.7,
                    'location' => 'Kukatpally',
                    'vehicle' => 'Hatchback - AP 34 XX 3456'
                ],
                [
                    'id' => 5,
                    'name' => 'Ramesh Babu',
                    'phone' => '8765432108',
                    'email' => 'ramesh@example.com',
                    'licenseNo' => 'DL-2345678901',
                    'status' => 'busy',
                    'totalRides' => 175,
                    'earnings' => 65000,
                    'rating' => 4.4,
                    'location' => 'Ameerpet',
                    'vehicle' => 'Tempo - AP 35 XX 7890'
                ]
            ]
        ]);
    }
    
    // Fetch drivers from the database
    $driversQuery = "SELECT * FROM drivers";
    $result = $conn->query($driversQuery);
    
    if (!$result) {
        throw new Exception("Database query failed: " . $conn->error);
    }
    
    $drivers = [];
    
    while ($row = $result->fetch_assoc()) {
        // Map database fields to the format expected by the frontend
        $drivers[] = [
            'id' => (int)$row['id'],
            'name' => $row['name'],
            'phone' => $row['phone'],
            'email' => $row['email'],
            'licenseNo' => $row['license_no'],
            'status' => $row['status'],
            'totalRides' => (int)$row['total_rides'],
            'earnings' => (int)$row['earnings'],
            'rating' => (float)$row['rating'],
            'location' => $row['location'],
            'vehicle' => $row['vehicle']
        ];
    }
    
    // Send successful response with drivers data
    sendJsonResponse([
        'status' => 'success',
        'message' => 'Drivers loaded successfully',
        'count' => count($drivers),
        'drivers' => $drivers
    ]);

} catch (Exception $e) {
    error_log("Error in drivers.php: " . $e->getMessage());
    
    // Return mock data in case of error
    sendJsonResponse([
        'status' => 'success',
        'message' => 'Drivers mock data (fallback)',
        'error_details' => $debugMode ? $e->getMessage() : null,
        'drivers' => [
            [
                'id' => 1,
                'name' => 'Rajesh Kumar',
                'phone' => '9876543210',
                'email' => 'rajesh@example.com',
                'licenseNo' => 'DL-1234567890',
                'status' => 'available',
                'totalRides' => 352,
                'earnings' => 120000,
                'rating' => 4.8,
                'location' => 'Hyderabad Central',
                'vehicle' => 'Sedan - AP 31 XX 1234'
            ],
            [
                'id' => 2,
                'name' => 'Pavan Reddy',
                'phone' => '8765432109',
                'email' => 'pavan@example.com',
                'licenseNo' => 'DL-0987654321',
                'status' => 'busy',
                'totalRides' => 215,
                'earnings' => 85500,
                'rating' => 4.6,
                'location' => 'Gachibowli',
                'vehicle' => 'SUV - AP 32 XX 5678'
            ],
            [
                'id' => 3,
                'name' => 'Suresh Verma',
                'phone' => '7654321098',
                'email' => 'suresh@example.com',
                'licenseNo' => 'DL-5678901234',
                'status' => 'offline',
                'totalRides' => 180,
                'earnings' => 72000,
                'rating' => 4.5,
                'location' => 'Offline',
                'vehicle' => 'Sedan - AP 33 XX 9012'
            ],
            [
                'id' => 4,
                'name' => 'Venkatesh S',
                'phone' => '9876543211',
                'email' => 'venkat@example.com',
                'licenseNo' => 'DL-4321098765',
                'status' => 'available',
                'totalRides' => 298,
                'earnings' => 110000,
                'rating' => 4.7,
                'location' => 'Kukatpally',
                'vehicle' => 'Hatchback - AP 34 XX 3456'
            ],
            [
                'id' => 5,
                'name' => 'Ramesh Babu',
                'phone' => '8765432108',
                'email' => 'ramesh@example.com',
                'licenseNo' => 'DL-2345678901',
                'status' => 'busy',
                'totalRides' => 175,
                'earnings' => 65000,
                'rating' => 4.4,
                'location' => 'Ameerpet',
                'vehicle' => 'Tempo - AP 35 XX 7890'
            ]
        ]
    ]);
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
?>
