
<?php
// Include configuration file
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/common/db_helper.php';

// Clear all output buffers first
while (ob_get_level()) ob_end_clean();

// Debug mode
$debugMode = isset($_GET['debug']) || isset($_SERVER['HTTP_X_DEBUG']);

// CRITICAL: Set CORS headers
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
        sendJsonResponse(['status' => 'error', 'message' => 'Booking ID is required'], 400);
    }

    // Get GST parameters from GET
    $gstEnabled = isset($_GET['gstEnabled']) ? filter_var($_GET['gstEnabled'], FILTER_VALIDATE_BOOLEAN) : false;
    $gstNumber = isset($_GET['gstNumber']) ? $_GET['gstNumber'] : '';
    $companyName = isset($_GET['companyName']) ? $_GET['companyName'] : '';
    $companyAddress = isset($_GET['companyAddress']) ? $_GET['companyAddress'] : '';

    // Connect to database
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
        
        // Get extra charges if any
        $extraCharges = 0;
        try {
            $extrasStmt = $conn->prepare("SELECT SUM(amount) AS total FROM booking_extras WHERE booking_id = ?");
            if ($extrasStmt) {
                $extrasStmt->bind_param("i", $bookingId);
                $extrasStmt->execute();
                $extrasResult = $extrasStmt->get_result();
                if ($extrasRow = $extrasResult->fetch_assoc()) {
                    $extraCharges = $extrasRow['total'] ? floatval($extrasRow['total']) : 0;
                }
            }
        } catch (Exception $e) {
            // If table doesn't exist yet or other error, just continue without extra charges
            error_log("Could not fetch booking extras: " . $e->getMessage());
        }
        
        // Generate invoice data from booking
        $invoiceNumber = 'INV-' . date('Ymd') . '-' . $booking['id'];
        $invoiceDate = date('Y-m-d');
        
        // Calculate tax components with GST at 12%
        $totalAmount = (float)$booking['total_amount'] + $extraCharges;
        
        if ($gstEnabled) {
            $baseAmount = $totalAmount / 1.12; // Remove GST from total to get base amount
            $cgstRate = 0.06; // 6%
            $sgstRate = 0.06; // 6%
            
            $cgstAmount = round($baseAmount * $cgstRate, 2);
            $sgstAmount = round($baseAmount * $sgstRate, 2);
            $totalGstAmount = $cgstAmount + $sgstAmount;
            
            $finalAmount = $baseAmount + $totalGstAmount;
        } else {
            // Non-GST calculation
            $baseAmount = $totalAmount;
            $serviceChargeRate = 0.05; // 5% service charge
            $serviceChargeAmount = round($baseAmount * $serviceChargeRate, 2);
            
            $cgstAmount = 0;
            $sgstAmount = 0;
            $totalGstAmount = 0;
            
            $finalAmount = $baseAmount;
        }
        
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
            'base_amount' => $baseAmount,
            'extra_charges' => $extraCharges,
            'gst_enabled' => $gstEnabled,
            'cgst_amount' => $cgstAmount,
            'sgst_amount' => $sgstAmount,
            'total_gst_amount' => $totalGstAmount,
            'service_charge_amount' => 0,
            'final_amount' => $finalAmount,
            'invoice_date' => $invoiceDate,
            'billing_address' => $booking['billing_address'] ?? ''
        ];

        // When building $invoiceData, override GST fields if provided
        if ($gstEnabled) {
            $invoiceData['gst_enabled'] = true;
            $invoiceData['gst_number'] = $gstNumber ?: ($invoiceData['gst_number'] ?? '');
            $invoiceData['company_name'] = $companyName ?: ($invoiceData['company_name'] ?? '');
            $invoiceData['company_address'] = $companyAddress ?: ($invoiceData['company_address'] ?? '');
        }
    }
    
    // Format for HTML output
    $hasGst = $invoiceData['gst_enabled'] && ($invoiceData['cgst_amount'] > 0 || $invoiceData['sgst_amount'] > 0);
    $companyInfo = '';
    
    if ($hasGst && !empty($invoiceData['gst_number'])) {
        $companyInfo = '
        <div class="company-gst-details">
            <h3>Billing To:</h3>
            <p><strong>' . htmlspecialchars($invoiceData['company_name']) . '</strong></p>
            <p>GST Number: ' . htmlspecialchars($invoiceData['gst_number']) . '</p>
            <p>' . nl2br(htmlspecialchars($invoiceData['company_address'])) . '</p>
        </div>';
    } else if (!empty($invoiceData['billing_address'])) {
        $companyInfo = '
        <div class="company-gst-details">
            <h3>Billing To:</h3>
            <p>' . nl2br(htmlspecialchars($invoiceData['billing_address'])) . '</p>
        </div>';
    }
    
    $gstRow = '';
    $extraChargesRow = '';
    $serviceChargeRow = '';
    
    // Add extra charges row if applicable
    if (isset($invoiceData['extra_charges']) && $invoiceData['extra_charges'] > 0) {
        $extraChargesRow = '
        <tr>
            <td>Extra Charges</td>
            <td>₹ ' . number_format($invoiceData['extra_charges'], 2) . '</td>
        </tr>';
    }
    
    if ($hasGst) {
        $gstRow = '
        <tr>
            <td>CGST (6%)</td>
            <td>₹ ' . number_format($invoiceData['cgst_amount'], 2) . '</td>
        </tr>
        <tr>
            <td>SGST (6%)</td>
            <td>₹ ' . number_format($invoiceData['sgst_amount'], 2) . '</td>
        </tr>';
    } else if (isset($invoiceData['service_charge_amount']) && $invoiceData['service_charge_amount'] > 0) {
        $serviceChargeRow = '
        <tr>
            <td>Service Charge (5%)</td>
            <td>₹ ' . number_format($invoiceData['service_charge_amount'], 2) . '</td>
        </tr>';
    }
    
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
            .customer-details, .company-gst-details {
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
                    <h3>Passenger Details:</h3>
                    <p>' . $invoiceData['passenger_name'] . '</p>
                    <p>Phone: ' . $invoiceData['passenger_phone'] . '</p>
                    <p>Email: ' . $invoiceData['passenger_email'] . '</p>
                </div>
                ' . $companyInfo . '
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
                        <td>₹ ' . number_format($invoiceData['base_amount'], 2) . '</td>
                    </tr>
                    ' . $extraChargesRow . '
                    ' . $gstRow . '
                    ' . $serviceChargeRow . '
                    <tr class="total-row">
                        <td>Total Amount</td>
                        <td>₹ ' . number_format($invoiceData['final_amount'], 2) . '</td>
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
        // CRITICAL FIX: Set proper headers before any output
        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="invoice_' . $invoiceData['invoice_number'] . '.pdf"');
        
        // Simple HTML to PDF using browser print capabilities
        echo '<!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
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
                    @page { size: auto; margin: 0; }
                }
                ' . file_get_contents(__DIR__ . '/../css/invoice-print.css') . '
            </style>
        </head>
        <body>' . $invoiceHtml . '</body>
        </html>';
    } else {
        // For HTML output
        header('Content-Type: text/html; charset=UTF-8');
        echo $invoiceHtml;
    }
    
    exit; // Important to prevent any additional output

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
