
<?php
/**
 * Database setup script to ensure all required tables exist
 * This script is included by various API endpoints to ensure database consistency
 */

// Include database utilities
if (!function_exists('getDbConnection')) {
    require_once __DIR__ . '/../../config.php';
    require_once __DIR__ . '/../common/db_helper.php';
}

// Create log directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

// Set up logging
$setupLogFile = $logDir . '/db_setup_' . date('Y-m-d') . '.log';
$setupTimestamp = date('Y-m-d H:i:s');

// Log setup message
file_put_contents($setupLogFile, "[$setupTimestamp] Running database setup\n", FILE_APPEND);

try {
    // Connect to database
    $conn = getDbConnectionWithRetry();
    
    if (!$conn) {
        throw new Exception("Database connection failed during setup");
    }

    // Verify and set up the non_gst_bills table
    $checkNonGstTable = $conn->query("SHOW TABLES LIKE 'non_gst_bills'");
    
    if (!$checkNonGstTable || $checkNonGstTable->num_rows === 0) {
        // Create non_gst_bills table
        $createNonGstSQL = "
            CREATE TABLE IF NOT EXISTS non_gst_bills (
                id INT(11) NOT NULL AUTO_INCREMENT,
                bill_number VARCHAR(50) NOT NULL,
                bill_date DATE NOT NULL,
                customer_name VARCHAR(100) NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                description TEXT,
                payment_status ENUM('paid', 'pending', 'partial') DEFAULT 'pending',
                payment_method VARCHAR(50),
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY bill_number (bill_number)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        if (!$conn->query($createNonGstSQL)) {
            throw new Exception("Failed to create non_gst_bills table: " . $conn->error);
        }
        
        file_put_contents($setupLogFile, "[$setupTimestamp] Created non_gst_bills table\n", FILE_APPEND);
    }
    
    // Verify and set up the vehicle_maintenance table
    $checkMaintenanceTable = $conn->query("SHOW TABLES LIKE 'vehicle_maintenance'");
    
    if (!$checkMaintenanceTable || $checkMaintenanceTable->num_rows === 0) {
        // Create vehicle_maintenance table
        $createMaintenanceSQL = "
            CREATE TABLE IF NOT EXISTS vehicle_maintenance (
                id INT(11) NOT NULL AUTO_INCREMENT,
                vehicle_id VARCHAR(50) NOT NULL,
                maintenance_date DATE NOT NULL,
                service_type VARCHAR(100) NOT NULL,
                description TEXT,
                cost DECIMAL(10,2) NOT NULL,
                vendor VARCHAR(100),
                next_service_date DATE,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        if (!$conn->query($createMaintenanceSQL)) {
            throw new Exception("Failed to create vehicle_maintenance table: " . $conn->error);
        }
        
        file_put_contents($setupLogFile, "[$setupTimestamp] Created vehicle_maintenance table\n", FILE_APPEND);
    }
    
    // Verify and set up the financial_ledger table
    $checkLedgerTable = $conn->query("SHOW TABLES LIKE 'financial_ledger'");
    
    if (!$checkLedgerTable || $checkLedgerTable->num_rows === 0) {
        // Create financial_ledger table
        $createLedgerSQL = "
            CREATE TABLE IF NOT EXISTS financial_ledger (
                id INT(11) NOT NULL AUTO_INCREMENT,
                transaction_date DATE NOT NULL,
                description TEXT NOT NULL,
                type ENUM('income', 'expense') NOT NULL,
                amount DECIMAL(12,2) NOT NULL,
                category VARCHAR(50) NOT NULL,
                payment_method VARCHAR(50),
                reference VARCHAR(100),
                balance DECIMAL(12,2) NOT NULL,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        if (!$conn->query($createLedgerSQL)) {
            throw new Exception("Failed to create financial_ledger table: " . $conn->error);
        }
        
        file_put_contents($setupLogFile, "[$setupTimestamp] Created financial_ledger table\n", FILE_APPEND);
    }
    
    // Verify and set up the fuel_records table
    $checkFuelTable = $conn->query("SHOW TABLES LIKE 'fuel_records'");
    
    if (!$checkFuelTable || $checkFuelTable->num_rows === 0) {
        // Create fuel_records table
        $createFuelSQL = "
            CREATE TABLE IF NOT EXISTS fuel_records (
                id INT(11) NOT NULL AUTO_INCREMENT,
                vehicle_id VARCHAR(50) NOT NULL,
                fill_date DATE NOT NULL,
                quantity_liters DECIMAL(8,2) NOT NULL,
                price_per_liter DECIMAL(6,2) NOT NULL,
                total_cost DECIMAL(10,2) NOT NULL,
                odometer_reading INT(11),
                station VARCHAR(100),
                payment_method VARCHAR(50),
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        if (!$conn->query($createFuelSQL)) {
            throw new Exception("Failed to create fuel_records table: " . $conn->error);
        }
        
        file_put_contents($setupLogFile, "[$setupTimestamp] Created fuel_records table\n", FILE_APPEND);
    }
    
    // Verify and set up the drivers table if needed
    $checkDriversTable = $conn->query("SHOW TABLES LIKE 'drivers'");
    
    if (!$checkDriversTable || $checkDriversTable->num_rows === 0) {
        // Create drivers table
        $createDriversSQL = "
            CREATE TABLE IF NOT EXISTS drivers (
                id INT(11) NOT NULL AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                email VARCHAR(100),
                license_no VARCHAR(50),
                vehicle_id VARCHAR(50),
                status ENUM('available', 'busy', 'offline') DEFAULT 'available',
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        if (!$conn->query($createDriversSQL)) {
            throw new Exception("Failed to create drivers table: " . $conn->error);
        }
        
        file_put_contents($setupLogFile, "[$setupTimestamp] Created drivers table\n", FILE_APPEND);
    }

    // Create driver_ratings table if needed
    $checkRatingsTable = $conn->query("SHOW TABLES LIKE 'driver_ratings'");
    
    if (!$checkRatingsTable || $checkRatingsTable->num_rows === 0) {
        // Create driver_ratings table
        $createRatingsSQL = "
            CREATE TABLE IF NOT EXISTS driver_ratings (
                id INT(11) NOT NULL AUTO_INCREMENT,
                driver_id INT(11) NOT NULL,
                booking_id INT(11),
                rating DECIMAL(3,1) NOT NULL,
                comment TEXT,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY driver_id (driver_id),
                KEY booking_id (booking_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        if (!$conn->query($createRatingsSQL)) {
            throw new Exception("Failed to create driver_ratings table: " . $conn->error);
        }
        
        file_put_contents($setupLogFile, "[$setupTimestamp] Created driver_ratings table\n", FILE_APPEND);
    }
    
    // Verify and update the bookings table to ensure it has all required columns
    $checkBookingsTable = $conn->query("SHOW TABLES LIKE 'bookings'");
    
    if ($checkBookingsTable && $checkBookingsTable->num_rows > 0) {
        // Check for and add payment_method column if it doesn't exist
        $checkPaymentMethod = $conn->query("SHOW COLUMNS FROM bookings LIKE 'payment_method'");
        if (!$checkPaymentMethod || $checkPaymentMethod->num_rows === 0) {
            $addColumnSQL = "ALTER TABLE bookings ADD COLUMN payment_method VARCHAR(50) AFTER payment_status";
            $conn->query($addColumnSQL);
            file_put_contents($setupLogFile, "[$setupTimestamp] Added payment_method column to bookings table\n", FILE_APPEND);
        }
        
        // Check for and add gst_enabled column if it doesn't exist
        $checkGstEnabled = $conn->query("SHOW COLUMNS FROM bookings LIKE 'gst_enabled'");
        if (!$checkGstEnabled || $checkGstEnabled->num_rows === 0) {
            $addColumnSQL = "ALTER TABLE bookings ADD COLUMN gst_enabled TINYINT(1) DEFAULT 0 AFTER payment_method";
            $conn->query($addColumnSQL);
            file_put_contents($setupLogFile, "[$setupTimestamp] Added gst_enabled column to bookings table\n", FILE_APPEND);
        }
        
        // Check for and add gst_number column if it doesn't exist
        $checkGstNumber = $conn->query("SHOW COLUMNS FROM bookings LIKE 'gst_number'");
        if (!$checkGstNumber || $checkGstNumber->num_rows === 0) {
            $addColumnSQL = "ALTER TABLE bookings ADD COLUMN gst_number VARCHAR(20) AFTER gst_enabled";
            $conn->query($addColumnSQL);
            file_put_contents($setupLogFile, "[$setupTimestamp] Added gst_number column to bookings table\n", FILE_APPEND);
        }
        
        // Check for and add company_name column if it doesn't exist
        $checkCompanyName = $conn->query("SHOW COLUMNS FROM bookings LIKE 'company_name'");
        if (!$checkCompanyName || $checkCompanyName->num_rows === 0) {
            $addColumnSQL = "ALTER TABLE bookings ADD COLUMN company_name VARCHAR(100) AFTER gst_number";
            $conn->query($addColumnSQL);
            file_put_contents($setupLogFile, "[$setupTimestamp] Added company_name column to bookings table\n", FILE_APPEND);
        }
        
        // Check for and add company_address column if it doesn't exist
        $checkCompanyAddress = $conn->query("SHOW COLUMNS FROM bookings LIKE 'company_address'");
        if (!$checkCompanyAddress || $checkCompanyAddress->num_rows === 0) {
            $addColumnSQL = "ALTER TABLE bookings ADD COLUMN company_address TEXT AFTER company_name";
            $conn->query($addColumnSQL);
            file_put_contents($setupLogFile, "[$setupTimestamp] Added company_address column to bookings table\n", FILE_APPEND);
        }
        
        // Check for and add driver_id column if it doesn't exist
        $checkDriverId = $conn->query("SHOW COLUMNS FROM bookings LIKE 'driver_id'");
        if (!$checkDriverId || $checkDriverId->num_rows === 0) {
            $addColumnSQL = "ALTER TABLE bookings ADD COLUMN driver_id INT(11) AFTER status";
            $conn->query($addColumnSQL);
            file_put_contents($setupLogFile, "[$setupTimestamp] Added driver_id column to bookings table\n", FILE_APPEND);
        }
    } else {
        // Create bookings table if it doesn't exist (minimal structure)
        $createBookingsSQL = "
            CREATE TABLE IF NOT EXISTS bookings (
                id INT(11) NOT NULL AUTO_INCREMENT,
                user_id INT(11),
                booking_number VARCHAR(50) NOT NULL,
                trip_type VARCHAR(50) NOT NULL,
                cab_type VARCHAR(50) NOT NULL,
                pickup_location VARCHAR(255) NOT NULL,
                drop_location VARCHAR(255),
                pickup_date DATETIME NOT NULL,
                return_date DATETIME,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                driver_id INT(11),
                driver_name VARCHAR(100),
                driver_phone VARCHAR(20),
                vehicle_number VARCHAR(50),
                total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                payment_status VARCHAR(50) DEFAULT 'pending',
                payment_method VARCHAR(50),
                gst_enabled TINYINT(1) DEFAULT 0,
                gst_number VARCHAR(20),
                company_name VARCHAR(100),
                company_address TEXT,
                passenger_name VARCHAR(100),
                passenger_phone VARCHAR(20),
                passenger_email VARCHAR(100),
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY booking_number (booking_number)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        if (!$conn->query($createBookingsSQL)) {
            throw new Exception("Failed to create bookings table: " . $conn->error);
        }
        
        file_put_contents($setupLogFile, "[$setupTimestamp] Created bookings table\n", FILE_APPEND);
    }
    
    file_put_contents($setupLogFile, "[$setupTimestamp] Database setup completed successfully\n", FILE_APPEND);
    
} catch (Exception $e) {
    file_put_contents($setupLogFile, "[$setupTimestamp] Error during database setup: " . $e->getMessage() . "\n", FILE_APPEND);
}

// No need to close connection here, as it will be reused by the calling script
