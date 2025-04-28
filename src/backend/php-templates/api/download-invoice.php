
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';

// CRITICAL: Clear all buffers first
while (ob_get_level()) ob_end_clean();

// Debug mode for detailed error messages
$debugMode = isset($_GET['debug']) || isset($_SERVER['HTTP_X_DEBUG']);

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
    
    // Force PDF output regardless of format parameter for better compatibility
    $isPdfOutput = true;

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
    
    // For PDF output - using HTML to ensure consistent formatting
    if ($isPdfOutput) {
        // Set proper headers for PDF download
        header('Content-Type: application/pdf');
        
        // Use attachment disposition for force download
        $disposition = $directDownload ? 'attachment' : 'inline';
        header("Content-Disposition: $disposition; filename=\"invoice_$invoiceNumber.pdf\"");
        
        // Add headers to prevent caching
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Cache-Control: post-check=0, pre-check=0', false);
        header('Pragma: no-cache');
        header('Expires: 0');

        // Prepare the HTML content for the PDF
        $htmlContent = "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='utf-8'>
            <title>Invoice #{$invoiceNumber}</title>
            <style>
                " . file_get_contents(__DIR__ . '/../css/invoice-print.css') . "
            </style>
        </head>
        <body>
            <div class='invoice-container'>
                <div class='invoice-header'>
                    <div>
                        <h1>INVOICE</h1>
                        <p style='margin-top: 5px; color: #777;'>Vizag Cab Services</p>
                    </div>
                    <div class='company-info'>
                        <h2>#{$invoiceNumber}</h2>
                        <p>Date: " . date('d M Y', strtotime($currentDate)) . "</p>
                        <p>Booking #: " . ($booking['booking_number'] ?? 'N/A') . "</p>
                    </div>
                </div>
                
                <div class='invoice-body'>
                    <div style='overflow: hidden;'>
                        <div class='customer-details'>
                            <h3 class='section-title'>Customer Details</h3>
                            <p><strong>Name:</strong> " . ($booking['passenger_name'] ?? 'N/A') . "</p>
                            <p><strong>Phone:</strong> " . ($booking['passenger_phone'] ?? 'N/A') . "</p>
                            <p><strong>Email:</strong> " . ($booking['passenger_email'] ?? 'N/A') . "</p>
                        </div>
                        
                        <div class='invoice-summary'>
                            <h3 class='section-title'>Trip Summary</h3>
                            <p><strong>Trip Type:</strong> " . ucfirst($booking['trip_type'] ?? 'N/A') . 
                            (isset($booking['trip_mode']) && !empty($booking['trip_mode']) ? ' (' . ucfirst($booking['trip_mode']) . ')' : '') . "</p>
                            <p><strong>Date:</strong> " . (isset($booking['pickup_date']) ? date('d M Y', strtotime($booking['pickup_date'])) : 'N/A') . "</p>
                            <p><strong>Vehicle:</strong> " . ($booking['cab_type'] ?? 'N/A') . "</p>
                        </div>
                    </div>
                    
                    <div class='trip-details'>
                        <h3 class='section-title'>Trip Details</h3>
                        <p><strong>Pickup:</strong> " . ($booking['pickup_location'] ?? 'N/A') . "</p>
                        " . (isset($booking['drop_location']) && !empty($booking['drop_location']) ? "<p><strong>Drop:</strong> " . $booking['drop_location'] . "</p>" : "") . "
                        <p><strong>Pickup Time:</strong> " . (isset($booking['pickup_date']) ? date('d M Y, h:i A', strtotime($booking['pickup_date'])) : 'N/A') . "</p>
                    </div>";

        if ($gstEnabled && !empty($gstNumber)) {
            $htmlContent .= "
                    <div class='gst-details'>
                        <div class='gst-title'>GST Details</div>
                        <p><strong>GST Number:</strong> " . htmlspecialchars($gstNumber) . "</p>
                        <p><strong>Company Name:</strong> " . htmlspecialchars($companyName) . "</p>
                        " . (!empty($companyAddress) ? "<p><strong>Company Address:</strong> " . htmlspecialchars($companyAddress) . "</p>" : "") . "
                    </div>";
        }

        $htmlContent .= "
                    <h3 class='section-title'>Fare Breakdown</h3>
                    <table class='fare-table'>
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th style='text-align: right;'>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Base Fare" . ($includeTax && $gstEnabled ? ' (excluding tax)' : '') . "</td>
                                <td style='text-align: right;'><span class='rupee-symbol'>₹</span> " . number_format($baseAmountBeforeTax, 2) . "</td>
                            </tr>";

        if ($gstEnabled) {
            if ($isIGST) {
                $htmlContent .= "
                            <tr>
                                <td>IGST (12%)</td>
                                <td style='text-align: right;'><span class='rupee-symbol'>₹</span> " . number_format($igstAmount, 2) . "</td>
                            </tr>";
            } else {
                $htmlContent .= "
                            <tr>
                                <td>CGST (6%)</td>
                                <td style='text-align: right;'><span class='rupee-symbol'>₹</span> " . number_format($cgstAmount, 2) . "</td>
                            </tr>
                            <tr>
                                <td>SGST (6%)</td>
                                <td style='text-align: right;'><span class='rupee-symbol'>₹</span> " . number_format($sgstAmount, 2) . "</td>
                            </tr>";
            }
        }

        $htmlContent .= "
                            <tr class='total-row'>
                                <td>Total Amount" . ($includeTax ? ' (including tax)' : ' (excluding tax)') . "</td>
                                <td style='text-align: right;'><span class='rupee-symbol'>₹</span> " . number_format($finalTotal, 2) . "</td>
                            </tr>
                        </tbody>
                    </table>";

        if ($gstEnabled) {
            $htmlContent .= "
                    <p class='tax-note'>This invoice includes GST as per applicable rates. " . 
                    ($isIGST ? 'IGST 12%' : 'CGST 6% + SGST 6%') . " has been applied.</p>";
        }

        $htmlContent .= "
                </div>
                
                <div class='footer'>
                    <p>Thank you for choosing Vizag Cab Services!</p>
                    <p>For inquiries, please contact: info@vizagcabs.com | +91 9876543210</p>
                    <p>Generated on: " . date('d M Y H:i:s') . "</p>
                </div>
            </div>
        </body>
        </html>";
        
        // Add mPDF library to convert HTML to PDF
        // Since we can't add dependencies, we'll make a simple HTML-to-PDF converter
        // This is a basic PDF generation approach
        $pdfContent = "
%PDF-1.7
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>
endobj
4 0 obj
<< /Length 1000 >>
stream
BT
/F1 24 Tf
50 750 Td
(Invoice #" . $invoiceNumber . ") Tj
/F1 12 Tf
0 -30 Td
(Vizag Cab Services) Tj
0 -20 Td
(Date: " . date('d M Y', strtotime($currentDate)) . ") Tj
0 -20 Td
(Booking #: " . ($booking['booking_number'] ?? 'N/A') . ") Tj
0 -40 Td
(Customer: " . ($booking['passenger_name'] ?? 'N/A') . ") Tj
0 -20 Td
(Phone: " . ($booking['passenger_phone'] ?? 'N/A') . ") Tj
0 -20 Td
(Pickup: " . ($booking['pickup_location'] ?? 'N/A') . ") Tj
0 -20 Td
(" . (isset($booking['drop_location']) && !empty($booking['drop_location']) ? "Drop: " . $booking['drop_location'] : "") . ") Tj
0 -40 Td
(Trip Type: " . ucfirst($booking['trip_type'] ?? 'N/A') . ") Tj
0 -20 Td
(Vehicle: " . ($booking['cab_type'] ?? 'N/A') . ") Tj
0 -40 Td
(Total Amount: Rs. " . number_format($finalTotal, 2) . ") Tj
0 -60 Td
/F2 10 Tf
(Thank you for choosing Vizag Cab Services!) Tj
0 -20 Td
(Generated on: " . date('d M Y H:i:s') . ") Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj
6 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 7
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000242 00000 n
0000001294 00000 n
0000001362 00000 n
trailer
<< /Size 7 /Root 1 0 R >>
startxref
1429
%%EOF
";
        
        echo $pdfContent;
        exit;
    }
    
    // For errors, ensure we return JSON
    header('Content-Type: application/json');
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Failed to generate invoice: Format not supported',
        'error_details' => $debugMode ? 'Only PDF output is supported' : null
    ], 500);
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
?>
