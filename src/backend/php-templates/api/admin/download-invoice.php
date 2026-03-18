<?php
/**
 * Download invoice as HTML file
 * Requires admin auth. Returns full HTML document for download.
 */
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../utils/auth.php';

header('Access-Control-Allow-Origin: ' . (isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*'));
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if (!validateAdminAuth()) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

$bookingId = isset($_GET['booking_id']) ? intval($_GET['booking_id']) : (isset($_GET['id']) ? intval($_GET['id']) : 0);
if (!$bookingId) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Missing booking_id']);
    exit;
}

try {
    $conn = getDbConnection();
    $invoiceData = null;
    $isGroupTour = ($bookingId >= 1000000);
    $realId = $isGroupTour ? ($bookingId - 1000000) : $bookingId;

    if ($isGroupTour) {
        $gtExists = @$conn->query("SHOW TABLES LIKE 'group_tour_bookings'");
        if ($gtExists && $gtExists->num_rows > 0) {
            $gtSql = "SELECT gtb.id, gtb.booking_number, gtb.total_amount, gtb.seat_count, gtb.customer_name, gtb.customer_email, gtb.customer_phone, gtb.status, gtb.razorpay_payment_id, gtb.created_at,
                t.pickup_location, t.dropoff_location, t.travel_date
                FROM group_tour_bookings gtb INNER JOIN group_tour_tours t ON t.id = gtb.tour_id WHERE gtb.id = ?";
            $gtStmt = $conn->prepare($gtSql);
            if ($gtStmt) {
                $gtStmt->bind_param('i', $realId);
                if ($gtStmt->execute()) {
                    $row = $gtStmt->get_result()->fetch_assoc();
                    if ($row) {
                        $seatsRes = @$conn->query("SELECT seat_id FROM group_tour_booking_seats WHERE booking_id = " . (int)$row['id'] . " ORDER BY seat_id");
                        $seats = [];
                        if ($seatsRes) {
                            while ($sr = $seatsRes->fetch_assoc()) $seats[] = $sr['seat_id'];
                        }
                        $seatsStr = implode(', ', $seats) ?: ('S1-S' . (int)$row['seat_count']);
                        $total = (float)$row['total_amount'];
                        $invoiceData = [
                            'booking_number' => $row['booking_number'],
                            'passenger_name' => $row['customer_name'],
                            'passenger_phone' => $row['customer_phone'],
                            'passenger_email' => $row['customer_email'],
                            'pickup_location' => $row['pickup_location'] ?? '',
                            'drop_location' => $row['dropoff_location'] ?? '',
                            'pickup_date' => $row['travel_date'] ?? $row['created_at'],
                            'total_amount' => $total,
                            'seats' => $seatsStr,
                            'trip_type' => 'Group Tour',
                            'payment_method' => ($row['status'] === 'paid' && !empty($row['razorpay_payment_id'])) ? 'Online (Razorpay)' : (($row['status'] === 'paid') ? 'Online' : 'Pending'),
                            'invoice_number' => 'INV-GT-' . date('Ymd') . '-' . $row['id'],
                        ];
                    }
                }
                $gtStmt->close();
            }
        }
    } else {
        $stmt = $conn->prepare('SELECT * FROM bookings WHERE id = ?');
        $stmt->bind_param('i', $bookingId);
        $stmt->execute();
        $res = $stmt->get_result();
        if ($res->num_rows > 0) {
            $row = $res->fetch_assoc();
            $total = (float)($row['total_amount'] ?? 0);
            $adv = (float)($row['advance_paid_amount'] ?? 0);
            $invoiceData = [
                'booking_number' => $row['booking_number'],
                'passenger_name' => $row['passenger_name'] ?? '',
                'passenger_phone' => $row['passenger_phone'] ?? '',
                'passenger_email' => $row['passenger_email'] ?? '',
                'pickup_location' => $row['pickup_location'] ?? '',
                'drop_location' => $row['drop_location'] ?? '',
                'pickup_date' => $row['pickup_date'] ?? '',
                'total_amount' => $total,
                'seats' => '-',
                'trip_type' => $row['trip_type'] ?? '',
                'payment_method' => $row['payment_method'] ?? 'Pending',
                'invoice_number' => 'INV-' . date('Ymd') . '-' . $bookingId,
            ];
        }
    }

    if (!$invoiceData) {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['status' => 'error', 'message' => 'Booking not found']);
        exit;
    }

    $inv = $invoiceData;
    $filename = 'invoice-' . preg_replace('/[^a-zA-Z0-9\-]/', '', $inv['booking_number']) . '.html';
    header('Content-Type: text/html; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice - <?php echo htmlspecialchars($inv['booking_number']); ?></title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 24px auto; padding: 24px; color: #333; }
    h1 { font-size: 1.5rem; margin-bottom: 8px; }
    .meta { color: #666; font-size: 0.875rem; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f3f4f6; font-weight: 600; }
    .section { margin-bottom: 24px; }
    .section-title { font-weight: 600; margin-bottom: 8px; font-size: 0.875rem; color: #6b7280; }
    .total { font-size: 1.25rem; font-weight: 700; margin-top: 16px; }
    .footer { margin-top: 32px; font-size: 0.75rem; color: #9ca3af; }
  </style>
</head>
<body>
  <h1>Vizag Taxi Hub</h1>
  <p class="meta">Invoice <?php echo htmlspecialchars($inv['invoice_number']); ?> | <?php echo htmlspecialchars($inv['booking_number']); ?></p>

  <div class="section">
    <div class="section-title">Customer</div>
    <p><strong><?php echo htmlspecialchars($inv['passenger_name']); ?></strong></p>
    <p><?php echo htmlspecialchars($inv['passenger_phone']); ?></p>
    <p><?php echo htmlspecialchars($inv['passenger_email']); ?></p>
  </div>

  <div class="section">
    <div class="section-title">Trip</div>
    <p><?php echo htmlspecialchars($inv['pickup_location']); ?> → <?php echo htmlspecialchars($inv['drop_location']); ?></p>
    <p>Date: <?php echo htmlspecialchars($inv['pickup_date']); ?></p>
    <p>Trip Type: <?php echo htmlspecialchars($inv['trip_type']); ?></p>
    <?php if (!empty($inv['seats']) && $inv['seats'] !== '-') { ?>
    <p>Seats: <?php echo htmlspecialchars($inv['seats']); ?></p>
    <?php } ?>
  </div>

  <div class="section">
    <div class="section-title">Fare</div>
    <table>
      <tr><td>Total Amount</td><td style="text-align:right">₹ <?php echo number_format((float)$inv['total_amount'], 2); ?></td></tr>
      <tr><td>Payment</td><td style="text-align:right"><?php echo htmlspecialchars($inv['payment_method']); ?></td></tr>
    </table>
    <p class="total">Total: ₹ <?php echo number_format((float)$inv['total_amount'], 2); ?></p>
  </div>

  <div class="footer">
    <p>Thank you for choosing Vizag Taxi Hub.</p>
    <p>Contact: +91 9966363662</p>
  </div>
</body>
</html>
<?php
} catch (Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
