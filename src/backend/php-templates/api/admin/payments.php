<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
/**
 * Payments API endpoint for the admin panel
 */

include_once __DIR__ . '/../utils/response.php';
include_once __DIR__ . '/../utils/database.php';

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
            b.booking_number,
            b.passenger_name AS customer_name,
            b.passenger_phone AS customer_phone,
            b.passenger_email AS customer_email,
            b.total_amount AS amount,
            (COALESCE(p.paid_amount, 0) + COALESCE(b.advance_paid_amount, 0)) AS paid_amount,
            (b.total_amount - (COALESCE(p.paid_amount, 0) + COALESCE(b.advance_paid_amount, 0))) AS remaining_amount,
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
        WHERE 1=1
    ";
    
    // Add filter conditions
    $params = [];
    $types = "";
    
    if ($fromDate) {
        $query .= " AND b.pickup_date >= ?";
        $params[] = $fromDate;
        $types .= "s";
    }
    
    if ($toDate) {
        $query .= " AND b.pickup_date <= ?";
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
        $query .= " AND (b.booking_number LIKE ? OR b.passenger_name  LIKE ? OR b.passenger_phone LIKE ? OR b.passenger_email LIKE ?)";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $types .= "ssss";
    }
    
    // Order by due date
    $query .= " ORDER BY b.pickup_date DESC";
    
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
        'paid' => 0,
        'partial' => 0,
        'pending' => 0,
        'cancelled' => 0
    ];
    $countByMethod = [];
    $today = new DateTime();
    
    // Fetch payments and calculate summary
    while ($row = $result->fetch_assoc()) {
        $payment = [
            'id' => $row['booking_id'],
            'bookingId' => $row['booking_id'],
            'bookingNumber' => $row['booking_number'],
            'customerName' => $row['customer_name'],
            'customerPhone' => $row['customer_phone'],
            'customerEmail' => $row['customer_email'],
            'amount' => (float) $row['amount'],
            'paidAmount' => (float) $row['paid_amount'],
            'remainingAmount' => (float) $row['remaining_amount'],
            'paymentStatus' => $row['payment_status'],
            'paymentMethod' => $row['payment_method'],
            'dueDate' => $row['due_date'],
            'createdAt' => $row['created_at'],
            'updatedAt' => $row['updated_at']
        ];
        
        // Calculate partial payment status
        if ($payment['paymentStatus'] === 'pending' && $payment['paidAmount'] > 0) {
            $payment['paymentStatus'] = 'partial';
        }
        
        // Update summary totals
        $totalAmount += $payment['amount'];
        // Only sum paidAmount for paid or partial
        if ($payment['paymentStatus'] === 'paid' || $payment['paymentStatus'] === 'partial') {
            $totalPaid += $payment['paidAmount'];
        }
        $totalPending += $payment['remainingAmount'];
        
        // Overdue logic: not paid/cancelled and due date < today
        $dueDate = new DateTime($payment['dueDate']);
        if ($payment['paymentStatus'] !== 'paid' && $payment['paymentStatus'] !== 'cancelled' && $dueDate < $today) {
            $totalOverdue += $payment['remainingAmount'];
        }
        
        // Update status counts
        if (isset($countByStatus[$payment['paymentStatus']])) {
            $countByStatus[$payment['paymentStatus']]++;
        }
        
        // Update method counts with amounts
        if ($payment['paymentMethod']) {
            if (!isset($countByMethod[$payment['paymentMethod']])) {
                $countByMethod[$payment['paymentMethod']] = [
                    'count' => 0,
                    'amount' => 0
                ];
            }
            $countByMethod[$payment['paymentMethod']]['count']++;
            $countByMethod[$payment['paymentMethod']]['amount'] += $payment['amount'];
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
        'countByMethod' => $countByMethod,
        'metrics' => [
            'completionRate' => $totalAmount > 0 ? ($totalPaid / $totalAmount) * 100 : 0,
            'overdueRate' => $totalPending > 0 ? ($totalOverdue / $totalPending) * 100 : 0,
            'averagePayment' => count($payments) > 0 ? $totalAmount / count($payments) : 0
        ]
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
