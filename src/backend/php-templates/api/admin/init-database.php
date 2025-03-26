
<?php
// init-database.php - Initialize all required database tables

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Include the db_setup script
require_once 'db_setup.php';

// Process additional parameters
$force = isset($_GET['force']) && $_GET['force'] === 'true';
$verbose = isset($_GET['verbose']) && $_GET['verbose'] === 'true';

// Check if verification tables exist
$result = null;
$verified = false;
$messages = [];
$tablesCreated = [];
$tablesFailed = [];

try {
    // Connect to database again to verify tables
    require_once '../../config.php';
    $conn = getDbConnection();
    
    // Verify essential tables and create them if missing
    $requiredTables = [
        'local_package_fares' => [
            'vehicle_id' => 'VARCHAR(50) NOT NULL',
            'price_4hrs_40km' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'price_8hrs_80km' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'price_10hrs_100km' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'price_extra_km' => 'DECIMAL(5,2) NOT NULL DEFAULT 0',
            'price_extra_hour' => 'DECIMAL(5,2) NOT NULL DEFAULT 0'
        ],
        'airport_transfer_fares' => [
            'vehicle_id' => 'VARCHAR(50) NOT NULL',
            'base_price' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'price_per_km' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'driver_allowance' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'pickup_price' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'drop_price' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'tier1_price' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'tier2_price' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'tier3_price' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'tier4_price' => 'DECIMAL(10,2) NOT NULL DEFAULT 0'
        ],
        'outstation_fares' => [
            'vehicle_id' => 'VARCHAR(50) NOT NULL',
            'base_price' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'price_per_km' => 'DECIMAL(5,2) NOT NULL DEFAULT 0',
            'driver_allowance' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'night_halt' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'round_trip_base_price' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'round_trip_price_per_km' => 'DECIMAL(5,2) NOT NULL DEFAULT 0'
        ],
        'drivers' => [
            'name' => 'VARCHAR(100) NOT NULL',
            'phone' => 'VARCHAR(20) NOT NULL',
            'license_number' => 'VARCHAR(50)',
            'vehicle_id' => 'VARCHAR(50)',
            'status' => 'ENUM("active", "inactive", "on_trip") DEFAULT "active"'
        ]
    ];
    
    foreach ($requiredTables as $tableName => $columns) {
        // Check if table exists
        $tableResult = $conn->query("SHOW TABLES LIKE '$tableName'");
        $tableExists = $tableResult->num_rows > 0;
        
        $createTable = false;
        
        if ($tableExists) {
            if ($force) {
                // If force flag is set, drop the table to recreate it
                $messages[] = "Force option: Dropping and recreating table $tableName";
                $conn->query("DROP TABLE IF EXISTS $tableName");
                $createTable = true;
            } else {
                // Check if table has all required columns
                $columnResult = $conn->query("SHOW COLUMNS FROM $tableName");
                $existingColumns = [];
                while ($row = $columnResult->fetch_assoc()) {
                    $existingColumns[] = $row['Field'];
                }
                
                $requiredColumnNames = array_keys($columns);
                $missingColumns = array_diff($requiredColumnNames, $existingColumns);
                
                if (!empty($missingColumns)) {
                    $messages[] = "Table $tableName is missing columns: " . implode(', ', $missingColumns);
                    
                    // Add missing columns
                    foreach ($missingColumns as $columnName) {
                        $columnDef = $columns[$columnName];
                        $addColumnSql = "ALTER TABLE $tableName ADD COLUMN $columnName $columnDef";
                        $result = $conn->query($addColumnSql);
                        
                        if ($result) {
                            $messages[] = "Added missing column $columnName to $tableName";
                        } else {
                            $messages[] = "Failed to add column $columnName to $tableName: " . $conn->error;
                            $tablesFailed[] = "$tableName (column add failed)";
                        }
                    }
                    
                    $tablesCreated[] = "$tableName (columns added)";
                } else {
                    $messages[] = "Table $tableName exists with all required columns";
                }
            }
        } else {
            $messages[] = "Table $tableName does not exist";
            $createTable = true;
        }
        
        // Create table if needed
        if ($createTable) {
            try {
                // Prepare SQL for creating table
                $sql = "CREATE TABLE IF NOT EXISTS $tableName (
                    id INT AUTO_INCREMENT PRIMARY KEY,";
                
                // Add columns
                foreach ($columns as $columnName => $definition) {
                    $sql .= "\n    $columnName $definition,";
                }
                
                // Add timestamps
                $sql .= "\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY vehicle_id (vehicle_id)
                ) ENGINE=InnoDB;";
                
                // Execute the query
                $result = $conn->query($sql);
                
                if ($result) {
                    $messages[] = "Successfully created table $tableName";
                    $tablesCreated[] = $tableName;
                } else {
                    $messages[] = "Failed to create table $tableName: " . $conn->error;
                    $tablesFailed[] = $tableName;
                }
            } catch (Exception $e) {
                $messages[] = "Error creating table $tableName: " . $e->getMessage();
                $tablesFailed[] = $tableName;
            }
        }
    }
    
    // Final verification
    $verified = empty($tablesFailed);
    
} catch (Exception $e) {
    $messages[] = "Verification error: " . $e->getMessage();
    $verified = false;
}

// Output response in JSON
echo json_encode([
    'status' => $verified ? 'success' : 'error',
    'message' => $verified ? 'Database initialization completed successfully' : 'Database initialization completed with errors',
    'tables_verified' => $verified,
    'timestamp' => time(),
    'messages' => $messages,
    'tables_created' => $tablesCreated,
    'tables_failed' => $tablesFailed,
    'force_applied' => $force,
    'endpoint' => $_SERVER['REQUEST_URI']
]);

// If this is a browser request, add a redirect button for easy navigation
if (isset($_GET['html']) && $_GET['html'] === 'true') {
    echo '<html><body style="font-family: Arial, sans-serif; padding: 20px;">';
    echo '<h2>Database Initialization</h2>';
    echo '<div style="background-color: ' . ($verified ? '#e6ffe6' : '#ffe6e6') . '; border-radius: 5px; padding: 15px; margin-bottom: 20px;">';
    echo '<strong>Status:</strong> ' . ($verified ? 'Success' : 'Issues detected') . '<br>';
    echo '</div>';
    
    echo '<h3>Verification Results:</h3>';
    echo '<ul>';
    foreach ($messages as $message) {
        echo '<li>' . htmlspecialchars($message) . '</li>';
    }
    echo '</ul>';
    
    echo '<h3>Tables Created:</h3>';
    if (!empty($tablesCreated)) {
        echo '<ul>';
        foreach ($tablesCreated as $table) {
            echo '<li>' . htmlspecialchars($table) . '</li>';
        }
        echo '</ul>';
    } else {
        echo '<p>No tables needed to be created.</p>';
    }
    
    echo '<div style="margin-top: 20px;">';
    if (!$verified) {
        echo '<a href="?force=true&verbose=true&html=true" style="background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; margin-right: 10px;">Force Initialize</a>';
    }
    echo '<a href="../fares/vehicles.php" style="background-color: #28a745; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">View Vehicles</a>';
    echo '</div>';
    
    echo '</body></html>';
}
