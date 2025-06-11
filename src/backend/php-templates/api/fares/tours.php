<?php
require_once '../../config.php';

// Allow only GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(['error' => 'Method not allowed'], 405);
}

// Connect to database
$conn = getDbConnection();

try {
    // Get all tours
    $stmt = $conn->prepare("SELECT * FROM tour_fares ORDER BY tour_name");
    $stmt->execute();
    $result = $stmt->get_result();

    $tourFares = [];
    while ($row = $result->fetch_assoc()) {
        $tourFare = [
            'id' => intval($row['id']),
            'tourId' => $row['tour_id'],
            'tourName' => $row['tour_name'],
            'distance' => intval($row['distance']),
            'days' => intval($row['days']),
            'description' => $row['description'],
            'imageUrl' => $row['image_url'],
            'pricing' => []
        ];
        // Fetch all vehicle fares for this tour
        $pricingStmt = $conn->prepare("SELECT vehicle_id, price FROM tour_fare_rates WHERE tour_id = ?");
        $pricingStmt->bind_param("s", $row['tour_id']);
        $pricingStmt->execute();
        $pricingResult = $pricingStmt->get_result();
        while ($pricingRow = $pricingResult->fetch_assoc()) {
            $tourFare['pricing'][$pricingRow['vehicle_id']] = floatval($pricingRow['price']);
        }
        $tourFares[] = $tourFare;
    }

    sendJsonResponse($tourFares);
} catch (Exception $e) {
    logError("Error fetching tour fares", ['error' => $e->getMessage()]);
    sendJsonResponse(['error' => 'Failed to fetch tour fares: ' . $e->getMessage()], 500);
}
