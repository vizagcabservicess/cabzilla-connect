
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

// Helper function to get API URL
function getApiUrl($path) {
    $serverName = $_SERVER['SERVER_NAME'];
    $isSecure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || $_SERVER['SERVER_PORT'] == 443;
    $port = $_SERVER['SERVER_PORT'];
    $portStr = ($isSecure && $port == 443) || (!$isSecure && $port == 80) ? '' : ":$port";
    $protocol = $isSecure ? 'https' : 'http';
    return "$protocol://$serverName$portStr/$path";
}

try {
    // Only allow GET requests
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
        exit;
    }

    // Get booking ID from query parameters
    $bookingId = isset($_GET['id']) ? (int)$_GET['id'] : null;
    
    if (!$bookingId) {
        sendJsonResponse(['status' => 'error', 'message' => 'Missing booking ID'], 400);
        exit;
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
            
            // Fall back to direct connection
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
        }
    } else {
        // Connect to database with direct connection
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
    }
    
    // Generate invoice directly in this script for maximum reliability
    // Call generate-invoice.php to get invoice content
    $apiUrl = "generate-invoice.php";
    $queryParams = http_build_query([
        'id' => $bookingId,
        'gstEnabled' => $gstEnabled ? '1' : '0',
        'isIGST' => $isIGST ? '1' : '0',
        'includeTax' => $includeTax ? '1' : '0',
        'invoiceNumber' => $customInvoiceNumber,
        'gstNumber' => $gstNumber,
        'companyName' => $companyName,
        'companyAddress' => $companyAddress
    ]);
    
    // Use direct inclusion instead of cURL to avoid issues
    ob_start();
    $_GET['id'] = $bookingId;
    $_GET['gstEnabled'] = $gstEnabled ? '1' : '0';
    $_GET['isIGST'] = $isIGST ? '1' : '0';
    $_GET['includeTax'] = $includeTax ? '1' : '0';
    $_GET['invoiceNumber'] = $customInvoiceNumber;
    $_GET['gstNumber'] = $gstNumber;
    $_GET['companyName'] = $companyName;
    $_GET['companyAddress'] = $companyAddress;
    
    // Include generate-invoice.php directly
    include(__DIR__ . '/generate-invoice.php');
    $response = ob_get_clean();
    
    // Parse JSON response
    $result = json_decode($response, true);
    
    if (!$result || !isset($result['data']['invoiceHtml'])) {
        logInvoiceError("Invalid response from generate-invoice", [
            'response' => substr($response, 0, 500)
        ]);
        throw new Exception("Failed to generate invoice: Invalid response");
    }
    
    $invoiceHtml = $result['data']['invoiceHtml'];
    $invoiceNumber = $result['data']['invoiceNumber'];
    
    // Output invoice based on requested format
    if ($format === 'pdf') {
        // IMPORTANT: Set PDF headers - these override any previous headers
        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="invoice_' . $invoiceNumber . '.pdf"');
        
        // Create better PDF-ready HTML
        echo '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice PDF</title>
    <style>
        @page {
            margin: 10mm;
        }
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #333;
        }
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
    exit;
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
