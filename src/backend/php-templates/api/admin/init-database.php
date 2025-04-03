<?php
// init-database.php - Initialize all required database tables

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Process parameters
$force = isset($_GET['force']) && $_GET['force'] === 'true';
$verbose = isset($_GET['verbose']) && $_GET['verbose'] === 'true';

// Check if verification tables exist
$result = null;
$verified = false;
$messages = [];
$tablesCreated = [];
$tablesFailed = [];

try {
    // Connect to database
    require_once '../../config.php';
    $conn = getDbConnection();
    
    // Verify essential tables and create them if missing
    $requiredTables = [
        'vehicle_types' => [
            'vehicle_id' => 'VARCHAR(50) NOT NULL',
            'name' => 'VARCHAR(100) NOT NULL',
            'capacity' => 'INT NOT NULL DEFAULT 4',
            'luggage_capacity' => 'INT NOT NULL DEFAULT 2',
            'ac' => 'TINYINT(1) NOT NULL DEFAULT 1',
            'image' => 'VARCHAR(255)',
            'amenities' => 'TEXT',
            'description' => 'TEXT',
            'is_active' => 'TINYINT(1) NOT NULL DEFAULT 1'
        ],
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
            'price_per_km' => 'DECIMAL(5,2) NOT NULL DEFAULT 0',
            'pickup_price' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'drop_price' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'tier1_price' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'tier2_price' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'tier3_price' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'tier4_price' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'extra_km_charge' => 'DECIMAL(5,2) NOT NULL DEFAULT 0'
        ],
        'outstation_fares' => [
            'vehicle_id' => 'VARCHAR(50) NOT NULL',
            'base_price' => 'DECIMAL(10,2) NOT NULL DEFAULT 0',
            'price_per_km' => 'DECIMAL(5,2) NOT NULL DEFAULT 0',
            'night_halt_charge' => 'DECIMAL(10,2) NOT NULL DEFAULT 700',
            'driver_allowance' => 'DECIMAL(10,2) NOT NULL DEFAULT 250',
            'roundtrip_base_price' => 'DECIMAL(10,2) DEFAULT 0',
            'roundtrip_price_per_km' => 'DECIMAL(5,2) DEFAULT 0'
        ],
        'drivers' => [
            'name' => 'VARCHAR(100) NOT NULL',
            'phone' => 'VARCHAR(20) NOT NULL',
            'license_number' => 'VARCHAR(50)',
            'vehicle_id' => 'VARCHAR(50)',
            'status' => 'ENUM("active", "inactive", "on_trip") DEFAULT "active"'
        ]
    ];
    
    // Check if we need to fix NULL values in outstation_fares table
    $fixOutstationFaresQuery = false;
    if (!$force) { // Only check if not forcing recreation
        $columnCheck = $conn->query("SHOW COLUMNS FROM outstation_fares LIKE 'night_halt_charge'");
        if ($columnCheck && $columnCheck->num_rows > 0) {
            $column = $columnCheck->fetch_assoc();
            // If the column allows NULL, we need to update it
            if (strpos(strtoupper($column['Null']), 'YES') !== false) {
                $messages[] = "Fixing night_halt_charge column to NOT NULL DEFAULT 700";
                $fixOutstationFaresQuery = true;
                
                // Update any NULL values to the default
                $updateResult = $conn->query("UPDATE outstation_fares SET night_halt_charge = 700 WHERE night_halt_charge IS NULL");
                if ($updateResult) {
                    $messages[] = "Updated NULL night_halt_charge values to 700";
                }
                
                // Update any NULL values for driver_allowance
                $updateResult = $conn->query("UPDATE outstation_fares SET driver_allowance = 250 WHERE driver_allowance IS NULL");
                if ($updateResult) {
                    $messages[] = "Updated NULL driver_allowance values to 250";
                }
                
                // Alter column to NOT NULL with default
                $alterResult = $conn->query("ALTER TABLE outstation_fares 
                    MODIFY night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 700,
                    MODIFY driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 250");
                
                if ($alterResult) {
                    $messages[] = "Altered outstation_fares columns to NOT NULL with defaults";
                    $tablesCreated[] = "outstation_fares (fixed columns)";
                } else {
                    $messages[] = "Failed to alter outstation_fares columns: " . $conn->error;
                    $tablesFailed[] = "outstation_fares (column alter failed)";
                }
            }
        }
    }
    
    foreach ($requiredTables as $tableName => $columns) {
        // Check if table exists
        $tableResult = $conn->query("SHOW TABLES LIKE '$tableName'");
        $tableExists = $tableResult && $tableResult->num_rows > 0;
        
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
                while ($columnResult && $row = $columnResult->fetch_assoc()) {
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
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP";
                
                // Add unique key for vehicle_id if it exists in the columns
                if (array_key_exists('vehicle_id', $columns)) {
                    $sql .= ",\n    UNIQUE KEY vehicle_id (vehicle_id)";
                }
                
                $sql .= "\n) ENGINE=InnoDB;";
                
                // Execute the query
                $result = $conn->query($sql);
                
                if ($result) {
                    $messages[] = "Successfully created table $tableName";
                    $tablesCreated[] = $tableName;
                    
                    // Add sample data for newly created tables
                    if ($tableName == 'outstation_fares') {
                        $defaultData = "INSERT IGNORE INTO outstation_fares (vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance, 
                                    roundtrip_base_price, roundtrip_price_per_km) VALUES
                        ('sedan', 4200, 14, 700, 250, 4000, 12),
                        ('ertiga', 5400, 18, 1000, 250, 5000, 15),
                        ('innova_crysta', 6000, 20, 1000, 250, 5600, 17),
                        ('tempo', 9000, 22, 1500, 300, 8500, 19),
                        ('luxury', 10500, 25, 1500, 300, 10000, 22)";
                        
                        if ($conn->query($defaultData)) {
                            $messages[] = "Added default data to outstation_fares table";
                        } else {
                            $messages[] = "Failed to add default data to outstation_fares table: " . $conn->error;
                        }
                    } else if ($tableName == 'airport_transfer_fares') {
                        $defaultData = "INSERT IGNORE INTO airport_transfer_fares (vehicle_id, base_price, price_per_km, pickup_price, drop_price, 
                                        tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge) VALUES
                        ('sedan', 3000, 12, 800, 800, 600, 800, 1000, 1200, 12),
                        ('ertiga', 3500, 15, 1000, 1000, 800, 1000, 1200, 1400, 15),
                        ('innova_crysta', 4000, 17, 1200, 1200, 1000, 1200, 1400, 1600, 17),
                        ('tempo', 6000, 19, 2000, 2000, 1600, 1800, 2000, 2500, 19),
                        ('luxury', 7000, 22, 2500, 2500, 2000, 2200, 2500, 3000, 22)";
                        
                        if ($conn->query($defaultData)) {
                            $messages[] = "Added default data to airport_transfer_fares table";
                        } else {
                            $messages[] = "Failed to add default data to airport_transfer_fares table: " . $conn->error;
                        }
                    } else if ($tableName == 'local_package_fares') {
                        $defaultData = "INSERT IGNORE INTO local_package_fares (vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour) VALUES
                        ('sedan', 1200, 2200, 2500, 14, 250),
                        ('ertiga', 1500, 2700, 3000, 18, 250),
                        ('innova_crysta', 1800, 3000, 3500, 20, 250),
                        ('tempo', 3000, 4500, 5500, 22, 300),
                        ('luxury', 3500, 5500, 6500, 25, 300)";
                        
                        if ($conn->query($defaultData)) {
                            $messages[] = "Added default data to local_package_fares table";
                        } else {
                            $messages[] = "Failed to add default data to local_package_fares table: " . $conn->error;
                        }
                    } else if ($tableName == 'vehicle_types' && $tableExists == false) {
                        $defaultData = "INSERT IGNORE INTO vehicle_types (vehicle_id, name, capacity, luggage_capacity, ac, image, amenities, description, is_active) VALUES
                        ('sedan', 'Sedan', 4, 2, 1, '/cars/sedan.png', '[\"AC\", \"Bottle Water\", \"Music System\"]', 'Comfortable sedan suitable for 4 passengers.', 1),
                        ('ertiga', 'Ertiga', 6, 3, 1, '/cars/ertiga.png', '[\"AC\", \"Bottle Water\", \"Music System\", \"Extra Legroom\"]', 'Spacious SUV suitable for 6 passengers.', 1),
                        ('innova_crysta', 'Innova Crysta', 7, 4, 1, '/cars/innova.png', '[\"AC\", \"Bottle Water\", \"Music System\", \"Extra Legroom\", \"Charging Point\"]', 'Premium SUV with ample space for 7 passengers.', 1),
                        ('tempo', 'Tempo Traveller', 12, 10, 1, '/cars/tempo.png', '[\"AC\", \"Bottle Water\", \"Music System\", \"Extra Legroom\", \"Charging Point\"]', 'Spacious vehicle for large groups.', 1),
                        ('luxury', 'Luxury Sedan', 4, 3, 1, '/cars/luxury.png', '[\"AC\", \"Bottle Water\", \"Music System\", \"Premium Seats\", \"Charging Point\"]', 'Premium luxury sedan for comfortable rides.', 1)";
                        
                        if ($conn->query($defaultData)) {
                            $messages[] = "Added default data to vehicle_types table";
                        } else {
                            $messages[] = "Failed to add default data to vehicle_types table: " . $conn->error;
                        }
                    }
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
    $verified = count($tablesFailed) === 0;
    
} catch (Exception $e) {
    $messages[] = "Verification error: " . $e->getMessage();
    $verified = false;
}

// Prepare the response
$response = [
    'status' => $verified ? 'success' : 'error',
    'message' => $verified ? 'Database initialization completed successfully' : 'Database initialization completed with errors',
    'tables_verified' => $verified,
    'timestamp' => time(),
    'messages' => $messages,
    'tables_created' => $tablesCreated,
    'tables_failed' => $tablesFailed,
    'force_applied' => $force,
    'endpoint' => $_SERVER['REQUEST_URI']
];

// Output response in JSON
echo json_encode($response, JSON_PRETTY_PRINT);

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
    echo '<a href="../fares.php" style="background-color: #28a745; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">View Fares</a>';
    echo '</div>';
    
    echo '</body></html>';
}
