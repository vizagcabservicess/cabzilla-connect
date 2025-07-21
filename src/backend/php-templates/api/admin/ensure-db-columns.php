<?php
// Ensure all required columns exist in the database
require_once __DIR__ . '/../../config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

try {
    $dbHost = 'localhost';
    $dbName = 'u644605165_db_be';
    $dbUser = 'u644605165_usr_be';
    $dbPass = 'Vizag@1213';
    
    $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
    if ($conn->connect_error) {
        throw new Exception('Database connection failed: ' . $conn->connect_error);
    }
    $conn->set_charset('utf8mb4');

    $changes = [];
    
    // Ensure invoices table exists with all required columns
    $conn->query("
        CREATE TABLE IF NOT EXISTS invoices (
            id INT AUTO_INCREMENT PRIMARY KEY,
            booking_id INT NOT NULL,
            invoice_number VARCHAR(50) NOT NULL,
            invoice_date DATE NOT NULL,
            base_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
            tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
            total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
            gst_enabled TINYINT(1) DEFAULT 0,
            is_igst TINYINT(1) DEFAULT 0,
            include_tax TINYINT(1) DEFAULT 1,
            gst_number VARCHAR(20) DEFAULT '',
            company_name VARCHAR(100) DEFAULT '',
            company_address TEXT DEFAULT '',
            gst_amount DECIMAL(10,2) DEFAULT 0,
            invoice_html MEDIUMTEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_invoice_number (invoice_number),
            KEY booking_id_index (booking_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
    $changes[] = "Ensured invoices table exists with all columns";
    
    // Ensure bookings table has GST columns
    $gstColumns = [
        'gst_enabled' => "TINYINT(1) DEFAULT 0",
        'gst_number' => "VARCHAR(20) DEFAULT ''",
        'company_name' => "VARCHAR(100) DEFAULT ''",
        'company_address' => "TEXT DEFAULT ''"
    ];
    
    foreach ($gstColumns as $column => $definition) {
        $checkColumn = $conn->query("SHOW COLUMNS FROM bookings LIKE '$column'");
        if (!$checkColumn || $checkColumn->num_rows === 0) {
            $conn->query("ALTER TABLE bookings ADD COLUMN $column $definition");
            $changes[] = "Added $column column to bookings table";
        }
    }
    
    // Check if gst_amount column exists in invoices table
    $checkGstAmount = $conn->query("SHOW COLUMNS FROM invoices LIKE 'gst_amount'");
    if (!$checkGstAmount || $checkGstAmount->num_rows === 0) {
        $conn->query("ALTER TABLE invoices ADD COLUMN gst_amount DECIMAL(10,2) DEFAULT 0 AFTER company_address");
        $changes[] = "Added gst_amount column to invoices table";
    }
    
    sendJsonResponse([
        'status' => 'success',
        'message' => 'Database schema updated successfully',
        'changes' => $changes
    ]);
    
} catch (Exception $e) {
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Database setup failed: ' . $e->getMessage()
    ], 500);
}
?>