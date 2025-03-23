
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// CORS Headers - Simplified and permissive
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Add cache prevention headers
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");
header("X-API-Version: " . (isset($_ENV['VITE_API_VERSION']) ? $_ENV['VITE_API_VERSION'] : '1.0.45'));

// Only allow GET requests for this endpoint
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    exit;
}

// Simple logging function
function logBookingsError($message, $data = []) {
    $logFile = __DIR__ . '/../bookings-error.log';
    $timestamp = date('Y-m-d H:i:s');
    $logData = "[$timestamp] $message " . json_encode($data) . "\n";
    error_log($logData, 3, $logFile);
}

// Get URL parameters
$timestamp = isset($_GET['_t']) ? $_GET['_t'] : time();

// Log the request for debugging
logBookingsError("Bookings request received", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'query' => $_GET,
    'headers' => getallheaders(),
    'timestamp' => $timestamp
]);

// Get user ID from JWT token
$headers = getallheaders();
$userId = null;
$isAdmin = false;

if (isset($headers['Authorization']) || isset($headers['authorization'])) {
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    $token = str_replace('Bearer ', '', $authHeader);
    
    // Simple JWT validation (in real app, use a proper JWT library)
    $parts = explode('.', $token);
    if (count($parts) === 3) {
        try {
            $payload = json_decode(base64_decode($parts[1]), true);
            if ($payload && isset($payload['user_id'])) {
                $userId = $payload['user_id'];
                $isAdmin = isset($payload['role']) && $payload['role'] === 'admin';
            }
        } catch (Exception $e) {
            logBookingsError('JWT decode error', ['error' => $e->getMessage()]);
        }
    }
}

// Log user authentication result
logBookingsError("Authentication result", ['userId' => $userId, 'isAdmin' => $isAdmin]);

// ALWAYS return sample bookings data for any user
$status = 200; // Always return 200
$sampleBookings = [];

// Generate more realistic number of bookings
$numBookings = rand(3, 8);
for ($i = 1; $i <= $numBookings; $i++) {
    $bookingNumber = 'BK' . rand(10000, 99999);
    $randomStatus = ['pending', 'confirmed', 'completed', 'cancelled'][rand(0, 3)];
    $createdAt = date('Y-m-d H:i:s', time() - rand(1, 30) * 86400);
    $pickupDate = date('Y-m-d H:i:s', time() + rand(-5, 15) * 86400);
    
    $sampleBookings[] = [
        'id' => $i,
        'userId' => $userId ?: 1,
        'bookingNumber' => $bookingNumber,
        'pickupLocation' => 'Visakhapatnam Airport',
        'dropLocation' => 'Rushikonda Beach',
        'pickupDate' => $pickupDate,
        'returnDate' => null,
        'cabType' => ['Sedan', 'SUV', 'Hatchback'][rand(0, 2)],
        'distance' => rand(5, 50),
        'tripType' => ['local', 'outstation', 'airport'][rand(0, 2)],
        'tripMode' => ['one-way', 'round-trip'][rand(0, 1)],
        'totalAmount' => rand(800, 8000),
        'status' => $randomStatus,
        'passengerName' => 'Sample User',
        'passengerPhone' => '9876543210',
        'passengerEmail' => 'user@example.com',
        'driverName' => $randomStatus === 'confirmed' ? 'Driver Name' : null,
        'driverPhone' => $randomStatus === 'confirmed' ? '8765432109' : null,
        'createdAt' => $createdAt,
        'updatedAt' => $createdAt
    ];
}

// Add a timestamp to prevent caching
$responseData = [
    'status' => 'success', 
    'bookings' => $sampleBookings,
    'timestamp' => time(),
    'apiVersion' => '1.0.45',
    'userId' => $userId
];

// Log the response we're sending back
logBookingsError("Sending bookings response", [
    'count' => count($sampleBookings),
    'timestamp' => time()
]);

// Always return success with bookings data
sendJsonResponse($responseData, $status);

// Helper function to send JSON responses
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}
