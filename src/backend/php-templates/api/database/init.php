
<?php
// Include database connection helper
require_once __DIR__ . '/../utils/database.php';

// Initialize database tables
function initializeDatabase() {
    $db = connectToDatabase();
    
    // Read the SQL file
    $sqlFile = file_get_contents(__DIR__ . '/ledger_tables.sql');
    
    // Split SQL statements by semicolons
    $statements = explode(';', $sqlFile);
    
    // Execute each statement
    foreach ($statements as $statement) {
        $trimmed = trim($statement);
        if (!empty($trimmed)) {
            if (!$db->query($trimmed)) {
                echo "Error executing SQL: " . $db->error . PHP_EOL;
                echo "Statement: " . $trimmed . PHP_EOL;
            }
        }
    }
    
    echo "Database initialization completed!";
}

// Call the initialization function
initializeDatabase();
