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

// Include database connection and helper functions
require_once __DIR__ . '/utils/database.php';

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
    // Verify if the signature matches
    if ($generated_signature == $razorpay_signature) {
        $conn = getDbConnection();
        
        // Get order details
        $stmt = $conn->prepare("SELECT amount FROM razorpay_orders WHERE order_id = ?");
        if (!$stmt) {
            file_put_contents(__DIR__ . '/debug.log', 'Prepare failed: ' . $conn->error . PHP_EOL, FILE_APPEND);
            echo json_encode(['error' => 'DB prepare failed: ' . $conn->error]);
            http_response_code(500);
            exit;
        }
        $stmt->bind_param("s", $razorpay_order_id);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result->num_rows === 0) {
            file_put_contents(__DIR__ . '/debug.log', 'Order not found for order_id: ' . $razorpay_order_id . PHP_EOL, FILE_APPEND);
            echo json_encode(['error' => 'Order not found']);
            http_response_code(404);
            exit;
        }
        $order = $result->fetch_assoc();
        $amount = $order['amount'] / 100; // Convert from paise to rupees
        
        // Record the payment
        $stmt = $conn->prepare("INSERT INTO payments 
                               (razorpay_payment_id, razorpay_order_id, amount, status, payment_method, created_at) 
                               VALUES (?, ?, ?, 'paid', 'razorpay', NOW())");
        if (!$stmt) {
            file_put_contents(__DIR__ . '/debug.log', 'Prepare failed (insert payment): ' . $conn->error . PHP_EOL, FILE_APPEND);
            echo json_encode(['error' => 'DB prepare failed: ' . $conn->error]);
            http_response_code(500);
            exit;
        }
        $stmt->bind_param("ssd", $razorpay_payment_id, $razorpay_order_id, $amount);
        $stmt->execute();
        if ($stmt->error) {
            file_put_contents(__DIR__ . '/debug.log', 'Database Error (insert payment): ' . $stmt->error . PHP_EOL, FILE_APPEND);
            echo json_encode(['error' => 'Failed to record payment', 'details' => $stmt->error]);
            http_response_code(500);
            exit;
        }
        
        // If booking ID is provided, update the regular booking payment status
        if ($booking_id) {
            file_put_contents(__DIR__ . '/debug.log', 'Updating booking payment status for booking_id: ' . $booking_id . PHP_EOL, FILE_APPEND);
            
            // Update the main bookings table (not pooling_bookings)
            $updateStmt = $conn->prepare("UPDATE bookings SET 
                payment_status = 'paid', 
                status = 'confirmed', 
                razorpay_payment_id = ?, 
                razorpay_order_id = ?, 
                razorpay_signature = ?,
                updated_at = NOW()
                WHERE id = ?");
            
            if ($updateStmt) {
                $updateStmt->bind_param("sssi", $razorpay_payment_id, $razorpay_order_id, $razorpay_signature, $booking_id);
                $updateStmt->execute();
                if ($updateStmt->error) {
                    file_put_contents(__DIR__ . '/debug.log', 'Database Error (update bookings): ' . $updateStmt->error . PHP_EOL, FILE_APPEND);
                } else {
                    file_put_contents(__DIR__ . '/debug.log', 'Successfully updated booking payment status for booking_id: ' . $booking_id . PHP_EOL, FILE_APPEND);
                }
            } else {
                file_put_contents(__DIR__ . '/debug.log', 'Failed to prepare update statement: ' . $conn->error . PHP_EOL, FILE_APPEND);
            }
        }
        
        $stmt->close();
        $conn->close();
        echo json_encode([
            'success' => true,
            'message' => 'Payment verified successfully'
        ]);
    } else {
        file_put_contents(__DIR__ . '/debug.log', 'Signature verification failed. Generated: ' . $generated_signature . ' Provided: ' . $razorpay_signature . PHP_EOL, FILE_APPEND);
        echo json_encode([
            'success' => false,
            'error' => 'Payment signature verification failed'
        ]);
        http_response_code(400);
    }
} catch (Exception $e) {
    file_put_contents(__DIR__ . '/debug.log', 'Exception: ' . $e->getMessage() . PHP_EOL, FILE_APPEND);
    error_log("Exception: " . $e->getMessage());
    echo json_encode(['error' => 'Internal server error', 'details' => $e->getMessage()]);
    http_response_code(500);
}
