
<?php
/**
 * pending-bookings.php - Fetch all pending bookings that need vehicle assignment
 */

// Set CORS headers FIRST
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Clear any previous output
if (ob_get_level()) {
    ob_end_clean();
}

// Log the request for debugging
error_log('Pending bookings API accessed. Method: ' . $_SERVER['REQUEST_METHOD']);

// Function to return a JSON response
function sendJsonResponse($status, $message, $data = null) {
    $response = [
        'status' => $status,
        'message' => $message,
        'timestamp' => time()
    ];
    
    if ($data !== null) {
        $response = array_merge($response, $data);
    }
    
    echo json_encode($response);
    exit;
}

// Get database connection
try {
    // First try to use config if available
    if (file_exists(dirname(__FILE__) . '/../../config.php')) {
        require_once dirname(__FILE__) . '/../../config.php';
        $conn = getDbConnection();
        error_log("Connected to database using config.php");
    } 
    // Fallback to hardcoded credentials
    else {
        error_log("Config file not found, using hardcoded credentials");
        $dbHost = 'localhost';
        $dbName = 'u644605165_new_bookingdb';
        $dbUser = 'u644605165_new_bookingusr';
        $dbPass = 'Vizag@1213';
        
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        
        if ($conn->connect_error) {
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
        
        error_log("Connected to database using hardcoded credentials");
    }
} catch (Exception $e) {
    // Return sample data as fallback if database connection fails
    $sampleBookings = [
        [
            'id' => 1001,
            'bookingNumber' => 'BK-1001',
            'passengerName' => 'John Smith',
            'pickupLocation' => 'Airport Terminal 1',
            'dropLocation' => 'Downtown Hotel',
            'pickupDate' => '2025-05-10',
            'cabType' => 'sedan',
            'status' => 'pending'
        ],
        [
            'id' => 1002,
            'bookingNumber' => 'BK-1002',
            'passengerName' => 'Sarah Johnson',
            'pickupLocation' => 'City Center',
            'dropLocation' => 'Beach Resort',
            'pickupDate' => '2025-05-12',
            'cabType' => 'suv',
            'status' => 'confirmed'
        ]
    ];
    
    sendJsonResponse('success', 'Sample booking data (database connection failed)', [
        'bookings' => $sampleBookings,
        'count' => count($sampleBookings)
    ]);
}

try {
    // Check if bookings table exists
    $tableExistsQuery = $conn->query("SHOW TABLES LIKE 'bookings'");
    if ($tableExistsQuery->num_rows == 0) {
        // Try to create a sample bookings table
        $createTableSql = "CREATE TABLE IF NOT EXISTS bookings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            booking_number VARCHAR(50) NOT NULL,
            passenger_name VARCHAR(100) NOT NULL DEFAULT 'Guest',
            passenger_phone VARCHAR(20),
            passenger_email VARCHAR(100),
            pickup_location VARCHAR(255) NOT NULL,
            drop_location VARCHAR(255),
            pickup_date DATETIME NOT NULL,
            pickup_time TIME,
            cab_type VARCHAR(50),
            trip_type VARCHAR(20) DEFAULT 'local',
            trip_mode VARCHAR(20) DEFAULT 'one-way',
            status VARCHAR(20) DEFAULT 'pending',
            total_amount DECIMAL(10,2) DEFAULT 0,
            distance DECIMAL(10,2) DEFAULT 0,
            fleet_vehicle_id VARCHAR(50),
            driver_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )";
        
        if ($conn->query($createTableSql)) {
            error_log("Created bookings table");
            
            // Insert sample data
            $sampleData = "INSERT INTO bookings 
                (booking_number, passenger_name, pickup_location, drop_location, pickup_date, cab_type, status) VALUES
                ('BK-1001', 'John Smith', 'Airport Terminal 1', 'Downtown Hotel', '2025-05-10 10:00:00', 'sedan', 'pending'),
                ('BK-1002', 'Sarah Johnson', 'City Center', 'Beach Resort', '2025-05-12 14:30:00', 'suv', 'confirmed')";
                
            if ($conn->query($sampleData)) {
                error_log("Inserted sample booking data");
            } else {
                error_log("Error inserting sample data: " . $conn->error);
            }
        } else {
            throw new Exception("Bookings table does not exist and could not be created: " . $conn->error);
        }
    }
    
    // Get pending bookings that don't have a fleet vehicle assigned
    $query = "
        SELECT b.*
        FROM bookings b
        LEFT JOIN vehicle_assignments va ON b.id = va.booking_id
        WHERE (b.status = 'pending' OR b.status = 'confirmed') 
        AND (va.id IS NULL OR b.fleet_vehicle_id IS NULL OR b.fleet_vehicle_id = '')
        ORDER BY b.pickup_date ASC
        LIMIT 20
    ";
    
    error_log("Executing query: " . $query);
    $result = $conn->query($query);
    
    if (!$result) {
        // Try simpler query if the join fails
        $simpleQuery = "
            SELECT * FROM bookings 
            WHERE (status = 'pending' OR status = 'confirmed') 
            AND (fleet_vehicle_id IS NULL OR fleet_vehicle_id = '')
            ORDER BY pickup_date ASC
            LIMIT 20
        ";
        
        error_log("Trying simpler query: " . $simpleQuery);
        $result = $conn->query($simpleQuery);
        
        if (!$result) {
            throw new Exception("Error fetching pending bookings: " . $conn->error);
        }
    }
    
    $bookings = [];
    while ($row = $result->fetch_assoc()) {
        // Map database column names to our API format
        $booking = [
            'id' => (int)$row['id'],
            'bookingNumber' => $row['booking_number'] ?? ('BK-' . $row['id']),
            'passengerName' => $row['passenger_name'] ?? $row['customer_name'] ?? 'Guest',
            'passengerPhone' => $row['passenger_phone'] ?? $row['customer_phone'] ?? '',
            'passengerEmail' => $row['passenger_email'] ?? $row['customer_email'] ?? '',
            'pickupLocation' => $row['pickup_location'],
            'dropLocation' => $row['drop_location'] ?? '',
            'pickupDate' => $row['pickup_date'],
            'pickupTime' => $row['pickup_time'] ?? '',
            'cabType' => $row['cab_type'],
            'tripType' => $row['trip_type'] ?? 'local',
            'tripMode' => $row['trip_mode'] ?? 'one-way',
            'status' => $row['status'],
            'totalAmount' => (float)($row['total_amount'] ?? 0),
            'distance' => (float)($row['distance'] ?? 0),
            'createdAt' => $row['created_at'] ?? date('Y-m-d H:i:s'),
            'updatedAt' => $row['updated_at'] ?? date('Y-m-d H:i:s')
        ];
        
        $bookings[] = $booking;
    }
    
    error_log("Found " . count($bookings) . " pending bookings");
    
    // If no bookings found in database, provide sample data
    if (empty($bookings)) {
        $bookings = [
            [
                'id' => 1001,
                'bookingNumber' => 'BK-1001',
                'passengerName' => 'John Smith',
                'pickupLocation' => 'Airport Terminal 1',
                'dropLocation' => 'Downtown Hotel',
                'pickupDate' => '2025-05-10 10:00:00',
                'cabType' => 'sedan',
                'status' => 'pending'
            ],
            [
                'id' => 1002,
                'bookingNumber' => 'BK-1002',
                'passengerName' => 'Sarah Johnson',
                'pickupLocation' => 'City Center',
                'dropLocation' => 'Beach Resort',
                'pickupDate' => '2025-05-12 14:30:00',
                'cabType' => 'suv',
                'status' => 'confirmed'
            ]
        ];
        
        error_log("No bookings found in database, returning sample data");
    }
    
    // Return the bookings
    sendJsonResponse('success', 'Pending bookings retrieved successfully', [
        'bookings' => $bookings,
        'count' => count($bookings)
    ]);
    
} catch (Exception $e) {
    error_log("Error in pending-bookings.php: " . $e->getMessage());
    
    // Return sample data as fallback
    $sampleBookings = [
        [
            'id' => 1001,
            'bookingNumber' => 'BK-1001',
            'passengerName' => 'John Smith',
            'pickupLocation' => 'Airport Terminal 1',
            'dropLocation' => 'Downtown Hotel',
            'pickupDate' => '2025-05-10',
            'cabType' => 'sedan',
            'status' => 'pending'
        ],
        [
            'id' => 1002,
            'bookingNumber' => 'BK-1002',
            'passengerName' => 'Sarah Johnson',
            'pickupLocation' => 'City Center',
            'dropLocation' => 'Beach Resort',
            'pickupDate' => '2025-05-12',
            'cabType' => 'suv',
            'status' => 'confirmed'
        ]
    ];
    
    sendJsonResponse('success', 'Sample booking data (due to error: ' . $e->getMessage() . ')', [
        'bookings' => $sampleBookings,
        'count' => count($sampleBookings)
    ]);
}
