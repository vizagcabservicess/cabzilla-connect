
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// Clear any buffer
if (ob_get_level()) ob_end_clean();

// IMPORTANT: Don't set application/json content-type here
// Let this script set it based on PDF output

// Handle CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

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
    
    if ($gstEnabled) {
        $gstDetails = [
            'gstNumber' => isset($_GET['gstNumber']) ? $_GET['gstNumber'] : '',
            'companyName' => isset($_GET['companyName']) ? $_GET['companyName'] : '',
            'companyAddress' => isset($_GET['companyAddress']) ? $_GET['companyAddress'] : '',
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
    
    // Get invoice HTML first using the generate-invoice.php script
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
    
    // Set headers for PDF download
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="invoice_' . $invoiceNumber . '.pdf"');
    
    // Use a library to convert HTML to PDF
    // For this implementation, we'll use a simple method just returning the HTML
    // In a real application, you would use a library like mPDF, DOMPDF, or TCPDF
    // Example of integrating mPDF is commented below
    
    /*
    // Using mPDF (you would need to install it via composer)
    require_once __DIR__ . '/../../vendor/autoload.php';
    $mpdf = new \Mpdf\Mpdf();
    $mpdf->WriteHTML($htmlContent);
    $mpdf->Output('invoice_' . $invoiceNumber . '.pdf', 'D');
    */
    
    // Since we don't have a PDF library installed, we'll return HTML with proper headers
    // In a real application, you would use a proper PDF library
    
    // For now, provide a fallback that returns the HTML that looks like a PDF
    header('Content-Type: text/html');
    echo '<!DOCTYPE html>
<html>
<head>
    <title>Invoice ' . $invoiceNumber . '</title>
    <style>
        body { font-family: Arial, sans-serif; }
        .pdf-notice { 
            background: #f8f9fa; 
            padding: 20px; 
            border: 1px solid #ddd; 
            margin: 20px; 
            text-align: center;
            max-width: 800px;
            margin: 20px auto;
        }
    </style>
</head>
<body>
    <div class="pdf-notice">
        <h2>PDF Download Simulation</h2>
        <p>In a production environment, this would be a PDF download.</p>
        <p>Below is the invoice that would be converted to PDF:</p>
    </div>
    ' . $htmlContent . '
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
