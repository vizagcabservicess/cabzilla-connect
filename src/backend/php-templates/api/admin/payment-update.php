<?php
/**
 * Update payment status endpoint
 */

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

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
        'partial' => 'payment_pending',
        'cancelled' => 'cancelled'
    ];
    
    // Force payment_status to 'payment_received' if status is 'paid'
    if ($data['status'] === 'paid') {
        $bookingStatus = 'payment_received';
    } else {
        $bookingStatus = isset($statusMap[$data['status']]) ? $statusMap[$data['status']] : 'payment_pending';
    }
    
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
    
    // If amount is provided, upsert a payment record (update if exists, insert if not)
    if (isset($data['amount']) && $data['amount'] > 0) {
        // Prepare Razorpay fields if provided
        $razorpayPaymentId = isset($data['razorpay_payment_id']) ? $data['razorpay_payment_id'] : null;
        $razorpayOrderId = isset($data['razorpay_order_id']) ? $data['razorpay_order_id'] : null;
        $razorpaySignature = isset($data['razorpay_signature']) ? $data['razorpay_signature'] : null;
        $bookingId = $data['payment_id'];
        $amount = $data['amount'];
        $paymentMethod = isset($data['payment_method']) ? $data['payment_method'] : null;
        $notes = isset($data['notes']) ? $data['notes'] : null;

        // Check if a confirmed payment record already exists for this booking_id
        $checkStmt = $db->prepare("SELECT id FROM payments WHERE booking_id = ? AND status = 'confirmed' LIMIT 1");
        $checkStmt->bind_param("i", $bookingId);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();

        if ($checkResult->num_rows > 0) {
            // Update existing confirmed payment record
            $row = $checkResult->fetch_assoc();
            $paymentId = $row['id'];
            $updatePaymentQuery = "UPDATE payments SET amount = ?, payment_method = ?, payment_date = NOW(), status = 'confirmed', notes = ?, updated_at = NOW(), razorpay_payment_id = ?, razorpay_order_id = ?, razorpay_signature = ? WHERE id = ?";
            $updatePaymentStmt = $db->prepare($updatePaymentQuery);
            if (!$updatePaymentStmt) {
                error_log('Prepare failed: ' . $db->error);
            }
            $updatePaymentStmt->bind_param("dsssssi", $amount, $paymentMethod, $notes, $razorpayPaymentId, $razorpayOrderId, $razorpaySignature, $paymentId);
            if (!$updatePaymentStmt->execute()) {
                error_log('Execute failed: ' . $updatePaymentStmt->error);
            }
        } else {
            // Insert new confirmed payment record
            $insertPaymentQuery = "INSERT INTO payments (booking_id, amount, payment_method, payment_date, status, notes, created_at, updated_at, razorpay_payment_id, razorpay_order_id, razorpay_signature) VALUES (?, ?, ?, NOW(), 'confirmed', ?, NOW(), NOW(), ?, ?, ?)";
            $insertPaymentStmt = $db->prepare($insertPaymentQuery);
            if (!$insertPaymentStmt) {
                error_log('Prepare failed: ' . $db->error);
            }
            $insertPaymentStmt->bind_param("idsssss", $bookingId, $amount, $paymentMethod, $notes, $razorpayPaymentId, $razorpayOrderId, $razorpaySignature);
            if (!$insertPaymentStmt->execute()) {
                error_log('Execute failed: ' . $insertPaymentStmt->error);
            }
        }
    }
    
    // Commit the transaction
    $db->commit();
    
    // Get updated payment details
    $stmt = $db->prepare("
        SELECT 
            b.id AS booking_id,
            b.booking_number,
            b.passenger_name AS customer_name,
            b.passenger_phone AS customer_phone,
            b.passenger_email AS customer_email,
            b.total_amount AS amount,
            COALESCE(p.paid_amount, 0) AS paid_amount,
            (b.total_amount - COALESCE(p.paid_amount, 0)) AS remaining_amount,
            CASE
                WHEN b.payment_status = 'payment_received' THEN 'paid'
                WHEN b.payment_status IS NULL OR b.payment_status = 'payment_pending' THEN 'pending'
                WHEN b.status = 'cancelled' THEN 'cancelled'
                ELSE 'pending'
            END AS payment_status,
            b.payment_method,
            b.pickup_date AS due_date,
            b.created_at,
            b.updated_at
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
        'bookingNumber' => $payment['booking_number'],
        'customerName' => $payment['customer_name'],
        'customerPhone' => $payment['customer_phone'],
        'customerEmail' => $payment['customer_email'],
        'amount' => (float) $payment['amount'],
        'paidAmount' => (float) $payment['paid_amount'],
        'remainingAmount' => (float) $payment['remaining_amount'],
        'paymentStatus' => $payment['payment_status'],
        'paymentMethod' => $payment['payment_method'],
        'dueDate' => $payment['due_date'],
        'createdAt' => $payment['created_at'],
        'updatedAt' => $payment['updated_at']
    ];
    
    // Recalculate summary statistics
    $summaryQuery = "
        SELECT 
            SUM(b.total_amount) as total_amount,
            SUM(COALESCE(p.paid_amount, 0)) as total_paid,
            SUM(b.total_amount - COALESCE(p.paid_amount, 0)) as total_pending,
            COUNT(CASE WHEN b.payment_status = 'payment_received' THEN 1 END) as paid_count,
            COUNT(CASE WHEN b.payment_status = 'payment_pending' AND COALESCE(p.paid_amount, 0) > 0 THEN 1 END) as partial_count,
            COUNT(CASE WHEN b.payment_status = 'payment_pending' AND COALESCE(p.paid_amount, 0) = 0 THEN 1 END) as pending_count,
            COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_count
        FROM bookings b
        LEFT JOIN (
            SELECT 
                booking_id,
                SUM(amount) AS paid_amount
            FROM payments
            WHERE status = 'confirmed'
            GROUP BY booking_id
        ) p ON p.booking_id = b.id
    ";
    
    $summaryStmt = $db->prepare($summaryQuery);
    $summaryStmt->execute();
    $summaryResult = $summaryStmt->get_result();
    $summaryData = $summaryResult->fetch_assoc();
    
    // Calculate overdue amount
    $overdueQuery = "
        SELECT SUM(b.total_amount - COALESCE(p.paid_amount, 0)) as total_overdue
        FROM bookings b
        LEFT JOIN (
            SELECT 
                booking_id,
                SUM(amount) AS paid_amount
            FROM payments
            WHERE status = 'confirmed'
            GROUP BY booking_id
        ) p ON p.booking_id = b.id
        WHERE b.pickup_date < CURDATE()
        AND b.payment_status != 'payment_received'
        AND b.status != 'cancelled'
    ";
    
    $overdueStmt = $db->prepare($overdueQuery);
    $overdueStmt->execute();
    $overdueResult = $overdueStmt->get_result();
    $overdueData = $overdueResult->fetch_assoc();
    
    // Get payment method statistics
    $methodQuery = "
        SELECT 
            b.payment_method,
            COUNT(*) as count,
            SUM(b.total_amount) as amount
        FROM bookings b
        WHERE b.payment_method IS NOT NULL
        GROUP BY b.payment_method
    ";
    
    $methodStmt = $db->prepare($methodQuery);
    $methodStmt->execute();
    $methodResult = $methodStmt->get_result();
    
    $countByMethod = [];
    while ($methodRow = $methodResult->fetch_assoc()) {
        $countByMethod[$methodRow['payment_method']] = [
            'count' => (int)$methodRow['count'],
            'amount' => (float)$methodRow['amount']
        ];
    }
    
    // Prepare summary response
    $summary = [
        'totalAmount' => (float)$summaryData['total_amount'],
        'totalPaid' => (float)$summaryData['total_paid'],
        'totalPending' => (float)$summaryData['total_pending'],
        'totalOverdue' => (float)$overdueData['total_overdue'],
        'countByStatus' => [
            'paid' => (int)$summaryData['paid_count'],
            'partial' => (int)$summaryData['partial_count'],
            'pending' => (int)$summaryData['pending_count'],
            'cancelled' => (int)$summaryData['cancelled_count']
        ],
        'countByMethod' => $countByMethod,
        'metrics' => [
            'completionRate' => $summaryData['total_amount'] > 0 ? 
                ($summaryData['total_paid'] / $summaryData['total_amount']) * 100 : 0,
            'overdueRate' => $summaryData['total_pending'] > 0 ? 
                ($overdueData['total_overdue'] / $summaryData['total_pending']) * 100 : 0
        ]
    ];
    
    // Send success response with both payment data and updated summary
    sendSuccessResponse([
        'payment' => $paymentData,
        'summary' => $summary
    ], 'Payment status updated successfully');
    
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
