
<?php
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    // Get booking ID from URL or POST data
    $bookingId = isset($_GET['id']) ? $_GET['id'] : null;
    if (!$bookingId) {
        $data = json_decode(file_get_contents('php://input'), true);
        $bookingId = isset($data['bookingId']) ? $data['bookingId'] : null;
    }

    if (!$bookingId) {
        throw new Exception('Booking ID is required');
    }

    // Get GST parameters
    $gstEnabled = isset($_GET['gstEnabled']) ? filter_var($_GET['gstEnabled'], FILTER_VALIDATE_BOOLEAN) : false;
    if (!$gstEnabled && isset($data['gstEnabled'])) {
        $gstEnabled = filter_var($data['gstEnabled'], FILTER_VALIDATE_BOOLEAN);
    }

    $conn = getDbConnectionWithRetry();

    // Fetch booking details with extra charges
    $stmt = $conn->prepare("
        SELECT b.*, 
               COALESCE(SUM(be.amount), 0) as total_extra_charges
        FROM bookings b
        LEFT JOIN booking_extras be ON b.id = be.booking_id
        WHERE b.id = ?
        GROUP BY b.id
    ");
    
    $stmt->bind_param("i", $bookingId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        throw new Exception('Booking not found');
    }

    $booking = $result->fetch_assoc();
    $totalAmount = (float)$booking['total_amount'];
    $extraCharges = (float)$booking['total_extra_charges'];
    $baseAmount = $totalAmount + $extraCharges;

    // Calculate GST if enabled
    $cgst = 0;
    $sgst = 0;
    $finalAmount = $baseAmount;
    
    if ($gstEnabled) {
        $gstRate = 0.06; // 6% each for CGST and SGST
        $cgst = round($baseAmount * $gstRate, 2);
        $sgst = round($baseAmount * $gstRate, 2);
        $finalAmount = $baseAmount + $cgst + $sgst;
    }

    // Get extra charges details
    $extraChargesDetails = [];
    $extraStmt = $conn->prepare("SELECT * FROM booking_extras WHERE booking_id = ?");
    $extraStmt->bind_param("i", $bookingId);
    $extraStmt->execute();
    $extraResult = $extraStmt->get_result();
    
    while ($row = $extraResult->fetch_assoc()) {
        $extraChargesDetails[] = [
            'description' => $row['description'],
            'amount' => (float)$row['amount']
        ];
    }

    // Format response
    $response = [
        'status' => 'success',
        'data' => [
            'invoiceNumber' => 'INV-' . date('Ymd') . '-' . $booking['id'],
            'invoiceDate' => date('Y-m-d'),
            'bookingNumber' => $booking['booking_number'],
            'passengerName' => $booking['passenger_name'],
            'passengerEmail' => $booking['passenger_email'],
            'passengerPhone' => $booking['passenger_phone'],
            'pickupLocation' => $booking['pickup_location'],
            'dropLocation' => $booking['drop_location'],
            'pickupDate' => $booking['pickup_date'],
            'cabType' => $booking['cab_type'],
            'tripType' => $booking['trip_type'],
            'baseAmount' => $totalAmount,
            'extraCharges' => $extraChargesDetails,
            'totalExtraCharges' => $extraCharges,
            'gstEnabled' => $gstEnabled,
            'cgstAmount' => $cgst,
            'sgstAmount' => $sgst,
            'finalAmount' => $finalAmount,
            'billingAddress' => $booking['billing_address'] ?? '',
        ]
    ];

    echo json_encode($response);

} catch (Exception $e) {
    error_log("Invoice generation error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to generate invoice: ' . $e->getMessage()
    ]);
}

if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
