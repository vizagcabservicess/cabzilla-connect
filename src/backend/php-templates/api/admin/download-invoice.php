
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// Clear any buffer
if (ob_get_level()) ob_end_clean();

// CRITICAL: Set headers ONLY for PDF content (moved from GET request processing to here)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');

// Handle OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Debug mode
$debugMode = isset($_GET['debug']) || isset($_SERVER['HTTP_X_DEBUG']);

try {
    // Get booking ID from query parameter
    $bookingId = isset($_GET['id']) ? $_GET['id'] : null;
    
    // Get GST details from query params
    $gstEnabled = isset($_GET['gstEnabled']) && $_GET['gstEnabled'] == '1';
    $gstDetails = null;
    $isIGST = isset($_GET['isIGST']) && $_GET['isIGST'] == '1';
    
    if ($gstEnabled) {
        $gstDetails = [
            'gstNumber' => isset($_GET['gstNumber']) ? $_GET['gstNumber'] : '',
            'companyName' => isset($_GET['companyName']) ? $_GET['companyName'] : '',
            'companyAddress' => isset($_GET['companyAddress']) ? $_GET['companyAddress'] : '',
            'isIGST' => $isIGST
        ];
    }
    
    if (!$bookingId) {
        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'error',
            'message' => 'Missing booking ID'
        ]);
        exit;
    }
    
    // Get invoice HTML from generate-invoice.php
    $apiUrl = 'http://' . $_SERVER['HTTP_HOST'] . '/api/admin/generate-invoice.php';
    
    // Add all parameters to the URL
    $apiUrl .= '?id=' . urlencode($bookingId);
    if ($gstEnabled) {
        $apiUrl .= '&gstEnabled=1';
        if (isset($gstDetails['gstNumber'])) {
            $apiUrl .= '&gstNumber=' . urlencode($gstDetails['gstNumber']);
        }
        if (isset($gstDetails['companyName'])) {
            $apiUrl .= '&companyName=' . urlencode($gstDetails['companyName']);
        }
        if (isset($gstDetails['companyAddress'])) {
            $apiUrl .= '&companyAddress=' . urlencode($gstDetails['companyAddress']);
        }
        if ($isIGST) {
            $apiUrl .= '&isIGST=1';
        }
    }
    
    // Get invoice data from generate-invoice.php
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, false);
    
    $response = curl_exec($ch);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        throw new Exception("Error fetching invoice data: $error");
    }
    
    $invoiceData = json_decode($response, true);
    
    if (!$invoiceData || !isset($invoiceData['data']['invoiceHtml'])) {
        throw new Exception("Invalid invoice data received");
    }
    
    $htmlContent = $invoiceData['data']['invoiceHtml'];
    $invoiceNumber = $invoiceData['data']['invoiceNumber'];
    
    // CRITICAL: Set PDF download headers correctly BEFORE any output
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="invoice_' . $invoiceNumber . '.pdf"');
    
    // Output HTML that will be rendered as PDF
    echo '<!DOCTYPE html>
<html>
<head>
    <title>Invoice ' . $invoiceNumber . '</title>
    <style>
        body { 
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #333;
        }
        .invoice-container {
            max-width: 800px;
            margin: 20px auto;
            border: 1px solid #ddd;
            padding: 30px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        .invoice-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid #ddd;
            overflow: auto;
        }
        .invoice-header div:first-child {
            float: left;
        }
        .invoice-header div:last-child {
            float: right;
            text-align: right;
        }
        @media print {
            body {
                margin: 0;
                padding: 0;
            }
            .invoice-container {
                box-shadow: none;
                border: none;
                padding: 10px;
                max-width: 100%;
                margin: 0;
            }
        }
    </style>
</head>
<body>
    ' . $htmlContent . '
    <script>
        window.onload = function() {
            setTimeout(function() { 
                window.print();
            }, 500);
        };
    </script>
</body>
</html>';

} catch (Exception $e) {
    // Return error as JSON
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to generate PDF: ' . $e->getMessage(),
        'details' => $debugMode ? $e->getTraceAsString() : null
    ]);
}
