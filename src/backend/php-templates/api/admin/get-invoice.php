<?php
// get-invoice.php: Fetch the latest invoice for a booking
require_once __DIR__ . '/../../config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . (isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : ''));
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

$bookingId = isset($_GET['booking_id']) ? intval($_GET['booking_id']) : 0;
if (!$bookingId) {
    sendJsonResponse(['status' => 'error', 'message' => 'Missing or invalid booking_id'], 400);
}

try {
    $conn = getDbConnection();
    $invoiceData = null;
    $isGroupTour = ($bookingId >= 1000000);
    $realId = $isGroupTour ? ($bookingId - 1000000) : $bookingId;

    if ($isGroupTour) {
        // Group tour booking: fetch from group_tour_bookings
        $gtExists = @$conn->query("SHOW TABLES LIKE 'group_tour_bookings'");
        if ($gtExists && $gtExists->num_rows > 0) {
            $hasBpCol = false;
            $colChk = @$conn->query("SHOW COLUMNS FROM group_tour_bookings LIKE 'boarding_point_id'");
            if ($colChk && $colChk->num_rows > 0) $hasBpCol = true;
            $gtSql = $hasBpCol
                ? "SELECT gtb.id, gtb.booking_number, gtb.total_amount, gtb.seat_count, gtb.customer_name, gtb.customer_email, gtb.customer_phone, gtb.status, gtb.razorpay_payment_id, gtb.created_at,
                    t.pickup_location, t.dropoff_location, t.travel_date,
                    bp.name as boarding_point_name, bp.boarding_time as boarding_point_time
                    FROM group_tour_bookings gtb
                    INNER JOIN group_tour_tours t ON t.id = gtb.tour_id
                    LEFT JOIN group_tour_boarding_points bp ON bp.id = gtb.boarding_point_id
                    WHERE gtb.id = ?"
                : "SELECT gtb.id, gtb.booking_number, gtb.total_amount, gtb.seat_count, gtb.customer_name, gtb.customer_email, gtb.customer_phone, gtb.status, gtb.razorpay_payment_id, gtb.created_at,
                    t.pickup_location, t.dropoff_location, t.travel_date
                    FROM group_tour_bookings gtb
                    INNER JOIN group_tour_tours t ON t.id = gtb.tour_id
                    WHERE gtb.id = ?";
            $gtStmt = $conn->prepare($gtSql);
            if ($gtStmt) {
                $gtStmt->bind_param('i', $realId);
                if ($gtStmt->execute()) {
                    $gtRes = $gtStmt->get_result();
                    if ($gtRes->num_rows > 0) {
                        $row = $gtRes->fetch_assoc();
                        $seatsRes = @$conn->query("SELECT seat_id FROM group_tour_booking_seats WHERE booking_id = " . (int)$row['id'] . " ORDER BY seat_id");
                        $seats = [];
                        if ($seatsRes) {
                            while ($sr = $seatsRes->fetch_assoc()) $seats[] = $sr['seat_id'];
                        }
                        $seatsStr = implode(', ', $seats) ?: ('S1-S' . (int)$row['seat_count']);
                        $total = (float)$row['total_amount'];
                        $invoiceHtml = '<table><tbody>';
                        $invoiceHtml .= '<tr><td>Base Fare</td><td>₹ ' . number_format($total, 2) . '</td></tr>';
                        $invoiceHtml .= '<tr><td>Seats</td><td>' . htmlspecialchars($seatsStr) . '</td></tr>';
                        $invoiceHtml .= '<tr><td>Total Amount</td><td>₹ ' . number_format($total, 2) . '</td></tr>';
                        $invoiceHtml .= '</tbody></table>';
                        $gtPaymentMethod = ($row['status'] === 'paid' && !empty($row['razorpay_payment_id']))
                            ? 'Online (Razorpay)' : (($row['status'] === 'paid') ? 'Online' : 'Pending');
                        $travelDate = $row['travel_date'] ?? $row['created_at'];
                        $bpName = !empty($row['boarding_point_name']) ? trim($row['boarding_point_name']) : null;
                        $bpTime = !empty($row['boarding_point_time']) ? trim($row['boarding_point_time']) : null;
                        $pickupTimeStr = $bpName && $bpTime
                            ? $travelDate . ', ' . $bpTime
                            : $travelDate;
                        $pickupLocationStr = $bpName ?: ($row['pickup_location'] ?? '');
                        $invoiceData = [
                            'id' => $bookingId,
                            'booking_id' => $bookingId,
                            'invoice_number' => 'INV-GT-' . date('Ymd') . '-' . $row['id'],
                            'booking_number' => $row['booking_number'],
                            'passenger_name' => $row['customer_name'],
                            'passenger_phone' => $row['customer_phone'],
                            'passenger_email' => $row['customer_email'],
                            'pickup_location' => $pickupLocationStr ?: ($row['pickup_location'] ?? ''),
                            'drop_location' => $row['dropoff_location'] ?? '',
                            'pickup_date' => $travelDate,
                            'pickup_time' => $pickupTimeStr,
                            'boarding_point_name' => $bpName,
                            'boarding_point_time' => $bpTime,
                            'total_amount' => $total,
                            'advance_paid_amount' => $total,
                            'payment_status' => $row['status'] === 'paid' ? 'paid' : 'pending',
                            'payment_method' => $gtPaymentMethod,
                            'status' => $row['status'] === 'paid' ? 'confirmed' : 'pending',
                            'trip_type' => 'group_tour',
                            'cab_type' => 'Group Tour',
                            'vehicle' => 'Tempo Traveller',
                            'created_at' => $row['created_at'],
                            'updated_at' => $row['created_at'],
                            'invoice_html' => $invoiceHtml,
                            'seats' => $seatsStr,
                        ];
                    }
                }
                $gtStmt->close();
            }
        }
    } else {
        // Regular cab booking
        $bookingStmt = $conn->prepare('SELECT * FROM bookings WHERE id = ?');
        $bookingStmt->bind_param('i', $bookingId);
        $bookingStmt->execute();
        $bookingResult = $bookingStmt->get_result();
        if ($bookingResult->num_rows > 0) {
            $booking = $bookingResult->fetch_assoc();
            $total = (float)($booking['total_amount'] ?? 0);
            $adv = (float)($booking['advance_paid_amount'] ?? 0);
            $invoiceHtml = '<table><tbody>';
            $invoiceHtml .= '<tr><td>Base Fare</td><td>₹ ' . number_format(max(0, $total - $adv), 2) . '</td></tr>';
            if ($adv > 0) $invoiceHtml .= '<tr><td>Advance Paid</td><td>₹ ' . number_format($adv, 2) . '</td></tr>';
            $invoiceHtml .= '<tr><td>Total Amount</td><td>₹ ' . number_format($total, 2) . '</td></tr></tbody></table>';
            $invoiceData = [
                'id' => $bookingId,
                'booking_id' => $bookingId,
                'invoice_number' => 'INV-' . date('Ymd') . '-' . $bookingId,
                'booking_number' => $booking['booking_number'],
                'passenger_name' => $booking['passenger_name'] ?? '',
                'passenger_phone' => $booking['passenger_phone'] ?? '',
                'passenger_email' => $booking['passenger_email'] ?? '',
                'pickup_location' => $booking['pickup_location'] ?? '',
                'drop_location' => $booking['drop_location'] ?? '',
                'pickup_date' => $booking['pickup_date'] ?? '',
                'total_amount' => $total,
                'advance_paid_amount' => $adv,
                'payment_status' => $booking['payment_status'] ?? 'pending',
                'status' => $booking['status'] ?? 'pending',
                'trip_type' => $booking['trip_type'] ?? '',
                'cab_type' => $booking['cab_type'] ?? '',
                'created_at' => $booking['created_at'] ?? '',
                'updated_at' => $booking['updated_at'] ?? $booking['created_at'] ?? '',
                'invoice_html' => $invoiceHtml,
            ];
        }
    }

    if (!$invoiceData) {
        sendJsonResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
    }

    sendJsonResponse(['status' => 'success', 'invoice' => $invoiceData]);
} catch (Exception $e) {
    sendJsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
} 