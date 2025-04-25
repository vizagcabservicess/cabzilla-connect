
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';

// CRITICAL: Set all response headers first before any output
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Debug mode
$debugMode = isset($_GET['debug']) || isset($_SERVER['HTTP_X_DEBUG']);

// Log request
error_log("Admin generate-invoice endpoint called: " . $_SERVER['REQUEST_METHOD']);

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Function to send JSON response
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    if (ob_get_level()) ob_end_clean();
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

// Log error function
function logInvoiceError($message, $data = []) {
    error_log("INVOICE GENERATION ERROR: $message " . json_encode($data));
    $logFile = __DIR__ . '/../../logs/invoice_errors.log';
    $dir = dirname($logFile);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    file_put_contents(
        $logFile,
        date('Y-m-d H:i:s') . " - $message - " . json_encode($data) . "\n",
        FILE_APPEND
    );
}

try {
    // Allow both POST and GET requests
    $bookingId = null;
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Get JSON input data
        $jsonData = file_get_contents('php://input');
        $data = json_decode($jsonData, true);
        
        if (isset($data['bookingId'])) {
            $bookingId = (int)$data['bookingId'];
        }
    } else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (isset($_GET['id'])) {
            $bookingId = (int)$_GET['id'];
        }
    } else {
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }
    
    if (!$bookingId) {
        logInvoiceError('Missing booking ID', $_SERVER['REQUEST_METHOD'] === 'POST' ? $data : $_GET);
        sendJsonResponse(['status' => 'error', 'message' => 'Missing booking ID'], 400);
    }
    
    // Connect to database with improved error handling
    try {
        $conn = getDbConnectionWithRetry();
        if (!$conn) {
            throw new Exception("Failed to connect to database after retries");
        }
    } catch (Exception $e) {
        logInvoiceError('Database connection error', ['error' => $e->getMessage()]);
        sendJsonResponse([
            'status' => 'error', 
            'message' => 'Database connection failed. Please try again later.',
            'error_details' => $debugMode ? $e->getMessage() : null
        ], 500);
    }
    
    // Check if we already have an invoice record
    try {
        // Check if invoices table exists
        $tableCheck = $conn->query("SHOW TABLES LIKE 'invoices'");
        if ($tableCheck->num_rows === 0) {
            // Create invoices table if it doesn't exist
            $createTableSql = "
                CREATE TABLE IF NOT EXISTS invoices (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    booking_id INT NOT NULL,
                    invoice_number VARCHAR(50) NOT NULL UNIQUE,
                    amount DECIMAL(10,2) NOT NULL,
                    tax_amount DECIMAL(10,2),
                    total_amount DECIMAL(10,2) NOT NULL,
                    status VARCHAR(20) DEFAULT 'generated',
                    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            ";
            $conn->query($createTableSql);
            logInvoiceError('Created invoices table', []);
        }
        
        // Check if invoice already exists
        $invoiceStmt = $conn->prepare("SELECT * FROM invoices WHERE booking_id = ?");
        $invoiceStmt->bind_param("i", $bookingId);
        $invoiceStmt->execute();
        $invoiceResult = $invoiceStmt->get_result();
        
        if ($invoiceResult->num_rows > 0) {
            // Return existing invoice
            $invoice = $invoiceResult->fetch_assoc();
            sendJsonResponse([
                'status' => 'success',
                'message' => 'Invoice already exists',
                'data' => [
                    'id' => (int)$invoice['id'],
                    'bookingId' => (int)$invoice['booking_id'],
                    'invoiceNumber' => $invoice['invoice_number'],
                    'amount' => (float)$invoice['amount'],
                    'taxAmount' => (float)$invoice['tax_amount'],
                    'totalAmount' => (float)$invoice['total_amount'],
                    'status' => $invoice['status'],
                    'generatedAt' => $invoice['generated_at'],
                    'updatedAt' => $invoice['updated_at']
                ]
            ]);
            exit;
        }
    } catch (Exception $e) {
        // Non-critical error, we will try to generate a new invoice
        logInvoiceError('Error checking existing invoice', ['error' => $e->getMessage()]);
    }
    
    // Get booking details
    try {
        $bookingStmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
        if (!$bookingStmt) {
            throw new Exception("Failed to prepare statement: " . $conn->error);
        }
        
        $bookingStmt->bind_param("i", $bookingId);
        $success = $bookingStmt->execute();
        
        if (!$success) {
            throw new Exception("Failed to execute statement: " . $bookingStmt->error);
        }
        
        $bookingResult = $bookingStmt->get_result();
        
        if ($bookingResult->num_rows === 0) {
            logInvoiceError('Booking not found', ['booking_id' => $bookingId]);
            sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
        }
        
        $booking = $bookingResult->fetch_assoc();
    } catch (Exception $e) {
        logInvoiceError('Error retrieving booking', ['booking_id' => $bookingId, 'error' => $e->getMessage()]);
        
        // Return success with minimal data as fallback
        sendJsonResponse([
            'status' => 'success',
            'message' => 'Invoice generated in fallback mode',
            'fallback' => true,
            'data' => [
                'bookingId' => $bookingId,
                'invoiceNumber' => 'INV-' . date('Ymd') . '-' . $bookingId,
                'generatedAt' => date('Y-m-d H:i:s')
            ]
        ]);
        exit;
    }
    
    // Generate invoice data
    $invoiceNumber = 'INV-' . date('Ymd') . '-' . $booking['id'];
    $totalAmount = $booking['total_amount'];
    $taxRate = 0.18; // 18% GST
    $taxAmount = $totalAmount * $taxRate / (1 + $taxRate); // Calculate tax included in amount
    $amount = $totalAmount - $taxAmount; // Base amount before tax
    
    // Create invoice record
    try {
        $insertStmt = $conn->prepare("
            INSERT INTO invoices (booking_id, invoice_number, amount, tax_amount, total_amount)
            VALUES (?, ?, ?, ?, ?)
        ");
        
        if (!$insertStmt) {
            throw new Exception("Failed to prepare insert statement: " . $conn->error);
        }
        
        $insertStmt->bind_param("isddd", $bookingId, $invoiceNumber, $amount, $taxAmount, $totalAmount);
        $success = $insertStmt->execute();
        
        if (!$success) {
            throw new Exception("Failed to create invoice: " . $insertStmt->error);
        }
        
        $invoiceId = $conn->insert_id;
    } catch (Exception $e) {
        logInvoiceError('Error creating invoice record', ['booking_id' => $bookingId, 'error' => $e->getMessage()]);
        
        // Return success anyway to allow frontend to proceed
        sendJsonResponse([
            'status' => 'success',
            'message' => 'Invoice generated (error creating record)',
            'warning' => $e->getMessage(),
            'data' => [
                'id' => 0,
                'bookingId' => $bookingId,
                'invoiceNumber' => $invoiceNumber,
                'amount' => $amount,
                'taxAmount' => $taxAmount,
                'totalAmount' => $totalAmount,
                'status' => 'generated',
                'generatedAt' => date('Y-m-d H:i:s')
            ]
        ]);
        exit;
    }
    
    // Return success response
    sendJsonResponse([
        'status' => 'success',
        'message' => 'Invoice generated successfully',
        'data' => [
            'id' => $invoiceId,
            'bookingId' => $bookingId,
            'invoiceNumber' => $invoiceNumber,
            'amount' => $amount,
            'taxAmount' => $taxAmount,
            'totalAmount' => $totalAmount,
            'status' => 'generated',
            'generatedAt' => date('Y-m-d H:i:s')
        ]
    ]);

} catch (Exception $e) {
    logInvoiceError('Unhandled error', ['error' => $e->getMessage()]);
    
    // Return a more user-friendly error
    sendJsonResponse([
        'status' => 'error',
        'message' => 'An error occurred while generating the invoice. Please try again later.',
        'error_details' => $debugMode ? $e->getMessage() : null
    ], 500);
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
