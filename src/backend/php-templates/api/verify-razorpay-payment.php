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

// Get the request body (read once and store)
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

// Log the raw input for debugging
file_put_contents(__DIR__ . '/debug.log', 'verify-razorpay-payment.php called at ' . date('Y-m-d H:i:s') . ': ' . $rawInput . PHP_EOL, FILE_APPEND);

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
    // Use config.php database connection instead of database.php to avoid credential conflicts
    require_once __DIR__ . '/utils/email.php';
    $dbAvailable = true;
    file_put_contents(__DIR__ . '/debug.log', 'Email utils loaded successfully at ' . date('Y-m-d H:i:s') . PHP_EOL, FILE_APPEND);
} catch (Throwable $e) {
    file_put_contents(__DIR__ . '/debug.log', 'ERROR: Email utils not available: ' . $e->getMessage() . ' - Trace: ' . $e->getTraceAsString() . PHP_EOL, FILE_APPEND);
    // Don't exit - continue without email functionality
}

// Load Razorpay API keys
$key_id = "rzp_live_R6nt1S648RxpNC"; // Live key
$key_secret = "336q1h1t7sDpKyxbyqwGaNRp"; // Live secret

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

// Check for duplicate requests (prevent processing same payment twice)
$requestKey = $razorpay_payment_id . '_' . $razorpay_order_id;
$processedFile = __DIR__ . '/processed_payments_' . date('Y-m-d') . '.txt';
$processedPayments = [];

if (file_exists($processedFile)) {
    $processedPayments = json_decode(file_get_contents($processedFile), true) ?: [];
}

// Check if this payment was already processed today
if (isset($processedPayments[$requestKey])) {
    $lastProcessed = $processedPayments[$requestKey];
    $timeDiff = time() - $lastProcessed['timestamp'];
    
    // If processed within last 60 seconds, skip (likely duplicate)
    if ($timeDiff < 60) {
        file_put_contents(__DIR__ . '/debug.log', 'SKIP: Duplicate payment verification request for ' . $requestKey . ' (processed ' . $timeDiff . 's ago)' . PHP_EOL, FILE_APPEND);
        echo json_encode(['success' => true, 'message' => 'Payment already verified', 'duplicate' => true]);
        exit;
    }
}

// Mark as processing
$processedPayments[$requestKey] = [
    'timestamp' => time(),
    'booking_id' => $booking_id,
    'amount' => $frontend_amount
];
file_put_contents($processedFile, json_encode($processedPayments));

// Generate the signature to verify the payment
$generated_signature = hash_hmac('sha256', $razorpay_order_id . "|" . $razorpay_payment_id, $key_secret);

try {
    // Verify signature
    
    if ($generated_signature != $razorpay_signature) {
        file_put_contents(__DIR__ . '/debug.log', 'Signature verification failed. Generated: ' . $generated_signature . ' Provided: ' . $razorpay_signature . PHP_EOL, FILE_APPEND);
        
        // Track payment failure
        $failureData = [
            'action' => 'track_failure',
            'booking_id' => $booking_id,
            'booking_number' => 'UNKNOWN',
            'amount' => $frontend_amount ?? 0,
            'failure_reason' => 'Signature verification failed',
            'failure_code' => 'SIGNATURE_MISMATCH'
        ];
        
        $failureRequest = json_encode($failureData);
        $failureContext = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => 'Content-Type: application/json',
                'content' => $failureRequest
            ]
        ]);
        
        // Use the correct endpoint URL
        $baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'];
        @file_get_contents($baseUrl . '/api/payment-tracker-final.php', false, $failureContext);
        
        echo json_encode(['success' => false, 'error' => 'Payment signature verification failed']);
        http_response_code(400);
        exit;
    }

    $amount = null;
    $db_booking_id = null;
    $booking_data = null;
    
    if ($dbAvailable) {
        try {
            // Use the database connection from config.php (correct credentials)
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
                // First, get the current booking data with tour information
                $selectStmt = $conn->prepare("
                    SELECT b.*, tf.tour_name 
                    FROM bookings b
                    LEFT JOIN tour_fares tf ON b.tour_id = tf.tour_id
                    WHERE b.id = ?
                ");
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

                // Update Google Sheet with payment details (non-blocking)
                try {
                    $syncBootstrap = __DIR__ . '/ai-booking/services/OnlineBookingSheetSync.php';
                    if (is_readable($syncBootstrap)) {
                        require_once __DIR__ . '/utils/ai-booking-db.php';
                        require_once __DIR__ . '/ai-booking/config/sheets-config.php';
                        require_once __DIR__ . '/ai-booking/services/GoogleSheetService.php';
                        require_once $syncBootstrap;
                        $sheetSync = OnlineBookingSheetSync::updatePaymentAfterVerify((int) $booking_id, (float) $payAmount);
                        file_put_contents(__DIR__ . '/debug.log', 'Google Sheet payment sync: ' . json_encode($sheetSync) . PHP_EOL, FILE_APPEND);
                    }
                } catch (Throwable $sheetError) {
                    file_put_contents(__DIR__ . '/debug.log', 'Google Sheet payment sync failed (non-fatal): ' . $sheetError->getMessage() . PHP_EOL, FILE_APPEND);
                }
                
                // Send payment confirmation email only for successful payments
                file_put_contents(__DIR__ . '/debug.log', 'Checking email conditions - booking_data: ' . (!empty($booking_data) ? 'yes' : 'no') . ', payAmount: ' . $payAmount . ', dbAvailable: ' . ($dbAvailable ? 'yes' : 'no') . PHP_EOL, FILE_APPEND);
                
                // Check if email functions are available
                $emailFunctionsAvailable = function_exists('sendPaymentConfirmationEmail') && function_exists('sendBookingConfirmationEmail');
                file_put_contents(__DIR__ . '/debug.log', 'Email functions available: ' . ($emailFunctionsAvailable ? 'yes' : 'no') . PHP_EOL, FILE_APPEND);
                
                // Send payment confirmation email only for successful payments
                // Wrap in try-catch to prevent email errors from crashing the payment verification
                try {
                    if ($booking_data && $payAmount > 0 && $emailFunctionsAvailable) {
                        file_put_contents(__DIR__ . '/debug.log', 'Starting email sending process for booking: ' . $booking_id . PHP_EOL, FILE_APPEND);
                        
                        // Fetch tour itinerary if this is a tour booking
                        $tourItinerary = [];
                        if (!empty($booking_data['tour_id'])) {
                            try {
                                $itineraryStmt = $conn->prepare("
                                    SELECT day_number as day, title, description, activities 
                                    FROM tour_itinerary 
                                    WHERE tour_id = ? 
                                    ORDER BY day_number
                                ");
                                if ($itineraryStmt) {
                                    $itineraryStmt->bind_param("s", $booking_data['tour_id']);
                                    $itineraryStmt->execute();
                                    $itineraryResult = $itineraryStmt->get_result();
                                    
                                    while ($itineraryRow = $itineraryResult->fetch_assoc()) {
                                        $activities = [];
                                        if (!empty($itineraryRow['activities'])) {
                                            $decoded = json_decode($itineraryRow['activities'], true);
                                            $activities = is_array($decoded) ? $decoded : explode(',', $itineraryRow['activities']);
                                        }
                                        
                                        $tourItinerary[] = [
                                            'day' => (int)$itineraryRow['day'],
                                            'title' => $itineraryRow['title'],
                                            'description' => $itineraryRow['description'],
                                            'activities' => $activities
                                        ];
                                    }
                                    $itineraryStmt->close();
                                }
                            } catch (Exception $itineraryEx) {
                                file_put_contents(__DIR__ . '/debug.log', 'Error fetching tour itinerary: ' . $itineraryEx->getMessage() . PHP_EOL, FILE_APPEND);
                            }
                        }

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
                            'tourId' => $booking_data['tour_id'] ?? null,
                            'tourName' => $booking_data['tour_name'] ?? null,
                            'tour_itinerary' => $tourItinerary,
                            'createdAt' => $booking_data['created_at'],
                            'updatedAt' => date('Y-m-d H:i:s')
                        ];
                        
                        // Send payment confirmation email with enhanced error handling
                        file_put_contents(__DIR__ . '/debug.log', 'Attempting to send payment confirmation email for booking: ' . $booking_id . ' with amount: ' . $payAmount . PHP_EOL, FILE_APPEND);
                        
                        // First try the payment confirmation email
                        $paymentEmailSuccess = @sendPaymentConfirmationEmail($formattedBooking);
                        file_put_contents(__DIR__ . '/debug.log', 'Payment confirmation email result: ' . ($paymentEmailSuccess ? 'success' : 'failed') . ' for amount: ' . $payAmount . ' at ' . date('Y-m-d H:i:s') . PHP_EOL, FILE_APPEND);
                        
                        // Track successful payment
                        try {
                            $successData = [
                                'action' => 'track_attempt',
                                'booking_id' => $booking_data['id'],
                                'booking_number' => $booking_data['booking_number'],
                                'razorpay_order_id' => $razorpay_order_id,
                                'razorpay_payment_id' => $razorpay_payment_id,
                                'amount' => $payAmount,
                                'payment_status' => 'successful',
                                'customer_phone' => $booking_data['passenger_phone'],
                                'customer_email' => $booking_data['passenger_email']
                            ];
                            
                            $successRequest = json_encode($successData);
                            $successContext = stream_context_create([
                                'http' => [
                                    'method' => 'POST',
                                    'header' => 'Content-Type: application/json',
                                    'content' => $successRequest
                                ]
                            ]);
                            
                            // Use the correct endpoint URL
                            $baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'];
                            @file_get_contents($baseUrl . '/api/payment-tracker-final.php', false, $successContext);
                        } catch (Exception $trackEx) {
                            file_put_contents(__DIR__ . '/debug.log', 'Error tracking payment: ' . $trackEx->getMessage() . PHP_EOL, FILE_APPEND);
                        }
                        
                        // If payment email fails, try booking confirmation email as fallback
                        if (!$paymentEmailSuccess) {
                            file_put_contents(__DIR__ . '/debug.log', 'Payment email failed, trying booking confirmation email as fallback' . PHP_EOL, FILE_APPEND);
                            $bookingEmailSuccess = @sendBookingConfirmationEmail($formattedBooking);
                            file_put_contents(__DIR__ . '/debug.log', 'Booking confirmation email fallback result: ' . ($bookingEmailSuccess ? 'success' : 'failed') . PHP_EOL, FILE_APPEND);
                        }
                        
                        // If both fail, try basic email function
                        if (!$paymentEmailSuccess && !$bookingEmailSuccess) {
                            file_put_contents(__DIR__ . '/debug.log', 'Both email functions failed, trying basic email function' . PHP_EOL, FILE_APPEND);
                            
                            $to = $formattedBooking['passengerEmail'];
                            $subject = "Payment Confirmed - Booking #" . $formattedBooking['bookingNumber'];
                            $body = "<h1>Payment Confirmed!</h1><p>Your payment of ₹" . number_format($payAmount, 2) . " has been received for booking #" . $formattedBooking['bookingNumber'] . "</p>";
                            
                            $basicEmailSuccess = @sendEmail($to, $subject, $body);
                            file_put_contents(__DIR__ . '/debug.log', 'Basic email function result: ' . ($basicEmailSuccess ? 'success' : 'failed') . PHP_EOL, FILE_APPEND);
                        }
                    } else {
                        file_put_contents(__DIR__ . '/debug.log', 'Skipping email - booking_data: ' . (!empty($booking_data) ? 'yes' : 'no') . ', payAmount: ' . $payAmount . ', emailFunctionsAvailable: ' . ($emailFunctionsAvailable ? 'yes' : 'no') . PHP_EOL, FILE_APPEND);
                    }
                } catch (Exception $emailEx) {
                    file_put_contents(__DIR__ . '/debug.log', 'CRITICAL: Email sending exception at ' . date('Y-m-d H:i:s') . ': ' . $emailEx->getMessage() . ' - Trace: ' . $emailEx->getTraceAsString() . PHP_EOL, FILE_APPEND);
                    
                    // Try one more time with basic mail function
                    try {
                        if (isset($formattedBooking) && !empty($formattedBooking['passengerEmail'])) {
                            $to = $formattedBooking['passengerEmail'];
                            $subject = "Payment Confirmed - Booking #" . $formattedBooking['bookingNumber'];
                            $body = "<h1>Payment Confirmed!</h1><p>Your payment has been received.</p>";
                            
                            $headers = "From: Vizag Taxi Hub <info@vizagtaxihub.com>\r\n";
                            $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
                            
                            ini_set('sendmail_from', 'info@vizagtaxihub.com');
                            $finalEmailSuccess = @mail($to, $subject, $body, $headers);
                            file_put_contents(__DIR__ . '/debug.log', 'Final email attempt result: ' . ($finalEmailSuccess ? 'success' : 'failed') . PHP_EOL, FILE_APPEND);
                        }
                    } catch (Exception $finalEx) {
                        file_put_contents(__DIR__ . '/debug.log', 'Final email attempt also failed: ' . $finalEx->getMessage() . PHP_EOL, FILE_APPEND);
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
