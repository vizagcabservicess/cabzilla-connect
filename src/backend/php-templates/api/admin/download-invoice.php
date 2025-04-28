<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Include configuration file
require_once __DIR__ . '/../../config.php';

// CRITICAL: Clear all buffers before ANY output - essential for PDF/HTML output
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
        
        logInvoiceError("Database connection established successfully");
    } catch (Exception $e) {
        logInvoiceError("Database connection error", ['error' => $e->getMessage()]);
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
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY (invoice_number),
                KEY (booking_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
        
        $conn->query($createTableQuery);
        
        if ($conn->error) {
            logInvoiceError("Error creating invoices table", ['error' => $conn->error]);
        }
    }
    
    // Retrieve the invoice data
    $invoiceExists = false;
    $invoiceData = null;
    
    // First try to get from invoices table
    if ($tableExists) {
        try {
            $invoiceStmt = $conn->prepare("SELECT * FROM invoices WHERE booking_id = ? ORDER BY id DESC LIMIT 1");
            if ($invoiceStmt) {
                $invoiceStmt->bind_param("i", $bookingId);
                $invoiceStmt->execute();
                $invoiceResult = $invoiceStmt->get_result();
                
                if ($invoiceResult && $invoiceResult->num_rows > 0) {
                    $invoiceExists = true;
                    $invoiceData = $invoiceResult->fetch_assoc();
                    logInvoiceError("Found existing invoice", ['invoice_id' => $invoiceData['id']]);
                } else {
                    logInvoiceError("No existing invoice found for booking_id: $bookingId");
                }
                
                $invoiceStmt->close();
            }
        } catch (Exception $e) {
            logInvoiceError("Error checking for existing invoice", ['error' => $e->getMessage()]);
        }
    }
    
    // Always generate a new invoice if parameters have changed
    $invoiceHtml = '';
    $needNewInvoice = !$invoiceExists || 
        $gstEnabled != filter_var($invoiceData['gst_enabled'] ?? false, FILTER_VALIDATE_BOOLEAN) ||
        $isIGST != filter_var($invoiceData['is_igst'] ?? false, FILTER_VALIDATE_BOOLEAN) ||
        $includeTax != filter_var($invoiceData['include_tax'] ?? true, FILTER_VALIDATE_BOOLEAN) ||
        ($customInvoiceNumber && $customInvoiceNumber !== ($invoiceData['invoice_number'] ?? ''));
    
    // Log parameters to help with debugging
    logInvoiceError("Invoice generation parameters", [
        'needNewInvoice' => $needNewInvoice ? 'true' : 'false',
        'invoiceExists' => $invoiceExists ? 'true' : 'false',
        'gstEnabled' => $gstEnabled ? 'true' : 'false',
        'isIGST' => $isIGST ? 'true' : 'false',
        'includeTax' => $includeTax ? 'true' : 'false',
        'customInvoiceNumber' => $customInvoiceNumber
    ]);
    
    if ($needNewInvoice) {
        // Generate invoice on-the-fly via the generate-invoice API
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
    } else {
        // Use stored HTML
        $invoiceHtml = $invoiceData['invoice_html'];
        $invoiceNumber = $invoiceData['invoice_number'];
    }
    
    if (empty($invoiceHtml)) {
        throw new Exception("No invoice HTML content generated");
    }
    
    // CRITICAL: Set Content-Type for HTML output before any HTML output
    header('Content-Type: text/html');
    header('Content-Disposition: inline; filename="invoice_' . $invoiceNumber . '.html"');
    
    // Inject print script just before </body> if you want auto-print
    $printScript = '<script>\n'
        . 'window.onload = function() {\n'
        . '  setTimeout(function() {\n'
        . '    window.print();\n'
        . '    setTimeout(function() {\n'
        . '      document.body.innerHTML = "<div style=\\'text-align:center;padding:40px;\\'><h1>Your invoice has been downloaded.</h1><p>You may close this window.</p></div>";\n'
        . '    }, 1000);\n'
        . '  }, 500);\n'
        . '};\n'
        . '</script>';
    
    // Insert print script before </body>
    if (strpos($invoiceHtml, '</body>') !== false) {
        $invoiceHtml = str_replace('</body>', $printScript . '</body>', $invoiceHtml);
    } else {
        $invoiceHtml .= $printScript;
    }
    
    // Output only the invoice HTML (no extra wrapper)
    echo $invoiceHtml;
    exit;

} catch (Exception $e) {
    logInvoiceError("Critical error in download-invoice.php", ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
    
    // For errors, we MUST change content type back to JSON
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
