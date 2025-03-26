
<?php
// Emergency database connection fix/diagnostic script
// This script attempts to repair database connection issues and diagnose problems

// Set aggressive CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: *");
header("Content-Type: application/json");
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");

// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Database credentials to try
$dbCredentials = [
    // Primary credentials
    [
        'host' => 'localhost',
        'user' => 'u644605165_new_bookingusr',
        'pass' => 'Vizag@1213',
        'name' => 'u644605165_new_bookingdb'
    ],
    // Alternative credentials
    [
        'host' => 'localhost',
        'user' => 'u644605165_bookingusr',
        'pass' => 'Vizag@1213',
        'name' => 'u644605165_bookingdb'
    ],
    // Additional fallback (without database)
    [
        'host' => 'localhost',
        'user' => 'u644605165_new_bookingusr',
        'pass' => 'Vizag@1213',
        'name' => ''
    ]
];

// Results container
$results = [
    'status' => 'processing',
    'message' => 'Database connection diagnostics and repair',
    'timestamp' => date('Y-m-d H:i:s'),
    'serverInfo' => [
        'php_version' => PHP_VERSION,
        'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
        'mysql_client_info' => function_exists('mysqli_get_client_info') ? mysqli_get_client_info() : 'unknown'
    ],
    'connections' => [],
    'repairs' => []
];

// Try to include config files
$configFiles = [
    __DIR__ . '/../../config.php',
    __DIR__ . '/../../../config.php',
    __DIR__ . '/../../../../config.php'
];

$configLoaded = false;
foreach ($configFiles as $file) {
    if (file_exists($file)) {
        include_once $file;
        $configLoaded = true;
        $results['configLoaded'] = $file;
        break;
    }
}

// Test connection using various methods and fix if possible
function testAndFixConnection() {
    global $dbCredentials, $results;
    
    $successfulConnection = null;
    
    // Try each credential set
    foreach ($dbCredentials as $index => $creds) {
        try {
            $conn = new mysqli($creds['host'], $creds['user'], $creds['pass'], $creds['name']);
            
            if (!$conn->connect_error) {
                $results['connections'][] = [
                    'index' => $index,
                    'status' => 'success',
                    'host' => $creds['host'],
                    'user' => $creds['user'],
                    'database' => $creds['name'],
                    'serverInfo' => $conn->server_info
                ];
                
                $successfulConnection = [
                    'conn' => $conn,
                    'creds' => $creds
                ];
                
                // If we've made a successful connection, try to fix the outstation_fares table
                fixOutstationFaresTable($conn);
                
                break;
            } else {
                $results['connections'][] = [
                    'index' => $index,
                    'status' => 'error',
                    'host' => $creds['host'],
                    'user' => $creds['user'],
                    'database' => $creds['name'],
                    'error' => $conn->connect_error
                ];
            }
        } catch (Exception $e) {
            $results['connections'][] = [
                'index' => $index,
                'status' => 'exception',
                'host' => $creds['host'],
                'user' => $creds['user'],
                'database' => $creds['name'],
                'error' => $e->getMessage()
            ];
        }
    }
    
    // If all previous attempts failed, try connecting without database and create one
    if (!$successfulConnection) {
        foreach ($dbCredentials as $index => $creds) {
            try {
                // Try to connect without database name
                $conn = new mysqli($creds['host'], $creds['user'], $creds['pass']);
                
                if (!$conn->connect_error) {
                    $results['repairs'][] = [
                        'action' => 'Connected without database',
                        'status' => 'success',
                        'host' => $creds['host'],
                        'user' => $creds['user']
                    ];
                    
                    // Try to create the database if it doesn't exist
                    if (!empty($creds['name'])) {
                        $createDbResult = $conn->query("CREATE DATABASE IF NOT EXISTS `{$creds['name']}`");
                        
                        if ($createDbResult) {
                            $results['repairs'][] = [
                                'action' => 'Created database',
                                'status' => 'success',
                                'database' => $creds['name']
                            ];
                            
                            // Now try connecting with the database
                            $conn->close();
                            $conn = new mysqli($creds['host'], $creds['user'], $creds['pass'], $creds['name']);
                            
                            if (!$conn->connect_error) {
                                $successfulConnection = [
                                    'conn' => $conn,
                                    'creds' => $creds
                                ];
                                
                                $results['repairs'][] = [
                                    'action' => 'Connected to created database',
                                    'status' => 'success',
                                    'database' => $creds['name']
                                ];
                                
                                // Create essential tables
                                createEssentialTables($conn);
                                break;
                            }
                        }
                    }
                }
            } catch (Exception $e) {
                $results['repairs'][] = [
                    'action' => 'Attempted repair',
                    'status' => 'error',
                    'error' => $e->getMessage()
                ];
            }
        }
    }
    
    return $successfulConnection;
}

// Create essential tables if they don't exist
function createEssentialTables($conn) {
    global $results;
    
    // Create outstation_fares table
    $createTableSql = "
        CREATE TABLE IF NOT EXISTS outstation_fares (
            id VARCHAR(50) NOT NULL,
            vehicle_id VARCHAR(50) NOT NULL,
            base_fare DECIMAL(10,2) NOT NULL DEFAULT 0,
            price_per_km DECIMAL(10,2) NOT NULL DEFAULT 0,
            driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 250,
            night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 700,
            roundtrip_base_fare DECIMAL(10,2) NOT NULL DEFAULT 0,
            roundtrip_price_per_km DECIMAL(10,2) NOT NULL DEFAULT 0,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY vehicle_id (vehicle_id)
        )
    ";
    
    try {
        $createResult = $conn->query($createTableSql);
        
        if ($createResult) {
            $results['repairs'][] = [
                'action' => 'Created outstation_fares table',
                'status' => 'success'
            ];
        } else {
            $results['repairs'][] = [
                'action' => 'Failed to create outstation_fares table',
                'status' => 'error',
                'error' => $conn->error
            ];
        }
    } catch (Exception $e) {
        $results['repairs'][] = [
            'action' => 'Exception creating outstation_fares table',
            'status' => 'error',
            'error' => $e->getMessage()
        ];
    }
}

// Fix existing outstation_fares table if needed
function fixOutstationFaresTable($conn) {
    global $results;
    
    try {
        // Check if the table exists
        $tableCheck = $conn->query("SHOW TABLES LIKE 'outstation_fares'");
        
        if ($tableCheck->num_rows == 0) {
            // Table doesn't exist, create it
            createEssentialTables($conn);
            return;
        }
        
        // Check if the columns we need exist
        $columnCheck = $conn->query("SHOW COLUMNS FROM outstation_fares");
        $columns = [];
        
        while ($row = $columnCheck->fetch_assoc()) {
            $columns[] = $row['Field'];
        }
        
        $results['repairs'][] = [
            'action' => 'Checked outstation_fares columns',
            'status' => 'info',
            'columns' => $columns
        ];
        
        $missingColumns = [];
        $columnsToCheck = ['id', 'vehicle_id', 'base_fare', 'price_per_km', 'driver_allowance', 'night_halt_charge'];
        
        foreach ($columnsToCheck as $column) {
            if (!in_array($column, $columns)) {
                $missingColumns[] = $column;
            }
        }
        
        if (!empty($missingColumns)) {
            $results['repairs'][] = [
                'action' => 'Found missing columns',
                'status' => 'warning',
                'missingColumns' => $missingColumns
            ];
            
            // Add missing columns
            foreach ($missingColumns as $column) {
                $alterSql = "";
                
                switch ($column) {
                    case 'id':
                        $alterSql = "ALTER TABLE outstation_fares ADD COLUMN id VARCHAR(50) NOT NULL";
                        break;
                    case 'vehicle_id':
                        $alterSql = "ALTER TABLE outstation_fares ADD COLUMN vehicle_id VARCHAR(50) NOT NULL";
                        break;
                    case 'base_fare':
                        $alterSql = "ALTER TABLE outstation_fares ADD COLUMN base_fare DECIMAL(10,2) NOT NULL DEFAULT 0";
                        break;
                    case 'price_per_km':
                        $alterSql = "ALTER TABLE outstation_fares ADD COLUMN price_per_km DECIMAL(10,2) NOT NULL DEFAULT 0";
                        break;
                    case 'driver_allowance':
                        $alterSql = "ALTER TABLE outstation_fares ADD COLUMN driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 250";
                        break;
                    case 'night_halt_charge':
                        $alterSql = "ALTER TABLE outstation_fares ADD COLUMN night_halt_charge DECIMAL(10,2) NOT NULL DEFAULT 700";
                        break;
                }
                
                if (!empty($alterSql)) {
                    try {
                        $alterResult = $conn->query($alterSql);
                        
                        if ($alterResult) {
                            $results['repairs'][] = [
                                'action' => "Added missing column: $column",
                                'status' => 'success'
                            ];
                        } else {
                            $results['repairs'][] = [
                                'action' => "Failed to add column: $column",
                                'status' => 'error',
                                'error' => $conn->error
                            ];
                        }
                    } catch (Exception $e) {
                        $results['repairs'][] = [
                            'action' => "Exception adding column: $column",
                            'status' => 'error',
                            'error' => $e->getMessage()
                        ];
                    }
                }
            }
        }
        
        // Fix duplicate entries by ensuring id and vehicle_id are the same
        if (in_array('id', $columns) && in_array('vehicle_id', $columns)) {
            $conn->query("UPDATE outstation_fares SET id = vehicle_id WHERE id != vehicle_id");
            
            $results['repairs'][] = [
                'action' => "Updated ID consistency",
                'status' => 'success'
            ];
        }
        
        // Ensure primary key exists
        if (in_array('id', $columns)) {
            try {
                $indexCheck = $conn->query("SHOW INDEX FROM outstation_fares WHERE Key_name = 'PRIMARY'");
                
                if ($indexCheck->num_rows == 0) {
                    // No primary key, add it
                    $alterSql = "ALTER TABLE outstation_fares ADD PRIMARY KEY (id)";
                    $alterResult = $conn->query($alterSql);
                    
                    $results['repairs'][] = [
                        'action' => "Added missing PRIMARY KEY on id",
                        'status' => $alterResult ? 'success' : 'error'
                    ];
                }
            } catch (Exception $e) {
                $results['repairs'][] = [
                    'action' => "Exception checking/adding PRIMARY KEY",
                    'status' => 'error',
                    'error' => $e->getMessage()
                ];
            }
        }
    } catch (Exception $e) {
        $results['repairs'][] = [
            'action' => 'Exception during table fix',
            'status' => 'error',
            'error' => $e->getMessage()
        ];
    }
}

// Test connection and fix database issues
$connection = testAndFixConnection();

// Final status
if ($connection) {
    $results['status'] = 'success';
    $results['message'] = 'Successfully connected to database and performed repairs';
    
    // Add sample data if needed
    if (!empty($_GET['populateSample'])) {
        try {
            $conn = $connection['conn'];
            
            // Check if there's any data in outstation_fares
            $dataCheck = $conn->query("SELECT COUNT(*) as count FROM outstation_fares");
            $dataCount = $dataCheck->fetch_assoc()['count'];
            
            if ($dataCount == 0) {
                // Add some sample data
                $sampleVehicles = [
                    ['sedan', 'Sedan', 2500, 14, 250, 700],
                    ['ertiga', 'Ertiga', 3200, 16, 250, 1000],
                    ['innova_crysta', 'Innova Crysta', 3800, 18, 250, 1000],
                    ['tempo', 'Tempo Traveller', 5000, 22, 300, 1500],
                    ['luxury', 'Luxury Sedan', 4000, 20, 300, 1000]
                ];
                
                $insertSql = "INSERT INTO outstation_fares (id, vehicle_id, base_fare, price_per_km, driver_allowance, night_halt_charge) VALUES (?, ?, ?, ?, ?, ?)";
                $stmt = $conn->prepare($insertSql);
                
                foreach ($sampleVehicles as $vehicle) {
                    $stmt->bind_param("ssdddd", $vehicle[0], $vehicle[0], $vehicle[2], $vehicle[3], $vehicle[4], $vehicle[5]);
                    $stmt->execute();
                }
                
                $results['repairs'][] = [
                    'action' => 'Added sample vehicle data',
                    'status' => 'success',
                    'count' => count($sampleVehicles)
                ];
            }
        } catch (Exception $e) {
            $results['repairs'][] = [
                'action' => 'Exception adding sample data',
                'status' => 'error',
                'error' => $e->getMessage()
            ];
        }
    }
} else {
    $results['status'] = 'error';
    $results['message'] = 'Failed to establish database connection after all attempts';
}

// Close connection if open
if ($connection && isset($connection['conn'])) {
    $connection['conn']->close();
}

// Output results
echo json_encode($results, JSON_PRETTY_PRINT);
?>
