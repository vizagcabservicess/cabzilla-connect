
<?php
/**
 * Fix booking payments schema - adds columns for payment tracking
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
    
    // Check for existing payment_status column
    $checkResult = $db->query("SHOW COLUMNS FROM `bookings` LIKE 'payment_status'");
    $hasPaymentStatusColumn = $checkResult->num_rows > 0;
    
    // Check for existing payment_method column
    $checkResult = $db->query("SHOW COLUMNS FROM `bookings` LIKE 'payment_method'");
    $hasPaymentMethodColumn = $checkResult->num_rows > 0;
    
    // Begin transaction
    $db->begin_transaction();
    
    $changes = [];
    
    // Add payment_status column if it doesn't exist
    if (!$hasPaymentStatusColumn) {
        $db->query("ALTER TABLE `bookings` ADD COLUMN `payment_status` VARCHAR(50) DEFAULT 'payment_pending' AFTER `status`");
        $changes[] = "Added payment_status column to bookings table";
    }
    
    // Add payment_method column if it doesn't exist
    if (!$hasPaymentMethodColumn) {
        $db->query("ALTER TABLE `bookings` ADD COLUMN `payment_method` VARCHAR(50) DEFAULT NULL AFTER `payment_status`");
        $changes[] = "Added payment_method column to bookings table";
    }
    
    // Create payments table if it doesn't exist
    $sql = file_get_contents(__DIR__ . '/../sql/payment_tables.sql');
    $db->multi_query($sql);
    
    // Clear results to avoid "Commands out of sync" error
    while ($db->more_results() && $db->next_result()) {
        $dummyResult = $db->use_result();
        if ($dummyResult instanceof mysqli_result) {
            $dummyResult->free();
        }
    }
    
    $changes[] = "Created or verified payment_tables schema";
    
    // Commit transaction
    $db->commit();
    
    // Send success response
    sendSuccessResponse([
        'status' => 'success',
        'changes' => $changes
    ], 'Booking payments schema updated successfully');
    
} catch (Exception $e) {
    // Rollback transaction if active
    if (isset($db) && $db->ping()) {
        $db->rollback();
    }
    
    // Send error response
    sendErrorResponse('Failed to update booking payments schema: ' . $e->getMessage(), 500);
}
