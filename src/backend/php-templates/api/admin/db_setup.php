
<?php
/**
 * This is a utility script for setting up the driver management tables.
 * It should be executed once to create the necessary tables if they don't exist.
 */
require_once '../../config.php';

// Connect to database
$conn = getDbConnection();

try {
    // Create drivers table if it doesn't exist
    $query = "
    CREATE TABLE IF NOT EXISTS drivers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(100),
        vehicle_type VARCHAR(50),
        vehicle_number VARCHAR(20),
        status ENUM('Available', 'Busy', 'Offline') DEFAULT 'Available',
        location VARCHAR(100),
        rating DECIMAL(3,1) DEFAULT 0,
        rides INT DEFAULT 0,
        earnings DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
    ";
    
    $conn->query($query);
    
    // Insert sample data if the table is empty
    $result = $conn->query("SELECT COUNT(*) as count FROM drivers");
    $row = $result->fetch_assoc();
    
    if ($row['count'] == 0) {
        // Insert sample drivers
        $conn->query("
            INSERT INTO drivers (name, phone, email, vehicle_type, vehicle_number, status, location, rating, rides, earnings) VALUES
            ('Rajesh Kumar', '9876543210', 'rajesh@example.com', 'Sedan', 'AP 31 XX 1234', 'Available', 'Hyderabad Central', 4.8, 352, 120000),
            ('Pavan Reddy', '8765432109', 'pavan@example.com', 'SUV', 'AP 32 XX 5678', 'Busy', 'Gachibowli', 4.6, 215, 85500),
            ('Suresh Verma', '7654321098', 'suresh@example.com', 'Sedan', 'AP 33 XX 9012', 'Offline', 'Offline', 4.5, 180, 72000),
            ('Venkatesh S', '9876543211', 'venkat@example.com', 'Hatchback', 'AP 34 XX 3456', 'Available', 'Kukatpally', 4.7, 298, 110000),
            ('Ramesh Babu', '8765432108', 'ramesh@example.com', 'Tempo', 'AP 35 XX 7890', 'Busy', 'Ameerpet', 4.4, 175, 65000)
        ");
        
        echo "Sample drivers added.\n";
    }
    
    echo "Database setup complete.";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
