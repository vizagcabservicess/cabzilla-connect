<?php
/**
 * Test script to update a booking with partial payment data
 */

require_once __DIR__ . '/utils/database.php';
require_once __DIR__ . '/utils/response.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    // Connect to the database
    $db = getDbConnectionWithRetry();
    
    // Get the latest booking for testing
    $stmt = $db->prepare("SELECT id, booking_number, total_amount FROM bookings ORDER BY created_at DESC LIMIT 1");
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendJsonResponse([
            'status' => 'error',
            'message' => 'No bookings found for testing'
        ]);
        exit;
    }
    
    $booking = $result->fetch_assoc();
    $bookingId = $booking['id'];
    $totalAmount = $booking['total_amount'];
    $advanceAmount = round($totalAmount * 0.3); // 30% advance payment
    
    // Update the booking with partial payment data
    $updateStmt = $db->prepare("
        UPDATE bookings 
        SET payment_status = 'payment_pending',
            payment_method = 'razorpay',
            advance_paid_amount = ?,
            razorpay_payment_id = 'test_payment_123',
            razorpay_order_id = 'test_order_456',
            razorpay_signature = 'test_signature_789',
            updated_at = NOW()
        WHERE id = ?
    ");
    
    $updateStmt->bind_param("di", $advanceAmount, $bookingId);
    $success = $updateStmt->execute();
    
    if ($success) {
        // Fetch the updated booking to verify
        $verifyStmt = $db->prepare("SELECT * FROM bookings WHERE id = ?");
        $verifyStmt->bind_param("i", $bookingId);
        $verifyStmt->execute();
        $verifyResult = $verifyStmt->get_result();
        $updatedBooking = $verifyResult->fetch_assoc();
        
        sendJsonResponse([
            'status' => 'success',
            'message' => 'Test partial payment data updated successfully',
            'booking_id' => $bookingId,
            'booking_number' => $booking['booking_number'],
            'total_amount' => $totalAmount,
            'advance_paid_amount' => $advanceAmount,
            'payment_status' => $updatedBooking['payment_status'],
            'payment_method' => $updatedBooking['payment_method'],
            'remaining_balance' => $totalAmount - $advanceAmount,
            'percentage_paid' => round(($advanceAmount / $totalAmount) * 100, 2)
        ]);
    } else {
        sendJsonResponse([
            'status' => 'error',
            'message' => 'Failed to update booking with partial payment data',
            'error' => $updateStmt->error
        ]);
    }
    
} catch (Exception $e) {
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Failed to test partial payment: ' . $e->getMessage(),
        'error' => $e->getMessage()
    ], 500);
}

// Close database connection
if (isset($db) && $db instanceof mysqli) {
    $db->close();
}
?>

