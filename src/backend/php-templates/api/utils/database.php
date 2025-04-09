
<?php
/**
 * Database utility functions for establishing connections
 */

// Get database connection with improved error handling
function getDbConnection() {
    // Database credentials
    $dbHost = 'localhost';
    $dbName = 'u644605165_db_be';
    $dbUser = 'u644605165_usr_be';
    $dbPass = 'Vizag@1213';
    
    try {
        // Create connection with error reporting and set persistent connection
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        
        // Check connection
        if ($conn->connect_error) {
            error_log("Database connection failed: " . $conn->connect_error);
            throw new Exception("Connection failed: " . $conn->connect_error);
        }
        
        // Set charset
        $conn->set_charset("utf8mb4");
        
        // Set mode for stricter SQL handling
        $conn->query("SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'");
        
        // Increase timeout for long-running operations
        $conn->query("SET SESSION wait_timeout=300");
        $conn->query("SET SESSION interactive_timeout=300");
        
        return $conn;
    } catch (Exception $e) {
        // Log error to both custom log and PHP error log
        error_log("Database connection error: " . $e->getMessage());
        
        $logDir = __DIR__ . '/../../logs';
        if (!file_exists($logDir)) {
            mkdir($logDir, 0777, true);
        }
        
        $logFile = $logDir . '/database_error_' . date('Y-m-d') . '.log';
        $timestamp = date('Y-m-d H:i:s');
        file_put_contents($logFile, "[$timestamp] Database connection error: " . $e->getMessage() . "\n", FILE_APPEND);
        
        return null;
    }
}

// Get database connection with retry logic for unstable connections
function getDbConnectionWithRetry($maxRetries = 3) {
    $attempts = 0;
    $lastError = null;
    
    while ($attempts < $maxRetries) {
        try {
            $conn = getDbConnection();
            if ($conn) {
                // Test the connection with a simple query
                if ($conn->query("SELECT 1")) {
                    return $conn; // Connection is working
                }
            }
        } catch (Exception $e) {
            $lastError = $e;
            error_log("Connection attempt " . ($attempts + 1) . " failed: " . $e->getMessage());
        }
        
        $attempts++;
        if ($attempts < $maxRetries) {
            // Wait a bit before trying again (exponential backoff)
            usleep(100000 * $attempts); // 100ms, 200ms, 300ms, etc.
        }
    }
    
    // All attempts failed
    error_log("All database connection attempts failed after $maxRetries retries. Last error: " . 
        ($lastError ? $lastError->getMessage() : "Unknown error"));
    
    return null;
}

// Function to safely escape a value for database queries
function dbEscape($conn, $value) {
    if ($conn) {
        return $conn->real_escape_string($value);
    }
    
    // Fallback if no connection
    return str_replace(["'", "\""], ["\'", "\\\""], $value);
}

// Function to check if a table exists
function tableExists($conn, $tableName) {
    if (!$conn) {
        return false;
    }
    
    $result = $conn->query("SHOW TABLES LIKE '" . $conn->real_escape_string($tableName) . "'");
    return $result && $result->num_rows > 0;
}

// Function to create the bookings table if it doesn't exist
function ensureBookingsTableExists($conn) {
    if (!$conn) {
        return false;
    }
    
    if (!tableExists($conn, 'bookings')) {
        $createTableSql = "
        CREATE TABLE bookings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            booking_number VARCHAR(50) NOT NULL UNIQUE,
            pickup_location TEXT NOT NULL,
            drop_location TEXT,
            pickup_date DATETIME NOT NULL,
            return_date DATETIME,
            cab_type VARCHAR(50) NOT NULL,
            distance DECIMAL(10,2),
            trip_type VARCHAR(20) NOT NULL,
            trip_mode VARCHAR(20) NOT NULL,
            total_amount DECIMAL(10,2) NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            passenger_name VARCHAR(100) NOT NULL,
            passenger_phone VARCHAR(20) NOT NULL,
            passenger_email VARCHAR(100) NOT NULL,
            driver_name VARCHAR(100),
            driver_phone VARCHAR(20),
            hourly_package VARCHAR(50),
            tour_id VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        
        $result = $conn->query($createTableSql);
        if (!$result) {
            error_log("Failed to create bookings table: " . $conn->error);
            return false;
        }
        
        error_log("Bookings table created successfully");
        return true;
    }
    
    return true; // Table already exists
}

// Function to verify database integrity
function verifyDatabaseIntegrity($conn) {
    if (!$conn) {
        return ['status' => 'error', 'message' => 'No database connection'];
    }
    
    $requiredTables = ['users', 'bookings', 'vehicles', 'local_fares', 'outstation_fares', 'airport_fares'];
    $missingTables = [];
    
    foreach ($requiredTables as $table) {
        if (!tableExists($conn, $table)) {
            $missingTables[] = $table;
        }
    }
    
    if (count($missingTables) > 0) {
        return [
            'status' => 'warning', 
            'message' => 'Missing required tables', 
            'missing_tables' => $missingTables
        ];
    }
    
    return ['status' => 'success', 'message' => 'Database integrity verified'];
}

// Function to run a diagnostic query on the database
function runDatabaseDiagnostic($conn) {
    if (!$conn) {
        return ['status' => 'error', 'message' => 'No database connection'];
    }
    
    try {
        // Test simple queries
        $tests = [
            'simple_select' => $conn->query("SELECT 1 as test"),
            'show_tables' => $conn->query("SHOW TABLES"),
            'variables' => $conn->query("SHOW VARIABLES LIKE 'version%'")
        ];
        
        $results = [];
        foreach ($tests as $key => $result) {
            $results[$key] = [
                'success' => $result !== false,
                'error' => $result === false ? $conn->error : null
            ];
        }
        
        // Check bookings table structure if it exists
        if (tableExists($conn, 'bookings')) {
            $tableInfoResult = $conn->query("DESCRIBE bookings");
            $tableInfo = [];
            
            if ($tableInfoResult) {
                while ($row = $tableInfoResult->fetch_assoc()) {
                    $tableInfo[] = $row;
                }
                
                $results['bookings_structure'] = [
                    'success' => true,
                    'columns' => $tableInfo
                ];
            } else {
                $results['bookings_structure'] = [
                    'success' => false,
                    'error' => $conn->error
                ];
            }
            
            // Count bookings
            $countResult = $conn->query("SELECT COUNT(*) as total FROM bookings");
            if ($countResult) {
                $row = $countResult->fetch_assoc();
                $results['bookings_count'] = [
                    'success' => true,
                    'count' => (int)$row['total']
                ];
            } else {
                $results['bookings_count'] = [
                    'success' => false,
                    'error' => $conn->error
                ];
            }
        }
        
        return [
            'status' => 'success',
            'message' => 'Database diagnostic completed',
            'results' => $results
        ];
    } catch (Exception $e) {
        return [
            'status' => 'error',
            'message' => 'Error running database diagnostic: ' . $e->getMessage()
        ];
    }
}
