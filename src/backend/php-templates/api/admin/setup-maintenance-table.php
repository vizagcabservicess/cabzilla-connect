
<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
require_once __DIR__ . '/../../config.php';
header('Content-Type: application/json');

function createMaintenanceRecordsTable($conn) {
    $sql = "CREATE TABLE IF NOT EXISTS maintenance_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicleId VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        serviceType VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        cost DECIMAL(10,2) NOT NULL,
        vendor VARCHAR(100) NOT NULL,
        nextServiceDate DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicleId) REFERENCES fleet_vehicles(id) ON DELETE CASCADE
    )";
    
    if ($conn->query($sql) === TRUE) {
        return true;
    } else {
        error_log("Error creating maintenance_records table: " . $conn->error);
        return false;
    }
}

// Connect to the database
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($conn->connect_error) {
    echo json_encode(['status' => 'error', 'message' => 'DB connection failed: ' . $conn->connect_error]);
    exit;
}

// Create tables if they don't exist
$result = createMaintenanceRecordsTable($conn);

// Add some sample data if table was just created
if ($result) {
    // Check if table is empty
    $checkResult = $conn->query("SELECT COUNT(*) as count FROM maintenance_records");
    $row = $checkResult->fetch_assoc();
    
    if ($row['count'] == 0) {
        // Get vehicle IDs to use as foreign keys
        $vehiclesResult = $conn->query("SELECT id FROM fleet_vehicles LIMIT 5");
        $vehicleIds = [];
        
        while ($vehicleRow = $vehiclesResult->fetch_assoc()) {
            $vehicleIds[] = $vehicleRow['id'];
        }
        
        // Only add sample data if we have vehicles
        if (count($vehicleIds) > 0) {
            $sampleData = [
                [
                    'vehicleId' => $vehicleIds[0],
                    'date' => '2025-04-15',
                    'serviceType' => 'Oil Change',
                    'description' => 'Regular oil change and filter replacement',
                    'cost' => 3500,
                    'vendor' => 'AutoService Center',
                    'nextServiceDate' => '2025-07-15'
                ],
                [
                    'vehicleId' => isset($vehicleIds[1]) ? $vehicleIds[1] : $vehicleIds[0],
                    'date' => '2025-04-10',
                    'serviceType' => 'Tire Replacement',
                    'description' => 'Replaced all four tires',
                    'cost' => 24000,
                    'vendor' => 'Tire World',
                    'nextServiceDate' => '2026-04-10'
                ],
                [
                    'vehicleId' => isset($vehicleIds[2]) ? $vehicleIds[2] : $vehicleIds[0],
                    'date' => '2025-04-20',
                    'serviceType' => 'Major Service',
                    'description' => 'Full maintenance service including brakes and suspension check',
                    'cost' => 12500,
                    'vendor' => 'Hyundai Service Center',
                    'nextServiceDate' => '2025-10-20'
                ]
            ];
            
            $stmt = $conn->prepare("INSERT INTO maintenance_records 
                (vehicleId, date, serviceType, description, cost, vendor, nextServiceDate) 
                VALUES (?, ?, ?, ?, ?, ?, ?)");
                
            foreach ($sampleData as $record) {
                $stmt->bind_param(
                    "ssssdss",
                    $record['vehicleId'],
                    $record['date'],
                    $record['serviceType'],
                    $record['description'],
                    $record['cost'],
                    $record['vendor'],
                    $record['nextServiceDate']
                );
                $stmt->execute();
            }
        }
    }
    
    echo json_encode(['status' => 'success', 'message' => 'Maintenance records table is ready']);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Failed to create maintenance records table']);
}

$conn->close();
