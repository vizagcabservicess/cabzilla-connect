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

file_put_contents(__DIR__ . '/debug.log', "Request received at " . date('Y-m-d H:i:s') . "\n", FILE_APPEND);

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
    $providerId = $_GET['provider_id'] ?? null;
    file_put_contents(__DIR__ . '/debug.log', "handleGetRides provider_id: " . print_r($providerId, true) . "\n", FILE_APPEND);
    
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
    } else if ($providerId) {
        // Get rides for a specific provider
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
            WHERE r.provider_id = ?
            ORDER BY r.departure_time ASC
        ");
        $stmt->execute([$providerId]);
        $rides = $stmt->fetchAll();
        sendResponse($rides);
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
    file_put_contents(__DIR__ . '/debug.log', "handleCreateRide called\n", FILE_APPEND);
    $input = json_decode(file_get_contents('php://input'), true);
    file_put_contents(__DIR__ . '/debug.log', "Payload: " . print_r($input, true) . "\n", FILE_APPEND);
    $input = sanitizeInput($input);
    
    $required_fields = ['type', 'fromLocation', 'toLocation', 'departureTime', 'totalSeats', 'pricePerSeat', 'vehicleInfo', 'providerId'];
    $errors = validateInput($input, $required_fields);
    
    if (!empty($errors)) {
        sendError(implode(', ', $errors));
    }
    
    $providerId = $input['providerId'];
    file_put_contents(__DIR__ . '/debug.log', "handleCreateRide using providerId: " . print_r($providerId, true) . "\n", FILE_APPEND);
    try {
        $pdo->beginTransaction();
        // Create vehicle (or get existing)
        $vehicleInfo = $input['vehicleInfo'];
        $stmt = $pdo->prepare("SELECT id FROM pooling_vehicles WHERE plate_number = ?");
        $stmt->execute([$vehicleInfo['plateNumber']]);
        $vehicle = $stmt->fetch();
        if ($vehicle) {
            $vehicleId = $vehicle['id'];
        } else {
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
        }
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
            $input['totalSeats'],
            $input['pricePerSeat'],
            json_encode($input['route'] ?? []),
            json_encode($input['amenities'] ?? []),
            json_encode($input['rules'] ?? [])
        ]);
        $rideId = $pdo->lastInsertId();
        // Fetch the full ride row with joins
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
        $pdo->commit();
        if ($ride) {
            sendResponse(['status' => 'success', 'ride' => $ride], 201);
        } else {
            file_put_contents(__DIR__ . '/debug.log', "Ride insert succeeded but fetch failed for rideId: $rideId\n", FILE_APPEND);
            sendError('Ride created but could not fetch details', 500);
        }
    } catch (PDOException $e) {
        $pdo->rollBack();
        file_put_contents(__DIR__ . '/debug.log', "DB Error: " . $e->getMessage() . "\n", FILE_APPEND);
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
