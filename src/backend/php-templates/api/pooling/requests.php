<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $action = $_GET['action'] ?? '';
        switch ($action) {
            case 'by-ride':
                handleGetByRide();
                break;
            case 'by-user':
                handleGetByUser();
                break;
            case 'by-provider':
                handleGetByProvider();
                break;
            default:
                handleGetRequests();
        }
        break;
    case 'POST':
        handleCreateRequest();
        break;
    case 'PUT':
        $action = $_GET['action'] ?? '';
        switch ($action) {
            case 'approve':
                handleApproveRequest();
                break;
            case 'reject':
                handleRejectRequest();
                break;
            default:
                sendError('Invalid action');
        }
        break;
    default:
        sendError('Method not allowed', 405);
}

function handleGetRequests() {
    global $pdo;
    
    try {
        $stmt = $pdo->prepare("
            SELECT r.*, pr.from_location, pr.to_location, pr.departure_time
            FROM pooling_ride_requests r
            JOIN pooling_rides pr ON r.ride_id = pr.id
            ORDER BY r.requested_at DESC
        ");
        $stmt->execute();
        $requests = $stmt->fetchAll();
        
        sendResponse($requests);
        
    } catch (PDOException $e) {
        error_log('Get requests error: ' . $e->getMessage());
        sendError('Failed to get requests', 500);
    }
}

function handleGetByRide() {
    global $pdo;
    
    $rideId = $_GET['ride_id'] ?? null;
    if (!$rideId) {
        sendError('Ride ID is required');
    }
    
    try {
        $stmt = $pdo->prepare("
            SELECT * FROM pooling_ride_requests 
            WHERE ride_id = ? 
            ORDER BY requested_at DESC
        ");
        $stmt->execute([$rideId]);
        $requests = $stmt->fetchAll();
        
        sendResponse($requests);
        
    } catch (PDOException $e) {
        error_log('Get requests by ride error: ' . $e->getMessage());
        sendError('Failed to get requests', 500);
    }
}

function handleGetByUser() {
    global $pdo;
    
    $userId = $_GET['user_id'] ?? null;
    if (!$userId) {
        sendError('User ID is required');
    }
    
    try {
        $stmt = $pdo->prepare("
            SELECT r.*, pr.from_location, pr.to_location, pr.departure_time, b.payment_status
            FROM pooling_ride_requests r
            JOIN pooling_rides pr ON r.ride_id = pr.id
            LEFT JOIN pooling_bookings b ON r.ride_id = b.ride_id AND r.guest_id = b.user_id
            WHERE r.guest_id = ?
            ORDER BY r.requested_at DESC
        ");
        $stmt->execute([$userId]);
        $requests = $stmt->fetchAll();
        
        sendResponse($requests);
        
    } catch (PDOException $e) {
        error_log('Get requests by user error: ' . $e->getMessage());
        sendError('Failed to get requests', 500);
    }
}

function handleGetByProvider() {
    global $pdo;
    $providerId = $_GET['provider_id'] ?? null;
    file_put_contents(__DIR__ . '/debug_requests.log', "handleGetByProvider called with providerId: " . $providerId . "\n", FILE_APPEND);
    if (!$providerId) {
        sendError('Provider ID is required');
    }
    try {
        $stmt = $pdo->prepare("
            SELECT r.*, pr.from_location, pr.to_location, pr.departure_time
            FROM pooling_ride_requests r
            JOIN pooling_rides pr ON r.ride_id = pr.id
            WHERE pr.provider_id = ?
            ORDER BY r.requested_at DESC
        ");
        $stmt->execute([$providerId]);
        $requests = $stmt->fetchAll();
        file_put_contents(__DIR__ . '/debug_requests.log', "Fetched " . count($requests) . " requests for providerId: " . $providerId . "\n", FILE_APPEND);
        sendResponse($requests);
    } catch (PDOException $e) {
        file_put_contents(__DIR__ . '/debug_requests.log', "PDOException in handleGetByProvider: " . $e->getMessage() . "\n", FILE_APPEND);
        error_log('Get requests by provider error: ' . $e->getMessage());
        sendError('Failed to get requests', 500);
    }
}

function handleCreateRequest() {
    global $pdo;
    
    file_put_contents(__DIR__ . '/debug_requests.log', "handleCreateRequest called\n", FILE_APPEND);
    file_put_contents(__DIR__ . '/debug_requests.log', "RAW: " . file_get_contents('php://input') . "\n", FILE_APPEND);
    $input = json_decode(file_get_contents('php://input'), true);
    file_put_contents(__DIR__ . '/debug_requests.log', "Parsed input: " . print_r($input, true) . "\n", FILE_APPEND);
    $input = sanitizeInput($input);
    $required_fields = ['rideId', 'guestId', 'seatsRequested'];
    $errors = validateInput($input, $required_fields);
    if (!empty($errors)) {
        file_put_contents(__DIR__ . '/debug_requests.log', "Validation errors: " . print_r($errors, true) . "\n", FILE_APPEND);
        sendError(implode(', ', $errors));
    }
    try {
        // Check if ride exists and has available seats
        $stmt = $pdo->prepare("SELECT available_seats FROM pooling_rides WHERE id = ? AND status = 'active'");
        $stmt->execute([$input['rideId']]);
        $ride = $stmt->fetch();
        if (!$ride) {
            file_put_contents(__DIR__ . '/debug_requests.log', "Ride not found or not active for rideId: " . $input['rideId'] . "\n", FILE_APPEND);
            sendError('Ride not found or not active', 404);
        }
        if ($ride['available_seats'] < $input['seatsRequested']) {
            file_put_contents(__DIR__ . '/debug_requests.log', "Not enough seats for rideId: " . $input['rideId'] . ", requested: " . $input['seatsRequested'] . ", available: " . $ride['available_seats'] . "\n", FILE_APPEND);
            sendError('Not enough seats available', 400);
        }
        // Check if user already has a pending request for this ride
        $stmt = $pdo->prepare("
            SELECT id FROM pooling_ride_requests 
            WHERE ride_id = ? AND guest_id = ? AND status = 'pending'
        ");
        $stmt->execute([$input['rideId'], $input['guestId']]);
        if ($stmt->fetch()) {
            file_put_contents(__DIR__ . '/debug_requests.log', "Duplicate pending request for rideId: " . $input['rideId'] . ", guestId: " . $input['guestId'] . "\n", FILE_APPEND);
            sendError('You already have a pending request for this ride', 409);
        }
        // Create request
        $stmt = $pdo->prepare("
            INSERT INTO pooling_ride_requests 
            (ride_id, guest_id, seats_requested, request_message, status, requested_at, guest_name, guest_phone, guest_email)
            VALUES (?, ?, ?, ?, 'pending', NOW(), ?, ?, ?)
        ");
        $stmt->execute([
            $input['rideId'],
            $input['guestId'],
            $input['seatsRequested'],
            $input['requestMessage'] ?? '',
            $input['guestName'] ?? '',
            $input['guestPhone'] ?? '',
            $input['guestEmail'] ?? ''
        ]);
        file_put_contents(__DIR__ . '/debug_requests.log', "Executed INSERT, lastInsertId: " . $pdo->lastInsertId() . "\n", FILE_APPEND);
        $requestId = $pdo->lastInsertId();
        // Get the created request
        $stmt = $pdo->prepare("SELECT * FROM pooling_ride_requests WHERE id = ?");
        $stmt->execute([$requestId]);
        $request = $stmt->fetch();
        sendResponse($request, 201);
    } catch (PDOException $e) {
        file_put_contents(__DIR__ . '/debug_requests.log', "PDOException: " . $e->getMessage() . "\n", FILE_APPEND);
        error_log('Create request error: ' . $e->getMessage());
        sendError('Failed to create request', 500);
    }
}

function handleApproveRequest() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $requestId = $input['id'] ?? null;
    $responseMessage = $input['responseMessage'] ?? 'Request approved';
    
    if (!$requestId) {
        sendError('Request ID is required');
    }
    
    try {
        $pdo->beginTransaction();
        
        // Get request details
        $stmt = $pdo->prepare("SELECT * FROM pooling_ride_requests WHERE id = ? AND status = 'pending'");
        $stmt->execute([$requestId]);
        $request = $stmt->fetch();
        
        if (!$request) {
            sendError('Request not found or already processed', 404);
        }
        
        // Update request status
        $stmt = $pdo->prepare("
            UPDATE pooling_ride_requests 
            SET status = 'approved', response_message = ?, responded_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$responseMessage, $requestId]);

        // Fetch guest_id for notification
        $guestId = $request['guest_id'];
        // Create payment notification for guest
        $actionUrl = "/pay?requestId=" . $requestId;
        $title = "Payment Pending";
        $message = "Your ride request has been approved. Please complete your payment.";
        $stmt = $pdo->prepare("INSERT INTO notifications (user_id, type, title, message, action_url, created_at) VALUES (?, 'payment_reminder', ?, ?, ?, NOW())");
        $stmt->execute([$guestId, $title, $message, $actionUrl]);
        
        $pdo->commit();
        
        sendResponse(['message' => 'Request approved successfully']);
        
    } catch (PDOException $e) {
        file_put_contents(__DIR__ . '/debug_requests.log', "PDOException in handleApproveRequest: " . $e->getMessage() . PHP_EOL, FILE_APPEND);
        $pdo->rollBack();
        error_log('Approve request error: ' . $e->getMessage());
        sendError('Failed to approve request', 500);
    }
}

function handleRejectRequest() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $requestId = $input['id'] ?? null;
    $responseMessage = $input['responseMessage'] ?? 'Request rejected';
    
    if (!$requestId) {
        sendError('Request ID is required');
    }
    
    try {
        // Update request status
        $stmt = $pdo->prepare("
            UPDATE pooling_ride_requests 
            SET status = 'rejected', response_message = ?, responded_at = NOW()
            WHERE id = ? AND status = 'pending'
        ");
        $stmt->execute([$responseMessage, $requestId]);
        
        if ($stmt->rowCount() === 0) {
            sendError('Request not found or already processed', 404);
        }
        
        sendResponse(['message' => 'Request rejected successfully']);
        
    } catch (PDOException $e) {
        error_log('Reject request error: ' . $e->getMessage());
        sendError('Failed to reject request', 500);
    }
}
?>
