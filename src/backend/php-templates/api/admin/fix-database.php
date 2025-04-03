
<?php
/**
 * fix-database.php - API endpoint for database maintenance operations
 * Handles column name fixes and other database structure repairs
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory if it doesn't exist
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Log request for debugging
$timestamp = date('Y-m-d H:i:s');
error_log("[$timestamp] Database fix request received", 3, $logDir . '/fix-database.log');

// Function to write to log
function logMessage($message) {
    global $timestamp, $logDir;
    error_log("[$timestamp] $message", 3, $logDir . '/fix-database.log');
}

// Function to get database connection
function getDbConnection() {
    try {
        $host = 'localhost';
        $dbname = 'u644605165_db_be'; 
        $username = 'u644605165_usr_be';
        $password = 'Vizag@1213';
        
        $conn = new mysqli($host, $username, $password, $dbname);
        
        if ($conn->connect_error) {
            throw new Exception("Connection failed: " . $conn->connect_error);
        }
        
        return $conn;
    } catch (Exception $e) {
        logMessage("Database connection error: " . $e->getMessage());
        throw $e;
    }
}

// Function to check if column exists
function columnExists($conn, $table, $column) {
    $result = $conn->query("SHOW COLUMNS FROM `$table` LIKE '$column'");
    return ($result && $result->num_rows > 0);
}

// Function to fix local_package_fares table structure
function fixLocalPackageFares($conn) {
    $fixes = [];
    
    // Check if table exists
    $tableExists = $conn->query("SHOW TABLES LIKE 'local_package_fares'")->num_rows > 0;
    
    if (!$tableExists) {
        // Create table with proper structure
        $createTableSQL = "
            CREATE TABLE IF NOT EXISTS `local_package_fares` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `vehicle_id` varchar(50) NOT NULL,
                `price_4hr_40km` decimal(10,2) NOT NULL DEFAULT 0,
                `price_8hr_80km` decimal(10,2) NOT NULL DEFAULT 0,
                `price_10hr_100km` decimal(10,2) NOT NULL DEFAULT 0,
                `extra_km_rate` decimal(5,2) NOT NULL DEFAULT 0,
                `extra_hour_rate` decimal(5,2) NOT NULL DEFAULT 0,
                `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `vehicle_id` (`vehicle_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        $conn->query($createTableSQL);
        $fixes[] = "Created local_package_fares table";
        logMessage("Created local_package_fares table");
    } else {
        // Table exists, check/fix column structure
        
        // Column mappings to check (incorrect => correct)
        $columnMappings = [
            'price_4hrs_40km' => 'price_4hr_40km',
            'price_8hrs_80km' => 'price_8hr_80km',
            'price_10hrs_100km' => 'price_10hr_100km'
        ];
        
        // Check each pair of columns
        foreach ($columnMappings as $hrsColumn => $hrColumn) {
            $hrsExists = columnExists($conn, 'local_package_fares', $hrsColumn);
            $hrExists = columnExists($conn, 'local_package_fares', $hrColumn);
            
            // If hrs exists but hr doesn't, add the hr column
            if ($hrsExists && !$hrExists) {
                $conn->query("ALTER TABLE local_package_fares ADD `$hrColumn` decimal(10,2) NOT NULL DEFAULT 0");
                $fixes[] = "Added $hrColumn column";
                logMessage("Added missing column $hrColumn");
                
                // Copy data from hrs to hr column
                $conn->query("UPDATE local_package_fares SET `$hrColumn` = `$hrsColumn`");
                $fixes[] = "Copied data from $hrsColumn to $hrColumn";
            } 
            // If hr exists but hrs doesn't, add the hrs column
            else if ($hrExists && !$hrsExists) {
                $conn->query("ALTER TABLE local_package_fares ADD `$hrsColumn` decimal(10,2) NOT NULL DEFAULT 0");
                $fixes[] = "Added $hrsColumn column";
                logMessage("Added missing column $hrsColumn");
                
                // Copy data from hr to hrs column
                $conn->query("UPDATE local_package_fares SET `$hrsColumn` = `$hrColumn`");
                $fixes[] = "Copied data from $hrColumn to $hrsColumn";
            }
            // If neither exists, add both columns
            else if (!$hrExists && !$hrsExists) {
                $conn->query("ALTER TABLE local_package_fares 
                             ADD `$hrColumn` decimal(10,2) NOT NULL DEFAULT 0,
                             ADD `$hrsColumn` decimal(10,2) NOT NULL DEFAULT 0");
                $fixes[] = "Added both $hrColumn and $hrsColumn columns";
                logMessage("Added both missing columns $hrColumn and $hrsColumn");
            }
        }
        
        // Make sure extra_km_rate and extra_hour_rate exist
        if (!columnExists($conn, 'local_package_fares', 'extra_km_rate')) {
            $conn->query("ALTER TABLE local_package_fares ADD `extra_km_rate` decimal(5,2) NOT NULL DEFAULT 0");
            $fixes[] = "Added extra_km_rate column";
        }
        
        if (!columnExists($conn, 'local_package_fares', 'extra_hour_rate')) {
            $conn->query("ALTER TABLE local_package_fares ADD `extra_hour_rate` decimal(5,2) NOT NULL DEFAULT 0");
            $fixes[] = "Added extra_hour_rate column";
        }
    }
    
    return $fixes;
}

// Function to synchronize data between columns
function syncColumnData($conn, $table, $sourceColumn, $targetColumn) {
    if (columnExists($conn, $table, $sourceColumn) && columnExists($conn, $table, $targetColumn)) {
        $conn->query("UPDATE $table SET `$targetColumn` = `$sourceColumn` WHERE `$targetColumn` != `$sourceColumn` OR `$targetColumn` = 0");
        logMessage("Synchronized data from $sourceColumn to $targetColumn");
        return true;
    }
    return false;
}

// Main function to handle database fixes
function fixDatabase($action) {
    try {
        $conn = getDbConnection();
        $fixes = [];
        
        switch ($action) {
            case 'fix_column_names':
                $fixes = array_merge($fixes, fixLocalPackageFares($conn));
                
                // Synchronize data between columns in both directions to ensure consistency
                syncColumnData($conn, 'local_package_fares', 'price_4hr_40km', 'price_4hrs_40km');
                syncColumnData($conn, 'local_package_fares', 'price_4hrs_40km', 'price_4hr_40km');
                
                syncColumnData($conn, 'local_package_fares', 'price_8hr_80km', 'price_8hrs_80km');
                syncColumnData($conn, 'local_package_fares', 'price_8hrs_80km', 'price_8hr_80km');
                
                syncColumnData($conn, 'local_package_fares', 'price_10hr_100km', 'price_10hrs_100km');
                syncColumnData($conn, 'local_package_fares', 'price_10hrs_100km', 'price_10hr_100km');
                
                logMessage("Fixed column names and synchronized data");
                break;
                
            case 'verify_vehicles':
                // Check vehicles table for numeric vehicle_id values
                $query = "SELECT id, vehicle_id FROM vehicles WHERE vehicle_id REGEXP '^[0-9]+$'";
                $result = $conn->query($query);
                
                if ($result->num_rows > 0) {
                    logMessage("Found {$result->num_rows} vehicles with numeric IDs");
                    $fixes[] = "Found {$result->num_rows} vehicles with numeric IDs - converting to proper text IDs";
                    
                    // Process each problematic vehicle
                    while ($row = $result->fetch_assoc()) {
                        $numericId = $row['vehicle_id'];
                        $rowId = $row['id'];
                        
                        // Map standard numeric IDs
                        $mappedId = null;
                        switch ($numericId) {
                            case '1': $mappedId = 'sedan'; break;
                            case '2': $mappedId = 'ertiga'; break;
                            case '3': $mappedId = 'innova'; break;
                            case '4': $mappedId = 'crysta'; break;
                            case '5': $mappedId = 'tempo'; break;
                            case '6': $mappedId = 'bus'; break;
                            case '7': $mappedId = 'van'; break;
                            case '8': $mappedId = 'suv'; break;
                            case '9': $mappedId = 'traveller'; break;
                            case '10': $mappedId = 'luxury'; break;
                            default: $mappedId = 'sedan'; break; // Default fallback
                        }
                        
                        if ($mappedId) {
                            $updateVehicleQuery = "UPDATE vehicles SET vehicle_id = ? WHERE id = ?";
                            $updateStmt = $conn->prepare($updateVehicleQuery);
                            $updateStmt->bind_param("si", $mappedId, $rowId);
                            $updateStmt->execute();
                            
                            $fixes[] = "Converted numeric vehicle_id $numericId to $mappedId";
                            logMessage("Fixed vehicle: numeric ID $numericId → $mappedId (row ID: $rowId)");
                        }
                    }
                } else {
                    $fixes[] = "No vehicles with numeric IDs found";
                }
                break;
                
            case 'verify_tables':
                // Check if required tables exist
                $requiredTables = ['vehicles', 'local_package_fares', 'vehicle_pricing', 'outstation_fares'];
                
                foreach ($requiredTables as $table) {
                    $tableExists = $conn->query("SHOW TABLES LIKE '$table'")->num_rows > 0;
                    if (!$tableExists) {
                        $fixes[] = "Missing table: $table";
                    }
                }
                
                if (empty($fixes)) {
                    $fixes[] = "All required tables exist";
                }
                break;
                
            default:
                // Run all fixes by default
                $fixes = array_merge($fixes, fixLocalPackageFares($conn));
                
                // Synchronize data between columns
                syncColumnData($conn, 'local_package_fares', 'price_4hr_40km', 'price_4hrs_40km');
                syncColumnData($conn, 'local_package_fares', 'price_8hr_80km', 'price_8hrs_80km');
                syncColumnData($conn, 'local_package_fares', 'price_10hr_100km', 'price_10hrs_100km');
                
                // Also run vehicle ID fixes
                $query = "SELECT id, vehicle_id FROM vehicles WHERE vehicle_id REGEXP '^[0-9]+$'";
                $result = $conn->query($query);
                
                if ($result->num_rows > 0) {
                    $fixes[] = "Found {$result->num_rows} vehicles with numeric IDs - fixing";
                    
                    // Standard mappings
                    $idMappings = [
                        '1' => 'sedan', 
                        '2' => 'ertiga',
                        '3' => 'innova',
                        '4' => 'crysta',
                        '5' => 'tempo',
                        '6' => 'bus',
                        '7' => 'van',
                        '8' => 'suv',
                        '9' => 'traveller',
                        '10' => 'luxury'
                    ];
                    
                    while ($row = $result->fetch_assoc()) {
                        $numericId = $row['vehicle_id'];
                        $rowId = $row['id'];
                        $mappedId = isset($idMappings[$numericId]) ? $idMappings[$numericId] : 'sedan';
                        
                        $updateVehicleQuery = "UPDATE vehicles SET vehicle_id = ? WHERE id = ?";
                        $updateStmt = $conn->prepare($updateVehicleQuery);
                        $updateStmt->bind_param("si", $mappedId, $rowId);
                        $updateStmt->execute();
                        
                        $fixes[] = "Converted numeric vehicle_id $numericId to $mappedId";
                    }
                }
                break;
        }
        
        $conn->close();
        return [
            'status' => 'success',
            'message' => 'Database fixes completed successfully',
            'fixes' => $fixes,
            'fixed_count' => count($fixes)
        ];
    } catch (Exception $e) {
        logMessage("Error performing database fixes: " . $e->getMessage());
        return [
            'status' => 'error',
            'message' => $e->getMessage()
        ];
    }
}

// Get request data
$requestData = file_get_contents('php://input');
$data = json_decode($requestData, true);

// If no JSON data, try POST data
if (empty($data) && !empty($_POST)) {
    $data = $_POST;
}

// Set default action
$action = 'all';

// Get action from request if available
if (isset($data['action'])) {
    $action = $data['action'];
} else if (isset($_GET['action'])) {
    $action = $_GET['action'];
}

// Log the requested action
logMessage("Requested action: " . $action);

// Perform database fixes
$result = fixDatabase($action);

// Send response
echo json_encode($result);
