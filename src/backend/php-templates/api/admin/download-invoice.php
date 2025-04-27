
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
                UNIQUE KEY (invoice_number),
                KEY (booking_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
        
        $conn->query($createTableQuery);
        
        if ($conn->error) {
            logInvoiceError("Error creating invoices table", ['error' => $conn->error]);
        }
    }
    
    // Check if invoice exists for this booking
    $invoiceExists = false;
    $invoiceData = null;
    
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
    
    // If no invoice record or if parameters have changed, generate a new one
    if (!$invoiceExists || 
        $gstEnabled != filter_var($invoiceData['gst_enabled'] ?? false, FILTER_VALIDATE_BOOLEAN) ||
        $isIGST != filter_var($invoiceData['is_igst'] ?? false, FILTER_VALIDATE_BOOLEAN) ||
        $includeTax != filter_var($invoiceData['include_tax'] ?? true, FILTER_VALIDATE_BOOLEAN) ||
        ($customInvoiceNumber && $customInvoiceNumber !== ($invoiceData['invoice_number'] ?? ''))) {
        
        logInvoiceError("No invoice found or parameters changed, fetching booking details");
        
        try {
            $bookingStmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
            if (!$bookingStmt) {
                throw new Exception("Failed to prepare booking query: " . $conn->error);
            }
            
            $bookingStmt->bind_param("i", $bookingId);
            $bookingStmt->execute();
            $bookingResult = $bookingStmt->get_result();
            
            if ($bookingResult->num_rows === 0) {
                logInvoiceError("Booking not found", ['booking_id' => $bookingId]);
                sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
            }
            
            $booking = $bookingResult->fetch_assoc();
            logInvoiceError("Booking found", [
                'booking_id' => $booking['id'],
                'booking_number' => $booking['booking_number']
            ]);
            
            // Generate invoice data from booking
            $invoiceNumber = $customInvoiceNumber ?: ('INV-' . date('Ymd') . '-' . $booking['id']);
            $invoiceDate = date('Y-m-d');
            
            // Calculate tax components based on includeTax setting
            if ($includeTax) {
                // If tax is included in total amount, calculate backwards
                $totalAmount = $booking['total_amount'];
                $taxRate = $gstEnabled ? 0.12 : 0; // 12% for GST, 0% if not enabled
                $baseAmount = round($totalAmount / (1 + $taxRate), 2);
                $taxAmount = $totalAmount - $baseAmount;
            } else {
                // If tax is excluded, calculate forward
                $baseAmount = $booking['total_amount'];
                $taxRate = $gstEnabled ? 0.12 : 0; // 12% for GST, 0% if not enabled
                $taxAmount = round($baseAmount * $taxRate, 2);
                $totalAmount = $baseAmount + $taxAmount;
            }
            
            $invoiceData = [
                'invoice_number' => $invoiceNumber,
                'booking_id' => $booking['id'],
                'booking_number' => $booking['booking_number'],
                'passenger_name' => $booking['passenger_name'],
                'passenger_email' => $booking['passenger_email'],
                'passenger_phone' => $booking['passenger_phone'],
                'trip_type' => $booking['trip_type'] ?? 'local',
                'trip_mode' => $booking['trip_mode'] ?? 'outstation',
                'pickup_location' => $booking['pickup_location'],
                'drop_location' => $booking['drop_location'],
                'pickup_date' => $booking['pickup_date'],
                'cab_type' => $booking['cab_type'],
                'base_fare' => $baseAmount,
                'tax_amount' => $taxAmount,
                'total_amount' => $totalAmount,
                'invoice_date' => $invoiceDate,
                'status' => 'generated',
                'is_igst' => $isIGST ? 1 : 0,
                'include_tax' => $includeTax ? 1 : 0
            ];

            // When building $invoiceData, override GST fields if provided
            if ($gstEnabled) {
                $invoiceData['gst_enabled'] = true;
                $invoiceData['gst_number'] = $gstNumber ?: ($invoiceData['gst_number'] ?? '');
                $invoiceData['company_name'] = $companyName ?: ($invoiceData['company_name'] ?? '');
                $invoiceData['company_address'] = $companyAddress ?: ($invoiceData['company_address'] ?? '');
            }
            
            // Generate the invoice on-the-fly
            logInvoiceError("Generating invoice on-the-fly", [
                'invoice_number' => $invoiceNumber,
                'gst_enabled' => $gstEnabled,
                'is_igst' => $isIGST,
                'include_tax' => $includeTax
            ]);
            
            // Call generate-invoice.php via internal mechanism rather than HTTP
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
            
            // Use the HTML from generate-invoice.php
            $invoiceData['invoice_html'] = $generatedData['data']['invoiceHtml'];
        } catch (Exception $e) {
            logInvoiceError("Error processing booking data", ['error' => $e->getMessage()]);
            throw $e;
        }
    }
    
    if (!isset($invoiceData['invoice_html']) || empty($invoiceData['invoice_html'])) {
        throw new Exception("Missing invoice HTML content");
    }
    
    // Format for PDF output
    $invoiceHtml = $invoiceData['invoice_html'];
    
    // Decide how to output the invoice - HTML or PDF
    $format = isset($_GET['format']) ? $_GET['format'] : 'pdf';
    
    // Set the appropriate Content-Type header based on the format
    if ($format === 'pdf') {
        // Send PDF headers BEFORE any content
        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="invoice_' . 
            (isset($invoiceData['invoice_number']) ? $invoiceData['invoice_number'] : 'download') . '.pdf"');
        
        // Simple HTML to PDF using browser print capabilities
        echo '<!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Invoice #' . (isset($invoiceData['invoice_number']) ? $invoiceData['invoice_number'] : 'Invoice') . '</title>
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() {
                        document.querySelector("body").innerHTML = "<h1>Your invoice has been downloaded. You may close this window.</h1>";
                    }, 1000);
                };
            </script>
            <style>
                @media print {
                    body { margin: 0; padding: 0; }
                    @page { size: auto; margin: 0; }
                }
            </style>
        </head>
        <body>' . $invoiceHtml . '</body>
        </html>';
    } else {
        // For HTML output
        header('Content-Type: text/html; charset=UTF-8');
        echo $invoiceHtml;
    }
    
    exit; // Important to prevent any additional output

} catch (Exception $e) {
    logInvoiceError("Critical error in download-invoice.php", ['error' => $e->getMessage()]);
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
