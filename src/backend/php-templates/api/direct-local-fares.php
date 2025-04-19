
<?php
// Enhanced direct-local-fares.php with improved dynamic vehicle support
// This file provides improved database connectivity and dynamic fare calculation

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Content-Type: application/json');
header('X-API-Version: 1.1.0');
header('X-Debug-File: direct-local-fares.php');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Add error logging
error_log("Direct local fares API called at " . date('Y-m-d H:i:s'));

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get vehicle ID from query string
$vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null;
$packageId = isset($_GET['package_id']) ? $_GET['package_id'] : null;

// If vehicle ID is not in query string, check for it in JSON body for POST requests
if (!$vehicleId && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $vehicleId = isset($data['vehicleId']) ? $data['vehicleId'] : (isset($data['vehicle_id']) ? $data['vehicle_id'] : null);
}

// If vehicle ID is not in JSON body, check POST data
if (!$vehicleId && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $vehicleId = isset($_POST['vehicleId']) ? $_POST['vehicleId'] : (isset($_POST['vehicle_id']) ? $_POST['vehicle_id'] : null);
}

if (!$vehicleId) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required',
        'timestamp' => time()
    ]);
    error_log("Error: Vehicle ID is required");
    exit;
}

// Log request for debugging
error_log("Local fare request for vehicle: $vehicleId, package: " . ($packageId ?: 'not specified'));

// Function to get database connection, with retry mechanism
function getDatabaseConnection($maxRetries = 3) {
    $retries = 0;
    $lastError = null;
    
    while ($retries < $maxRetries) {
        try {
            // Hard-coded database credentials for maximum reliability
            $dbHost = 'localhost';
            $dbName = 'u644605165_db_be';
            $dbUser = 'u644605165_usr_be';
            $dbPass = 'Vizag@1213';
            
            $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
            
            if (!$conn->connect_error) {
                error_log("Database connection successful on attempt " . ($retries + 1));
                return $conn;
            } else {
                throw new Exception("Connection error: " . $conn->connect_error);
            }
        } catch (Exception $e) {
            $lastError = $e;
            $retries++;
            error_log("Database connection attempt $retries failed: " . $e->getMessage());
            
            if ($retries < $maxRetries) {
                sleep(1); // Wait before retrying
            }
        }
    }
    
    if ($lastError) {
        error_log("All database connection attempts failed: " . $lastError->getMessage());
    } else {
        error_log("Database connection failed after $maxRetries attempts with no specific error");
    }
    
    return null;
}

try {
    // Initialize connection
    $conn = null;
    $usingDatabase = false;
    $usingMockData = true;
    $databaseError = null;
    
    // First, try to get a database connection
    $conn = getDatabaseConnection();
    
    if ($conn) {
        $usingDatabase = true;
        $usingMockData = false;
        error_log("Successfully established database connection");
    } else {
        $databaseError = "Failed to connect to database after multiple attempts";
        error_log($databaseError);
    }
    
    // Initialize fares array
    $localFares = [];
    
    // If we have a database connection, try to get real fare data
    if ($conn && $usingDatabase) {
        // Normalize the vehicle ID for better matching
        $originalVehicleId = $vehicleId;
        $normalizedVehicleId = strtolower(str_replace(' ', '_', $vehicleId));
        
        // Log the query attempt
        error_log("Attempting to query database for vehicle_id: $vehicleId or normalized as: $normalizedVehicleId");
        
        // Try multiple approaches to find the right vehicle data
        $vehicleFound = false;
        
        // 1. First try exact match with original ID
        $query = "SELECT * FROM local_package_fares WHERE vehicle_id = ?";
        $stmt = $conn->prepare($query);
        if (!$stmt) {
            error_log("Failed to prepare statement: " . $conn->error);
        } else {
            $stmt->bind_param("s", $vehicleId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result && $result->num_rows > 0) {
                $vehicleFound = true;
                error_log("Found exact match for vehicle_id: $vehicleId");
            } else {
                // 2. Try with normalized ID
                error_log("No exact match found for vehicle_id: $vehicleId, trying normalized ID");
                $stmt = $conn->prepare($query);
                $stmt->bind_param("s", $normalizedVehicleId);
                $stmt->execute();
                $result = $stmt->get_result();
                
                if ($result && $result->num_rows > 0) {
                    $vehicleFound = true;
                    error_log("Found match using normalized ID: $normalizedVehicleId");
                } else {
                    // 3. Try partial match using LIKE
                    error_log("No exact or normalized match found, trying partial match");
                    $likePattern = '%' . str_replace('_', '%', $normalizedVehicleId) . '%';
                    $query = "SELECT * FROM local_package_fares WHERE vehicle_id LIKE ?";
                    $stmt = $conn->prepare($query);
                    $stmt->bind_param("s", $likePattern);
                    $stmt->execute();
                    $result = $stmt->get_result();
                    
                    if ($result && $result->num_rows > 0) {
                        $vehicleFound = true;
                        error_log("Found match using LIKE pattern: $likePattern");
                    } else {
                        // 4. If still not found, try to get default pricing data
                        error_log("No matches found with any method, looking for default pricing");
                        $query = "SELECT * FROM default_pricing WHERE 1";
                        $result = $conn->query($query);
                        
                        if ($result && $result->num_rows > 0) {
                            $vehicleFound = true;
                            error_log("Using default pricing data");
                        }
                    }
                }
            }
        }
        
        if ($vehicleFound && $result && $result->num_rows > 0) {
            $row = $result->fetch_assoc();
            error_log("Found fare data in database for $vehicleId: " . json_encode($row));
            
            $localFares[] = [
                'vehicleId' => $originalVehicleId, // Use the original vehicle ID for consistency
                'price4hrs40km' => (float)$row['price_4hrs_40km'],
                'price8hrs80km' => (float)$row['price_8hrs_80km'],
                'price10hrs100km' => (float)$row['price_10hrs_100km'],
                'priceExtraKm' => (float)$row['price_extra_km'],
                'priceExtraHour' => (float)$row['price_extra_hour']
            ];
            
            $usingMockData = false;
            error_log("Using database data for $vehicleId");
        } else {
            error_log("No database records found for $vehicleId, falling back to mock data");
            $usingMockData = true;
        }
    } else {
        error_log("No valid database connection available. Error: " . ($databaseError ?: "Unknown"));
    }
    
    // If we don't have database data, use mock data
    if ($usingMockData) {
        error_log("Using mock data for $vehicleId");
        // Normalize the vehicle ID for mock data lookup
        $normalizedId = strtolower(str_replace(' ', '_', $vehicleId));
        
        // Define mock data based on vehicle type - USING THE SAME VALUES AS DATABASE
        // This ensures consistency even when database is unavailable
        $mockFares = [
            'sedan' => [
                'price4hrs40km' => 1400,
                'price8hrs80km' => 2400,
                'price10hrs100km' => 3000,
                'priceExtraKm' => 13,
                'priceExtraHour' => 300
            ],
            'ertiga' => [
                'price4hrs40km' => 1500,
                'price8hrs80km' => 3000,
                'price10hrs100km' => 3500,
                'priceExtraKm' => 18,
                'priceExtraHour' => 250
            ],
            'innova_crysta' => [
                'price4hrs40km' => 1800,
                'price8hrs80km' => 3500,
                'price10hrs100km' => 4000,
                'priceExtraKm' => 20,
                'priceExtraHour' => 400
            ],
            'tempo' => [
                'price4hrs40km' => 3000,
                'price8hrs80km' => 4500,
                'price10hrs100km' => 5500,
                'priceExtraKm' => 22,
                'priceExtraHour' => 300
            ],
            'luxury' => [
                'price4hrs40km' => 3500,
                'price8hrs80km' => 5500,
                'price10hrs100km' => 6500,
                'priceExtraKm' => 25,
                'priceExtraHour' => 300
            ],
            'mpv' => [
                'price4hrs40km' => 2000,
                'price8hrs80km' => 4000,
                'price10hrs100km' => 4500,
                'priceExtraKm' => 22,
                'priceExtraHour' => 450
            ],
            'toyota' => [
                'price4hrs40km' => 1400,
                'price8hrs80km' => 2400,
                'price10hrs100km' => 3000,
                'priceExtraKm' => 14,
                'priceExtraHour' => 300
            ],
            'dzire_cng' => [
                'price4hrs40km' => 1400,
                'price8hrs80km' => 2400,
                'price10hrs100km' => 3000,
                'priceExtraKm' => 14,
                'priceExtraHour' => 300
            ],
            'tempo_traveller' => [
                'price4hrs40km' => 6500,
                'price8hrs80km' => 6500,
                'price10hrs100km' => 7500,
                'priceExtraKm' => 35,
                'priceExtraHour' => 750
            ],
            'amaze' => [
                'price4hrs40km' => 1400,
                'price8hrs80km' => 2400,
                'price10hrs100km' => 3000,
                'priceExtraKm' => 14,
                'priceExtraHour' => 300
            ],
            'bus' => [
                'price4hrs40km' => 3000,
                'price8hrs80km' => 7000,
                'price10hrs100km' => 9000,
                'priceExtraKm' => 40,
                'priceExtraHour' => 900
            ],
            // Default fallback
            'default' => [
                'price4hrs40km' => 2000,
                'price8hrs80km' => 3500,
                'price10hrs100km' => 4000,
                'priceExtraKm' => 20,
                'priceExtraHour' => 300
            ]
        ];
        
        // Check for direct match
        if (isset($mockFares[$normalizedId])) {
            $fare = $mockFares[$normalizedId];
            $localFares[] = array_merge(['vehicleId' => $vehicleId], $fare);
            error_log("Found exact match in mock data for: $normalizedId");
        } 
        // Check for partial matches
        else {
            $matched = false;
            foreach ($mockFares as $key => $fare) {
                if (strpos($normalizedId, $key) !== false || strpos($key, $normalizedId) !== false) {
                    $localFares[] = array_merge(['vehicleId' => $vehicleId], $fare);
                    $matched = true;
                    error_log("Found partial match in mock data: $normalizedId matches with $key");
                    break;
                }
            }
            
            // If no match found, use default data
            if (!$matched) {
                error_log("No match found in mock data, using default fares for: $normalizedId");
                $localFares[] = array_merge(['vehicleId' => $vehicleId], $mockFares['default']);
            }
        }
    }
    
    // Return JSON response
    $responseData = [
        'status' => 'success',
        'message' => 'Local fares retrieved successfully',
        'fares' => $localFares,
        'source' => $usingMockData ? 'mock' : 'database',
        'timestamp' => time(),
        'debug' => [
            'vehicleId' => $vehicleId,
            'normalizedId' => strtolower(str_replace(' ', '_', $vehicleId)),
            'usingDatabase' => $usingDatabase,
            'usingMockData' => $usingMockData,
            'databaseError' => $databaseError
        ]
    ];
    
    echo json_encode($responseData);
    error_log("Response sent: " . json_encode(['status' => $responseData['status'], 'source' => $responseData['source'], 'fareCount' => count($localFares)]));
    
} catch (Exception $e) {
    error_log("Error in direct-local-fares.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Server error: ' . $e->getMessage(),
        'timestamp' => time()
    ]);
}
