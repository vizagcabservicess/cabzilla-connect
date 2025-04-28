
<?php
// Include configuration file - use absolute path with __DIR__ for reliability
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/common/db_helper.php';
require_once __DIR__ . '/utils/response.php';

// CRITICAL: Create logs directory if it doesn't exist
$logsDir = __DIR__ . '/../logs';
if (!is_dir($logsDir)) {
    @mkdir($logsDir, 0755, true);
}

// CRITICAL: Clear all buffers first - this is essential for PDF/HTML output
while (ob_get_level()) ob_end_clean();

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

    // CRITICAL: Improved autoloader detection with absolute paths including the public_html path
    $autoloaderPaths = [
        // Add the confirmed path first
        $_SERVER['DOCUMENT_ROOT'] . '/public_html/vendor/autoload.php',
        
        // Try other common paths
        $_SERVER['DOCUMENT_ROOT'] . '/vendor/autoload.php',
        dirname($_SERVER['DOCUMENT_ROOT']) . '/public_html/vendor/autoload.php',
        dirname($_SERVER['DOCUMENT_ROOT']) . '/vendor/autoload.php',
        __DIR__ . '/../vendor/autoload.php',
        dirname(__DIR__) . '/vendor/autoload.php', 
        dirname(dirname(__DIR__)) . '/vendor/autoload.php',
        realpath(__DIR__ . '/../../../vendor/autoload.php')
    ];

    $vendorExists = false;
    $autoloaderPath = null;
    $autoloaderSearchResults = [];

    foreach ($autoloaderPaths as $path) {
        $exists = file_exists($path);
        $isReadable = $exists && is_readable($path);
        
        $autoloaderSearchResults[$path] = [
            'exists' => $exists,
            'readable' => $isReadable
        ];
        
        if ($exists && $isReadable) {
            $autoloaderPath = $path;
            $vendorExists = true;
            logInvoiceError("Found composer autoloader", ['path' => $path]);
            break;
        }
    }

    // Log search results if no autoloader found
    if (!$vendorExists) {
        logInvoiceError("No composer autoloader found", ['search_results' => $autoloaderSearchResults]);
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

    // Instead of searching for CSS, use inline CSS for reliability
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
    h1, h2, h3 { margin-top: 0; }
    .footer { margin-top: 40px; text-align: center; font-size: 10pt; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
    ";

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
                <div class="customer-section" style="display: table; width: 100%; margin-bottom: 20px;">
                    <div style="display: table-cell; width: 50%;">
                        <h3 class="section-title">Customer Details</h3>
                        <p><strong>Name:</strong> '.($booking['passenger_name'] ?? 'N/A').'</p>
                        <p><strong>Phone:</strong> '.($booking['passenger_phone'] ?? 'N/A').'</p>
                        <p><strong>Email:</strong> '.($booking['passenger_email'] ?? 'N/A').'</p>
                    </div>
                    
                    <div style="display: table-cell; width: 50%;">
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
                <div class="gst-details" style="margin: 20px 0; padding: 10px; border: 1px solid #eee; background: #f9f9f9;">
                    <h3 class="section-title">GST Details</h3>
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
                        <td><span class="rupee-symbol">₹</span> '.number_format($totalAmount, 2).'</td>
                    </tr>
                </table>';

    if ($gstEnabled) {
        $content .= '
                <p class="tax-note" style="font-size: 0.9em; color: #666;">This invoice includes GST as per applicable rates. '.
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
    if ($format === 'html' || isset($_GET['show_html'])) {
        header('Content-Type: text/html; charset=utf-8');
        echo $content;
        exit;
    }

    // For PDF output, check if we can use DomPDF
    if ($vendorExists && class_exists('Dompdf\Dompdf')) {
        try {
            // Try to include the autoloader
            if (!class_exists('Dompdf\Dompdf')) {
                require_once $autoloaderPath;
            }
            
            // Import DomPDF classes
            use Dompdf\Dompdf;
            use Dompdf\Options;
            
            logInvoiceError("DomPDF class found, generating PDF");
            
            // Configure DomPDF options
            $options = new Options();
            $options->set('isRemoteEnabled', true);
            $options->set('isHtml5ParserEnabled', true);
            $options->set('isPhpEnabled', false); // Security: disable PHP in HTML
            $options->set('defaultFont', 'DejaVu Sans');

            // Create DomPDF instance
            $dompdf = new Dompdf($options);
            $dompdf->setPaper('A4', 'portrait');
            
            // Load HTML content
            $dompdf->loadHtml($content);
            
            // Render the PDF
            $dompdf->render();
            
            // CRITICAL: Clear any previous headers and output buffers
            while (ob_get_level()) ob_end_clean();
            
            // Check if headers already sent
            if (headers_sent($file, $line)) {
                logInvoiceError("WARNING: Headers already sent before PDF output", [
                    'file' => $file,
                    'line' => $line
                ]);
            }

            // Set appropriate headers
            header('Content-Type: application/pdf');
            header('Content-Disposition: ' . ($directDownload ? 'attachment' : 'inline') . '; filename="Invoice_'.$invoiceNumber.'.pdf"');
            header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
            header('Pragma: no-cache');
            header('Expires: 0');

            // Output the generated PDF
            echo $dompdf->output();
            
            logInvoiceError("PDF generated and output successfully");
            
        } catch (Exception $e) {
            logInvoiceError("PDF generation error", [
                'error' => $e->getMessage(), 
                'trace' => $e->getTraceAsString()
            ]);
            
            // If PDF generation fails, fall back to HTML output with warning
            header('Content-Type: text/html; charset=utf-8');
            echo '<!DOCTYPE html>
            <html>
            <head>
                <title>Invoice (HTML Fallback)</title>
                <style>
                    .error-banner { background-color: #ffdddd; border: 1px solid #ff0000; padding: 10px; margin-bottom: 20px; }
                </style>
            </head>
            <body>
                <div class="error-banner">
                    <p><strong>PDF Generation Failed:</strong> Falling back to HTML view. Error: ' . htmlspecialchars($e->getMessage()) . '</p>
                    <p>Try <a href="/api/test-pdf.php" style="color: blue;">this diagnostic tool</a> to test PDF generation.</p>
                </div>
                ' . $content . '
            </body>
            </html>';
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
            ' . $content . '
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
