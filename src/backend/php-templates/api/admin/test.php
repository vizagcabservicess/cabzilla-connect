
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Parse JSON data from the request body if it's a POST request
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    
    echo json_encode([
        'status' => 'success',
        'message' => 'API test successful',
        'test' => 123,
        'received_data' => $data,
        'method' => 'POST'
    ]);
} else {
    echo json_encode([
        'status' => 'success',
        'message' => 'API test successful',
        'test' => 123,
        'method' => $_SERVER['REQUEST_METHOD']
    ]);
}
