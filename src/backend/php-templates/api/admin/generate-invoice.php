<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// CRITICAL: Set all response headers first before any output
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Clear any potential output buffer to avoid content contamination
if (ob_get_level()) ob_end_clean();

// Debug mode
$debugMode = isset($_GET['debug']) || isset($_SERVER['HTTP_X_DEBUG']);

// For front-end testing, check if we're in demo mode
$demoMode = isset($_GET['demo']) || isset($_SERVER['HTTP_X_DEMO_MODE']);

// Log request
error_log("Admin generate-invoice endpoint called: " . $_SERVER['REQUEST_METHOD']);

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

// Generate a proper invoice number
function generateInvoiceNumber($bookingId, $customNumber = '') {
    if (!empty($customNumber)) {
        return $customNumber;
    }
    return 'INV-' . date('Ymd') . '-' . $bookingId;
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
    // Get booking ID
    $bookingId = null;
    $gstEnabled = false;
    $gstDetails = null;
    $isIGST = false;
    $includeTax = true;
    $customInvoiceNumber = '';
    
    // Handle both GET and POST methods
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $jsonData = file_get_contents('php://input');
        $data = json_decode($jsonData, true);
        
        if (isset($data['bookingId'])) {
            $bookingId = (int)$data['bookingId'];
        }
        
        if (isset($data['gstEnabled'])) {
            $gstEnabled = filter_var($data['gstEnabled'], FILTER_VALIDATE_BOOLEAN);
        }
        
        if (isset($data['isIGST'])) {
            $isIGST = filter_var($data['isIGST'], FILTER_VALIDATE_BOOLEAN);
        }
        
        if (isset($data['includeTax'])) {
            $includeTax = filter_var($data['includeTax'], FILTER_VALIDATE_BOOLEAN);
        }
        
        if (isset($data['invoiceNumber'])) {
            $customInvoiceNumber = $data['invoiceNumber'];
        }
        
        if (isset($data['gstDetails'])) {
            $gstDetails = $data['gstDetails'];
        }
    } 
    else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (isset($_GET['id'])) {
            $bookingId = (int)$_GET['id'];
        }
        
        if (isset($_GET['gstEnabled'])) {
            $gstEnabled = filter_var($_GET['gstEnabled'], FILTER_VALIDATE_BOOLEAN);
        }
        
        if (isset($_GET['isIGST'])) {
            $isIGST = filter_var($_GET['isIGST'], FILTER_VALIDATE_BOOLEAN);
        }
        
        if (isset($_GET['includeTax'])) {
            $includeTax = filter_var($_GET['includeTax'], FILTER_VALIDATE_BOOLEAN);
        }
        
        if (isset($_GET['invoiceNumber'])) {
            $customInvoiceNumber = $_GET['invoiceNumber'];
        }
        
        // Get GST details from query params if present
        if (isset($_GET['gstNumber']) && isset($_GET['companyName'])) {
            $gstDetails = [
                'gstNumber' => $_GET['gstNumber'],
                'companyName' => $_GET['companyName'],
                'companyAddress' => isset($_GET['companyAddress']) ? $_GET['companyAddress'] : '',
            ];
        }
    }
    
    logInvoiceError("Generate invoice request", [
        'bookingId' => $bookingId, 
        'gstEnabled' => $gstEnabled ? "true" : "false",
        'isIGST' => $isIGST ? "true" : "false",
        'includeTax' => $includeTax ? "true" : "false",
        'customInvoiceNumber' => $customInvoiceNumber
    ]);
    
    if (!$bookingId && !$demoMode) {
        sendJsonResponse(['status' => 'error', 'message' => 'Missing booking ID'], 400);
    }

    // Connect to database - direct connection for reliability
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
        logInvoiceError("Database connection successful");
    } catch (Exception $e) {
        logInvoiceError("Database connection error", ['error' => $e->getMessage()]);
        if ($demoMode) {
            // Return mock data in demo mode
            error_log("Demo mode enabled for invoice generation");
        } else {
            // In production, return an error
            sendJsonResponse([
                'status' => 'error', 
                'message' => 'Database connection failed',
                'error_details' => $debugMode ? $e->getMessage() : null
            ], 500);
        }
    }
    
    // Get booking details from database (or use mock data in demo mode)
    $booking = null;
    $extraChargesArr = [];
    $totalExtraCharges = 0;
    
    if (!$demoMode && isset($conn)) {
        try {
            $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
            $stmt->bind_param("i", $bookingId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
            }
            
            $booking = $result->fetch_assoc();
            logInvoiceError("Booking found", ['booking_id' => $booking['id'], 'amount' => $booking['total_amount']]);

            // Parse extra_charges robustly from booking
            $extraChargesArr = [];
            $totalExtraCharges = 0;
            if (!empty($booking['extra_charges'])) {
                $extraChargesArr = json_decode($booking['extra_charges'], true);
            } elseif (!empty($booking['extraCharges'])) {
                $extraChargesArr = is_array($booking['extraCharges']) ? $booking['extraCharges'] : json_decode($booking['extraCharges'], true);
            }
            if (is_array($extraChargesArr)) {
                foreach ($extraChargesArr as $charge) {
                    if (isset($charge['amount'])) {
                        $totalExtraCharges += floatval($charge['amount']);
                    }
                }
            } else {
                $extraChargesArr = [];
            }
            logInvoiceError('Loaded extra charges for invoice', ['booking_id' => $booking['id'], 'extraChargesArr' => $extraChargesArr]);

            logInvoiceError('Raw extra_charges in booking', [
                'booking_id' => $booking['id'],
                'extra_charges' => isset($booking['extra_charges']) ? $booking['extra_charges'] : null,
                'extraCharges' => isset($booking['extraCharges']) ? $booking['extraCharges'] : null
            ]);
        } catch (Exception $e) {
            // If there's a database error, enable demo mode for testing
            $demoMode = true;
            logInvoiceError("Error fetching booking", ['bookingId' => $bookingId, 'error' => $e->getMessage()]);
            error_log("Error fetching booking $bookingId: " . $e->getMessage() . ". Switching to demo mode.");
        }
    } else {
        // In demo mode, create a mock booking
        $demoMode = true;
    }
    
    if ($demoMode) {
        // Use mock data for testing purposes
        $booking = [
            'id' => $bookingId ?? 12345,
            'booking_number' => 'CB' . rand(1000000000, 9999999999),
            'passenger_name' => 'John Demo',
            'passenger_email' => 'john@example.com',
            'passenger_phone' => '9876543210',
            'trip_type' => 'local',
            'trip_mode' => 'outstation',
            'pickup_location' => 'Visakhapatnam Airport',
            'drop_location' => 'Araku Valley',
            'pickup_date' => date('Y-m-d H:i:s'),
            'cab_type' => 'Innova Crysta',
            'total_amount' => 3500,
            'driver_name' => 'Rajesh Kumar',
            'driver_phone' => '9876543210',
            'vehicle_number' => 'AP 31 AB 1234',
            'status' => 'confirmed',
            'extra_charges' => json_encode([
                ['label' => 'Toll Fee', 'amount' => 100],
                ['label' => 'Parking', 'amount' => 50]
            ])
        ];
        $extraChargesArr = [
            ['label' => 'Toll Fee', 'amount' => 100],
            ['label' => 'Parking', 'amount' => 50]
        ];
        $totalExtraCharges = 150;
    }

    // Current date for invoice generation
    $currentDate = date('Y-m-d');
    $invoiceNumber = generateInvoiceNumber($booking['id'], $customInvoiceNumber);
    
    // Calculate tax components based on includeTax setting
    // Add extra charges to base fare before tax
    $totalAmount = (float)$booking['total_amount'];
    $baseFare = $totalAmount;
    if ($totalExtraCharges > 0) {
        $baseFare += $totalExtraCharges;
    }
    // GST rate is always 12% (either as IGST 12% or CGST 6% + SGST 6%)
    $gstRate = $gstEnabled ? 0.12 : 0; 
    // Convert string to number if needed
    if (!is_numeric($baseFare)) {
        $baseFare = floatval($baseFare);
    }
    // Ensure we have a valid amount
    if ($baseFare <= 0) {
        $baseFare = 0;
    }
    if ($includeTax && $gstEnabled) {
        // If tax is included in total amount (default)
        // We need to calculate: baseAmount = baseFare / (1 + gstRate)
        $baseAmountBeforeTax = $baseFare / (1 + $gstRate);
        $baseAmountBeforeTax = round($baseAmountBeforeTax, 2); // Round to 2 decimal places
        $taxAmount = $baseFare - $baseAmountBeforeTax;
        $taxAmount = round($taxAmount, 2); // Round to 2 decimal places
    } else if (!$includeTax && $gstEnabled) {
        // If tax is excluded from the base amount
        $baseAmountBeforeTax = $baseFare;
        $taxAmount = $baseFare * $gstRate;
        $taxAmount = round($taxAmount, 2); // Round to 2 decimal places
        $baseFare = $baseAmountBeforeTax + $taxAmount;
        $baseFare = round($baseFare, 2); // Round to ensure consistency
    } else {
        // No tax case
        $baseAmountBeforeTax = $baseFare;
        $taxAmount = 0;
    }
    
    // For GST, split into CGST and SGST or use IGST
    if ($gstEnabled) {
        if ($isIGST) {
            // Interstate - Use IGST (12%)
            $igstAmount = $taxAmount;
            $igstAmount = round($igstAmount, 2); // Round to ensure consistent display
            $cgstAmount = 0;
            $sgstAmount = 0;
        } else {
            // Intrastate - Split into CGST (6%) and SGST (6%)
            // Use exact division to ensure totals match
            $halfTax = $taxAmount / 2;
            $cgstAmount = round($halfTax, 2);
            $sgstAmount = round($taxAmount - $cgstAmount, 2); // Ensure the total is exact
            $igstAmount = 0;
        }
    } else {
        $cgstAmount = 0;
        $sgstAmount = 0;
        $igstAmount = 0;
    }
    
    // Ensure final total adds up correctly after rounding
    $finalTotal = $baseAmountBeforeTax + $cgstAmount + $sgstAmount + $igstAmount;
    $finalTotal = round($finalTotal, 2);
    
    // Create HTML content for invoice
    $invoiceHtml = '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice #' . $invoiceNumber . '</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; line-height: 1.6; }
        .invoice-container { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; padding: 30px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); }
        .invoice-header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
        .company-info { text-align: right; }
        .invoice-body { margin-bottom: 30px; }
        .customer-details, .invoice-summary { margin-bottom: 20px; }
        .section-title { color: #555; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 15px; }
        .trip-details { margin-bottom: 30px; }
        .fare-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .fare-table th, .fare-table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        .fare-table th { background-color: #f9f9f9; }
        .total-row { font-weight: bold; }
        .gst-details { border: 1px solid #ddd; padding: 10px; background-color: #f9f9f9; margin-bottom: 20px; }
        .gst-title { font-weight: bold; margin-bottom: 10px; }
        .footer { margin-top: 30px; text-align: center; font-size: 0.9em; color: #777; border-top: 1px solid #eee; padding-top: 20px; }
        .tax-note { font-size: 0.8em; color: #666; font-style: italic; margin-top: 5px; }
        @media print {
            body { margin: 0; padding: 0; }
            .invoice-container { box-shadow: none; border: none; padding: 20px; }
            @page { size: A4; margin: 10mm; }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="invoice-header">
            <div>
                <h1 style="margin: 0; color: #333;">INVOICE</h1>
                <p style="margin-top: 5px; color: #777;">Vizag Cab Services</p>
            </div>
            <div class="company-info">
                <h2 style="margin: 0;">#' . $invoiceNumber . '</h2>
                <p>Date: ' . date('d M Y', strtotime($currentDate)) . '</p>
                <p>Booking #: ' . $booking['booking_number'] . '</p>
            </div>
        </div>
        
        <div class="invoice-body">
            <div style="display: flex; justify-content: space-between;">
                <div class="customer-details" style="width: 48%;">
                    <h3 class="section-title">Customer Details</h3>
                    <p><strong>Name:</strong> ' . $booking['passenger_name'] . '</p>
                    <p><strong>Phone:</strong> ' . $booking['passenger_phone'] . '</p>
                    <p><strong>Email:</strong> ' . $booking['passenger_email'] . '</p>
                </div>
                
                <div class="invoice-summary" style="width: 48%;">
                    <h3 class="section-title">Trip Summary</h3>
                    <p><strong>Trip Type:</strong> ' . ucfirst($booking['trip_type']) . ($booking['trip_mode'] ? ' (' . ucfirst($booking['trip_mode']) . ')' : '') . '</p>
                    <p><strong>Date:</strong> ' . date('d M Y', strtotime($booking['pickup_date'])) . '</p>
                    <p><strong>Vehicle:</strong> ' . $booking['cab_type'] . '</p>
                </div>
            </div>
            
            <div class="trip-details">
                <h3 class="section-title">Trip Details</h3>
                <p><strong>Pickup:</strong> ' . $booking['pickup_location'] . '</p>
                ' . ($booking['drop_location'] ? '<p><strong>Drop:</strong> ' . $booking['drop_location'] . '</p>' : '') . '
                <p><strong>Pickup Time:</strong> ' . date('d M Y, h:i A', strtotime($booking['pickup_date'])) . '</p>
            </div>';
            
    if ($gstEnabled && $gstDetails) {
        $invoiceHtml .= '
            <div class="gst-details">
                <div class="gst-title">GST Details</div>
                <p><strong>GST Number:</strong> ' . htmlspecialchars($gstDetails['gstNumber']) . '</p>
                <p><strong>Company Name:</strong> ' . htmlspecialchars($gstDetails['companyName']) . '</p>
                <p><strong>Company Address:</strong> ' . htmlspecialchars($gstDetails['companyAddress']) . '</p>
            </div>';
    }
            
    $invoiceHtml .= '
            <h3 class="section-title">Fare Breakdown</h3>
            <table class="fare-table">
                <tr>
                    <th>Description</th>
                    <th style="text-align: right;">Amount</th>
                </tr>
                <tr>
                    <td>Base Fare' . ($includeTax && $gstEnabled ? ' (excluding tax)' : '') . '</td>
                    <td style="text-align: right;">₹ ' . number_format((float)$booking['total_amount'], 2) . '</td>
                </tr>';
    // Add extra charges as line items
    if (!empty($extraChargesArr)) {
        foreach ($extraChargesArr as $charge) {
            if ((isset($charge['label']) && $charge['label'] !== '') && isset($charge['amount'])) {
                $invoiceHtml .= '\n                <tr>\n                    <td>' . htmlspecialchars($charge['label']) . '</td>\n                    <td style="text-align: right;">₹ ' . number_format((float)$charge['amount'], 2) . '</td>\n                </tr>';
            }
        }
    } else {
        $invoiceHtml .= '\n                <tr>\n                    <td colspan="2" style="text-align:center; color:#888;">No extra charges</td>\n                </tr>';
    }
    
    $invoiceHtml .= '
                <tr class="total-row">
                    <td>Total Amount' . ($includeTax ? ' (including tax)' : ' (excluding tax)') . '</td>
                    <td style="text-align: right;">₹ ' . number_format($finalTotal, 2) . '</td>
                </tr>
            </table>';
            
    if (!$includeTax && $gstEnabled) {
        $invoiceHtml .= '
            <p class="tax-note">Note: This invoice shows base amounts excluding tax. Taxes will be charged separately.</p>';
    }
            
    $invoiceHtml .= '
        </div>
        
        <div class="footer">
            <p>Thank you for choosing Vizag Cab Services.</p>
            <p>For any questions regarding this invoice, please contact support@vizagcabs.com</p>
        </div>
    </div>
</body>
</html>';

    // Prepare response data
    $responseData = [
        'status' => 'success',
        'message' => 'Invoice generated successfully',
        'data' => [
            'invoiceNumber' => $invoiceNumber,
            'invoiceDate' => date('d M Y'),
            'bookingNumber' => $booking['booking_number'],
            'passengerName' => $booking['passenger_name'],
            'totalAmount' => $finalTotal,
            'baseAmount' => $baseAmountBeforeTax,
            'taxAmount' => $taxAmount,
            'gstEnabled' => $gstEnabled,
            'isIGST' => $isIGST,
            'includeTax' => $includeTax,
            'extraCharges' => $extraChargesArr,
            'totalExtraCharges' => $totalExtraCharges,
            'invoiceHtml' => $invoiceHtml
        ]
    ];
    
    if ($gstEnabled) {
        if ($isIGST) {
            $responseData['data']['igstAmount'] = $igstAmount;
        } else {
            $responseData['data']['cgstAmount'] = $cgstAmount;
            $responseData['data']['sgstAmount'] = $sgstAmount;
        }
        if ($gstDetails) {
            $responseData['data']['gstDetails'] = $gstDetails;
        }
    }
    
    // Store invoice in database if not in demo mode
    if (!$demoMode && isset($conn)) {
        try {
            // Check if invoice table exists, create if not
            $conn->query("
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
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");
            
            // Check if invoice already exists for this booking
            $checkStmt = $conn->prepare("SELECT id FROM invoices WHERE booking_id = ? ORDER BY id DESC LIMIT 1");
            $checkStmt->bind_param("i", $booking['id']);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            
            if ($checkResult->num_rows > 0) {
                // Update existing invoice
                $invoiceRow = $checkResult->fetch_assoc();
                $stmt = $conn->prepare("
                    UPDATE invoices SET 
                        invoice_number = ?,
                        invoice_date = ?, 
                        base_amount = ?, 
                        tax_amount = ?, 
                        total_amount = ?,
                        gst_enabled = ?,
                        is_igst = ?,
                        include_tax = ?,
                        gst_number = ?,
                        company_name = ?,
                        company_address = ?,
                        invoice_html = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ");
                
                $gstEnabledInt = $gstEnabled ? 1 : 0;
                $isIgstInt = $isIGST ? 1 : 0;
                $includeTaxInt = $includeTax ? 1 : 0;
                $gstNumberVal = ($gstEnabled && $gstDetails) ? $gstDetails['gstNumber'] : null;
                $companyNameVal = ($gstEnabled && $gstDetails) ? $gstDetails['companyName'] : null;
                $companyAddressVal = ($gstEnabled && $gstDetails) ? $gstDetails['companyAddress'] : null;
                
                $stmt->bind_param(
                    "ssdddiiiisssi",
                    $invoiceNumber,
                    $currentDate,
                    $baseAmountBeforeTax,
                    $taxAmount,
                    $finalTotal,
                    $gstEnabledInt,
                    $isIgstInt,
                    $includeTaxInt,
                    $gstNumberVal,
                    $companyNameVal,
                    $companyAddressVal,
                    $invoiceHtml,
                    $invoiceRow['id']
                );
                
                $success = $stmt->execute();
                
                if (!$success || $stmt->error) {
                    logInvoiceError("Error updating invoice", [
                        'error' => $stmt->error,
                        'id' => $invoiceRow['id'],
                        'success' => $success ? 'true' : 'false'
                    ]);
                } else {
                    $responseData['message'] = 'Invoice updated successfully';
                    logInvoiceError("Invoice updated successfully", [
                        'invoice_id' => $invoiceRow['id'],
                        'invoice_number' => $invoiceNumber,
                        'rows_affected' => $stmt->affected_rows
                    ]);
                }
            } else {
                // Insert new invoice
                $stmt = $conn->prepare("
                    INSERT INTO invoices (
                        booking_id, invoice_number, invoice_date, base_amount, 
                        tax_amount, total_amount, gst_enabled, is_igst, include_tax, 
                        gst_number, company_name, company_address, invoice_html
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                
                $gstEnabledInt = $gstEnabled ? 1 : 0;
                $isIgstInt = $isIGST ? 1 : 0;
                $includeTaxInt = $includeTax ? 1 : 0;
                $gstNumberVal = ($gstEnabled && $gstDetails) ? $gstDetails['gstNumber'] : null;
                $companyNameVal = ($gstEnabled && $gstDetails) ? $gstDetails['companyName'] : null;
                $companyAddressVal = ($gstEnabled && $gstDetails) ? $gstDetails['companyAddress'] : null;
                
                // Fix: Corrected the bind_param type string to match all 13 parameters
                $stmt->bind_param(
                    "issdddiiiisss",
                    $booking['id'],
                    $invoiceNumber,
                    $currentDate,
                    $baseAmountBeforeTax,
                    $taxAmount,
                    $finalTotal,
                    $gstEnabledInt,
                    $isIgstInt,
                    $includeTaxInt,
                    $gstNumberVal, 
                    $companyNameVal,
                    $companyAddressVal,
                    $invoiceHtml
                );
                
                $success = $stmt->execute();
                
                if (!$success || $stmt->error) {
                    logInvoiceError("Error inserting invoice", [
                        'error' => $stmt->error, 
                        'success' => $success ? 'true' : 'false'
                    ]);
                } else {
                    $responseData['message'] = 'Invoice generated and saved successfully';
                    $newId = $stmt->insert_id;
                    logInvoiceError("New invoice created", [
                        'booking_id' => $booking['id'], 
                        'invoice_id' => $newId,
                        'invoice_number' => $invoiceNumber
                    ]);
                }
            }
        } catch (Exception $e) {
            logInvoiceError("Error saving invoice to database", ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            // Continue and return the invoice even if saving to DB fails
        }
    }
    
    // Send invoice data response
    sendJsonResponse($responseData);

} catch (Exception $e) {
    logInvoiceError("Error generating invoice", ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
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
