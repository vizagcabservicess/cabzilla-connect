
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
    http_response_code($statusCode);
    header('Content-Type: application/json');
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
        'companyName' => $_GET['companyName'] ?? ''
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
    $format = isset($_GET['format']) ? $_GET['format'] : 'html';

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
    } else {
        // Check if all required columns exist
        $missingColumns = [];
        $requiredColumns = ['tax_amount', 'is_igst', 'include_tax'];
        
        foreach ($requiredColumns as $column) {
            $checkColumnResult = $conn->query("SHOW COLUMNS FROM invoices LIKE '$column'");
            if ($checkColumnResult->num_rows === 0) {
                $missingColumns[] = $column;
            }
        }
        
        if (!empty($missingColumns)) {
            logInvoiceError("Missing columns in invoices table", ['missing' => $missingColumns]);
            
            // Add missing columns
            foreach ($missingColumns as $column) {
                $alterQuery = "";
                
                switch ($column) {
                    case 'tax_amount':
                        $alterQuery = "ALTER TABLE invoices ADD COLUMN tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER base_amount";
                        break;
                    case 'is_igst':
                        $alterQuery = "ALTER TABLE invoices ADD COLUMN is_igst TINYINT(1) DEFAULT 0 AFTER gst_enabled";
                        break;
                    case 'include_tax':
                        $alterQuery = "ALTER TABLE invoices ADD COLUMN include_tax TINYINT(1) DEFAULT 1 AFTER is_igst";
                        break;
                }
                
                if (!empty($alterQuery)) {
                    $conn->query($alterQuery);
                    if (!$conn->error) {
                        logInvoiceError("Successfully added column $column");
                    } else {
                        logInvoiceError("Error adding column $column", ['error' => $conn->error]);
                    }
                }
            }
        }
    }
    
    // Forward request to admin endpoint with all query parameters plus a pdf format flag
    $adminUrl = 'http://' . $_SERVER['HTTP_HOST'] . '/api/admin/download-invoice.php';
    $_GET['format'] = 'pdf'; // Force PDF output format
    $queryParams = http_build_query($_GET);
    
    $ch = curl_init($adminUrl . '?' . $queryParams);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
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
    
    // Extract content type from headers
    $contentType = null;
    if (preg_match('/Content-Type: ([^\r\n]+)/i', $headers, $matches)) {
        $contentType = $matches[1];
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
    
    // Set appropriate content type (default to PDF if not found)
    if ($contentType) {
        header("Content-Type: $contentType");
    } else {
        header("Content-Type: text/html");
    }
    
    // Pass through Content-Disposition for download
    if (preg_match('/Content-Disposition: ([^\r\n]+)/i', $headers, $matches)) {
        header("Content-Disposition: {$matches[1]}");
    } else {
        $invoiceNumber = "invoice_{$bookingId}";
        header("Content-Disposition: attachment; filename=\"$invoiceNumber.pdf\"");
    }
    
    // Output the response body
    echo $body;
    
    logInvoiceError("Public invoice download completed successfully", ['booking_id' => $bookingId]);
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
