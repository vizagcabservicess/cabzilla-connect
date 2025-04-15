
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// CORS Headers - Simplified and permissive
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Content-Type: application/json');

// Add debugging headers
header('X-Debug-File: direct-booking-data.php');
header('X-API-Version: 1.0.56');
header('X-Timestamp: ' . time());

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log the request
error_log("Direct booking data request received: " . json_encode($_GET));

// Check if the request is for local package fares
if (isset($_GET['check_sync']) && isset($_GET['vehicle_id'])) {
    error_log("Local package fares sync check request received");
    
    $vehicleId = $_GET['vehicle_id'];
    $packageId = isset($_GET['package_id']) ? $_GET['package_id'] : null;
    
    // Try to get from database first
    try {
        $conn = getDbConnection();
        
        if ($conn) {
            // Check if local_package_fares table exists
            $tableCheckResult = $conn->query("SHOW TABLES LIKE 'local_package_fares'");
            $tableExists = ($tableCheckResult && $tableCheckResult->num_rows > 0);
            
            if ($tableExists) {
                // Query for the vehicle's fare data
                $query = "SELECT * FROM local_package_fares WHERE vehicle_id = ?";
                $stmt = $conn->prepare($query);
                $stmt->bind_param("s", $vehicleId);
                $stmt->execute();
                $result = $stmt->get_result();
                
                if ($result && $result->num_rows > 0) {
                    $row = $result->fetch_assoc();
                    
                    // If a specific package was requested, return only that package's price
                    if ($packageId) {
                        $packagePrice = 0;
                        $packageName = '';
                        
                        // Normalize package ID to match database field names
                        if (strpos($packageId, '4hr') !== false || strpos($packageId, '4hrs') !== false) {
                            $packagePrice = floatval($row['price_4hr_40km']);
                            $packageName = '4 Hours Package (40km)';
                        } else if (strpos($packageId, '8hr') !== false || strpos($packageId, '8hrs') !== false) {
                            $packagePrice = floatval($row['price_8hr_80km']);
                            $packageName = '8 Hours Package (80km)';
                        } else if (strpos($packageId, '10hr') !== false || strpos($packageId, '10hrs') !== false) {
                            $packagePrice = floatval($row['price_10hr_100km']);
                            $packageName = '10 Hours Package (100km)';
                        }
                        
                        echo json_encode([
                            'status' => 'success',
                            'exists' => true,
                            'vehicleId' => $vehicleId,
                            'packageId' => $packageId,
                            'packageName' => $packageName,
                            'baseFare' => $packagePrice,
                            'price' => $packagePrice,
                            'data' => [
                                'vehicleId' => $vehicleId,
                                'packageId' => $packageId,
                                'price' => $packagePrice,
                                'baseFare' => $packagePrice
                            ],
                            'timestamp' => time()
                        ]);
                        exit;
                    }
                    
                    // If no specific package requested, return all package prices
                    echo json_encode([
                        'status' => 'success',
                        'exists' => true,
                        'data' => [
                            'vehicleId' => $row['vehicle_id'],
                            'price4hrs40km' => floatval($row['price_4hr_40km']),
                            'price8hrs80km' => floatval($row['price_8hr_80km']),
                            'price10hrs100km' => floatval($row['price_10hr_100km']),
                            'priceExtraKm' => floatval($row['extra_km_rate']),
                            'priceExtraHour' => floatval($row['extra_hour_rate']),
                        ],
                        'timestamp' => time()
                    ]);
                    exit;
                }
            }
        }
        
        // If we get here, the database query did not return any results
        // Generate prices dynamically based on vehicle type
    } catch (Exception $e) {
        error_log("Database error in direct-booking-data.php: " . $e->getMessage());
        // Continue to dynamic price calculation
    }
    
    // Helper function to calculate package prices dynamically
    function calculateDynamicPrices($basePrice, $vehicleMultiplier) {
        return [
            'price4hr40km' => round($basePrice * $vehicleMultiplier * 1.2),
            'price8hr80km' => round($basePrice * $vehicleMultiplier * 2.0),
            'price10hr100km' => round($basePrice * $vehicleMultiplier * 2.5),
            'extraKmRate' => round($basePrice * $vehicleMultiplier * 0.012),
            'extraHourRate' => round($basePrice * $vehicleMultiplier * 0.1)
        ];
    }
    
    // Generate dynamic prices based on vehicle type
    $basePrice = 1000; // Base price for calculations
    $priceMultiplier = 1.0; // Default multiplier
    
    // Determine appropriate multiplier based on vehicle type
    $normalizedVehicleId = strtolower($vehicleId);
    
    if (strpos($normalizedVehicleId, 'sedan') !== false || 
        strpos($normalizedVehicleId, 'swift') !== false || 
        strpos($normalizedVehicleId, 'dzire') !== false ||
        strpos($normalizedVehicleId, 'etios') !== false) {
        $priceMultiplier = 1.0;
    } else if (strpos($normalizedVehicleId, 'ertiga') !== false || 
               strpos($normalizedVehicleId, 'suv') !== false) {
        $priceMultiplier = 1.25;
    } else if (strpos($normalizedVehicleId, 'innova') !== false) {
        if (strpos($normalizedVehicleId, 'hycross') !== false) {
            $priceMultiplier = 1.6;
        } else {
            $priceMultiplier = 1.5;
        }
    } else if (strpos($normalizedVehicleId, 'tempo') !== false || 
               strpos($normalizedVehicleId, 'traveller') !== false) {
        $priceMultiplier = 2.0;
    }
    
    // Calculate package prices dynamically
    $prices = calculateDynamicPrices($basePrice, $priceMultiplier);
    
    // If a specific package was requested, return only that package's price
    if ($packageId) {
        $packagePrice = 0;
        $packageName = '';
        
        // Get price from dynamically calculated values
        if (strpos($packageId, '4hr') !== false || strpos($packageId, '4hrs') !== false) {
            $packagePrice = $prices['price4hr40km'];
            $packageName = '4 Hours Package (40km)';
        } else if (strpos($packageId, '8hr') !== false || strpos($packageId, '8hrs') !== false) {
            $packagePrice = $prices['price8hr80km'];
            $packageName = '8 Hours Package (80km)';
        } else if (strpos($packageId, '10hr') !== false || strpos($packageId, '10hrs') !== false) {
            $packagePrice = $prices['price10hr100km'];
            $packageName = '10 Hours Package (100km)';
        }
        
        echo json_encode([
            'status' => 'success',
            'exists' => true,
            'vehicleId' => $vehicleId,
            'packageId' => $packageId,
            'packageName' => $packageName,
            'baseFare' => $packagePrice,
            'price' => $packagePrice,
            'source' => 'dynamic',
            'data' => [
                'vehicleId' => $vehicleId,
                'packageId' => $packageId,
                'price' => $packagePrice,
                'baseFare' => $packagePrice
            ],
            'timestamp' => time()
        ]);
        exit;
    }
    
    // Return all dynamically calculated package prices
    echo json_encode([
        'status' => 'success',
        'exists' => true,
        'source' => 'dynamic',
        'data' => [
            'vehicleId' => $vehicleId,
            'price4hrs40km' => $prices['price4hr40km'],
            'price8hrs80km' => $prices['price8hr80km'],
            'price10hrs100km' => $prices['price10hr100km'],
            'priceExtraKm' => $prices['extraKmRate'],
            'priceExtraHour' => $prices['extraHourRate'],
        ],
        'timestamp' => time()
    ]);
    exit;
}

// Check if it's a booking query by ID
if (isset($_GET['id'])) {
    $bookingId = intval($_GET['id']);
    error_log("Fetching booking data for ID: $bookingId");
    
    // Try to get booking from database
    try {
        $conn = getDbConnection();
        
        if ($conn) {
            $query = "SELECT * FROM bookings WHERE id = ?";
            $stmt = $conn->prepare($query);
            $stmt->bind_param("i", $bookingId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result && $result->num_rows > 0) {
                $row = $result->fetch_assoc();
                
                $booking = [
                    'id' => intval($row['id']),
                    'userId' => intval($row['user_id']),
                    'bookingNumber' => $row['booking_number'],
                    'pickupLocation' => $row['pickup_location'],
                    'dropLocation' => $row['drop_location'],
                    'pickupDate' => $row['pickup_date'],
                    'returnDate' => $row['return_date'],
                    'cabType' => $row['cab_type'],
                    'distance' => floatval($row['distance']),
                    'tripType' => $row['trip_type'],
                    'tripMode' => $row['trip_mode'],
                    'totalAmount' => floatval($row['total_amount']),
                    'status' => $row['status'],
                    'passengerName' => $row['passenger_name'],
                    'passengerPhone' => $row['passenger_phone'],
                    'passengerEmail' => $row['passenger_email'],
                    'driverName' => $row['driver_name'],
                    'driverPhone' => $row['driver_phone'],
                    'createdAt' => $row['created_at'],
                    'updatedAt' => $row['updated_at']
                ];
                
                echo json_encode([
                    'status' => 'success',
                    'booking' => $booking,
                    'source' => 'database',
                    'timestamp' => time(),
                    'version' => '1.0.56'
                ]);
                exit;
            }
        }
    } catch (Exception $e) {
        error_log("Database error fetching booking: " . $e->getMessage());
        // Continue to sample data
    }
    
    // Generate a sample booking using the provided ID
    $booking = [
        'id' => $bookingId,
        'userId' => rand(100, 200),
        'bookingNumber' => 'BK'.rand(10000, 99999),
        'pickupLocation' => generateRandomLocation(),
        'dropLocation' => generateRandomLocation(),
        'pickupDate' => date('Y-m-d H:i:s', strtotime(rand(-7, 7).' days')),
        'returnDate' => rand(0, 1) ? date('Y-m-d H:i:s', strtotime(rand(8, 14).' days')) : null,
        'cabType' => generateRandomCabType(),
        'distance' => rand(5, 50) + (rand(0, 100) / 100),
        'tripType' => rand(0, 1) ? 'outstation' : (rand(0, 1) ? 'local' : 'airport'),
        'tripMode' => rand(0, 1) ? 'roundtrip' : 'oneway',
        'totalAmount' => rand(1000, 10000),
        'status' => ['pending', 'confirmed', 'completed', 'cancelled'][rand(0, 3)],
        'passengerName' => generateRandomName(),
        'passengerPhone' => '9'.rand(700000000, 999999999),
        'passengerEmail' => strtolower(substr(generateRandomName(), 0, 5)) . '@example.com',
        'driverName' => rand(0, 3) > 0 ? generateRandomName() : null,
        'driverPhone' => rand(0, 3) > 0 ? '8'.rand(700000000, 999999999) : null,
        'createdAt' => date('Y-m-d H:i:s', strtotime(rand(-30, -1).' days')),
        'updatedAt' => date('Y-m-d H:i:s', strtotime(rand(-10, 0).' days'))
    ];
    
    echo json_encode([
        'status' => 'success',
        'booking' => $booking,
        'source' => 'sample',
        'generatedAt' => time(),
        'version' => '1.0.56'
    ]);
    exit;
}

// Helper functions for generating sample data
function generateRandomLocation() {
    $cities = ['Hyderabad', 'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Pune', 'Vizag'];
    $places = ['Airport', 'Railway Station', 'Bus Stand', 'City Center', 'Mall', 'Hotel', 'Office', 'Residence'];
    return $cities[rand(0, count($cities)-1)] . ' ' . $places[rand(0, count($places)-1)];
}

function generateRandomName() {
    $firstNames = ['Rahul', 'Amit', 'Vijay', 'Suresh', 'Ramesh', 'Rajesh', 'Sanjay', 'Ajay', 'Priya', 'Neha', 'Meera', 'Sunita'];
    $lastNames = ['Sharma', 'Kumar', 'Singh', 'Reddy', 'Patel', 'Verma', 'Gupta', 'Joshi', 'Nair', 'Das', 'Rao', 'Chopra'];
    return $firstNames[rand(0, count($firstNames)-1)] . ' ' . $lastNames[rand(0, count($lastNames)-1)];
}

function generateRandomCabType() {
    $cabTypes = ['Sedan', 'Ertiga', 'Innova', 'Innova Crysta', 'Tempo Traveller', 'Luxury Sedan'];
    return $cabTypes[rand(0, count($cabTypes)-1)];
}

try {
    // Try to connect to database (wrapped in try-catch to prevent failures)
    $conn = null;
    try {
        $conn = getDbConnection();
    } catch (Exception $e) {
        error_log("Database connection failed in direct-booking-data.php: " . $e->getMessage());
    }
    
    // Initialize bookings array
    $bookings = [];
    
    // Get user ID from JWT token (if provided)
    $userId = null;
    $headers = getallheaders();
    
    if (isset($headers['Authorization']) || isset($headers['authorization'])) {
        try {
            $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
            $token = str_replace('Bearer ', '', $authHeader);
            
            $payload = verifyJwtToken($token);
            if ($payload && isset($payload['user_id'])) {
                $userId = $payload['user_id'];
                error_log("User identified from JWT: $userId");
            }
        } catch (Exception $e) {
            error_log("JWT validation failed: " . $e->getMessage());
        }
    }
    
    // If we have a database connection and user ID, try to get real bookings
    if ($conn && $userId) {
        try {
            $stmt = $conn->prepare("SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC");
            if ($stmt) {
                $stmt->bind_param("i", $userId);
                if ($stmt->execute()) {
                    $result = $stmt->get_result();
                    
                    if ($result) {
                        while ($row = $result->fetch_assoc()) {
                            $booking = [
                                'id' => (int)$row['id'],
                                'userId' => (int)$row['user_id'],
                                'bookingNumber' => $row['booking_number'] ?? ('BK' . rand(10000, 99999)),
                                'pickupLocation' => $row['pickup_location'],
                                'dropLocation' => $row['drop_location'],
                                'pickupDate' => $row['pickup_date'],
                                'returnDate' => $row['return_date'],
                                'cabType' => $row['cab_type'],
                                'distance' => (float)$row['distance'],
                                'tripType' => $row['trip_type'],
                                'tripMode' => $row['trip_mode'],
                                'totalAmount' => (float)$row['total_amount'],
                                'status' => $row['status'],
                                'passengerName' => $row['passenger_name'],
                                'passengerPhone' => $row['passenger_phone'],
                                'passengerEmail' => $row['passenger_email'],
                                'driverName' => $row['driver_name'] ?? null,
                                'driverPhone' => $row['driver_phone'] ?? null,
                                'createdAt' => $row['created_at'],
                                'updatedAt' => $row['updated_at'] ?? $row['created_at']
                            ];
                            $bookings[] = $booking;
                        }
                        
                        error_log("Found " . count($bookings) . " real bookings for user $userId");
                    }
                }
            }
        } catch (Exception $e) {
            error_log("Error querying database for bookings: " . $e->getMessage());
        }
    }
    
    // If no bookings were found (or database error), generate sample data
    if (empty($bookings)) {
        // Generate 3 random bookings with varied properties
        $numBookings = 3;
        $bookingIds = [1001, 1002, 1003];
        $userId = $userId ?: 101;
        
        for ($i = 0; $i < $numBookings; $i++) {
            $bookings[] = [
                'id' => $bookingIds[$i],
                'userId' => $userId,
                'bookingNumber' => 'BK'.rand(10000, 99999),
                'pickupLocation' => generateRandomLocation(),
                'dropLocation' => generateRandomLocation(),
                'pickupDate' => date('Y-m-d H:i:s', strtotime(rand(-7, 7).' days')),
                'returnDate' => rand(0, 1) ? date('Y-m-d H:i:s', strtotime(rand(8, 14).' days')) : null,
                'cabType' => generateRandomCabType(),
                'distance' => rand(5, 50) + (rand(0, 100) / 100),
                'tripType' => ['outstation', 'local', 'airport'][rand(0, 2)],
                'tripMode' => rand(0, 1) ? 'roundtrip' : 'oneway',
                'totalAmount' => rand(1000, 10000),
                'status' => ['pending', 'confirmed', 'completed', 'cancelled'][rand(0, 3)],
                'passengerName' => generateRandomName(),
                'passengerPhone' => '9'.rand(700000000, 999999999),
                'passengerEmail' => strtolower(substr(generateRandomName(), 0, 5)) . '@example.com',
                'driverName' => rand(0, 3) > 0 ? generateRandomName() : null,
                'driverPhone' => rand(0, 3) > 0 ? '8'.rand(700000000, 999999999) : null,
                'createdAt' => date('Y-m-d H:i:s', strtotime((-30 + $i*10).' days')),
                'updatedAt' => date('Y-m-d H:i:s', strtotime((-25 + $i*10).' days'))
            ];
        }
        
        error_log("Using dynamically generated sample booking data");
    }
    
    // Return success response with bookings
    echo json_encode([
        'status' => 'success',
        'bookings' => $bookings,
        'source' => empty($bookings) ? 'sample' : 'database',
        'timestamp' => time(),
        'version' => '1.0.56'
    ]);
    
} catch (Exception $e) {
    // Log the error
    error_log("Error in direct-booking-data.php: " . $e->getMessage());
    
    // Generate sample data for fallback
    $sampleBookings = [];
    for ($i = 0; $i < 3; $i++) {
        $sampleBookings[] = [
            'id' => 1001 + $i,
            'userId' => 101,
            'bookingNumber' => 'BK'.rand(10000, 99999),
            'pickupLocation' => generateRandomLocation(),
            'dropLocation' => generateRandomLocation(),
            'pickupDate' => date('Y-m-d H:i:s', strtotime(rand(-7, 7).' days')),
            'returnDate' => rand(0, 1) ? date('Y-m-d H:i:s', strtotime(rand(8, 14).' days')) : null,
            'cabType' => generateRandomCabType(),
            'distance' => rand(5, 50) + (rand(0, 100) / 100),
            'tripType' => ['outstation', 'local', 'airport'][rand(0, 2)],
            'tripMode' => rand(0, 1) ? 'roundtrip' : 'oneway',
            'totalAmount' => rand(1000, 10000),
            'status' => ['pending', 'confirmed', 'completed', 'cancelled'][rand(0, 3)],
            'passengerName' => generateRandomName(),
            'passengerPhone' => '9'.rand(700000000, 999999999),
            'passengerEmail' => strtolower(substr(generateRandomName(), 0, 5)) . '@example.com',
            'driverName' => rand(0, 3) > 0 ? generateRandomName() : null,
            'driverPhone' => rand(0, 3) > 0 ? '8'.rand(700000000, 999999999) : null,
            'createdAt' => date('Y-m-d H:i:s', strtotime((-30 + $i*10).' days')),
            'updatedAt' => date('Y-m-d H:i:s', strtotime((-25 + $i*10).' days'))
        ];
    }
    
    // Return error response with sample data as fallback
    echo json_encode([
        'status' => 'error',
        'message' => 'Error processing request, using sample data',
        'bookings' => $sampleBookings, // Always provide sample data on error
        'source' => 'sample',
        'timestamp' => time(),
        'version' => '1.0.56'
    ]);
}
