<?php
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';

// Set headers
header('Content-Type: application/json');

function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

try {
    $conn = getDbConnectionWithRetry();

    // Start transaction
    $conn->begin_transaction();

    // Check if drivers table exists
    $tableExists = $conn->query("SHOW TABLES LIKE 'drivers'");
    
    if ($tableExists->num_rows > 0) {
        // Backup existing data
        $conn->query("CREATE TABLE IF NOT EXISTS drivers_backup LIKE drivers");
        $conn->query("INSERT INTO drivers_backup SELECT * FROM drivers");
        
        // Add new columns if they don't exist
        $alterTableQueries = [
            "ALTER TABLE drivers MODIFY COLUMN id INT AUTO_INCREMENT",
            "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS email VARCHAR(100) NOT NULL DEFAULT ''",
            "ALTER TABLE drivers CHANGE COLUMN license_number license_no VARCHAR(50)",
            "ALTER TABLE drivers MODIFY COLUMN status ENUM('available', 'busy', 'offline') DEFAULT 'available'",
            "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS total_rides INT DEFAULT 0",
            "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS earnings DECIMAL(10,2) DEFAULT 0",
            "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 5.0",
            "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT 'Visakhapatnam'",
            "ALTER TABLE drivers CHANGE COLUMN vehicle_id vehicle VARCHAR(100)",
            "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
            "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ];

        foreach ($alterTableQueries as $query) {
            try {
                $conn->query($query);
            } catch (Exception $e) {
                error_log("Migration query failed: " . $query . " Error: " . $e->getMessage());
                // Continue with other queries even if one fails
            }
        }

        // Update status values from old to new enum
        $conn->query("UPDATE drivers SET status = 'available' WHERE status = 'active'");
        $conn->query("UPDATE drivers SET status = 'busy' WHERE status = 'on_trip'");
        $conn->query("UPDATE drivers SET status = 'offline' WHERE status = 'inactive'");
    } else {
        // Create new drivers table with correct schema
        $createTableSql = "CREATE TABLE drivers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            phone VARCHAR(20) NOT NULL,
            email VARCHAR(100) NOT NULL,
            license_no VARCHAR(50),
            status ENUM('available', 'busy', 'offline') DEFAULT 'available',
            total_rides INT DEFAULT 0,
            earnings DECIMAL(10,2) DEFAULT 0,
            rating DECIMAL(3,2) DEFAULT 5.0,
            location VARCHAR(255) DEFAULT 'Visakhapatnam',
            vehicle VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
        
        $conn->query($createTableSql);
    }

    // Commit transaction
    $conn->commit();
    
    sendResponse([
        'status' => 'success',
        'message' => 'Drivers table migration completed successfully'
    ]);

} catch (Exception $e) {
    // Rollback transaction on error
    if ($conn) {
        $conn->rollback();
    }
    
    sendResponse([
        'status' => 'error',
        'message' => 'Migration failed: ' . $e->getMessage()
    ], 500);
} 