
<?php
header("Content-Type: text/html; charset=utf-8");

// Include database connection helper
require_once __DIR__ . "/../utils/database.php";

function setupRazorpayTables() {
    // Get database connection
    $conn = getDbConnection();
    
    // Load SQL file content
    $sqlFilePath = __DIR__ . "/../sql/razorpay_tables.sql";
    
    if (!file_exists($sqlFilePath)) {
        die("Error: SQL file not found at $sqlFilePath");
    }
    
    $sqlContent = file_get_contents($sqlFilePath);
    
    // Split the SQL file content into individual statements
    $sqlStatements = explode(';', $sqlContent);
    
    $success = true;
    $messages = [];
    
    // Execute each SQL statement
    foreach ($sqlStatements as $statement) {
        $statement = trim($statement);
        
        if (!empty($statement)) {
            if (!$conn->query($statement)) {
                $success = false;
                $messages[] = "Error executing SQL: " . $conn->error;
            }
        }
    }
    
    // Check if the tables exist
    $tables = ["razorpay_orders", "razorpay_payments"];
    
    foreach ($tables as $table) {
        $result = $conn->query("SHOW TABLES LIKE '$table'");
        
        if ($result->num_rows > 0) {
            $messages[] = "Table '$table' exists.";
        } else {
            $success = false;
            $messages[] = "Table '$table' does not exist.";
        }
    }
    
    // Check if payments table has been updated with Razorpay fields
    $result = $conn->query("SHOW COLUMNS FROM payments LIKE 'razorpay_payment_id'");
    if ($result->num_rows > 0) {
        $messages[] = "Payments table has Razorpay fields.";
    } else {
        $success = false;
        $messages[] = "Payments table is missing Razorpay fields.";
    }
    
    $conn->close();
    
    return ["success" => $success, "messages" => $messages];
}

// Run the setup
$result = setupRazorpayTables();
?>

<!DOCTYPE html>
<html>
<head>
    <title>Razorpay Tables Setup</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .container { max-width: 800px; margin: 0 auto; }
        .success { color: green; }
        .error { color: red; }
        h1 { color: #333; }
        ul { background-color: #f5f5f5; padding: 15px 30px; border-radius: 5px; }
        .status-box { border-radius: 5px; padding: 10px 15px; margin-bottom: 20px; }
        .success-box { background-color: #d4edda; border: 1px solid #c3e6cb; }
        .error-box { background-color: #f8d7da; border: 1px solid #f5c6cb; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Razorpay Database Tables Setup</h1>
        
        <div class="status-box <?= $result['success'] ? 'success-box' : 'error-box' ?>">
            <h2><?= $result['success'] ? 'Success!' : 'Error!' ?></h2>
            <p><?= $result['success'] ? 'Razorpay tables have been successfully set up.' : 'There were issues setting up Razorpay tables.' ?></p>
        </div>
        
        <h3>Details:</h3>
        <ul>
            <?php foreach ($result['messages'] as $message): ?>
                <li><?= htmlspecialchars($message) ?></li>
            <?php endforeach; ?>
        </ul>
        
        <p><a href="../admin/check-connection.php">Return to Admin Panel</a></p>
    </div>
</body>
</html>
