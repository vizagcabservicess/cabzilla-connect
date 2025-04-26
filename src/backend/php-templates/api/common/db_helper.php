
<?php
/**
 * Database helper functions for establishing connections with retry logic
 */

/**
 * Get database connection with retry logic
 * @param int $maxRetries Number of connection retry attempts
 * @param int $retryDelay Delay between retries in milliseconds
 * @return mysqli Database connection
 * @throws Exception If connection fails after all retries
 */
function getDbConnectionWithRetry($maxRetries = 3, $retryDelay = 500) {
    $attempts = 0;
    $lastError = null;
    
    while ($attempts < $maxRetries) {
        try {
            if (function_exists('getDbConnection')) {
                $conn = getDbConnection();
                return $conn;
            }
            
            $dbHost = getenv('DB_HOST') ?: 'localhost';
            $dbName = getenv('DB_NAME') ?: 'cab_bookings';
            $dbUser = getenv('DB_USER') ?: 'root';
            $dbPass = getenv('DB_PASS') ?: '';
            
            $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
            
            if ($conn->connect_error) {
                throw new Exception("Database connection failed: " . $conn->connect_error);
            }
            
            // Set character set
            $conn->set_charset("utf8mb4");
            
            return $conn;
        } catch (Exception $e) {
            $lastError = $e;
            $attempts++;
            
            if ($attempts < $maxRetries) {
                // Wait before retrying
                usleep($retryDelay * 1000);
            }
        }
    }
    
    // All retries failed
    throw new Exception("Database connection failed after $maxRetries attempts: " . $lastError->getMessage());
}

/**
 * Create mock database response for testing when real DB is unavailable
 * @param string $entityType Type of entity to mock (booking, driver, etc.)
 * @param int $id ID of the entity
 * @return array Mock data
 */
function createMockData($entityType, $id = null) {
    switch ($entityType) {
        case 'booking':
            return [
                'id' => $id ?? rand(1000, 9999),
                'booking_number' => 'CB' . rand(1000000000, 9999999999),
                'passenger_name' => 'Test User',
                'passenger_email' => 'test@example.com',
                'passenger_phone' => '9876543210',
                'pickup_location' => 'Test Pickup',
                'drop_location' => 'Test Destination',
                'pickup_date' => date('Y-m-d H:i:s'),
                'cab_type' => 'Sedan',
                'trip_type' => 'local',
                'trip_mode' => 'outstation',
                'total_amount' => 3500,
                'status' => 'confirmed',
                'driver_name' => 'Test Driver',
                'driver_phone' => '9876543210',
                'vehicle_number' => 'AP 31 AB 1234',
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ];
            
        case 'driver':
            return [
                'id' => $id ?? rand(1000, 9999),
                'name' => 'Test Driver',
                'phone' => '9876543210',
                'email' => 'driver@example.com',
                'license_no' => 'DL' . rand(1000000, 9999999),
                'status' => 'available',
                'vehicle' => 'AP 31 AB 1234',
                'location' => 'Visakhapatnam',
                'total_rides' => rand(100, 500),
                'rating' => 4.5
            ];
            
        default:
            return [
                'id' => $id ?? rand(1000, 9999),
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ];
    }
}

/**
 * Log error to file and PHP error log
 * @param string $message Error message
 * @param array $data Additional data to log
 */
function logError($message, $data = []) {
    $logMessage = date('Y-m-d H:i:s') . " - $message - " . json_encode($data);
    error_log($logMessage);
    
    $logDir = __DIR__ . '/../../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    $logFile = $logDir . '/api_errors.log';
    file_put_contents($logFile, $logMessage . "\n", FILE_APPEND);
}

/**
 * Get parameter type for mysqli bind_param
 * @param mixed $value Value to check
 * @return string Parameter type (i, d, s, b)
 */
function getParameterType($value) {
    if (is_int($value)) {
        return 'i'; // integer
    } elseif (is_double($value) || is_float($value)) {
        return 'd'; // double/float
    } elseif (is_string($value)) {
        return 's'; // string
    } else {
        return 's'; // default to string
    }
}
