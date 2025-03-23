
<?php
// init-database.php - Initialize all required database tables

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: *');

// Include the db_setup script
require_once 'db_setup.php';

// Output response in JSON
echo json_encode([
    'status' => 'success',
    'message' => 'Database initialization completed',
    'timestamp' => time()
]);
