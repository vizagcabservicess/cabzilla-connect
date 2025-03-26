
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

try {
    // Connect to database again to verify tables
    require_once '../../config.php';
    $conn = getDbConnection();
    
    // Verify essential tables
    $tableChecks = [
        'local_package_fares' => false,
        'airport_transfer_fares' => false,
        'outstation_fares' => false,
        'drivers' => false
    ];
    
    // Check table existence and structure
    foreach (array_keys($tableChecks) as $tableName) {
        $tableResult = $conn->query("SHOW TABLES LIKE '$tableName'");
        $tableExists = $tableResult->num_rows > 0;
        
        if ($tableExists) {
            // Verify table structure if needed
            $tableChecks[$tableName] = true;
            $messages[] = "Table $tableName exists";
            
            // Check column names for the local_package_fares table
            if ($tableName === 'local_package_fares') {
                $columnResult = $conn->query("SHOW COLUMNS FROM $tableName");
                $columns = [];
                while ($row = $columnResult->fetch_assoc()) {
                    $columns[] = $row['Field'];
                }
                
                $requiredColumns = [
                    'vehicle_id', 
                    'price_4hrs_40km', 
                    'price_8hrs_80km', 
                    'price_10hrs_100km', 
                    'price_extra_km', 
                    'price_extra_hour'
                ];
                
                $missingColumns = array_diff($requiredColumns, $columns);
                
                if (!empty($missingColumns)) {
                    $messages[] = "Warning: Missing columns in $tableName: " . implode(', ', $missingColumns);
                    $tableChecks[$tableName] = false;
                    
                    // If force is true, drop and recreate the table
                    if ($force) {
                        $messages[] = "Force option: Dropping and recreating $tableName";
                        $conn->query("DROP TABLE $tableName");
                        $tableChecks[$tableName] = false;
                    }
                }
            }
        } else {
            $messages[] = "Table $tableName does not exist";
        }
    }
    
    $verified = !in_array(false, $tableChecks);
    
} catch (Exception $e) {
    $messages[] = "Verification error: " . $e->getMessage();
    $verified = false;
}

// Output response in JSON
echo json_encode([
    'status' => 'success',
    'message' => 'Database initialization completed',
    'tables_verified' => $verified,
    'timestamp' => time(),
    'messages' => $messages,
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
    
    echo '<div style="margin-top: 20px;">';
    if (!$verified) {
        echo '<a href="?force=true&verbose=true&html=true" style="background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; margin-right: 10px;">Force Initialize</a>';
    }
    echo '<a href="../fares/vehicles.php" style="background-color: #28a745; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">View Vehicles</a>';
    echo '</div>';
    
    echo '</body></html>';
}
