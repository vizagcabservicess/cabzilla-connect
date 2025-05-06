
<?php
/**
 * Fuel Records API Endpoint
 * Manages fuel records for the fleet.
 */

// Enable error reporting for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Set headers for CORS and JSON response
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include database utilities and setup
require_once __DIR__ . '/../common/db_helper.php';
require_once __DIR__ . '/../utils/response.php';

// Create fuel_records table if it doesn't exist
function ensureFuelRecordsTableExists($conn) {
    $sql = "CREATE TABLE IF NOT EXISTS `fuel_records` (
        `id` INT(11) NOT NULL AUTO_INCREMENT,
        `vehicle_id` VARCHAR(50) NOT NULL,
        `fill_date` DATE NOT NULL,
        `quantity` DECIMAL(10,2) NOT NULL,
        `price_per_unit` DECIMAL(10,2) NOT NULL,
        `total_cost` DECIMAL(10,2) NOT NULL,
        `odometer` INT(11) NOT NULL,
        `fuel_station` VARCHAR(100),
        `fuel_type` ENUM('Petrol', 'Diesel', 'CNG', 'Electric') NOT NULL DEFAULT 'Petrol',
        `mileage` DECIMAL(10,2) NULL,
        `payment_method` ENUM('Cash', 'Card', 'Company', 'Customer') NOT NULL DEFAULT 'Cash',
        `bank_name` VARCHAR(100),
        `last_four_digits` VARCHAR(4),
        `notes` TEXT,
        `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `vehicle_id` (`vehicle_id`),
        KEY `fill_date` (`fill_date`),
        KEY `fuel_type` (`fuel_type`),
        KEY `payment_method` (`payment_method`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    
    $conn->query($sql);
}

// Handle GET request - Fetch fuel records
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $conn = getDbConnectionWithRetry();
        ensureFuelRecordsTableExists($conn);
        
        // Build query with filters
        $sql = "SELECT fr.*, 
                v.vehicle_number as vehicle_number,
                v.name as vehicle_name,
                v.model as vehicle_model
                FROM fuel_records fr
                LEFT JOIN fleet_vehicles v ON fr.vehicle_id = v.id";
        
        $where = [];
        $params = [];
        $types = "";
        
        // Apply vehicle filter
        if (isset($_GET['vehicle_id']) && $_GET['vehicle_id']) {
            $where[] = "fr.vehicle_id = ?";
            $params[] = $_GET['vehicle_id'];
            $types .= "s";
        }
        
        // Apply fuel type filter
        if (isset($_GET['fuel_type']) && $_GET['fuel_type']) {
            $where[] = "fr.fuel_type = ?";
            $params[] = $_GET['fuel_type'];
            $types .= "s";
        }
        
        // Apply payment method filter
        if (isset($_GET['payment_method']) && $_GET['payment_method']) {
            $where[] = "fr.payment_method = ?";
            $params[] = $_GET['payment_method'];
            $types .= "s";
        }
        
        // Apply date range filter
        if (isset($_GET['start_date']) && $_GET['start_date']) {
            $where[] = "fr.fill_date >= ?";
            $params[] = $_GET['start_date'];
            $types .= "s";
        }
        
        if (isset($_GET['end_date']) && $_GET['end_date']) {
            $where[] = "fr.fill_date <= ?";
            $params[] = $_GET['end_date'];
            $types .= "s";
        }
        
        // Add WHERE clause if filters exist
        if (count($where) > 0) {
            $sql .= " WHERE " . implode(" AND ", $where);
        }
        
        // Add ORDER BY
        $sql .= " ORDER BY fr.fill_date DESC, fr.id DESC";
        
        // Add LIMIT if specified
        if (isset($_GET['limit']) && is_numeric($_GET['limit'])) {
            $sql .= " LIMIT " . intval($_GET['limit']);
        }
        
        // Execute query
        $fuelRecords = [];
        if (count($params) > 0) {
            // Prepared statement for filtered query
            $stmt = $conn->prepare($sql);
            $stmt->bind_param($types, ...$params);
            $stmt->execute();
            $result = $stmt->get_result();
            
            while ($row = $result->fetch_assoc()) {
                $fuelRecords[] = formatFuelRecord($row);
            }
        } else {
            // Direct query when no filters
            $result = $conn->query($sql);
            
            while ($row = $result->fetch_assoc()) {
                $fuelRecords[] = formatFuelRecord($row);
            }
        }
        
        sendSuccessResponse(['fuelRecords' => $fuelRecords], 'Fuel records fetched successfully');
    } catch (Exception $e) {
        sendErrorResponse('Failed to fetch fuel records: ' . $e->getMessage());
    }
}

// Handle POST request - Create fuel record
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        // Get request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate request data
        if (!isset($data['vehicleId']) || !isset($data['fillDate']) || 
            !isset($data['quantity']) || !isset($data['pricePerUnit']) || 
            !isset($data['totalCost']) || !isset($data['odometer'])) {
            sendErrorResponse('Missing required fields', [], 400);
            exit;
        }
        
        // Connect to database
        $conn = getDbConnectionWithRetry();
        ensureFuelRecordsTableExists($conn);
        
        // Prepare data
        $vehicleId = $data['vehicleId'];
        $fillDate = date('Y-m-d', strtotime($data['fillDate']));
        $quantity = floatval($data['quantity']);
        $pricePerUnit = floatval($data['pricePerUnit']);
        $totalCost = floatval($data['totalCost']);
        $odometer = intval($data['odometer']);
        $fuelStation = isset($data['fuelStation']) ? $data['fuelStation'] : null;
        $fuelType = isset($data['fuelType']) ? $data['fuelType'] : 'Petrol';
        $mileage = isset($data['mileage']) ? floatval($data['mileage']) : null;
        $paymentMethod = isset($data['paymentMethod']) ? $data['paymentMethod'] : 'Cash';
        $bankName = null;
        $lastFourDigits = null;
        $notes = isset($data['notes']) ? $data['notes'] : null;
        
        // Set bank details if payment method is Card
        if ($paymentMethod === 'Card' && isset($data['paymentDetails'])) {
            $bankName = isset($data['paymentDetails']['bankName']) ? $data['paymentDetails']['bankName'] : null;
            $lastFourDigits = isset($data['paymentDetails']['lastFourDigits']) ? $data['paymentDetails']['lastFourDigits'] : null;
        }
        
        // Insert new fuel record
        $stmt = $conn->prepare("INSERT INTO fuel_records (
            vehicle_id, fill_date, quantity, price_per_unit, total_cost, 
            odometer, fuel_station, fuel_type, mileage, payment_method, 
            bank_name, last_four_digits, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        $stmt->bind_param(
            "ssdddissdssss",
            $vehicleId, $fillDate, $quantity, $pricePerUnit, $totalCost,
            $odometer, $fuelStation, $fuelType, $mileage, $paymentMethod,
            $bankName, $lastFourDigits, $notes
        );
        
        $stmt->execute();
        $id = $stmt->insert_id;
        
        // Get the created record
        $stmt = $conn->prepare("SELECT fr.*, 
                v.vehicle_number as vehicle_number,
                v.name as vehicle_name,
                v.model as vehicle_model
                FROM fuel_records fr
                LEFT JOIN fleet_vehicles v ON fr.vehicle_id = v.id
                WHERE fr.id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        
        sendSuccessResponse(['fuelRecord' => formatFuelRecord($row)], 'Fuel record created successfully');
    } catch (Exception $e) {
        sendErrorResponse('Failed to create fuel record: ' . $e->getMessage());
    }
}

// Handle PUT request - Update fuel record
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    try {
        // Get request body and ID from URL
        $data = json_decode(file_get_contents('php://input'), true);
        $recordId = isset($_GET['id']) ? intval($_GET['id']) : null;
        
        if (!$recordId) {
            sendErrorResponse('Record ID is required', [], 400);
            exit;
        }
        
        // Connect to database
        $conn = getDbConnectionWithRetry();
        ensureFuelRecordsTableExists($conn);
        
        // Check if record exists
        $stmt = $conn->prepare("SELECT * FROM fuel_records WHERE id = ?");
        $stmt->bind_param("i", $recordId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            sendErrorResponse('Fuel record not found', [], 404);
            exit;
        }
        
        // Prepare update fields
        $updateFields = [];
        $params = [];
        $types = "";
        
        // Build dynamic update query based on provided fields
        if (isset($data['vehicleId'])) {
            $updateFields[] = "vehicle_id = ?";
            $params[] = $data['vehicleId'];
            $types .= "s";
        }
        
        if (isset($data['fillDate'])) {
            $updateFields[] = "fill_date = ?";
            $params[] = date('Y-m-d', strtotime($data['fillDate']));
            $types .= "s";
        }
        
        if (isset($data['quantity'])) {
            $updateFields[] = "quantity = ?";
            $params[] = floatval($data['quantity']);
            $types .= "d";
        }
        
        if (isset($data['pricePerUnit'])) {
            $updateFields[] = "price_per_unit = ?";
            $params[] = floatval($data['pricePerUnit']);
            $types .= "d";
        }
        
        if (isset($data['totalCost'])) {
            $updateFields[] = "total_cost = ?";
            $params[] = floatval($data['totalCost']);
            $types .= "d";
        }
        
        if (isset($data['odometer'])) {
            $updateFields[] = "odometer = ?";
            $params[] = intval($data['odometer']);
            $types .= "i";
        }
        
        if (isset($data['fuelStation'])) {
            $updateFields[] = "fuel_station = ?";
            $params[] = $data['fuelStation'];
            $types .= "s";
        }
        
        if (isset($data['fuelType'])) {
            $updateFields[] = "fuel_type = ?";
            $params[] = $data['fuelType'];
            $types .= "s";
        }
        
        if (isset($data['mileage'])) {
            $updateFields[] = "mileage = ?";
            $params[] = floatval($data['mileage']);
            $types .= "d";
        }
        
        if (isset($data['paymentMethod'])) {
            $updateFields[] = "payment_method = ?";
            $params[] = $data['paymentMethod'];
            $types .= "s";
            
            // Reset bank details if payment method changes from Card
            if ($data['paymentMethod'] !== 'Card') {
                $updateFields[] = "bank_name = NULL";
                $updateFields[] = "last_four_digits = NULL";
            }
        }
        
        // Update bank details if payment method is Card
        if (isset($data['paymentDetails']) && (!isset($data['paymentMethod']) || $data['paymentMethod'] === 'Card')) {
            if (isset($data['paymentDetails']['bankName'])) {
                $updateFields[] = "bank_name = ?";
                $params[] = $data['paymentDetails']['bankName'];
                $types .= "s";
            }
            
            if (isset($data['paymentDetails']['lastFourDigits'])) {
                $updateFields[] = "last_four_digits = ?";
                $params[] = $data['paymentDetails']['lastFourDigits'];
                $types .= "s";
            }
        }
        
        if (isset($data['notes'])) {
            $updateFields[] = "notes = ?";
            $params[] = $data['notes'];
            $types .= "s";
        }
        
        // If no fields to update, return success
        if (count($updateFields) === 0) {
            sendSuccessResponse([], 'No fields to update');
            exit;
        }
        
        // Add record ID to parameters
        $params[] = $recordId;
        $types .= "i";
        
        // Execute update
        $sql = "UPDATE fuel_records SET " . implode(", ", $updateFields) . " WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        
        // Get the updated record
        $stmt = $conn->prepare("SELECT fr.*, 
                v.vehicle_number as vehicle_number,
                v.name as vehicle_name,
                v.model as vehicle_model
                FROM fuel_records fr
                LEFT JOIN fleet_vehicles v ON fr.vehicle_id = v.id
                WHERE fr.id = ?");
        $stmt->bind_param("i", $recordId);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        
        sendSuccessResponse(['fuelRecord' => formatFuelRecord($row)], 'Fuel record updated successfully');
    } catch (Exception $e) {
        sendErrorResponse('Failed to update fuel record: ' . $e->getMessage());
    }
}

// Handle DELETE request - Delete fuel record
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    try {
        $recordId = isset($_GET['id']) ? intval($_GET['id']) : null;
        
        if (!$recordId) {
            sendErrorResponse('Record ID is required', [], 400);
            exit;
        }
        
        // Connect to database
        $conn = getDbConnectionWithRetry();
        ensureFuelRecordsTableExists($conn);
        
        // Delete record
        $stmt = $conn->prepare("DELETE FROM fuel_records WHERE id = ?");
        $stmt->bind_param("i", $recordId);
        $stmt->execute();
        
        if ($stmt->affected_rows === 0) {
            sendErrorResponse('Fuel record not found', [], 404);
            exit;
        }
        
        sendSuccessResponse([], 'Fuel record deleted successfully');
    } catch (Exception $e) {
        sendErrorResponse('Failed to delete fuel record: ' . $e->getMessage());
    }
}

// Helper function to format a fuel record
function formatFuelRecord($row) {
    $paymentDetails = null;
    
    if ($row['payment_method'] === 'Card' && ($row['bank_name'] || $row['last_four_digits'])) {
        $paymentDetails = [
            'bankName' => $row['bank_name'],
            'lastFourDigits' => $row['last_four_digits']
        ];
    }
    
    return [
        'id' => $row['id'],
        'vehicleId' => $row['vehicle_id'],
        'fillDate' => $row['fill_date'],
        'quantity' => (float)$row['quantity'],
        'pricePerUnit' => (float)$row['price_per_unit'],
        'totalCost' => (float)$row['total_cost'],
        'odometer' => (int)$row['odometer'],
        'fuelStation' => $row['fuel_station'],
        'fuelType' => $row['fuel_type'],
        'mileage' => $row['mileage'] ? (float)$row['mileage'] : null,
        'paymentMethod' => $row['payment_method'],
        'paymentDetails' => $paymentDetails,
        'notes' => $row['notes'],
        'createdAt' => $row['created_at'],
        'updatedAt' => $row['updated_at'],
        'vehicleName' => $row['vehicle_name'] ?? null,
        'vehicleNumber' => $row['vehicle_number'] ?? null,
        'vehicleModel' => $row['vehicle_model'] ?? null
    ];
}
?>
