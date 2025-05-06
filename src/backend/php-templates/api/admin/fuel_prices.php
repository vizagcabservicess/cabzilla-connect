
<?php
/**
 * Fuel Prices API Endpoint
 * Manages fuel prices for various fuel types.
 */

// Enable error reporting for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Set headers for CORS and JSON response
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
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

// Create fuel_prices table if it doesn't exist
function ensureFuelPricesTableExists($conn) {
    $sql = "CREATE TABLE IF NOT EXISTS `fuel_prices` (
        `id` INT(11) NOT NULL AUTO_INCREMENT,
        `fuel_type` ENUM('Petrol', 'Diesel', 'CNG') NOT NULL,
        `price` DECIMAL(10,2) NOT NULL,
        `effective_date` DATE NOT NULL,
        `location` VARCHAR(100) DEFAULT 'Visakhapatnam',
        `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        UNIQUE KEY `fuel_type_location` (`fuel_type`, `location`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    
    $conn->query($sql);
    
    // Insert default values if table is empty
    $checkData = $conn->query("SELECT COUNT(*) as count FROM fuel_prices");
    $row = $checkData->fetch_assoc();
    
    if ($row['count'] == 0) {
        $today = date('Y-m-d');
        $conn->query("INSERT INTO fuel_prices (fuel_type, price, effective_date) VALUES ('Petrol', 102.50, '$today')");
        $conn->query("INSERT INTO fuel_prices (fuel_type, price, effective_date) VALUES ('Diesel', 88.75, '$today')");
        $conn->query("INSERT INTO fuel_prices (fuel_type, price, effective_date) VALUES ('CNG', 65.30, '$today')");
    }
}

// Handle GET request - Fetch fuel prices
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $conn = getDbConnectionWithRetry();
        ensureFuelPricesTableExists($conn);
        
        // Fetch all fuel prices
        $sql = "SELECT * FROM fuel_prices ORDER BY fuel_type";
        $result = $conn->query($sql);
        
        $fuelPrices = [];
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $fuelPrices[] = [
                    'id' => $row['id'],
                    'fuelType' => $row['fuel_type'],
                    'price' => (float)$row['price'],
                    'effectiveDate' => $row['effective_date'],
                    'location' => $row['location'],
                    'createdAt' => $row['created_at'],
                    'updatedAt' => $row['updated_at']
                ];
            }
        }
        
        sendSuccessResponse(['fuelPrices' => $fuelPrices], 'Fuel prices fetched successfully');
    } catch (Exception $e) {
        sendErrorResponse('Failed to fetch fuel prices: ' . $e->getMessage());
    }
}

// Handle POST request - Update fuel price
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        // Get request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate request data
        if (!isset($data['fuelType']) || !isset($data['price'])) {
            sendErrorResponse('Missing required fields: fuelType, price', [], 400);
            exit;
        }
        
        $fuelType = $data['fuelType'];
        $price = floatval($data['price']);
        $location = isset($data['location']) ? $data['location'] : 'Visakhapatnam';
        $effectiveDate = isset($data['effectiveDate']) ? $data['effectiveDate'] : date('Y-m-d');
        
        if ($price <= 0) {
            sendErrorResponse('Price must be greater than 0', [], 400);
            exit;
        }
        
        // Connect to database
        $conn = getDbConnectionWithRetry();
        ensureFuelPricesTableExists($conn);
        
        // Check if fuel type exists
        $stmt = $conn->prepare("SELECT id FROM fuel_prices WHERE fuel_type = ? AND location = ?");
        $stmt->bind_param("ss", $fuelType, $location);
        $stmt->execute();
        $result = $stmt->get_result();
        $exists = $result->num_rows > 0;
        
        if ($exists) {
            // Update existing fuel price
            $stmt = $conn->prepare("UPDATE fuel_prices SET price = ?, effective_date = ? WHERE fuel_type = ? AND location = ?");
            $stmt->bind_param("dsss", $price, $effectiveDate, $fuelType, $location);
            $stmt->execute();
            
            // Get the updated record
            $stmt = $conn->prepare("SELECT * FROM fuel_prices WHERE fuel_type = ? AND location = ?");
            $stmt->bind_param("ss", $fuelType, $location);
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            
            $updatedPrice = [
                'id' => $row['id'],
                'fuelType' => $row['fuel_type'],
                'price' => (float)$row['price'],
                'effectiveDate' => $row['effective_date'],
                'location' => $row['location'],
                'createdAt' => $row['created_at'],
                'updatedAt' => $row['updated_at']
            ];
            
            sendSuccessResponse(['fuelPrice' => $updatedPrice], 'Fuel price updated successfully');
        } else {
            // Insert new fuel price
            $stmt = $conn->prepare("INSERT INTO fuel_prices (fuel_type, price, effective_date, location) VALUES (?, ?, ?, ?)");
            $stmt->bind_param("sdss", $fuelType, $price, $effectiveDate, $location);
            $stmt->execute();
            $id = $stmt->insert_id;
            
            // Get the new record
            $stmt = $conn->prepare("SELECT * FROM fuel_prices WHERE id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            
            $newPrice = [
                'id' => $row['id'],
                'fuelType' => $row['fuel_type'],
                'price' => (float)$row['price'],
                'effectiveDate' => $row['effective_date'],
                'location' => $row['location'],
                'createdAt' => $row['created_at'],
                'updatedAt' => $row['updated_at']
            ];
            
            sendSuccessResponse(['fuelPrice' => $newPrice], 'Fuel price added successfully');
        }
    } catch (Exception $e) {
        sendErrorResponse('Failed to update fuel price: ' . $e->getMessage());
    }
}
?>
