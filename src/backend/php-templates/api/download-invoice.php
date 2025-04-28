
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

    logInvoiceError("Public invoice download starting", [
        'booking_id' => $bookingId, 
        'gstEnabled' => $gstEnabled ? 'true' : 'false',
        'gstNumber' => $gstNumber,
        'companyName' => $companyName
    ]);

    // Connect to database with improved error handling
    try {
        $dbHost = 'localhost';
        $dbName = 'u644605165_db_be';
        $dbUser = 'u644605165_usr_be';
        $dbPass = 'Vizag@1213';
        
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        
        if ($conn->connect_error) {
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
        
        // Set character set
        $conn->set_charset("utf8mb4");
        
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
    
    // Create invoices table if it doesn't exist with CORRECT STRUCTURE
    if (!$tableExists) {
        logInvoiceError("Creating invoices table in public download-invoice");
        
        $createTableQuery = "
            CREATE TABLE IF NOT EXISTS invoices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                booking_id INT NOT NULL,
                invoice_number VARCHAR(50) NOT NULL,
                invoice_date DATE NOT NULL,
                base_amount DECIMAL(10,2) NOT NULL,
                tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
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
        
        $result = $conn->query($createTableQuery);
        
        if (!$result) {
            logInvoiceError("Error creating invoices table in public download", ['error' => $conn->error]);
            // We'll continue even if table creation fails as the admin endpoint may handle it
        } else {
            logInvoiceError("Successfully created invoices table in public endpoint");
        }
    }
    
    // Verify table structure to ensure it has all required columns
    $missingColumns = [];
    $requiredColumns = [
        'id', 'booking_id', 'invoice_number', 'invoice_date', 'base_amount',
        'tax_amount', 'total_amount', 'gst_enabled', 'is_igst', 'include_tax',
        'gst_number', 'company_name', 'company_address', 'invoice_html',
        'created_at', 'updated_at'
    ];
    
    // Check for required columns
    if ($tableExists) {
        $columnsResult = $conn->query("SHOW COLUMNS FROM invoices");
        if ($columnsResult) {
            $existingColumns = [];
            while ($col = $columnsResult->fetch_assoc()) {
                $existingColumns[] = $col['Field'];
            }
            
            foreach ($requiredColumns as $col) {
                if (!in_array($col, $existingColumns)) {
                    $missingColumns[] = $col;
                }
            }
        }
    }
    
    // If any columns are missing, alter table to add them
    if (!empty($missingColumns)) {
        logInvoiceError("Missing columns in invoices table", ['missing' => $missingColumns]);
        
        // Add missing columns
        foreach ($missingColumns as $col) {
            $alterQuery = "";
            switch ($col) {
                case 'tax_amount':
                    $alterQuery = "ALTER TABLE invoices ADD COLUMN tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER base_amount";
                    break;
                case 'is_igst':
                    $alterQuery = "ALTER TABLE invoices ADD COLUMN is_igst TINYINT(1) DEFAULT 0 AFTER gst_enabled";
                    break;
                case 'include_tax':
                    $alterQuery = "ALTER TABLE invoices ADD COLUMN include_tax TINYINT(1) DEFAULT 1 AFTER is_igst";
                    break;
                case 'invoice_html':
                    $alterQuery = "ALTER TABLE invoices ADD COLUMN invoice_html MEDIUMTEXT AFTER company_address";
                    break;
                // Add other column definitions as needed
            }
            
            if ($alterQuery) {
                $alterResult = $conn->query($alterQuery);
                if (!$alterResult) {
                    logInvoiceError("Failed to add column $col", ['error' => $conn->error]);
                } else {
                    logInvoiceError("Successfully added column $col");
                }
            }
        }
    }
    
    // Forward request to admin endpoint with all query parameters
    $adminUrl = 'http://' . $_SERVER['HTTP_HOST'] . '/api/admin/download-invoice.php';
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
    
    // Set appropriate content type (default to HTML if not found)
    if ($contentType) {
        header("Content-Type: $contentType");
    } else {
        header("Content-Type: text/html; charset=utf-8");
    }
    
    // Pass through Content-Disposition for download
    if (preg_match('/Content-Disposition: ([^\r\n]+)/i', $headers, $matches)) {
        header("Content-Disposition: {$matches[1]}");
    } else {
        header("Content-Disposition: inline; filename=\"invoice_{$bookingId}.html\"");
    }
    
    // Check if the response is an error message (likely JSON)
    $isJson = (strpos($body, '{') === 0 && strpos($body, '}') > 0);
    $isHtml = (strpos($body, '<!DOCTYPE html>') !== false || strpos($body, '<html') !== false);
    
    // If we got JSON when expecting HTML, generate a simple error page
    if ($isJson && !$isHtml) {
        $jsonData = json_decode($body, true);
        if (json_last_error() === JSON_ERROR_NONE && isset($jsonData['status']) && $jsonData['status'] === 'error') {
            // CRITICAL: Reset Content-Type for HTML error page
            header('Content-Type: text/html; charset=utf-8');
            $errorMessage = isset($jsonData['message']) ? htmlspecialchars($jsonData['message']) : "Unknown error";
            
            // Display a user-friendly error page
            echo '<!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Invoice Generation Error</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; line-height: 1.6; }
                    .error-container { max-width: 800px; margin: 50px auto; padding: 30px; border: 1px solid #f5c6cb; border-radius: 4px; background-color: #f8d7da; color: #721c24; }
                    h1 { margin-top: 0; color: #721c24; }
                    .back-link { margin-top: 20px; }
                    .back-link a { color: #0056b3; text-decoration: none; }
                    .back-link a:hover { text-decoration: underline; }
                </style>
            </head>
            <body>
                <div class="error-container">
                    <h1>Invoice Generation Error</h1>
                    <p>Sorry, we couldn\'t generate your invoice due to the following error:</p>
                    <p><strong>' . $errorMessage . '</strong></p>
                    <p>Please try again later or contact customer support for assistance.</p>
                    <div class="back-link">
                        <a href="javascript:history.back()">← Go Back</a>
                    </div>
                </div>
            </body>
            </html>';
            
            exit;
        }
    }
    
    // Output the response body (either HTML or JSON error)
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
