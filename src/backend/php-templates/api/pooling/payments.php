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
        
        // Always treat total_amount as rupees, convert to paise for Razorpay
        $amount_rupees = floatval($booking['total_amount']);
        $amount = intval(round($amount_rupees * 100)); // paise, integer
        $display_amount = $amount_rupees; // rupees
        
        // Generate a unique receipt ID
        $receipt_id = 'rcpt_' . time() . '_' . substr(md5(mt_rand()), 0, 8);

        // Create Razorpay order via API
        $key_id = "rzp_test_41fJeGiVFyU9OQ";
        $key_secret = "ZbNPHrr9CmMyMnm7TzJOJozH";
        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => "https://api.razorpay.com/v1/orders",
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => "",
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => "POST",
            CURLOPT_POSTFIELDS => json_encode([
                'amount' => $amount, // paise, integer
                'currency' => 'INR',
                'receipt' => $receipt_id,
                'payment_capture' => 1
            ]),
            CURLOPT_HTTPHEADER => [
                "Authorization: Basic " . base64_encode($key_id . ":" . $key_secret),
                "Content-Type: application/json"
            ],
        ]);
        $response = curl_exec($curl);
        $err = curl_error($curl);
        curl_close($curl);

        if ($err) {
            error_log("Razorpay API Error: " . $err);
            sendError('Failed to create payment order', 500);
        }

        $order = json_decode($response, true);

        if (isset($order['error'])) {
            error_log("Razorpay Error: " . json_encode($order['error']));
            sendError($order['error']['description'] ?? 'Failed to create order', 400);
        }

        // Update booking with real Razorpay order ID
        $stmt = $pdo->prepare("UPDATE pooling_bookings SET razorpay_order_id = ? WHERE id = ?");
        $stmt->execute([$order['id'], $bookingId]);

        sendResponse([
            'order_id' => $order['id'], // real Razorpay order ID
            'amount' => $amount, // paise, integer
            'display_amount' => $display_amount, // rupees
            'currency' => $order['currency'],
            'key' => $key_id
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
