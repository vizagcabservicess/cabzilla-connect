<?php
// Database setup script to ensure the invoices table exists
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Database credentials
$host = 'localhost';
$dbname = 'u644605165_db_be';
$username = 'u644605165_usr_be';
$password = 'Vizag@1213';

try {
    // Connect to database
    $conn = new mysqli($host, $username, $password, $dbname);
    
    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }
    
    // Set character set
    $conn->set_charset("utf8mb4");
    
    // Create invoices table if it doesn't exist
    $createTableSQL = "
        CREATE TABLE IF NOT EXISTS invoices (
            id INT AUTO_INCREMENT PRIMARY KEY,
            booking_id INT NOT NULL,
            invoice_number VARCHAR(50) NOT NULL UNIQUE,
            invoice_date DATE NOT NULL,
            base_amount DECIMAL(10,2) DEFAULT 0.00,
            tax_amount DECIMAL(10,2) DEFAULT 0.00,
            total_amount DECIMAL(10,2) NOT NULL,
            gst_enabled TINYINT(1) DEFAULT 0,
            is_igst TINYINT(1) DEFAULT 0,
            include_tax TINYINT(1) DEFAULT 1,
            gst_number VARCHAR(20) NULL,
            company_name VARCHAR(255) NULL,
            company_address TEXT NULL,
            invoice_html LONGTEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_booking_id (booking_id),
            INDEX idx_invoice_number (invoice_number),
            INDEX idx_invoice_date (invoice_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ";
    
    if ($conn->query($createTableSQL) === TRUE) {
        $message = "Invoices table created successfully or already exists";
        
        // Check if the table has data
        $result = $conn->query("SELECT COUNT(*) as count FROM invoices");
        $row = $result->fetch_assoc();
        $recordCount = $row['count'];
        
        echo json_encode([
            'status' => 'success',
            'message' => $message,
            'records_count' => $recordCount,
            'table_status' => 'ready'
        ]);
    } else {
        throw new Exception("Error creating table: " . $conn->error);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>