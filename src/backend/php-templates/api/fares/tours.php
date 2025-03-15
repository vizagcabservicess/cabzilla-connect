
<?php
require_once '../../config.php';

// Allow only GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(['error' => 'Method not allowed'], 405);
}

// Connect to database
$conn = getDbConnection();

// Get all tour fares
$stmt = $conn->prepare("SELECT * FROM tour_fares ORDER BY tour_name");
$stmt->execute();
$result = $stmt->get_result();

$tourFares = [];
while ($row = $result->fetch_assoc()) {
    $tourFares[] = $row;
}

// Send response
sendJsonResponse($tourFares);
