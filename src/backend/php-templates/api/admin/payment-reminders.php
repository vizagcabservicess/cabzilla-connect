
<?php
/**
 * Get payment reminders endpoint
 */

require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/database.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check if request method is GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendErrorResponse('Method not allowed', 405);
    exit;
}

try {
    // Validate required parameters
    if (!isset($_GET['payment_id']) || empty($_GET['payment_id'])) {
        sendErrorResponse('Payment ID is required', 400);
        exit;
    }
    
    $paymentId = $_GET['payment_id'];
    
    // Get database connection
    $db = getDbConnectionWithRetry();
    
    // Get reminders
    $stmt = $db->prepare("
        SELECT 
            id,
            booking_id,
            booking_number,
            customer_name,
            customer_email,
            customer_phone,
            amount,
            reminder_type,
            reminder_date,
            sent_date,
            status,
            message,
            created_at,
            updated_at
        FROM payment_reminders
        WHERE booking_id = ?
        ORDER BY created_at DESC
    ");
    
    $stmt->bind_param("i", $paymentId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $reminders = [];
    while ($row = $result->fetch_assoc()) {
        $reminders[] = [
            'id' => $row['id'],
            'paymentId' => $row['booking_id'],
            'bookingId' => $row['booking_id'],
            'bookingNumber' => $row['booking_number'],
            'customerName' => $row['customer_name'],
            'customerEmail' => $row['customer_email'],
            'customerPhone' => $row['customer_phone'],
            'amount' => (float) $row['amount'],
            'reminderType' => $row['reminder_type'],
            'reminderDate' => $row['reminder_date'],
            'sentDate' => $row['sent_date'],
            'status' => $row['status'],
            'message' => $row['message'],
            'createdAt' => $row['created_at'],
            'updatedAt' => $row['updated_at']
        ];
    }
    
    // Send success response
    sendSuccessResponse([
        'reminders' => $reminders
    ], 'Payment reminders fetched successfully');
    
} catch (Exception $e) {
    // Log error
    error_log('Error fetching payment reminders: ' . $e->getMessage());
    
    // Send error response
    sendErrorResponse('Failed to fetch payment reminders: ' . $e->getMessage(), 500);
}
