<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check if it's a POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'Only POST requests are allowed']);
    http_response_code(405);
    exit;
}

// Get the request body
$data = json_decode(file_get_contents('php://input'), true);

// Validate required parameters
if (!isset($data['razorpay_payment_id']) || !isset($data['razorpay_order_id']) || !isset($data['razorpay_signature'])) {
    file_put_contents(__DIR__ . '/debug.log', 'Missing required parameters: ' . json_encode($data) . PHP_EOL, FILE_APPEND);
    echo json_encode(['error' => 'Missing required parameters']);
    http_response_code(400);
    exit;
}

// Include database connection and helper functions (best-effort)
$dbAvailable = false;
try {
    require_once __DIR__ . '/utils/database.php';
    $dbAvailable = true;
} catch (Throwable $e) {
    file_put_contents(__DIR__ . '/debug.log', 'WARN: DB utils not available: ' . $e->getMessage() . PHP_EOL, FILE_APPEND);
}

// Load Razorpay API keys
$key_id = "rzp_test_41fJeGiVFyU9OQ"; // Test key
$key_secret = "ZbNPHrr9CmMyMnm7TzJOJozH"; // Test secret

// Extract payment details
$razorpay_payment_id = $data['razorpay_payment_id'];
$razorpay_order_id = $data['razorpay_order_id'];
$razorpay_signature = $data['razorpay_signature'];
$booking_id = $data['booking_id'] ?? null;

// Generate the signature to verify the payment
$generated_signature = hash_hmac('sha256', $razorpay_order_id . "|" . $razorpay_payment_id, $key_secret);

file_put_contents(__DIR__ . '/debug.log', 'verify-razorpay-payment.php called: ' . file_get_contents('php://input') . PHP_EOL, FILE_APPEND);

try {
    // Verify signature
    if ($generated_signature != $razorpay_signature) {
        file_put_contents(__DIR__ . '/debug.log', 'Signature verification failed. Generated: ' . $generated_signature . ' Provided: ' . $razorpay_signature . PHP_EOL, FILE_APPEND);
        echo json_encode(['success' => false, 'error' => 'Payment signature verification failed']);
        http_response_code(400);
        exit;
    }

    $amount = null;
    $db_booking_id = null;
    if ($dbAvailable) {
        try {
            $conn = getDbConnection();
            // Try to fetch order (best effort)
            $stmt = $conn->prepare("SELECT amount, booking_id FROM razorpay_orders WHERE order_id = ?");
            if ($stmt) {
                $stmt->bind_param("s", $razorpay_order_id);
                $stmt->execute();
                $result = $stmt->get_result();
                if ($result && $result->num_rows > 0) {
                    $order = $result->fetch_assoc();
                    $amount = isset($order['amount']) ? ($order['amount'] / 100.0) : null;
                    $db_booking_id = $order['booking_id'] ?? null;
                }
                $stmt->close();
            }

            if (!$booking_id && $db_booking_id) {
                $booking_id = $db_booking_id;
            }

            // Record payment; fall back amount to 0 if unknown
            $payAmount = $amount !== null ? $amount : 0;
            $stmt = $conn->prepare("INSERT INTO payments (razorpay_payment_id, razorpay_order_id, amount, status, payment_method, created_at) VALUES (?, ?, ?, 'paid', 'razorpay', NOW())");
            if ($stmt) {
                $stmt->bind_param("ssd", $razorpay_payment_id, $razorpay_order_id, $payAmount);
                $stmt->execute();
                $stmt->close();
            }

            // Update booking if possible
            if ($booking_id) {
                $update = $conn->prepare("UPDATE bookings SET payment_status='paid', status='confirmed', razorpay_payment_id=?, razorpay_order_id=?, razorpay_signature=?, updated_at=NOW() WHERE id=?");
                if ($update) {
                    $update->bind_param("sssi", $razorpay_payment_id, $razorpay_order_id, $razorpay_signature, $booking_id);
                    $update->execute();
                    $update->close();
                }
            }
            // Call update-booking endpoint as a fallback to ensure status flips to 'paid'
            try {
                $payload = json_encode([
                    'id' => (int)$booking_id,
                    'payment_status' => 'paid',
                    'status' => 'confirmed',
                    'payment_method' => 'razorpay',
                    'razorpay_payment_id' => $razorpay_payment_id,
                    'razorpay_order_id' => $razorpay_order_id,
                    'razorpay_signature' => $razorpay_signature
                ]);
                $ch = curl_init();
                $base = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'];
                $url = rtrim($base, '/') . '/api/update-booking.php';
                curl_setopt_array($ch, [
                    CURLOPT_URL => $url,
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_CUSTOMREQUEST => 'POST',
                    CURLOPT_HTTPHEADER => [ 'Content-Type: application/json' ],
                    CURLOPT_POSTFIELDS => $payload,
                    CURLOPT_TIMEOUT => 10
                ]);
                $resp = curl_exec($ch);
                $cerr = curl_error($ch);
                curl_close($ch);
                file_put_contents(__DIR__ . '/debug.log', 'UPDATE_BOOKING_FALLBACK: resp=' . $resp . ' err=' . $cerr . PHP_EOL, FILE_APPEND);
            } catch (Throwable $e2) {
                file_put_contents(__DIR__ . '/debug.log', 'UPDATE_BOOKING_FALLBACK_EXCEPTION: ' . $e2->getMessage() . PHP_EOL, FILE_APPEND);
            }

            $conn->close();
        } catch (Throwable $e) {
            file_put_contents(__DIR__ . '/debug.log', 'DB exception during verify: ' . $e->getMessage() . PHP_EOL, FILE_APPEND);
            // Continue; verification already passed
        }
    }

    echo json_encode(['success' => true, 'message' => 'Payment verified successfully']);
} catch (Exception $e) {
    file_put_contents(__DIR__ . '/debug.log', 'Exception: ' . $e->getMessage() . PHP_EOL, FILE_APPEND);
    error_log("Exception: " . $e->getMessage());
    echo json_encode(['error' => 'Internal server error', 'details' => $e->getMessage()]);
    http_response_code(500);
}
