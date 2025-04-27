<?php
require_once __DIR__ . '/../../config.php';

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    sendJsonResponse(['status' => 'success'], 200);
    exit;
}

try {
    // Get booking ID and GST details
    $bookingId = null;
    $gstEnabled = false;
    $gstDetails = null;
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $jsonData = file_get_contents('php://input');
        $data = json_decode($jsonData, true);
        
        if (isset($data['bookingId'])) {
            $bookingId = $data['bookingId'];
            $gstEnabled = isset($data['gstEnabled']) ? filter_var($data['gstEnabled'], FILTER_VALIDATE_BOOLEAN) : false;
            $gstDetails = isset($data['gstDetails']) ? $data['gstDetails'] : null;
        }
    } else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $bookingId = isset($_GET['id']) ? $_GET['id'] : null;
        $gstEnabled = isset($_GET['gstEnabled']) ? filter_var($_GET['gstEnabled'], FILTER_VALIDATE_BOOLEAN) : false;
        
        if (isset($_GET['gstNumber']) && isset($_GET['companyName'])) {
            $gstDetails = [
                'gstNumber' => $_GET['gstNumber'],
                'companyName' => $_GET['companyName'],
                'companyAddress' => isset($_GET['companyAddress']) ? $_GET['companyAddress'] : ''
            ];
        }
    }

    if (!$bookingId) {
        sendJsonResponse(['status' => 'error', 'message' => 'Missing booking ID'], 400);
        exit;
    }

    // Connect to database
    $conn = getDbConnection();
    
    // Get booking details
    $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
    $stmt->bind_param("i", $bookingId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
        exit;
    }
    
    $booking = $result->fetch_assoc();
    
    // Generate invoice number
    $invoiceNumber = 'INV-' . date('Ymd') . '-' . $booking['id'];
    
    // Calculate tax components
    $baseAmount = $booking['total_amount'];
    $taxRate = $gstEnabled ? 0.12 : 0.05;
    $baseAmountBeforeTax = round($baseAmount / (1 + $taxRate), 2);
    $taxAmount = $baseAmount - $baseAmountBeforeTax;
    
    if ($gstEnabled) {
        $cgstAmount = round($taxAmount / 2, 2);
        $sgstAmount = $taxAmount - $cgstAmount;
    }
    
    // Create invoice HTML
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
                <p>Date: ' . date('d M Y') . '</p>
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
                    <td>Base Fare</td>
                    <td style="text-align: right;">₹ ' . number_format($baseAmountBeforeTax, 2) . '</td>
                </tr>';
                
    if ($gstEnabled) {
        $invoiceHtml .= '
                <tr>
                    <td>CGST (6%)</td>
                    <td style="text-align: right;">₹ ' . number_format($cgstAmount, 2) . '</td>
                </tr>
                <tr>
                    <td>SGST (6%)</td>
                    <td style="text-align: right;">₹ ' . number_format($sgstAmount, 2) . '</td>
                </tr>';
    } else {
        $invoiceHtml .= '
                <tr>
                    <td>Service Tax (5%)</td>
                    <td style="text-align: right;">₹ ' . number_format($taxAmount, 2) . '</td>
                </tr>';
    }
    
    $invoiceHtml .= '
                <tr class="total-row">
                    <td>Total Amount</td>
                    <td style="text-align: right;">₹ ' . number_format($baseAmount, 2) . '</td>
                </tr>
            </table>
        </div>
        
        <div class="footer">
            <p>Thank you for choosing Vizag Cab Services.</p>
            <p>For any questions regarding this invoice, please contact support@vizagcabs.com</p>
        </div>
    </div>
</body>
</html>';

    
    // Store invoice in database
    $stmt = $conn->prepare("
        INSERT INTO invoices (
            booking_id, invoice_number, invoice_date,
            base_amount, tax_amount, total_amount,
            gst_enabled, gst_number, company_name,
            company_address, invoice_html
        ) VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            invoice_date = NOW(),
            base_amount = ?,
            tax_amount = ?,
            total_amount = ?,
            gst_enabled = ?,
            gst_number = ?,
            company_name = ?,
            company_address = ?,
            invoice_html = ?
    ");
    
    $gstEnabledInt = $gstEnabled ? 1 : 0;
    $gstNumberVal = ($gstEnabled && $gstDetails) ? $gstDetails['gstNumber'] : null;
    $companyNameVal = ($gstEnabled && $gstDetails) ? $gstDetails['companyName'] : null;
    $companyAddressVal = ($gstEnabled && $gstDetails) ? $gstDetails['companyAddress'] : null;
    
    $stmt->bind_param(
        "isdddiasssdddiasss",
        $booking['id'],
        $invoiceNumber,
        $baseAmountBeforeTax,
        $taxAmount,
        $baseAmount,
        $gstEnabledInt,
        $gstNumberVal,
        $companyNameVal,
        $companyAddressVal,
        $invoiceHtml,
        $baseAmountBeforeTax,
        $taxAmount,
        $baseAmount,
        $gstEnabledInt,
        $gstNumberVal,
        $companyNameVal,
        $companyAddressVal,
        $invoiceHtml
    );
    
    $stmt->execute();
    
    // Return success response
    sendJsonResponse([
        'status' => 'success',
        'message' => 'Invoice generated successfully',
        'data' => [
            'invoiceNumber' => $invoiceNumber,
            'invoiceDate' => date('Y-m-d'),
            'bookingNumber' => $booking['booking_number'],
            'passengerName' => $booking['passenger_name'],
            'totalAmount' => $baseAmount,
            'baseAmount' => $baseAmountBeforeTax,
            'taxAmount' => $taxAmount,
            'gstEnabled' => $gstEnabled,
            'invoiceHtml' => $invoiceHtml,
            'gstDetails' => $gstEnabled ? $gstDetails : null
        ]
    ]);

} catch (Exception $e) {
    logError("Invoice generation error", ['error' => $e->getMessage()]);
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Failed to generate invoice: ' . $e->getMessage()
    ], 500);
}

if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
