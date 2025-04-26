
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';

// CRITICAL: Set all response headers first before any output
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Admin-Mode, X-Debug, *');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Debug mode
$debugMode = isset($_GET['debug']) || isset($_SERVER['HTTP_X_DEBUG']);

// Log request
error_log("Admin generate-invoice endpoint called: " . $_SERVER['REQUEST_METHOD']);

// Error logging function
function logGenerateInvoiceError($message, $data = []) {
    error_log("GENERATE INVOICE ERROR: $message " . json_encode($data));
    $logFile = __DIR__ . '/../../logs/generate_invoice_errors.log';
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

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Function to send JSON response
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    if (ob_get_level()) ob_end_clean();
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

try {
    // Allow both GET and POST methods
    if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }

    // Parse request data based on method and content type
    $requestData = [];
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $contentType = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '';
        
        if (strpos($contentType, 'application/json') !== false) {
            $jsonData = file_get_contents('php://input');
            $requestData = json_decode($jsonData, true) ?: [];
            error_log("Received JSON data: " . $jsonData);
        } else {
            $requestData = $_POST;
            error_log("Received POST data: " . json_encode($_POST));
        }
    } else {
        $requestData = $_GET;
        error_log("Received GET data: " . json_encode($_GET));
    }
    
    // Extract booking ID
    $bookingId = isset($requestData['id']) ? (int)$requestData['id'] : 
                 (isset($requestData['bookingId']) ? (int)$requestData['bookingId'] : null);
    
    // Extract GST details
    $gstEnabled = isset($requestData['gstEnabled']) ? filter_var($requestData['gstEnabled'], FILTER_VALIDATE_BOOLEAN) : false;
    $gstDetails = [
        'gstNumber' => '',
        'companyName' => '',
        'companyAddress' => ''
    ];
    
    if ($gstEnabled && isset($requestData['gstDetails'])) {
        $gstDetails = is_array($requestData['gstDetails']) ? 
            array_merge($gstDetails, $requestData['gstDetails']) : $gstDetails;
    } else {
        // Try individual GST fields
        $gstDetails['gstNumber'] = $requestData['gstNumber'] ?? '';
        $gstDetails['companyName'] = $requestData['companyName'] ?? '';
        $gstDetails['companyAddress'] = $requestData['companyAddress'] ?? '';
    }
    
    // Validate booking ID
    if (!$bookingId) {
        logGenerateInvoiceError("Missing booking ID", ['request_data' => $requestData]);
        sendJsonResponse(['status' => 'error', 'message' => 'Missing booking ID'], 400);
    }

    // Connect to database
    try {
        $conn = getDbConnectionWithRetry();
        if (!$conn) {
            throw new Exception("Could not establish database connection after retries");
        }
    } catch (Exception $e) {
        logGenerateInvoiceError("Database connection failed", ['error' => $e->getMessage()]);
        sendJsonResponse([
            'status' => 'error', 
            'message' => 'Database connection failed',
            'error_details' => $debugMode ? $e->getMessage() : null
        ], 500);
    }
    
    // Get booking details
    try {
        $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
        if (!$stmt) {
            throw new Exception("Failed to prepare statement: " . $conn->error);
        }
        
        $stmt->bind_param("i", $bookingId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            logGenerateInvoiceError("Booking not found", ['booking_id' => $bookingId]);
            sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
        }
        
        $booking = $result->fetch_assoc();

        // Get extra charges if any from booking_extras table
        $extraCharges = 0;
        try {
            $extrasStmt = $conn->prepare("SELECT SUM(amount) AS total FROM booking_extras WHERE booking_id = ?");
            if ($extrasStmt) {
                $extrasStmt->bind_param("i", $bookingId);
                $extrasStmt->execute();
                $extrasResult = $extrasStmt->get_result();
                if ($extrasRow = $extrasResult->fetch_assoc()) {
                    $extraCharges = $extrasRow['total'] ? floatval($extrasRow['total']) : 0;
                }
            }
        } catch (Exception $e) {
            // If table doesn't exist yet or other error, just continue without extra charges
            error_log("Could not fetch booking extras: " . $e->getMessage());
        }

    } catch (Exception $e) {
        logGenerateInvoiceError("Error fetching booking", [
            'booking_id' => $bookingId,
            'error' => $e->getMessage()
        ]);
        
        sendJsonResponse([
            'status' => 'error', 
            'message' => 'Error retrieving booking details',
            'error_details' => $debugMode ? $e->getMessage() : null
        ], 500);
    }
    
    // Generate invoice data
    $invoiceNumber = 'INV-' . date('Ymd') . '-' . $booking['id'];
    $invoiceDate = date('Y-m-d');
    
    // Calculate tax components
    $totalAmount = (float)$booking['total_amount'] + $extraCharges;
    
    // GST calculation (12% - split into CGST and SGST)
    if ($gstEnabled) {
        $baseAmount = $totalAmount / 1.12; // Remove GST from total to get base amount
        $cgstRate = 0.06; // 6%
        $sgstRate = 0.06; // 6%
        
        $cgstAmount = round($baseAmount * $cgstRate, 2);
        $sgstAmount = round($baseAmount * $sgstRate, 2);
        $totalGstAmount = $cgstAmount + $sgstAmount;
        
        $finalAmount = $baseAmount + $totalGstAmount;
    } else {
        // Non-GST calculation (service charge)
        $baseAmount = $totalAmount;
        $serviceChargeRate = 0.05; // 5% service charge
        $serviceChargeAmount = round($baseAmount * $serviceChargeRate, 2);
        
        $cgstAmount = 0;
        $sgstAmount = 0;
        $totalGstAmount = 0;
        
        $finalAmount = $baseAmount + $serviceChargeAmount;
    }
    
    // Prepare invoice data
    $invoiceData = [
        'invoice_number' => $invoiceNumber,
        'booking_id' => $booking['id'],
        'booking_number' => $booking['booking_number'],
        'passenger_name' => $booking['passenger_name'],
        'passenger_email' => $booking['passenger_email'],
        'passenger_phone' => $booking['passenger_phone'],
        'trip_type' => $booking['trip_type'],
        'trip_mode' => $booking['trip_mode'],
        'pickup_location' => $booking['pickup_location'],
        'drop_location' => $booking['drop_location'],
        'pickup_date' => $booking['pickup_date'],
        'cab_type' => $booking['cab_type'],
        'base_amount' => $baseAmount,
        'extra_charges' => $extraCharges,
        'gst_enabled' => $gstEnabled,
        'cgst_amount' => $cgstAmount,
        'sgst_amount' => $sgstAmount,
        'total_gst_amount' => $totalGstAmount,
        'service_charge_amount' => $gstEnabled ? 0 : $serviceChargeAmount,
        'final_amount' => $finalAmount,
        'invoice_date' => $invoiceDate,
        'gst_number' => $gstEnabled ? $gstDetails['gstNumber'] : '',
        'company_name' => $gstEnabled ? $gstDetails['companyName'] : '',
        'company_address' => $gstEnabled ? $gstDetails['companyAddress'] : '',
        'billing_address' => $booking['billing_address'] ?? ''
    ];

    // Check if invoices table exists, if not create it
    try {
        $tableCheckStmt = $conn->query("SHOW TABLES LIKE 'invoices'");
        if ($tableCheckStmt->num_rows == 0) {
            // Table doesn't exist, create it
            $createTableSql = "CREATE TABLE invoices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                invoice_number VARCHAR(50) NOT NULL,
                booking_id INT NOT NULL,
                invoice_date DATE NOT NULL,
                base_amount DECIMAL(10,2) NOT NULL,
                extra_charges DECIMAL(10,2) DEFAULT 0,
                gst_enabled TINYINT(1) DEFAULT 0,
                cgst_amount DECIMAL(10,2) DEFAULT 0,
                sgst_amount DECIMAL(10,2) DEFAULT 0,
                service_charge_amount DECIMAL(10,2) DEFAULT 0,
                final_amount DECIMAL(10,2) NOT NULL,
                gst_number VARCHAR(20),
                company_name VARCHAR(100),
                company_address TEXT,
                billing_address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY (invoice_number),
                INDEX (booking_id)
            )";
            $conn->query($createTableSql);
        } else {
            // Check if we need to add extra_charges or billing_address columns
            $columnsStmt = $conn->query("SHOW COLUMNS FROM invoices LIKE 'extra_charges'");
            if ($columnsStmt->num_rows == 0) {
                $conn->query("ALTER TABLE invoices ADD COLUMN extra_charges DECIMAL(10,2) DEFAULT 0 AFTER base_amount");
            }
            
            $columnsStmt = $conn->query("SHOW COLUMNS FROM invoices LIKE 'billing_address'");
            if ($columnsStmt->num_rows == 0) {
                $conn->query("ALTER TABLE invoices ADD COLUMN billing_address TEXT AFTER company_address");
            }
        }
    } catch (Exception $e) {
        // Log but continue - we'll try to insert anyway
        logGenerateInvoiceError("Error checking/creating invoices table", ['error' => $e->getMessage()]);
    }

    // Save invoice to database
    try {
        $stmt = $conn->prepare("
            INSERT INTO invoices (
                invoice_number, booking_id, invoice_date, base_amount, extra_charges,
                gst_enabled, cgst_amount, sgst_amount, service_charge_amount,
                final_amount, gst_number, company_name, company_address, billing_address
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                invoice_date = VALUES(invoice_date),
                base_amount = VALUES(base_amount),
                extra_charges = VALUES(extra_charges),
                gst_enabled = VALUES(gst_enabled),
                cgst_amount = VALUES(cgst_amount),
                sgst_amount = VALUES(sgst_amount),
                service_charge_amount = VALUES(service_charge_amount),
                final_amount = VALUES(final_amount),
                gst_number = VALUES(gst_number),
                company_name = VALUES(company_name),
                company_address = VALUES(company_address),
                billing_address = VALUES(billing_address)
        ");
        
        if (!$stmt) {
            throw new Exception("Failed to prepare invoice insert statement: " . $conn->error);
        }
        
        $stmt->bind_param(
            "sisdiddddssss",
            $invoiceNumber,
            $booking['id'],
            $invoiceDate,
            $baseAmount,
            $extraCharges,
            $gstEnabled,
            $cgstAmount,
            $sgstAmount,
            $serviceChargeAmount,
            $finalAmount,
            $gstDetails['gstNumber'],
            $gstDetails['companyName'],
            $gstDetails['companyAddress'],
            $invoiceData['billing_address']
        );
        
        if (!$stmt->execute()) {
            throw new Exception("Failed to save invoice: " . $stmt->error);
        }
        
        $invoiceId = $stmt->insert_id ?: $conn->insert_id;
        
    } catch (Exception $e) {
        logGenerateInvoiceError("Error saving invoice", [
            'booking_id' => $bookingId,
            'error' => $e->getMessage()
        ]);
        
        sendJsonResponse([
            'status' => 'error',
            'message' => 'Failed to save invoice',
            'error_details' => $debugMode ? $e->getMessage() : null
        ], 500);
    }
    
    // Generate invoice HTML
    $invoiceHtml = generateInvoiceHTML($invoiceData);
    
    // Return success response
    sendJsonResponse([
        'status' => 'success',
        'message' => 'Invoice generated successfully',
        'data' => [
            'invoiceId' => $invoiceId,
            'invoiceNumber' => $invoiceNumber,
            'invoiceDate' => $invoiceDate,
            'invoiceHtml' => $invoiceHtml,
            'amount_details' => [
                'base_amount' => $baseAmount,
                'extra_charges' => $extraCharges,
                'cgst_amount' => $cgstAmount,
                'sgst_amount' => $sgstAmount,
                'service_charge_amount' => $serviceChargeAmount,
                'final_amount' => $finalAmount
            ],
            'gst_details' => $gstEnabled ? $gstDetails : null
        ]
    ]);
    
} catch (Exception $e) {
    logGenerateInvoiceError("Unhandled error", ['error' => $e->getMessage()]);
    sendJsonResponse([
        'status' => 'error',
        'message' => 'An unexpected error occurred',
        'error_details' => $debugMode ? $e->getMessage() : null
    ], 500);
}

// Function to generate HTML invoice
function generateInvoiceHTML($invoiceData) {
    $hasGst = $invoiceData['gst_enabled'] && $invoiceData['total_gst_amount'] > 0;
    $companyInfo = '';
    
    if ($hasGst && !empty($invoiceData['gst_number'])) {
        $companyInfo = '
        <div class="company-gst-details">
            <h3>Billing To:</h3>
            <p><strong>' . htmlspecialchars($invoiceData['company_name']) . '</strong></p>
            <p>GST Number: ' . htmlspecialchars($invoiceData['gst_number']) . '</p>
            <p>' . nl2br(htmlspecialchars($invoiceData['company_address'])) . '</p>
        </div>';
    } else if (!empty($invoiceData['billing_address'])) {
        $companyInfo = '
        <div class="company-gst-details">
            <h3>Billing To:</h3>
            <p>' . nl2br(htmlspecialchars($invoiceData['billing_address'])) . '</p>
        </div>';
    }
    
    $gstRow = '';
    $extraChargesRow = '';
    $serviceChargeRow = '';
    
    // Add extra charges row if applicable
    if ($invoiceData['extra_charges'] > 0) {
        $extraChargesRow = '
        <tr>
            <td>Extra Charges</td>
            <td>₹ ' . number_format($invoiceData['extra_charges'], 2) . '</td>
        </tr>';
    }
    
    if ($hasGst) {
        $gstRow = '
        <tr>
            <td>CGST (6%)</td>
            <td>₹ ' . number_format($invoiceData['cgst_amount'], 2) . '</td>
        </tr>
        <tr>
            <td>SGST (6%)</td>
            <td>₹ ' . number_format($invoiceData['sgst_amount'], 2) . '</td>
        </tr>';
    } else if ($invoiceData['service_charge_amount'] > 0) {
        $serviceChargeRow = '
        <tr>
            <td>Service Charge (5%)</td>
            <td>₹ ' . number_format($invoiceData['service_charge_amount'], 2) . '</td>
        </tr>';
    }
    
    $html = '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Invoice #' . $invoiceData['invoice_number'] . '</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 20px;
                color: #333;
            }
            .invoice-container {
                max-width: 800px;
                margin: 0 auto;
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
            }
            .invoice-details {
                margin-bottom: 40px;
                overflow: auto;
            }
            .customer-details, .company-gst-details {
                float: left;
                width: 48%;
            }
            .invoice-summary {
                float: right;
                width: 48%;
                text-align: right;
            }
            .booking-details {
                clear: both;
                margin-bottom: 30px;
                padding-top: 20px;
            }
            .fare-breakdown {
                margin-top: 30px;
                border-top: 1px solid #ddd;
                padding-top: 20px;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
            }
            table th, table td {
                padding: 10px;
                text-align: left;
                border-bottom: 1px solid #ddd;
            }
            .total-row {
                font-weight: bold;
                font-size: 1.1em;
            }
            .company-info {
                margin-top: 40px;
                text-align: center;
                font-size: 0.9em;
                color: #666;
            }
            h1 {
                color: #444;
                margin: 0 0 10px 0;
            }
            h3 {
                color: #555;
                margin-bottom: 10px;
            }
        </style>
    </head>
    <body>
        <div class="invoice-container">
            <div class="invoice-header">
                <div>
                    <h1>INVOICE</h1>
                    <p>Vishakapatnam Cab Services</p>
                </div>
                <div>
                    <p><strong>Invoice #:</strong> ' . $invoiceData['invoice_number'] . '</p>
                    <p><strong>Date:</strong> ' . $invoiceData['invoice_date'] . '</p>
                    <p><strong>Booking #:</strong> ' . $invoiceData['booking_number'] . '</p>
                </div>
            </div>
            
            <div class="invoice-details">
                <div class="customer-details">
                    <h3>Passenger Details:</h3>
                    <p>' . $invoiceData['passenger_name'] . '</p>
                    <p>Phone: ' . $invoiceData['passenger_phone'] . '</p>
                    <p>Email: ' . $invoiceData['passenger_email'] . '</p>
                </div>
                ' . $companyInfo . '
                <div class="invoice-summary">
                    <h3>Trip Summary:</h3>
                    <p><strong>Trip Type:</strong> ' . ucfirst($invoiceData['trip_type']) . ' (' . ucfirst($invoiceData['trip_mode']) . ')</p>
                    <p><strong>Date:</strong> ' . date('d M Y', strtotime($invoiceData['pickup_date'])) . '</p>
                    <p><strong>Vehicle:</strong> ' . $invoiceData['cab_type'] . '</p>
                </div>
            </div>
            
            <div class="booking-details">
                <h3>Trip Details:</h3>
                <p><strong>Pickup Location:</strong> ' . $invoiceData['pickup_location'] . '</p>
                ' . ($invoiceData['drop_location'] ? '<p><strong>Drop Location:</strong> ' . $invoiceData['drop_location'] . '</p>' : '') . '
                <p><strong>Pickup Date/Time:</strong> ' . date('d M Y, h:i A', strtotime($invoiceData['pickup_date'])) . '</p>
            </div>
            
            <div class="fare-breakdown">
                <h3>Fare Breakdown:</h3>
                <table>
                    <tr>
                        <th>Description</th>
                        <th>Amount</th>
                    </tr>
                    <tr>
                        <td>Base Fare</td>
                        <td>₹ ' . number_format($invoiceData['base_amount'], 2) . '</td>
                    </tr>
                    ' . $extraChargesRow . '
                    ' . $gstRow . '
                    ' . $serviceChargeRow . '
                    <tr class="total-row">
                        <td>Total Amount</td>
                        <td>₹ ' . number_format($invoiceData['final_amount'], 2) . '</td>
                    </tr>
                </table>
            </div>
            
            <div class="company-info">
                <p>Thank you for choosing Vishakapatnam Cab Services.</p>
                <p>For any questions regarding this invoice, please contact support@vizagcabs.com</p>
            </div>
        </div>
    </body>
    </html>
    ';
    
    return $html;
}
