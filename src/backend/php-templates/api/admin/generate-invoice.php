
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';

// CRITICAL: Set all response headers first before any output
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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

try {
    // Allow both GET and POST methods
    if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }

    // Get booking ID from query parameters or POST data
    $bookingId = null;
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $bookingId = isset($_GET['id']) ? (int)$_GET['id'] : null;
    } else {
        // Get JSON input data for POST
        $jsonData = file_get_contents('php://input');
        $data = json_decode($jsonData, true);
        $bookingId = isset($data['bookingId']) ? (int)$data['bookingId'] : null;
    }
    
    if (!$bookingId) {
        sendJsonResponse(['status' => 'error', 'message' => 'Missing booking ID'], 400);
    }

    // Connect to database with improved error handling
    $conn = getDbConnectionWithRetry();
    
    // Get booking details
    $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
    $stmt->bind_param("i", $bookingId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
    }
    
    $booking = $result->fetch_assoc();
    
    // Generate invoice data
    $invoiceNumber = 'INV-' . date('Ymd') . '-' . $booking['id'];
    $invoiceDate = date('Y-m-d');
    
    // Calculate tax components (15% tax)
    $baseFare = round($booking['total_amount'] * 0.85);
    $taxAmount = $booking['total_amount'] - $baseFare;
    
    // Create invoice record in invoices table if it exists
    $invoiceData = [
        'invoice_number' => $invoiceNumber,
        'booking_id' => $booking['id'],
        'booking_number' => $booking['booking_number'],
        'passenger_name' => $booking['passenger_name'],
        'passenger_email' => $booking['passenger_email'],
        'passenger_phone' => $booking['passenger_phone'],
        'trip_type' => $booking['trip_type'],
        'trip_mode' => $booking['trip_mode'],
        'pickup_location' => $booking['pickup_location'],
        'drop_location' => $booking['drop_location'],
        'pickup_date' => $booking['pickup_date'],
        'cab_type' => $booking['cab_type'],
        'base_fare' => $baseFare,
        'tax_amount' => $taxAmount,
        'total_amount' => $booking['total_amount'],
        'invoice_date' => $invoiceDate,
        'status' => 'generated',
    ];
    
    // Check if invoices table exists, create it if needed
    $checkTableResult = $conn->query("SHOW TABLES LIKE 'invoices'");
    if ($checkTableResult->num_rows === 0) {
        $createInvoicesTableSql = "
            CREATE TABLE invoices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                invoice_number VARCHAR(50) NOT NULL UNIQUE,
                booking_id INT NOT NULL,
                booking_number VARCHAR(50) NOT NULL,
                passenger_name VARCHAR(100) NOT NULL,
                passenger_email VARCHAR(100) NOT NULL,
                passenger_phone VARCHAR(20) NOT NULL,
                trip_type VARCHAR(20) NOT NULL,
                trip_mode VARCHAR(20) NOT NULL,
                pickup_location TEXT NOT NULL,
                drop_location TEXT,
                pickup_date DATETIME NOT NULL,
                cab_type VARCHAR(50) NOT NULL,
                base_fare DECIMAL(10,2) NOT NULL,
                tax_amount DECIMAL(10,2) NOT NULL,
                total_amount DECIMAL(10,2) NOT NULL,
                invoice_date DATE NOT NULL,
                status VARCHAR(20) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        $conn->query($createInvoicesTableSql);
    }
    
    // Check if invoice already exists for this booking
    $checkInvoiceStmt = $conn->prepare("SELECT id FROM invoices WHERE booking_id = ?");
    $checkInvoiceStmt->bind_param("i", $bookingId);
    $checkInvoiceStmt->execute();
    $invoiceResult = $checkInvoiceStmt->get_result();
    
    if ($invoiceResult->num_rows > 0) {
        $existingInvoice = $invoiceResult->fetch_assoc();
        $invoiceId = $existingInvoice['id'];
        
        // Update invoice status
        $updateStmt = $conn->prepare("UPDATE invoices SET status = 'generated', updated_at = NOW() WHERE id = ?");
        $updateStmt->bind_param("i", $invoiceId);
        $updateStmt->execute();
    } else {
        // Insert new invoice
        $insertSql = "INSERT INTO invoices (invoice_number, booking_id, booking_number, passenger_name, passenger_email, 
                      passenger_phone, trip_type, trip_mode, pickup_location, drop_location, pickup_date, cab_type, 
                      base_fare, tax_amount, total_amount, invoice_date, status) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $insertStmt = $conn->prepare($insertSql);
        $insertStmt->bind_param(
            "sisssssssssdddss",
            $invoiceData['invoice_number'],
            $invoiceData['booking_id'],
            $invoiceData['booking_number'],
            $invoiceData['passenger_name'],
            $invoiceData['passenger_email'],
            $invoiceData['passenger_phone'],
            $invoiceData['trip_type'],
            $invoiceData['trip_mode'],
            $invoiceData['pickup_location'],
            $invoiceData['drop_location'],
            $invoiceData['pickup_date'],
            $invoiceData['cab_type'],
            $invoiceData['base_fare'],
            $invoiceData['tax_amount'],
            $invoiceData['total_amount'],
            $invoiceData['invoice_date'],
            $invoiceData['status']
        );
        $insertStmt->execute();
        
        // Update booking to indicate invoice has been created
        $updateBookingStmt = $conn->prepare("UPDATE bookings SET invoice_generated = 1 WHERE id = ?");
        if ($conn->error) {
            // If invoice_generated column doesn't exist, we'll add it
            $conn->query("ALTER TABLE bookings ADD COLUMN invoice_generated TINYINT(1) DEFAULT 0");
            $updateBookingStmt = $conn->prepare("UPDATE bookings SET invoice_generated = 1 WHERE id = ?");
        }
        $updateBookingStmt->bind_param("i", $bookingId);
        $updateBookingStmt->execute();
    }
    
    // Add invoice download URL to response
    $invoiceUrl = "/api/download-invoice.php?id=" . $bookingId;
    
    // Add code for HTML invoice generation - sent in response for immediate access
    $invoiceHtml = generateInvoiceHTML($invoiceData);
    
    // Send success response with invoice data
    sendJsonResponse([
        'status' => 'success', 
        'message' => 'Invoice generated successfully',
        'data' => [
            'invoiceNumber' => $invoiceNumber,
            'invoiceDate' => $invoiceDate,
            'bookingDetails' => [
                'id' => (int)$booking['id'],
                'bookingNumber' => $booking['booking_number'],
                'passengerName' => $booking['passenger_name'],
                'tripType' => $booking['trip_type'],
                'pickupDate' => $booking['pickup_date'],
                'cabType' => $booking['cab_type']
            ],
            'fareBreakdown' => [
                'baseFare' => $baseFare,
                'taxAmount' => $taxAmount,
                'totalAmount' => (float)$booking['total_amount']
            ],
            'downloadUrl' => $invoiceUrl,
            'invoiceHtml' => $invoiceHtml
        ]
    ]);

} catch (Exception $e) {
    error_log("Error in generate-invoice.php: " . $e->getMessage());
    sendJsonResponse([
        'status' => 'error', 
        'message' => 'Failed to generate invoice: ' . $e->getMessage(),
        'error_details' => $debugMode ? $e->getMessage() : null
    ], 500);
}

// Function to generate a simple HTML invoice
function generateInvoiceHTML($invoiceData) {
    $html = '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Invoice #' . $invoiceData['invoice_number'] . '</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 20px;
                color: #333;
            }
            .invoice-container {
                max-width: 800px;
                margin: 0 auto;
                border: 1px solid #ddd;
                padding: 30px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            }
            .invoice-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 20px;
                padding-bottom: 20px;
                border-bottom: 1px solid #ddd;
            }
            .invoice-details {
                margin-bottom: 40px;
            }
            .customer-details {
                float: left;
                width: 50%;
            }
            .invoice-summary {
                float: right;
                width: 45%;
                text-align: right;
            }
            .booking-details {
                clear: both;
                margin-bottom: 30px;
                padding-top: 20px;
            }
            .fare-breakdown {
                margin-top: 30px;
                border-top: 1px solid #ddd;
                padding-top: 20px;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
            }
            table th, table td {
                padding: 10px;
                text-align: left;
                border-bottom: 1px solid #ddd;
            }
            .total-row {
                font-weight: bold;
                font-size: 1.1em;
            }
            .company-info {
                margin-top: 40px;
                text-align: center;
                font-size: 0.9em;
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class="invoice-container">
            <div class="invoice-header">
                <div>
                    <h1>INVOICE</h1>
                    <p>Vishakapatnam Cab Services</p>
                </div>
                <div>
                    <p><strong>Invoice #:</strong> ' . $invoiceData['invoice_number'] . '</p>
                    <p><strong>Date:</strong> ' . $invoiceData['invoice_date'] . '</p>
                    <p><strong>Booking #:</strong> ' . $invoiceData['booking_number'] . '</p>
                </div>
            </div>
            
            <div class="invoice-details">
                <div class="customer-details">
                    <h3>Billed To:</h3>
                    <p>' . $invoiceData['passenger_name'] . '</p>
                    <p>Phone: ' . $invoiceData['passenger_phone'] . '</p>
                    <p>Email: ' . $invoiceData['passenger_email'] . '</p>
                </div>
                <div class="invoice-summary">
                    <h3>Trip Summary:</h3>
                    <p><strong>Trip Type:</strong> ' . ucfirst($invoiceData['trip_type']) . ' (' . ucfirst($invoiceData['trip_mode']) . ')</p>
                    <p><strong>Date:</strong> ' . date('d M Y', strtotime($invoiceData['pickup_date'])) . '</p>
                    <p><strong>Vehicle:</strong> ' . $invoiceData['cab_type'] . '</p>
                </div>
            </div>
            
            <div class="booking-details">
                <h3>Trip Details:</h3>
                <p><strong>Pickup Location:</strong> ' . $invoiceData['pickup_location'] . '</p>
                ' . ($invoiceData['drop_location'] ? '<p><strong>Drop Location:</strong> ' . $invoiceData['drop_location'] . '</p>' : '') . '
                <p><strong>Pickup Date/Time:</strong> ' . date('d M Y, h:i A', strtotime($invoiceData['pickup_date'])) . '</p>
            </div>
            
            <div class="fare-breakdown">
                <h3>Fare Breakdown:</h3>
                <table>
                    <tr>
                        <th>Description</th>
                        <th>Amount</th>
                    </tr>
                    <tr>
                        <td>Base Fare</td>
                        <td>₹ ' . number_format($invoiceData['base_fare'], 2) . '</td>
                    </tr>
                    <tr>
                        <td>Taxes</td>
                        <td>₹ ' . number_format($invoiceData['tax_amount'], 2) . '</td>
                    </tr>
                    <tr class="total-row">
                        <td>Total Amount</td>
                        <td>₹ ' . number_format($invoiceData['total_amount'], 2) . '</td>
                    </tr>
                </table>
            </div>
            
            <div class="company-info">
                <p>Thank you for choosing Vishakapatnam Cab Services.</p>
                <p>For any questions regarding this invoice, please contact support@vizagcabs.com</p>
            </div>
        </div>
    </body>
    </html>
    ';
    
    return $html;
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
