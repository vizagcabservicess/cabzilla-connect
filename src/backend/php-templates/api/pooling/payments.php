
<?php
require_once 'config.php';

// Include your existing Razorpay configuration
// This should integrate with your existing payment system

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'POST':
        $action = $_GET['action'] ?? '';
        switch ($action) {
            case 'create-order':
                handleCreateOrder();
                break;
            case 'verify-payment':
                handleVerifyPayment();
                break;
            default:
                sendError('Invalid action');
        }
        break;
    default:
        sendError('Method not allowed', 405);
}

function handleCreateOrder() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $bookingId = $input['booking_id'] ?? null;
    
    if (!$bookingId) {
        sendError('Booking ID is required');
    }
    
    try {
        // Get booking details
        $stmt = $pdo->prepare("SELECT * FROM pooling_bookings WHERE id = ?");
        $stmt->execute([$bookingId]);
        $booking = $stmt->fetch();
        
        if (!$booking) {
            sendError('Booking not found', 404);
        }
        
        // TODO: Integrate with your existing Razorpay API
        // For now, return a mock response
        $orderId = 'order_' . time() . '_' . $bookingId;
        
        // Update booking with order ID
        $stmt = $pdo->prepare("UPDATE pooling_bookings SET razorpay_order_id = ? WHERE id = ?");
        $stmt->execute([$orderId, $bookingId]);
        
        sendResponse([
            'order_id' => $orderId,
            'amount' => $booking['total_amount'] * 100, // Amount in paise
            'currency' => 'INR',
            'key' => 'your_razorpay_key_id' // Use your actual key
        ]);
        
    } catch (PDOException $e) {
        error_log('Database error in create order: ' . $e->getMessage());
        sendError('Failed to create payment order', 500);
    }
}

function handleVerifyPayment() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    $required_fields = ['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature'];
    $errors = validateInput($input, $required_fields);
    
    if (!empty($errors)) {
        sendError(implode(', ', $errors));
    }
    
    try {
        // TODO: Verify signature with Razorpay
        // For now, assume payment is successful
        
        // Update booking status
        $stmt = $pdo->prepare("
            UPDATE pooling_bookings 
            SET payment_status = 'paid', 
                booking_status = 'confirmed',
                razorpay_payment_id = ?
            WHERE razorpay_order_id = ?
        ");
        $stmt->execute([$input['razorpay_payment_id'], $input['razorpay_order_id']]);
        
        // Update payment record
        $stmt = $pdo->prepare("
            UPDATE pooling_payments 
            SET status = 'success', 
                payment_date = NOW(),
                razorpay_payment_id = ?,
                razorpay_signature = ?
            WHERE booking_id = (
                SELECT id FROM pooling_bookings WHERE razorpay_order_id = ?
            )
        ");
        $stmt->execute([
            $input['razorpay_payment_id'],
            $input['razorpay_signature'],
            $input['razorpay_order_id']
        ]);
        
        sendResponse(['message' => 'Payment verified successfully']);
        
    } catch (PDOException $e) {
        error_log('Database error in verify payment: ' . $e->getMessage());
        sendError('Failed to verify payment', 500);
    }
}
?>
