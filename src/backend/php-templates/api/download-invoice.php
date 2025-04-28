
<?php
// Include configuration file
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/common/db_helper.php';

// CRITICAL: Clear all buffers first
while (ob_get_level()) ob_end_clean();

// Debug mode
$debugMode = isset($_GET['debug']) || isset($_SERVER['HTTP_X_DEBUG']);

// Set headers for PDF download
header('Content-Type: application/pdf');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: public');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    // Get booking ID
    $bookingId = isset($_GET['id']) ? (int)$_GET['id'] : null;
    
    if (!$bookingId) {
        throw new Exception('Missing booking ID');
    }
    
    // Get GST parameters
    $gstEnabled = isset($_GET['gstEnabled']) ? filter_var($_GET['gstEnabled'], FILTER_VALIDATE_BOOLEAN) : false;
    $gstNumber = isset($_GET['gstNumber']) ? $_GET['gstNumber'] : '';
    $companyName = isset($_GET['companyName']) ? $_GET['companyName'] : '';
    $isIGST = isset($_GET['isIGST']) ? filter_var($_GET['isIGST'], FILTER_VALIDATE_BOOLEAN) : false;
    $includeTax = isset($_GET['includeTax']) ? filter_var($_GET['includeTax'], FILTER_VALIDATE_BOOLEAN) : true;
    $customInvoiceNumber = isset($_GET['invoiceNumber']) ? $_GET['invoiceNumber'] : '';
    
    // Connect to database
    $conn = getDbConnectionWithRetry();
    
    // Get booking details
    $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
    $stmt->bind_param("i", $bookingId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        throw new Exception('Booking not found');
    }
    
    $booking = $result->fetch_assoc();
    
    // Generate invoice number
    $invoiceNumber = empty($customInvoiceNumber) ? 'INV-' . date('Ymd') . '-' . $bookingId : $customInvoiceNumber;
    
    // Create PDF content
    $content = "%PDF-1.7\n";
    $content .= "1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n";
    $content .= "2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n";
    $content .= "3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources <</Font <</F1 5 0 R /F2 6 0 R>> >> >>\nendobj\n";
    $content .= "5 0 obj\n<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>\nendobj\n";
    $content .= "6 0 obj\n<</Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold>>\nendobj\n";
    
    // Add invoice content
    $invoiceContent = "BT /F2 24 Tf 50 750 Td (Invoice #" . $invoiceNumber . ") Tj ET\n";
    $invoiceContent .= "BT /F1 12 Tf 50 720 Td (Date: " . date('d M Y') . ") Tj ET\n";
    
    // Set the content length
    $contentLength = strlen($invoiceContent);
    $content .= "4 0 obj\n<</Length $contentLength>>\nstream\n$invoiceContent\nendstream\nendobj\n";
    
    // Add PDF trailer
    $content .= "xref\n0 7\n0000000000 65535 f\n";
    $content .= "trailer\n<</Size 7 /Root 1 0 R>>\nstartxref\n" . strlen($content) . "\n%%EOF\n";
    
    // Set content length header
    header('Content-Length: ' . strlen($content));
    
    // Output PDF content
    echo $content;
    exit;
    
} catch (Exception $e) {
    // Log error
    error_log("PDF generation error: " . $e->getMessage());
    
    // Return error response
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => $e->getMessage()]);
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
