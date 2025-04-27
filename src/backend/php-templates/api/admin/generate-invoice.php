
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// Clear any buffer
if (ob_get_level()) ob_end_clean();

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Debug mode
$debugMode = isset($_GET['debug']) || isset($_SERVER['HTTP_X_DEBUG']);

// Handle OPTIONS request
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
    // Get booking ID from query parameter
    $bookingId = isset($_GET['id']) ? $_GET['id'] : null;
    
    // Get GST parameters from request
    $gstEnabled = isset($_GET['gstEnabled']) && $_GET['gstEnabled'] == '1';
    $gstNumber = isset($_GET['gstNumber']) ? $_GET['gstNumber'] : '';
    $companyName = isset($_GET['companyName']) ? $_GET['companyName'] : '';
    $companyAddress = isset($_GET['companyAddress']) ? $_GET['companyAddress'] : '';
    $isIGST = isset($_GET['isIGST']) && $_GET['isIGST'] == '1';
    
    if (!$bookingId) {
        sendJsonResponse(['status' => 'error', 'message' => 'Missing booking ID'], 400);
    }

    // Connect to database with improved error handling
    try {
        $conn = getDbConnectionWithRetry();
        if (!$conn) {
            throw new Exception("Database connection failed after retries");
        }
    } catch (Exception $e) {
        // For development, if database connection fails, provide mock data
        if ($debugMode) {
            $mockBooking = [
                'id' => $bookingId,
                'booking_number' => 'INV-' . date('Ymd') . '-' . $bookingId,
                'passenger_name' => 'Test User',
                'passenger_email' => 'test@example.com',
                'passenger_phone' => '9876543210',
                'pickup_location' => 'Vizag RTC Complex, Visakhapatnam',
                'drop_location' => 'Hyderabad, Telangana',
                'pickup_date' => date('Y-m-d H:i:s'),
                'return_date' => null,
                'cab_type' => 'Sedan',
                'total_amount' => 18333.00,
                'status' => 'confirmed',
                'trip_type' => 'outstation',
                'trip_mode' => 'oneway',
                'created_at' => date('Y-m-d H:i:s')
            ];
        } else {
            throw $e; // Re-throw if not in debug mode
        }
    }

    // Fetch booking data from database if connection succeeded
    if (!isset($mockBooking)) {
        $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
        $stmt->bind_param("i", $bookingId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
        }
        
        $booking = $result->fetch_assoc();
    } else {
        $booking = $mockBooking;
    }

    // Generate invoice number
    $invoiceNumber = 'INV-' . date('Ymd') . '-' . $bookingId;
    $invoiceDate = date('d M Y');

    // Calculate tax amounts - using 12% GST/IGST instead of 5% service tax
    $totalAmount = floatval($booking['total_amount']);
    $baseFare = $totalAmount;
    $gstAmount = 0;
    
    if ($gstEnabled) {
        // 12% GST/IGST calculation
        $baseFare = round($totalAmount / 1.12, 2); // Base fare is total / 1.12 for 12% tax
        $gstAmount = round($totalAmount - $baseFare, 2);
    }
    
    // Generate HTML content for the invoice
    $invoiceHtml = '
    <div class="invoice-container">
        <div class="invoice-header">
            <div>
                <h1>INVOICE</h1>
                <p>Visakhapatnam Cab Services</p>
            </div>
            <div>
                <p><strong>Invoice #:</strong> ' . $invoiceNumber . '</p>
                <p><strong>Date:</strong> ' . $invoiceDate . '</p>
                <p><strong>Booking #:</strong> ' . $booking['booking_number'] . '</p>
            </div>
        </div>
        
        <div class="invoice-details">
            <div class="customer-details">
                <h3>Billed To:</h3>
                <p>' . htmlspecialchars($booking['passenger_name']) . '</p>
                <p>Phone: ' . htmlspecialchars($booking['passenger_phone']) . '</p>
                <p>Email: ' . htmlspecialchars($booking['passenger_email']) . '</p>';
    
    if ($gstEnabled) {
        $invoiceHtml .= '
                <p><strong>Company:</strong> ' . htmlspecialchars($companyName) . '</p>
                <p><strong>Address:</strong> ' . htmlspecialchars($companyAddress) . '</p>
                <p><strong>GST Number:</strong> ' . htmlspecialchars($gstNumber) . '</p>';
    }
                
    $invoiceHtml .= '
            </div>
            <div class="invoice-summary">
                <h3>Trip Summary:</h3>
                <p><strong>Trip Type:</strong> ' . ucfirst($booking['trip_type'] ?? 'Standard') . ' (' . ucfirst($booking['trip_mode'] ?? 'oneway') . ')</p>
                <p><strong>Date:</strong> ' . date('d M Y', strtotime($booking['pickup_date'])) . '</p>
                <p><strong>Vehicle:</strong> ' . $booking['cab_type'] . '</p>
            </div>
        </div>
        
        <div class="booking-details">
            <h3>Trip Details:</h3>
            <p><strong>Pickup Location:</strong> ' . htmlspecialchars($booking['pickup_location']) . '</p>';
            
    if (!empty($booking['drop_location'])) {
        $invoiceHtml .= '<p><strong>Drop Location:</strong> ' . htmlspecialchars($booking['drop_location']) . '</p>';
    }
    
    $invoiceHtml .= '
            <p><strong>Pickup Date/Time:</strong> ' . date('d M Y, h:i A', strtotime($booking['pickup_date'])) . '</p>
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
                    <td>₹ ' . number_format($baseFare, 2) . '</td>
                </tr>';
    
    if ($gstEnabled) {
        if ($isIGST) {
            $invoiceHtml .= '
                <tr>
                    <td>IGST (12%)</td>
                    <td>₹ ' . number_format($gstAmount, 2) . '</td>
                </tr>';
        } else {
            $cgstAmount = round($gstAmount / 2, 2);
            $sgstAmount = $gstAmount - $cgstAmount;
            
            $invoiceHtml .= '
                <tr>
                    <td>CGST (6%)</td>
                    <td>₹ ' . number_format($cgstAmount, 2) . '</td>
                </tr>
                <tr>
                    <td>SGST (6%)</td>
                    <td>₹ ' . number_format($sgstAmount, 2) . '</td>
                </tr>';
        }
    }
    
    $invoiceHtml .= '
                <tr class="total-row">
                    <td>Total Amount</td>
                    <td>₹ ' . number_format($totalAmount, 2) . '</td>
                </tr>
            </table>
        </div>
        
        <div class="company-info">
            <p>Thank you for choosing Visakhapatnam Cab Services.</p>
            <p>For any questions regarding this invoice, please contact support@vizagcabs.com</p>';
    
    if ($gstEnabled) {
        $invoiceHtml .= '
            <p><small>This is a computer generated invoice and does not require a physical signature.</small></p>';
    }
    
    $invoiceHtml .= '
        </div>
    </div>
    
    <style>
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
        }
        .invoice-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid #ddd;
        }
        .invoice-header div:first-child {
            float: left;
        }
        .invoice-header div:last-child {
            float: right;
            text-align: right;
        }
        .invoice-details {
            margin-bottom: 40px;
            overflow: auto;
            display: flex;
            justify-content: space-between;
        }
        .customer-details {
            width: 48%;
        }
        .invoice-summary {
            width: 48%;
            text-align: right;
        }
        .booking-details {
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
        table td:last-child, table th:last-child {
            text-align: right;
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
    ';

    // Store invoice in database if database is available
    if (isset($conn) && $conn instanceof mysqli) {
        try {
            // Check if invoices table exists
            $result = $conn->query("SHOW TABLES LIKE 'invoices'");
            if ($result->num_rows == 0) {
                // Create invoices table
                $createTableSql = "
                    CREATE TABLE invoices (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        invoice_number VARCHAR(50) NOT NULL,
                        booking_id INT NOT NULL,
                        invoice_html TEXT NOT NULL,
                        gst_enabled TINYINT(1) DEFAULT 0,
                        gst_number VARCHAR(50),
                        company_name VARCHAR(100),
                        company_address TEXT,
                        is_igst TINYINT(1) DEFAULT 0,
                        base_amount DECIMAL(10,2) NOT NULL,
                        gst_amount DECIMAL(10,2) DEFAULT 0,
                        total_amount DECIMAL(10,2) NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE KEY (invoice_number)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                ";
                $conn->query($createTableSql);
            }

            // Check if invoice exists for this booking
            $stmt = $conn->prepare("SELECT id FROM invoices WHERE booking_id = ?");
            $stmt->bind_param("i", $bookingId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows > 0) {
                // Update existing invoice
                $row = $result->fetch_assoc();
                $invoiceId = $row['id'];
                
                $updateStmt = $conn->prepare("
                    UPDATE invoices 
                    SET invoice_html = ?, gst_enabled = ?, gst_number = ?, company_name = ?, 
                        company_address = ?, is_igst = ?, base_amount = ?, gst_amount = ?, total_amount = ?
                    WHERE id = ?
                ");
                
                $gstEnabledValue = $gstEnabled ? 1 : 0;
                $isIgstValue = $isIGST ? 1 : 0;
                
                $updateStmt->bind_param(
                    "sisssiiddi",
                    $invoiceHtml,
                    $gstEnabledValue,
                    $gstNumber,
                    $companyName,
                    $companyAddress,
                    $isIgstValue,
                    $baseFare,
                    $gstAmount,
                    $totalAmount,
                    $invoiceId
                );
                
                $updateStmt->execute();
            } else {
                // Insert new invoice
                $insertStmt = $conn->prepare("
                    INSERT INTO invoices (
                        invoice_number, booking_id, invoice_html, gst_enabled, gst_number, 
                        company_name, company_address, is_igst, base_amount, gst_amount, total_amount
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                
                $gstEnabledValue = $gstEnabled ? 1 : 0;
                $isIgstValue = $isIGST ? 1 : 0;
                
                $insertStmt->bind_param(
                    "sisississdd",
                    $invoiceNumber,
                    $bookingId,
                    $invoiceHtml,
                    $gstEnabledValue,
                    $gstNumber,
                    $companyName,
                    $companyAddress,
                    $isIgstValue,
                    $baseFare,
                    $gstAmount,
                    $totalAmount
                );
                
                $insertStmt->execute();
            }
            
        } catch (Exception $e) {
            // Log the error but continue since invoice generation is not critical
            error_log("Error storing invoice in database: " . $e->getMessage());
        }
    }

    // Return the invoice data
    sendJsonResponse([
        'status' => 'success',
        'data' => [
            'invoiceNumber' => $invoiceNumber,
            'invoiceDate' => $invoiceDate,
            'invoiceHtml' => $invoiceHtml,
            'bookingId' => $bookingId,
            'bookingNumber' => $booking['booking_number'],
            'baseFare' => $baseFare,
            'gstAmount' => $gstAmount,
            'isIGST' => $isIGST,
            'totalAmount' => $totalAmount
        ]
    ]);

} catch (Exception $e) {
    sendJsonResponse([
        'status' => 'error', 
        'message' => 'Failed to generate invoice: ' . $e->getMessage(),
        'error_details' => $debugMode ? $e->getTraceAsString() : null
    ], 500);
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
