
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
    
    // First check if invoices table exists
    $tableExists = false;
    $checkTableResult = $conn->query("SHOW TABLES LIKE 'invoices'");
    
    if ($checkTableResult) {
        $tableExists = $checkTableResult->num_rows > 0;
    }
    
    // Create invoices table if it doesn't exist
    if (!$tableExists) {
        logInvoiceError("Creating invoices table in public download-invoice");
        
        $createTableQuery = "
            CREATE TABLE IF NOT EXISTS invoices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                booking_id INT NOT NULL,
                invoice_number VARCHAR(50) NOT NULL,
                invoice_date DATE NOT NULL,
                base_amount DECIMAL(10,2) NOT NULL,
                tax_amount DECIMAL(10,2) NOT NULL,
                total_amount DECIMAL(10,2) NOT NULL,
                gst_enabled TINYINT(1) DEFAULT 0,
                is_igst TINYINT(1) DEFAULT 0,
                include_tax TINYINT(1) DEFAULT 1,
                gst_number VARCHAR(20),
                company_name VARCHAR(100),
                company_address TEXT,
                invoice_html MEDIUMTEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY (invoice_number),
                KEY (booking_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
        
        $conn->query($createTableQuery);
        
        if ($conn->error) {
            logInvoiceError("Error creating invoices table in public download", ['error' => $conn->error]);
        }
    }
    
    // Forward request to admin endpoint with all query parameters plus a pdf format flag
    $adminUrl = 'http://' . $_SERVER['HTTP_HOST'] . '/api/admin/download-invoice.php';
    $_GET['format'] = 'pdf'; // Force PDF output format
    $queryParams = http_build_query($_GET);
    
    // Add a special PDF generation flag and random cache buster 
    $queryParams .= '&pdf_direct=1&nocache=' . rand(10000, 99999);
    
    // Set up curl with explicit Accept header for PDF content
    $ch = curl_init($adminUrl . '?' . $queryParams);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true); 
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Accept: application/pdf',
        'X-Requested-With: XMLHttpRequest'
    ]);
    
    // Execute the request
    $response = curl_exec($ch);
    $curlError = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    
    // Split headers and body
    $headers = substr($response, 0, $headerSize);
    $body = substr($response, $headerSize);
    
    curl_close($ch);
    
    if ($curlError) {
        logInvoiceError("Error forwarding to admin download-invoice.php", [
            'curl_error' => $curlError,
            'http_code' => $httpCode
        ]);
        throw new Exception("Failed to generate invoice: $curlError");
    }

    logInvoiceError("Response received from admin endpoint", [
        'http_code' => $httpCode,
        'header_size' => $headerSize,
        'body_length' => strlen($body),
        'headers_substr' => substr($headers, 0, 200)
    ]);
    
    // Extract content type from headers
    $contentType = null;
    if (preg_match('/Content-Type: ([^\r\n]+)/i', $headers, $matches)) {
        $contentType = $matches[1];
        logInvoiceError("Content-Type from response", ['content_type' => $contentType]);
    }
    
    // Check for HTML or error response
    if (stripos($contentType, 'application/json') !== false || stripos($body, '{"status":"error"') !== false) {
        // JSON error response - pass through
        header("Content-Type: application/json");
        echo $body;
        exit;
    } else if (stripos($body, 'Fatal error') !== false || stripos($body, 'Warning') !== false || stripos($body, 'Notice') !== false) {
        // PHP error output - return as error
        logInvoiceError("PHP error in admin download-invoice.php response", ['body' => substr($body, 0, 500)]);
        throw new Exception("Server error generating invoice: " . strip_tags($body));
    }
    
    // Check if the PDF seems valid - at least check for PDF signature
    $isPdfValid = (stripos($body, '%PDF-') === 0);
    
    if (!$isPdfValid) {
        logInvoiceError("Invalid PDF data received", [
            'first_bytes' => bin2hex(substr($body, 0, 20)),
            'length' => strlen($body)
        ]);
        
        // If we got HTML instead of PDF, check if it contains the printing JavaScript
        if (stripos($body, '<!DOCTYPE html>') !== false && stripos($body, '<html') !== false) {
            // We can serve the HTML directly for printing instead since it has auto-print functionality
            header("Content-Type: text/html; charset=utf-8");
            echo $body;
            exit;
        } else {
            throw new Exception("Invalid PDF data received from server");
        }
    }
    
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
    
    // Force content length to ensure complete download
    header("Content-Length: " . strlen($body));
    
    // Output the PDF data
    echo $body;
    
    logInvoiceError("Public invoice download completed successfully", [
        'booking_id' => $bookingId,
        'content_type_sent' => 'application/pdf',
        'body_size' => strlen($body),
        'is_pdf_valid' => $isPdfValid ? 'true' : 'false'
    ]);
    exit;

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
