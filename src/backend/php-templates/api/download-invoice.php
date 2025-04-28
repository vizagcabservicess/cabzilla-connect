
<?php
// Include configuration file only
require_once __DIR__ . '/../config.php';

// CRITICAL: Clear all buffers before ANY output
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
    // Get booking ID and parameters from query string
    $bookingId = isset($_GET['id']) ? (int)$_GET['id'] : null;
    $gstEnabled = isset($_GET['gstEnabled']) ? filter_var($_GET['gstEnabled'], FILTER_VALIDATE_BOOLEAN) : false;
    $gstNumber = isset($_GET['gstNumber']) ? $_GET['gstNumber'] : '';
    $companyName = isset($_GET['companyName']) ? $_GET['companyName'] : '';
    $companyAddress = isset($_GET['companyAddress']) ? $_GET['companyAddress'] : '';
    $isIGST = isset($_GET['isIGST']) ? filter_var($_GET['isIGST'], FILTER_VALIDATE_BOOLEAN) : false;
    $includeTax = isset($_GET['includeTax']) ? filter_var($_GET['includeTax'], FILTER_VALIDATE_BOOLEAN) : true;
    $customInvoiceNumber = isset($_GET['invoiceNumber']) ? $_GET['invoiceNumber'] : '';

    // Forward request to admin endpoint with all parameters
    $adminUrl = 'http://' . $_SERVER['HTTP_HOST'] . '/api/admin/download-invoice.php';
    $queryParams = http_build_query([
        'id' => $bookingId,
        'gstEnabled' => $gstEnabled ? '1' : '0',
        'isIGST' => $isIGST ? '1' : '0',
        'includeTax' => $includeTax ? '1' : '0',
        'gstNumber' => $gstNumber,
        'companyName' => $companyName,
        'companyAddress' => $companyAddress,
        'invoiceNumber' => $customInvoiceNumber
    ]);
    
    $ch = curl_init($adminUrl . '?' . $queryParams);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    
    $response = curl_exec($ch);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $headers = substr($response, 0, $headerSize);
    $body = substr($response, $headerSize);
    
    curl_close($ch);
    
    // Extract and set content type from response headers
    if (preg_match('/Content-Type: ([^\r\n]+)/i', $headers, $matches)) {
        header('Content-Type: ' . $matches[1]);
    }
    
    // Set content disposition for proper download
    if (preg_match('/Content-Disposition: ([^\r\n]+)/i', $headers, $matches)) {
        header('Content-Disposition: ' . $matches[1]);
    }
    
    // Output the response body
    echo $body;
    exit;

} catch (Exception $e) {
    logInvoiceError("Error in public download-invoice.php", ['error' => $e->getMessage()]);
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Failed to download invoice: ' . $e->getMessage()
    ], 500);
}
