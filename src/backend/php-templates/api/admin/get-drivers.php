<?php
// Suppress warnings and errors in output
error_reporting(E_ERROR | E_PARSE);
ini_set('display_errors', 0);

// Include configuration file
require_once __DIR__ . '/../../config.php';

// CRITICAL: Set all response headers first before any output
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Clear any potential output buffer to avoid content contamination
while (ob_get_level()) ob_end_clean();

// Debug mode
$debugMode = isset($_GET['debug']) || isset($_SERVER['HTTP_X_DEBUG']);

// Log request
error_log("Admin get-drivers endpoint called: " . $_SERVER['REQUEST_METHOD']);

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Function to send JSON response
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    if (ob_get_level()) ob_end_clean();
    echo json_encode($data);
    exit;
}

function driverPhoneKey($phone) {
    $digits = preg_replace('/\D/', '', (string)$phone);
    if (strlen($digits) >= 10) {
        return substr($digits, -10);
    }
    return $digits;
}

function driverLicenseIsPending(array $row) {
    $license = strtoupper(trim((string)($row['license_no'] ?? $row['license_number'] ?? '')));
    return $license === 'PENDING';
}

function driverIsAssignable(array $row, array $inactiveUserIds, array $inactivePhones) {
    $status = strtolower(trim((string)($row['status'] ?? '')));
    if (in_array($status, ['inactive', 'blocked'], true)) {
        return false;
    }
    $userId = isset($row['user_id']) ? (int)$row['user_id'] : 0;
    if ($userId > 0 && isset($inactiveUserIds[$userId])) {
        return false;
    }
    $phoneKey = driverPhoneKey($row['phone'] ?? '');
    if ($phoneKey !== '' && isset($inactivePhones[$phoneKey])) {
        return false;
    }
    // Offline fleet rows stay hidden unless linked to an Active User Management account.
    // PENDING-license rows (auto-provisioned from User Management) are assignable.
    if ($status === 'offline' && ($userId <= 0 || isset($inactiveUserIds[$userId]))) {
        return false;
    }
    return true;
}

function driverDedupeKey(array $row) {
    $phoneKey = driverPhoneKey($row['phone'] ?? '');
    if (strlen($phoneKey) >= 10) {
        return 'p:' . $phoneKey;
    }
    $emailKey = strtolower(trim((string)($row['email'] ?? '')));
    if ($emailKey !== '') {
        return 'e:' . $emailKey;
    }
    return 'id:' . (int)($row['id'] ?? 0);
}

/**
 * Prefer a real license over an auto-created PENDING shadow for the same phone/email.
 */
function driverPreferForDedupe(array $prev, array $row) {
    $prevPending = driverLicenseIsPending($prev);
    $rowPending = driverLicenseIsPending($row);
    if ($prevPending && !$rowPending) {
        return $row;
    }
    if (!$prevPending && $rowPending) {
        return $prev;
    }
    return ((int)($row['id'] ?? 0) < (int)($prev['id'] ?? PHP_INT_MAX)) ? $row : $prev;
}

function loadInactiveDriverUsers($conn) {
    $inactiveUserIds = [];
    $inactivePhones = [];
    $usersTable = $conn->query("SHOW TABLES LIKE 'users'");
    if (!$usersTable || $usersTable->num_rows === 0) {
        return [$inactiveUserIds, $inactivePhones];
    }
    $activeColumn = $conn->query("SHOW COLUMNS FROM users LIKE 'is_active'");
    if (!$activeColumn || $activeColumn->num_rows === 0) {
        return [$inactiveUserIds, $inactivePhones];
    }
    $result = $conn->query("SELECT id, phone FROM users WHERE is_active = 0");
    if (!$result) {
        return [$inactiveUserIds, $inactivePhones];
    }
    while ($user = $result->fetch_assoc()) {
        $inactiveUserIds[(int)$user['id']] = true;
        $phoneKey = driverPhoneKey($user['phone'] ?? '');
        if ($phoneKey !== '') {
            $inactivePhones[$phoneKey] = true;
        }
    }
    return [$inactiveUserIds, $inactivePhones];
}

/**
 * Ensure every Active User Management driver has a fleet row so Assign Driver can list them.
 */
function ensureActiveDriverUsersInFleet($conn) {
    $usersTable = $conn->query("SHOW TABLES LIKE 'users'");
    if (!$usersTable || $usersTable->num_rows === 0) {
        return;
    }
    $linkPath = __DIR__ . '/../utils/driver_user_link.php';
    if (!is_readable($linkPath)) {
        return;
    }
    require_once $linkPath;
    if (!function_exists('syncDriverFleetLinkForUserRole')) {
        return;
    }

    $hasActive = false;
    $activeColumn = $conn->query("SHOW COLUMNS FROM users LIKE 'is_active'");
    if ($activeColumn && $activeColumn->num_rows > 0) {
        $hasActive = true;
    }

    $sql = $hasActive
        ? "SELECT id FROM users WHERE LOWER(TRIM(COALESCE(role,''))) = 'driver' AND is_active = 1"
        : "SELECT id FROM users WHERE LOWER(TRIM(COALESCE(role,''))) = 'driver'";
    $result = $conn->query($sql);
    if (!$result) {
        return;
    }
    while ($user = $result->fetch_assoc()) {
        $userId = (int)($user['id'] ?? 0);
        if ($userId <= 0) {
            continue;
        }
        try {
            syncDriverFleetLinkForUserRole($conn, $userId, 'driver');
        } catch (Throwable $e) {
            logDriversError('Failed syncing active driver user into fleet', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);
        }
    }
}

// Function to log errors with details
function logDriversError($message, $data = []) {
    error_log("DRIVERS ERROR: $message " . json_encode($data));
    $logFile = __DIR__ . '/../../logs/drivers_errors.log';
    $dir = dirname($logFile);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    file_put_contents(
        $logFile,
        date('Y-m-d H:i:s') . " - $message - " . json_encode($data) . "\n",
        FILE_APPEND
    );
}

try {
    // Only allow GET requests
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }

    // Connect to the database using the common function
    try {
        $conn = getDbConnection();
        logDriversError("Database connection established successfully");
    } catch (Exception $e) {
        logDriversError("Database connection error", ['error' => $e->getMessage()]);
        throw new Exception("Database connection failed: " . $e->getMessage());
    }
    
    // Check if drivers table exists
    $tableExists = false;
    $checkTableResult = $conn->query("SHOW TABLES LIKE 'drivers'");
    
    if ($checkTableResult) {
        $tableExists = $checkTableResult->num_rows > 0;
    }
    
    // Create drivers table if it doesn't exist
    if (!$tableExists) {
        logDriversError("Creating drivers table as it doesn't exist");
        
        $createTableQuery = "
            CREATE TABLE IF NOT EXISTS drivers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                email VARCHAR(100),
                license_no VARCHAR(50),
                status ENUM('available', 'busy', 'offline') DEFAULT 'available',
                total_rides INT DEFAULT 0,
                earnings DECIMAL(10,2) DEFAULT 0,
                rating DECIMAL(3,2) DEFAULT 5.0,
                location VARCHAR(255) DEFAULT 'Visakhapatnam',
                vehicle VARCHAR(100),
                vehicle_id VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY (phone)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
        
        $createResult = $conn->query($createTableQuery);
        
        if ($conn->error) {
            logDriversError("Error creating drivers table", ['error' => $conn->error]);
            throw new Exception("Failed to create drivers table: " . $conn->error);
        }
        
        // Insert some sample data if we just created the table
        $sampleDataExists = $conn->query("SELECT COUNT(*) as count FROM drivers")->fetch_assoc()['count'] > 0;
        
        if (!$sampleDataExists) {
            logDriversError("Adding sample data to drivers table");
            
            $insertSampleData = "
                INSERT INTO drivers (name, phone, email, license_no, status, location, vehicle) 
                VALUES 
                ('Rajesh Kumar', '9876543210', 'rajesh@example.com', 'AP12345678901234', 'available', 'Visakhapatnam', 'Sedan'),
                ('Suresh Reddy', '8765432109', 'suresh@example.com', 'AP98765432109876', 'busy', 'Visakhapatnam', 'SUV'),
                ('Mahesh Babu', '7654321098', 'mahesh@example.com', 'AP45678901234567', 'available', 'Visakhapatnam', 'Hatchback')
            ";
            
            $insertResult = $conn->query($insertSampleData);
            
            if ($conn->error) {
                logDriversError("Error inserting sample data", ['error' => $conn->error]);
                // Non-fatal error, continue execution
            } else {
                logDriversError("Sample data inserted successfully");
            }
        }
        
        $tableExists = true; // Table should now exist
    }
    
    // Get all drivers
    if ($tableExists) {
        try {
            // Pull Active Driver logins into the fleet table before building the assign list.
            ensureActiveDriverUsersInFleet($conn);

            $result = $conn->query("SELECT * FROM drivers ORDER BY name ASC");
            
            if (!$result) {
                throw new Exception("Query failed: " . $conn->error);
            }
            
            list($inactiveUserIds, $inactivePhones) = loadInactiveDriverUsers($conn);
            $chosen = [];
            while ($row = $result->fetch_assoc()) {
                if (!driverIsAssignable($row, $inactiveUserIds, $inactivePhones)) {
                    continue;
                }
                $key = driverDedupeKey($row);
                if (!isset($chosen[$key])) {
                    $chosen[$key] = $row;
                } else {
                    $chosen[$key] = driverPreferForDedupe($chosen[$key], $row);
                }
            }
            $rows = array_values($chosen);
            usort($rows, function ($a, $b) {
                return strcasecmp((string)($a['name'] ?? ''), (string)($b['name'] ?? ''));
            });
            $drivers = [];
            foreach ($rows as $row) {
                $drivers[] = [
                    'id' => (int)$row['id'],
                    'name' => $row['name'],
                    'phone' => $row['phone'],
                    'licenseNumber' => isset($row['license_no']) ? $row['license_no'] : (isset($row['license_number']) ? $row['license_number'] : null),
                    'vehicleType' => isset($row['vehicle_type']) ? $row['vehicle_type'] : null,
                    'vehicleNumber' => isset($row['vehicle_number']) ? $row['vehicle_number'] : null,
                    'status' => $row['status'],
                    'address' => isset($row['address']) ? $row['address'] : '',
                    'dateJoined' => isset($row['date_joined']) ? $row['date_joined'] : ''
                ];
            }
            
            // If no drivers found, log but return empty array, not sample data
            if (empty($drivers)) {
                logDriversError("No drivers found in the database");
                
                // Return a success message but with an empty array
                sendJsonResponse([
                    'status' => 'success',
                    'message' => 'No drivers found',
                    'data' => []
                ]);
            } else {
                // Return all drivers
                sendJsonResponse([
                    'status' => 'success',
                    'message' => 'Drivers retrieved successfully',
                    'data' => $drivers
                ]);
            }
            
        } catch (Exception $e) {
            logDriversError("Error fetching drivers", ['error' => $e->getMessage()]);
            throw $e;
        }
    } else {
        // Should never reach here as we create the table above
        logDriversError("Drivers table does not exist after creation attempt");
        throw new Exception("Failed to verify drivers table existence");
    }

} catch (Exception $e) {
    logDriversError("Critical error in get-drivers.php", ['error' => $e->getMessage()]);
    
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Failed to retrieve drivers from database: ' . $e->getMessage(),
        'error_details' => $debugMode ? $e->getTraceAsString() : null
    ], 500);
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
