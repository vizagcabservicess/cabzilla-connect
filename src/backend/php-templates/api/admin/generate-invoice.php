
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

    // Get booking ID from query parameters or POST data
    $bookingId = null;
    $gstEnabled = false; 
    $gstDetails = [
        'gstNumber' => '',
        'companyName' => '',
        'companyAddress' => ''
    ];
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $bookingId = isset($_GET['id']) ? (int)$_GET['id'] : null;
        $gstEnabled = isset($_GET['gst']) && $_GET['gst'] == '1';
        
        if ($gstEnabled) {
            $gstDetails['gstNumber'] = isset($_GET['gstNumber']) ? $_GET['gstNumber'] : '';
            $gstDetails['companyName'] = isset($_GET['companyName']) ? $_GET['companyName'] : '';
            $gstDetails['companyAddress'] = isset($_GET['companyAddress']) ? $_GET['companyAddress'] : '';
        }
    } else {
        // Get JSON input data for POST
        $jsonData = file_get_contents('php://input');
        $data = json_decode($jsonData, true);
        
        // Debug log the raw POST data
        error_log("Generate invoice POST data: " . $jsonData);
        
        $bookingId = isset($data['bookingId']) ? (int)$data['bookingId'] : null;
        $gstEnabled = isset($data['gstEnabled']) && $data['gstEnabled'] === true;
        
        if ($gstEnabled && isset($data['gstDetails'])) {
            $gstDetails = array_merge($gstDetails, $data['gstDetails']);
        }
        
        // If we couldn't get it from JSON, try regular POST
        if (!$bookingId && isset($_POST['bookingId'])) {
            $bookingId = (int)$_POST['bookingId'];
            $gstEnabled = isset($_POST['gstEnabled']) && $_POST['gstEnabled'] == '1';
            
            if ($gstEnabled) {
                $gstDetails['gstNumber'] = isset($_POST['gstNumber']) ? $_POST['gstNumber'] : '';
                $gstDetails['companyName'] = isset($_POST['companyName']) ? $_POST['companyName'] : '';
                $gstDetails['companyAddress'] = isset($_POST['companyAddress']) ? $_POST['companyAddress'] : '';
            }
        }
    }
    
    logGenerateInvoiceError("Processing invoice generation for booking ID: " . $bookingId, [
        'method' => $_SERVER['REQUEST_METHOD'],
        'queryString' => $_SERVER['QUERY_STRING'],
        'jsonData' => $jsonData ?? 'none',
        'gstEnabled' => $gstEnabled ? 'Yes' : 'No',
        'gstDetails' => $gstDetails
    ]);
    
    if (!$bookingId) {
        sendJsonResponse(['status' => 'error', 'message' => 'Missing booking ID'], 400);
    }

    // Connect to database with improved error handling
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
            sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
        }
        
        $booking = $result->fetch_assoc();
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
    $totalAmount = (float)$booking['total_amount'];
    
    // Add GST if enabled (12%)
    if ($gstEnabled) {
        $baseAmount = $totalAmount;
        $gstAmount = round($baseAmount * 0.12, 2);
        $totalWithGst = $baseAmount + $gstAmount;
        
        $baseFare = round($baseAmount * 0.85, 2);
        $serviceTaxAmount = $baseAmount - $baseFare;
        
        // Updated totals with GST
        $finalAmount = $totalWithGst;
    } else {
        // Original calculation (15% tax)
        $baseFare = round($totalAmount * 0.85, 2);
        $serviceTaxAmount = $totalAmount - $baseFare;
        $gstAmount = 0;
        $finalAmount = $totalAmount;
    }
    
    // Create invoice record in invoices table if it exists
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
        'base_fare' => $baseFare,
        'service_tax_amount' => $serviceTaxAmount,
        'gst_enabled' => $gstEnabled,
        'gst_amount' => $gstAmount,
        'gst_number' => $gstEnabled ? $gstDetails['gstNumber'] : '',
        'company_name' => $gstEnabled ? $gstDetails['companyName'] : '',
        'company_address' => $gstEnabled ? $gstDetails['companyAddress'] : '',
        'total_amount' => $finalAmount,
        'invoice_date' => $invoiceDate,
        'status' => 'generated',
    ];
    
    // Check if invoices table exists, create it if needed
    try {
        $checkTableResult = $conn->query("SHOW TABLES LIKE 'invoices'");
        if ($checkTableResult->num_rows === 0) {
            $createInvoicesTableSql = "
                CREATE TABLE invoices (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    invoice_number VARCHAR(50) NOT NULL UNIQUE,
                    booking_id INT NOT NULL,
                    booking_number VARCHAR(50) NOT NULL,
                    passenger_name VARCHAR(100) NOT NULL,
                    passenger_email VARCHAR(100) NOT NULL,
                    passenger_phone VARCHAR(20) NOT NULL,
                    trip_type VARCHAR(20) NOT NULL,
                    trip_mode VARCHAR(20) NOT NULL,
                    pickup_location TEXT NOT NULL,
                    drop_location TEXT,
                    pickup_date DATETIME NOT NULL,
                    cab_type VARCHAR(50) NOT NULL,
                    base_fare DECIMAL(10,2) NOT NULL,
                    service_tax_amount DECIMAL(10,2) NOT NULL,
                    gst_enabled TINYINT(1) DEFAULT 0,
                    gst_amount DECIMAL(10,2) DEFAULT 0,
                    gst_number VARCHAR(50),
                    company_name VARCHAR(100),
                    company_address TEXT,
                    total_amount DECIMAL(10,2) NOT NULL,
                    invoice_date DATE NOT NULL,
                    status VARCHAR(20) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ";
            $conn->query($createInvoicesTableSql);
            if ($conn->error) {
                logGenerateInvoiceError("Error creating invoices table", ['error' => $conn->error]);
            }
        } else {
            // Check if GST columns exist, add them if they don't
            $checkColumnResult = $conn->query("SHOW COLUMNS FROM invoices LIKE 'gst_enabled'");
            if ($checkColumnResult->num_rows === 0) {
                $conn->query("ALTER TABLE invoices 
                    ADD COLUMN gst_enabled TINYINT(1) DEFAULT 0,
                    ADD COLUMN gst_amount DECIMAL(10,2) DEFAULT 0,
                    ADD COLUMN gst_number VARCHAR(50),
                    ADD COLUMN company_name VARCHAR(100),
                    ADD COLUMN company_address TEXT,
                    CHANGE tax_amount service_tax_amount DECIMAL(10,2) NOT NULL");
            }
        }
    } catch (Exception $e) {
        logGenerateInvoiceError("Error checking/creating invoices table", ['error' => $e->getMessage()]);
        // Continue execution - we'll try to handle without the table if needed
    }
    
    // Check if invoice already exists for this booking
    try {
        $checkInvoiceStmt = $conn->prepare("SELECT id FROM invoices WHERE booking_id = ?");
        $checkInvoiceStmt->bind_param("i", $bookingId);
        $checkInvoiceStmt->execute();
        $invoiceResult = $checkInvoiceStmt->get_result();
        
        if ($invoiceResult->num_rows > 0) {
            $existingInvoice = $invoiceResult->fetch_assoc();
            $invoiceId = $existingInvoice['id'];
            
            // Update invoice with new GST settings
            $updateSql = "UPDATE invoices SET 
                status = 'generated', 
                gst_enabled = ?, 
                gst_amount = ?,
                gst_number = ?,
                company_name = ?,
                company_address = ?,
                base_fare = ?,
                service_tax_amount = ?,
                total_amount = ?,
                updated_at = NOW() 
                WHERE id = ?";
            
            $updateStmt = $conn->prepare($updateSql);
            $gstEnabledInt = $gstEnabled ? 1 : 0;
            $updateStmt->bind_param(
                "idsssdddi",
                $gstEnabledInt,
                $invoiceData['gst_amount'],
                $invoiceData['gst_number'],
                $invoiceData['company_name'],
                $invoiceData['company_address'],
                $invoiceData['base_fare'],
                $invoiceData['service_tax_amount'],
                $invoiceData['total_amount'],
                $invoiceId
            );
            $updateStmt->execute();
        } else {
            // Insert new invoice
            $insertSql = "INSERT INTO invoices (invoice_number, booking_id, booking_number, passenger_name, passenger_email, 
                        passenger_phone, trip_type, trip_mode, pickup_location, drop_location, pickup_date, cab_type, 
                        base_fare, service_tax_amount, gst_enabled, gst_amount, gst_number, company_name, company_address,
                        total_amount, invoice_date, status) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $insertStmt = $conn->prepare($insertSql);
            $gstEnabledInt = $gstEnabled ? 1 : 0;
            $insertStmt->bind_param(
                "sisssssssssddiidssdss",
                $invoiceData['invoice_number'],
                $invoiceData['booking_id'],
                $invoiceData['booking_number'],
                $invoiceData['passenger_name'],
                $invoiceData['passenger_email'],
                $invoiceData['passenger_phone'],
                $invoiceData['trip_type'],
                $invoiceData['trip_mode'],
                $invoiceData['pickup_location'],
                $invoiceData['drop_location'],
                $invoiceData['pickup_date'],
                $invoiceData['cab_type'],
                $invoiceData['base_fare'],
                $invoiceData['service_tax_amount'],
                $gstEnabledInt,
                $invoiceData['gst_amount'],
                $invoiceData['gst_number'],
                $invoiceData['company_name'],
                $invoiceData['company_address'],
                $invoiceData['total_amount'],
                $invoiceData['invoice_date'],
                $invoiceData['status']
            );
            $insertStmt->execute();
            
            // Update booking to indicate invoice has been created
            try {
                $updateBookingStmt = $conn->prepare("UPDATE bookings SET invoice_generated = 1 WHERE id = ?");
                if ($conn->error) {
                    // If invoice_generated column doesn't exist, we'll add it
                    $conn->query("ALTER TABLE bookings ADD COLUMN invoice_generated TINYINT(1) DEFAULT 0");
                    $updateBookingStmt = $conn->prepare("UPDATE bookings SET invoice_generated = 1 WHERE id = ?");
                }
                $updateBookingStmt->bind_param("i", $bookingId);
                $updateBookingStmt->execute();
            } catch (Exception $e) {
                logGenerateInvoiceError("Error updating booking's invoice status", ['error' => $e->getMessage()]);
                // Continue execution - this is not critical
            }
        }
    } catch (Exception $e) {
        logGenerateInvoiceError("Error creating/updating invoice record", ['error' => $e->getMessage()]);
        // Continue execution - we can still generate the invoice even if we couldn't save it
    }
    
    // Add invoice download URL to response
    $invoiceUrl = "/api/download-invoice.php?id=" . $bookingId . ($gstEnabled ? "&gst=1" : "");
    $pdfUrl = "/api/download-invoice.php?id=" . $bookingId . "&format=pdf" . ($gstEnabled ? "&gst=1" : "");
    
    // Generate HTML invoice for response
    $invoiceHtml = generateInvoiceHTML($invoiceData);
    
    // Send success response with invoice data
    sendJsonResponse([
        'status' => 'success', 
        'message' => 'Invoice generated successfully',
        'data' => [
            'invoiceNumber' => $invoiceNumber,
            'invoiceDate' => $invoiceDate,
            'bookingDetails' => [
                'id' => (int)$booking['id'],
                'bookingNumber' => $booking['booking_number'],
                'passengerName' => $booking['passenger_name'],
                'tripType' => $booking['trip_type'],
                'pickupDate' => $booking['pickup_date'],
                'cabType' => $booking['cab_type']
            ],
            'fareBreakdown' => [
                'baseFare' => $baseFare,
                'serviceTax' => $serviceTaxAmount,
                'gstEnabled' => $gstEnabled,
                'gstAmount' => $gstAmount,
                'gstDetails' => $gstEnabled ? $gstDetails : null,
                'totalAmount' => $finalAmount
            ],
            'downloadUrl' => $invoiceUrl,
            'pdfDownloadUrl' => $pdfUrl,
            'invoiceHtml' => $invoiceHtml
        ]
    ]);

} catch (Exception $e) {
    logGenerateInvoiceError("Unhandled error", ['error' => $e->getMessage()]);
    sendJsonResponse([
        'status' => 'error', 
        'message' => 'Failed to generate invoice: ' . $e->getMessage(),
        'error_details' => $debugMode ? $e->getMessage() : null
    ], 500);
}

// Function to generate HTML invoice
function generateInvoiceHTML($invoiceData) {
    $hasGst = $invoiceData['gst_enabled'] && $invoiceData['gst_amount'] > 0;
    $companyInfo = '';
    
    if ($hasGst && !empty($invoiceData['gst_number'])) {
        $companyInfo = '
        <div class="company-gst-details">
            <h3>Billing To:</h3>
            <p><strong>' . htmlspecialchars($invoiceData['company_name']) . '</strong></p>
            <p>GST Number: ' . htmlspecialchars($invoiceData['gst_number']) . '</p>
            <p>' . nl2br(htmlspecialchars($invoiceData['company_address'])) . '</p>
        </div>';
    }
    
    $gstRow = '';
    if ($hasGst) {
        $gstRow = '
        <tr>
            <td>GST (12%)</td>
            <td>₹ ' . number_format($invoiceData['gst_amount'], 2) . '</td>
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
                    <p>' . htmlspecialchars($invoiceData['passenger_name']) . '</p>
                    <p>Phone: ' . htmlspecialchars($invoiceData['passenger_phone']) . '</p>
                    <p>Email: ' . htmlspecialchars($invoiceData['passenger_email']) . '</p>
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
                <p><strong>Pickup Location:</strong> ' . htmlspecialchars($invoiceData['pickup_location']) . '</p>
                ' . ($invoiceData['drop_location'] ? '<p><strong>Drop Location:</strong> ' . htmlspecialchars($invoiceData['drop_location']) . '</p>' : '') . '
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
                        <td>₹ ' . number_format($invoiceData['base_fare'], 2) . '</td>
                    </tr>
                    <tr>
                        <td>Service Tax</td>
                        <td>₹ ' . number_format($invoiceData['service_tax_amount'], 2) . '</td>
                    </tr>
                    ' . $gstRow . '
                    <tr class="total-row">
                        <td>Total Amount</td>
                        <td>₹ ' . number_format($invoiceData['total_amount'], 2) . '</td>
                    </tr>
                </table>
            </div>
            
            <div class="company-info">
                <p>Thank you for choosing Vishakapatnam Cab Services.</p>
                <p>For any questions regarding this invoice, please contact support@vizagcabs.com</p>
                ' . ($hasGst ? '<p><strong>GST Number:</strong> GSTIN27AABCV1234Z1ZA</p>' : '') . '
            </div>
        </div>
    </body>
    </html>
    ';
    
    return $html;
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
