<?php
// CRITICAL: No output before this point
// Turn off output buffering and disable implicit flush
@ini_set('output_buffering', 'off');
@ini_set('implicit_flush', true);
@ini_set('zlib.output_compression', false);

// Prevent any unwanted output
ob_start();

// Include configuration file - use absolute path with __DIR__ for reliability
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/common/db_helper.php';
require_once __DIR__ . '/utils/response.php';

// Import DomPDF classes at the top level
use Dompdf\Dompdf;
use Dompdf\Options;

// CRITICAL: Create logs directory if it doesn't exist
$logsDir = __DIR__ . '/../logs';
if (!is_dir($logsDir)) {
    @mkdir($logsDir, 0755, true);
}

// Debug mode
$debugMode = isset($_GET['debug']) || isset($_SERVER['HTTP_X_DEBUG']);

// Get output format - default to PDF
$format = isset($_GET['format']) ? strtolower($_GET['format']) : 'pdf';
$isPdfOutput = ($format === 'pdf');

// CRITICAL: Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Improved error logging function with file path
function logInvoiceError($message, $data = []) {
    $formattedData = is_array($data) ? json_encode($data) : (string)$data;
    $errorMessage = "INVOICE ERROR: $message " . $formattedData;
    error_log($errorMessage);
    
    $logFile = __DIR__ . '/../logs/invoice_errors.log';
    $dir = dirname($logFile);
    
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    
    @file_put_contents(
        $logFile,
        date('Y-m-d H:i:s') . " - $message - " . $formattedData . "\n",
        FILE_APPEND
    );
}

// Enhanced error handling for the entire script
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    logInvoiceError("PHP Error", [
        'error' => $errstr,
        'file' => $errfile,
        'line' => $errline,
        'type' => $errno
    ]);
}, E_ALL);

// Enhanced debug logging function
function debugLog($message, $data = null) {
    global $debugMode;
    $log = date('Y-m-d H:i:s') . " - " . $message;
    if ($data !== null) {
        $log .= " - Data: " . (is_array($data) ? json_encode($data) : $data);
    }
    
    // Always log to file
    error_log($log);
    logInvoiceError($log);
    
    // Output to browser if in debug mode
    if ($debugMode) {
        echo $log . "\n";
    }
}

try {
    // Only allow GET requests
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        if (!$isPdfOutput) {
            sendErrorResponse('Method not allowed', [], 405);
        } else {
            header('Content-Type: text/plain');
            echo "Error 405: Method not allowed. Only GET requests are accepted.";
            exit;
        }
    }

    // Get booking ID from query parameters
    $bookingId = isset($_GET['id']) ? (int)$_GET['id'] : null;
    
    if (!$bookingId) {
        logInvoiceError("Missing booking ID", ['get_params' => $_GET]);
        if (!$isPdfOutput) {
            sendErrorResponse('Missing booking ID', [], 400);
        } else {
            header('Content-Type: text/plain');
            echo "Error 400: Missing booking ID parameter.";
            exit;
        }
    }

    // Get GST parameters from GET
    $gstEnabled = isset($_GET['gstEnabled']) ? filter_var($_GET['gstEnabled'], FILTER_VALIDATE_BOOLEAN) : false;
    $gstNumber = isset($_GET['gstNumber']) ? $_GET['gstNumber'] : '';
    $companyName = isset($_GET['companyName']) ? $_GET['companyName'] : '';
    $companyAddress = isset($_GET['companyAddress']) ? $_GET['companyAddress'] : '';
    $isIGST = isset($_GET['isIGST']) ? filter_var($_GET['isIGST'], FILTER_VALIDATE_BOOLEAN) : false;
    $includeTax = isset($_GET['includeTax']) ? filter_var($_GET['includeTax'], FILTER_VALIDATE_BOOLEAN) : true;
    $customInvoiceNumber = isset($_GET['invoiceNumber']) ? $_GET['invoiceNumber'] : '';
    
    // Check for direct download flag - special handling for ensuring proper download
    $directDownload = isset($_GET['direct_download']) && $_GET['direct_download'] === '1';

    logInvoiceError("Starting invoice generation process", [
        'bookingId' => $bookingId,
        'format' => $format,
        'directDownload' => $directDownload
    ]);

    // CRITICAL: Improved autoloader detection with absolute paths
    $autoloaderPaths = [
        // Primary location - public_html/vendor
        __DIR__ . '/../../../../public_html/vendor/autoload.php',
        
        // Backup locations
        $_SERVER['DOCUMENT_ROOT'] . '/vendor/autoload.php',
        dirname($_SERVER['DOCUMENT_ROOT']) . '/vendor/autoload.php',
        __DIR__ . '/../../vendor/autoload.php',
        __DIR__ . '/../vendor/autoload.php',
        dirname(dirname(__DIR__)) . '/vendor/autoload.php'
    ];

    $vendorExists = false;
    $autoloaderPath = null;
    $autoloaderSearchResults = [];

    foreach ($autoloaderPaths as $path) {
        $realPath = realpath($path);
        $autoloaderSearchResults[$path] = [
            'exists' => file_exists($path),
            'readable' => is_readable($path),
            'realpath' => $realPath
        ];
        
        if (file_exists($path) && is_readable($path)) {
            $autoloaderPath = $path;
            $vendorExists = true;
            logInvoiceError("Found autoloader at: " . $path . " (realpath: " . $realPath . ")");
            break;
        }
    }

    // Log autoloader search results
    logInvoiceError("Autoloader search results", $autoloaderSearchResults);

    // Try to include the autoloader
    if ($vendorExists) {
        require_once $autoloaderPath;
        logInvoiceError("Successfully included autoloader from: " . $autoloaderPath);
        
        // Verify DomPDF class exists
        if (class_exists('Dompdf\Dompdf')) {
            logInvoiceError("DomPDF class found successfully");
        } else {
            logInvoiceError("DomPDF class not found after including autoloader");
        }
    } else {
        logInvoiceError("CRITICAL ERROR: No composer autoloader found!");
    }

    // Connect to database with improved error handling
    try {
        $conn = getDbConnectionWithRetry();
        logInvoiceError("Database connection established successfully");
    } catch (Exception $e) {
        logInvoiceError("Database connection error", ['error' => $e->getMessage()]);
        throw new Exception("Database connection failed: " . $e->getMessage());
    }
    
    // Fetch booking data
    $booking = null;
    $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
    if ($stmt) {
        $stmt->bind_param("i", $bookingId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            if (!$isPdfOutput) {
                sendErrorResponse('Booking not found', [], 404);
            } else {
                header('Content-Type: text/plain');
                echo "Error 404: Booking not found.";
                exit;
            }
        }
        
        $booking = $result->fetch_assoc();
        $stmt->close();
    } else {
        logInvoiceError("Error preparing statement", ['error' => $conn->error]);
        throw new Exception("Database error: " . $conn->error);
    }

    // Parse and standardize extra charges
    $extraCharges = [];
    if (!empty($booking['extra_charges'])) {
        try {
            $parsedCharges = json_decode($booking['extra_charges'], true);
            if (is_array($parsedCharges)) {
                // Standardize to ensure amount and description fields
                foreach ($parsedCharges as $charge) {
                    $extraCharges[] = [
                        'amount' => isset($charge['amount']) ? (float)$charge['amount'] : 0,
                        'description' => isset($charge['description']) ? $charge['description'] : 
                                      (isset($charge['label']) ? $charge['label'] : 'Additional Charge')
                    ];
                }
                logInvoiceError("Extra charges found", ['charges' => $extraCharges]);
            }
        } catch (Exception $e) {
            logInvoiceError("Failed to parse extra_charges", ['error' => $e->getMessage()]);
        }
    }

    // Calculate extra charges total
    $extraChargesTotal = 0;
    foreach ($extraCharges as $charge) {
        $extraChargesTotal += (float)$charge['amount'];
    }
    logInvoiceError("Extra charges total calculated", ['total' => $extraChargesTotal]);

    // Generate invoice number
    $invoiceNumber = empty($customInvoiceNumber) ? 'INV-' . date('Ymd') . '-' . $bookingId : $customInvoiceNumber;

    // Current date for invoice generation
    $currentDate = date('Y-m-d');

    // Base total amount from booking
    $totalAmount = (float)$booking['total_amount'];
    
    // Convert string to number if needed
    if (!is_numeric($totalAmount)) {
        $totalAmount = floatval($totalAmount) || 0;
    }
    
    // Ensure we have a valid base amount
    if ($totalAmount <= 0) {
        $totalAmount = 0;
    }
    
    // Calculate base amount before tax based on GST settings
    if ($includeTax && $gstEnabled) {
        // If tax is included in total amount (default)
        $baseAmountBeforeTax = $totalAmount / (1 + $gstRate);
        $baseAmountBeforeTax = round($baseAmountBeforeTax, 2);
        $taxAmount = $totalAmount - $baseAmountBeforeTax;
        $taxAmount = round($taxAmount, 2);
    } else if (!$includeTax && $gstEnabled) {
        // If tax is excluded from the base amount
        $baseAmountBeforeTax = $totalAmount;
        $taxAmount = $totalAmount * $gstRate;
        $taxAmount = round($taxAmount, 2);
        $totalAmount = $baseAmountBeforeTax + $taxAmount;
        $totalAmount = round($totalAmount, 2);
    } else {
        // No tax case
        $baseAmountBeforeTax = $totalAmount;
        $taxAmount = 0;
    }
    
    // For GST, split into CGST and SGST or use IGST
    if ($gstEnabled) {
        if ($isIGST) {
            // Interstate - Use IGST (12%)
            $igstAmount = $taxAmount;
            $igstAmount = round($igstAmount, 2);
            $cgstAmount = 0;
            $sgstAmount = 0;
        } else {
            // Intrastate - Split into CGST (6%) and SGST (6%)
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
    
    // Grand total with extra charges added
    $grandTotal = $totalAmount + $extraChargesTotal;
    logInvoiceError("Final calculation", [
        'baseAmount' => $baseAmountBeforeTax,
        'taxAmount' => $taxAmount,
        'totalBeforeExtras' => $totalAmount,
        'extraChargesTotal' => $extraChargesTotal,
        'grandTotal' => $grandTotal
    ]);

    // Instead of searching for CSS, use inline CSS for reliability
    $cssContent = "
    body { 
        font-family: DejaVu Sans, Arial, sans-serif; 
        line-height: 1.4; 
        margin: 0; 
        padding: 10px; 
        color: #333;
        font-size: 9pt;
    }
    .invoice-container { 
        width: 100%; 
        max-width: 800px; 
        margin: 0 auto; 
        padding: 15px; 
    }
    .invoice-header { 
        width: 100%; 
        display: table; 
        margin-bottom: 15px; 
        border-bottom: 1px solid #eee; 
        padding-bottom: 10px; 
    }
    .invoice-header div { 
        display: table-cell; 
    }
    .company-info { 
        text-align: right; 
    }
    h1 { 
        font-size: 18pt; 
        margin: 0 0 5px 0; 
    }
    h2 { 
        font-size: 14pt; 
        margin: 0 0 5px 0; 
    }
    h3 { 
        font-size: 11pt; 
        margin: 10px 0 5px 0; 
    }
    .section-title {
        margin-bottom: 5px;
        padding-bottom: 3px;
        border-bottom: 1px solid #eee;
    }
    .customer-section { 
        margin-bottom: 10px; 
    }
    .customer-section > div {
        padding-right: 15px;
    }
    p { 
        margin: 3px 0; 
    }
    .fare-table { 
        width: 100%; 
        border-collapse: collapse; 
        margin: 10px 0; 
    }
    .fare-table th, .fare-table td { 
        padding: 5px; 
        text-align: left; 
        border-bottom: 1px solid #eee; 
    }
    .fare-table th:last-child, .fare-table td:last-child { 
        text-align: right; 
    }
    .total-row { 
        font-weight: bold; 
        background-color: #f9f9f9; 
    }
    .footer { 
        margin-top: 20px; 
        text-align: center; 
        font-size: 8pt; 
        color: #666; 
        border-top: 1px solid #eee; 
        padding-top: 10px; 
    }
    .gst-details {
        margin: 10px 0;
        padding: 8px;
        border: 1px solid #eee;
        background: #f9f9f9;
        font-size: 9pt;
    }
    .extra-charges {
        margin-top: 20px;
    }
    .extra-charges-table {
        width: 100%;
        border-collapse: collapse;
    }
    .extra-charges-table th, .extra-charges-table td {
        padding: 5px;
        text-align: left;
        border-bottom: 1px solid #eee;
    }
    .extra-charges-table th:last-child, .extra-charges-table td:last-child {
        text-align: right;
    }
    .grand-total {
        margin-top: 20px;
        font-weight: bold;
    }
    ";

    // Create HTML content for the invoice
    $htmlContent = "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='utf-8'>
        <title>Invoice #{$invoiceNumber}</title>
        <style>
            {$cssContent}
        </style>
    </head>
    <body>
        <div class='invoice-container'>
            <div class='invoice-header'>
                <div>
                    <h1>INVOICE</h1>
                    <p>Invoice #: {$invoiceNumber}</p>
                    <p>Date: {$currentDate}</p>
                    <p>Booking #: {$booking['booking_number']}</p>
                </div>
                <div class='company-info'>
                    <h2>BE Rides</h2>
                    <p>Vizag, Andhra Pradesh, India</p>
                    <p>Phone: +91-7093864511</p>
                    <p>Email: info@berides.in</p>
                </div>
            </div>
            
            <div class='customer-info'>
                <h3>Bill To</h3>
                <p><strong>{$booking['passenger_name']}</strong></p>
                <p>Phone: {$booking['passenger_phone']}</p>
                <p>Email: {$booking['passenger_email']}</p>";
                
    // Add GST info if enabled
    if ($gstEnabled && !empty($gstNumber)) {
        $htmlContent .= "<p>GST Number: {$gstNumber}</p>";
        if (!empty($companyName)) {
            $htmlContent .= "<p>Company: {$companyName}</p>";
        }
        if (!empty($companyAddress)) {
            $htmlContent .= "<p>Address: {$companyAddress}</p>";
        }
    }
    
    $htmlContent .= "
            </div>
            
            <div class='booking-details'>
                <h3>Booking Details</h3>
                <table>
                    <tr>
                        <th>Pickup:</th>
                        <td>{$booking['pickup_location']}</td>
                    </tr>";
    
    if (!empty($booking['drop_location'])) {
        $htmlContent .= "
                    <tr>
                        <th>Drop:</th>
                        <td>{$booking['drop_location']}</td>
                    </tr>";
    }
    
    $formattedPickupDate = date('d M Y h:i A', strtotime($booking['pickup_date']));
    
    $htmlContent .= "
                    <tr>
                        <th>Date:</th>
                        <td>{$formattedPickupDate}</td>
                    </tr>
                    <tr>
                        <th>Vehicle:</th>
                        <td>{$booking['cab_type']}</td>
                    </tr>
                </table>
            </div>
            
            <div class='fare-details'>
                <h3>Fare Details</h3>
                <table class='fare-table'>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Base Fare</td>
                            <td>₹ " . number_format($baseAmountBeforeTax, 2) . "</td>
                        </tr>";
    
    // Add GST rows if applicable
    if ($gstEnabled) {
        if ($isIGST) {
            $htmlContent .= "
                        <tr>
                            <td>IGST (12%)</td>
                            <td>₹ " . number_format($igstAmount, 2) . "</td>
                        </tr>";
        } else {
            $htmlContent .= "
                        <tr>
                            <td>CGST (6%)</td>
                            <td>₹ " . number_format($cgstAmount, 2) . "</td>
                        </tr>
                        <tr>
                            <td>SGST (6%)</td>
                            <td>₹ " . number_format($sgstAmount, 2) . "</td>
                        </tr>";
        }
    }
    
    $htmlContent .= "
                        <tr class='total-row'>
                            <td>Subtotal</td>
                            <td>₹ " . number_format($totalAmount, 2) . "</td>
                        </tr>";
    
    // Add extra charges if there are any
    if (!empty($extraCharges)) {
        $htmlContent .= "
            </tbody>
        </table>
        
        <div class='extra-charges'>
            <h3>Extra Charges</h3>
            <table class='extra-charges-table'>
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>";
        
        foreach ($extraCharges as $charge) {
            $chargeDesc = isset($charge['description']) ? $charge['description'] : 
                         (isset($charge['label']) ? $charge['label'] : 'Additional Charge');
            $chargeAmount = isset($charge['amount']) ? (float)$charge['amount'] : 0;
            
            $htmlContent .= "
                    <tr>
                        <td>{$chargeDesc}</td>
                        <td>₹ " . number_format($chargeAmount, 2) . "</td>
                    </tr>";
        }
        
        $htmlContent .= "
                </tbody>
            </table>
        </div>
        
        <div class='grand-total'>
            Grand Total: ₹ " . number_format($grandTotal, 2) . "
        </div>";
    } else {
        // If no extra charges, just close the table
        $htmlContent .= "
                    </tbody>
                </table>";
    }
    
    $htmlContent .= "
            </div>
            
            <div class='invoice-footer' style='margin-top: 50px; text-align: center; font-size: 12px;'>
                <p>Thank you for using BE Rides. For any queries, please contact us at info@berides.in</p>";
    
    if ($gstEnabled) {
        $htmlContent .= "<p>This is a computer-generated invoice and does not require a signature</p>";
    }
    
    $htmlContent .= "
            </div>
        </div>
    </body>
    </html>";

    // For HTML output
    if ($format === 'html' || isset($_GET['show_html'])) {
        header('Content-Type: text/html; charset=utf-8');
        echo $htmlContent;
        exit;
    }

    // For PDF output, check if we can use DomPDF
    if ($vendorExists && class_exists('Dompdf\Dompdf')) {
        try {
            debugLog("Starting PDF generation");
            
            // Clear ALL output buffers and turn off output buffering
            while (ob_get_level()) {
                ob_end_clean();
            }
            
            // Load DomPDF
            debugLog("Loading DomPDF");
            
            // Configure DomPDF options
            debugLog("Configuring DomPDF options");
            $options = new \Dompdf\Options();
            $options->set('isRemoteEnabled', true);
            $options->set('isHtml5ParserEnabled', true);
            $options->set('isPhpEnabled', false);
            $options->set('defaultFont', 'DejaVu Sans');
            $options->set('defaultMediaType', 'print');
            $options->set('defaultPaperSize', 'A4');
            $options->set('dpi', 96);
            
            // Create DomPDF instance
            $dompdf = new \Dompdf\Dompdf($options);
            $dompdf->setPaper('A4', 'portrait');
            
            // Load HTML content
            $dompdf->loadHtml($htmlContent);
            
            // Render PDF
            debugLog("Starting PDF render");
            $dompdf->render();
            
            // Get PDF content
            $output = $dompdf->output();
            $pdfSize = strlen($output);
            
            if ($pdfSize === 0) {
                throw new Exception("Generated PDF is empty");
            }
            
            // Clear any previous output and disable further output buffering
            while (ob_get_level()) {
                ob_end_clean();
            }
            
            // Send headers - NOTHING should be output before this point
            if (!headers_sent()) {
                header('Content-Type: application/pdf');
                header('Content-Length: ' . $pdfSize);
                
                // Set content disposition based on direct_download parameter
                $filename = 'Invoice_' . $invoiceNumber . '.pdf';
                if (isset($_GET['direct_download']) && $_GET['direct_download'] === '1') {
                    header('Content-Disposition: attachment; filename="' . $filename . '"');
                } else {
                    header('Content-Disposition: inline; filename="' . $filename . '"');
                }
                
                // Cache control headers
                header('Cache-Control: public, must-revalidate, max-age=0');
                header('Pragma: public');
                header('Expires: Sat, 26 Jul 1997 05:00:00 GMT');
                header('Last-Modified: ' . gmdate('D, d M Y H:i:s') . ' GMT');
            } else {
                debugLog("Headers were already sent!");
            }
            
            // Disable any compression
            if (function_exists('apache_setenv')) {
                @apache_setenv('no-gzip', 1);
            }
            @ini_set('zlib.output_compression', false);
            
            // Output PDF
            echo $output;
            exit();
            
        } catch (Exception $e) {
            debugLog("Error in PDF generation", [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
            throw $e;
        }
    } else {
        // DomPDF not available, return HTML content with warning
        logInvoiceError("DomPDF not available, falling back to HTML", [
            'autoloader_search_results' => $autoloaderSearchResults
        ]);
        header('Content-Type: text/html; charset=utf-8');
        echo '<!DOCTYPE html>
        <html>
        <head>
            <title>Invoice (HTML Only)</title>
            <style>
                .warning-banner { background-color: #ffffdd; border: 1px solid #ffcc00; padding: 10px; margin-bottom: 20px; }
            </style>
        </head>
        <body>
            <div class="warning-banner">
                <p><strong>PDF Generation Unavailable:</strong> The PDF generation library is not installed or configured correctly.</p>
                <p>Please run <code>composer require dompdf/dompdf:^2.0</code> and then <code>composer install</code> in your project root.</p>
                <p>Try <a href="/api/test-pdf.php" style="color: blue;">this diagnostic tool</a> to test PDF generation.</p>
            </div>
            ' . $htmlContent . '
        </body>
        </html>';
    }

} catch (Exception $e) {
    logInvoiceError("Critical error in download-invoice.php", [
        'error' => $e->getMessage(), 
        'trace' => $e->getTraceAsString()
    ]);
    
    // Return user-friendly error page
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html>
    <html>
    <head>
        <title>Invoice Generation Error</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; color: #333; }
            .error-container { max-width: 800px; margin: 50px auto; padding: 20px; border: 1px solid #ffdddd; background-color: #fff9f9; border-radius: 5px; }
            h1 { color: #cc0000; }
            .error-details { background-color: #f9f9f9; padding: 15px; border: 1px solid #ddd; overflow: auto; }
            .actions { margin-top: 20px; }
            .actions a { display: inline-block; margin-right: 10px; padding: 8px 15px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; }
            .actions a.secondary { background-color: #607d8b; }
        </style>
    </head>
    <body>
        <div class="error-container">
            <h1>Invoice Generation Error</h1>
            <p>We encountered a problem while trying to generate your invoice. We apologize for the inconvenience.</p>
            <p><strong>Error:</strong> ' . htmlspecialchars($e->getMessage()) . '</p>
            
            <div class="error-details">
                <h3>Troubleshooting Steps:</h3>
                <ol>
                    <li>Try viewing the HTML version instead: <a href="?format=html&id=' . htmlspecialchars($bookingId) . '">View HTML Version</a></li>
                    <li>Make sure composer packages are installed correctly</li>
                    <li>Check our diagnostic page to verify PDF functionality</li>
                </ol>
            </div>
            
            ' . ($debugMode ? '<div class="error-details">
                <h3>Technical Details:</h3>
                <pre>' . htmlspecialchars($e->getTraceAsString()) . '</pre>
            </div>' : '') . '
            
            <div class="actions">
                <a href="javascript:history.back()">Go Back</a>
                <a href="/api/test-pdf.php" class="secondary">Run Diagnostic Test</a>
                <a href="?format=html&id=' . htmlspecialchars($bookingId) . '" class="secondary">View HTML Version</a>
            </div>
        </div>
    </body>
    </html>';
}

// Restore normal error handler
restore_error_handler();

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
