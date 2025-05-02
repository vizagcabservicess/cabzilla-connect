
<?php
// CRITICAL: Ensure no content is output before headers
// Turn off output buffering and disable implicit flush
@ini_set('output_buffering', 'off');
@ini_set('implicit_flush', true);
@ini_set('zlib.output_compression', false);

// CRITICAL: Clear all output buffers at the start
while (ob_get_level()) ob_end_clean();

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

// Enhanced error logging function
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

    // FIXED: Log all request parameters for debugging
    logInvoiceError("Invoice request parameters", $_GET);

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
        'directDownload' => $directDownload,
        'gstEnabled' => $gstEnabled ? 'true' : 'false',
        'gstNumber' => $gstNumber,
        'companyName' => $companyName
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
    
    // FIXED: Fetch booking data with GST details if available
    $booking = null;
    $stmt = $conn->prepare(
        "SELECT b.*, 
                g.gst_number, 
                g.company_name, 
                g.company_address 
         FROM bookings b 
         LEFT JOIN gst_details g ON b.id = g.booking_id 
         WHERE b.id = ?"
    );
    
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
        
        // FIXED: Log booking data to check GST details
        logInvoiceError("Booking data retrieved", [
            'booking_id' => $booking['id'],
            'gst_enabled' => $booking['gst_enabled'] ?? 'null',
            'gst_number' => $booking['gst_number'] ?? 'null',
            'company_name' => $booking['company_name'] ?? 'null'
        ]);
        
        // FIXED: If we got GST details from DB but not from GET params, use DB values
        if (empty($gstNumber) && !empty($booking['gst_number'])) {
            $gstNumber = $booking['gst_number'];
            logInvoiceError("Using GST number from database", ['gstNumber' => $gstNumber]);
        }
        
        if (empty($companyName) && !empty($booking['company_name'])) {
            $companyName = $booking['company_name'];
            logInvoiceError("Using company name from database", ['companyName' => $companyName]);
        }
        
        if (empty($companyAddress) && !empty($booking['company_address'])) {
            $companyAddress = $booking['company_address'];
            logInvoiceError("Using company address from database", ['companyAddress' => $companyAddress]);
        }
        
        // FIXED: If booking has gst_enabled but param doesn't, use booking value
        if (!$gstEnabled && !empty($booking['gst_enabled']) && $booking['gst_enabled'] == 1) {
            $gstEnabled = true;
            logInvoiceError("Enabling GST based on booking data");
        }
        
        $stmt->close();
    } else {
        logInvoiceError("Error preparing statement", ['error' => $conn->error]);
        throw new Exception("Database error: " . $conn->error);
    }

    // Parse extra charges from booking
    $extraCharges = [];
    $extraChargesTotal = 0;
    if (!empty($booking['extra_charges'])) {
        try {
            $extraCharges = json_decode($booking['extra_charges'], true);
            if (is_array($extraCharges)) {
                foreach ($extraCharges as $charge) {
                    if (isset($charge['amount'])) {
                        $extraChargesTotal += floatval($charge['amount']);
                    }
                }
            } else {
                $extraCharges = [];
            }
        } catch (Exception $e) {
            logInvoiceError("Failed to parse extra charges", ['error' => $e->getMessage()]);
        }
    }

    // Generate invoice number
    $invoiceNumber = empty($customInvoiceNumber) ? 'INV-' . date('Ymd') . '-' . $bookingId : $customInvoiceNumber;

    // Current date for invoice generation
    $currentDate = date('Y-m-d');

    // Calculate tax components based on includeTax setting
    $totalAmount = (float)$booking['total_amount'];
    
    // GST calculation logic
    if ($gstEnabled) {
        // GST rate is always 12% (either as IGST 12% or CGST 6% + SGST 6%)
        $gstRate = 0.12;
        
        if ($includeTax) {
            // If tax is included in total amount (default)
            $baseAmountBeforeTax = $totalAmount / (1 + $gstRate);
            $baseAmountBeforeTax = round($baseAmountBeforeTax, 2);
            $taxAmount = $totalAmount - $baseAmountBeforeTax;
            $taxAmount = round($taxAmount, 2);
        } else {
            // If tax is excluded from the base amount
            $baseAmountBeforeTax = $totalAmount;
            $taxAmount = $totalAmount * $gstRate;
            $taxAmount = round($taxAmount, 2);
            $totalAmount = $baseAmountBeforeTax + $taxAmount;
            $totalAmount = round($totalAmount, 2);
        }
        
        // For GST, split into CGST and SGST or use IGST
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
        // No tax case
        $baseAmountBeforeTax = $totalAmount;
        $taxAmount = 0;
        $cgstAmount = 0;
        $sgstAmount = 0;
        $igstAmount = 0;
    }
    
    // Grand total with extra charges
    $grandTotal = $totalAmount + $extraChargesTotal;

    // Use inline CSS for reliability instead of searching for CSS files
    $cssContent = "
    body { font-family: DejaVu Sans, Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; color: #333; }
    .invoice-container { width: 100%; max-width: 800px; margin: 0 auto; border: 1px solid #ddd; padding: 30px; }
    .invoice-header { width: 100%; display: table; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
    .invoice-header div { display: table-cell; }
    .company-info { text-align: right; }
    .fare-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .fare-table th, .fare-table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    .fare-table th:last-child, .fare-table td:last-child { text-align: right; }
    .total-row { font-weight: bold; background-color: #f9f9f9; }
    .booking-details { margin-bottom: 30px; }
    .booking-details table { width: 100%; border-collapse: collapse; }
    .booking-details th, .booking-details td { padding: 8px; text-align: left; vertical-align: top; }
    .booking-details th { width: 30%; font-weight: normal; color: #666; }
    .extra-charges { margin-top: 20px; margin-bottom: 20px; }
    .extra-charges h3 { margin-bottom: 10px; }
    .extra-charges-table { width: 100%; border-collapse: collapse; }
    .extra-charges-table th, .extra-charges-table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
    .extra-charges-table th:last-child, .extra-charges-table td:last-child { text-align: right; }
    .grand-total { font-size: 1.2em; font-weight: bold; margin-top: 20px; text-align: right; }
    ";

    // Create HTML content for invoice
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

    // FIXED: Log generated HTML for debugging
    logInvoiceError("Generated HTML content length: " . strlen($htmlContent));

    // If the format is HTML, output directly
    if ($format === 'html') {
        logInvoiceError("Outputting HTML format");
        header('Content-Type: text/html; charset=utf-8');
        echo $htmlContent;
        exit;
    }
    
    // If the format is PDF, generate a PDF using mPDF if available
    try {
        if ($vendorExists && class_exists('\\Mpdf\\Mpdf')) {
            logInvoiceError("Generating PDF using mPDF");
            // CRITICAL: Clear all buffers again before PDF generation
            while (ob_get_level()) ob_end_clean();
            
            // Use mPDF if available
            $mpdf = new \Mpdf\Mpdf([
                'mode' => 'utf-8',
                'format' => 'A4',
                'margin_top' => 15,
                'margin_bottom' => 15,
                'margin_left' => 15,
                'margin_right' => 15,
                'tempDir' => sys_get_temp_dir() // Use system temp directory for better reliability
            ]);
            
            // Set document metadata
            $mpdf->SetTitle("Invoice #{$invoiceNumber}");
            $mpdf->SetAuthor('BE Rides');
            $mpdf->SetCreator('BE Rides Invoice System');
            
            // FIXED: Set proper Content-Type header for PDF before any output
            header('Content-Type: application/pdf');
            header('Cache-Control: no-cache, no-store, must-revalidate');
            header('Pragma: no-cache');
            header('Expires: 0');
            
            // Force download if direct_download is set
            if ($directDownload) {
                header('Content-Disposition: attachment; filename="Invoice_' . $invoiceNumber . '.pdf"');
            } else {
                header('Content-Disposition: inline; filename="Invoice_' . $invoiceNumber . '.pdf"');
            }
            
            // Write HTML content to PDF
            $mpdf->WriteHTML($htmlContent);
            
            // Output PDF
            logInvoiceError("Outputting PDF");
            $mpdf->Output("Invoice_{$invoiceNumber}.pdf", 'I'); // 'I' for inline in browser
            exit;
        } else if (class_exists('\\Dompdf\\Dompdf')) {
            logInvoiceError("Generating PDF using DomPDF");
            // CRITICAL: Clear all buffers again before PDF generation
            while (ob_get_level()) ob_end_clean();
            
            // Use DomPDF as a fallback
            $options = new Options();
            $options->set('defaultFont', 'DejaVu Sans');
            $options->set('isRemoteEnabled', true);
            
            $dompdf = new Dompdf($options);
            $dompdf->loadHtml($htmlContent);
            $dompdf->setPaper('A4');
            $dompdf->render();
            
            // FIXED: Set proper Content-Type header for PDF before any output
            header('Content-Type: application/pdf');
            header('Cache-Control: no-cache, no-store, must-revalidate');
            header('Pragma: no-cache');
            header('Expires: 0');
            
            // Force download if direct_download is set
            if ($directDownload) {
                header('Content-Disposition: attachment; filename="Invoice_' . $invoiceNumber . '.pdf"');
            } else {
                header('Content-Disposition: inline; filename="Invoice_' . $invoiceNumber . '.pdf"');
            }
            
            // Output PDF
            logInvoiceError("Outputting PDF with DomPDF");
            $dompdf->stream("Invoice_{$invoiceNumber}.pdf", array('Attachment' => $directDownload));
            exit;
        } else {
            throw new Exception("PDF generation libraries not available");
        }
    } catch (Exception $e) {
        logInvoiceError("Failed to generate PDF: " . $e->getMessage());
        
        // Fallback to HTML if PDF generation fails
        logInvoiceError("Falling back to HTML format due to PDF generation failure");
        header('Content-Type: text/html; charset=utf-8');
        echo $htmlContent;
        exit;
    }

} catch (Exception $e) {
    logInvoiceError("Exception in download-invoice.php", [
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    
    if (strpos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false) {
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode([
            'status' => 'error', 
            'message' => 'Failed to generate invoice: ' . $e->getMessage(),
            'error_details' => $debugMode ? $e->getTraceAsString() : null
        ]);
    } else {
        // If not expecting JSON, output plain error
        header('Content-Type: text/html; charset=utf-8');
        echo "<h1>Error</h1><p>" . htmlspecialchars($e->getMessage()) . "</p>";
        if ($debugMode) {
            echo "<pre>" . htmlspecialchars($e->getTraceAsString()) . "</pre>";
        }
    }
    exit;
}

// Close any remaining database connections
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
