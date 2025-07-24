
<?php
// fix-drivers-schema.php - Script to fix inconsistencies in drivers table
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Debug logging function
function schemaDebugLog($message, $data = null) {
    $logMessage = date('[Y-m-d H:i:s] ') . $message;
    if ($data !== null) {
        $logMessage .= ": " . (is_array($data) || is_object($data) ? json_encode($data) : $data);
    }
    error_log($logMessage);
}

/**
 * Function to fix drivers schema inconsistencies
 * 
 * @param mysqli $conn Database connection
 * @return array Result of fix operations
 */
function fixDriversSchema($conn) {
    $results = [
        'status' => 'success',
        'operations' => [],
        'errors' => []
    ];
    
    try {
        // Check if drivers table exists
        schemaDebugLog("Checking if drivers table exists");
        $tableExists = $conn->query("SHOW TABLES LIKE 'drivers'");
        
        if ($tableExists->num_rows === 0) {
            // Create drivers table if it doesn't exist
            schemaDebugLog("Creating drivers table");
            $createTableSql = "CREATE TABLE drivers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                email VARCHAR(100) NOT NULL,
                license_no VARCHAR(50) NOT NULL,
                status ENUM('available', 'busy', 'offline') DEFAULT 'available',
                total_rides INT DEFAULT 0,
                earnings DECIMAL(10,2) DEFAULT 0,
                rating DECIMAL(3,2) DEFAULT 5.0,
                location VARCHAR(255) DEFAULT 'Visakhapatnam',
                vehicle VARCHAR(100),
                vehicle_id VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
            
            $conn->query($createTableSql);
            $results['operations'][] = "Created drivers table";
            
            // Add sample drivers
            $sampleDrivers = [
                [
                    'name' => 'Vijay Kumar',
                    'phone' => '9966363662',
                    'email' => 'vijay@example.com',
                    'license_no' => 'DL98765432',
                    'status' => 'available',
                    'location' => 'Visakhapatnam',
                    'vehicle' => 'Sedan'
                ],
                [
                    'name' => 'Ravi Patel',
                    'phone' => '8765432109',
                    'email' => 'ravi@example.com',
                    'license_no' => 'DL87654321',
                    'status' => 'busy',
                    'location' => 'Visakhapatnam',
                    'vehicle' => 'SUV'
                ]
            ];
            
            foreach ($sampleDrivers as $driver) {
                $stmt = $conn->prepare("INSERT INTO drivers (name, phone, email, license_no, status, location, vehicle) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->bind_param("sssssss", 
                    $driver['name'],
                    $driver['phone'],
                    $driver['email'],
                    $driver['license_no'],
                    $driver['status'],
                    $driver['location'],
                    $driver['vehicle']
                );
                $stmt->execute();
            }
            $results['operations'][] = "Added sample drivers";
        } else {
            // Table exists, check column structure
            schemaDebugLog("Drivers table exists, checking columns");
            $columns = [];
            $columnsResult = $conn->query("SHOW COLUMNS FROM drivers");
            while ($column = $columnsResult->fetch_assoc()) {
                $columns[$column['Field']] = $column;
            }
            
            schemaDebugLog("Current columns", $columns);
            
            // Create backup table
            $backupTableName = 'drivers_backup_' . date('Ymd_His');
            schemaDebugLog("Creating backup table: $backupTableName");
            $conn->query("CREATE TABLE IF NOT EXISTS $backupTableName LIKE drivers");
            $conn->query("INSERT INTO $backupTableName SELECT * FROM drivers");
            $results['operations'][] = "Created backup table: $backupTableName";
            
            // Check for license_number vs license_no inconsistency
            if (isset($columns['license_number']) && !isset($columns['license_no'])) {
                schemaDebugLog("Renaming license_number column to license_no");
                try {
                    $conn->query("ALTER TABLE drivers CHANGE COLUMN license_number license_no VARCHAR(50) NOT NULL");
                    $results['operations'][] = "Renamed license_number column to license_no";
                } catch (Exception $e) {
                    $results['errors'][] = "Failed to rename license_number: " . $e->getMessage();
                    schemaDebugLog("Error renaming license_number: " . $e->getMessage());
                }
            } elseif (!isset($columns['license_no']) && !isset($columns['license_number'])) {
                schemaDebugLog("Adding missing license_no column");
                try {
                    $conn->query("ALTER TABLE drivers ADD COLUMN license_no VARCHAR(50) NOT NULL DEFAULT ''");
                    $results['operations'][] = "Added missing license_no column";
                } catch (Exception $e) {
                    $results['errors'][] = "Failed to add license_no column: " . $e->getMessage();
                    schemaDebugLog("Error adding license_no column: " . $e->getMessage());
                }
            }
            
            // Ensure license_no is NOT NULL
            if (isset($columns['license_no']) && $columns['license_no']['Null'] === 'YES') {
                schemaDebugLog("Modifying license_no to be NOT NULL");
                try {
                    // First update any NULL values to empty string
                    $conn->query("UPDATE drivers SET license_no = '' WHERE license_no IS NULL");
                    
                    $conn->query("ALTER TABLE drivers MODIFY COLUMN license_no VARCHAR(50) NOT NULL");
                    $results['operations'][] = "Modified license_no to be NOT NULL";
                } catch (Exception $e) {
                    $results['errors'][] = "Failed to modify license_no: " . $e->getMessage();
                    schemaDebugLog("Error modifying license_no: " . $e->getMessage());
                }
            }
            
            // Fix status enum values
            try {
                schemaDebugLog("Updating status column enum values");
                $conn->query("ALTER TABLE drivers MODIFY COLUMN status ENUM('available', 'busy', 'offline') DEFAULT 'available'");
                $results['operations'][] = "Updated status column enum values";
            } catch (Exception $e) {
                $results['errors'][] = "Failed to update status enum: " . $e->getMessage();
                schemaDebugLog("Error updating status enum: " . $e->getMessage());
            }
            
            // Add email column if missing
            if (!isset($columns['email'])) {
                schemaDebugLog("Adding missing email column");
                try {
                    $conn->query("ALTER TABLE drivers ADD COLUMN email VARCHAR(100) NOT NULL DEFAULT ''");
                    $results['operations'][] = "Added missing email column";
                } catch (Exception $e) {
                    $results['errors'][] = "Failed to add email column: " . $e->getMessage();
                    schemaDebugLog("Error adding email column: " . $e->getMessage());
                }
            }
            
            // Map old status values to new ones
            $statusMapQueries = [
                "UPDATE drivers SET status = 'available' WHERE status = 'active'",
                "UPDATE drivers SET status = 'busy' WHERE status = 'on_trip'",
                "UPDATE drivers SET status = 'offline' WHERE status = 'inactive' OR status = 'blocked'"
            ];
            
            foreach ($statusMapQueries as $query) {
                try {
                    schemaDebugLog("Running status mapping query: $query");
                    $result = $conn->query($query);
                    if ($conn->affected_rows > 0) {
                        $results['operations'][] = "Updated " . $conn->affected_rows . " rows with " . $query;
                        schemaDebugLog("Updated " . $conn->affected_rows . " rows");
                    }
                } catch (Exception $e) {
                    $results['errors'][] = "Failed status mapping: " . $e->getMessage();
                    schemaDebugLog("Error in status mapping: " . $e->getMessage());
                }
            }
            
            // Check for vehicle columns
            if (!isset($columns['vehicle'])) {
                schemaDebugLog("Adding vehicle column");
                try {
                    $conn->query("ALTER TABLE drivers ADD COLUMN vehicle VARCHAR(100)");
                    $results['operations'][] = "Added vehicle column";
                } catch (Exception $e) {
                    $results['errors'][] = "Failed to add vehicle column: " . $e->getMessage();
                    schemaDebugLog("Error adding vehicle column: " . $e->getMessage());
                }
            }
            
            if (!isset($columns['vehicle_id'])) {
                schemaDebugLog("Adding vehicle_id column");
                try {
                    $conn->query("ALTER TABLE drivers ADD COLUMN vehicle_id VARCHAR(50)");
                    $results['operations'][] = "Added vehicle_id column";
                } catch (Exception $e) {
                    $results['errors'][] = "Failed to add vehicle_id column: " . $e->getMessage();
                    schemaDebugLog("Error adding vehicle_id column: " . $e->getMessage());
                }
            }
            
            // Ensure any NULL values in license_no are filled with empty string
            try {
                schemaDebugLog("Fixing NULL license_no values");
                $conn->query("UPDATE drivers SET license_no = '' WHERE license_no IS NULL");
                if ($conn->affected_rows > 0) {
                    $results['operations'][] = "Fixed NULL license_no values: " . $conn->affected_rows . " rows";
                    schemaDebugLog("Fixed " . $conn->affected_rows . " NULL license_no values");
                }
            } catch (Exception $e) {
                $results['errors'][] = "Failed to fix NULL license_no values: " . $e->getMessage();
                schemaDebugLog("Error fixing NULL license_no values: " . $e->getMessage());
            }
            
            // Fix inconsistencies in status values
            try {
                schemaDebugLog("Fixing invalid status values");
                $conn->query("UPDATE drivers SET status = 'available' WHERE status NOT IN ('available', 'busy', 'offline')");
                if ($conn->affected_rows > 0) {
                    $results['operations'][] = "Fixed invalid status values: " . $conn->affected_rows . " rows";
                    schemaDebugLog("Fixed " . $conn->affected_rows . " invalid status values");
                }
            } catch (Exception $e) {
                $results['errors'][] = "Failed to fix invalid status values: " . $e->getMessage();
                schemaDebugLog("Error fixing invalid status values: " . $e->getMessage());
            }
        }
        
        if (!empty($results['errors'])) {
            $results['status'] = 'partial';
        }
        
        schemaDebugLog("Schema fix completed with status: " . $results['status']);
        return $results;
    } catch (Exception $e) {
        schemaDebugLog("Fatal error in fixDriversSchema: " . $e->getMessage());
        return [
            'status' => 'error',
            'message' => $e->getMessage(),
            'operations' => $results['operations'],
            'errors' => array_merge($results['errors'], [$e->getMessage()])
        ];
    }
}

// Only execute directly if not being included
if (basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    try {
        // Get database connection
        $conn = getDbConnectionWithRetry();
        
        // Start transaction
        $conn->begin_transaction();
        
        // Fix schema
        $result = fixDriversSchema($conn);
        
        // Commit transaction
        $conn->commit();
        
        echo json_encode([
            'status' => $result['status'],
            'message' => $result['status'] === 'success' ? 'Drivers schema fixed successfully' : 'Partial schema fix with errors',
            'operations' => $result['operations'],
            'errors' => $result['errors'],
            'timestamp' => time()
        ]);
    } catch (Exception $e) {
        // Rollback on error
        if (isset($conn)) {
            $conn->rollback();
        }
        
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to fix drivers schema: ' . $e->getMessage(),
            'timestamp' => time()
        ]);
    }
}
