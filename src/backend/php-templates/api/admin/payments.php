
<?php
/**
 * Payments API endpoint for the admin panel
 */

require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/database.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Force-Refresh');

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
    // Get database connection
    $db = getDbConnectionWithRetry();
    
    // Parse filter parameters
    $fromDate = isset($_GET['from_date']) ? $_GET['from_date'] : null;
    $toDate = isset($_GET['to_date']) ? $_GET['to_date'] : null;
    $status = isset($_GET['status']) ? $_GET['status'] : null;
    $method = isset($_GET['method']) ? $_GET['method'] : null;
    $customerId = isset($_GET['customer_id']) ? $_GET['customer_id'] : null;
    $search = isset($_GET['search']) ? $_GET['search'] : null;
    
    // Build the base query
    $query = "
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
        WHERE 1=1
    ";
    
    // Add filter conditions
    $params = [];
    $types = "";
    
    if ($fromDate) {
        $query .= " AND b.pickupDate >= ?";
        $params[] = $fromDate;
        $types .= "s";
    }
    
    if ($toDate) {
        $query .= " AND b.pickupDate <= ?";
        $params[] = $toDate;
        $types .= "s";
    }
    
    if ($status) {
        if ($status === 'pending') {
            $query .= " AND (b.payment_status IS NULL OR b.payment_status = 'payment_pending')";
        } else if ($status === 'paid') {
            $query .= " AND b.payment_status = 'payment_received'";
        } else if ($status === 'cancelled') {
            $query .= " AND b.status = 'cancelled'";
        }
    }
    
    if ($method) {
        $query .= " AND b.payment_method = ?";
        $params[] = $method;
        $types .= "s";
    }
    
    if ($customerId) {
        $query .= " AND b.userId = ?";
        $params[] = $customerId;
        $types .= "i";
    }
    
    if ($search) {
        $searchTerm = "%{$search}%";
        $query .= " AND (b.bookingNumber LIKE ? OR b.passengerName LIKE ? OR b.passengerPhone LIKE ? OR b.passengerEmail LIKE ?)";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $types .= "ssss";
    }
    
    // Order by due date
    $query .= " ORDER BY b.pickupDate DESC";
    
    // Execute the query
    $stmt = $db->prepare($query);
    
    // Bind parameters if there are any
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $payments = [];
    $totalAmount = 0;
    $totalPaid = 0;
    $totalPending = 0;
    $totalOverdue = 0;
    $countByStatus = [
        'pending' => 0,
        'partial' => 0,
        'paid' => 0,
        'cancelled' => 0
    ];
    $countByMethod = [];
    
    // Fetch payments and calculate summary
    while ($row = $result->fetch_assoc()) {
        $payment = [
            'id' => $row['booking_id'],
            'bookingId' => $row['booking_id'],
            'bookingNumber' => $row['bookingNumber'],
            'customerName' => $row['customer_name'],
            'customerPhone' => $row['customer_phone'],
            'customerEmail' => $row['customer_email'],
            'amount' => (float) $row['amount'],
            'paidAmount' => (float) $row['paid_amount'],
            'remainingAmount' => (float) $row['remaining_amount'],
            'paymentStatus' => $row['payment_status'],
            'paymentMethod' => $row['payment_method'],
            'dueDate' => $row['due_date'],
            'createdAt' => $row['createdAt'],
            'updatedAt' => $row['updatedAt']
        ];
        
        // Calculate partial payment status
        if ($payment['paymentStatus'] === 'pending' && $payment['paidAmount'] > 0) {
            $payment['paymentStatus'] = 'partial';
        }
        
        // Update summary
        $totalAmount += $payment['amount'];
        $totalPaid += $payment['paidAmount'];
        $totalPending += $payment['remainingAmount'];
        
        // Check if overdue
        $dueDate = new DateTime($row['due_date']);
        $today = new DateTime();
        if ($payment['paymentStatus'] !== 'paid' && $payment['paymentStatus'] !== 'cancelled' && $dueDate < $today) {
            $totalOverdue += $payment['remainingAmount'];
        }
        
        // Update status counts
        $countByStatus[$payment['paymentStatus']]++;
        
        // Update method counts
        if ($row['payment_method']) {
            if (!isset($countByMethod[$row['payment_method']])) {
                $countByMethod[$row['payment_method']] = 0;
            }
            $countByMethod[$row['payment_method']]++;
        }
        
        $payments[] = $payment;
    }
    
    // Prepare summary
    $summary = [
        'totalAmount' => $totalAmount,
        'totalPaid' => $totalPaid,
        'totalPending' => $totalPending,
        'totalOverdue' => $totalOverdue,
        'countByStatus' => $countByStatus,
        'countByMethod' => $countByMethod
    ];
    
    // Send success response
    sendSuccessResponse([
        'payments' => $payments,
        'summary' => $summary
    ], 'Payments fetched successfully');
    
} catch (Exception $e) {
    // Log error
    error_log('Error fetching payments: ' . $e->getMessage());
    
    // Send error response
    sendErrorResponse('Failed to fetch payments: ' . $e->getMessage(), 500);
}
