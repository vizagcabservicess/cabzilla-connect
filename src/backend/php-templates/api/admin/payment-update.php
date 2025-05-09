
<?php
/**
 * Update payment status endpoint
 */

require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/database.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check if request method is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendErrorResponse('Method not allowed', 405);
    exit;
}

try {
    // Get JSON data from request
    $jsonData = file_get_contents('php://input');
    $data = json_decode($jsonData, true);
    
    // Validate required fields
    if (!isset($data['payment_id']) || empty($data['payment_id'])) {
        sendErrorResponse('Payment ID is required', 400);
        exit;
    }
    
    if (!isset($data['status']) || empty($data['status'])) {
        sendErrorResponse('Payment status is required', 400);
        exit;
    }
    
    // Get database connection
    $db = getDbConnectionWithRetry();
    
    // Map API payment status to booking payment status
    $statusMap = [
        'paid' => 'payment_received',
        'pending' => 'payment_pending',
        'partial' => 'payment_pending', // Partial is still pending in the booking table
        'cancelled' => 'cancelled'
    ];
    
    $bookingStatus = isset($statusMap[$data['status']]) ? $statusMap[$data['status']] : 'payment_pending';
    
    // Begin transaction
    $db->begin_transaction();
    
    // Update booking payment status and method if provided
    $updateFields = ['payment_status = ?'];
    $updateParams = [$bookingStatus];
    $updateTypes = 's';
    
    if (isset($data['payment_method']) && !empty($data['payment_method'])) {
        $updateFields[] = 'payment_method = ?';
        $updateParams[] = $data['payment_method'];
        $updateTypes .= 's';
    }
    
    // Add booking ID at the end for the WHERE clause
    $updateParams[] = $data['payment_id'];
    $updateTypes .= 'i';
    
    $updateQuery = "UPDATE bookings SET " . implode(', ', $updateFields) . " WHERE id = ?";
    $stmt = $db->prepare($updateQuery);
    $stmt->bind_param($updateTypes, ...$updateParams);
    $stmt->execute();
    
    // If amount is provided, insert a payment record
    if (isset($data['amount']) && $data['amount'] > 0) {
        $stmt = $db->prepare("
            INSERT INTO payments (
                booking_id,
                amount,
                payment_method,
                payment_date,
                status,
                notes,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, NOW(), 'confirmed', ?, NOW(), NOW())
        ");
        
        $bookingId = $data['payment_id'];
        $amount = $data['amount'];
        $paymentMethod = isset($data['payment_method']) ? $data['payment_method'] : null;
        $notes = isset($data['notes']) ? $data['notes'] : null;
        
        $stmt->bind_param("idss", $bookingId, $amount, $paymentMethod, $notes);
        $stmt->execute();
    }
    
    // Commit the transaction
    $db->commit();
    
    // Get updated payment details
    $stmt = $db->prepare("
        SELECT 
            b.id AS booking_id,
            b.bookingNumber,
            b.passengerName AS customer_name,
            b.passengerPhone AS customer_phone,
            b.passengerEmail AS customer_email,
            b.totalAmount AS amount,
            COALESCE(p.paid_amount, 0) AS paid_amount,
            (b.totalAmount - COALESCE(p.paid_amount, 0)) AS remaining_amount,
            CASE
                WHEN b.payment_status = 'payment_received' THEN 'paid'
                WHEN b.payment_status IS NULL OR b.payment_status = 'payment_pending' THEN 'pending'
                WHEN b.status = 'cancelled' THEN 'cancelled'
                ELSE 'pending'
            END AS payment_status,
            b.payment_method,
            b.pickupDate AS due_date,
            b.createdAt,
            b.updatedAt
        FROM bookings b
        LEFT JOIN (
            SELECT 
                booking_id,
                SUM(amount) AS paid_amount
            FROM payments
            WHERE status = 'confirmed'
            GROUP BY booking_id
        ) p ON p.booking_id = b.id
        WHERE b.id = ?
    ");
    
    $stmt->bind_param("i", $data['payment_id']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendErrorResponse('Payment not found after update', 404);
        exit;
    }
    
    $payment = $result->fetch_assoc();
    
    // Calculate partial payment status
    if ($payment['payment_status'] === 'pending' && $payment['paid_amount'] > 0) {
        $payment['payment_status'] = 'partial';
    }
    
    // Format the response
    $paymentData = [
        'id' => $payment['booking_id'],
        'bookingId' => $payment['booking_id'],
        'bookingNumber' => $payment['bookingNumber'],
        'customerName' => $payment['customer_name'],
        'customerPhone' => $payment['customer_phone'],
        'customerEmail' => $payment['customer_email'],
        'amount' => (float) $payment['amount'],
        'paidAmount' => (float) $payment['paid_amount'],
        'remainingAmount' => (float) $payment['remaining_amount'],
        'paymentStatus' => $payment['payment_status'],
        'paymentMethod' => $payment['payment_method'],
        'dueDate' => $payment['due_date'],
        'createdAt' => $payment['createdAt'],
        'updatedAt' => $payment['updatedAt']
    ];
    
    // Send success response
    sendSuccessResponse($paymentData, 'Payment status updated successfully');
    
} catch (Exception $e) {
    // Rollback transaction if active
    if (isset($db) && $db->ping()) {
        $db->rollback();
    }
    
    // Log error
    error_log('Error updating payment status: ' . $e->getMessage());
    
    // Send error response
    sendErrorResponse('Failed to update payment status: ' . $e->getMessage(), 500);
}
