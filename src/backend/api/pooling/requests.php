
<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'POST':
        createRequest();
        break;
    case 'GET':
        getRequests();
        break;
    case 'PUT':
        updateRequest();
        break;
    default:
        sendError('Method not allowed', 405);
}

function createRequest() {
    global $pdo;
    
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            sendError('Invalid JSON input');
        }
        
        // Validate required fields
        $required = ['rideId', 'guestId', 'guestName', 'guestPhone', 'guestEmail', 'seatsRequested'];
        foreach ($required as $field) {
            if (!isset($input[$field]) || empty($input[$field])) {
                sendError("Missing required field: $field");
            }
        }
        
        $sql = "INSERT INTO pooling_requests (
            ride_id, guest_id, guest_name, guest_phone, guest_email, 
            seats_requested, status, request_message, requested_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $input['rideId'],
            $input['guestId'],
            $input['guestName'],
            $input['guestPhone'],
            $input['guestEmail'],
            $input['seatsRequested'],
            $input['status'] ?? 'pending',
            $input['requestMessage'] ?? ''
        ]);
        
        $requestId = $pdo->lastInsertId();
        
        // Get the created request
        $stmt = $pdo->prepare("SELECT * FROM pooling_requests WHERE id = ?");
        $stmt->execute([$requestId]);
        $request = $stmt->fetch();
        
        if ($request) {
            sendResponse([
                'id' => (int)$request['id'],
                'rideId' => (int)$request['ride_id'],
                'guestId' => (int)$request['guest_id'],
                'guestName' => $request['guest_name'],
                'guestPhone' => $request['guest_phone'],
                'guestEmail' => $request['guest_email'],
                'seatsRequested' => (int)$request['seats_requested'],
                'status' => $request['status'],
                'requestMessage' => $request['request_message'],
                'requestedAt' => $request['requested_at']
            ]);
        } else {
            sendError('Failed to retrieve created request');
        }
        
    } catch (PDOException $e) {
        error_log('Database error in createRequest: ' . $e->getMessage());
        sendError('Database error occurred', 500);
    }
}

function getRequests() {
    global $pdo;
    
    try {
        $action = $_GET['action'] ?? '';
        
        if ($action === 'by-provider') {
            $providerId = $_GET['provider_id'] ?? '';
            if (!$providerId) {
                sendError('Missing provider_id parameter');
            }
            
            $sql = "
                SELECT 
                    r.id,
                    r.ride_id,
                    r.guest_id,
                    r.guest_name,
                    r.guest_phone,
                    r.guest_email,
                    r.seats_requested,
                    r.status,
                    r.request_message,
                    r.requested_at,
                    ride.from_location,
                    ride.to_location,
                    ride.departure_time
                FROM pooling_requests r
                JOIN pooling_rides ride ON r.ride_id = ride.id
                WHERE ride.provider_id = ?
                ORDER BY r.requested_at DESC
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$providerId]);
            $requests = $stmt->fetchAll();
            
            $formatted_requests = array_map(function($req) {
                return [
                    'id' => (int)$req['id'],
                    'rideId' => (int)$req['ride_id'],
                    'guestId' => (int)$req['guest_id'],
                    'guestName' => $req['guest_name'],
                    'guestPhone' => $req['guest_phone'],
                    'guestEmail' => $req['guest_email'],
                    'seatsRequested' => (int)$req['seats_requested'],
                    'status' => $req['status'],
                    'requestMessage' => $req['request_message'],
                    'requestedAt' => $req['requested_at'],
                    'rideDetails' => [
                        'fromLocation' => $req['from_location'],
                        'toLocation' => $req['to_location'],
                        'departureTime' => $req['departure_time']
                    ]
                ];
            }, $requests);
            
            sendResponse($formatted_requests);
        } else {
            sendError('Invalid action parameter');
        }
        
    } catch (PDOException $e) {
        error_log('Database error in getRequests: ' . $e->getMessage());
        sendError('Database error occurred', 500);
    }
}

function updateRequest() {
    global $pdo;
    
    try {
        $action = $_GET['action'] ?? '';
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['id'])) {
            sendError('Missing request ID');
        }
        
        $requestId = $input['id'];
        
        if ($action === 'approve') {
            $sql = "UPDATE pooling_requests SET status = 'approved', response_message = ? WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$input['responseMessage'] ?? '', $requestId]);
            
            sendResponse(['success' => true, 'message' => 'Request approved']);
        } elseif ($action === 'reject') {
            $sql = "UPDATE pooling_requests SET status = 'rejected', response_message = ? WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$input['responseMessage'] ?? '', $requestId]);
            
            sendResponse(['success' => true, 'message' => 'Request rejected']);
        } else {
            sendError('Invalid action');
        }
        
    } catch (PDOException $e) {
        error_log('Database error in updateRequest: ' . $e->getMessage());
        sendError('Database error occurred', 500);
    }
}
?>
