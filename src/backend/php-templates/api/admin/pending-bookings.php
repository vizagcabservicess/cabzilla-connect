
<?php
/**
 * pending-bookings.php - Fetch all pending bookings that need vehicle assignment
 */

// Set CORS headers FIRST
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Clear any previous output
if (ob_get_level()) {
    ob_end_clean();
}

// Log the request for debugging
error_log('Pending bookings API accessed. Method: ' . $_SERVER['REQUEST_METHOD']);

// Get database connection
try {
    // First try to use config if available
    if (file_exists(dirname(__FILE__) . '/../../config.php')) {
        require_once dirname(__FILE__) . '/../../config.php';
        $conn = getDbConnection();
        error_log("Connected to database using config.php");
    } 
    // Fallback to hardcoded credentials
    else {
        error_log("Config file not found, using hardcoded credentials");
        $dbHost = 'localhost';
        $dbName = 'u644605165_new_bookingdb';
        $dbUser = 'u644605165_new_bookingusr';
        $dbPass = 'Vizag@1213';
        
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        
        if ($conn->connect_error) {
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
        
        error_log("Connected to database using hardcoded credentials");
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Database connection failed: ' . $e->getMessage(),
        'timestamp' => time()
    ]);
    exit;
}

try {
    // Get pending bookings that don't have a fleet vehicle assigned
    $query = "
        SELECT b.*
        FROM bookings b
        LEFT JOIN vehicle_assignments va ON b.id = va.booking_id
        WHERE (b.status = 'pending' OR b.status = 'confirmed') 
        AND (va.id IS NULL OR b.fleet_vehicle_id IS NULL)
        ORDER BY b.pickup_date ASC
        LIMIT 20
    ";
    
    error_log("Executing query: " . $query);
    $result = $conn->query($query);
    
    if (!$result) {
        throw new Exception("Error fetching pending bookings: " . $conn->error);
    }
    
    $bookings = [];
    while ($row = $result->fetch_assoc()) {
        // Map database column names to our API format
        $booking = [
            'id' => (int)$row['id'],
            'bookingNumber' => $row['booking_number'] ?? $row['id'],
            'passengerName' => $row['passenger_name'] ?? $row['customer_name'] ?? 'Guest',
            'passengerPhone' => $row['passenger_phone'] ?? $row['customer_phone'] ?? '',
            'passengerEmail' => $row['passenger_email'] ?? $row['customer_email'] ?? '',
            'pickupLocation' => $row['pickup_location'],
            'dropLocation' => $row['drop_location'] ?? '',
            'pickupDate' => $row['pickup_date'],
            'cabType' => $row['cab_type'],
            'tripType' => $row['trip_type'] ?? 'local',
            'tripMode' => $row['trip_mode'] ?? 'one-way',
            'status' => $row['status'],
            'totalAmount' => (float)$row['total_amount'],
            'distance' => (float)($row['distance'] ?? 0),
            'createdAt' => $row['created_at'] ?? date('Y-m-d H:i:s'),
            'updatedAt' => $row['updated_at'] ?? date('Y-m-d H:i:s')
        ];
        
        $bookings[] = $booking;
    }
    
    error_log("Found " . count($bookings) . " pending bookings");
    
    // Return the bookings
    echo json_encode([
        'status' => 'success',
        'bookings' => $bookings,
        'count' => count($bookings),
        'timestamp' => time()
    ]);
    
} catch (Exception $e) {
    error_log("Error in pending-bookings.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
