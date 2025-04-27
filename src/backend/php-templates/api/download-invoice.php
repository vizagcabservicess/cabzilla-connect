
<?php
// Include configuration file
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/common/db_helper.php';

// CRITICAL: Clear all output buffers first
while (ob_get_level()) ob_end_clean();

// Debug mode
$debugMode = isset($_GET['debug']) || isset($_SERVER['HTTP_X_DEBUG']);

// JSON response function
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

    // Forward request to admin endpoint with all parameters
    $adminUrl = 'http://' . $_SERVER['HTTP_HOST'] . '/api/admin/download-invoice.php';
    $queryParams = http_build_query($_GET);
    
    logInvoiceError("Forwarding to admin download-invoice.php", [
        'booking_id' => $bookingId,
        'admin_url' => $adminUrl,
        'query_params' => $queryParams
    ]);
    
    $ch = curl_init($adminUrl . '?' . $queryParams);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    
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
    
    // Set appropriate content type
    if ($contentType) {
        header("Content-Type: $contentType");
    } else {
        header("Content-Type: text/html; charset=utf-8");
    }
    
    // Pass through Content-Disposition for download
    if (preg_match('/Content-Disposition: ([^\r\n]+)/i', $headers, $matches)) {
        header("Content-Disposition: {$matches[1]}");
    }
    
    // Output the response body
    echo $body;
    exit;

} catch (Exception $e) {
    logInvoiceError("Critical error in public download-invoice.php", [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    
    header('Content-Type: application/json');
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Failed to generate invoice: ' . $e->getMessage(),
        'error_details' => $debugMode ? $e->getMessage() : null
    ], 500);
}

