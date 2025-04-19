
<?php
// Mock PHP file for direct-local-fares.php (admin version)
// Synced with the main direct-local-fares.php to ensure consistency

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');
header('X-API-Version: 1.0.10');
header('X-Debug-File: admin/direct-local-fares.php');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Add error logging
error_log("Admin Direct local fares API called at " . date('Y-m-d H:i:s'));

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Handle POST request for fare updates
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Check if this is a fare update request
    $vehicleId = isset($_POST['vehicleId']) ? $_POST['vehicleId'] : (isset($_POST['vehicle_id']) ? $_POST['vehicle_id'] : null);
    
    if ($vehicleId && isset($_POST['price4hrs40km']) && isset($_POST['price8hrs80km']) && isset($_POST['price10hrs100km'])) {
        try {
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

            // Get database connection
            $conn = getDatabaseConnection();
            
            if (!$conn) {
                throw new Exception("Failed to connect to database");
            }
            
            // Extract fare values
            $price4hrs40km = (float) $_POST['price4hrs40km'];
            $price8hrs80km = (float) $_POST['price8hrs80km'];
            $price10hrs100km = (float) $_POST['price10hrs100km'];
            $priceExtraKm = isset($_POST['priceExtraKm']) ? (float) $_POST['priceExtraKm'] : 0;
            $priceExtraHour = isset($_POST['priceExtraHour']) ? (float) $_POST['priceExtraHour'] : 0;
            
            // Log the update attempt
            error_log("Attempting to update fares for $vehicleId: 4hrs=$price4hrs40km, 8hrs=$price8hrs80km, 10hrs=$price10hrs100km");
            
            // Check if the vehicle already exists
            $checkQuery = "SELECT * FROM local_package_fares WHERE vehicle_id = ?";
            $checkStmt = $conn->prepare($checkQuery);
            $checkStmt->bind_param("s", $vehicleId);
            $checkStmt->execute();
            $result = $checkStmt->get_result();
            
            if ($result->num_rows > 0) {
                // Update existing record
                $updateQuery = "UPDATE local_package_fares SET 
                    price_4hrs_40km = ?, 
                    price_8hrs_80km = ?, 
                    price_10hrs_100km = ?, 
                    price_extra_km = ?, 
                    price_extra_hour = ?,
                    updated_at = NOW()
                    WHERE vehicle_id = ?";
                $updateStmt = $conn->prepare($updateQuery);
                $updateStmt->bind_param("ddddds", $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour, $vehicleId);
                $success = $updateStmt->execute();
                
                if ($success) {
                    error_log("Successfully updated fares for $vehicleId");
                } else {
                    error_log("Failed to update fares for $vehicleId: " . $conn->error);
                    throw new Exception("Failed to update fares: " . $conn->error);
                }
            } else {
                // Insert new record
                $insertQuery = "INSERT INTO local_package_fares (
                    vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, 
                    price_extra_km, price_extra_hour, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())";
                $insertStmt = $conn->prepare($insertQuery);
                $insertStmt->bind_param("sddddd", $vehicleId, $price4hrs40km, $price8hrs80km, $price10hrs100km, $priceExtraKm, $priceExtraHour);
                $success = $insertStmt->execute();
                
                if ($success) {
                    error_log("Successfully inserted new fares for $vehicleId");
                } else {
                    error_log("Failed to insert fares for $vehicleId: " . $conn->error);
                    throw new Exception("Failed to insert fares: " . $conn->error);
                }
            }
            
            // Return success response
            echo json_encode([
                'status' => 'success',
                'message' => 'Local fares updated successfully',
                'vehicleId' => $vehicleId,
                'timestamp' => time()
            ]);
            
        } catch (Exception $e) {
            error_log("Error updating local fares: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'status' => 'error',
                'message' => 'Error updating local fares: ' . $e->getMessage(),
                'timestamp' => time()
            ]);
        }
        exit;
    }
}

// Handle GET request for fare retrieval
// Get vehicle ID from query string
$vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null;

// If vehicle ID is not in query string, check for it in JSON body for POST requests
if (!$vehicleId && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $vehicleId = isset($data['vehicleId']) ? $data['vehicleId'] : (isset($data['vehicle_id']) ? $data['vehicle_id'] : null);
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

// Log request
error_log("Admin local fare request for vehicle: $vehicleId");

try {
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

    // Get database connection
    $conn = getDatabaseConnection();
    $usingDatabase = false;
    $usingMockData = true;
    
    // Initialize fares array
    $localFares = [];
    
    // If database connection successful, try to get fares from database
    if ($conn) {
        $normalizedVehicleId = strtolower(str_replace(' ', '_', $vehicleId));
        
        // Try exact match
        $query = "SELECT * FROM local_package_fares WHERE vehicle_id = ?";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if (!$result || $result->num_rows === 0) {
            // Try with normalized ID
            $stmt = $conn->prepare($query);
            $stmt->bind_param("s", $normalizedVehicleId);
            $stmt->execute();
            $result = $stmt->get_result();
        }
        
        if ($result && $result->num_rows > 0) {
            $row = $result->fetch_assoc();
            
            $localFares[] = [
                'vehicleId' => $vehicleId,
                'price4hrs40km' => (float)$row['price_4hrs_40km'],
                'price8hrs80km' => (float)$row['price_8hrs_80km'],
                'price10hrs100km' => (float)$row['price_10hrs_100km'],
                'priceExtraKm' => (float)$row['price_extra_km'],
                'priceExtraHour' => (float)$row['price_extra_hour']
            ];
            
            $usingDatabase = true;
            $usingMockData = false;
            error_log("Admin panel: Found fare data in database for $vehicleId");
        }
    }
    
    // If no database data, use mock data
    if (empty($localFares)) {
        error_log("Admin panel: No database data found, using mock data for $vehicleId");
        
        // Same mock data as in the main API to ensure consistency
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
            ]
        ];
        
        $normalizedId = strtolower(str_replace(' ', '_', $vehicleId));
        
        // Check for direct match
        if (isset($mockFares[$normalizedId])) {
            $localFares[] = array_merge(['vehicleId' => $vehicleId], $mockFares[$normalizedId]);
        } 
        // Check for partial matches
        else {
            $matched = false;
            foreach ($mockFares as $key => $fare) {
                if (strpos($normalizedId, $key) !== false || strpos($key, $normalizedId) !== false) {
                    $localFares[] = array_merge(['vehicleId' => $vehicleId], $fare);
                    $matched = true;
                    break;
                }
            }
            
            // If no match found, use sedan as default
            if (!$matched) {
                $localFares[] = array_merge(['vehicleId' => $vehicleId], $mockFares['sedan']);
            }
        }
    }
    
    // Return JSON response
    echo json_encode([
        'status' => 'success',
        'message' => 'Local fares retrieved successfully',
        'fares' => $localFares,
        'source' => $usingMockData ? 'mock' : 'database',
        'timestamp' => time()
    ]);
    
} catch (Exception $e) {
    error_log("Error in admin direct-local-fares.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Server error: ' . $e->getMessage(),
        'timestamp' => time()
    ]);
}
