
<?php
/**
 * diagnose-database.php - Check database status and connectivity
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');

// Include the database helper
require_once dirname(__FILE__) . '/../common/db_helper.php';

// Response object
$response = [
    'status' => 'error',
    'message' => 'Unknown error',
    'tests' => [],
    'recommendations' => [],
    'timestamp' => time()
];

try {
    // Add tests to the response
    $response['tests'][] = [
        'name' => 'Database Connectivity',
        'status' => 'testing'
    ];
    
    // Try to connect to the database
    $conn = getDbConnectionWithRetry(3);
    
    // Update the test status
    $response['tests'][0]['status'] = 'success';
    $response['tests'][0]['message'] = 'Successfully connected to database';
    
    // Check for vehicles table
    $response['tests'][] = [
        'name' => 'Vehicles Table',
        'status' => 'testing'
    ];
    
    $vehicleTableExists = $conn->query("SHOW TABLES LIKE 'vehicles'")->num_rows > 0;
    $vehiclesTestIndex = 1;
    
    if ($vehicleTableExists) {
        $response['tests'][$vehiclesTestIndex]['status'] = 'success';
        $response['tests'][$vehiclesTestIndex]['message'] = 'Vehicles table exists';
        
        // Check vehicle count
        $vehicleCount = $conn->query("SELECT COUNT(*) as count FROM vehicles")->fetch_assoc()['count'];
        $response['tests'][$vehiclesTestIndex]['details'] = "Found $vehicleCount vehicles";
        
        if ($vehicleCount === 0) {
            $response['recommendations'][] = 'Your vehicles table is empty. Consider importing some sample vehicles.';
        }
        
        // Check required columns
        $requiredColumns = ['id', 'vehicle_id', 'name', 'capacity', 'luggage_capacity', 'night_halt_charge', 'driver_allowance'];
        $missingColumns = [];
        
        $columnsResult = $conn->query("SHOW COLUMNS FROM vehicles");
        $existingColumns = [];
        while ($column = $columnsResult->fetch_assoc()) {
            $existingColumns[] = $column['Field'];
        }
        
        foreach ($requiredColumns as $column) {
            if (!in_array($column, $existingColumns)) {
                $missingColumns[] = $column;
            }
        }
        
        if (count($missingColumns) > 0) {
            $response['tests'][$vehiclesTestIndex]['warnings'] = "Missing columns in vehicles table: " . implode(", ", $missingColumns);
            $response['recommendations'][] = 'Some required columns are missing in your vehicles table. Consider running "Fix Database" to add them.';
        }
    } else {
        $response['tests'][$vehiclesTestIndex]['status'] = 'warning';
        $response['tests'][$vehiclesTestIndex]['message'] = 'Vehicles table does not exist';
        $response['recommendations'][] = 'Run the "Fix Database" function to create the vehicles table.';
    }
    
    // Check for fare tables
    $fareTableNames = ['outstation_fares', 'local_package_fares', 'airport_transfer_fares'];
    $testIndex = 2;
    
    foreach ($fareTableNames as $tableName) {
        $response['tests'][] = [
            'name' => ucfirst(str_replace('_', ' ', $tableName)),
            'status' => 'testing'
        ];
        
        $tableExists = $conn->query("SHOW TABLES LIKE '$tableName'")->num_rows > 0;
        
        if ($tableExists) {
            $response['tests'][$testIndex]['status'] = 'success';
            $response['tests'][$testIndex]['message'] = "$tableName table exists";
            
            // Check if table has entries
            $entryCount = $conn->query("SELECT COUNT(*) as count FROM $tableName")->fetch_assoc()['count'];
            $response['tests'][$testIndex]['details'] = "Found $entryCount entries";
            
            if ($entryCount === 0) {
                $response['recommendations'][] = "Your $tableName table is empty. Run 'Fix Database' to create default entries.";
            }
            
            // For outstation_fares, check critical columns
            if ($tableName === 'outstation_fares') {
                $nullCheck = $conn->query("SELECT COUNT(*) as count FROM $tableName WHERE night_halt_charge IS NULL OR driver_allowance IS NULL")->fetch_assoc()['count'];
                
                if ($nullCheck > 0) {
                    $response['tests'][$testIndex]['warnings'] = "Found $nullCheck entries with NULL values for critical fields";
                    $response['recommendations'][] = "Run 'Fix Database' to repair NULL values in $tableName table.";
                }
            }
        } else {
            $response['tests'][$testIndex]['status'] = 'warning';
            $response['tests'][$testIndex]['message'] = "$tableName table does not exist";
            $response['recommendations'][] = "Run 'Fix Database' to create the $tableName table.";
        }
        
        $testIndex++;
    }
    
    // Set overall status
    $hasWarnings = false;
    $hasErrors = false;
    
    foreach ($response['tests'] as $test) {
        if ($test['status'] === 'warning') {
            $hasWarnings = true;
        } else if ($test['status'] === 'error') {
            $hasErrors = true;
            break;
        }
    }
    
    if ($hasErrors) {
        $response['status'] = 'error';
        $response['message'] = 'Database has critical issues that need to be fixed';
    } else if ($hasWarnings) {
        $response['status'] = 'warning';
        $response['message'] = 'Database has some issues that should be addressed';
    } else {
        $response['status'] = 'success';
        $response['message'] = 'Database is healthy';
    }
    
    // Close the connection
    $conn->close();
    
} catch (Exception $e) {
    // Update the connection test status if it failed
    if (isset($response['tests'][0]) && $response['tests'][0]['status'] === 'testing') {
        $response['tests'][0]['status'] = 'error';
        $response['tests'][0]['message'] = $e->getMessage();
    }
    
    $response['status'] = 'error';
    $response['message'] = $e->getMessage();
    $response['recommendations'][] = 'Check your database credentials and ensure the MySQL server is running.';
    $response['recommendations'][] = 'Make sure the database and user exist and have proper permissions.';
}

// Send the response
echo json_encode($response, JSON_PRETTY_PRINT);
exit;
