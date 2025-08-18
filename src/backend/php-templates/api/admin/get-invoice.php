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
    // Use the correct database connection from config.php
    $conn = getDbConnection();
    
    // Check if booking exists first
    $bookingStmt = $conn->prepare('SELECT * FROM bookings WHERE id = ?');
    $bookingStmt->bind_param('i', $bookingId);
    $bookingStmt->execute();
    $bookingResult = $bookingStmt->get_result();
    
    if ($bookingResult->num_rows === 0) {
        sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
    }
    
    $booking = $bookingResult->fetch_assoc();
    
    // Generate invoice data on-the-fly instead of looking for invoices table
    $invoiceData = [
        'id' => $bookingId,
        'booking_id' => $bookingId,
        'invoice_number' => 'INV-' . date('Ymd') . '-' . $bookingId,
        'booking_number' => $booking['booking_number'],
        'passenger_name' => $booking['passenger_name'],
        'passenger_phone' => $booking['passenger_phone'],
        'passenger_email' => $booking['passenger_email'],
        'pickup_location' => $booking['pickup_location'],
        'drop_location' => $booking['drop_location'],
        'pickup_date' => $booking['pickup_date'],
        'total_amount' => $booking['total_amount'],
        'advance_paid_amount' => $booking['advance_paid_amount'],
        'payment_status' => $booking['payment_status'],
        'status' => $booking['status'],
        'trip_type' => $booking['trip_type'],
        'cab_type' => $booking['cab_type'],
        'created_at' => $booking['created_at'],
        'updated_at' => $booking['updated_at']
    ];
    
    sendJsonResponse(['status' => 'success', 'invoice' => $invoiceData]);
} catch (Exception $e) {
    sendJsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
} 