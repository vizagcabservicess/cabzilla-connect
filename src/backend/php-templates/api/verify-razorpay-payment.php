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

// Include database connection and helper functions (best-effort)
$dbAvailable = false;
try {
    require_once __DIR__ . '/utils/database.php';
    require_once __DIR__ . '/utils/email.php';
    $dbAvailable = true;
} catch (Throwable $e) {
    file_put_contents(__DIR__ . '/debug.log', 'WARN: DB utils not available: ' . $e->getMessage() . PHP_EOL, FILE_APPEND);
}

// Load Razorpay API keys
$key_id = "rzp_test_41fJeGiVFyU9OQ"; // Test key
$key_secret = "ZbNPHrr9CmMyMnm7TzJOJozH"; // Test secret

/**
 * Get payment amount from Razorpay API
 */
function getRazorpayPaymentAmount($payment_id, $key_id, $key_secret) {
    $url = "https://api.razorpay.com/v1/payments/" . $payment_id;
    $auth = base64_encode($key_id . ":" . $key_secret);
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Basic ' . $auth,
            'Content-Type: application/json'
        ],
        CURLOPT_TIMEOUT => 30
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        $paymentData = json_decode($response, true);
        if ($paymentData && isset($paymentData['amount'])) {
            return $paymentData['amount'] / 100; // Convert from paise to rupees
        }
    }
    
    return null;
}

// Extract payment details
$razorpay_payment_id = $data['razorpay_payment_id'];
$razorpay_order_id = $data['razorpay_order_id'];
$razorpay_signature = $data['razorpay_signature'];
$booking_id = $data['booking_id'] ?? null;
$frontend_amount = $data['amount'] ?? null; // Amount from frontend

// Generate the signature to verify the payment
$generated_signature = hash_hmac('sha256', $razorpay_order_id . "|" . $razorpay_payment_id, $key_secret);

file_put_contents(__DIR__ . '/debug.log', 'verify-razorpay-payment.php called at ' . date('Y-m-d H:i:s') . ': ' . file_get_contents('php://input') . PHP_EOL, FILE_APPEND);

try {
    // Verify signature
    if ($generated_signature != $razorpay_signature) {
        file_put_contents(__DIR__ . '/debug.log', 'Signature verification failed. Generated: ' . $generated_signature . ' Provided: ' . $razorpay_signature . PHP_EOL, FILE_APPEND);
        echo json_encode(['success' => false, 'error' => 'Payment signature verification failed']);
        http_response_code(400);
        exit;
    }

    $amount = null;
    $db_booking_id = null;
    $booking_data = null;
    
    if ($dbAvailable) {
        try {
            $conn = getDbConnection();
            
            // Since razorpay_orders table might not have booking_id column, 
            // we'll use the booking_id from the request directly
            if (!$booking_id) {
                file_put_contents(__DIR__ . '/debug.log', 'No booking_id provided in request' . PHP_EOL, FILE_APPEND);
                echo json_encode(['error' => 'Booking ID is required']);
                http_response_code(400);
                exit;
            }
            
            // Use amount from frontend first (most reliable)
            if ($frontend_amount !== null) {
                $amount = $frontend_amount;
                file_put_contents(__DIR__ . '/debug.log', 'Using amount from frontend: ' . $amount . PHP_EOL, FILE_APPEND);
            } else {
                // Fallback: Get payment amount from Razorpay API
                file_put_contents(__DIR__ . '/debug.log', 'Fetching payment amount from Razorpay API for payment_id: ' . $razorpay_payment_id . PHP_EOL, FILE_APPEND);
                $amount = getRazorpayPaymentAmount($razorpay_payment_id, $key_id, $key_secret);
                
                if ($amount !== null) {
                    file_put_contents(__DIR__ . '/debug.log', 'Payment amount from Razorpay API: ' . $amount . PHP_EOL, FILE_APPEND);
                } else {
                    file_put_contents(__DIR__ . '/debug.log', 'Could not fetch payment amount from Razorpay API' . PHP_EOL, FILE_APPEND);
                    
                    // Fallback: Try to get amount from razorpay_orders if table exists (optional)
                    try {
                        $stmt = $conn->prepare("SELECT amount FROM razorpay_orders WHERE order_id = ?");
                        if ($stmt) {
                            $stmt->bind_param("s", $razorpay_order_id);
                            $stmt->execute();
                            $result = $stmt->get_result();
                            if ($result && $result->num_rows > 0) {
                                $order = $result->fetch_assoc();
                                $amount = isset($order['amount']) ? ($order['amount'] / 100.0) : null;
                                file_put_contents(__DIR__ . '/debug.log', 'Payment amount from razorpay_orders table: ' . $amount . PHP_EOL, FILE_APPEND);
                            }
                            $stmt->close();
                        }
                    } catch (Exception $e) {
                        // If razorpay_orders table doesn't exist or has different structure, continue
                        file_put_contents(__DIR__ . '/debug.log', 'Could not fetch from razorpay_orders: ' . $e->getMessage() . PHP_EOL, FILE_APPEND);
                    }
                }
            }

            // Record payment; fall back amount to 0 if unknown
            $payAmount = $amount !== null ? $amount : 0;
            
            // If we still don't have an amount, log an error
            if ($payAmount == 0) {
                file_put_contents(__DIR__ . '/debug.log', 'ERROR: Could not determine payment amount from any source' . PHP_EOL, FILE_APPEND);
            }
            
            // Try to insert into payments table (optional - might not exist)
            try {
                $stmt = $conn->prepare("INSERT INTO payments (razorpay_payment_id, razorpay_order_id, amount, status, payment_method, created_at) VALUES (?, ?, ?, 'paid', 'razorpay', NOW())");
                if ($stmt) {
                    $stmt->bind_param("ssd", $razorpay_payment_id, $razorpay_order_id, $payAmount);
                    $stmt->execute();
                    $stmt->close();
                }
            } catch (Exception $e) {
                // Payments table might not exist, continue anyway
                file_put_contents(__DIR__ . '/debug.log', 'Could not insert into payments table: ' . $e->getMessage() . PHP_EOL, FILE_APPEND);
            }

            // Update booking if possible
            if ($booking_id) {
                file_put_contents(__DIR__ . '/debug.log', 'Fetching booking data for ID: ' . $booking_id . PHP_EOL, FILE_APPEND);
                // First, get the current booking data
                $selectStmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
                if ($selectStmt) {
                    $selectStmt->bind_param("i", $booking_id);
                    $selectStmt->execute();
                    $result = $selectStmt->get_result();
                    if ($result && $result->num_rows > 0) {
                        $booking_data = $result->fetch_assoc();
                        file_put_contents(__DIR__ . '/debug.log', 'Booking data fetched successfully for ID: ' . $booking_id . PHP_EOL, FILE_APPEND);
                    } else {
                        file_put_contents(__DIR__ . '/debug.log', 'No booking found for ID: ' . $booking_id . PHP_EOL, FILE_APPEND);
                    }
                    $selectStmt->close();
                } else {
                    file_put_contents(__DIR__ . '/debug.log', 'Failed to prepare booking select statement' . PHP_EOL, FILE_APPEND);
                }
                
                // Determine payment status based on amount paid vs total amount
                $totalAmount = $booking_data['total_amount'] ?? 0;
                $paymentStatus = ($payAmount >= $totalAmount) ? 'paid' : 'payment_pending';
                $bookingStatus = ($payAmount >= $totalAmount) ? 'confirmed' : 'pending';
                
                // Update booking with payment details
                $update = $conn->prepare("UPDATE bookings SET payment_status=?, status=?, razorpay_payment_id=?, razorpay_order_id=?, razorpay_signature=?, advance_paid_amount=?, updated_at=NOW() WHERE id=?");
                if ($update) {
                    $update->bind_param("sssssdi", $paymentStatus, $bookingStatus, $razorpay_payment_id, $razorpay_order_id, $razorpay_signature, $payAmount, $booking_id);
                    $update->execute();
                    $update->close();
                }
                
                // Send payment confirmation email only for successful payments
                file_put_contents(__DIR__ . '/debug.log', 'Checking email conditions - booking_data: ' . (!empty($booking_data) ? 'yes' : 'no') . ', payAmount: ' . $payAmount . PHP_EOL, FILE_APPEND);
                if ($booking_data && $payAmount > 0) {
                    // Format booking data for email
                    $formattedBooking = [
                        'id' => $booking_data['id'],
                        'bookingNumber' => $booking_data['booking_number'],
                        'pickupLocation' => $booking_data['pickup_location'],
                        'dropLocation' => $booking_data['drop_location'],
                        'pickupDate' => $booking_data['pickup_date'],
                        'returnDate' => $booking_data['return_date'],
                        'cabType' => $booking_data['cab_type'],
                        'distance' => $booking_data['distance'],
                        'tripType' => $booking_data['trip_type'],
                        'tripMode' => $booking_data['trip_mode'],
                        'totalAmount' => $booking_data['total_amount'],
                        'status' => $bookingStatus,
                        'passengerName' => $booking_data['passenger_name'],
                        'passengerPhone' => $booking_data['passenger_phone'],
                        'passengerEmail' => $booking_data['passenger_email'],
                        'payment_status' => $paymentStatus,
                        'payment_method' => 'razorpay',
                        'advance_paid_amount' => $payAmount,
                        'razorpay_payment_id' => $razorpay_payment_id,
                        'razorpay_order_id' => $razorpay_order_id,
                        'razorpay_signature' => $razorpay_signature,
                        'createdAt' => $booking_data['created_at'],
                        'updatedAt' => date('Y-m-d H:i:s')
                    ];
                    
                    // Send payment confirmation email only (with PDF receipt)
                    try {
                        file_put_contents(__DIR__ . '/debug.log', 'Attempting to send payment confirmation email for booking: ' . $booking_id . ' with amount: ' . $payAmount . PHP_EOL, FILE_APPEND);
                        $paymentEmailSuccess = sendPaymentConfirmationEmail($formattedBooking);
                        file_put_contents(__DIR__ . '/debug.log', 'Payment confirmation email result: ' . ($paymentEmailSuccess ? 'success' : 'failed') . ' for amount: ' . $payAmount . ' at ' . date('Y-m-d H:i:s') . PHP_EOL, FILE_APPEND);
                    } catch (Exception $emailEx) {
                        file_put_contents(__DIR__ . '/debug.log', 'Email sending failed at ' . date('Y-m-d H:i:s') . ': ' . $emailEx->getMessage() . ' - Trace: ' . $emailEx->getTraceAsString() . PHP_EOL, FILE_APPEND);
                    }
                }
            }
            
            // Call update-booking endpoint as a fallback to ensure status is updated correctly
            try {
                $payload = json_encode([
                    'id' => (int)$booking_id,
                    'payment_status' => $paymentStatus,
                    'status' => $bookingStatus,
                    'payment_method' => 'razorpay',
                    'razorpay_payment_id' => $razorpay_payment_id,
                    'razorpay_order_id' => $razorpay_order_id,
                    'razorpay_signature' => $razorpay_signature,
                    'advance_paid_amount' => $payAmount
                ]);
                $ch = curl_init();
                $base = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'];
                $url = rtrim($base, '/') . '/api/update-booking.php';
                curl_setopt_array($ch, [
                    CURLOPT_URL => $url,
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_CUSTOMREQUEST => 'POST',
                    CURLOPT_HTTPHEADER => [ 'Content-Type: application/json' ],
                    CURLOPT_POSTFIELDS => $payload,
                    CURLOPT_TIMEOUT => 10
                ]);
                $resp = curl_exec($ch);
                $cerr = curl_error($ch);
                curl_close($ch);
                file_put_contents(__DIR__ . '/debug.log', 'UPDATE_BOOKING_FALLBACK: resp=' . $resp . ' err=' . $cerr . PHP_EOL, FILE_APPEND);
            } catch (Throwable $e2) {
                file_put_contents(__DIR__ . '/debug.log', 'UPDATE_BOOKING_FALLBACK_EXCEPTION: ' . $e2->getMessage() . PHP_EOL, FILE_APPEND);
            }

            $conn->close();
        } catch (Throwable $e) {
            file_put_contents(__DIR__ . '/debug.log', 'DB exception during verify: ' . $e->getMessage() . ' - Trace: ' . $e->getTraceAsString() . PHP_EOL, FILE_APPEND);
            // Continue; verification already passed
        }
    }

    echo json_encode(['success' => true, 'message' => 'Payment verified successfully']);
} catch (Exception $e) {
    file_put_contents(__DIR__ . '/debug.log', 'Exception: ' . $e->getMessage() . PHP_EOL, FILE_APPEND);
    error_log("Exception: " . $e->getMessage());
    echo json_encode(['error' => 'Internal server error', 'details' => $e->getMessage()]);
    http_response_code(500);
}
