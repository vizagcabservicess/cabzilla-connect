
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
            FROM pooling_requests r
            JOIN pooling_rides pr ON r.ride_id = pr.id
            ORDER BY r.created_at DESC
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
            SELECT * FROM pooling_requests 
            WHERE ride_id = ? 
            ORDER BY created_at DESC
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
            SELECT r.*, pr.from_location, pr.to_location, pr.departure_time
            FROM pooling_requests r
            JOIN pooling_rides pr ON r.ride_id = pr.id
            WHERE r.guest_id = ?
            ORDER BY r.created_at DESC
        ");
        $stmt->execute([$userId]);
        $requests = $stmt->fetchAll();
        
        sendResponse($requests);
        
    } catch (PDOException $e) {
        error_log('Get requests by user error: ' . $e->getMessage());
        sendError('Failed to get requests', 500);
    }
}

function handleCreateRequest() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $input = sanitizeInput($input);
    
    $required_fields = ['rideId', 'guestId', 'guestName', 'guestPhone', 'guestEmail', 'seatsRequested'];
    $errors = validateInput($input, $required_fields);
    
    if (!empty($errors)) {
        sendError(implode(', ', $errors));
    }
    
    try {
        // Check if ride exists and has available seats
        $stmt = $pdo->prepare("SELECT available_seats FROM pooling_rides WHERE id = ? AND status = 'active'");
        $stmt->execute([$input['rideId']]);
        $ride = $stmt->fetch();
        
        if (!$ride) {
            sendError('Ride not found or not active', 404);
        }
        
        if ($ride['available_seats'] < $input['seatsRequested']) {
            sendError('Not enough seats available', 400);
        }
        
        // Check if user already has a pending request for this ride
        $stmt = $pdo->prepare("
            SELECT id FROM pooling_requests 
            WHERE ride_id = ? AND guest_id = ? AND status = 'pending'
        ");
        $stmt->execute([$input['rideId'], $input['guestId']]);
        if ($stmt->fetch()) {
            sendError('You already have a pending request for this ride', 409);
        }
        
        // Create request
        $stmt = $pdo->prepare("
            INSERT INTO pooling_requests 
            (ride_id, guest_id, guest_name, guest_phone, guest_email, seats_requested, request_message, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
        ");
        $stmt->execute([
            $input['rideId'],
            $input['guestId'],
            $input['guestName'],
            $input['guestPhone'],
            $input['guestEmail'],
            $input['seatsRequested'],
            $input['requestMessage'] ?? ''
        ]);
        
        $requestId = $pdo->lastInsertId();
        
        // Get the created request
        $stmt = $pdo->prepare("SELECT * FROM pooling_requests WHERE id = ?");
        $stmt->execute([$requestId]);
        $request = $stmt->fetch();
        
        sendResponse($request, 201);
        
    } catch (PDOException $e) {
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
        $stmt = $pdo->prepare("SELECT * FROM pooling_requests WHERE id = ? AND status = 'pending'");
        $stmt->execute([$requestId]);
        $request = $stmt->fetch();
        
        if (!$request) {
            sendError('Request not found or already processed', 404);
        }
        
        // Update request status
        $stmt = $pdo->prepare("
            UPDATE pooling_requests 
            SET status = 'approved', response_message = ?, responded_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$responseMessage, $requestId]);
        
        $pdo->commit();
        
        sendResponse(['message' => 'Request approved successfully']);
        
    } catch (PDOException $e) {
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
            UPDATE pooling_requests 
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
