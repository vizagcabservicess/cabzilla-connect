
<?php
require_once '../../config.php';

// Allow only GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(['error' => 'Method not allowed'], 405);
}

// Connect to database
$conn = getDbConnection();

// Get all vehicle pricing
$stmt = $conn->prepare("SELECT * FROM vehicle_pricing ORDER BY id");
$stmt->execute();
$result = $stmt->get_result();

$vehiclePricing = [];
while ($row = $result->fetch_assoc()) {
    $vehiclePricing[] = $row;
}

// Send response
sendJsonResponse($vehiclePricing);
