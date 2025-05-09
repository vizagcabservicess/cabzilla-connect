<?php
/**
 * Database setup script to ensure all required tables exist
 * This script is included by various API endpoints to ensure database consistency
 */

// Include database utilities
if (!function_exists('getDbConnection')) {
    require_once __DIR__ . '/../../utils/database.php';
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
    $conn = getDbConnection();
    
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
    
    // Verify and set up the payroll_entries table
    $checkPayrollTable = $conn->query("SHOW TABLES LIKE 'payroll_entries'");
    
    if (!$checkPayrollTable || $checkPayrollTable->num_rows === 0) {
        // Create payroll_entries table
        $createPayrollSQL = "
            CREATE TABLE IF NOT EXISTS payroll_entries (
                id INT(11) NOT NULL AUTO_INCREMENT,
                driver_id VARCHAR(50) NOT NULL,
                date DATE NOT NULL,
                description TEXT NOT NULL,
                amount DECIMAL(12,2) NOT NULL,
                type ENUM('expense') NOT NULL DEFAULT 'expense',
                category VARCHAR(50) NOT NULL DEFAULT 'Salary',
                payment_method VARCHAR(50),
                status ENUM('reconciled', 'pending') DEFAULT 'pending',
                pay_period_start DATE NOT NULL,
                pay_period_end DATE NOT NULL,
                basic_salary DECIMAL(10,2) NOT NULL,
                days_worked INT(3) NOT NULL DEFAULT 0,
                days_leave INT(3) NOT NULL DEFAULT 0,
                overtime_hours DECIMAL(5,2) DEFAULT 0,
                net_salary DECIMAL(12,2) NOT NULL,
                payment_status ENUM('pending', 'partial', 'paid') DEFAULT 'pending',
                payment_date DATE,
                payslip_issued TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY driver_id (driver_id),
                KEY pay_period (pay_period_start, pay_period_end),
                KEY payment_status (payment_status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        if (!$conn->query($createPayrollSQL)) {
            throw new Exception("Failed to create payroll_entries table: " . $conn->error);
        }
        
        file_put_contents($setupLogFile, "[$setupTimestamp] Created payroll_entries table\n", FILE_APPEND);
    }
    
    // Verify and set up the salary_components table
    $checkSalaryComponentsTable = $conn->query("SHOW TABLES LIKE 'salary_components'");
    
    if (!$checkSalaryComponentsTable || $checkSalaryComponentsTable->num_rows === 0) {
        // Create salary_components table
        $createComponentsSQL = "
            CREATE TABLE IF NOT EXISTS salary_components (
                id INT(11) NOT NULL AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                type ENUM('basic', 'allowance', 'deduction', 'advance', 'bonus') NOT NULL,
                amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                is_fixed TINYINT(1) NOT NULL DEFAULT 1,
                calculation_method VARCHAR(20),
                calculation_base VARCHAR(20),
                calculation_value DECIMAL(10,2),
                description TEXT,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        if (!$conn->query($createComponentsSQL)) {
            throw new Exception("Failed to create salary_components table: " . $conn->error);
        }
        
        // Insert default salary components
        $defaultComponents = [
            ["Basic Salary", "basic", 15000, 1, NULL, NULL, NULL, "Base salary amount"],
            ["Daily Allowance (Batha)", "allowance", 200, 0, "perDay", NULL, NULL, "Daily allowance for food"],
            ["Fuel Allowance", "allowance", 3000, 1, NULL, NULL, NULL, "Monthly fuel allowance"],
            ["Mobile Allowance", "allowance", 500, 1, NULL, NULL, NULL, "Monthly mobile recharge allowance"],
            ["Trip Bonus", "bonus", 0, 0, "perTrip", NULL, NULL, "Bonus per completed trip"],
            ["Provident Fund", "deduction", 0, 0, "percentage", "basic", 12, "PF deduction"]
        ];
        
        foreach ($defaultComponents as $component) {
            $insertSQL = "INSERT INTO salary_components (name, type, amount, is_fixed, calculation_method, calculation_base, calculation_value, description) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $conn->prepare($insertSQL);
            $stmt->bind_param("ssdiisds", $component[0], $component[1], $component[2], $component[3], $component[4], $component[5], $component[6], $component[7]);
            $stmt->execute();
            $stmt->close();
        }
        
        file_put_contents($setupLogFile, "[$setupTimestamp] Created salary_components table with default components\n", FILE_APPEND);
    }
    
    // Verify and set up the payroll_allowances table
    $checkAllowancesTable = $conn->query("SHOW TABLES LIKE 'payroll_allowances'");
    
    if (!$checkAllowancesTable || $checkAllowancesTable->num_rows === 0) {
        // Create payroll_allowances table
        $createAllowancesSQL = "
            CREATE TABLE IF NOT EXISTS payroll_allowances (
                id INT(11) NOT NULL AUTO_INCREMENT,
                payroll_id INT(11) NOT NULL,
                type VARCHAR(50) NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY payroll_id (payroll_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        if (!$conn->query($createAllowancesSQL)) {
            throw new Exception("Failed to create payroll_allowances table: " . $conn->error);
        }
        
        file_put_contents($setupLogFile, "[$setupTimestamp] Created payroll_allowances table\n", FILE_APPEND);
    }
    
    // Verify and set up the payroll_deductions table
    $checkDeductionsTable = $conn->query("SHOW TABLES LIKE 'payroll_deductions'");
    
    if (!$checkDeductionsTable || $checkDeductionsTable->num_rows === 0) {
        // Create payroll_deductions table
        $createDeductionsSQL = "
            CREATE TABLE IF NOT EXISTS payroll_deductions (
                id INT(11) NOT NULL AUTO_INCREMENT,
                payroll_id INT(11) NOT NULL,
                type VARCHAR(50) NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY payroll_id (payroll_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        if (!$conn->query($createDeductionsSQL)) {
            throw new Exception("Failed to create payroll_deductions table: " . $conn->error);
        }
        
        file_put_contents($setupLogFile, "[$setupTimestamp] Created payroll_deductions table\n", FILE_APPEND);
    }
    
    // Verify and set up the salary_advances table
    $checkAdvancesTable = $conn->query("SHOW TABLES LIKE 'salary_advances'");
    
    if (!$checkAdvancesTable || $checkAdvancesTable->num_rows === 0) {
        // Create salary_advances table
        $createAdvancesSQL = "
            CREATE TABLE IF NOT EXISTS salary_advances (
                id INT(11) NOT NULL AUTO_INCREMENT,
                driver_id VARCHAR(50) NOT NULL,
                payroll_id INT(11),
                date DATE NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                notes TEXT,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY driver_id (driver_id),
                KEY payroll_id (payroll_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        if (!$conn->query($createAdvancesSQL)) {
            throw new Exception("Failed to create salary_advances table: " . $conn->error);
        }
        
        file_put_contents($setupLogFile, "[$setupTimestamp] Created salary_advances table\n", FILE_APPEND);
    }
    
    // Verify and set up the attendance_records table
    $checkAttendanceTable = $conn->query("SHOW TABLES LIKE 'attendance_records'");
    
    if (!$checkAttendanceTable || $checkAttendanceTable->num_rows === 0) {
        // Create attendance_records table
        $createAttendanceSQL = "
            CREATE TABLE IF NOT EXISTS attendance_records (
                id INT(11) NOT NULL AUTO_INCREMENT,
                driver_id VARCHAR(50) NOT NULL,
                date DATE NOT NULL,
                status ENUM('present', 'absent', 'half-day', 'paid-leave', 'unpaid-leave', 'holiday') NOT NULL,
                hours_worked DECIMAL(4,2),
                overtime_hours DECIMAL(4,2) DEFAULT 0,
                notes TEXT,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY driver_date (driver_id, date),
                KEY driver_id (driver_id),
                KEY date (date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        if (!$conn->query($createAttendanceSQL)) {
            throw new Exception("Failed to create attendance_records table: " . $conn->error);
        }
        
        file_put_contents($setupLogFile, "[$setupTimestamp] Created attendance_records table\n", FILE_APPEND);
    }
    
    file_put_contents($setupLogFile, "[$setupTimestamp] Database setup completed successfully\n", FILE_APPEND);
    
} catch (Exception $e) {
    file_put_contents($setupLogFile, "[$setupTimestamp] Error during database setup: " . $e->getMessage() . "\n", FILE_APPEND);
}

// No need to close connection here, as it will be reused by the calling script
