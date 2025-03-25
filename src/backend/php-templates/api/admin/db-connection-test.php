
<?php
// Simple endpoint to test database connection
header("Access-Control-Allow-Origin: *");
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
    // Additional fallback (just MySQL connection without database)
    [
        'host' => 'localhost',
        'user' => 'u644605165_new_bookingusr',
        'pass' => 'Vizag@1213',
        'name' => ''
    ]
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
        break;
    }
}

$results = [
    'status' => 'testing',
    'configLoaded' => $configLoaded,
    'timestamp' => date('Y-m-d H:i:s'),
    'server_info' => [
        'php_version' => PHP_VERSION,
        'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
        'mysql_client_info' => function_exists('mysqli_get_client_info') ? mysqli_get_client_info() : 'unknown'
    ],
    'connections' => []
];

// Try connection using PDO if available
if (class_exists('PDO')) {
    try {
        $results['pdo_available'] = true;
        $dsn = "mysql:host={$dbCredentials[0]['host']};dbname={$dbCredentials[0]['name']}";
        $startTime = microtime(true);
        $pdo = new PDO($dsn, $dbCredentials[0]['user'], $dbCredentials[0]['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]);
        $endTime = microtime(true);
        $connectionTime = round(($endTime - $startTime) * 1000, 2);
        
        $results['connections'][] = [
            'source' => 'PDO connection',
            'status' => 'success',
            'time' => $connectionTime . 'ms',
            'server' => $pdo->getAttribute(PDO::ATTR_SERVER_VERSION)
        ];
        
        // Test query
        $startTime = microtime(true);
        $stmt = $pdo->query("SELECT 1 as test");
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $endTime = microtime(true);
        $queryTime = round(($endTime - $startTime) * 1000, 2);
        
        $results['connections'][count($results['connections'])-1]['query'] = [
            'status' => 'success',
            'time' => $queryTime . 'ms',
            'result' => $row
        ];
        
        // Check for outstation_fares table
        $stmt = $pdo->query("SHOW TABLES LIKE 'outstation_fares'");
        if ($stmt->rowCount() > 0) {
            $results['connections'][count($results['connections'])-1]['outstation_fares_table'] = 'exists';
            
            // Get table structure
            $stmt = $pdo->query("DESCRIBE outstation_fares");
            $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $results['connections'][count($results['connections'])-1]['table_structure'] = $columns;
            
            // Get row count
            $stmt = $pdo->query("SELECT COUNT(*) as count FROM outstation_fares");
            $rowCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
            $results['connections'][count($results['connections'])-1]['row_count'] = $rowCount;
            
            // Check for specific columns
            $idColumnExists = false;
            $vehicleIdColumnExists = false;
            foreach ($columns as $column) {
                if ($column['Field'] === 'id') {
                    $idColumnExists = true;
                }
                if ($column['Field'] === 'vehicle_id') {
                    $vehicleIdColumnExists = true;
                }
            }
            
            $results['connections'][count($results['connections'])-1]['id_column_exists'] = $idColumnExists;
            $results['connections'][count($results['connections'])-1]['vehicle_id_column_exists'] = $vehicleIdColumnExists;
            
            // Fix missing columns if requested
            if (isset($_GET['fix']) && $_GET['fix'] === 'true') {
                if (!$idColumnExists) {
                    try {
                        $pdo->exec("ALTER TABLE outstation_fares ADD COLUMN id VARCHAR(50) NOT NULL FIRST");
                        $results['connections'][count($results['connections'])-1]['fixes'][] = [
                            'action' => 'Added missing id column',
                            'status' => 'success'
                        ];
                    } catch (Exception $e) {
                        $results['connections'][count($results['connections'])-1]['fixes'][] = [
                            'action' => 'Failed to add id column',
                            'status' => 'error',
                            'error' => $e->getMessage()
                        ];
                    }
                }
                
                if (!$vehicleIdColumnExists) {
                    try {
                        $pdo->exec("ALTER TABLE outstation_fares ADD COLUMN vehicle_id VARCHAR(50) NOT NULL AFTER id");
                        $results['connections'][count($results['connections'])-1]['fixes'][] = [
                            'action' => 'Added missing vehicle_id column',
                            'status' => 'success'
                        ];
                    } catch (Exception $e) {
                        $results['connections'][count($results['connections'])-1]['fixes'][] = [
                            'action' => 'Failed to add vehicle_id column',
                            'status' => 'error',
                            'error' => $e->getMessage()
                        ];
                    }
                }
                
                // Copy id to vehicle_id and vice versa if one is empty
                if ($idColumnExists && $vehicleIdColumnExists) {
                    try {
                        $pdo->exec("UPDATE outstation_fares SET id = vehicle_id WHERE id IS NULL OR id = ''");
                        $pdo->exec("UPDATE outstation_fares SET vehicle_id = id WHERE vehicle_id IS NULL OR vehicle_id = ''");
                        $results['connections'][count($results['connections'])-1]['fixes'][] = [
                            'action' => 'Updated id/vehicle_id consistency',
                            'status' => 'success'
                        ];
                    } catch (Exception $e) {
                        $results['connections'][count($results['connections'])-1]['fixes'][] = [
                            'action' => 'Failed to update id/vehicle_id consistency',
                            'status' => 'error',
                            'error' => $e->getMessage()
                        ];
                    }
                }
            }
        } else {
            $results['connections'][count($results['connections'])-1]['outstation_fares_table'] = 'does not exist';
            
            // Create table if requested
            if (isset($_GET['fix']) && $_GET['fix'] === 'true') {
                try {
                    $pdo->exec("
                        CREATE TABLE outstation_fares (
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
                            INDEX (vehicle_id)
                        )
                    ");
                    
                    $results['connections'][count($results['connections'])-1]['fixes'][] = [
                        'action' => 'Created outstation_fares table',
                        'status' => 'success'
                    ];
                } catch (Exception $e) {
                    $results['connections'][count($results['connections'])-1]['fixes'][] = [
                        'action' => 'Failed to create outstation_fares table',
                        'status' => 'error',
                        'error' => $e->getMessage()
                    ];
                }
            }
        }
    } catch (PDOException $e) {
        $results['connections'][] = [
            'source' => 'PDO connection',
            'status' => 'error',
            'error' => $e->getMessage()
        ];
    }
} else {
    $results['pdo_available'] = false;
}

// Test connection using constants (if they exist)
if (defined('DB_HOST') && defined('DB_NAME') && defined('DB_USER') && defined('DB_PASS')) {
    try {
        $startTime = microtime(true);
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        $endTime = microtime(true);
        $connectionTime = round(($endTime - $startTime) * 1000, 2);
        
        if (!$conn->connect_error) {
            $results['connections'][] = [
                'source' => 'DB_ constants',
                'status' => 'success',
                'time' => $connectionTime . 'ms',
                'server' => $conn->server_info
            ];
            
            // Test running a simple query
            $startTime = microtime(true);
            $result = $conn->query("SELECT 1 as test");
            $endTime = microtime(true);
            $queryTime = round(($endTime - $startTime) * 1000, 2);
            
            if ($result) {
                $row = $result->fetch_assoc();
                $results['connections'][count($results['connections'])-1]['query'] = [
                    'status' => 'success',
                    'time' => $queryTime . 'ms',
                    'result' => $row
                ];
                
                // Check for outstation_fares table
                $tableCheck = $conn->query("SHOW TABLES LIKE 'outstation_fares'");
                if ($tableCheck->num_rows > 0) {
                    $results['connections'][count($results['connections'])-1]['outstation_fares_table'] = 'exists';
                    
                    // Get table structure
                    $columnsResult = $conn->query("DESCRIBE outstation_fares");
                    $columns = [];
                    while ($columnRow = $columnsResult->fetch_assoc()) {
                        $columns[] = $columnRow;
                    }
                    $results['connections'][count($results['connections'])-1]['table_structure'] = $columns;
                } else {
                    $results['connections'][count($results['connections'])-1]['outstation_fares_table'] = 'does not exist';
                }
            } else {
                $results['connections'][count($results['connections'])-1]['query'] = [
                    'status' => 'error',
                    'error' => $conn->error
                ];
            }
            
            $conn->close();
        } else {
            $results['connections'][] = [
                'source' => 'DB_ constants',
                'status' => 'error',
                'error' => $conn->connect_error
            ];
        }
    } catch (Exception $e) {
        $results['connections'][] = [
            'source' => 'DB_ constants',
            'status' => 'error',
            'error' => $e->getMessage()
        ];
    }
}

// Test connection using global variables
global $db_host, $db_name, $db_user, $db_pass;
if (isset($db_host) && isset($db_name) && isset($db_user) && isset($db_pass)) {
    try {
        $startTime = microtime(true);
        $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
        $endTime = microtime(true);
        $connectionTime = round(($endTime - $startTime) * 1000, 2);
        
        if (!$conn->connect_error) {
            $results['connections'][] = [
                'source' => 'global variables',
                'status' => 'success',
                'time' => $connectionTime . 'ms',
                'server' => $conn->server_info
            ];
            
            // Test running a simple query
            $startTime = microtime(true);
            $result = $conn->query("SELECT 1 as test");
            $endTime = microtime(true);
            $queryTime = round(($endTime - $startTime) * 1000, 2);
            
            if ($result) {
                $row = $result->fetch_assoc();
                $results['connections'][count($results['connections'])-1]['query'] = [
                    'status' => 'success',
                    'time' => $queryTime . 'ms',
                    'result' => $row
                ];
            } else {
                $results['connections'][count($results['connections'])-1]['query'] = [
                    'status' => 'error',
                    'error' => $conn->error
                ];
            }
            
            $conn->close();
        } else {
            $results['connections'][] = [
                'source' => 'global variables',
                'status' => 'error',
                'error' => $conn->connect_error
            ];
        }
    } catch (Exception $e) {
        $results['connections'][] = [
            'source' => 'global variables',
            'status' => 'error',
            'error' => $e->getMessage()
        ];
    }
}

// Test connections using fallback credentials
foreach ($dbCredentials as $index => $creds) {
    try {
        $startTime = microtime(true);
        if (empty($creds['name'])) {
            // Just connect to MySQL without specifying a database
            $conn = new mysqli($creds['host'], $creds['user'], $creds['pass']);
        } else {
            $conn = new mysqli($creds['host'], $creds['user'], $creds['pass'], $creds['name']);
        }
        $endTime = microtime(true);
        $connectionTime = round(($endTime - $startTime) * 1000, 2);
        
        if (!$conn->connect_error) {
            $results['connections'][] = [
                'source' => 'fallback credentials #' . ($index + 1),
                'status' => 'success',
                'time' => $connectionTime . 'ms',
                'server' => $conn->server_info,
                'host' => $creds['host'],
                'user' => $creds['user'],
                'database' => $creds['name'] ?: 'none'
            ];
            
            // If no database specified, test creating the database
            if (empty($creds['name'])) {
                $results['connections'][count($results['connections'])-1]['note'] = 'Connected to MySQL without database';
                
                // List all databases
                $databasesResult = $conn->query("SHOW DATABASES");
                $databases = [];
                while ($dbRow = $databasesResult->fetch_assoc()) {
                    $databases[] = $dbRow['Database'];
                }
                $results['connections'][count($results['connections'])-1]['available_databases'] = $databases;
            } else {
                // Test running a simple query
                $startTime = microtime(true);
                $result = $conn->query("SELECT 1 as test");
                $endTime = microtime(true);
                $queryTime = round(($endTime - $startTime) * 1000, 2);
                
                if ($result) {
                    $row = $result->fetch_assoc();
                    $results['connections'][count($results['connections'])-1]['query'] = [
                        'status' => 'success',
                        'time' => $queryTime . 'ms',
                        'result' => $row
                    ];
                    
                    // If we successfully connected, also check if outstation_fares table exists
                    $result = $conn->query("SHOW TABLES LIKE 'outstation_fares'");
                    if ($result->num_rows > 0) {
                        $results['connections'][count($results['connections'])-1]['outstation_fares_table'] = 'exists';
                        
                        // Check table structure
                        $result = $conn->query("DESCRIBE outstation_fares");
                        $columns = [];
                        while ($row = $result->fetch_assoc()) {
                            $columns[] = $row;
                        }
                        $results['connections'][count($results['connections'])-1]['table_structure'] = $columns;
                        
                        // Check for specific columns
                        $idExists = false;
                        $vehicleIdExists = false;
                        foreach ($columns as $column) {
                            if ($column['Field'] === 'id') {
                                $idExists = true;
                            }
                            if ($column['Field'] === 'vehicle_id') {
                                $vehicleIdExists = true;
                            }
                        }
                        
                        $results['connections'][count($results['connections'])-1]['id_column_exists'] = $idExists;
                        $results['connections'][count($results['connections'])-1]['vehicle_id_column_exists'] = $vehicleIdExists;
                        
                        // Get row count
                        $countResult = $conn->query("SELECT COUNT(*) as count FROM outstation_fares");
                        $countRow = $countResult->fetch_assoc();
                        $results['connections'][count($results['connections'])-1]['row_count'] = $countRow['count'];
                    } else {
                        $results['connections'][count($results['connections'])-1]['outstation_fares_table'] = 'does not exist';
                    }
                } else {
                    $results['connections'][count($results['connections'])-1]['query'] = [
                        'status' => 'error',
                        'error' => $conn->error
                    ];
                }
            }
            
            $conn->close();
        } else {
            $results['connections'][] = [
                'source' => 'fallback credentials #' . ($index + 1),
                'status' => 'error',
                'error' => $conn->connect_error,
                'host' => $creds['host'],
                'user' => $creds['user'],
                'database' => $creds['name'] ?: 'none'
            ];
        }
    } catch (Exception $e) {
        $results['connections'][] = [
            'source' => 'fallback credentials #' . ($index + 1),
            'status' => 'error',
            'error' => $e->getMessage(),
            'host' => $creds['host'],
            'user' => $creds['user'],
            'database' => $creds['name'] ?: 'none'
        ];
    }
}

// Check if any connection was successful
$successfulConnections = array_filter($results['connections'], function($conn) {
    return $conn['status'] === 'success';
});

$results['status'] = count($successfulConnections) > 0 ? 'success' : 'error';
$results['message'] = count($successfulConnections) > 0 
    ? 'Successfully connected to ' . count($successfulConnections) . ' database(s)' 
    : 'Failed to connect to any database';

echo json_encode($results, JSON_PRETTY_PRINT);
?>
