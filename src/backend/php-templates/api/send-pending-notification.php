<?php
/**
 * Send pending payment notification emails
 * Called when customer abandons payment, cancels Razorpay modal, or clicks Back
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    http_response_code(405);
    exit;
}

$logDir = __DIR__ . '/../logs';
if (!file_exists($logDir)) mkdir($logDir, 0777, true);

try {
    require_once __DIR__ . '/../config.php';
    require_once __DIR__ . '/utils/email.php';
} catch (Throwable $e) {
    error_log('send-pending-notification init: ' . $e->getMessage());
    file_put_contents($logDir . '/send_pending_' . date('Y-m-d') . '.log', date('Y-m-d H:i:s') . " Init failed: " . $e->getMessage() . "\n", FILE_APPEND);
    echo json_encode(['success' => false, 'error' => 'Server configuration error']);
    http_response_code(500);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$bookingId = $input['booking_id'] ?? $input['bookingId'] ?? null;
$reason = $input['reason'] ?? 'abandoned';

if (!$bookingId) {
    echo json_encode(['success' => false, 'error' => 'booking_id required']);
    http_response_code(400);
    exit;
}

try {
    $conn = getDbConnection();
    if (!$conn) {
        throw new Exception('Database connection failed');
    }

    $stmt = $conn->prepare("
        SELECT id, booking_number, pickup_location, drop_location, pickup_date, return_date,
               cab_type, distance, trip_type, trip_mode, total_amount, status, payment_status,
               passenger_name, passenger_phone, passenger_email, created_at
        FROM bookings WHERE id = ?
    ");
    $stmt->bind_param('i', $bookingId);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    $stmt->close();
    $conn->close();

    if (!$row) {
        echo json_encode(['success' => false, 'error' => 'Booking not found']);
        http_response_code(404);
        exit;
    }

    $paymentStatus = $row['payment_status'] ?? $row['status'] ?? '';
    if (in_array(strtolower($paymentStatus), ['paid', 'confirmed'])) {
        echo json_encode(['success' => true, 'message' => 'Booking already paid, no notification sent']);
        exit;
    }

    $expiresAt = time() + (30 * 60); // Link valid for 30 minutes
    $booking = [
        'id' => $row['id'],
        'bookingNumber' => $row['booking_number'],
        'pickupLocation' => $row['pickup_location'],
        'dropLocation' => $row['drop_location'],
        'pickupDate' => $row['pickup_date'],
        'returnDate' => $row['return_date'],
        'cabType' => $row['cab_type'],
        'distance' => $row['distance'],
        'tripType' => $row['trip_type'],
        'tripMode' => $row['trip_mode'],
        'totalAmount' => (float)($row['total_amount'] ?? 0),
        'passengerName' => $row['passenger_name'],
        'passengerPhone' => $row['passenger_phone'],
        'passengerEmail' => $row['passenger_email'],
        'payment_status' => $paymentStatus,
        'paymentLinkExpiresAt' => $expiresAt,
    ];

    if (!function_exists('sendPendingPaymentEmailToCustomer')) {
        throw new Exception('Email functions not loaded');
    }
    // Deduplicate: don't send again if we sent in the last 5 minutes (user might cancel + close browser)
    $cacheDir = __DIR__ . '/../cache';
    if (!file_exists($cacheDir)) mkdir($cacheDir, 0777, true);
    $cacheKey = 'pending_email_' . $bookingId;
    $cacheFile = $cacheDir . '/' . $cacheKey;
    $lastSent = file_exists($cacheFile) ? (int)file_get_contents($cacheFile) : 0;
    if (($lastSent + 300) > time()) {
        file_put_contents($logDir . '/send_pending_' . date('Y-m-d') . '.log', date('Y-m-d H:i:s') . " Skipped duplicate for booking $bookingId\n", FILE_APPEND);
        echo json_encode(['success' => true, 'message' => 'Notification already sent recently']);
        exit;
    }
    sendPendingPaymentEmailToCustomer($booking);
    sendPendingPaymentNotificationToAdmin($booking, in_array($reason, ['cancelled', 'user_cancelled']) ? 'cancelled' : 'abandoned');
    file_put_contents($cacheFile, (string)time());

    file_put_contents($logDir . '/send_pending_' . date('Y-m-d') . '.log', date('Y-m-d H:i:s') . " Sent for booking $bookingId\n", FILE_APPEND);
    echo json_encode(['success' => true, 'message' => 'Pending notification emails sent']);
} catch (Throwable $e) {
    error_log('send-pending-notification error: ' . $e->getMessage());
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    http_response_code(500);
}
