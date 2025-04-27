
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// CRITICAL: Clear all buffers before ANY output
while (ob_get_level()) ob_end_clean();

// Debug mode
$debugMode = isset($_GET['debug']) || isset($_SERVER['HTTP_X_DEBUG']);

// Function to send JSON response
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

// Log error function
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

    // Get booking ID and other parameters
    $bookingId = isset($_GET['id']) ? (int)$_GET['id'] : null;
    $gstEnabled = isset($_GET['gstEnabled']) ? filter_var($_GET['gstEnabled'], FILTER_VALIDATE_BOOLEAN) : false;
    $isIGST = isset($_GET['isIGST']) ? filter_var($_GET['isIGST'], FILTER_VALIDATE_BOOLEAN) : false;
    $includeTax = isset($_GET['includeTax']) ? filter_var($_GET['includeTax'], FILTER_VALIDATE_BOOLEAN) : true;
    
    if (!$bookingId) {
        sendJsonResponse(['status' => 'error', 'message' => 'Missing booking ID'], 400);
    }

    // Generate invoice via the generate-invoice API
    $generateInvoiceUrl = 'http://' . $_SERVER['HTTP_HOST'] . '/api/admin/generate-invoice.php';
    $queryParams = http_build_query($_GET);
    
    $ch = curl_init($generateInvoiceUrl . '?' . $queryParams);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    $curlError = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    curl_close($ch);
    
    if ($curlError) {
        throw new Exception("Failed to generate invoice: $curlError");
    }
    
    $invoiceData = json_decode($response, true);
    
    if (!$invoiceData || !isset($invoiceData['data']['invoiceHtml'])) {
        throw new Exception("Invalid invoice data received");
    }
    
    $invoiceHtml = $invoiceData['data']['invoiceHtml'];
    $invoiceNumber = $invoiceData['data']['invoiceNumber'];

    // CRITICAL: Set content type for HTML with PDF capabilities
    header('Content-Type: text/html; charset=utf-8');
    header('Content-Disposition: inline; filename="invoice_' . $invoiceNumber . '.pdf"');
    
    // Output the HTML with auto-print capability
    echo '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice #' . $invoiceNumber . '</title>
    <style>
        @media print {
            body { margin: 0; padding: 0; }
            @page { size: auto; margin: 10mm; }
        }
        body { font-family: Arial, sans-serif; }
    </style>
    <script>
        window.onload = function() {
            window.print();
            setTimeout(function() {
                var messageDiv = document.createElement("div");
                messageDiv.style.position = "fixed";
                messageDiv.style.top = "20px";
                messageDiv.style.left = "0";
                messageDiv.style.width = "100%";
                messageDiv.style.textAlign = "center";
                messageDiv.style.padding = "20px";
                messageDiv.style.backgroundColor = "#f0f9ff";
                messageDiv.style.borderBottom = "1px solid #bae6fd";
                messageDiv.style.color = "#0c4a6e";
                messageDiv.style.zIndex = "9999";
                messageDiv.innerHTML = "<h2>Your invoice is ready for download</h2>" +
                                    "<p>If the print dialog didn\'t appear, click Print in your browser to save as PDF</p>";
                document.body.insertBefore(messageDiv, document.body.firstChild);
            }, 1000);
        };
    </script>
</head>
<body>' . $invoiceHtml . '</body>
</html>';

    exit;

} catch (Exception $e) {
    logInvoiceError("Error in admin download-invoice.php", ['error' => $e->getMessage()]);
    
    header('Content-Type: application/json');
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Failed to generate invoice: ' . $e->getMessage(),
        'error_details' => $debugMode ? $e->getMessage() : null
    ], 500);
}

