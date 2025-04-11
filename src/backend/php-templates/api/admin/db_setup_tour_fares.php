
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check for authorization
$authHeader = null;
$headers = getallheaders();
foreach ($headers as $key => $value) {
    if (strtolower($key) === 'authorization') {
        $authHeader = $value;
        break;
    }
}

// Connect to database
$conn = getDbConnection();

try {
    // Check if tour_fares table exists
    $tableCheckQuery = "SHOW TABLES LIKE 'tour_fares'";
    $tableResult = $conn->query($tableCheckQuery);
    
    if ($tableResult->num_rows === 0) {
        // Create tour_fares table if it doesn't exist
        $createTableSql = "
            CREATE TABLE tour_fares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tour_id VARCHAR(100) NOT NULL UNIQUE,
                tour_name VARCHAR(255) NOT NULL,
                sedan DECIMAL(10,2) DEFAULT 0.00,
                ertiga DECIMAL(10,2) DEFAULT 0.00,
                innova DECIMAL(10,2) DEFAULT 0.00,
                tempo DECIMAL(10,2) DEFAULT 0.00,
                luxury DECIMAL(10,2) DEFAULT 0.00,
                distance DECIMAL(10,2) DEFAULT 0.00,
                days INT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        
        if ($conn->query($createTableSql)) {
            $response = [
                'status' => 'success',
                'message' => 'Tour fares table created successfully',
                'data' => [
                    'table_created' => true
                ]
            ];
        } else {
            throw new Exception("Failed to create tour_fares table: " . $conn->error);
        }
    } else {
        // Table exists, check if we need to add vehicle columns
        
        // Get current columns in tour_fares table
        $columnsQuery = "SHOW COLUMNS FROM tour_fares";
        $columnsResult = $conn->query($columnsQuery);
        
        $existingColumns = [];
        while ($column = $columnsResult->fetch_assoc()) {
            $existingColumns[] = $column['Field'];
        }
        
        // Get vehicle types from vehicles table for syncing
        $vehiclesQuery = "SELECT id, vehicle_id, name FROM vehicles WHERE is_active = 1";
        $vehiclesResult = $conn->query($vehiclesQuery);
        
        $standardVehicles = [
            'sedan', 'ertiga', 'innova', 'tempo', 'luxury', 'innova_crysta', 
            'tempo_traveller', 'mpv', 'toyota', 'dzire_cng', 'etios'
        ];
        
        $vehicleColumns = [];
        
        // Add standard vehicle columns first
        foreach ($standardVehicles as $vehicle) {
            $normalizedColumn = strtolower(preg_replace('/[^a-zA-Z0-9_]/', '_', $vehicle));
            if (!in_array($normalizedColumn, $existingColumns)) {
                $vehicleColumns[] = $normalizedColumn;
            }
        }
        
        // Add columns from vehicles table
        if ($vehiclesResult) {
            while ($vehicle = $vehiclesResult->fetch_assoc()) {
                // Normalize the vehicle ID to create a valid column name
                $vehicleId = $vehicle['vehicle_id'] ?: $vehicle['name'];
                $normalizedColumn = strtolower(preg_replace('/[^a-zA-Z0-9_]/', '_', $vehicleId));
                
                // Skip if this is a standard column we already added or if it already exists
                if (!in_array($normalizedColumn, $existingColumns) && !in_array($normalizedColumn, $vehicleColumns)) {
                    $vehicleColumns[] = $normalizedColumn;
                }
            }
        }
        
        // Add new columns to the table
        $addedColumns = [];
        foreach ($vehicleColumns as $column) {
            $alterTableSql = "ALTER TABLE tour_fares ADD COLUMN $column DECIMAL(10,2) DEFAULT 0.00";
            if ($conn->query($alterTableSql)) {
                $addedColumns[] = $column;
            } else {
                // Just log error but continue with other columns
                error_log("Failed to add column $column: " . $conn->error);
            }
        }
        
        $response = [
            'status' => 'success',
            'message' => count($addedColumns) > 0 
                ? 'Added ' . count($addedColumns) . ' new vehicle columns to tour_fares table' 
                : 'Tour fares table is up to date',
            'data' => [
                'existingColumns' => $existingColumns,
                'addedColumns' => $addedColumns
            ]
        ];
    }
    
    // Check if default tours exist, add them if they don't
    $defaultTours = [
        ['araku_valley', 'Araku Valley Tour', 120, 1],
        ['yarada_beach', 'Yarada Beach Tour', 40, 1],
        ['rushikonda', 'Rushikonda Beach Tour', 25, 1],
        ['annavaram', 'Annavaram Temple Tour', 90, 1],
        ['araku', 'Araku Scenic Tour', 115, 1],
        ['lambasingi', 'Lambasingi Hill Tour', 100, 1],
        ['srikakulam', 'Srikakulam Tour', 110, 1],
        ['vanajangi', 'Vanajangi Scenic Tour', 95, 1],
        ['vizag', 'Vizag City Tour', 30, 1]
    ];
    
    $toursAdded = 0;
    foreach ($defaultTours as $tour) {
        $checkTourSql = "SELECT id FROM tour_fares WHERE tour_id = ?";
        $stmt = $conn->prepare($checkTourSql);
        $stmt->bind_param("s", $tour[0]);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            // Tour doesn't exist, add it
            $insertTourSql = "INSERT INTO tour_fares (tour_id, tour_name, distance, days) VALUES (?, ?, ?, ?)";
            $insertStmt = $conn->prepare($insertTourSql);
            $insertStmt->bind_param("ssdi", $tour[0], $tour[1], $tour[2], $tour[3]);
            if ($insertStmt->execute()) {
                $toursAdded++;
            }
        }
    }
    
    if ($toursAdded > 0) {
        $response['data']['toursAdded'] = $toursAdded;
        $response['message'] .= " and added $toursAdded default tours";
    }
    
    echo json_encode($response);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Error setting up tour fares: ' . $e->getMessage()
    ]);
}
