<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check if it's a POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'Only POST requests are allowed']);
    http_response_code(405);
    exit;
}

// Get the request body
$data = json_decode(file_get_contents('php://input'), true);

// Validate required parameters
if (!isset($data['razorpay_payment_id']) || !isset($data['razorpay_order_id']) || !isset($data['razorpay_signature'])) {
    file_put_contents(__DIR__ . '/debug.log', 'Missing required parameters: ' . json_encode($data) . PHP_EOL, FILE_APPEND);
    echo json_encode(['error' => 'Missing required parameters']);
    http_response_code(400);
    exit;
}

// Include database connection and helper functions
require_once __DIR__ . '/utils/database.php';

// Load Razorpay API keys
$key_id = "rzp_test_41fJeGiVFyU9OQ"; // Test key
$key_secret = "ZbNPHrr9CmMyMnm7TzJOJozH"; // Test secret

// Extract payment details
$razorpay_payment_id = $data['razorpay_payment_id'];
$razorpay_order_id = $data['razorpay_order_id'];
$razorpay_signature = $data['razorpay_signature'];
$booking_id = $data['booking_id'] ?? null;

// Generate the signature to verify the payment
$generated_signature = hash_hmac('sha256', $razorpay_order_id . "|" . $razorpay_payment_id, $key_secret);

file_put_contents(__DIR__ . '/debug.log', 'verify-razorpay-payment.php called: ' . file_get_contents('php://input') . PHP_EOL, FILE_APPEND);

try {
    // Verify if the signature matches
    if ($generated_signature == $razorpay_signature) {
        $conn = getDbConnection();
        // Get order details
        $stmt = $conn->prepare("SELECT amount FROM razorpay_orders WHERE order_id = ?");
        if (!$stmt) {
            file_put_contents(__DIR__ . '/debug.log', 'Prepare failed: ' . $conn->error . PHP_EOL, FILE_APPEND);
            echo json_encode(['error' => 'DB prepare failed: ' . $conn->error]);
            http_response_code(500);
            exit;
        }
        $stmt->bind_param("s", $razorpay_order_id);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result->num_rows === 0) {
            file_put_contents(__DIR__ . '/debug.log', 'Order not found for order_id: ' . $razorpay_order_id . PHP_EOL, FILE_APPEND);
            echo json_encode(['error' => 'Order not found']);
            http_response_code(404);
            exit;
        }
        $order = $result->fetch_assoc();
        $amount = $order['amount'] / 100; // Convert from paise to rupees
        // Record the payment
        $stmt = $conn->prepare("INSERT INTO payments 
                               (razorpay_payment_id, razorpay_order_id, amount, status, payment_method, created_at) 
                               VALUES (?, ?, ?, 'paid', 'razorpay', NOW())");
        if (!$stmt) {
            file_put_contents(__DIR__ . '/debug.log', 'Prepare failed (insert payment): ' . $conn->error . PHP_EOL, FILE_APPEND);
            echo json_encode(['error' => 'DB prepare failed: ' . $conn->error]);
            http_response_code(500);
            exit;
        }
        $stmt->bind_param("ssd", $razorpay_payment_id, $razorpay_order_id, $amount);
        $stmt->execute();
        if ($stmt->error) {
            file_put_contents(__DIR__ . '/debug.log', 'Database Error (insert payment): ' . $stmt->error . PHP_EOL, FILE_APPEND);
            echo json_encode(['error' => 'Failed to record payment', 'details' => $stmt->error]);
            http_response_code(500);
            exit;
        }
        // If booking ID is provided, update the booking payment status
        if ($booking_id) {
            // Check if pooling_bookings row exists for this booking_id
            file_put_contents(__DIR__ . '/debug.log', 'Checking for pooling_bookings with id: ' . $booking_id . PHP_EOL, FILE_APPEND);
            $checkStmt = $conn->prepare("SELECT id, ride_id, user_id FROM pooling_bookings WHERE id = ?");
            $checkStmt->bind_param("i", $booking_id);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            if ($row = $checkResult->fetch_assoc()) {
                $ride_id = $row['ride_id'];
                $user_id = $row['user_id'];
                file_put_contents(__DIR__ . '/debug.log', 'Found existing booking: ride_id=' . $ride_id . ', user_id=' . $user_id . PHP_EOL, FILE_APPEND);
            } else {
                // Try to get ride_id and user_id from pooling_ride_requests
                file_put_contents(__DIR__ . '/debug.log', 'No booking found, checking pooling_ride_requests for id: ' . $booking_id . PHP_EOL, FILE_APPEND);
                $reqStmt = $conn->prepare("SELECT ride_id, guest_id, seats_requested FROM pooling_ride_requests WHERE id = ?");
                $reqStmt->bind_param("i", $booking_id);
                $reqStmt->execute();
                $reqResult = $reqStmt->get_result();
                if ($reqRow = $reqResult->fetch_assoc()) {
                    $ride_id = $reqRow['ride_id'];
                    $user_id = $reqRow['guest_id'];
                    $seats_booked = $reqRow['seats_requested'];
                    file_put_contents(__DIR__ . '/debug.log', 'Found request: ride_id=' . $ride_id . ', user_id=' . $user_id . ', seats_booked=' . $seats_booked . PHP_EOL, FILE_APPEND);
                    // Try pooling_users first
                    $rideStmt = $conn->prepare("SELECT r.price_per_seat, r.from_location, r.to_location, u.name, u.phone, u.email FROM pooling_rides r JOIN pooling_users u ON u.id = ? WHERE r.id = ?");
                    $rideStmt->bind_param("ii", $user_id, $ride_id);
                    $rideStmt->execute();
                    $rideResult = $rideStmt->get_result();
                    if ($rideRow = $rideResult->fetch_assoc()) {
                        file_put_contents(__DIR__ . '/debug.log', 'Found user in pooling_users: ' . print_r($rideRow, true) . PHP_EOL, FILE_APPEND);
                    } else {
                        // Try users table
                        $rideStmt = $conn->prepare("SELECT r.price_per_seat, r.from_location, r.to_location, u.name, u.phone, u.email FROM pooling_rides r JOIN users u ON u.id = ? WHERE r.id = ?");
                        $rideStmt->bind_param("ii", $user_id, $ride_id);
                        $rideStmt->execute();
                        $rideResult = $rideStmt->get_result();
                        if ($rideRow = $rideResult->fetch_assoc()) {
                            file_put_contents(__DIR__ . '/debug.log', 'Found user in users: ' . print_r($rideRow, true) . PHP_EOL, FILE_APPEND);
                        } else {
                            file_put_contents(__DIR__ . '/debug.log', 'User not found in pooling_users or users for user_id: ' . $user_id . PHP_EOL, FILE_APPEND);
                        }
                    }
                    if (!empty($rideRow)) {
                        $total_amount = $rideRow['price_per_seat'] * $seats_booked;
                        $passenger_name = $rideRow['name'];
                        $passenger_phone = $rideRow['phone'];
                        $passenger_email = $rideRow['email'];
                        // Insert booking
                        $insertStmt = $conn->prepare("INSERT INTO pooling_bookings (ride_id, user_id, passenger_name, passenger_phone, passenger_email, seats_booked, total_amount, booking_status, payment_status, razorpay_payment_id) VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', 'paid', ?)");
                        if (!$insertStmt) {
                            file_put_contents(__DIR__ . '/debug.log', 'Prepare failed (insert pooling_bookings): ' . $conn->error . PHP_EOL, FILE_APPEND);
                        } else {
                            $insertStmt->bind_param("iisssids", $ride_id, $user_id, $passenger_name, $passenger_phone, $passenger_email, $seats_booked, $total_amount, $razorpay_payment_id);
                            $insertStmt->execute();
                            if ($insertStmt->error) {
                                file_put_contents(__DIR__ . '/debug.log', 'Database Error (insert pooling_bookings): ' . $insertStmt->error . PHP_EOL, FILE_APPEND);
                            } else {
                                file_put_contents(__DIR__ . '/debug.log', 'Inserted new booking for ride_id=' . $ride_id . ', user_id=' . $user_id . PHP_EOL, FILE_APPEND);
                            }
                        }
                    }
                } else {
                    file_put_contents(__DIR__ . '/debug.log', 'No matching request found in pooling_ride_requests for id: ' . $booking_id . PHP_EOL, FILE_APPEND);
                }
            }
            $stmt = $conn->prepare("UPDATE pooling_bookings SET payment_status = 'paid', booking_status = 'confirmed', razorpay_payment_id = ? WHERE id = ?");
            if ($stmt) {
                $stmt->bind_param("si", $razorpay_payment_id, $booking_id);
                $stmt->execute();
                if ($stmt->error) {
                    file_put_contents(__DIR__ . '/debug.log', 'Database Error (update pooling_bookings): ' . $stmt->error . PHP_EOL, FILE_APPEND);
                }
            }
            $stmt = $conn->prepare("UPDATE pooling_payments SET status = 'success', payment_date = NOW(), razorpay_payment_id = ? WHERE booking_id = ?");
            if ($stmt) {
                $stmt->bind_param("si", $razorpay_payment_id, $booking_id);
                $stmt->execute();
                if ($stmt->error) {
                    file_put_contents(__DIR__ . '/debug.log', 'Database Error (update pooling_payments): ' . $stmt->error . PHP_EOL, FILE_APPEND);
                }
            }
            // Update the ride request status to 'paid' after successful payment
            $updateRequestStmt = $conn->prepare("UPDATE pooling_ride_requests SET status = 'paid' WHERE id = ?");
            if ($updateRequestStmt) {
                $updateRequestStmt->bind_param("i", $booking_id);
                $updateRequestStmt->execute();
                if ($updateRequestStmt->error) {
                    file_put_contents(__DIR__ . '/debug.log', 'Database Error (update pooling_ride_requests): ' . $updateRequestStmt->error . PHP_EOL, FILE_APPEND);
                }
            }
            // Decrement available_seats in pooling_rides after successful payment
            if (isset($seats_booked) && isset($ride_id)) {
                $updateSeatsStmt = $conn->prepare("UPDATE pooling_rides SET available_seats = GREATEST(available_seats - ?, 0) WHERE id = ?");
                if ($updateSeatsStmt) {
                    $updateSeatsStmt->bind_param("ii", $seats_booked, $ride_id);
                    $updateSeatsStmt->execute();
                    if ($updateSeatsStmt->error) {
                        file_put_contents(__DIR__ . '/debug.log', 'Database Error (update available_seats): ' . $updateSeatsStmt->error . PHP_EOL, FILE_APPEND);
                    }
                }
            }
        }
        $stmt->close();
        $conn->close();
        echo json_encode([
            'success' => true,
            'message' => 'Payment verified successfully'
        ]);
    } else {
        file_put_contents(__DIR__ . '/debug.log', 'Signature verification failed. Generated: ' . $generated_signature . ' Provided: ' . $razorpay_signature . PHP_EOL, FILE_APPEND);
        echo json_encode([
            'success' => false,
            'error' => 'Payment signature verification failed'
        ]);
        http_response_code(400);
    }
} catch (Exception $e) {
    file_put_contents(__DIR__ . '/debug.log', 'Exception: ' . $e->getMessage() . PHP_EOL, FILE_APPEND);
    error_log("Exception: " . $e->getMessage());
    echo json_encode(['error' => 'Internal server error', 'details' => $e->getMessage()]);
    http_response_code(500);
}
