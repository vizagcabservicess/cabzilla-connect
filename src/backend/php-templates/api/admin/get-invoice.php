<?php
// get-invoice.php: Fetch the latest invoice for a booking
require_once __DIR__ . '/../../config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

$bookingId = isset($_GET['booking_id']) ? intval($_GET['booking_id']) : 0;
if (!$bookingId) {
    sendJsonResponse(['status' => 'error', 'message' => 'Missing or invalid booking_id'], 400);
}

try {
    $dbHost = 'localhost';
    $dbName = 'u644605165_db_be';
    $dbUser = 'u644605165_usr_be';
    $dbPass = 'Vizag@1213';
    $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
    if ($conn->connect_error) {
        throw new Exception('Database connection failed: ' . $conn->connect_error);
    }
    $conn->set_charset('utf8mb4');

    $stmt = $conn->prepare('SELECT * FROM invoices WHERE booking_id = ? ORDER BY id DESC LIMIT 1');
    $stmt->bind_param('i', $bookingId);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        sendJsonResponse(['status' => 'error', 'message' => 'No invoice found for this booking'], 404);
    }
    $invoice = $result->fetch_assoc();
    sendJsonResponse(['status' => 'success', 'invoice' => $invoice]);
} catch (Exception $e) {
    sendJsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
} 