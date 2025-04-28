
<?php 
// Include configuration file
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';

// CRITICAL: Clear all buffers before ANY output - essential for PDF/HTML output
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

// Log error function with more details
function logInvoiceError($message, $data = []) {
    error_log("INVOICE ERROR: $message " . json_encode($data));
    $logFile = __DIR__ . '/../../logs/invoice_errors.log';
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
    
    // Get output format - default to PDF
    $format = isset($_GET['format']) ? strtolower($_GET['format']) : 'pdf';
    $isPdfOutput = ($format === 'pdf');
    $directPdf = isset($_GET['pdf_direct']) && $_GET['pdf_direct'] === '1';
    // Check for direct download flag
    $directDownload = isset($_GET['direct_download']) && $_GET['direct_download'] === '1';
    
    logInvoiceError("Processing invoice download for booking ID: $bookingId", [
        'format' => $format,
        'isPdf' => $isPdfOutput ? 'true' : 'false',
        'directPdf' => $directPdf ? 'true' : 'false',
        'directDownload' => $directDownload ? 'true' : 'false'
    ]);

    // Get GST parameters from GET
    $gstEnabled = isset($_GET['gstEnabled']) ? filter_var($_GET['gstEnabled'], FILTER_VALIDATE_BOOLEAN) : false;
    $gstNumber = isset($_GET['gstNumber']) ? $_GET['gstNumber'] : '';
    $companyName = isset($_GET['companyName']) ? $_GET['companyName'] : '';
    $companyAddress = isset($_GET['companyAddress']) ? $_GET['companyAddress'] : '';
    $isIGST = isset($_GET['isIGST']) ? filter_var($_GET['isIGST'], FILTER_VALIDATE_BOOLEAN) : false;
    $includeTax = isset($_GET['includeTax']) ? filter_var($_GET['includeTax'], FILTER_VALIDATE_BOOLEAN) : true;
    $customInvoiceNumber = isset($_GET['invoiceNumber']) ? $_GET['invoiceNumber'] : '';

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
            sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
        }
        
        $booking = $result->fetch_assoc();
        logInvoiceError("Booking found", ['booking_id' => $booking['id']]);
        $stmt->close();
    } else {
        logInvoiceError("Error preparing statement", ['error' => $conn->error]);
        throw new Exception("Database error: " . $conn->error);
    }

    // Current date for invoice generation
    $currentDate = date('Y-m-d');
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

    // Format the date properly
    $pickupDateStr = isset($booking['pickup_date']) ? date('d M Y', strtotime($booking['pickup_date'])) : 'N/A';

    // Create PDF content using a simplified structure that matches the dashboard view
    if ($isPdfOutput) {
        // CRITICAL: Make sure we're not sending mixed content types
        header("Content-Type: application/pdf");
        // Force download if requested
        $disposition = $directDownload ? "attachment" : "inline";
        header("Content-Disposition: {$disposition}; filename=\"invoice_{$invoiceNumber}.pdf\"");
        // Stop caching - critical for consistent PDF loading
        header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
        header("Pragma: no-cache");
        header("Expires: 0");
        
        // Create a more visually appealing PDF that matches the dashboard design
        $content = "";
        
        // Company branding
        $content .= "BT /F2 24 Tf 180 750 Td (Vizag Cab Services) Tj ET\n";
        
        // Invoice header
        $yPos = 700;
        $content .= "BT /F2 20 Tf 80 {$yPos} Td (INVOICE #{$invoiceNumber}) Tj ET\n";
        $content .= "BT /F1 12 Tf 400 {$yPos} Td (Date: " . date('d M Y') . ") Tj ET\n";
        
        // Customer details section with box
        $yPos = 650;
        drawBox($content, 60, $yPos - 100, 500, 80);
        $content .= "BT /F2 14 Tf 80 {$yPos} Td (Customer Details) Tj ET\n";
        $yPos -= 25;
        $content .= "BT /F1 12 Tf 80 {$yPos} Td (Name: " . ($booking['passenger_name'] ?? 'N/A') . ") Tj ET\n";
        $yPos -= 20;
        $content .= "BT /F1 12 Tf 80 {$yPos} Td (Phone: " . ($booking['passenger_phone'] ?? 'N/A') . ") Tj ET\n";
        $yPos -= 20;
        $content .= "BT /F1 12 Tf 80 {$yPos} Td (Email: " . ($booking['passenger_email'] ?? 'N/A') . ") Tj ET\n";
        
        // Trip details section with box
        $yPos -= 40;
        drawBox($content, 60, $yPos - 120, 500, 100);
        $content .= "BT /F2 14 Tf 80 {$yPos} Td (Trip Details) Tj ET\n";
        $yPos -= 25;
        $content .= "BT /F1 12 Tf 80 {$yPos} Td (Trip Type: " . ucfirst($booking['trip_type'] ?? 'N/A') . ") Tj ET\n";
        $yPos -= 20;
        $content .= "BT /F1 12 Tf 80 {$yPos} Td (Pickup: " . ($booking['pickup_location'] ?? 'N/A') . ") Tj ET\n";
        $yPos -= 20;
        if (!empty($booking['drop_location'])) {
            $content .= "BT /F1 12 Tf 80 {$yPos} Td (Drop: " . $booking['drop_location'] . ") Tj ET\n";
            $yPos -= 20;
        }
        $content .= "BT /F1 12 Tf 80 {$yPos} Td (Date: {$pickupDateStr}) Tj ET\n";
        $yPos -= 20;
        $content .= "BT /F1 12 Tf 80 {$yPos} Td (Vehicle: " . ($booking['cab_type'] ?? 'N/A') . ") Tj ET\n";
        
        // Fare breakdown section with box
        $yPos -= 40;
        drawBox($content, 60, $yPos - 120, 500, 100);
        $content .= "BT /F2 14 Tf 80 {$yPos} Td (Fare Details) Tj ET\n";
        $yPos -= 25;
        
        // Base amount
        $content .= "BT /F1 12 Tf 80 {$yPos} Td (Base Amount:) Tj ET\n";
        $content .= "BT /F1 12 Tf 450 {$yPos} Td (\u20B9" . number_format($baseAmountBeforeTax, 2) . ") Tj ET\n";
        $yPos -= 20;
        
        // GST details if enabled
        if ($gstEnabled) {
            if ($isIGST) {
                $content .= "BT /F1 12 Tf 80 {$yPos} Td (IGST (12%):) Tj ET\n";
                $content .= "BT /F1 12 Tf 450 {$yPos} Td (\u20B9" . number_format($igstAmount, 2) . ") Tj ET\n";
                $yPos -= 20;
            } else {
                $content .= "BT /F1 12 Tf 80 {$yPos} Td (CGST (6%):) Tj ET\n";
                $content .= "BT /F1 12 Tf 450 {$yPos} Td (\u20B9" . number_format($cgstAmount, 2) . ") Tj ET\n";
                $yPos -= 20;
                $content .= "BT /F1 12 Tf 80 {$yPos} Td (SGST (6%):) Tj ET\n";
                $content .= "BT /F1 12 Tf 450 {$yPos} Td (\u20B9" . number_format($sgstAmount, 2) . ") Tj ET\n";
                $yPos -= 20;
            }
        }
        
        // Draw line for total
        $content .= "0.5 w\n";
        $content .= "60 " . ($yPos + 10) . " m\n";
        $content .= "560 " . ($yPos + 10) . " l\n";
        $content .= "S\n";
        
        // Total amount
        $yPos -= 20;
        $content .= "BT /F2 14 Tf 80 {$yPos} Td (Total Amount:) Tj ET\n";
        $content .= "BT /F2 14 Tf 450 {$yPos} Td (\u20B9" . number_format($totalAmount, 2) . ") Tj ET\n";
        
        // Footer
        $yPos = 120;
        $content .= "BT /F2 12 Tf 80 {$yPos} Td (Thank you for choosing Vizag Cab Services!) Tj ET\n";
        $yPos -= 20;
        $content .= "BT /F1 10 Tf 80 {$yPos} Td (Contact: +91 9876543210 | Email: info@vizagcabs.com) Tj ET\n";
        $yPos -= 20;
        $content .= "BT /F1 10 Tf 80 {$yPos} Td (Generated on: " . date('d M Y H:i:s') . ") Tj ET\n";
        
        // Helper function to draw boxes
        function drawBox(&$content, $x, $y, $width, $height) {
            $content .= "0.5 w\n";  // Set line width
            $content .= "{$x} {$y} m\n";  // Move to start point
            $content .= "{$x} " . ($y + $height) . " l\n";  // Draw left line
            $content .= ($x + $width) . " " . ($y + $height) . " l\n";  // Draw top line
            $content .= ($x + $width) . " {$y} l\n";  // Draw right line
            $content .= "{$x} {$y} l\n";  // Draw bottom line
            $content .= "S\n";  // Stroke the path
        }
        
        // Create complete PDF with refined styling - CRITICAL FIX: Add proper PDF structure markers
        $pdfContent = "%PDF-1.7\n";
        $pdfContent .= "1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n";
        $pdfContent .= "2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n";
        $pdfContent .= "3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources <</Font <</F1 5 0 R /F2 6 0 R>> >> >>\nendobj\n";
        
        // Fonts - Regular and Bold
        $pdfContent .= "5 0 obj\n<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>\nendobj\n";
        $pdfContent .= "6 0 obj\n<</Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold>>\nendobj\n";
        
        // Start content stream with proper length calculation
        $contentLength = strlen($content);
        $pdfContent .= "4 0 obj\n<</Length $contentLength>>\nstream\n$content\nendstream\nendobj\n";
        
        // End of PDF with proper xref table
        $pdfContent .= "xref\n0 7\n0000000000 65535 f\n";
        $pdfContent .= "0000000010 00000 n\n";
        $pdfContent .= "0000000056 00000 n\n";
        $pdfContent .= "0000000111 00000 n\n";
        $pdfContent .= "0000000212 00000 n\n";
        $pdfContent .= "0000000434 00000 n\n";
        $pdfContent .= "0000000500 00000 n\n";
        $pdfContent .= "trailer\n<</Size 7 /Root 1 0 R>>\nstartxref\n" . (strlen($pdfContent) + 100) . "\n%%EOF";

        // CRITICAL FIX: Set the content length header
        header("Content-Length: " . strlen($pdfContent));

        echo $pdfContent;
        exit;
    }
    else {
        // For HTML output
        header('Content-Type: text/html; charset=utf-8');
        echo '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice #' . $invoiceNumber . '</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            color: #333; 
            line-height: 1.6; 
        }
        .invoice-container { 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 30px; 
            background-color: white;
        }
        .invoice-title {
            text-align: center;
            font-size: 24px;
            margin-bottom: 30px;
        }
        .customer-details, 
        .trip-details,
        .fare-details {
            margin-bottom: 30px;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            border-bottom: 1px solid #eee;
            padding-bottom: 5px;
        }
        .detail-row {
            margin-bottom: 10px;
        }
        .total-amount {
            font-size: 18px;
            font-weight: bold;
            margin-top: 15px;
        }
        .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 14px;
            color: #666;
        }
        @media print {
            body { margin: 0; padding: 0; }
            @page { size: A4; margin: 10mm; }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="invoice-title">
            Invoice #' . $invoiceNumber . '
        </div>
        
        <div class="customer-details">
            <p class="detail-row"><strong>Customer:</strong> ' . ($booking['passenger_name'] ?? 'N/A') . '</p>
            <p class="detail-row"><strong>Phone:</strong> ' . ($booking['passenger_phone'] ?? 'N/A') . '</p>
            <p class="detail-row"><strong>Email:</strong> ' . ($booking['passenger_email'] ?? 'N/A') . '</p>
        </div>
        
        <div class="trip-details">
            <div class="section-title">Trip Details</div>
            <p class="detail-row"><strong>Trip Type:</strong> ' . ucfirst($booking['trip_type'] ?? 'N/A') . 
            (isset($booking['trip_mode']) ? ' (' . ucfirst($booking['trip_mode']) . ')' : '') . '</p>
            <p class="detail-row"><strong>Pickup:</strong> ' . ($booking['pickup_location'] ?? 'N/A') . '</p>
            ' . (isset($booking['drop_location']) && !empty($booking['drop_location']) ? '<p class="detail-row"><strong>Drop:</strong> ' . $booking['drop_location'] . '</p>' : '') . '
            <p class="detail-row"><strong>Date:</strong> ' . $pickupDateStr . '</p>
            <p class="detail-row"><strong>Vehicle:</strong> ' . ($booking['cab_type'] ?? 'N/A') . '</p>
        </div>
        
        <div class="fare-details">
            <div class="section-title">Fare Details</div>
            <p class="detail-row"><strong>Base Amount:</strong> ₹' . number_format($baseAmountBeforeTax, 2) . '</p>';
            
        if ($gstEnabled) {
            if ($isIGST) {
                echo '<p class="detail-row"><strong>IGST (12%):</strong> ₹' . number_format($igstAmount, 2) . '</p>';
            } else {
                echo '<p class="detail-row"><strong>CGST (6%):</strong> ₹' . number_format($cgstAmount, 2) . '</p>';
                echo '<p class="detail-row"><strong>SGST (6%):</strong> ₹' . number_format($sgstAmount, 2) . '</p>';
            }
        }
        
        echo '
            <p class="total-amount">Total Amount: ₹' . number_format($totalAmount, 2) . '</p>
        </div>
        
        <div class="footer">
            <p>Thank you for choosing Vizag Cab Services!</p>
            <p>Contact: +91 9876543210 | Email: info@vizagcabs.com</p>
            <p>Generated on: ' . date('d M Y H:i:s') . '</p>
        </div>
    </div>
</body>
</html>';
        exit;
    }

} catch (Exception $e) {
    logInvoiceError("Critical error in download-invoice.php", ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
    
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
