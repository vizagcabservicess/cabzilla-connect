
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
    
    // Create a simple PDF directly - don't go through admin endpoints
    if ($format === 'pdf') {
        // CRITICAL: Set correct PDF content type headers
        header("Content-Type: application/pdf");
        
        // Strong content disposition for forcing download
        $invoiceNumber = isset($_GET['invoiceNumber']) && !empty($_GET['invoiceNumber']) 
            ? $_GET['invoiceNumber'] 
            : "invoice_{$bookingId}";
            
        // Use attachment disposition for direct downloads, inline otherwise
        $disposition = $directDownload ? "attachment" : "inline";
        header("Content-Disposition: {$disposition}; filename=\"{$invoiceNumber}.pdf\"");
        
        // Set additional headers to prevent caching
        header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
        header("Pragma: no-cache");
        header("Expires: 0");
        
        // Force browser to treat as PDF
        header("X-Content-Type-Options: nosniff");
        
        // Create a simple valid PDF structure
        $pdfContent = "%PDF-1.7\n";
        $pdfContent .= "1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n";
        $pdfContent .= "2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n";
        $pdfContent .= "3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R>>\nendobj\n";
        $pdfContent .= "4 0 obj\n<</Length " . strlen("Invoice #$invoiceNumber") . ">>\nstream\nBT /F1 24 Tf 100 700 Td (Invoice #$invoiceNumber) Tj ET\nendstream\nendobj\n";
        $pdfContent .= "trailer\n<</Size 5 /Root 1 0 R>>\nstartxref\n0\n%%EOF";

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
