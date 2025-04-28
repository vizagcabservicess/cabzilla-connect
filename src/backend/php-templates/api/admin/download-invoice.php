
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

    // For PDF output - create a more detailed PDF
    if ($isPdfOutput) {
        // Set the Content-Type header to application/pdf
        header('Content-Type: application/pdf');
        
        // Use attachment disposition for force download, or inline for viewing
        $disposition = $directDownload ? 'attachment' : 'inline';
        header('Content-Disposition: ' . $disposition . '; filename="invoice_' . $invoiceNumber . '.pdf"');
        
        // Add headers to prevent caching
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');
        header('Expires: 0');
        header('X-Content-Type-Options: nosniff');

        // Create a more detailed PDF file
        $pdfContent = "%PDF-1.7\n";
        
        // PDF Objects
        $pdfContent .= "1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n";
        $pdfContent .= "2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n";
        $pdfContent .= "3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>> >> >>\nendobj\n";
        
        // Font
        $pdfContent .= "5 0 obj\n<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>\nendobj\n";
        
        // Content
        $content = "BT /F1 24 Tf 200 700 Td (Invoice #{$invoiceNumber}) Tj ET\n";
        
        // Invoice header
        $content .= "BT /F1 14 Tf 450 680 Td (Date: " . date('d M Y') . ") Tj ET\n";
        $content .= "BT /F1 12 Tf 100 680 Td (Vizag Cab Services) Tj ET\n";
        $content .= "BT /F1 12 Tf 100 660 Td (Booking #: " . ($booking['booking_number'] ?? 'N/A') . ") Tj ET\n";
        
        // Draw a line
        $content .= "0.5 w 100 640 m 500 640 l S\n";
        
        // Customer details
        $content .= "BT /F1 16 Tf 100 620 Td (Customer Details) Tj ET\n";
        $content .= "BT /F1 12 Tf 100 600 Td (Name: " . ($booking['passenger_name'] ?? 'N/A') . ") Tj ET\n";
        $content .= "BT /F1 12 Tf 100 580 Td (Phone: " . ($booking['passenger_phone'] ?? 'N/A') . ") Tj ET\n";
        $content .= "BT /F1 12 Tf 100 560 Td (Email: " . ($booking['passenger_email'] ?? 'N/A') . ") Tj ET\n";
        
        // Trip details
        $content .= "BT /F1 16 Tf 100 520 Td (Trip Details) Tj ET\n";
        $tripTypeDisplay = ucfirst($booking['trip_type'] ?? 'N/A');
        if (isset($booking['trip_mode']) && !empty($booking['trip_mode'])) {
            $tripModeDisplay = ucfirst($booking['trip_mode']);
            $tripTypeDisplay .= " (" . $tripModeDisplay . ")";
        }
        $content .= "BT /F1 12 Tf 100 500 Td (Trip Type: " . $tripTypeDisplay . ") Tj ET\n";
        $content .= "BT /F1 12 Tf 100 480 Td (Pickup: " . ($booking['pickup_location'] ?? 'N/A') . ") Tj ET\n";
        if (isset($booking['drop_location']) && !empty($booking['drop_location'])) {
            $content .= "BT /F1 12 Tf 100 460 Td (Drop: " . $booking['drop_location'] . ") Tj ET\n";
        }
        
        $pickupDate = isset($booking['pickup_date']) ? date('d M Y, h:i A', strtotime($booking['pickup_date'])) : 'N/A';
        $content .= "BT /F1 12 Tf 100 440 Td (Pickup Time: " . $pickupDate . ") Tj ET\n";
        $content .= "BT /F1 12 Tf 100 420 Td (Vehicle: " . ($booking['cab_type'] ?? 'N/A') . ") Tj ET\n";
        
        // GST details if applicable
        $yPos = 380;
        if ($gstEnabled && !empty($gstNumber)) {
            $content .= "BT /F1 14 Tf 100 {$yPos} Td (GST Details) Tj ET\n";
            $yPos -= 20;
            $content .= "BT /F1 12 Tf 100 {$yPos} Td (GST Number: " . $gstNumber . ") Tj ET\n";
            $yPos -= 20;
            $content .= "BT /F1 12 Tf 100 {$yPos} Td (Company: " . $companyName . ") Tj ET\n";
            $yPos -= 20;
            if (!empty($companyAddress)) {
                $content .= "BT /F1 12 Tf 100 {$yPos} Td (Address: " . $companyAddress . ") Tj ET\n";
                $yPos -= 20;
            }
            $yPos -= 10; // Extra space before fare details
        }
        
        // Fare breakdown
        $content .= "BT /F1 16 Tf 100 {$yPos} Td (Fare Breakdown) Tj ET\n";
        $yPos -= 20;
        
        $taxText = $includeTax && $gstEnabled ? ' (excluding tax)' : '';
        $content .= "BT /F1 12 Tf 100 {$yPos} Td (Base Fare{$taxText}: ₹" . number_format($baseAmountBeforeTax, 2) . ") Tj ET\n";
        $yPos -= 20;
        
        if ($gstEnabled) {
            if ($isIGST) {
                $content .= "BT /F1 12 Tf 100 {$yPos} Td (IGST (12%): ₹" . number_format($igstAmount, 2) . ") Tj ET\n";
                $yPos -= 20;
            } else {
                $content .= "BT /F1 12 Tf 100 {$yPos} Td (CGST (6%): ₹" . number_format($cgstAmount, 2) . ") Tj ET\n";
                $yPos -= 20;
                $content .= "BT /F1 12 Tf 100 {$yPos} Td (SGST (6%): ₹" . number_format($sgstAmount, 2) . ") Tj ET\n";
                $yPos -= 20;
            }
        }
        
        // Draw a line before total
        $content .= "0.5 w 100 " . ($yPos - 5) . " m 300 " . ($yPos - 5) . " l S\n";
        $yPos -= 20;
        
        $totalText = $includeTax ? ' (including tax)' : ' (excluding tax)';
        $content .= "BT /F1 14 Tf 100 {$yPos} Td (Total Amount{$totalText}: ₹" . number_format($totalAmount, 2) . ") Tj ET\n";
        
        // Footer
        $content .= "BT /F1 10 Tf 100 100 Td (Thank you for choosing Vizag Cab Services!) Tj ET\n";
        $content .= "BT /F1 10 Tf 100 80 Td (For inquiries, please contact: info@vizagcabs.com | +91 9876543210) Tj ET\n";
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

        // Output the PDF data
        echo $pdfContent;
        
        logInvoiceError("Invoice PDF sent successfully", ['invoice_number' => $invoiceNumber]);
        exit; 
    } else {
        // For HTML output
        header('Content-Type: text/html; charset=utf-8');
        echo '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice #' . $invoiceNumber . '</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; line-height: 1.6; }
        .invoice-container { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; padding: 30px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); }
        .invoice-header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
        .company-info { text-align: right; }
        .invoice-body { margin-bottom: 30px; }
        .customer-details, .invoice-summary { margin-bottom: 20px; }
        .section-title { color: #555; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 15px; }
        .trip-details { margin-bottom: 30px; }
        .fare-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .fare-table th, .fare-table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        .fare-table th { background-color: #f9f9f9; }
        .total-row { font-weight: bold; }
        .gst-details { border: 1px solid #ddd; padding: 10px; background-color: #f9f9f9; margin-bottom: 20px; }
        .gst-title { font-weight: bold; margin-bottom: 10px; }
        .footer { margin-top: 30px; text-align: center; font-size: 0.9em; color: #777; border-top: 1px solid #eee; padding-top: 20px; }
        .tax-note { font-size: 0.8em; color: #666; font-style: italic; margin-top: 5px; }
        @media print {
            body { margin: 0; padding: 0; }
            .invoice-container { box-shadow: none; border: none; padding: 20px; }
            @page { size: A4; margin: 10mm; }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="invoice-header">
            <div>
                <h1 style="margin: 0; color: #333;">INVOICE</h1>
                <p style="margin-top: 5px; color: #777;">Vizag Cab Services</p>
            </div>
            <div class="company-info">
                <h2 style="margin: 0;">#' . $invoiceNumber . '</h2>
                <p>Date: ' . date('d M Y', strtotime($currentDate)) . '</p>
                <p>Booking #: ' . ($booking['booking_number'] ?? 'N/A') . '</p>
            </div>
        </div>
        
        <div class="invoice-body">
            <div style="display: flex; justify-content: space-between;">
                <div class="customer-details" style="width: 48%;">
                    <h3 class="section-title">Customer Details</h3>
                    <p><strong>Name:</strong> ' . ($booking['passenger_name'] ?? 'N/A') . '</p>
                    <p><strong>Phone:</strong> ' . ($booking['passenger_phone'] ?? 'N/A') . '</p>
                    <p><strong>Email:</strong> ' . ($booking['passenger_email'] ?? 'N/A') . '</p>
                </div>
                
                <div class="invoice-summary" style="width: 48%;">
                    <h3 class="section-title">Trip Summary</h3>
                    <p><strong>Trip Type:</strong> ' . ucfirst($booking['trip_type'] ?? 'N/A') . 
                    (isset($booking['trip_mode']) ? ' (' . ucfirst($booking['trip_mode']) . ')' : '') . '</p>
                    <p><strong>Date:</strong> ' . (isset($booking['pickup_date']) ? date('d M Y', strtotime($booking['pickup_date'])) : 'N/A') . '</p>
                    <p><strong>Vehicle:</strong> ' . ($booking['cab_type'] ?? 'N/A') . '</p>
                </div>
            </div>
            
            <div class="trip-details">
                <h3 class="section-title">Trip Details</h3>
                <p><strong>Pickup:</strong> ' . ($booking['pickup_location'] ?? 'N/A') . '</p>
                ' . (isset($booking['drop_location']) && !empty($booking['drop_location']) ? '<p><strong>Drop:</strong> ' . $booking['drop_location'] . '</p>' : '') . '
                <p><strong>Pickup Time:</strong> ' . (isset($booking['pickup_date']) ? date('d M Y, h:i A', strtotime($booking['pickup_date'])) : 'N/A') . '</p>
            </div>';
            
        if ($gstEnabled && !empty($gstNumber)) {
            echo '
            <div class="gst-details">
                <div class="gst-title">GST Details</div>
                <p><strong>GST Number:</strong> ' . htmlspecialchars($gstNumber) . '</p>
                <p><strong>Company Name:</strong> ' . htmlspecialchars($companyName) . '</p>
                ' . (!empty($companyAddress) ? '<p><strong>Company Address:</strong> ' . htmlspecialchars($companyAddress) . '</p>' : '') . '
            </div>';
        }
            
        echo '
            <h3 class="section-title">Fare Breakdown</h3>
            <table class="fare-table">
                <tr>
                    <th>Description</th>
                    <th style="text-align: right;">Amount</th>
                </tr>
                <tr>
                    <td>Base Fare' . ($includeTax && $gstEnabled ? ' (excluding tax)' : '') . '</td>
                    <td style="text-align: right;">₹ ' . number_format($baseAmountBeforeTax, 2) . '</td>
                </tr>';
                
        if ($gstEnabled) {
            if ($isIGST) {
                echo '
                <tr>
                    <td>IGST (12%)</td>
                    <td style="text-align: right;">₹ ' . number_format($igstAmount, 2) . '</td>
                </tr>';
            } else {
                echo '
                <tr>
                    <td>CGST (6%)</td>
                    <td style="text-align: right;">₹ ' . number_format($cgstAmount, 2) . '</td>
                </tr>
                <tr>
                    <td>SGST (6%)</td>
                    <td style="text-align: right;">₹ ' . number_format($sgstAmount, 2) . '</td>
                </tr>';
            }
        }
        
        echo '
                <tr class="total-row">
                    <td>Total Amount' . ($includeTax ? ' (including tax)' : ' (excluding tax)') . '</td>
                    <td style="text-align: right;">₹ ' . number_format($totalAmount, 2) . '</td>
                </tr>
            </table>';
            
        if ($gstEnabled) {
            echo '
            <p class="tax-note">This invoice includes GST as per applicable rates. ' . 
            ($isIGST ? 'IGST 12%' : 'CGST 6% + SGST 6%') . ' has been applied.</p>';
        }
            
        echo '
        </div>
        
        <div class="footer">
            <p>Thank you for choosing Vizag Cab Services!</p>
            <p>For any inquiries, please contact: info@vizagcabs.com | +91 9876543210</p>
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
