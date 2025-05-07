
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// Check if db_helper exists and include it
if (file_exists(__DIR__ . '/../common/db_helper.php')) {
    require_once __DIR__ . '/../common/db_helper.php';
}

// Set response headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create logging directory if it doesn't exist
$logDir = __DIR__ . '/logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}
$logFile = $logDir . '/ledger_api_' . date('Y-m-d') . '.log';

// Helper logging function
function logMessage($message, $data = null) {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message";
    
    if ($data !== null) {
        if (is_array($data) || is_object($data)) {
            $logMessage .= ": " . json_encode($data);
        } else {
            $logMessage .= ": $data";
        }
    }
    
    file_put_contents($logFile, $logMessage . "\n", FILE_APPEND);
    error_log($logMessage);
}

logMessage("Financial ledger request received", ['method' => $_SERVER['REQUEST_METHOD']]);

// Connect to database
try {
    // Try using the helper function first
    $conn = null;
    if (function_exists('getDbConnectionWithRetry')) {
        $conn = getDbConnectionWithRetry(2);
    } else if (function_exists('getDbConnection')) {
        $conn = getDbConnection();
    } else {
        // Direct connection as fallback
        $dbHost = 'localhost';
        $dbName = 'u644605165_db_be';
        $dbUser = 'u644605165_usr_be';
        $dbPass = 'Vizag@1213';
        
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        if ($conn->connect_error) {
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
    }
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }

    // Check if financial_ledger table exists, create if missing
    $tableExists = $conn->query("SHOW TABLES LIKE 'financial_ledger'");
    if (!$tableExists || $tableExists->num_rows === 0) {
        logMessage("financial_ledger table doesn't exist, creating it");
        
        $createTableSql = "
            CREATE TABLE IF NOT EXISTS financial_ledger (
                id INT(11) NOT NULL AUTO_INCREMENT,
                transaction_date DATE NOT NULL,
                description TEXT NOT NULL,
                type ENUM('income', 'expense') NOT NULL,
                amount DECIMAL(12,2) NOT NULL,
                category VARCHAR(50) NOT NULL,
                payment_method VARCHAR(50),
                reference VARCHAR(100),
                booking_id INT(11),
                vehicle_id VARCHAR(50),
                balance DECIMAL(12,2) NOT NULL,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY (transaction_date),
                KEY (type),
                KEY (category),
                KEY (booking_id),
                KEY (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        if (!$conn->query($createTableSql)) {
            throw new Exception("Failed to create financial_ledger table: " . $conn->error);
        }
        
        logMessage("Created financial_ledger table");
        
        // Insert initial sample data
        $initialBalance = 0;
        $sampleData = [
            [
                'transaction_date' => date('Y-m-d', strtotime('-7 days')),
                'description' => 'Initial working capital',
                'type' => 'income',
                'amount' => 350000,
                'category' => 'Capital',
                'payment_method' => 'Bank Transfer',
                'reference' => 'CAP-INIT-001',
            ],
            [
                'transaction_date' => date('Y-m-d', strtotime('-6 days')),
                'description' => 'Fare collection - Airport trip',
                'type' => 'income',
                'amount' => 3200,
                'category' => 'Trip Revenue',
                'payment_method' => 'Online',
                'reference' => 'ORD-#5428',
            ],
            [
                'transaction_date' => date('Y-m-d', strtotime('-6 days')),
                'description' => 'Office rent payment',
                'type' => 'expense',
                'amount' => 15000,
                'category' => 'Rent',
                'payment_method' => 'Bank Transfer',
                'reference' => 'RENT-MAY',
            ],
            [
                'transaction_date' => date('Y-m-d', strtotime('-5 days')),
                'description' => 'Fuel payment - VEH-001',
                'type' => 'expense',
                'amount' => 4850,
                'category' => 'Fuel',
                'payment_method' => 'Card',
                'reference' => 'FUEL-4532',
                'vehicle_id' => 'VEH-001',
            ],
        ];
        
        // Insert sample data and calculate running balance
        foreach ($sampleData as $transaction) {
            if ($transaction['type'] == 'income') {
                $initialBalance += $transaction['amount'];
            } else {
                $initialBalance -= $transaction['amount'];
            }
            
            $stmt = $conn->prepare("
                INSERT INTO financial_ledger 
                (transaction_date, description, type, amount, category, payment_method, reference, vehicle_id, balance) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->bind_param(
                "sssdssssd",
                $transaction['transaction_date'],
                $transaction['description'],
                $transaction['type'],
                $transaction['amount'],
                $transaction['category'],
                $transaction['payment_method'],
                $transaction['reference'],
                $transaction['vehicle_id'] ?? null,
                $initialBalance
            );
            
            $stmt->execute();
            $stmt->close();
        }
        
        logMessage("Added sample data to financial_ledger table");
    }
    
    // Handle GET request to retrieve ledger data
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get filter parameters
        $startDate = isset($_GET['start_date']) ? $_GET['start_date'] : null;
        $endDate = isset($_GET['end_date']) ? $_GET['end_date'] : null;
        $type = isset($_GET['type']) ? $_GET['type'] : null;
        $category = isset($_GET['category']) ? $_GET['category'] : null;
        $vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null;
        
        // Build SQL query with filters
        $sql = "SELECT * FROM financial_ledger WHERE 1=1";
        $params = [];
        $types = "";
        
        if ($startDate) {
            $sql .= " AND transaction_date >= ?";
            $params[] = $startDate;
            $types .= "s";
        }
        
        if ($endDate) {
            $sql .= " AND transaction_date <= ?";
            $params[] = $endDate;
            $types .= "s";
        }
        
        if ($type) {
            $sql .= " AND type = ?";
            $params[] = $type;
            $types .= "s";
        }
        
        if ($category) {
            $sql .= " AND category = ?";
            $params[] = $category;
            $types .= "s";
        }
        
        if ($vehicleId) {
            $sql .= " AND vehicle_id = ?";
            $params[] = $vehicleId;
            $types .= "s";
        }
        
        // Add order by
        $sql .= " ORDER BY transaction_date DESC, id DESC";
        
        // Prepare and execute the query
        $stmt = $conn->prepare($sql);
        
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        
        $success = $stmt->execute();
        
        if (!$success) {
            throw new Exception("Failed to execute query: " . $stmt->error);
        }
        
        $result = $stmt->get_result();
        
        // Format the results
        $transactions = [];
        while ($row = $result->fetch_assoc()) {
            $transactions[] = [
                'id' => (int)$row['id'],
                'date' => $row['transaction_date'],
                'description' => $row['description'],
                'type' => $row['type'],
                'amount' => (float)$row['amount'],
                'category' => $row['category'],
                'paymentMethod' => $row['payment_method'],
                'reference' => $row['reference'],
                'bookingId' => $row['booking_id'] ? (int)$row['booking_id'] : null,
                'vehicleId' => $row['vehicle_id'],
                'balance' => (float)$row['balance'],
                'createdAt' => $row['created_at'],
                'updatedAt' => $row['updated_at']
            ];
        }
        
        // Calculate summary data
        $totalIncome = 0;
        $totalExpenses = 0;
        
        $summarySQL = "SELECT 
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses
            FROM financial_ledger";
            
        $whereClause = [];
        $summaryParams = [];
        $summaryTypes = "";
        
        if ($startDate) {
            $whereClause[] = "transaction_date >= ?";
            $summaryParams[] = $startDate;
            $summaryTypes .= "s";
        }
        
        if ($endDate) {
            $whereClause[] = "transaction_date <= ?";
            $summaryParams[] = $endDate;
            $summaryTypes .= "s";
        }
        
        if (!empty($whereClause)) {
            $summarySQL .= " WHERE " . implode(" AND ", $whereClause);
        }
        
        $summaryStmt = $conn->prepare($summarySQL);
        
        if (!empty($summaryParams)) {
            $summaryStmt->bind_param($summaryTypes, ...$summaryParams);
        }
        
        $summaryStmt->execute();
        $summaryResult = $summaryStmt->get_result()->fetch_assoc();
        
        $totalIncome = (float)($summaryResult['total_income'] ?? 0);
        $totalExpenses = (float)($summaryResult['total_expenses'] ?? 0);
        $netBalance = $totalIncome - $totalExpenses;
        
        // Get available categories for filtering
        $categoryQuery = "SELECT DISTINCT category FROM financial_ledger ORDER BY category";
        $categoryResult = $conn->query($categoryQuery);
        $categories = [];
        
        while ($categoryRow = $categoryResult->fetch_assoc()) {
            $categories[] = $categoryRow['category'];
        }
        
        logMessage("Retrieved ledger data", ['count' => count($transactions)]);
        
        // Return the transactions
        echo json_encode([
            'status' => 'success',
            'transactions' => $transactions,
            'summary' => [
                'totalIncome' => $totalIncome,
                'totalExpenses' => $totalExpenses,
                'netBalance' => $netBalance
            ],
            'categories' => $categories
        ]);
        
    } else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Handle POST request to add new transaction
        
        // Get data from request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!$data) {
            throw new Exception("Invalid request data");
        }
        
        // Validate required fields
        $requiredFields = ['date', 'description', 'type', 'amount', 'category', 'paymentMethod'];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || $data[$field] === '') {
                throw new Exception("Missing required field: $field");
            }
        }
        
        // Validate transaction type
        if (!in_array($data['type'], ['income', 'expense'])) {
            throw new Exception("Invalid transaction type");
        }
        
        // Get the latest balance
        $balanceQuery = "SELECT balance FROM financial_ledger ORDER BY id DESC LIMIT 1";
        $balanceResult = $conn->query($balanceQuery);
        
        $lastBalance = 0;
        if ($balanceResult && $balanceResult->num_rows > 0) {
            $lastBalance = (float)$balanceResult->fetch_assoc()['balance'];
        }
        
        // Calculate new balance
        $amount = (float)$data['amount'];
        $newBalance = $lastBalance;
        
        if ($data['type'] === 'income') {
            $newBalance += $amount;
        } else {
            $newBalance -= $amount;
        }
        
        // Insert the new transaction
        $insertSql = "
            INSERT INTO financial_ledger 
            (transaction_date, description, type, amount, category, payment_method, reference, booking_id, vehicle_id, balance) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ";
        
        $insertStmt = $conn->prepare($insertSql);
        $bookingId = isset($data['bookingId']) ? $data['bookingId'] : null;
        $vehicleId = isset($data['vehicleId']) ? $data['vehicleId'] : null;
        $reference = isset($data['reference']) ? $data['reference'] : null;
        
        $insertStmt->bind_param(
            "sssdssisd",
            $data['date'],
            $data['description'],
            $data['type'],
            $amount,
            $data['category'],
            $data['paymentMethod'],
            $reference,
            $bookingId,
            $vehicleId,
            $newBalance
        );
        
        $insertResult = $insertStmt->execute();
        
        if (!$insertResult) {
            throw new Exception("Failed to insert transaction: " . $insertStmt->error);
        }
        
        $newId = $conn->insert_id;
        
        logMessage("Added new ledger transaction", [
            'id' => $newId,
            'type' => $data['type'],
            'amount' => $amount
        ]);
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Transaction added successfully',
            'transaction' => [
                'id' => $newId,
                'date' => $data['date'],
                'description' => $data['description'],
                'type' => $data['type'],
                'amount' => $amount,
                'category' => $data['category'],
                'paymentMethod' => $data['paymentMethod'],
                'reference' => $reference,
                'bookingId' => $bookingId,
                'vehicleId' => $vehicleId,
                'balance' => $newBalance
            ]
        ]);
    } else {
        throw new Exception("Method not allowed");
    }
    
} catch (Exception $e) {
    logMessage("Error in ledger endpoint", ['error' => $e->getMessage()]);
    
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
