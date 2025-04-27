
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// Clear all output buffers first to ensure clean output
while (ob_get_level()) ob_end_clean();

// Debug mode
$debugMode = isset($_GET['debug']) || isset($_SERVER['HTTP_X_DEBUG']);

// DO NOT set content-type headers here - they'll be set based on output format

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
    
    logInvoiceError("Processing invoice download for booking ID: $bookingId", $_GET);

    // Get GST parameters from GET
    $gstEnabled = isset($_GET['gstEnabled']) ? filter_var($_GET['gstEnabled'], FILTER_VALIDATE_BOOLEAN) : false;
    $gstNumber = isset($_GET['gstNumber']) ? $_GET['gstNumber'] : '';
    $companyName = isset($_GET['companyName']) ? $_GET['companyName'] : '';
    $companyAddress = isset($_GET['companyAddress']) ? $_GET['companyAddress'] : '';
    $isIGST = isset($_GET['isIGST']) ? filter_var($_GET['isIGST'], FILTER_VALIDATE_BOOLEAN) : false;
    $includeTax = isset($_GET['includeTax']) ? filter_var($_GET['includeTax'], FILTER_VALIDATE_BOOLEAN) : true;
    $customInvoiceNumber = isset($_GET['invoiceNumber']) ? $_GET['invoiceNumber'] : '';
    $format = isset($_GET['format']) ? $_GET['format'] : 'html';

    // Include db_helper.php if available
    if (file_exists(__DIR__ . '/../common/db_helper.php')) {
        require_once __DIR__ . '/../common/db_helper.php';
        try {
            $conn = getDbConnectionWithRetry();
            logInvoiceError("Database connection established using db_helper");
        } catch (Exception $e) {
            logInvoiceError("Error connecting via db_helper", ['error' => $e->getMessage()]);
            throw new Exception("Database connection failed: " . $e->getMessage());
        }
    } else {
        // Connect to database with direct connection
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
            
            logInvoiceError("Database connection established successfully (direct)");
        } catch (Exception $e) {
            logInvoiceError("Database connection error", ['error' => $e->getMessage()]);
            throw new Exception("Database connection failed: " . $e->getMessage());
        }
    }
    
    // First check if invoices table exists
    $tableExists = false;
    $checkTableResult = $conn->query("SHOW TABLES LIKE 'invoices'");
    
    if ($checkTableResult) {
        $tableExists = $checkTableResult->num_rows > 0;
    }
    
    // Create invoices table if it doesn't exist
    if (!$tableExists) {
        logInvoiceError("Creating invoices table as it doesn't exist");
        
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
                UNIQUE KEY (invoice_number),
                KEY (booking_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
        
        $conn->query($createTableQuery);
        
        if ($conn->error) {
            logInvoiceError("Error creating invoices table", ['error' => $conn->error]);
        }
    }
    
    // Check if invoice exists for this booking or if parameters have changed
    // Use the latest invoice by ID (DESC)
    $invoiceStmt = $conn->prepare("SELECT * FROM invoices WHERE booking_id = ? ORDER BY id DESC LIMIT 1");
    $invoiceExists = false;
    $invoiceData = null;
    $invoiceHtml = null;
    
    if ($invoiceStmt) {
        $invoiceStmt->bind_param("i", $bookingId);
        $invoiceStmt->execute();
        $invoiceResult = $invoiceStmt->get_result();
        
        if ($invoiceResult && $invoiceResult->num_rows > 0) {
            $invoiceExists = true;
            $invoiceData = $invoiceResult->fetch_assoc();
            
            // Check if parameters match
            $parametersChanged = 
                $gstEnabled != filter_var($invoiceData['gst_enabled'], FILTER_VALIDATE_BOOLEAN) ||
                $isIGST != filter_var($invoiceData['is_igst'], FILTER_VALIDATE_BOOLEAN) ||
                $includeTax != filter_var($invoiceData['include_tax'], FILTER_VALIDATE_BOOLEAN) ||
                ($customInvoiceNumber && $customInvoiceNumber !== $invoiceData['invoice_number']);
                
            if (!$parametersChanged) {
                // Use existing invoice HTML
                $invoiceHtml = $invoiceData['invoice_html'];
                logInvoiceError("Using existing invoice", ['invoice_id' => $invoiceData['id']]);
            } else {
                logInvoiceError("Parameters changed, regenerating invoice");
                $invoiceExists = false; // Force regeneration
            }
        }
    }
    
    // If no matching invoice exists or parameters changed, generate a new one
    if (!$invoiceExists || !$invoiceHtml) {
        logInvoiceError("Generating new invoice for download");
        
        // Get booking details
        $bookingStmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
        if (!$bookingStmt) {
            throw new Exception("Failed to prepare booking statement: " . $conn->error);
        }
        
        $bookingStmt->bind_param("i", $bookingId);
        $bookingStmt->execute();
        $bookingResult = $bookingStmt->get_result();
        
        if ($bookingResult->num_rows === 0) {
            logInvoiceError("Booking not found", ['booking_id' => $bookingId]);
            sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
        }
        
        $booking = $bookingResult->fetch_assoc();
        
        // Call generate-invoice.php via internal mechanism to get invoice HTML
        $apiUrl = getApiUrl('admin/generate-invoice.php');
        $queryParams = http_build_query([
            'id' => $bookingId,
            'gstEnabled' => $gstEnabled ? '1' : '0',
            'isIGST' => $isIGST ? '1' : '0',
            'includeTax' => $includeTax ? '1' : '0',
            'invoiceNumber' => $customInvoiceNumber,
            'gstNumber' => $gstNumber,
            'companyName' => $companyName,
            'companyAddress' => $companyAddress,
            'format' => 'json'
        ]);
        
        // Create the URL with proper base
        $serverName = $_SERVER['SERVER_NAME'];
        $isSecure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || $_SERVER['SERVER_PORT'] == 443;
        $port = $_SERVER['SERVER_PORT'];
        $portStr = ($isSecure && $port == 443) || (!$isSecure && $port == 80) ? '' : ":$port";
        $protocol = $isSecure ? 'https' : 'http';
        $baseUrl = "$protocol://$serverName$portStr";
        
        // Form the full URL for the API call
        $fullApiUrl = "$baseUrl/api/admin/generate-invoice.php?$queryParams";
        logInvoiceError("Calling generate-invoice API", ['url' => $fullApiUrl]);
        
        // Make the API call using curl
        $ch = curl_init($fullApiUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
        
        $response = curl_exec($ch);
        $curlError = curl_error($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($curlError) {
            logInvoiceError("Curl error when calling generate-invoice", [
                'error' => $curlError, 
                'http_code' => $httpCode
            ]);
            throw new Exception("Failed to generate invoice: $curlError");
        }
        
        if ($httpCode != 200) {
            logInvoiceError("HTTP error when calling generate-invoice", [
                'http_code' => $httpCode,
                'response' => substr($response, 0, 500)
            ]);
            throw new Exception("Generate invoice API returned code $httpCode");
        }
        
        $result = json_decode($response, true);
        
        if (!$result || !isset($result['data']['invoiceHtml'])) {
            logInvoiceError("Invalid response from generate-invoice", [
                'response' => substr($response, 0, 500)
            ]);
            throw new Exception("Invalid invoice data received");
        }
        
        $invoiceHtml = $result['data']['invoiceHtml'];
    }
    
    // Output invoice based on requested format
    if ($format === 'pdf') {
        // Set PDF Content-Type and Content-Disposition headers
        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="invoice_' . 
            (isset($invoiceData['invoice_number']) ? $invoiceData['invoice_number'] : 'invoice') . '.pdf"');
        
        // Generate pdf-friendly HTML that will use browser's PDF capabilities
        echo '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice PDF</title>
    <style>
        /* PDF-specific styles */
        @page {
            margin: 10mm;
        }
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #333;
        }
        /* Remove JavaScript from the invoice HTML */
    </style>
</head>
<body>
    ' . $invoiceHtml . '
</body>
</html>';
    } else {
        // For HTML output
        header('Content-Type: text/html; charset=UTF-8');
        echo $invoiceHtml;
    }

} catch (Exception $e) {
    logInvoiceError("Error in download-invoice.php", ['error' => $e->getMessage()]);
    
    // For PDF format, return a simple error page
    if (isset($_GET['format']) && $_GET['format'] === 'pdf') {
        header('Content-Type: text/html');
        echo '<!DOCTYPE html>
        <html>
        <head>
            <title>Error</title>
        </head>
        <body>
            <h1>Error Generating PDF</h1>
            <p>' . htmlspecialchars($e->getMessage()) . '</p>
        </body>
        </html>';
    } else {
        // For other formats, return JSON error
        sendJsonResponse([
            'status' => 'error',
            'message' => 'Failed to generate invoice: ' . $e->getMessage(),
            'error_details' => $debugMode ? $e->getMessage() : null
        ], 500);
    }
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
