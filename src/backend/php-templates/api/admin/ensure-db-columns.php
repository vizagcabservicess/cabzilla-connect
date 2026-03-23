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
    
    // Ensure bookings table has additional_requirements column
    $checkAdditionalRequirements = $conn->query("SHOW COLUMNS FROM bookings LIKE 'additional_requirements'");
    if (!$checkAdditionalRequirements || $checkAdditionalRequirements->num_rows === 0) {
        $conn->query("ALTER TABLE bookings ADD COLUMN additional_requirements TEXT NULL AFTER passenger_email");
        $changes[] = "Added additional_requirements column to bookings table";
    }
    
    // Ensure bookings table has passenger_country_code column
    $checkPassengerCountryCode = $conn->query("SHOW COLUMNS FROM bookings LIKE 'passenger_country_code'");
    if (!$checkPassengerCountryCode || $checkPassengerCountryCode->num_rows === 0) {
        $conn->query("ALTER TABLE bookings ADD COLUMN passenger_country_code VARCHAR(10) NULL AFTER passenger_phone");
        $changes[] = "Added passenger_country_code column to bookings table";
    }
    
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
    
    // Add extra_charges column to invoices - store base fare and extra charges separately
    $checkExtraCharges = $conn->query("SHOW COLUMNS FROM invoices LIKE 'extra_charges'");
    if (!$checkExtraCharges || $checkExtraCharges->num_rows === 0) {
        $conn->query("ALTER TABLE invoices ADD COLUMN extra_charges DECIMAL(10,2) DEFAULT 0 AFTER base_amount");
        $changes[] = "Added extra_charges column to invoices table";
    }
    
    // Add gst_rate column to invoices - store the actual GST % used (5, 12, or 18)
    $checkGstRate = $conn->query("SHOW COLUMNS FROM invoices LIKE 'gst_rate'");
    if (!$checkGstRate || $checkGstRate->num_rows === 0) {
        $conn->query("ALTER TABLE invoices ADD COLUMN gst_rate DECIMAL(5,2) DEFAULT NULL AFTER gst_amount");
        $changes[] = "Added gst_rate column to invoices table";
    }

    // Add google_id to users table for Google OAuth sign-in
    $checkGoogleId = $conn->query("SHOW COLUMNS FROM users LIKE 'google_id'");
    if (!$checkGoogleId || $checkGoogleId->num_rows === 0) {
        $conn->query("ALTER TABLE users ADD COLUMN google_id VARCHAR(255) NULL UNIQUE AFTER password");
        $changes[] = "Added google_id column to users table";
    }

    // Add auth_provider for distinguishing Google vs email users
    $checkAuthProvider = $conn->query("SHOW COLUMNS FROM users LIKE 'auth_provider'");
    if (!$checkAuthProvider || $checkAuthProvider->num_rows === 0) {
        $conn->query("ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20) NULL DEFAULT 'email'");
        $changes[] = "Added auth_provider column to users table";
    }

    // Add profile_picture for Google profile photos
    $checkProfilePic = $conn->query("SHOW COLUMNS FROM users LIKE 'profile_picture'");
    if (!$checkProfilePic || $checkProfilePic->num_rows === 0) {
        $conn->query("ALTER TABLE users ADD COLUMN profile_picture VARCHAR(512) NULL");
        $changes[] = "Added profile_picture column to users table";
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