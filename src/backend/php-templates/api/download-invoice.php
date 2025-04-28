
<?php
// Include configuration file
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/common/db_helper.php';

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

// JSON response in case of error
function sendJsonResponse($data, $statusCode = 200) {
    header('Content-Type: application/json');
    http_response_code($statusCode);
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
    logInvoiceError("Public invoice download starting", [
        'booking_id' => $_GET['id'] ?? null,
        'gstEnabled' => $_GET['gstEnabled'] ?? 'false',
        'gstNumber' => $_GET['gstNumber'] ?? '',
        'companyName' => $_GET['companyName'] ?? '',
        'format' => $_GET['format'] ?? 'pdf',
        'direct_download' => $_GET['direct_download'] ?? '0'
    ]);

    // Only allow GET requests
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }

    // Get booking ID from query parameters
    $bookingId = isset($_GET['id']) ? (int)$_GET['id'] : null;
    
    if (!$bookingId) {
        sendJsonResponse(['status' => 'error', 'message' => 'Missing booking ID'], 400);
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
            sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
        }
        
        $booking = $result->fetch_assoc();
        $stmt->close();
    } else {
        logInvoiceError("Error preparing statement", ['error' => $conn->error]);
        throw new Exception("Database error: " . $conn->error);
    }

    // Generate invoice number
    $invoiceNumber = empty($customInvoiceNumber) ? 'INV-' . date('Ymd') . '-' . $bookingId : $customInvoiceNumber;

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

    // Create a more complete PDF file
    if ($format === 'pdf') {
        // CRITICAL: Set correct PDF content type headers
        header("Content-Type: application/pdf");
        
        // Strong content disposition for forcing download
        $disposition = $directDownload ? "attachment" : "inline";
        header("Content-Disposition: {$disposition}; filename=\"{$invoiceNumber}.pdf\"");
        
        // Set additional headers to prevent caching
        header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
        header("Pragma: no-cache");
        header("Expires: 0");
        header("X-Content-Type-Options: nosniff");
        
        // Create a more detailed PDF
        $pdfContent = "%PDF-1.7\n";
        
        // PDF Objects
        $pdfContent .= "1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n";
        $pdfContent .= "2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n";
        $pdfContent .= "3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>> >> >>\nendobj\n";
        
        // Font
        $pdfContent .= "5 0 obj\n<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>\nendobj\n";
        
        // Content
        $content = "BT /F1 24 Tf 200 700 Td (Invoice #{$invoiceNumber}) Tj ET\n";
        
        // Customer data
        $content .= "BT /F1 12 Tf 100 650 Td (Customer: " . ($booking['passenger_name'] ?? 'N/A') . ") Tj ET\n";
        $content .= "BT /F1 12 Tf 100 630 Td (Phone: " . ($booking['passenger_phone'] ?? 'N/A') . ") Tj ET\n";
        $content .= "BT /F1 12 Tf 100 610 Td (Email: " . ($booking['passenger_email'] ?? 'N/A') . ") Tj ET\n";
        
        // Trip details
        $content .= "BT /F1 14 Tf 100 550 Td (Trip Details) Tj ET\n";
        $content .= "BT /F1 12 Tf 100 520 Td (Trip Type: " . ucfirst($booking['trip_type'] ?? 'N/A') . ") Tj ET\n";
        $content .= "BT /F1 12 Tf 100 500 Td (Pickup: " . ($booking['pickup_location'] ?? 'N/A') . ") Tj ET\n";
        $content .= "BT /F1 12 Tf 100 480 Td (Drop: " . ($booking['drop_location'] ?? 'N/A') . ") Tj ET\n";
        $content .= "BT /F1 12 Tf 100 460 Td (Date: " . date('d M Y', strtotime($booking['pickup_date'] ?? 'now')) . ") Tj ET\n";
        $content .= "BT /F1 12 Tf 100 440 Td (Vehicle: " . ($booking['cab_type'] ?? 'N/A') . ") Tj ET\n";
        
        // Fare breakdown
        $content .= "BT /F1 14 Tf 100 380 Td (Fare Details) Tj ET\n";
        $content .= "BT /F1 12 Tf 100 350 Td (Base Amount: ₹" . number_format($baseAmountBeforeTax, 2) . ") Tj ET\n";
        
        $y = 330;
        if ($gstEnabled) {
            if ($isIGST) {
                $content .= "BT /F1 12 Tf 100 {$y} Td (IGST (12%): ₹" . number_format($igstAmount, 2) . ") Tj ET\n";
                $y -= 20;
            } else {
                $content .= "BT /F1 12 Tf 100 {$y} Td (CGST (6%): ₹" . number_format($cgstAmount, 2) . ") Tj ET\n";
                $y -= 20;
                $content .= "BT /F1 12 Tf 100 {$y} Td (SGST (6%): ₹" . number_format($sgstAmount, 2) . ") Tj ET\n";
                $y -= 20;
            }
        }
        
        // Total
        $content .= "BT /F1 14 Tf 100 " . ($y - 20) . " Td (Total Amount: ₹" . number_format($totalAmount, 2) . ") Tj ET\n";
        
        // Footer
        $content .= "BT /F1 10 Tf 100 100 Td (Thank you for choosing Vizag Cab Services!) Tj ET\n";
        $content .= "BT /F1 10 Tf 100 80 Td (Contact: +91 9876543210 | Email: info@vizagcabs.com) Tj ET\n";
        $content .= "BT /F1 10 Tf 100 60 Td (Generated on: " . date('d M Y H:i:s') . ") Tj ET\n";
        
        $contentLength = strlen($content);
        $pdfContent .= "4 0 obj\n<</Length $contentLength>>\nstream\n$content\nendstream\nendobj\n";
        
        // End of PDF
        $pdfContent .= "xref\n0 6\n0000000000 65535 f\n";
        $pdfContent .= "0000000010 00000 n\n";
        $pdfContent .= "0000000056 00000 n\n";
        $pdfContent .= "0000000111 00000 n\n";
        $pdfContent .= "0000000212 00000 n\n";
        $pdfContent .= "0000000434 00000 n\n";
        $pdfContent .= "trailer\n<</Size 6 /Root 1 0 R>>\nstartxref\n" . (strlen($pdfContent) + 100) . "\n%%EOF";
        
        // Force content length to ensure complete download
        header("Content-Length: " . strlen($pdfContent));
        
        // Output the PDF data
        echo $pdfContent;
        
        logInvoiceError("Public invoice download completed successfully", [
            'booking_id' => $bookingId,
            'content_type_sent' => 'application/pdf'
        ]);
        exit;
    }
    else {
        // For non-PDF formats, redirect to admin endpoint
        $adminUrl = 'http://' . $_SERVER['HTTP_HOST'] . '/api/admin/generate-invoice.php';
        header("Location: $adminUrl?" . http_build_query($_GET));
        exit;
    }

} catch (Exception $e) {
    logInvoiceError("Critical error in public download-invoice.php", ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
    
    // For errors, ensure we return JSON
    header('Content-Type: application/json');
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
