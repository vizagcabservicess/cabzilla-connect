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

// CRITICAL: Set CORS headers - SECURITY: Restrict to trusted domains only
$allowedOrigins = ['https://vizagtaxihub.com', 'https://www.vizagtaxihub.com'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} else {
    header('Access-Control-Allow-Origin: https://vizagtaxihub.com');
}
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
            sendErrorResponse('Method not allowed', 405);
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
            sendErrorResponse('Missing booking ID', 400);
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
    $lockedBaseFare = isset($_GET['lockedBaseFare']) ? floatval($_GET['lockedBaseFare']) : null;
    $requestAdminNotes = isset($_GET['adminNotes']) && is_string($_GET['adminNotes']) ? trim($_GET['adminNotes']) : null;
    
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
                sendErrorResponse('Booking not found', 404);
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

    // Calculate tax components - use same logic as generate-invoice.php
    $baseFare = 0;
    $taxAmount = 0;
    
    // CRITICAL: Use locked base fare if provided (user-entered value)
    if ($lockedBaseFare !== null && $lockedBaseFare > 0) {
        $baseFare = $lockedBaseFare;
        logInvoiceError("Using locked base fare for PDF", [
            'lockedBaseFare' => $lockedBaseFare,
            'baseFare_set' => $baseFare
        ]);
    } else {
        // Calculate base fare if not locked
        $totalAmountOriginal = (float)$booking['total_amount'];
        if (!is_numeric($totalAmountOriginal)) {
            $totalAmountOriginal = floatval($totalAmountOriginal);
        }
        
        // Try to use booking fare if available
        $baseFare = isset($booking['fare']) ? (float)$booking['fare'] : 0;
        
        // If no fare field, calculate base fare from total_amount by backing out GST and extra charges
        if ($baseFare <= 0 && isset($booking['total_amount']) && $booking['total_amount'] > 0) {
            $totalAmount = (float)$booking['total_amount'];
            
            // If GST is enabled, check if tax is included in the total_amount
            if ($gstEnabled) {
                if ($includeTax) {
                    // Tax-inclusive: total_amount already includes tax
                    $taxableAmount = round($totalAmount / 1.18, 2);
                    $baseFare = round($taxableAmount - $extraChargesTotal, 2);
                } else {
                    // Tax-exclusive: total_amount does not include tax
                    $baseFare = $totalAmount - $extraChargesTotal;
                }
            } else {
                // No GST, so base_fare = total_amount - extra_charges
                $baseFare = $totalAmount - $extraChargesTotal;
            }
            
            // Ensure base fare is not negative
            $baseFare = max(0, $baseFare);
        }
    }
    
    // GST rate is always 18% (either as IGST 18% or CGST 9% + SGST 9%)
    $gstRate = $gstEnabled ? 0.18 : 0;
    
    // Calculate gross amount (base fare + all extra charges)
    $grossAmount = $baseFare + $extraChargesTotal;
    
    // Handle tax calculation based on includeTax setting
    if ($gstEnabled) {
        if ($includeTax) {
            // Tax-inclusive: Extract tax from the gross amount
            // CRITICAL: Preserve the entered base fare and extra charges - DO NOT MODIFY
            // Only extract tax for display/compliance purposes
            // Formula: Taxable Amount = Gross Amount ÷ (1 + Tax Rate)
            // Formula: GST Amount = Taxable Amount × Tax Rate
            // Formula: Total = Gross Amount (unchanged, tax is included)
            
            // Ensure base fare is preserved (final safety check)
            if ($lockedBaseFare !== null && $lockedBaseFare > 0) {
                $baseFare = $lockedBaseFare;
                $grossAmount = $baseFare + $extraChargesTotal;
            }
            
            // Calculate taxable amount and GST using standard formula
            $taxableAmount = round($grossAmount / (1 + $gstRate), 2);
            $taxAmount = round($taxableAmount * $gstRate, 2);
            
            // Verify: taxable + tax should equal gross (with rounding tolerance)
            $verification = round($taxableAmount + $taxAmount, 2);
            if (abs($verification - $grossAmount) > 0.01) {
                // Adjust tax amount to ensure total matches exactly
                $taxAmount = round($grossAmount - $taxableAmount, 2);
            }
            
            // Final total remains the same as gross amount (tax is included)
            // Base fare and extra charges remain unchanged (preserve user input)
            $fareTotalWithTax = $grossAmount;
            
            logInvoiceError("Tax-inclusive calculation (PDF)", [
                'base_fare' => $baseFare,
                'extra_charges' => $extraChargesTotal,
                'gross_amount' => $grossAmount,
                'taxable_amount' => $taxableAmount,
                'tax_amount' => $taxAmount,
                'total' => $fareTotalWithTax,
                'locked_base_fare' => $lockedBaseFare,
                'verification' => $verification
            ]);
        } else {
            // Tax-exclusive: Add tax on top of the gross amount
            $taxableAmount = $grossAmount; // This is the subtotal (base fare + extra charges)
            $taxAmount = round($taxableAmount * $gstRate, 2); // GST = Subtotal × 18%
            $fareTotalWithTax = round($grossAmount + $taxAmount, 2); // Total = Subtotal + GST
        }
    } else {
        // No GST
        $taxableAmount = $grossAmount;
        $taxAmount = 0;
        $fareTotalWithTax = $grossAmount;
    }
    
    // For GST, split into CGST and SGST or use IGST
    if ($gstEnabled) {
        if ($isIGST) {
            // Interstate - Use IGST (18%)
            $igstAmount = round($taxAmount, 2);
            $cgstAmount = 0;
            $sgstAmount = 0;
        } else {
            // Intrastate - Split into CGST (9%) and SGST (9%)
            $halfTax = $taxAmount / 2;
            $cgstAmount = round($halfTax, 2);
            $sgstAmount = round($taxAmount - $cgstAmount, 2); // Ensure the total is exact
            $igstAmount = 0;
        }
    } else {
        $cgstAmount = 0;
        $sgstAmount = 0;
        $igstAmount = 0;
    }
    
    // Final total
    $grandTotal = round($fareTotalWithTax, 2);

    // HSN Code - default 996423, configurable via admin_settings
    $hsnCode = '996423';
    try {
        $hsnRes = @$conn->query("SELECT setting_value FROM admin_settings WHERE setting_key = 'invoice_hsn_code' AND setting_value != '' LIMIT 1");
        if ($hsnRes && $hsnRes->num_rows > 0) {
            $hsnCode = trim($hsnRes->fetch_assoc()['setting_value'] ?? '996423');
        }
    } catch (Exception $e) {}
    $gstinDisplay = !empty($gstNumber) ? $gstNumber : '37AATFV5320K1ZL';

    // Booking metrics - from DB only
    $noOfHours = '--';
    if (!empty($booking['hourly_package']) && preg_match('/(\d+)hr/i', $booking['hourly_package'], $m)) {
        $noOfHours = $m[1];
    }
    if (isset($booking['no_of_hours']) && $booking['no_of_hours'] !== '' && $booking['no_of_hours'] !== null) {
        $noOfHours = $booking['no_of_hours'];
    }
    if (isset($booking['estimated_hours']) && $booking['estimated_hours'] !== '' && $booking['estimated_hours'] !== null) {
        $noOfHours = $booking['estimated_hours'];
    }
    $noOfKm = (isset($booking['distance']) && $booking['distance'] !== '' && $booking['distance'] !== null && (float)$booking['distance'] > 0)
        ? number_format((float)$booking['distance'], 0) : '--';

    // Admin notes: request (invoice-level) > booking.admin_notes > admin_settings
    $adminNotes = '';
    if ($requestAdminNotes !== null && $requestAdminNotes !== '') {
        $adminNotes = $requestAdminNotes;
    } elseif (isset($booking['admin_notes']) && trim($booking['admin_notes'] ?? '') !== '') {
        $adminNotes = trim($booking['admin_notes']);
    } else {
        try {
            $notesRes = @$conn->query("SELECT setting_value FROM admin_settings WHERE setting_key = 'invoice_admin_notes' AND setting_value != '' LIMIT 1");
            if ($notesRes && $notesRes->num_rows > 0) {
                $adminNotes = trim($notesRes->fetch_assoc()['setting_value'] ?? '');
            }
        } catch (Exception $e) {}
    }

    // Compact CSS for single-page PDF - fit within A4 page margins
    $cssContent = "
    * { box-sizing: border-box; }
    body { 
        font-family: DejaVu Sans, Arial, sans-serif; 
        line-height: 1.3; 
        margin: 0; 
        padding: 4px; 
        color: #333;
        font-size: 11px;
    }
    .invoice-container { 
        width: 100%;
        max-width: 190mm;
        margin: 0 auto; 
        padding: 6px;
        page-break-inside: avoid;
        overflow: hidden;
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
    h1 { font-size: 18pt; margin: 0 0 5px 0; }
    h2 { font-size: 14pt; margin: 0 0 5px 0; }
    h3 { font-size: 11px; margin: 0 0 4px 0; }
    .section-title { margin: 0 0 4px 0; padding-bottom: 2px; border-bottom: 1px solid #ddd; font-size: 11px; font-weight: bold; }
    .two-col { width: 100%; margin-bottom: 8px; table-layout: fixed; }
    .two-col td { width: 50%; vertical-align: top; padding: 0 6px 0 0; word-wrap: break-word; overflow-wrap: break-word; }
    .compact-p { margin: 2px 0; font-size: 11px; word-wrap: break-word; overflow-wrap: break-word; }
    .admin-notes { margin-top: 10px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 12px; page-break-inside: avoid; }
    .admin-notes .section-title { font-weight: 600; margin-bottom: 4px; }
    .notes-content { color: #444; line-height: 1.4; word-break: break-word; }
    .fare-table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 11px; table-layout: fixed; }
    .fare-table th, .fare-table td { padding: 4px 6px; text-align: left; border-bottom: 1px solid #eee; word-wrap: break-word; overflow-wrap: break-word; }
    .fare-table th:first-child, .fare-table td:first-child { width: auto; }
    .fare-table th:last-child, .fare-table td:last-child { width: 80px; text-align: right; word-wrap: normal; }
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
        margin-top: 15px;
        margin-bottom: 15px;
    }
    .extra-charges-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 5px;
    }
    .extra-charges-table th, .extra-charges-table td {
        padding: 5px;
        text-align: left;
        border-bottom: 1px solid #eee;
    }
    .extra-charges-table th:last-child, .extra-charges-table td:last-child {
        text-align: right;
    }
    
    @page { size: A4; margin: 8mm; }
    @media print {
        body { margin: 0; padding: 4px; }
        .invoice-container { page-break-inside: avoid; }
    }
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
            <div style="border: 1px solid #000; padding: 4px; margin-bottom: 8px;">
                <table width="100%" cellpadding="2" cellspacing="0" style="font-size:11px; table-layout:fixed;">
                    <tr>
                        <td width="38%" valign="top" style="word-wrap:break-word;overflow-wrap:break-word;">
                            <p class="compact-p"><strong>Seller/Service Provider:</strong></p>
                            <p class="compact-p"><strong>VIZAG TAXI HUB</strong></p>
                            <p class="compact-p">44-66-22/4, Singalamma Puram, Kailasapuram, Visakhapatnam, Andhra Pradesh - 530024</p>' .
                            ($gstEnabled ? '<p class="compact-p"><strong>GSTIN: '.htmlspecialchars($gstinDisplay).'</strong></p><p class="compact-p"><strong>HSN Code: '.$hsnCode.'</strong></p>' : '') . '
                        </td>
                        <td width="24%" align="center" valign="top"><h2 style="margin:0;font-size:14px;">'.($gstEnabled ? 'TAX INVOICE' : 'INVOICE').'</h2><p class="compact-p">Original for Recipient</p></td>
                        <td width="38%" align="right" valign="top" style="word-wrap:break-word;overflow-wrap:break-word;">
                            <p class="compact-p"><strong>Invoice #:</strong> '.$invoiceNumber.'</p>
                            <p class="compact-p"><strong>Date:</strong> '.date('d M Y', strtotime($currentDate)).'</p>
                            <p class="compact-p"><strong>Booking #:</strong> '.($booking['booking_number'] ?? 'N/A').'</p>
                        </td>
                    </tr>
                </table>
            </div>

            <table class="two-col" width="100%" style="margin-bottom:8px;"><tr>
                <td><div style="width:100%;"><h3 class="section-title">Customer Details</h3>
                    <p class="compact-p"><strong>Name:</strong> '.htmlspecialchars($booking['passenger_name'] ?? 'N/A').'</p>
                    <p class="compact-p"><strong>Phone:</strong> '.htmlspecialchars($booking['passenger_phone'] ?? 'N/A').'</p>
                    <p class="compact-p"><strong>Email:</strong> '.htmlspecialchars($booking['passenger_email'] ?? 'N/A').'</p></div></td>
                <td><div style="width:100%;"><h3 class="section-title">Trip Summary</h3>
                    <p class="compact-p"><strong>Trip Type:</strong> '.ucfirst($booking['trip_type'] ?? 'N/A').(isset($booking['trip_mode']) && !empty($booking['trip_mode']) ? ' ('.ucfirst($booking['trip_mode']).')' : '').'</p>
                    <p class="compact-p"><strong>Date:</strong> '.(isset($booking['pickup_date']) ? date('d M Y', strtotime($booking['pickup_date'])) : 'N/A').'</p>
                    <p class="compact-p"><strong>Vehicle:</strong> '.htmlspecialchars($booking['cab_type'] ?? 'N/A').'</p>
                    <p class="compact-p"><strong>No. of Hours:</strong> '.$noOfHours.'</p>
                    <p class="compact-p"><strong>No. of Kilometers:</strong> '.$noOfKm.'</p></div></td>
            </tr></table>

            <table class="two-col" width="100%" style="margin-bottom:8px;"><tr>
                <td><div style="width:100%;"><h3 class="section-title">Trip Details</h3>
                    <p class="compact-p"><strong>Pickup:</strong> '.htmlspecialchars($booking['pickup_location'] ?? 'N/A').'</p>
                    '.(isset($booking['drop_location']) && !empty($booking['drop_location']) ? '<p class="compact-p"><strong>Drop:</strong> '.htmlspecialchars($booking['drop_location']).'</p>' : '').'
                    <p class="compact-p"><strong>Pickup Time:</strong> '.(isset($booking['pickup_date']) ? date('d M Y, h:i A', strtotime($booking['pickup_date'])) : 'N/A').'</p></div></td>
                <td><div style="width:100%;">'.($gstEnabled && !empty($gstNumber) ? '
                    <h3 class="section-title">GST Details</h3>
                    <p class="compact-p"><strong>GST Number:</strong> '.htmlspecialchars($gstNumber).'</p>
                    <p class="compact-p"><strong>Company Name:</strong> '.htmlspecialchars($companyName).'</p>
                    '.(!empty($companyAddress) ? '<p class="compact-p"><strong>Company Address:</strong> '.htmlspecialchars($companyAddress).'</p>' : '').'
                ' : '').'</div></td>
            </tr></table>';


    $content .= '
                <h3 class="section-title">Fare Breakdown</h3>
                <table class="fare-table">
                    <tr>
                        <th>Description</th>
                        <th style="text-align: right;">Amount</th>
                    </tr>
                    <tr>
                        <td>Base Fare</td>
                        <td><span class="rupee-symbol">₹</span> '.number_format($baseFare, 2).'</td>
                    </tr>';

    // Add extra charges as line items in the same table
    if (!empty($extraCharges)) {
        foreach ($extraCharges as $charge) {
            $description = isset($charge['description']) ? $charge['description'] : 
                         (isset($charge['label']) ? $charge['label'] : 'Additional Charge');
            $amount = isset($charge['amount']) ? (float)$charge['amount'] : 0;

            $content .= '
                    <tr>
                        <td>'.htmlspecialchars($description).'</td>
                        <td style="text-align: right;"><span class="rupee-symbol">₹</span> '.number_format($amount, 2).'</td>
                    </tr>';
        }
    }

    if ($gstEnabled) {
        if ($isIGST) {
            $content .= '
                    <tr>
                        <td>IGST (18%)</td>
                        <td><span class="rupee-symbol">₹</span> '.number_format($igstAmount, 2).'</td>
                    </tr>';
        } else {
            $content .= '
                    <tr>
                        <td>CGST (9%)</td>
                        <td><span class="rupee-symbol">₹</span> '.number_format($cgstAmount, 2).'</td>
                    </tr>
                    <tr>
                        <td>SGST (9%)</td>
                        <td><span class="rupee-symbol">₹</span> '.number_format($sgstAmount, 2).'</td>
                    </tr>';
        }
    }

    $content .= '
                    <tr class="total-row">
                        <td>Total Amount'.($gstEnabled && $includeTax ? ' (including tax)' : '').'</td>
                        <td><span class="rupee-symbol">₹</span> '.number_format($fareTotalWithTax, 2).'</td>
                    </tr>
                </table>';

    if ($gstEnabled) {
        $content .= '
                <p class="tax-note" style="font-size: 9px; color: #666;">This invoice includes GST as per applicable rates. '.($isIGST ? 'IGST 18%' : 'CGST 9% + SGST 9%').' has been applied.</p>';
    }

    if ($adminNotes !== '') {
        $content .= '
            <div class="admin-notes">
                <div class="section-title">Admin Notes</div>
                <div class="notes-content">'.nl2br(htmlspecialchars($adminNotes)).'</div>
            </div>';
    }

    $content .= '
            </div>
            <div class="footer" style="margin-top:10px;font-size:9px;">
                <p>Thank you for choosing Vizag Taxi Hub</p>
                <p>For inquiries: info@vizagtaxihub.com | +91 9966363662</p>
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
            $dompdf->loadHtml($content);
            
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
