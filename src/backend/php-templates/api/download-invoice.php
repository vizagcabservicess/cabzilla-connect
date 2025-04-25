
<?php
// Include configuration file
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/common/db_helper.php';

// OVERRIDE any previously set headers
if (headers_sent()) {
    // Log if headers have been sent
    error_log("Headers already sent before download-invoice.php execution");
} else {
    // Clear any existing output buffers
    while (ob_get_level()) ob_end_clean();
}

// Debug mode
$debugMode = isset($_GET['debug']) || isset($_SERVER['HTTP_X_DEBUG']);

// CORS headers (these are safe to repeat even if headers sent)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// JSON response in case of error
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    if (ob_get_level()) ob_end_clean();
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

// Log error function
function logInvoiceError($message, $data = []) {
    error_log("INVOICE ERROR: $message " . json_encode($data));
    $logFile = __DIR__ . '/../logs/invoice_errors.log';
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
    // Only allow GET requests
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }

    // Get booking ID from query parameters
    $bookingId = isset($_GET['id']) ? (int)$_GET['id'] : null;
    
    if (!$bookingId) {
        sendJsonResponse(['status' => 'error', 'message' => 'Missing booking ID'], 400);
    }

    // Connect to database with improved error handling
    $conn = getDbConnectionWithRetry();
    
    // First check if we have an invoice record
    $invoiceStmt = $conn->prepare("SELECT * FROM invoices WHERE booking_id = ?");
    $invoiceExists = false;
    $invoiceData = null;
    
    if ($conn->error) {
        // Invoices table might not exist yet
        logInvoiceError("Invoices table check: " . $conn->error);
    } else {
        $invoiceStmt->bind_param("i", $bookingId);
        $invoiceStmt->execute();
        $invoiceResult = $invoiceStmt->get_result();
        
        if ($invoiceResult->num_rows > 0) {
            $invoiceExists = true;
            $invoiceData = $invoiceResult->fetch_assoc();
        }
    }
    
    // If no invoice record, get booking details
    if (!$invoiceExists) {
        $bookingStmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
        $bookingStmt->bind_param("i", $bookingId);
        $bookingStmt->execute();
        $bookingResult = $bookingStmt->get_result();
        
        if ($bookingResult->num_rows === 0) {
            sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
        }
        
        $booking = $bookingResult->fetch_assoc();
        
        // Generate invoice data from booking
        $invoiceNumber = 'INV-' . date('Ymd') . '-' . $booking['id'];
        $invoiceDate = date('Y-m-d');
        
        // Calculate tax components (15% tax)
        $baseFare = round($booking['total_amount'] * 0.85);
        $taxAmount = $booking['total_amount'] - $baseFare;
        
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
            'status' => 'generated'
        ];
    }
    
    // Format for HTML output
    $invoiceHtml = '
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
            .invoice-header div:first-child {
                float: left;
            }
            .invoice-header div:last-child {
                float: right;
                text-align: right;
            }
            .invoice-details {
                margin-bottom: 40px;
                overflow: auto;
            }
            .customer-details {
                float: left;
                width: 48%;
            }
            .invoice-summary {
                float: right;
                width: 48%;
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
            h1 {
                color: #444;
                margin: 0 0 10px 0;
            }
            h3 {
                color: #555;
                margin-bottom: 10px;
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
    
    // Decide how to output the invoice - HTML or PDF
    $format = isset($_GET['format']) ? $_GET['format'] : 'html';
    
    if ($format === 'pdf') {
        // For PDF generation, we'll use a simple HTML to PDF conversion
        // This is a lightweight approach that avoids requiring external libraries
        
        // Force download with proper headers
        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="invoice_' . $invoiceData['invoice_number'] . '.pdf"');
        
        // Very simple HTML to PDF conversion using browser print capabilities
        echo '<!DOCTYPE html>
        <html>
        <head>
            <title>Invoice #' . $invoiceData['invoice_number'] . '</title>
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() {
                        document.querySelector("body").innerHTML = "<h1>Your invoice has been downloaded. You may close this window.</h1>";
                    }, 1000);
                };
            </script>
            <style>
                @media print {
                    body { margin: 0; }
                    @page { margin: 0; }
                }
            </style>
        </head>
        <body>' . $invoiceHtml . '</body>
        </html>';
        exit;
    } else {
        // For HTML, we'll just output the invoice HTML directly
        header('Content-Type: text/html; charset=UTF-8');
        echo $invoiceHtml;
        exit;
    }

} catch (Exception $e) {
    logInvoiceError("Error in download-invoice.php", ['error' => $e->getMessage()]);
    sendJsonResponse([
        'status' => 'error', 
        'message' => 'Failed to generate invoice: ' . $e->getMessage(),
        'error_details' => $debugMode ? $e->getMessage() : null
    ], 500);
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
