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
            r.arrival_time,
            r.total_seats,
            r.available_seats,
            r.price_per_seat,
            r.route_stops,
            r.amenities,
            r.rules,
            r.status,
            p.id as provider_id,
            p.name as provider_name,
            p.phone as provider_phone,
            p.rating as provider_rating,
            v.make,
            v.model,
            v.color,
            v.plate_number
        FROM pooling_rides r
        JOIN pooling_providers p ON r.provider_id = p.id
        JOIN pooling_vehicles v ON r.vehicle_id = v.id
        WHERE r.type = :type
        AND r.status = 'active'
        AND r.available_seats >= :passengers
        AND DATE(r.departure_time) = :date
        AND (
            LOWER(r.from_location) LIKE LOWER(:from1) 
            OR LOWER(:from2) LIKE LOWER(r.from_location)
        )
        AND (
            LOWER(r.to_location) LIKE LOWER(:to1)
            OR LOWER(:to2) LIKE LOWER(r.to_location)
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
        case 'rating':
            $sql .= " ORDER BY p.rating DESC";
            break;
        case 'time':
        default:
            $sql .= " ORDER BY r.departure_time ASC";
            break;
    }
    
    $sql .= " LIMIT 50";
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':type', $type);
    $stmt->bindParam(':from1', $from);
    $stmt->bindParam(':from2', $from);
    $stmt->bindParam(':to1', $to);
    $stmt->bindParam(':to2', $to);
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
            'providerId' => (int)$ride['provider_id'],
            'providerName' => $ride['provider_name'],
            'providerPhone' => $ride['provider_phone'],
            'providerRating' => $ride['provider_rating'] ? (float)$ride['provider_rating'] : null,
            'fromLocation' => $ride['from_location'],
            'toLocation' => $ride['to_location'],
            'departureTime' => $ride['departure_time'],
            'arrivalTime' => $ride['arrival_time'],
            'totalSeats' => (int)$ride['total_seats'],
            'availableSeats' => (int)$ride['available_seats'],
            'pricePerSeat' => (float)$ride['price_per_seat'],
            'vehicleInfo' => [
                'make' => $ride['make'],
                'model' => $ride['model'],
                'color' => $ride['color'],
                'plateNumber' => $ride['plate_number']
            ],
            'route' => $ride['route_stops'] ? json_decode($ride['route_stops']) : [],
            'amenities' => $ride['amenities'] ? json_decode($ride['amenities']) : [],
            'rules' => $ride['rules'] ? json_decode($ride['rules']) : [],
            'status' => $ride['status'],
            'createdAt' => $ride['departure_time'],
            'updatedAt' => $ride['departure_time']
        ];
    }, $rides);
    
    sendResponse($formatted_rides);
    
} catch (PDOException $e) {
    error_log('Database error in search: ' . $e->getMessage());
    sendError('Database error occurred', 500);
}
?>
