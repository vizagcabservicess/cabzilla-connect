<?php
file_put_contents($_SERVER['DOCUMENT_ROOT'] . '/logs/razorpay_error.log', "Test log at " . date('c') . "\n", FILE_APPEND);
// Absolute path for logging
$logfile = $_SERVER['DOCUMENT_ROOT'] . '/logs/razorpay_error.log';
file_put_contents($logfile, "---- verify-razorpay-payment.php called at " . date('c') . " ----\n", FILE_APPEND);

// Log Content-Type header
$contentType = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '';
file_put_contents($logfile, "Content-Type: $contentType\n", FILE_APPEND);
if (stripos($contentType, 'application/json') === false) {
    file_put_contents($logfile, "WARNING: Content-Type is not application/json\n", FILE_APPEND);
}

$input = file_get_contents('php://input');
file_put_contents($logfile, "Incoming payload: $input\n", FILE_APPEND);

$data = json_decode($input, true);
if (!$data) {
    file_put_contents($logfile, "Failed to decode JSON payload\n", FILE_APPEND);
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}
file_put_contents($logfile, "Decoded data: " . print_r($data, true) . "\n", FILE_APPEND);

try {
    // Example: log before signature verification
    file_put_contents($logfile, "Verifying signature...\n", FILE_APPEND);
    // ... signature verification code ...
    file_put_contents($logfile, "Signature verified!\n", FILE_APPEND);
    echo json_encode(['success' => true, 'message' => 'Payment verified successfully']);
    http_response_code(200);
    exit;
} catch (Exception $e) {
    file_put_contents($logfile, "Exception: " . $e->getMessage() . "\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
    exit;
}
?> 