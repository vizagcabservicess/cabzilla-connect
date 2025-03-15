
<?php
// Adjust the path to config.php correctly
require_once __DIR__ . '/../../config.php';

// Allow only GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(['error' => 'Method not allowed'], 405);
}

// Authenticate user
$userData = authenticate();
$userId = $userData['user_id'];

// Connect to database
$conn = getDbConnection();

// Log for debugging
logError("Fetching bookings for user", ['user_id' => $userId]);

// Get user's bookings
$stmt = $conn->prepare("SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC");
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();

if (!$result) {
    logError("Database error", ['error' => $conn->error]);
    sendJsonResponse(['error' => 'Database error: ' . $conn->error], 500);
}

$bookings = [];
while ($row = $result->fetch_assoc()) {
    $bookings[] = $row;
}

// Log for debugging
logError("Retrieved bookings", ['count' => count($bookings)]);

// Send response
sendJsonResponse($bookings);
