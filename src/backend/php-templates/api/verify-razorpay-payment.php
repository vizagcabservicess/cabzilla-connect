
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

try {
    // Verify if the signature matches
    if ($generated_signature == $razorpay_signature) {
        // Payment is successful
        $conn = getDbConnection();
        
        // Get order details
        $stmt = $conn->prepare("SELECT amount FROM razorpay_orders WHERE order_id = ?");
        $stmt->bind_param("s", $razorpay_order_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            echo json_encode(['error' => 'Order not found']);
            http_response_code(404);
            exit;
        }
        
        $order = $result->fetch_assoc();
        $amount = $order['amount'] / 100; // Convert from paise to rupees
        
        // Record the payment
        $stmt = $conn->prepare("INSERT INTO payments 
                               (payment_id, order_id, amount, status, payment_method, created_at) 
                               VALUES (?, ?, ?, 'paid', 'razorpay', NOW())");
        
        $stmt->bind_param("ssd", $razorpay_payment_id, $razorpay_order_id, $amount);
        $stmt->execute();
        
        if ($stmt->error) {
            error_log("Database Error: " . $stmt->error);
            echo json_encode(['error' => 'Failed to record payment']);
            http_response_code(500);
            exit;
        }
        
        // If booking ID is provided, update the booking payment status
        if ($booking_id) {
            $stmt = $conn->prepare("UPDATE bookings SET payment_status = 'paid', payment_id = ? WHERE id = ?");
            $stmt->bind_param("si", $razorpay_payment_id, $booking_id);
            $stmt->execute();
            
            if ($stmt->error) {
                error_log("Database Error: " . $stmt->error);
            }
        }
        
        $stmt->close();
        $conn->close();
        
        echo json_encode([
            'success' => true,
            'message' => 'Payment verified successfully'
        ]);
    } else {
        // Signature verification failed
        echo json_encode([
            'success' => false,
            'error' => 'Payment signature verification failed'
        ]);
        http_response_code(400);
    }
} catch (Exception $e) {
    error_log("Exception: " . $e->getMessage());
    echo json_encode(['error' => 'Internal server error']);
    http_response_code(500);
}
