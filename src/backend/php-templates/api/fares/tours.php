
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
            'luxury' => floatval($row['luxury']),
            'distance' => isset($row['distance']) ? floatval($row['distance']) : 0,
            'days' => isset($row['days']) ? intval($row['days']) : 1
        ];
        
        // Add any additional vehicle types that might be in the database
        foreach ($row as $key => $value) {
            if (!in_array($key, ['id', 'tour_id', 'tour_name', 'sedan', 'ertiga', 'innova', 'tempo', 'luxury', 'distance', 'days', 'created_at', 'updated_at'])) {
                // Add any numeric value that might be a vehicle price
                if (is_numeric($value)) {
                    // Convert column names like vehicle_id to vehicle-friendly format
                    $vehicleKey = str_replace('_', '', $key);
                    $tourFare[$vehicleKey] = floatval($value);
                }
            }
        }
        
        // Add specific mappings for special vehicle IDs
        if (isset($row['mpv'])) {
            $tourFare['mpv'] = floatval($row['mpv']);
        }
        
        if (isset($row['toyota'])) {
            $tourFare['toyota'] = floatval($row['toyota']);
        }
        
        if (isset($row['dzire_cng'])) {
            $tourFare['dzire_cng'] = floatval($row['dzire_cng']);
        }
        
        if (isset($row['innova_crysta'])) {
            $tourFare['innova_crysta'] = floatval($row['innova_crysta']);
        }
        
        if (isset($row['tempo_traveller'])) {
            $tourFare['tempo_traveller'] = floatval($row['tempo_traveller']);
        }
        
        $tourFares[] = $tourFare;
    }

    // Send response as a simple array, not an object with numbered keys
    sendJsonResponse($tourFares);
} catch (Exception $e) {
    logError("Error fetching tour fares", ['error' => $e->getMessage()]);
    sendJsonResponse(['error' => 'Failed to fetch tour fares: ' . $e->getMessage()], 500);
}
