<?php
require_once '../../config.php';

// Forcefully disable caching at the API level
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(['error' => 'Method not allowed'], 405);
    exit;
}

try {
    $conn = getDbConnection();
    if (!$conn) {
        throw new Exception('Database connection failed');
    }

    $stmt = $conn->prepare("
        SELECT id, tour_id, tour_name, distance, days, description, image_url, time_duration 
        FROM tour_fares 
        ORDER BY tour_name
    ");
    $stmt->execute();
    $result = $stmt->get_result();

    $tours = [];
    while ($row = $result->fetch_assoc()) {
        $tourId = $row['tour_id'];
        
        $duration = $row['time_duration'] ?? '';

        $tours[$tourId] = [
            'id' => intval($row['id']),
            'tourId' => $row['tour_id'],
            'tourName' => $row['tour_name'],
            'distance' => intval($row['distance']),
            'days' => intval($row['days']),
            'description' => $row['description'] ?? '',
            'imageUrl' => $row['image_url'] ?? '',
            'timeDuration' => $duration, // Use the debug-aware duration
            'pricing' => []
        ];
    }
    $stmt->close();

    if (!empty($tours)) {
        $tourIds = array_keys($tours);
        $placeholders = implode(',', array_fill(0, count($tourIds), '?'));
        $types = str_repeat('s', count($tourIds));

        $pricingStmt = $conn->prepare("
            SELECT tour_id, vehicle_id, price 
            FROM tour_fare_rates 
            WHERE tour_id IN ($placeholders)
        ");
        $pricingStmt->bind_param($types, ...$tourIds);
        $pricingStmt->execute();
        $pricingResult = $pricingStmt->get_result();

        while ($pricingRow = $pricingResult->fetch_assoc()) {
            $tours[$pricingRow['tour_id']]['pricing'][$pricingRow['vehicle_id']] = floatval($pricingRow['price']);
        }
        $pricingStmt->close();
    }

    sendJsonResponse(array_values($tours));

} catch (Exception $e) {
    logError("Error fetching public tour fares", ['error' => $e->getMessage()]);
    sendJsonResponse(['error' => 'An error occurred while fetching tour fares.'], 500);
}

$conn->close();
?>
