<?php
ob_start();
set_exception_handler(function($e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Unhandled exception', 'details' => $e->getMessage()]);
    exit;
});
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Unhandled error', 'details' => "$errstr in $errfile on line $errline"]);
    exit;
});
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['status' => 'error', 'message' => 'Fatal error', 'details' => $error['message']]);
        exit;
    }
});

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGetRides();
        break;
    case 'POST':
        handleCreateRide();
        break;
    case 'PUT':
        handleUpdateRide();
        break;
    case 'DELETE':
        handleDeleteRide();
        break;
    default:
        sendError('Method not allowed', 405);
}

function handleGetRides() {
    global $pdo;
    
    $rideId = $_GET['id'] ?? null;
    
    if ($rideId) {
        // Get specific ride
        $stmt = $pdo->prepare("
            SELECT 
                r.*,
                p.name as provider_name,
                p.phone as provider_phone,
                p.rating as provider_rating,
                v.make, v.model, v.color, v.plate_number
            FROM pooling_rides r
            JOIN pooling_providers p ON r.provider_id = p.id
            JOIN pooling_vehicles v ON r.vehicle_id = v.id
            WHERE r.id = ?
        ");
        $stmt->execute([$rideId]);
        $ride = $stmt->fetch();
        
        if (!$ride) {
            sendError('Ride not found', 404);
        }
        
        $formatted_ride = [
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
            'createdAt' => $ride['created_at'],
            'updatedAt' => $ride['updated_at']
        ];
        
        sendResponse($formatted_ride);
    } else {
        // Get all active rides
        $stmt = $pdo->prepare("
            SELECT 
                r.*,
                p.name as provider_name,
                p.phone as provider_phone,
                p.rating as provider_rating,
                v.make, v.model, v.color, v.plate_number
            FROM pooling_rides r
            JOIN pooling_providers p ON r.provider_id = p.id
            JOIN pooling_vehicles v ON r.vehicle_id = v.id
            WHERE r.status = 'active'
            ORDER BY r.departure_time ASC
        ");
        $stmt->execute();
        $rides = $stmt->fetchAll();
        
        sendResponse($rides);
    }
}

function handleCreateRide() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $input = sanitizeInput($input);
    
    $required_fields = ['type', 'fromLocation', 'toLocation', 'departureTime', 'totalSeats', 'pricePerSeat', 'vehicleInfo'];
    $errors = validateInput($input, $required_fields);
    
    if (!empty($errors)) {
        sendError(implode(', ', $errors));
    }
    
    try {
        $pdo->beginTransaction();
        
        // Create or get provider (simplified for demo)
        $stmt = $pdo->prepare("INSERT INTO pooling_providers (name, phone) VALUES (?, ?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)");
        $stmt->execute(['Current User', '+919999999999']);
        $providerId = $pdo->lastInsertId();
        
        // Create vehicle
        $vehicleInfo = $input['vehicleInfo'];
        $stmt = $pdo->prepare("
            INSERT INTO pooling_vehicles (provider_id, make, model, color, plate_number, vehicle_type, total_seats, amenities)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $providerId,
            $vehicleInfo['make'] ?? '',
            $vehicleInfo['model'] ?? '',
            $vehicleInfo['color'] ?? '',
            $vehicleInfo['plateNumber'] ?? 'TEMP' . time(),
            $input['type'],
            $input['totalSeats'],
            json_encode($input['amenities'] ?? [])
        ]);
        $vehicleId = $pdo->lastInsertId();
        
        // Create ride
        $stmt = $pdo->prepare("
            INSERT INTO pooling_rides 
            (provider_id, vehicle_id, type, from_location, to_location, departure_time, arrival_time, 
             total_seats, available_seats, price_per_seat, route_stops, amenities, rules)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $providerId,
            $vehicleId,
            $input['type'],
            $input['fromLocation'],
            $input['toLocation'],
            $input['departureTime'],
            $input['arrivalTime'] ?? null,
            $input['totalSeats'],
            $input['totalSeats'], // available_seats starts as total_seats
            $input['pricePerSeat'],
            json_encode($input['route'] ?? []),
            json_encode($input['amenities'] ?? []),
            json_encode($input['rules'] ?? [])
        ]);
        
        $rideId = $pdo->lastInsertId();
        $pdo->commit();
        
        sendResponse(['id' => $rideId, 'message' => 'Ride created successfully'], 201);
        
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log('Database error in create ride: ' . $e->getMessage());
        sendError('Failed to create ride', 500);
    }
}

function handleUpdateRide() {
    // Implementation for updating rides
    sendError('Update ride not implemented yet', 501);
}

function handleDeleteRide() {
    global $pdo;

    $input = json_decode(file_get_contents('php://input'), true);
    $rideId = $input['id'] ?? null;

    if (!$rideId) {
        sendError('Ride ID is required for deletion');
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM pooling_rides WHERE id = ?");
        $stmt->execute([$rideId]);

        if ($stmt->rowCount() === 0) {
            sendError('Ride not found or already deleted', 404);
        }

        sendResponse(['message' => 'Ride deleted successfully']);
    } catch (PDOException $e) {
        error_log('Database error in delete ride: ' . $e->getMessage());
        sendError('Failed to delete ride', 500);
    }
}
?>
