
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

if (!isset($data['amount']) || !is_numeric($data['amount'])) {
    echo json_encode(['error' => 'Invalid amount']);
    http_response_code(400);
    exit;
}

// Include database connection and helper functions
require_once __DIR__ . '/utils/database.php';

// Load Razorpay API keys
$key_id = "rzp_test_41fJeGiVFyU9OQ"; // Test key
$key_secret = "ZbNPHrr9CmMyMnm7TzJOJozH"; // Test secret

// Generate a unique receipt ID
$receipt_id = 'rcpt_' . time() . '_' . substr(md5(mt_rand()), 0, 8);

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
            'amount' => $data['amount'],
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
    
    if ($err) {
        // Log the error
        error_log("Razorpay API Error: " . $err);
        echo json_encode(['error' => 'Failed to create order']);
        http_response_code(500);
        exit;
    }
    
    // Decode the JSON response
    $order = json_decode($response, true);
    
    if (isset($order['error'])) {
        error_log("Razorpay Error: " . json_encode($order['error']));
        echo json_encode(['error' => $order['error']['description'] ?? 'Failed to create order']);
        http_response_code(400);
        exit;
    }
    
    // Store the order in the database
    $conn = getDbConnection();
    
    // Use prepared statements to prevent SQL injection
    $stmt = $conn->prepare("INSERT INTO razorpay_orders (order_id, amount, receipt, created_at, status) 
                           VALUES (?, ?, ?, NOW(), ?)");
                           
    $stmt->bind_param("siss", $order['id'], $order['amount'], $receipt_id, $order['status']);
    $stmt->execute();
    
    if ($stmt->error) {
        error_log("Database Error: " . $stmt->error);
    }
    
    $stmt->close();
    $conn->close();
    
    // Return the created order to the frontend
    echo json_encode([
        'success' => true,
        'order' => $order
    ]);
    
} catch (Exception $e) {
    error_log("Exception: " . $e->getMessage());
    echo json_encode(['error' => 'Internal server error']);
    http_response_code(500);
}
