
<?php
// Include configuration file
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/common/db_helper.php';
require_once __DIR__ . '/utils/response.php';

// Check if vendor directory exists and autoload is available
$autoloaderPaths = [
    __DIR__ . '/../vendor/autoload.php',
    __DIR__ . '/../../vendor/autoload.php',
    dirname(dirname(dirname(__FILE__))) . '/vendor/autoload.php'
];

$vendorExists = false;
$autoloaderPath = null;

foreach ($autoloaderPaths as $path) {
    if (file_exists($path)) {
        $autoloaderPath = $path;
        $vendorExists = true;
        break;
    }
}

if ($vendorExists) {
    // Require Composer's autoloader if it exists
    require_once $autoloaderPath;
    error_log("Found composer autoloader at: " . $autoloaderPath);
} else {
    error_log("CRITICAL ERROR: No composer autoloader found!");
}

// CRITICAL: Clear all buffers first - this is essential for PDF/HTML output
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

// Log error function with improved details
function logInvoiceError($message, $data = []) {
    $formattedData = is_array($data) ? json_encode($data) : (string)$data;
    error_log("INVOICE ERROR: $message " . $formattedData);
    
    $logFile = __DIR__ . '/../logs/invoice_errors.log';
    $dir = dirname($logFile);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    
    file_put_contents(
        $logFile,
        date('Y-m-d H:i:s') . " - $message - " . $formattedData . "\n",
        FILE_APPEND
    );
}

try {
    // Only allow GET requests
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        sendErrorResponse('Method not allowed', [], 405);
    }

    // Get booking ID from query parameters
    $bookingId = isset($_GET['id']) ? (int)$_GET['id'] : null;
    
    if (!$bookingId) {
        sendErrorResponse('Missing booking ID', [], 400);
    }

    // Get GST parameters from GET
    $gstEnabled = isset($_GET['gstEnabled']) ? filter_var($_GET['gstEnabled'], FILTER_VALIDATE_BOOLEAN) : false;
    $gstNumber = isset($_GET['gstNumber']) ? $_GET['gstNumber'] : '';
    $companyName = isset($_GET['companyName']) ? $_GET['companyName'] : '';
    $companyAddress = isset($_GET['companyAddress']) ? $_GET['companyAddress'] : '';
    $isIGST = isset($_GET['isIGST']) ? filter_var($_GET['isIGST'], FILTER_VALIDATE_BOOLEAN) : false;
    $includeTax = isset($_GET['includeTax']) ? filter_var($_GET['includeTax'], FILTER_VALIDATE_BOOLEAN) : true;
    $customInvoiceNumber = isset($_GET['invoiceNumber']) ? $_GET['invoiceNumber'] : '';
    $format = isset($_GET['format']) ? $_GET['format'] : 'pdf'; // Default to PDF format
    
    // Check for direct download flag - special handling for ensuring proper download
    $directDownload = isset($_GET['direct_download']) && $_GET['direct_download'] === '1';

    logInvoiceError("Starting invoice download process", [
        'bookingId' => $bookingId,
        'format' => $format,
        'directDownload' => $directDownload,
        'dompdfAvailable' => $vendorExists ? 'Yes' : 'No',
    ]);

    // Connect to database with improved error handling
    try {
        $conn = getDbConnectionWithRetry();
        logInvoiceError("Public invoice download: Database connection established successfully");
    } catch (Exception $e) {
        logInvoiceError("Database connection error in public download-invoice", ['error' => $e->getMessage()]);
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
            sendErrorResponse('Booking not found', [], 404);
        }
        
        $booking = $result->fetch_assoc();
        $stmt->close();
    } else {
        logInvoiceError("Error preparing statement", ['error' => $conn->error]);
        throw new Exception("Database error: " . $conn->error);
    }

    // Generate invoice number
    $invoiceNumber = empty($customInvoiceNumber) ? 'INV-' . date('Ymd') . '-' . $bookingId : $customInvoiceNumber;

    // Current date for invoice generation
    $currentDate = date('Y-m-d');

    // Calculate tax components based on includeTax setting
    $totalAmount = (float)$booking['total_amount'];
    
    // GST rate is always 12% (either as IGST 12% or CGST 6% + SGST 6%)
    $gstRate = $gstEnabled ? 0.12 : 0; 
    
    // Convert string to number if needed
    if (!is_numeric($totalAmount)) {
        $totalAmount = floatval($totalAmount);
    }
    
    // Ensure we have a valid amount
    if ($totalAmount <= 0) {
        $totalAmount = 0;
    }
    
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
    
    // Ensure final total adds up correctly after rounding
    $finalTotal = $baseAmountBeforeTax + $cgstAmount + $sgstAmount + $igstAmount;
    $finalTotal = round($finalTotal, 2);

    // Get CSS content from multiple possible locations
    $cssContent = null;
    $possiblePaths = [
        // Public CSS directory (most likely in production)
        $_SERVER['DOCUMENT_ROOT'] . '/css/invoice-print.css',
        dirname($_SERVER['DOCUMENT_ROOT']) . '/css/invoice-print.css',
        // Direct path
        __DIR__ . '/../../css/invoice-print.css',
        // Project root CSS directory
        dirname(__DIR__, 3) . '/css/invoice-print.css',
        // Relative to current script
        __DIR__ . '/../css/invoice-print.css',
        // One level up for admin
        dirname(dirname(__DIR__)) . '/css/invoice-print.css',
    ];
    
    foreach ($possiblePaths as $path) {
        if (file_exists($path)) {
            $cssContent = file_get_contents($path);
            logInvoiceError("CSS file found at path: " . $path);
            break;
        } else {
            logInvoiceError("CSS not found at: " . $path);
        }
    }
    
    // If CSS file not found, use inline minimal CSS
    if ($cssContent === null) {
        logInvoiceError("CSS file not found at any of the expected paths, using inline CSS");
        $cssContent = "
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; color: #333; }
        .invoice-container { width: 100%; max-width: 800px; margin: 0 auto; border: 1px solid #ddd; padding: 30px; }
        .invoice-header { width: 100%; display: table; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
        .invoice-header div { display: table-cell; }
        .company-info { text-align: right; }
        .fare-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .fare-table th, .fare-table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        .fare-table th:last-child, .fare-table td:last-child { text-align: right; }
        .total-row { font-weight: bold; background-color: #f9f9f9; }
        h1, h2, h3 { margin-top: 0; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
        ";
    }

    // Create HTML content for the invoice
    $content = '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Invoice #'.$invoiceNumber.'</title>
        <style>
            '.$cssContent.'
        </style>
    </head>
    <body>
        <div class="invoice-container">
            <div class="invoice-header">
                <div>
                    <h1>INVOICE</h1>
                    <p style="margin-top: 5px; color: #777;">Vizag Cab Services</p>
                </div>
                <div class="company-info">
                    <h2>#'.$invoiceNumber.'</h2>
                    <p>Date: '.date('d M Y', strtotime($currentDate)).'</p>
                    <p>Booking #: '.($booking['booking_number'] ?? 'N/A').'</p>
                </div>
            </div>
            
            <div class="invoice-body">
                <div class="customer-section clearfix">
                    <div class="customer-details">
                        <h3 class="section-title">Customer Details</h3>
                        <p><strong>Name:</strong> '.($booking['passenger_name'] ?? 'N/A').'</p>
                        <p><strong>Phone:</strong> '.($booking['passenger_phone'] ?? 'N/A').'</p>
                        <p><strong>Email:</strong> '.($booking['passenger_email'] ?? 'N/A').'</p>
                    </div>
                    
                    <div class="invoice-summary">
                        <h3 class="section-title">Trip Summary</h3>
                        <p><strong>Trip Type:</strong> '.ucfirst($booking['trip_type'] ?? 'N/A').
                        (isset($booking['trip_mode']) && !empty($booking['trip_mode']) ? ' ('.ucfirst($booking['trip_mode']).')' : '').'</p>
                        <p><strong>Date:</strong> '.(isset($booking['pickup_date']) ? date('d M Y', strtotime($booking['pickup_date'])) : 'N/A').'</p>
                        <p><strong>Vehicle:</strong> '.($booking['cab_type'] ?? 'N/A').'</p>
                    </div>
                </div>
                
                <div class="trip-details">
                    <h3 class="section-title">Trip Details</h3>
                    <p><strong>Pickup:</strong> '.($booking['pickup_location'] ?? 'N/A').'</p>
                    '.(isset($booking['drop_location']) && !empty($booking['drop_location']) ? '<p><strong>Drop:</strong> '.$booking['drop_location'].'</p>' : '').'
                    <p><strong>Pickup Time:</strong> '.(isset($booking['pickup_date']) ? date('d M Y, h:i A', strtotime($booking['pickup_date'])) : 'N/A').'</p>
                </div>';

    if ($gstEnabled && !empty($gstNumber)) {
        $content .= '
                <div class="gst-details">
                    <div class="gst-title">GST Details</div>
                    <p><strong>GST Number:</strong> '.htmlspecialchars($gstNumber).'</p>
                    <p><strong>Company Name:</strong> '.htmlspecialchars($companyName).'</p>
                    '.(!empty($companyAddress) ? '<p><strong>Company Address:</strong> '.htmlspecialchars($companyAddress).'</p>' : '').'
                </div>';
    }

    $content .= '
                <h3 class="section-title">Fare Breakdown</h3>
                <table class="fare-table">
                    <tr>
                        <th>Description</th>
                        <th style="text-align: right;">Amount</th>
                    </tr>
                    <tr>
                        <td>Base Fare'.($includeTax && $gstEnabled ? ' (excluding tax)' : '').'</td>
                        <td><span class="rupee-symbol">₹</span> '.number_format($baseAmountBeforeTax, 2).'</td>
                    </tr>';

    if ($gstEnabled) {
        if ($isIGST) {
            $content .= '
                    <tr>
                        <td>IGST (12%)</td>
                        <td><span class="rupee-symbol">₹</span> '.number_format($igstAmount, 2).'</td>
                    </tr>';
        } else {
            $content .= '
                    <tr>
                        <td>CGST (6%)</td>
                        <td><span class="rupee-symbol">₹</span> '.number_format($cgstAmount, 2).'</td>
                    </tr>
                    <tr>
                        <td>SGST (6%)</td>
                        <td><span class="rupee-symbol">₹</span> '.number_format($sgstAmount, 2).'</td>
                    </tr>';
        }
    }

    $content .= '
                    <tr class="total-row">
                        <td>Total Amount'.($includeTax ? ' (including tax)' : ' (excluding tax)').'</td>
                        <td><span class="rupee-symbol">₹</span> '.number_format($finalTotal, 2).'</td>
                    </tr>
                </table>';

    if ($gstEnabled) {
        $content .= '
                <p class="tax-note">This invoice includes GST as per applicable rates. '.
                ($isIGST ? 'IGST 12%' : 'CGST 6% + SGST 6%').' has been applied.</p>';
    }

    $content .= '
            </div>
            
            <div class="footer">
                <p>Thank you for choosing Vizag Cab Services!</p>
                <p>For inquiries, please contact: info@vizagcabs.com | +91 9876543210</p>
                <p>Generated on: '.date('d M Y H:i:s').'</p>
            </div>
        </div>
    </body>
    </html>';

    // For HTML output
    if ($format === 'html') {
        header('Content-Type: text/html; charset=utf-8');
        echo $content;
        exit;
    }

    // For PDF output, check if we can use DomPDF
    if ($vendorExists && class_exists('Dompdf\Dompdf')) {
        try {
            // Import DomPDF classes
            use Dompdf\Dompdf;
            use Dompdf\Options;
            
            logInvoiceError("DomPDF class found, attempting to generate PDF");
            
            // Configure DomPDF options
            $options = new Options();
            $options->set('isRemoteEnabled', true);
            $options->set('isHtml5ParserEnabled', true);
            $options->set('isPhpEnabled', false); // Security: disable PHP in HTML
            $options->set('isFontSubsettingEnabled', true);
            $options->set('defaultFont', 'DejaVu Sans');

            // Create DomPDF instance
            $dompdf = new Dompdf($options);
            $dompdf->setPaper('A4', 'portrait');
            
            logInvoiceError("DomPDF instance created successfully");

            // Load HTML content
            $dompdf->loadHtml($content);
            logInvoiceError("HTML loaded into DomPDF");

            // Render the PDF
            $dompdf->render();
            logInvoiceError("PDF rendering complete");

            // CRITICAL: Clear any previous headers
            if (headers_sent()) {
                logInvoiceError("WARNING: Headers already sent before PDF output");
            }
            
            // CRITICAL: Set appropriate headers for PDF
            header('Content-Type: application/pdf');
            header('Content-Disposition: ' . ($directDownload ? 'attachment' : 'inline') . '; filename="Invoice_'.$invoiceNumber.'.pdf"');
            header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
            header('Pragma: no-cache');
            header('Expires: 0');

            // Output the generated PDF
            echo $dompdf->output();
            
            logInvoiceError("PDF generated and output successfully");
        } catch (Exception $e) {
            logInvoiceError("PDF generation error", ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            
            // If PDF generation fails, fall back to HTML output
            header('Content-Type: text/html; charset=utf-8');
            echo $content;
            logInvoiceError("Falling back to HTML output due to PDF generation error");
        }
    } else {
        // DomPDF not available, return HTML content
        logInvoiceError("DomPDF not available, falling back to HTML", [
            'vendorExists' => $vendorExists ? 'true' : 'false',
            'class_exists' => class_exists('Dompdf\Dompdf') ? 'true' : 'false',
            'autoloader_path' => $autoloaderPath
        ]);
        header('Content-Type: text/html; charset=utf-8');
        echo $content;
    }

} catch (Exception $e) {
    logInvoiceError("Critical error in download-invoice.php", [
        'error' => $e->getMessage(), 
        'trace' => $e->getTraceAsString(),
        'line' => $e->getLine(),
        'file' => $e->getFile()
    ]);
    
    // For errors, ensure we return JSON
    header('Content-Type: application/json');
    sendErrorResponse('Failed to generate invoice: ' . $e->getMessage(), [
        'error_details' => $debugMode ? [
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
            'line' => $e->getLine(),
            'file' => $e->getFile()
        ] : null
    ], 500);
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
