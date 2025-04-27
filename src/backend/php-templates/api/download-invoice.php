
<?php
// Include configuration file
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/common/db_helper.php';

// CRITICAL: Clear all buffers first - this is essential for PDF output
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

    logInvoiceError("Public invoice download requested", [
        'booking_id' => $bookingId,
        'gst_enabled' => $gstEnabled ? 'true' : 'false',
        'is_igst' => $isIGST ? 'true' : 'false',
        'include_tax' => $includeTax ? 'true' : 'false',
        'custom_invoice_number' => $customInvoiceNumber
    ]);

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
    }
    
    // Generate invoice directly instead of forwarding the request
    // This ensures we have control over the entire process
    try {
        // Check if an invoice exists in the database for this booking
        $invoiceStmt = $conn->prepare("SELECT * FROM invoices WHERE booking_id = ? ORDER BY id DESC LIMIT 1");
        if ($invoiceStmt) {
            $invoiceStmt->bind_param("i", $bookingId);
            $invoiceStmt->execute();
            $invoiceResult = $invoiceStmt->get_result();
            
            $invoiceExists = false;
            $invoiceData = null;
            
            if ($invoiceResult && $invoiceResult->num_rows > 0) {
                $invoiceExists = true;
                $invoiceData = $invoiceResult->fetch_assoc();
                logInvoiceError("Found existing invoice", [
                    'invoice_id' => $invoiceData['id'], 
                    'invoice_number' => $invoiceData['invoice_number']
                ]);
            } else {
                logInvoiceError("No existing invoice found for booking_id: $bookingId");
            }
            
            $invoiceStmt->close();
        }
        
        // Generate the invoice from scratch since parameter values may have changed
        $generateInvoiceUrl = 'http://' . $_SERVER['HTTP_HOST'] . '/api/admin/generate-invoice.php';
        $queryParams = http_build_query([
            'id' => $bookingId,
            'gstEnabled' => $gstEnabled ? '1' : '0',
            'isIGST' => $isIGST ? '1' : '0',
            'includeTax' => $includeTax ? '1' : '0',
            'format' => 'json',
            'gstNumber' => $gstNumber,
            'companyName' => $companyName,
            'companyAddress' => $companyAddress,
            'invoiceNumber' => $customInvoiceNumber
        ]);
        
        logInvoiceError("Generating invoice", ['url' => $generateInvoiceUrl . '?' . $queryParams]);
        
        $ch = curl_init($generateInvoiceUrl . '?' . $queryParams);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HEADER, false);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        
        $generateResponse = curl_exec($ch);
        $curlError = curl_error($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($curlError) {
            logInvoiceError("Error calling generate-invoice.php", [
                'curl_error' => $curlError,
                'http_code' => $httpCode
            ]);
            throw new Exception("Failed to generate invoice: $curlError");
        }
        
        $generatedData = json_decode($generateResponse, true);
        if (!$generatedData || !isset($generatedData['data']['invoiceHtml'])) {
            logInvoiceError("Invalid response from generate-invoice.php", [
                'response' => substr($generateResponse, 0, 1000),
                'http_code' => $httpCode
            ]);
            throw new Exception("Invalid invoice data received from generator");
        }
        
        $invoiceHtml = $generatedData['data']['invoiceHtml'];
        $invoiceNumber = $generatedData['data']['invoiceNumber'];
        
        // CRITICAL: Set Content-Type for HTML output
        header('Content-Type: text/html; charset=utf-8');
        header('Content-Disposition: inline; filename="invoice_' . $invoiceNumber . '.html"');
        
        // Return invoice HTML with improved styling and JavaScript for better printing
        echo '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice #' . $invoiceNumber . '</title>
    <script>
        window.onload = function() {
            // Force print dialog immediately after a slight delay
            setTimeout(function() {
                window.print();
                // After print is triggered, show success message
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
        .print-header { text-align: center; margin: 20px 0; }
        .invoice-container { padding: 20px; }
    </style>
</head>
<body>
    <div class="print-container">
        <div class="print-header no-print">
            <h1>Invoice #' . $invoiceNumber . '</h1>
            <p>Your invoice is being prepared for printing.</p>
            <p>If printing doesn\'t start automatically, please use the print button below.</p>
            <button onclick="window.print()" style="padding: 10px 20px; background: #4a86e8; color: white; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; margin: 20px 0;">Print Invoice</button>
        </div>
        <div class="invoice-container">
        ' . $invoiceHtml . '
        </div>
    </div>
</body>
</html>';
        
        logInvoiceError("Invoice sent successfully for printing", ['invoice_number' => $invoiceNumber]);
        exit; // Important to prevent any additional output
        
    } catch (Exception $e) {
        logInvoiceError("Error generating invoice directly", ['error' => $e->getMessage()]);
        throw $e;
    }

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
