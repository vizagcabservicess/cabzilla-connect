<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', 405);
}

// Get search parameters
$type = $_GET['type'] ?? '';
$from = $_GET['from'] ?? '';
$to = $_GET['to'] ?? '';
$date = $_GET['date'] ?? '';
$passengers = (int)($_GET['passengers'] ?? 1);
$maxPrice = isset($_GET['maxPrice']) ? (float)$_GET['maxPrice'] : null;
$sortBy = $_GET['sortBy'] ?? 'time';

// Validate required parameters
if (empty($type) || empty($from) || empty($to) || empty($date)) {
    sendError('Missing required parameters: type, from, to, date');
}

try {
    // Build query
    $sql = "
        SELECT 
            r.id,
            r.type,
            r.from_location,
            r.to_location,
            r.departure_time,
            r.total_seats,
            r.price_per_seat,
            r.vehicle_make,
            r.vehicle_model,
            r.vehicle_color,
            r.plate_number,
            r.amenities
        FROM pooling_rides r
        WHERE r.type = :type
        AND DATE(r.departure_time) = :date
        AND (
            LOWER(r.from_location) LIKE LOWER(:from) 
            OR LOWER(:from) LIKE LOWER(r.from_location)
        )
        AND (
            LOWER(r.to_location) LIKE LOWER(:to)
            OR LOWER(:to) LIKE LOWER(r.to_location)
        )
    ";
    
    // Add price filter if specified
    if ($maxPrice !== null) {
        $sql .= " AND r.price_per_seat <= :maxPrice";
    }
    
    // Add sorting
    switch ($sortBy) {
        case 'price':
            $sql .= " ORDER BY r.price_per_seat ASC";
            break;
        case 'time':
        default:
            $sql .= " ORDER BY r.departure_time ASC";
            break;
    }
    
    $sql .= " LIMIT 50";
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':type', $type);
    $stmt->bindParam(':from', $from);
    $stmt->bindParam(':to', $to);
    $stmt->bindParam(':date', $date);
    $stmt->bindParam(':passengers', $passengers, PDO::PARAM_INT);
    
    if ($maxPrice !== null) {
        $stmt->bindParam(':maxPrice', $maxPrice);
    }
    
    $stmt->execute();
    $rides = $stmt->fetchAll();
    
    // Format the response
    $formatted_rides = array_map(function($ride) {
        return [
            'id' => (int)$ride['id'],
            'type' => $ride['type'],
            'fromLocation' => $ride['from_location'],
            'toLocation' => $ride['to_location'],
            'departureTime' => $ride['departure_time'],
            'totalSeats' => (int)$ride['total_seats'],
            'pricePerSeat' => (float)$ride['price_per_seat'],
            'vehicleMake' => $ride['vehicle_make'],
            'vehicleModel' => $ride['vehicle_model'],
            'vehicleColor' => $ride['vehicle_color'],
            'plateNumber' => $ride['plate_number'],
            'amenities' => $ride['amenities'] ? json_decode($ride['amenities']) : [],
            'availableSeats' => null,
            'status' => 'active',
            'createdAt' => $ride['departure_time'],
            'updatedAt' => $ride['departure_time']
        ];
    }, $rides);
    
    sendResponse($formatted_rides);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    exit();
}
?>
