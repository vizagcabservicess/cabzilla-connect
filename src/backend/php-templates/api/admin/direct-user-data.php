
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// CORS Headers - Set these before any output
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Debug-Attempt, Pragma, Cache-Control, Expires');
header('Access-Control-Max-Age: 86400'); // 24 hours
header('Content-Type: application/json');

// Add debugging headers
header('X-Debug-File: direct-user-data.php');
header('X-API-Version: 1.0.52');
header('X-Timestamp: ' . time());
header('X-PHP-Version: ' . phpversion());

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log the request
error_log("Direct user data request received: " . json_encode($_GET));
error_log("Request headers: " . json_encode(getallheaders()));

// Sample users data for fallback
$sampleUsers = [
    [
        'id' => 101,
        'name' => 'Rahul Sharma',
        'email' => 'rahul@example.com',
        'phone' => '9876543210',
        'role' => 'user',
        'createdAt' => date('Y-m-d H:i:s', strtotime('-1 month')),
        'bookingsCount' => 8,
        'status' => 'active'
    ],
    [
        'id' => 102,
        'name' => 'Priya Patel',
        'email' => 'priya@example.com',
        'phone' => '8765432109',
        'role' => 'user',
        'createdAt' => date('Y-m-d H:i:s', strtotime('-3 weeks')),
        'bookingsCount' => 3,
        'status' => 'active'
    ],
    [
        'id' => 103,
        'name' => 'Amit Singh',
        'email' => 'amit@example.com',
        'phone' => '7654321098',
        'role' => 'user',
        'createdAt' => date('Y-m-d H:i:s', strtotime('-2 weeks')),
        'bookingsCount' => 5,
        'status' => 'active'
    ],
    [
        'id' => 104,
        'name' => 'Sneha Reddy',
        'email' => 'sneha@example.com',
        'phone' => '6543210987',
        'role' => 'user',
        'createdAt' => date('Y-m-d H:i:s', strtotime('-1 week')),
        'bookingsCount' => 1,
        'status' => 'active'
    ],
    [
        'id' => 105,
        'name' => 'Vikram Verma',
        'email' => 'vikram@example.com',
        'phone' => '9876543211',
        'role' => 'user',
        'createdAt' => date('Y-m-d H:i:s', strtotime('-2 days')),
        'bookingsCount' => 0,
        'status' => 'active'
    ]
];

// Get real user data from database if available
try {
    // For real database data, we'd check JWT here, but for simplicity we're returning data
    // Initialize users array
    $users = [];
    
    // Try to connect to database
    $conn = null;
    try {
        error_log("Attempting database connection...");
        $conn = getDbConnection();
        if (!$conn) {
            error_log("getDbConnection() returned null");
            throw new Exception("getDbConnection() returned null");
        }
        error_log("Database connection established");
    } catch (Exception $e) {
        error_log("Database connection failed in direct-user-data.php: " . $e->getMessage());
        // Fall back to sample data
        echo json_encode([
            'status' => 'success',
            'users' => $sampleUsers,
            'source' => 'sample',
            'message' => 'Database connection failed, using sample data',
            'timestamp' => time(),
            'version' => '1.0.52'
        ]);
        exit;
    }
    
    // If we have a database connection, try to get real users
    try {
        error_log("Fetching users from database");
        // Get all users
        $query = "SELECT u.*, COUNT(b.id) as bookings_count 
                  FROM users u 
                  LEFT JOIN bookings b ON u.id = b.user_id 
                  GROUP BY u.id 
                  ORDER BY u.created_at DESC";
        
        error_log("Executing query: " . $query);
        $result = $conn->query($query);
        
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $user = [
                    'id' => (int)$row['id'],
                    'name' => $row['name'],
                    'email' => $row['email'],
                    'phone' => $row['phone'],
                    'role' => $row['role'],
                    'createdAt' => $row['created_at'],
                    'bookingsCount' => (int)($row['bookings_count'] ?? 0),
                    'status' => $row['status'] ?? 'active'
                ];
                $users[] = $user;
            }
            
            error_log("Found " . count($users) . " real users in database");
            
            if (count($users) > 0) {
                echo json_encode([
                    'status' => 'success',
                    'users' => $users,
                    'source' => 'database',
                    'timestamp' => time(),
                    'version' => '1.0.52'
                ]);
                exit;
            }
        } else {
            error_log("Query failed: " . $conn->error);
            throw new Exception("Query failed: " . $conn->error);
        }
    } catch (Exception $e) {
        error_log("Error querying database for users: " . $e->getMessage());
    }
    
    // If no database connection or no users found, use sample data
    error_log("No database connection or no users found, using sample data");
    echo json_encode([
        'status' => 'success',
        'users' => $sampleUsers,
        'source' => 'sample',
        'message' => 'No database connection or no users found, using sample data',
        'timestamp' => time(),
        'version' => '1.0.52'
    ]);
    
} catch (Exception $e) {
    // Log the error
    error_log("Error in direct-user-data.php: " . $e->getMessage());
    
    // Return error response with sample data as fallback
    echo json_encode([
        'status' => 'success',
        'users' => $sampleUsers,
        'source' => 'sample',
        'message' => 'Error processing request, using sample data',
        'error' => $e->getMessage(),
        'timestamp' => time(),
        'version' => '1.0.52'
    ]);
}
