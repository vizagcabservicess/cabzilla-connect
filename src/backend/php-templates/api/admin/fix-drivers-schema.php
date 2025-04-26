
<?php
// fix-drivers-schema.php - Script to fix inconsistencies in drivers table
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

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
        $tableExists = $conn->query("SHOW TABLES LIKE 'drivers'");
        
        if ($tableExists->num_rows === 0) {
            // Create drivers table if it doesn't exist
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
        } else {
            // Table exists, check column structure
            $columns = [];
            $columnsResult = $conn->query("SHOW COLUMNS FROM drivers");
            while ($column = $columnsResult->fetch_assoc()) {
                $columns[$column['Field']] = $column;
            }
            
            // Check for license_number vs license_no inconsistency
            if (isset($columns['license_number']) && !isset($columns['license_no'])) {
                try {
                    $conn->query("ALTER TABLE drivers CHANGE COLUMN license_number license_no VARCHAR(50) NOT NULL");
                    $results['operations'][] = "Renamed license_number column to license_no";
                } catch (Exception $e) {
                    $results['errors'][] = "Failed to rename license_number: " . $e->getMessage();
                }
            } elseif (!isset($columns['license_no']) && !isset($columns['license_number'])) {
                try {
                    $conn->query("ALTER TABLE drivers ADD COLUMN license_no VARCHAR(50) NOT NULL DEFAULT ''");
                    $results['operations'][] = "Added missing license_no column";
                } catch (Exception $e) {
                    $results['errors'][] = "Failed to add license_no column: " . $e->getMessage();
                }
            }
            
            // Ensure license_no is NOT NULL
            if (isset($columns['license_no']) && $columns['license_no']['Null'] === 'YES') {
                try {
                    $conn->query("ALTER TABLE drivers MODIFY COLUMN license_no VARCHAR(50) NOT NULL");
                    $results['operations'][] = "Modified license_no to be NOT NULL";
                } catch (Exception $e) {
                    $results['errors'][] = "Failed to modify license_no: " . $e->getMessage();
                }
            }
            
            // Fix status enum values
            try {
                $conn->query("ALTER TABLE drivers MODIFY COLUMN status ENUM('available', 'busy', 'offline') DEFAULT 'available'");
                $results['operations'][] = "Updated status column enum values";
            } catch (Exception $e) {
                $results['errors'][] = "Failed to update status enum: " . $e->getMessage();
            }
            
            // Add email column if missing
            if (!isset($columns['email'])) {
                try {
                    $conn->query("ALTER TABLE drivers ADD COLUMN email VARCHAR(100) NOT NULL DEFAULT ''");
                    $results['operations'][] = "Added missing email column";
                } catch (Exception $e) {
                    $results['errors'][] = "Failed to add email column: " . $e->getMessage();
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
                    $result = $conn->query($query);
                    if ($conn->affected_rows > 0) {
                        $results['operations'][] = "Updated " . $conn->affected_rows . " rows with " . $query;
                    }
                } catch (Exception $e) {
                    $results['errors'][] = "Failed status mapping: " . $e->getMessage();
                }
            }
            
            // Check for vehicle vs vehicle_id inconsistency
            if (isset($columns['vehicle_id']) && !isset($columns['vehicle'])) {
                try {
                    $conn->query("ALTER TABLE drivers ADD COLUMN vehicle VARCHAR(100)");
                    $results['operations'][] = "Added vehicle column";
                } catch (Exception $e) {
                    $results['errors'][] = "Failed to add vehicle column: " . $e->getMessage();
                }
            }
            
            // Ensure any NULL values in license_no are filled with empty string
            try {
                $conn->query("UPDATE drivers SET license_no = '' WHERE license_no IS NULL");
                if ($conn->affected_rows > 0) {
                    $results['operations'][] = "Fixed NULL license_no values: " . $conn->affected_rows . " rows";
                }
            } catch (Exception $e) {
                $results['errors'][] = "Failed to fix NULL license_no values: " . $e->getMessage();
            }
            
            // Fix inconsistencies in status values
            try {
                $conn->query("UPDATE drivers SET status = 'available' WHERE status NOT IN ('available', 'busy', 'offline')");
                if ($conn->affected_rows > 0) {
                    $results['operations'][] = "Fixed invalid status values: " . $conn->affected_rows . " rows";
                }
            } catch (Exception $e) {
                $results['errors'][] = "Failed to fix invalid status values: " . $e->getMessage();
            }
        }
        
        if (!empty($results['errors'])) {
            $results['status'] = 'partial';
        }
        
        return $results;
    } catch (Exception $e) {
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
            'errors' => $result['errors']
        ]);
    } catch (Exception $e) {
        // Rollback on error
        if (isset($conn)) {
            $conn->rollback();
        }
        
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to fix drivers schema: ' . $e->getMessage()
        ]);
    }
}
