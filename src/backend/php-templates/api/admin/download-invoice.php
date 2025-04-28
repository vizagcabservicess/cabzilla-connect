<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// CRITICAL: Clear all buffers first
while (ob_get_level()) ob_end_clean();

// Set essential headers first
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log error function with more details
function logInvoiceError($message, $data = []) {
    $logFile = LOG_DIR . '/invoice_errors.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $message - " . json_encode($data) . "\n";
    file_put_contents($logFile, $logEntry, FILE_APPEND);
    error_log("INVOICE ERROR: $message " . json_encode($data));
}

// Helper to get parameters from POST or GET
function getParam($key, $default = null) {
    return $_POST[$key] ?? $_GET[$key] ?? $default;
}

try {
    // Use getParam for all parameters
    $bookingId = (int)getParam('id');
    $gstEnabled = filter_var(getParam('gstEnabled', false), FILTER_VALIDATE_BOOLEAN);
    $isIGST = filter_var(getParam('isIGST', false), FILTER_VALIDATE_BOOLEAN);
    $includeTax = filter_var(getParam('includeTax', true), FILTER_VALIDATE_BOOLEAN);
    $customInvoiceNumber = trim(getParam('invoiceNumber', ''));
    $gstDetails = null;
    if ($gstEnabled) {
        $gstDetails = [
            'gstNumber' => getParam('gstNumber', ''),
            'companyName' => getParam('companyName', ''),
            'companyAddress' => getParam('companyAddress', '')
        ];
    }

    // Log request parameters
    logInvoiceError("Admin download invoice request", [
        'booking_id' => $bookingId,
        'gst_enabled' => $gstEnabled,
        'is_igst' => $isIGST,
        'include_tax' => $includeTax,
        'custom_invoice' => $customInvoiceNumber
    ]);

    // Generate invoice via API call
    $generateUrl = 'http://' . $_SERVER['HTTP_HOST'] . '/api/admin/generate-invoice.php';
    $queryParams = http_build_query([
        'id' => $bookingId,
        'gstEnabled' => $gstEnabled ? '1' : '0',
        'isIGST' => $isIGST ? '1' : '0',
        'includeTax' => $includeTax ? '1' : '0',
        'format' => 'json',
        'gstNumber' => $gstDetails['gstNumber'] ?? '',
        'companyName' => $gstDetails['companyName'] ?? '',
        'companyAddress' => $gstDetails['companyAddress'] ?? '',
        'invoiceNumber' => $customInvoiceNumber
    ]);

    $ch = curl_init($generateUrl . '?' . $queryParams);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, false);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);

    $response = curl_exec($ch);
    if (curl_errno($ch)) {
        throw new Exception("cURL Error: " . curl_error($ch));
    }
    
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        throw new Exception("Failed to generate invoice. HTTP Code: " . $httpCode);
    }

    $generatedData = json_decode($response, true);
    if (!$generatedData || !isset($generatedData['data']['invoiceHtml'])) {
        throw new Exception("Invalid response from invoice generator");
    }

    // Set headers for HTML output
    header('Content-Type: text/html');
    header('Content-Disposition: inline; filename="invoice_' . $generatedData['data']['invoiceNumber'] . '.html"');
    
    // Output the complete HTML document
    echo '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice #' . $generatedData['data']['invoiceNumber'] . '</title>
    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
                setTimeout(function() {
                    document.querySelector("body").innerHTML = "<div style=\'text-align:center;padding:40px;\'><h1>Your invoice has been downloaded.</h1><p>You may close this window.</p></div>";
                }, 1000);
            }, 500);
        };
    </script>
    <style>
        @media print {
            body { margin: 0; padding: 0; }
            @page { size: A4; margin: 10mm; }
            .no-print { display: none !important; }
        }
        body { font-family: Arial, sans-serif; }
        .print-container { max-width: 800px; margin: 0 auto; }
    </style>
</head>
<body>
    <div class="print-container">
        ' . $generatedData['data']['invoiceHtml'] . '
    </div>
</body>
</html>';

    exit;

} catch (Exception $e) {
    logInvoiceError("Error in admin download-invoice.php", [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to generate invoice: ' . $e->getMessage()
    ]);
    exit;
}
