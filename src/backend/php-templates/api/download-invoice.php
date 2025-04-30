
<?php
// Include configuration file
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/common/db_helper.php';

// Create logs directory if it doesn't exist
$logsDir = __DIR__ . '/../logs';
if (!is_dir($logsDir)) {
    @mkdir($logsDir, 0755, true);
}

// Setup error logging
function logError($message, $data = null) {
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message";
    
    if ($data !== null) {
        $logMessage .= ": " . (is_string($data) ? $data : json_encode($data));
    }
    
    $logFile = __DIR__ . '/../logs/invoice_errors.log';
    file_put_contents($logFile, $logMessage . PHP_EOL, FILE_APPEND);
    error_log($logMessage);
}

// Clear any previous output
if (ob_get_level()) ob_end_clean();

// Check for composer autoloader
$autoloaderPaths = [
    $_SERVER['DOCUMENT_ROOT'] . '/public_html/vendor/autoload.php',
    $_SERVER['DOCUMENT_ROOT'] . '/vendor/autoload.php',
    dirname($_SERVER['DOCUMENT_ROOT']) . '/public_html/vendor/autoload.php',
    dirname($_SERVER['DOCUMENT_ROOT']) . '/vendor/autoload.php',
    __DIR__ . '/../vendor/autoload.php',
    dirname(__DIR__) . '/vendor/autoload.php',
    dirname(dirname(__DIR__)) . '/vendor/autoload.php',
    realpath(__DIR__ . '/../../../vendor/autoload.php')
];

$vendorExists = false;
foreach ($autoloaderPaths as $path) {
    if (file_exists($path)) {
        require_once $path;
        $vendorExists = true;
        logError("Found autoloader at", $path);
        break;
    }
}

if (!$vendorExists) {
    logError("No autoloader found", implode(", ", $autoloaderPaths));
}

// Set headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Debug mode
$debugMode = isset($_GET['debug']) || isset($_SERVER['HTTP_X_DEBUG']);

// Handle errors
function handleError($message, $statusCode = 500) {
    header('Content-Type: application/json');
    http_response_code($statusCode);
    echo json_encode(['error' => $message]);
    exit;
}

try {
    // Get booking ID
    $bookingId = isset($_GET['id']) ? intval($_GET['id']) : null;
    if (!$bookingId) {
        handleError('Missing booking ID', 400);
    }
    
    // Get format (PDF or HTML)
    $format = isset($_GET['format']) ? strtolower($_GET['format']) : 'pdf';
    $directDownload = isset($_GET['direct_download']) && $_GET['direct_download'] === '1';
    
    // Get GST settings
    $gstEnabled = isset($_GET['gstEnabled']) && $_GET['gstEnabled'] === '1';
    $gstNumber = isset($_GET['gstNumber']) ? $_GET['gstNumber'] : '';
    $companyName = isset($_GET['companyName']) ? $_GET['companyName'] : '';
    $companyAddress = isset($_GET['companyAddress']) ? $_GET['companyAddress'] : '';
    $isIGST = isset($_GET['isIGST']) && $_GET['isIGST'] === '1';
    $includeTax = !isset($_GET['includeTax']) || $_GET['includeTax'] === '1';
    $invoiceNumber = isset($_GET['invoiceNumber']) && !empty($_GET['invoiceNumber']) 
                   ? $_GET['invoiceNumber'] 
                   : 'INV-' . date('Ymd') . '-' . $bookingId;
    
    // Log request parameters
    logError("Invoice request parameters", [
        'bookingId' => $bookingId,
        'format' => $format,
        'gstEnabled' => $gstEnabled ? 'true' : 'false',
        'isIGST' => $isIGST ? 'true' : 'false',
        'includeTax' => $includeTax ? 'true' : 'false',
        'invoiceNumber' => $invoiceNumber
    ]);
    
    // Connect to database
    try {
        $conn = getDbConnection();
        logError("Database connection successful");
    } catch (Exception $e) {
        logError("Database connection failed", $e->getMessage());
        handleError('Database connection failed: ' . $e->getMessage());
    }
    
    // Get booking details
    $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
    if (!$stmt) {
        logError("Prepare statement failed", $conn->error);
        handleError('Database error: ' . $conn->error);
    }
    
    $stmt->bind_param('i', $bookingId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        logError("Booking not found", $bookingId);
        handleError('Booking not found', 404);
    }
    
    $booking = $result->fetch_assoc();
    $stmt->close();
    
    logError("Booking data loaded", [
        'id' => $booking['id'],
        'total_amount' => $booking['total_amount'],
        'extra_charges' => $booking['extra_charges']
    ]);
    
    // Parse extra charges from booking
    $extraCharges = [];
    $extraChargesTotal = 0;
    
    if (!empty($booking['extra_charges'])) {
        try {
            logError("Raw extra_charges", $booking['extra_charges']);
            $parsedCharges = json_decode($booking['extra_charges'], true);
            
            if (is_array($parsedCharges)) {
                foreach ($parsedCharges as $charge) {
                    // Standardize format with amount and description
                    $chargeAmount = isset($charge['amount']) ? (float)$charge['amount'] : 0;
                    $extraCharges[] = [
                        'amount' => $chargeAmount,
                        'description' => isset($charge['description']) ? $charge['description'] : 
                                        (isset($charge['label']) ? $charge['label'] : 'Additional Charge')
                    ];
                    $extraChargesTotal += $chargeAmount;
                }
                
                logError("Parsed extra charges", [
                    'charges' => $extraCharges,
                    'total' => $extraChargesTotal
                ]);
            } else {
                logError("Invalid extra_charges format", gettype($parsedCharges));
            }
        } catch (Exception $e) {
            logError("Failed to parse extra_charges", $e->getMessage());
        }
    }
    
    // Calculate amounts including tax and extra charges
    $baseAmount = (float)$booking['total_amount'];
    
    // GST rate is 12% (6% CGST + 6% SGST, or 12% IGST)
    $gstRate = $gstEnabled ? 0.12 : 0;
    
    // Calculate base amount before tax
    if ($includeTax && $gstEnabled) {
        $baseAmountBeforeTax = $baseAmount / (1 + $gstRate);
        $baseAmountBeforeTax = round($baseAmountBeforeTax, 2);
        $taxAmount = $baseAmount - $baseAmountBeforeTax;
        $taxAmount = round($taxAmount, 2);
    } else if (!$includeTax && $gstEnabled) {
        $baseAmountBeforeTax = $baseAmount;
        $taxAmount = $baseAmount * $gstRate;
        $taxAmount = round($taxAmount, 2);
    } else {
        $baseAmountBeforeTax = $baseAmount;
        $taxAmount = 0;
    }
    
    // Split tax into CGST/SGST or IGST
    if ($gstEnabled) {
        if ($isIGST) {
            $igstAmount = $taxAmount;
            $cgstAmount = 0;
            $sgstAmount = 0;
        } else {
            $halfTax = $taxAmount / 2;
            $cgstAmount = round($halfTax, 2);
            $sgstAmount = round($taxAmount - $cgstAmount, 2);
            $igstAmount = 0;
        }
    } else {
        $cgstAmount = 0;
        $sgstAmount = 0;
        $igstAmount = 0;
    }
    
    // Calculate subtotal and grand total including extra charges
    $subtotal = $baseAmountBeforeTax + $taxAmount;
    $grandTotal = $subtotal + $extraChargesTotal;
    $grandTotal = round($grandTotal, 2);
    
    logError("Final calculation", [
        'baseAmountBeforeTax' => $baseAmountBeforeTax,
        'taxAmount' => $taxAmount,
        'subtotal' => $subtotal,
        'extraChargesTotal' => $extraChargesTotal,
        'grandTotal' => $grandTotal
    ]);
    
    // Generate HTML content
    $currentDate = date('Y-m-d');
    
    $htmlContent = '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice #' . $invoiceNumber . '</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        .invoice-container { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; padding: 30px; }
        .invoice-header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
        .company-info { text-align: right; }
        .customer-info { margin-bottom: 20px; }
        .booking-details { margin-bottom: 30px; }
        .booking-details table { width: 100%; border-collapse: collapse; }
        .booking-details td, .booking-details th { padding: 8px; text-align: left; }
        .fare-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .fare-table td, .fare-table th { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        .fare-table td:last-child, .fare-table th:last-child { text-align: right; }
        .total-row { font-weight: bold; background-color: #f9f9f9; }
        .extra-charges { margin-top: 20px; }
        .grand-total { font-size: 1.2em; font-weight: bold; margin-top: 20px; text-align: right; }
        .footer { margin-top: 50px; text-align: center; color: #777; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="invoice-header">
            <div>
                <h1>INVOICE</h1>
                <p>Invoice #: ' . $invoiceNumber . '</p>
                <p>Date: ' . $currentDate . '</p>
                <p>Booking #: ' . $booking['booking_number'] . '</p>
            </div>
            <div class="company-info">
                <h2>BE Rides</h2>
                <p>Vizag, Andhra Pradesh, India</p>
                <p>Phone: +91-7093864511</p>
                <p>Email: info@berides.in</p>
            </div>
        </div>
        
        <div class="customer-info">
            <h3>Bill To:</h3>
            <p><strong>' . $booking['passenger_name'] . '</strong></p>
            <p>Phone: ' . $booking['passenger_phone'] . '</p>
            <p>Email: ' . $booking['passenger_email'] . '</p>';
            
    if ($gstEnabled && !empty($gstNumber)) {
        $htmlContent .= '<p>GST Number: ' . $gstNumber . '</p>';
        if (!empty($companyName)) {
            $htmlContent .= '<p>Company: ' . $companyName . '</p>';
        }
        if (!empty($companyAddress)) {
            $htmlContent .= '<p>Address: ' . $companyAddress . '</p>';
        }
    }
    
    $htmlContent .= '
        </div>
        
        <div class="booking-details">
            <h3>Booking Details:</h3>
            <table>
                <tr>
                    <td><strong>Pickup:</strong></td>
                    <td>' . $booking['pickup_location'] . '</td>
                </tr>';
    
    if (!empty($booking['drop_location'])) {
        $htmlContent .= '
                <tr>
                    <td><strong>Drop:</strong></td>
                    <td>' . $booking['drop_location'] . '</td>
                </tr>';
    }
    
    $pickupDate = date('d M Y, h:i A', strtotime($booking['pickup_date']));
    
    $htmlContent .= '
                <tr>
                    <td><strong>Date:</strong></td>
                    <td>' . $pickupDate . '</td>
                </tr>
                <tr>
                    <td><strong>Vehicle:</strong></td>
                    <td>' . $booking['cab_type'] . '</td>
                </tr>
            </table>
        </div>
        
        <div class="fare-details">
            <h3>Fare Breakdown:</h3>
            <table class="fare-table">
                <tr>
                    <th>Description</th>
                    <th>Amount</th>
                </tr>
                <tr>
                    <td>Base Fare</td>
                    <td>₹ ' . number_format($baseAmountBeforeTax, 2) . '</td>
                </tr>';
    
    // Add tax details if GST is enabled
    if ($gstEnabled) {
        if ($isIGST) {
            $htmlContent .= '
                <tr>
                    <td>IGST (12%)</td>
                    <td>₹ ' . number_format($igstAmount, 2) . '</td>
                </tr>';
        } else {
            $htmlContent .= '
                <tr>
                    <td>CGST (6%)</td>
                    <td>₹ ' . number_format($cgstAmount, 2) . '</td>
                </tr>
                <tr>
                    <td>SGST (6%)</td>
                    <td>₹ ' . number_format($sgstAmount, 2) . '</td>
                </tr>';
        }
    }
    
    // Add subtotal (base fare + tax)
    $htmlContent .= '
                <tr class="total-row">
                    <td>Subtotal</td>
                    <td>₹ ' . number_format($subtotal, 2) . '</td>
                </tr>
            </table>';
    
    // Add extra charges section if available
    if (!empty($extraCharges)) {
        $htmlContent .= '
        <div class="extra-charges">
            <h3>Extra Charges:</h3>
            <table class="fare-table">
                <tr>
                    <th>Description</th>
                    <th>Amount</th>
                </tr>';
        
        foreach ($extraCharges as $charge) {
            $description = isset($charge['description']) ? htmlspecialchars($charge['description']) : 
                         (isset($charge['label']) ? htmlspecialchars($charge['label']) : 'Additional Charge');
            $amount = isset($charge['amount']) ? (float)$charge['amount'] : 0;
            
            $htmlContent .= '
                <tr>
                    <td>' . $description . '</td>
                    <td>₹ ' . number_format($amount, 2) . '</td>
                </tr>';
        }
        
        $htmlContent .= '
            </table>
        </div>';
    }
    
    // Add grand total
    $htmlContent .= '
        <div class="grand-total">
            Grand Total: ₹ ' . number_format($grandTotal, 2) . '
        </div>
        
        <div class="footer">
            <p>Thank you for choosing BE Rides. For any queries, please contact us at info@berides.in</p>';
    
    if ($gstEnabled) {
        $htmlContent .= '<p>This is a computer-generated invoice and does not require a signature</p>';
    }
    
    $htmlContent .= '
        </div>
    </div>
</body>
</html>';

    // Output based on format
    if ($format === 'html') {
        header('Content-Type: text/html; charset=utf-8');
        echo $htmlContent;
        exit;
    }
    
    // Generate PDF if mPDF is available
    if ($vendorExists) {
        try {
            $mpdf = new \Mpdf\Mpdf([
                'mode' => 'utf-8',
                'format' => 'A4',
                'margin_top' => 15,
                'margin_bottom' => 15,
                'margin_left' => 15,
                'margin_right' => 15
            ]);
            
            $mpdf->SetTitle("Invoice #{$invoiceNumber}");
            $mpdf->SetAuthor('BE Rides');
            $mpdf->SetCreator('BE Rides Invoice System');
            
            $mpdf->WriteHTML($htmlContent);
            
            if ($directDownload) {
                $mpdf->Output("Invoice_{$invoiceNumber}.pdf", 'D');
            } else {
                $mpdf->Output("Invoice_{$invoiceNumber}.pdf", 'I');
            }
            exit;
        } catch (Exception $e) {
            logError("PDF generation failed", $e->getMessage());
            // Fall back to HTML output
            header('Content-Type: text/html; charset=utf-8');
            echo $htmlContent;
            exit;
        }
    } else {
        // If mPDF is not available, output HTML
        logError("PDF generation not available, falling back to HTML");
        header('Content-Type: text/html; charset=utf-8');
        echo $htmlContent;
        exit;
    }

} catch (Exception $e) {
    logError("Fatal error", $e->getMessage() . "\n" . $e->getTraceAsString());
    
    if (strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false) {
        header('Content-Type: application/json');
        echo json_encode([
            'error' => 'Failed to generate invoice: ' . $e->getMessage(),
            'details' => $debugMode ? $e->getTraceAsString() : null
        ]);
    } else {
        header('Content-Type: text/html; charset=utf-8');
        echo '<h1>Error</h1><p>' . htmlspecialchars($e->getMessage()) . '</p>';
        if ($debugMode) {
            echo '<pre>' . htmlspecialchars($e->getTraceAsString()) . '</pre>';
        }
    }
    exit;
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
