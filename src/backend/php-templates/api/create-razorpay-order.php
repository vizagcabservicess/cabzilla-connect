<?php
file_put_contents(__DIR__ . '/order_debug.log', 'SCRIPT CALLED' . PHP_EOL, FILE_APPEND);
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
    file_put_contents(__DIR__ . '/order_debug.log', 'ERROR: Not a POST request' . PHP_EOL, FILE_APPEND);
    echo json_encode(['error' => 'Only POST requests are allowed']);
    http_response_code(405);
    exit;
}

// Get the request body
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);
file_put_contents(__DIR__ . '/order_debug.log', 'INPUT: ' . $rawInput . PHP_EOL, FILE_APPEND);

if (!isset($data['amount']) || !is_numeric($data['amount'])) {
    file_put_contents(__DIR__ . '/order_debug.log', 'ERROR: Invalid amount' . PHP_EOL, FILE_APPEND);
    echo json_encode(['error' => 'Invalid amount']);
    http_response_code(400);
    exit;
}

// Get booking_id if provided
$booking_id = isset($data['booking_id']) ? $data['booking_id'] : null;

// Include database connection and helper functions (optional - do not hard fail on DB)
$dbAvailable = false;
try {
    require_once __DIR__ . '/utils/database.php';
    $dbAvailable = true;
} catch (Throwable $e) {
    file_put_contents(__DIR__ . '/order_debug.log', 'WARN: DB utils not available: ' . $e->getMessage() . PHP_EOL, FILE_APPEND);
}

// Load Razorpay API keys
$key_id = "rzp_test_41fJeGiVFyU9OQ"; // Test key (fixed to match working modules)
$key_secret = "ZbNPHrr9CmMyMnm7TzJOJozH"; // Test secret (fixed to match working modules)

// Generate a unique receipt ID
$receipt_id = 'rcpt_' . time() . '_' . substr(md5(mt_rand()), 0, 8);

// Normalize amount → Razorpay expects paise
$inputAmount = (int)$data['amount'];
// Heuristic: if value looks like rupees, convert to paise
// (most of our app sends rupees; paise would usually be ≥ 100000 for typical fares)
$amountPaise = ($inputAmount < 100000) ? ($inputAmount * 100) : $inputAmount;
file_put_contents(__DIR__ . '/order_debug.log', 'AMOUNT_NORMALIZED: input=' . $inputAmount . ' paise=' . $amountPaise . PHP_EOL, FILE_APPEND);

try {
    // Initialize Razorpay API
    $curl = curl_init();
    
    // Setup the API call
    curl_setopt_array($curl, [
        CURLOPT_URL => "https://api.razorpay.com/v1/orders",
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => "",
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => "POST",
        CURLOPT_POSTFIELDS => json_encode([
            'amount' => $amountPaise,
            'currency' => 'INR',
            'receipt' => $receipt_id,
            'payment_capture' => 1  // Auto capture
        ]),
        CURLOPT_HTTPHEADER => [
            "Authorization: Basic " . base64_encode($key_id . ":" . $key_secret),
            "Content-Type: application/json"
        ],
    ]);
    
    // Execute the call and get the response
    $response = curl_exec($curl);
    $err = curl_error($curl);
    curl_close($curl);
    file_put_contents(__DIR__ . '/order_debug.log', 'CURL RESPONSE: ' . $response . PHP_EOL, FILE_APPEND);
    file_put_contents(__DIR__ . '/order_debug.log', 'CURL ERROR: ' . $err . PHP_EOL, FILE_APPEND);
    
    if ($err) {
        file_put_contents(__DIR__ . '/order_debug.log', 'RAZORPAY API ERROR: ' . $err . PHP_EOL, FILE_APPEND);
        echo json_encode(['error' => 'Failed to create order']);
        http_response_code(500);
        exit;
    }
    
    // Decode the JSON response
    $order = json_decode($response, true);
    
    if (isset($order['error'])) {
        file_put_contents(__DIR__ . '/order_debug.log', 'RAZORPAY ORDER ERROR: ' . json_encode($order['error']) . PHP_EOL, FILE_APPEND);
        echo json_encode(['error' => $order['error']['description'] ?? 'Failed to create order']);
        http_response_code(400);
        exit;
    }
    
    // Store the order in the database (best-effort)
    if ($dbAvailable) {
        try {
            $conn = getDbConnection();
            if ($booking_id) {
                $stmt = $conn->prepare("INSERT INTO razorpay_orders (order_id, amount, receipt, booking_id, created_at, status) VALUES (?, ?, ?, ?, NOW(), ?)");
                $stmt->bind_param("sisss", $order['id'], $order['amount'], $receipt_id, $booking_id, $order['status']);
            } else {
                $stmt = $conn->prepare("INSERT INTO razorpay_orders (order_id, amount, receipt, created_at, status) VALUES (?, ?, ?, NOW(), ?)");
                $stmt->bind_param("siss", $order['id'], $order['amount'], $receipt_id, $order['status']);
            }
            $stmt->execute();
            if ($stmt->error) {
                file_put_contents(__DIR__ . '/order_debug.log', 'DB ERROR: ' . $stmt->error . PHP_EOL, FILE_APPEND);
            }
            $stmt->close();
            $conn->close();
        } catch (Throwable $e) {
            file_put_contents(__DIR__ . '/order_debug.log', 'DB EXCEPTION: ' . $e->getMessage() . PHP_EOL, FILE_APPEND);
            // Do not fail the API if DB write fails
        }
    }
    
    // Return the created order to the frontend
    echo json_encode([
        'success' => true,
        'order' => $order
    ]);
    
} catch (Exception $e) {
    file_put_contents(__DIR__ . '/order_debug.log', 'EXCEPTION: ' . $e->getMessage() . PHP_EOL, FILE_APPEND);
    error_log("Exception: " . $e->getMessage());
    echo json_encode(['error' => 'Internal server error']);
    http_response_code(500);
}
