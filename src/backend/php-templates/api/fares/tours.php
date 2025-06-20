<?php
require_once '../../config.php';

// Set headers for CORS and JSON response, and forcefully disable caching
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
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

    // Explicitly select all required columns, including time_duration
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
        // Manually build the tour object with the correct camelCase keys
        $tours[$tourId] = [
            'id' => intval($row['id']),
            'tourId' => $tourId,
            'tourName' => $row['tour_name'],
            'distance' => intval($row['distance']),
            'days' => intval($row['days']),
            'description' => $row['description'] ?? '',
            'imageUrl' => $row['image_url'] ?? '',
            'timeDuration' => $row['time_duration'] ?? '', // Ensure this key is correct
            'pricing' => []
        ];
    }
    $stmt->close();

    if (!empty($tours)) {
        $tourIds = array_keys($tours);
        $placeholders = implode(',', array_fill(0, count($tourIds), '?'));
        $types = str_repeat('s', count($tourIds));

        // Fetch all pricing in a single, efficient query
        $pricingStmt = $conn->prepare("
            SELECT tour_id, vehicle_id, price 
            FROM tour_fare_rates 
            WHERE tour_id IN ($placeholders)
        ");
        $pricingStmt->bind_param($types, ...$tourIds);
        $pricingStmt->execute();
        $pricingResult = $pricingStmt->get_result();

        while ($pricingRow = $pricingResult->fetch_assoc()) {
            if (isset($tours[$pricingRow['tour_id']])) {
                $tours[$pricingRow['tour_id']]['pricing'][$pricingRow['vehicle_id']] = floatval($pricingRow['price']);
            }
        }
        $pricingStmt->close();
    }

    sendJsonResponse(array_values($tours));

} catch (Exception $e) {
    logError("Error in api/fares/tours.php", ['error' => $e->getMessage()]);
    http_response_code(500);
    sendJsonResponse(['error' => 'An internal server error occurred.']);
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>
