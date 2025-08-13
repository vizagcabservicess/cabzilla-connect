<?php
/**
 * Add advance_paid_amount column to bookings table
 */

require_once __DIR__ . '/../utils/database.php';
require_once __DIR__ . '/../utils/response.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    // Connect to the database
    $db = getDbConnectionWithRetry();
    
    // Check if advance_paid_amount column exists
    $checkResult = $db->query("SHOW COLUMNS FROM `bookings` LIKE 'advance_paid_amount'");
    $hasAdvancePaidAmountColumn = $checkResult->num_rows > 0;
    
    // Begin transaction
    $db->begin_transaction();
    
    $changes = [];
    
    // Add advance_paid_amount column if it doesn't exist
    if (!$hasAdvancePaidAmountColumn) {
        $db->query("ALTER TABLE `bookings` ADD COLUMN `advance_paid_amount` DECIMAL(10,2) DEFAULT 0.00 AFTER `payment_method`");
        $changes[] = "Added advance_paid_amount column to bookings table";
    }
    
    // Check if payment_status column exists
    $checkPaymentStatus = $db->query("SHOW COLUMNS FROM `bookings` LIKE 'payment_status'");
    $hasPaymentStatusColumn = $checkPaymentStatus->num_rows > 0;
    
    // Add payment_status column if it doesn't exist
    if (!$hasPaymentStatusColumn) {
        $db->query("ALTER TABLE `bookings` ADD COLUMN `payment_status` VARCHAR(50) DEFAULT 'payment_pending' AFTER `status`");
        $changes[] = "Added payment_status column to bookings table";
    }
    
    // Check if payment_method column exists
    $checkPaymentMethod = $db->query("SHOW COLUMNS FROM `bookings` LIKE 'payment_method'");
    $hasPaymentMethodColumn = $checkPaymentMethod->num_rows > 0;
    
    // Add payment_method column if it doesn't exist
    if (!$hasPaymentMethodColumn) {
        $db->query("ALTER TABLE `bookings` ADD COLUMN `payment_method` VARCHAR(50) DEFAULT NULL AFTER `payment_status`");
        $changes[] = "Added payment_method column to bookings table";
    }
    
    // Check if razorpay_payment_id column exists
    $checkRazorpayPaymentId = $db->query("SHOW COLUMNS FROM `bookings` LIKE 'razorpay_payment_id'");
    $hasRazorpayPaymentIdColumn = $checkRazorpayPaymentId->num_rows > 0;
    
    // Add razorpay_payment_id column if it doesn't exist
    if (!$hasRazorpayPaymentIdColumn) {
        $db->query("ALTER TABLE `bookings` ADD COLUMN `razorpay_payment_id` VARCHAR(100) DEFAULT NULL AFTER `payment_method`");
        $changes[] = "Added razorpay_payment_id column to bookings table";
    }
    
    // Check if razorpay_order_id column exists
    $checkRazorpayOrderId = $db->query("SHOW COLUMNS FROM `bookings` LIKE 'razorpay_order_id'");
    $hasRazorpayOrderIdColumn = $checkRazorpayOrderId->num_rows > 0;
    
    // Add razorpay_order_id column if it doesn't exist
    if (!$hasRazorpayOrderIdColumn) {
        $db->query("ALTER TABLE `bookings` ADD COLUMN `razorpay_order_id` VARCHAR(100) DEFAULT NULL AFTER `razorpay_payment_id`");
        $changes[] = "Added razorpay_order_id column to bookings table";
    }
    
    // Check if razorpay_signature column exists
    $checkRazorpaySignature = $db->query("SHOW COLUMNS FROM `bookings` LIKE 'razorpay_signature'");
    $hasRazorpaySignatureColumn = $checkRazorpaySignature->num_rows > 0;
    
    // Add razorpay_signature column if it doesn't exist
    if (!$hasRazorpaySignatureColumn) {
        $db->query("ALTER TABLE `bookings` ADD COLUMN `razorpay_signature` VARCHAR(255) DEFAULT NULL AFTER `razorpay_order_id`");
        $changes[] = "Added razorpay_signature column to bookings table";
    }
    
    // Commit the transaction
    $db->commit();
    
    // Return success response
    sendJsonResponse([
        'status' => 'success',
        'message' => 'Database schema updated successfully',
        'changes' => $changes,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
} catch (Exception $e) {
    // Rollback transaction on error
    if (isset($db) && $db instanceof mysqli) {
        $db->rollback();
    }
    
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Failed to update database schema: ' . $e->getMessage(),
        'error' => $e->getMessage()
    ], 500);
}

// Close database connection
if (isset($db) && $db instanceof mysqli) {
    $db->close();
}
?>
