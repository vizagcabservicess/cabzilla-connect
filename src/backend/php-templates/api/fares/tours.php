
<?php
require_once '../../config.php';

// Allow only GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(['error' => 'Method not allowed'], 405);
}

// Connect to database
$conn = getDbConnection();

try {
    // Get all tour fares
    $stmt = $conn->prepare("SELECT * FROM tour_fares ORDER BY tour_name");
    $stmt->execute();
    $result = $stmt->get_result();

    $tourFares = [];
    while ($row = $result->fetch_assoc()) {
        // Convert numeric strings to actual numbers
        $tourFare = [
            'id' => intval($row['id']),
            'tourId' => $row['tour_id'],
            'tourName' => $row['tour_name'],
            'sedan' => floatval($row['sedan']),
            'ertiga' => floatval($row['ertiga']),
            'innova' => floatval($row['innova']),
            'tempo' => floatval($row['tempo']),
            'luxury' => floatval($row['luxury'])
        ];
        
        $tourFares[] = $tourFare;
    }

    // Send response as a simple array, not an object with numbered keys
    sendJsonResponse($tourFares);
} catch (Exception $e) {
    logError("Error fetching tour fares", ['error' => $e->getMessage()]);
    sendJsonResponse(['error' => 'Failed to fetch tour fares: ' . $e->getMessage()], 500);
}
