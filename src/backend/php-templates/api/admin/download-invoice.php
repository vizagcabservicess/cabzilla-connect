<?php
// Include configuration file - use absolute path with __DIR__
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';

// CRITICAL: Create logs directory if it doesn't exist
$logsDir = __DIR__ . '/../../logs';
if (!is_dir($logsDir)) {
    @mkdir($logsDir, 0755, true);
}

// CRITICAL: Improved autoloader detection with absolute paths including the known working path
$autoloaderPaths = [
    // Add the confirmed path first
    $_SERVER['DOCUMENT_ROOT'] . '/public_html/vendor/autoload.php',
    
    // Try other common paths
    $_SERVER['DOCUMENT_ROOT'] . '/vendor/autoload.php',
    dirname($_SERVER['DOCUMENT_ROOT']) . '/public_html/vendor/autoload.php',
    dirname($_SERVER['DOCUMENT_ROOT']) . '/vendor/autoload.php',
    __DIR__ . '/../../vendor/autoload.php',
    dirname(__DIR__) . '/vendor/autoload.php',
    dirname(dirname(__DIR__)) . '/vendor/autoload.php',
    realpath(__DIR__ . '/../../../../vendor/autoload.php')
];

$vendorExists = false;
$autoloaderPath = null;
$autoloaderSearchResults = [];

foreach ($autoloaderPaths as $path) {
    $autoloaderSearchResults[$path] = [
        'exists' => file_exists($path),
        'readable' => is_readable($path)
    ];
    
    if (file_exists($path) && is_readable($path)) {
        $autoloaderPath = $path;
        $vendorExists = true;
        break;
    }
}

// Log whether we found the autoloader or not
if ($vendorExists) {
    // Require Composer's autoloader if it exists
    require_once $autoloaderPath;
    error_log("Admin: Found composer autoloader at: " . $autoloaderPath);
} else {
    // Log detailed error about autoloader search
    error_log("Admin: CRITICAL ERROR: No composer autoloader found! Search results: " . json_encode($autoloaderSearchResults));
}

// Debug mode
$debugMode = isset($_GET['debug']) || isset($_SERVER['HTTP_X_DEBUG']);

// CRITICAL: Clear all buffers first - this is essential for PDF/HTML output
while (ob_get_level()) ob_end_clean();

// CRITICAL: Set CORS headers
header('Access-Control-Allow-Origin: ' . (isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : ''));
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// JSON response in case of error
function sendJsonResponse($data, $statusCode = 200) {
    header('Content-Type: application/json');
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

// Improved error logging function with file path
function logInvoiceError($message, $data = []) {
    $formattedData = is_array($data) ? json_encode($data) : (string)$data;
    error_log("ADMIN INVOICE ERROR: $message " . $formattedData);
    
    $logFile = __DIR__ . '/../../logs/invoice_errors.log';
    $dir = dirname($logFile);
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    
    @file_put_contents(
        $logFile,
        date('Y-m-d H:i:s') . " - ADMIN - $message - " . $formattedData . "\n",
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
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }

    // Get booking ID from query parameters
    $bookingId = isset($_GET['id']) ? (int)$_GET['id'] : null;
    
    if (!$bookingId) {
        sendJsonResponse(['status' => 'error', 'message' => 'Missing booking ID'], 400);
    }
    
    // Get output format - default to PDF
    $format = isset($_GET['format']) ? strtolower($_GET['format']) : 'pdf';
    $isPdfOutput = ($format === 'pdf');
    // Check for direct download flag
    $directDownload = isset($_GET['direct_download']) && $_GET['direct_download'] === '1';
    
    logInvoiceError("Processing invoice download for booking ID: $bookingId", [
        'format' => $format,
        'isPdf' => $isPdfOutput ? 'true' : 'false',
        'directDownload' => $directDownload ? 'true' : 'false',
        'autoloaderPath' => $autoloaderPath,
        'script_path' => __FILE__,
        'document_root' => $_SERVER['DOCUMENT_ROOT']
    ]);

    // Get GST parameters from GET
    $gstEnabled = isset($_GET['gstEnabled']) ? filter_var($_GET['gstEnabled'], FILTER_VALIDATE_BOOLEAN) : false;
    $gstNumber = isset($_GET['gstNumber']) ? $_GET['gstNumber'] : '';
    $companyName = isset($_GET['companyName']) ? $_GET['companyName'] : '';
    $companyAddress = isset($_GET['companyAddress']) ? $_GET['companyAddress'] : '';
    $isIGST = isset($_GET['isIGST']) ? filter_var($_GET['isIGST'], FILTER_VALIDATE_BOOLEAN) : false;
    $includeTax = isset($_GET['includeTax']) ? filter_var($_GET['includeTax'], FILTER_VALIDATE_BOOLEAN) : true;
    $customInvoiceNumber = isset($_GET['invoiceNumber']) ? $_GET['invoiceNumber'] : '';
    $lockedBaseFare = isset($_GET['lockedBaseFare']) ? floatval($_GET['lockedBaseFare']) : null;

    // Connect to database with improved error handling
    try {
        $conn = getDbConnectionWithRetry();
        logInvoiceError("Database connection established successfully");
    } catch (Exception $e) {
        logInvoiceError("Database connection error", ['error' => $e->getMessage()]);
        throw new Exception("Database connection failed: " . $e->getMessage());
    }
    
    // Get booking details
    $booking = null;
    $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
    if ($stmt) {
        $stmt->bind_param("i", $bookingId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            if (!$isPdfOutput) {
                sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
            } else {
                header('Content-Type: text/plain');
                echo "Error 404: Booking not found.";
                exit;
            }
        }
        
        $booking = $result->fetch_assoc();
        logInvoiceError("Booking found", ['booking_id' => $booking['id']]);
        $stmt->close();
    } else {
        logInvoiceError("Error preparing statement", ['error' => $conn->error]);
        throw new Exception("Database error: " . $conn->error);
    }

    // Parse extra charges from the database
    $extraCharges = [];
    if (!empty($booking['extra_charges'])) {
        try {
            $parsedCharges = json_decode($booking['extra_charges'], true);
            if (is_array($parsedCharges)) {
                $extraCharges = $parsedCharges;
                logInvoiceError("Extra charges found", ['charges' => $extraCharges]);
            }
        } catch (Exception $e) {
            logInvoiceError("Failed to parse extra_charges", ['error' => $e->getMessage()]);
        }
    }

    // Current date for invoice generation
    $currentDate = date('Y-m-d');
    $invoiceNumber = empty($customInvoiceNumber) ? 'INV-' . date('Ymd') . '-' . $bookingId : $customInvoiceNumber;
    
    // Calculate extra charges total
    $extraChargesTotal = 0;
    if (!empty($extraCharges)) {
        foreach ($extraCharges as $charge) {
            $amount = isset($charge['amount']) ? (float)$charge['amount'] : 0;
            $extraChargesTotal += $amount;
        }
    }
    
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
            <div style='border: 1px solid #000; padding: 5px; margin-bottom: 15px;'>
                <table width='100%' cellpadding='2' cellspacing='0'>
                    <tr>
                        <td width='40%' valign='top'>
                            <p><strong>Seller/Service Provider:</strong></p>
                            <p><strong>VIZAG TAXI HUB</strong></p>
                            <p>44-66-22/4, Singalamma Puram, Kailasapuram,<br>
                            Visakhapatnam, Andhra Pradesh - 530024</p>" . 
                            ($gstEnabled ? "<p><strong>GSTIN: 37AATFV5320K1ZL</strong></p>" : "") . "
                        </td>
                        
                        <td width='20%' align='center' valign='top'>
                            <h2>" . ($gstEnabled ? 'TAX INVOICE' : 'INVOICE') . "</h2>
                            <p>Original for Recipient</p>
                        </td>
                        
                        <td width='40%' align='right' valign='top'>
                            <p><strong>Invoice #:</strong> {$invoiceNumber}</p>
                            <p><strong>Date:</strong> {$currentDate}</p>
                            <p><strong>Booking #:</strong> {$booking['booking_number']}</p>
                        </td>
                    </tr>
                </table>
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
                <h3>Fare Breakdown</h3>
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
                            <td>₹ " . number_format($baseFare, 2) . "</td>
                        </tr>";
    
    // Add extra charges as line items in the same table
    if (!empty($extraCharges)) {
        foreach ($extraCharges as $charge) {
            $chargeDesc = isset($charge['description']) ? $charge['description'] : 
                         (isset($charge['label']) ? $charge['label'] : 'Additional Charge');
            $chargeAmount = isset($charge['amount']) ? (float)$charge['amount'] : 0;
            
            $htmlContent .= "
                        <tr>
                            <td>" . htmlspecialchars($chargeDesc) . "</td>
                            <td>₹ " . number_format($chargeAmount, 2) . "</td>
                        </tr>";
        }
    }
    
    // Add GST rows if applicable
    if ($gstEnabled) {
        if ($isIGST) {
            $htmlContent .= "
                        <tr>
                            <td>IGST (18%)</td>
                            <td>₹ " . number_format($igstAmount, 2) . "</td>
                        </tr>";
        } else {
            $htmlContent .= "
                        <tr>
                            <td>CGST (9%)</td>
                            <td>₹ " . number_format($cgstAmount, 2) . "</td>
                        </tr>
                        <tr>
                            <td>SGST (9%)</td>
                            <td>₹ " . number_format($sgstAmount, 2) . "</td>
                        </tr>";
        }
    }
    
    $htmlContent .= "
                        <tr class='total-row'>
                            <td>Total Amount" . ($gstEnabled && $includeTax ? ' (including tax)' : '') . "</td>
                            <td>₹ " . number_format($fareTotalWithTax, 2) . "</td>
                        </tr>
                    </tbody>
                </table>";
    
    $htmlContent .= "
            </div>
            
            <div class='invoice-footer' style='margin-top: 50px; text-align: center; font-size: 12px;'>
                <p>Thank you for choosing Vizag Taxi Hub</p>
                <p>For inquiries, please contact: info@vizagtaxihub.com | +91 9966363662</p>";
    
    if ($gstEnabled) {
        $htmlContent .= "<p>This invoice includes GST as per applicable rates. " . ($isIGST ? "IGST 18% has been applied." : "CGST 9% + SGST 9% has been applied.") . "</p><p>This is a computer-generated invoice and does not require a signature.</p>";
    }
    
    $htmlContent .= "
            </div>
        </div>
    </body>
    </html>";

    // If the format is HTML, output directly
    if ($format === 'html') {
        header('Content-Type: text/html; charset=utf-8');
        echo $htmlContent;
        exit;
    }
    
    // If the format is PDF, generate a PDF using mPDF if available
    try {
        if ($vendorExists) {
            // Use mPDF if available
            $mpdf = new \Mpdf\Mpdf([
                'mode' => 'utf-8',
                'format' => 'A4',
                'margin_top' => 15,
                'margin_bottom' => 15,
                'margin_left' => 15,
                'margin_right' => 15
            ]);
            
            // Set document metadata
            $mpdf->SetTitle("Invoice #{$invoiceNumber}");
            $mpdf->SetAuthor('Vizag Taxi Hub');
            $mpdf->SetCreator('Vizag Taxi Hub Invoice System');
            
            // Write HTML content to PDF
            $mpdf->WriteHTML($htmlContent);
            
            // Output PDF
            if ($directDownload) {
                $mpdf->Output("Invoice_{$invoiceNumber}.pdf", 'D'); // Force download
            } else {
                $mpdf->Output("Invoice_{$invoiceNumber}.pdf", 'I'); // Display in browser
            }
            exit;
        } else {
            throw new Exception("PDF generation library not available");
        }
    } catch (Exception $e) {
        logInvoiceError("Failed to generate PDF: " . $e->getMessage());
        
        // Fallback to HTML if PDF generation fails
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
        sendJsonResponse([
            'status' => 'error', 
            'message' => 'Failed to generate invoice: ' . $e->getMessage(),
            'error_details' => $debugMode ? $e->getTraceAsString() : null
        ], 500);
    } else {
        // If not expecting JSON, output plain error
        header('Content-Type: text/html; charset=utf-8');
        echo "<h1>Error</h1><p>" . htmlspecialchars($e->getMessage()) . "</p>";
        if ($debugMode) {
            echo "<pre>" . htmlspecialchars($e->getTraceAsString()) . "</pre>";
        }
        exit;
    }
}

// Close any remaining database connections
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
