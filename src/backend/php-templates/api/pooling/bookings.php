<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGetBookings();
        break;
    case 'POST':
        handleCreateBooking();
        break;
    case 'PUT':
        handleUpdateBooking();
        break;
    case 'DELETE':
        handleDeleteBooking();
        break;
    default:
        sendError('Method not allowed', 405);
}

function handleGetBookings() {
    global $pdo;
    
    $userId = $_GET['user_id'] ?? null;
    
    if ($userId) {
        $stmt = $pdo->prepare("
            SELECT 
                b.*,
                r.from_location,
                r.to_location,
                r.departure_time,
                r.type as ride_type,
                p.name as provider_name,
                p.phone as provider_phone
            FROM pooling_bookings b
            JOIN pooling_rides r ON b.ride_id = r.id
            JOIN pooling_providers p ON r.provider_id = p.id
            WHERE b.user_id = ?
            ORDER BY b.created_at DESC
        ");
        $stmt->execute([$userId]);
    } else {
        $stmt = $pdo->prepare("
            SELECT 
                b.*,
                r.from_location,
                r.to_location,
                r.departure_time,
                r.type as ride_type,
                p.name as provider_name,
                p.phone as provider_phone
            FROM pooling_bookings b
            JOIN pooling_rides r ON b.ride_id = r.id
            JOIN pooling_providers p ON r.provider_id = p.id
            ORDER BY b.created_at DESC
        ");
        $stmt->execute();
    }
    
    $bookings = $stmt->fetchAll();
    sendResponse($bookings);
}

function handleCreateBooking() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $input = sanitizeInput($input);
    
    $required_fields = ['rideId', 'passengerName', 'passengerPhone', 'passengerEmail', 'seatsBooked', 'totalAmount'];
    $errors = validateInput($input, $required_fields);
    
    if (!empty($errors)) {
        sendError(implode(', ', $errors));
    }
    
    try {
        $pdo->beginTransaction();
        
        // Check ride availability and log status
        $stmt = $pdo->prepare("SELECT available_seats, status FROM pooling_rides WHERE id = ?");
        $stmt->execute([$input['rideId']]);
        $ride = $stmt->fetch();
        
        if (!$ride) {
            error_log('Booking error: Ride not found for rideId ' . $input['rideId']);
            sendError('Ride not found', 404);
        }
        
        if ($ride['status'] !== 'active') {
            error_log('Booking error: Ride not active for rideId ' . $input['rideId'] . '. Current status: ' . $ride['status']);
            sendError('Ride is not active. Current status: ' . $ride['status'], 400);
        }
        
        if ($ride['available_seats'] < $input['seatsBooked']) {
            error_log('Booking error: Not enough seats for rideId ' . $input['rideId'] . '. Requested: ' . $input['seatsBooked'] . ', Available: ' . $ride['available_seats']);
            sendError('Not enough seats available', 400);
        }
        
        // Create booking
        $stmt = $pdo->prepare("
            INSERT INTO pooling_bookings 
            (ride_id, user_id, passenger_name, passenger_phone, passenger_email, 
             seats_booked, total_amount, special_requests)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $input['rideId'],
            $input['userId'] ?? null,
            $input['passengerName'],
            $input['passengerPhone'],
            $input['passengerEmail'],
            $input['seatsBooked'],
            $input['totalAmount'],
            $input['specialRequests'] ?? null
        ]);
        
        $bookingId = $pdo->lastInsertId();
        
        // Update available seats
        $stmt = $pdo->prepare("
            UPDATE pooling_rides 
            SET available_seats = available_seats - ?,
                status = CASE WHEN available_seats - ? <= 0 THEN 'full' ELSE status END
            WHERE id = ?
        ");
        $stmt->execute([$input['seatsBooked'], $input['seatsBooked'], $input['rideId']]);
        
        // Create payment record
        $stmt = $pdo->prepare("
            INSERT INTO pooling_payments (booking_id, amount)
            VALUES (?, ?)
        ");
        $stmt->execute([$bookingId, $input['totalAmount']]);
        
        $pdo->commit();
        
        $response = [
            'id' => $bookingId,
            'userId' => $input['userId'] ?? null,
            'rideId' => $input['rideId'],
            'passengerName' => $input['passengerName'],
            'passengerPhone' => $input['passengerPhone'],
            'passengerEmail' => $input['passengerEmail'],
            'seatsBooked' => $input['seatsBooked'],
            'totalAmount' => $input['totalAmount'],
            'status' => 'pending',
            'paymentStatus' => 'pending',
            'bookingDate' => date('Y-m-d H:i:s')
        ];
        
        sendResponse($response, 201);
        
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log('Database error in create booking: ' . $e->getMessage());
        sendError('Failed to create booking', 500);
    }
}

function handleUpdateBooking() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $bookingId = $input['id'] ?? null;
    
    if (!$bookingId) {
        sendError('Booking ID is required');
    }
    
    try {
        $updates = [];
        $params = [];
        
        if (isset($input['booking_status'])) {
            $updates[] = "booking_status = ?";
            $params[] = $input['booking_status'];
        }
        
        if (isset($input['payment_status'])) {
            $updates[] = "payment_status = ?";
            $params[] = $input['payment_status'];
        }
        
        if (isset($input['razorpay_payment_id'])) {
            $updates[] = "razorpay_payment_id = ?";
            $params[] = $input['razorpay_payment_id'];
        }
        
        if (empty($updates)) {
            sendError('No fields to update');
        }
        
        $params[] = $bookingId;
        $sql = "UPDATE pooling_bookings SET " . implode(', ', $updates) . " WHERE id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        sendResponse(['message' => 'Booking updated successfully']);
        
    } catch (PDOException $e) {
        error_log('Database error in update booking: ' . $e->getMessage());
        sendError('Failed to update booking', 500);
    }
}

function handleDeleteBooking() {
    global $pdo;

    $input = json_decode(file_get_contents('php://input'), true);
    $bookingId = $input['id'] ?? null;

    if (!$bookingId) {
        sendError('Booking ID is required for deletion');
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM pooling_bookings WHERE id = ?");
        $stmt->execute([$bookingId]);

        if ($stmt->rowCount() === 0) {
            sendError('Booking not found or already deleted', 404);
        }

        sendResponse(['message' => 'Booking deleted successfully']);
    } catch (PDOException $e) {
        error_log('Database error in delete booking: ' . $e->getMessage());
        sendError('Failed to delete booking', 500);
    }
}
?>
