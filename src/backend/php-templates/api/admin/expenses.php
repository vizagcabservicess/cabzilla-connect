<?php
// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

/**
 * Expense Management API Endpoint
 * Handles CRUD operations for expenses
 */

// Include necessary files
require_once '../utils/response.php';
require_once '../utils/database.php';
require_once '../common/db_helper.php';

// Set headers for CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Connect to database
try {
    $conn = getDbConnection();
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
} catch (Exception $e) {
    sendErrorResponse('Database connection failed: ' . $e->getMessage(), 500);
    exit();
}

// Handle different HTTP methods
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGetRequest($conn);
        break;
    case 'POST':
        handlePostRequest($conn);
        break;
    case 'PUT':
        handlePutRequest($conn);
        break;
    case 'DELETE':
        handleDeleteRequest($conn);
        break;
    default:
        sendErrorResponse('Method not allowed', 405);
        break;
}

/**
 * Handle GET requests - Fetch expenses or expense categories
 */
function handleGetRequest($conn) {
    // Check if we're fetching categories or expenses
    if (isset($_GET['action']) && $_GET['action'] === 'categories') {
        fetchExpenseCategories($conn);
    } elseif (isset($_GET['action']) && $_GET['action'] === 'summary') {
        fetchExpenseSummary($conn);
    } else {
        fetchExpenses($conn);
    }
}

/**
 * Fetch expense categories
 */
function fetchExpenseCategories($conn) {
    try {
        // First check if the table exists
        $tableExists = false;
        $checkTable = $conn->query("SHOW TABLES LIKE 'expense_categories'");
        if ($checkTable && $checkTable->num_rows > 0) {
            $tableExists = true;
        }
        
        if (!$tableExists) {
            // Create the table
            $sql = file_get_contents(__DIR__ . '/../sql/expense_tables.sql');
            
            if (!$conn->multi_query($sql)) {
                throw new Exception("Failed to create expense tables: " . $conn->error);
            }
            
            // Clear all results to allow new queries
            while ($conn->more_results() && $conn->next_result()) {
                if ($res = $conn->store_result()) {
                    $res->free();
                }
            }
        }
        
        $sql = "SELECT * FROM expense_categories WHERE is_deleted = 0 ORDER BY name ASC";
        $result = $conn->query($sql);
        
        if (!$result) {
            throw new Exception("Query failed: " . $conn->error);
        }
        
        $categories = [];
        while ($row = $result->fetch_assoc()) {
            $categories[] = [
                'id' => (string)$row['id'],
                'name' => $row['name'],
                'description' => $row['description'],
                'color' => $row['color'] ?? '#6B7280'
            ];
        }
        
        sendSuccessResponse($categories, 'Expense categories fetched successfully');
    } catch (Exception $e) {
        sendErrorResponse('Error fetching expense categories: ' . $e->getMessage(), 500);
    }
}

/**
 * Fetch expenses with optional filters
 */
function fetchExpenses($conn) {
    try {
        // First check if the table exists
        $tableExists = false;
        $checkTable = $conn->query("SHOW TABLES LIKE 'financial_ledger'");
        if ($checkTable && $checkTable->num_rows > 0) {
            $tableExists = true;
        }
        
        if (!$tableExists) {
            // Try to create the table
            $sql = file_get_contents(__DIR__ . '/../sql/expense_tables.sql');
            
            if (!$conn->multi_query($sql)) {
                throw new Exception("Failed to create expense tables: " . $conn->error);
            }
            
            // Clear all results to allow new queries
            while ($conn->more_results() && $conn->next_result()) {
                if ($res = $conn->store_result()) {
                    $res->free();
                }
            }
            
            sendSuccessResponse([], 'Expense tables created successfully. No expenses found.');
            return;
        }
        
        $params = [];
        $types = "";
        $whereConditions = ["type = 'expense'", "is_deleted = 0"];
        
        // Apply date range filter if provided
        if (isset($_GET['from_date']) && $_GET['from_date']) {
            $whereConditions[] = "date >= ?";
            $params[] = $_GET['from_date'];
            $types .= "s";
        }
        
        if (isset($_GET['to_date']) && $_GET['to_date']) {
            $whereConditions[] = "date <= ?";
            $params[] = $_GET['to_date'];
            $types .= "s";
        }
        
        // Apply category filter if provided
        if (isset($_GET['category']) && $_GET['category']) {
            $categories = explode(',', $_GET['category']);
            if (count($categories) === 1) {
                $whereConditions[] = "category = ?";
                $params[] = $_GET['category'];
                $types .= "s";
            } else {
                $placeholders = array_fill(0, count($categories), '?');
                $whereConditions[] = "category IN (" . implode(',', $placeholders) . ")";
                foreach ($categories as $cat) {
                    $params[] = $cat;
                    $types .= "s";
                }
            }
        }
        
        // Apply payment method filter if provided
        if (isset($_GET['payment_method']) && $_GET['payment_method']) {
            $whereConditions[] = "payment_method = ?";
            $params[] = $_GET['payment_method'];
            $types .= "s";
        }
        
        // Apply vendor filter if provided
        if (isset($_GET['vendor']) && $_GET['vendor']) {
            $whereConditions[] = "vendor LIKE ?";
            $params[] = "%" . $_GET['vendor'] . "%";
            $types .= "s";
        }
        
        // Apply status filter if provided
        if (isset($_GET['status']) && $_GET['status'] && $_GET['status'] !== 'all') {
            $whereConditions[] = "status = ?";
            $params[] = $_GET['status'];
            $types .= "s";
        }
        
        // Apply amount range filters if provided
        if (isset($_GET['min_amount']) && is_numeric($_GET['min_amount'])) {
            $whereConditions[] = "amount >= ?";
            $params[] = (float) $_GET['min_amount'];
            $types .= "d";
        }
        
        if (isset($_GET['max_amount']) && is_numeric($_GET['max_amount'])) {
            $whereConditions[] = "amount <= ?";
            $params[] = (float) $_GET['max_amount'];
            $types .= "d";
        }
        
        // Construct the SQL query
        $sql = "SELECT * FROM financial_ledger 
                WHERE " . implode(' AND ', $whereConditions) . "
                ORDER BY date DESC, id DESC";
        
        // Execute query using prepared statement
        if (!empty($params)) {
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                throw new Exception("Prepare failed: " . $conn->error);
            }
            
            $stmt->bind_param($types, ...$params);
            $stmt->execute();
            $result = $stmt->get_result();
        } else {
            $result = $conn->query($sql);
            if (!$result) {
                throw new Exception("Query failed: " . $conn->error);
            }
        }
        
        $expenses = [];
        while ($row = $result->fetch_assoc()) {
            $expenses[] = [
                'id' => $row['id'],
                'date' => $row['date'],
                'description' => $row['description'],
                'amount' => (float) $row['amount'],
                'type' => 'expense',
                'category' => $row['category'],
                'paymentMethod' => $row['payment_method'],
                'vendor' => $row['vendor'],
                'billNumber' => $row['bill_number'],
                'billDate' => $row['bill_date'],
                'notes' => $row['notes'],
                'status' => $row['status'],
                'isRecurring' => (bool) $row['is_recurring'],
                'recurringFrequency' => $row['recurring_frequency'],
                'created_at' => $row['created_at'],
                'updated_at' => $row['updated_at']
            ];
        }
        
        sendSuccessResponse($expenses, 'Expenses fetched successfully');
    } catch (Exception $e) {
        sendErrorResponse('Error fetching expenses: ' . $e->getMessage(), 500);
    }
}

/**
 * Fetch expense summary for analytics
 */
function fetchExpenseSummary($conn) {
    try {
        // First check if the table exists
        $tableExists = false;
        $checkTable = $conn->query("SHOW TABLES LIKE 'financial_ledger'");
        if ($checkTable && $checkTable->num_rows > 0) {
            $tableExists = true;
        }
        
        if (!$tableExists) {
            // Return empty summary 
            $summary = [
                'totalAmount' => 0,
                'byCategory' => [],
                'byMonth' => [],
                'byPaymentMethod' => []
            ];
            
            sendSuccessResponse($summary, 'No expense data available yet');
            return;
        }
        
        $params = [];
        $types = "";
        $whereConditions = ["type = 'expense'", "is_deleted = 0"];
        
        // Apply date range filter if provided
        if (isset($_GET['from_date']) && $_GET['from_date']) {
            $whereConditions[] = "date >= ?";
            $params[] = $_GET['from_date'];
            $types .= "s";
        }
        
        if (isset($_GET['to_date']) && $_GET['to_date']) {
            $whereConditions[] = "date <= ?";
            $params[] = $_GET['to_date'];
            $types .= "s";
        }
        
        // Calculate total amount
        $sql = "SELECT SUM(amount) as total_amount FROM financial_ledger 
                WHERE " . implode(' AND ', $whereConditions);
        
        if (!empty($params)) {
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                throw new Exception("Prepare failed: " . $conn->error);
            }
            
            $stmt->bind_param($types, ...$params);
            $stmt->execute();
            $result = $stmt->get_result();
        } else {
            $result = $conn->query($sql);
            if (!$result) {
                throw new Exception("Query failed: " . $conn->error);
            }
        }
        
        $row = $result->fetch_assoc();
        $totalAmount = (float) ($row['total_amount'] ?? 0);
        
        // Group by category
        $sql = "SELECT category, SUM(amount) as category_amount 
                FROM financial_ledger 
                WHERE " . implode(' AND ', $whereConditions) . "
                GROUP BY category";
        
        if (!empty($params)) {
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                throw new Exception("Prepare failed: " . $conn->error);
            }
            
            $stmt->bind_param($types, ...$params);
            $stmt->execute();
            $result = $stmt->get_result();
        } else {
            $result = $conn->query($sql);
            if (!$result) {
                throw new Exception("Query failed: " . $conn->error);
            }
        }
        
        $byCategory = [];
        while ($row = $result->fetch_assoc()) {
            $amount = (float) $row['category_amount'];
            $byCategory[] = [
                'category' => $row['category'],
                'amount' => $amount,
                'percentage' => $totalAmount > 0 ? ($amount / $totalAmount) * 100 : 0
            ];
        }
        
        // Group by month
        $sql = "SELECT DATE_FORMAT(date, '%Y-%m') as month, SUM(amount) as month_amount 
                FROM financial_ledger 
                WHERE " . implode(' AND ', $whereConditions) . "
                GROUP BY DATE_FORMAT(date, '%Y-%m')
                ORDER BY month";
        
        if (!empty($params)) {
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                throw new Exception("Prepare failed: " . $conn->error);
            }
            
            $stmt->bind_param($types, ...$params);
            $stmt->execute();
            $result = $stmt->get_result();
        } else {
            $result = $conn->query($sql);
            if (!$result) {
                throw new Exception("Query failed: " . $conn->error);
            }
        }
        
        $byMonth = [];
        while ($row = $result->fetch_assoc()) {
            $byMonth[] = [
                'month' => $row['month'],
                'amount' => (float) $row['month_amount']
            ];
        }
        
        // Group by payment method
        $sql = "SELECT payment_method, SUM(amount) as method_amount 
                FROM financial_ledger 
                WHERE " . implode(' AND ', $whereConditions) . "
                GROUP BY payment_method";
        
        if (!empty($params)) {
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                throw new Exception("Prepare failed: " . $conn->error);
            }
            
            $stmt->bind_param($types, ...$params);
            $stmt->execute();
            $result = $stmt->get_result();
        } else {
            $result = $conn->query($sql);
            if (!$result) {
                throw new Exception("Query failed: " . $conn->error);
            }
        }
        
        $byPaymentMethod = [];
        while ($row = $result->fetch_assoc()) {
            $amount = (float) $row['method_amount'];
            $byPaymentMethod[] = [
                'method' => $row['payment_method'] ?: 'Unknown',
                'amount' => $amount,
                'percentage' => $totalAmount > 0 ? ($amount / $totalAmount) * 100 : 0
            ];
        }
        
        // Construct the summary response
        $summary = [
            'totalAmount' => $totalAmount,
            'byCategory' => $byCategory,
            'byMonth' => $byMonth,
            'byPaymentMethod' => $byPaymentMethod
        ];
        
        sendSuccessResponse($summary, 'Expense summary fetched successfully');
    } catch (Exception $e) {
        sendErrorResponse('Error fetching expense summary: ' . $e->getMessage(), 500);
    }
}

/**
 * Handle POST requests - Create a new expense or category
 */
function handlePostRequest($conn) {
    try {
        // Get request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!$data) {
            throw new Exception("Invalid request data");
        }
        
        // Check if we're adding a category or an expense
        if (isset($data['action']) && $data['action'] === 'add_category') {
            addExpenseCategory($conn, $data);
        } else {
            addExpense($conn, $data);
        }
    } catch (Exception $e) {
        sendErrorResponse('Error processing request: ' . $e->getMessage(), 400);
    }
}

/**
 * Add a new expense category
 */
function addExpenseCategory($conn, $data) {
    try {
        // Validate required fields
        if (!isset($data['name']) || empty($data['name'])) {
            throw new Exception("Category name is required");
        }
        
        // First check if the table exists
        $tableExists = false;
        $checkTable = $conn->query("SHOW TABLES LIKE 'expense_categories'");
        if ($checkTable && $checkTable->num_rows > 0) {
            $tableExists = true;
        }
        
        if (!$tableExists) {
            // Create the table
            $sql = file_get_contents(__DIR__ . '/../sql/expense_tables.sql');
            
            if (!$conn->multi_query($sql)) {
                throw new Exception("Failed to create expense tables: " . $conn->error);
            }
            
            // Clear all results to allow new queries
            while ($conn->more_results() && $conn->next_result()) {
                if ($res = $conn->store_result()) {
                    $res->free();
                }
            }
        }
        
        // Check if category already exists
        $sql = "SELECT id FROM expense_categories WHERE name = ? AND is_deleted = 0";
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }
        
        $stmt->bind_param("s", $data['name']);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            throw new Exception("Category with this name already exists");
        }
        
        // Insert new category
        $sql = "INSERT INTO expense_categories (name, description, color, created_at) 
                VALUES (?, ?, ?, NOW())";
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }
        
        $name = $data['name'];
        $description = $data['description'] ?? '';
        $color = $data['color'] ?? '#6B7280';
        
        $stmt->bind_param("sss", $name, $description, $color);
        $stmt->execute();
        
        if ($stmt->affected_rows > 0) {
            $categoryId = $stmt->insert_id;
            
            // Return the created category
            $category = [
                'id' => (string)$categoryId,
                'name' => $name,
                'description' => $description,
                'color' => $color
            ];
            
            sendSuccessResponse($category, 'Category added successfully', 201);
        } else {
            throw new Exception("Failed to add category");
        }
    } catch (Exception $e) {
        sendErrorResponse('Error adding category: ' . $e->getMessage(), 400);
    }
}

/**
 * Add a new expense
 */
function addExpense($conn, $data) {
    try {
        // Validate required fields
        if (!isset($data['description']) || empty($data['description'])) {
            throw new Exception("Description is required");
        }
        
        if (!isset($data['amount']) || !is_numeric($data['amount']) || $data['amount'] <= 0) {
            throw new Exception("Valid amount is required");
        }
        
        if (!isset($data['date']) || empty($data['date'])) {
            throw new Exception("Date is required");
        }
        
        if (!isset($data['category']) || empty($data['category'])) {
            throw new Exception("Category is required");
        }
        
        // Check if the tables exist
        $tableExists = false;
        $checkTable = $conn->query("SHOW TABLES LIKE 'financial_ledger'");
        if ($checkTable && $checkTable->num_rows > 0) {
            $tableExists = true;
        }
        
        if (!$tableExists) {
            // Create the tables
            $sql = file_get_contents(__DIR__ . '/../sql/expense_tables.sql');
            
            if (!$conn->multi_query($sql)) {
                throw new Exception("Failed to create expense tables: " . $conn->error);
            }
            
            // Clear all results to allow new queries
            while ($conn->more_results() && $conn->next_result()) {
                if ($res = $conn->store_result()) {
                    $res->free();
                }
            }
        }
        
        // Insert new expense into financial_ledger table
        $sql = "INSERT INTO financial_ledger (
                    type, date, description, amount, category, 
                    payment_method, vendor, bill_number, bill_date, 
                    notes, status, is_recurring, recurring_frequency, 
                    created_at, updated_at
                ) VALUES (
                    'expense', ?, ?, ?, ?, 
                    ?, ?, ?, ?, 
                    ?, ?, ?, ?,
                    NOW(), NOW()
                )";
        
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }
        
        // Prepare parameters
        $description = $data['description'];
        $amount = (float) $data['amount'];
        $date = $data['date'];
        $category = $data['category'];
        $paymentMethod = $data['paymentMethod'] ?? '';
        $vendor = $data['vendor'] ?? '';
        $billNumber = $data['billNumber'] ?? '';
        $billDate = $data['billDate'] ?? null;
        $notes = $data['notes'] ?? '';
        $status = $data['status'] ?? 'pending';
        $isRecurring = isset($data['isRecurring']) && $data['isRecurring'] ? 1 : 0;
        $recurringFrequency = $data['recurringFrequency'] ?? null;
        
        $stmt->bind_param(
            "ssdsssssssis",
            $date, $description, $amount, $category,
            $paymentMethod, $vendor, $billNumber, $billDate,
            $notes, $status, $isRecurring, $recurringFrequency
        );
        
        $result = $stmt->execute();
        if (!$result) {
            throw new Exception("Execute failed: " . $stmt->error);
        }
        
        if ($stmt->affected_rows > 0) {
            $expenseId = $stmt->insert_id;
            
            // Return the created expense
            $expense = [
                'id' => $expenseId,
                'description' => $description,
                'amount' => $amount,
                'date' => $date,
                'type' => 'expense',
                'category' => $category,
                'paymentMethod' => $paymentMethod,
                'vendor' => $vendor,
                'billNumber' => $billNumber,
                'billDate' => $billDate,
                'notes' => $notes,
                'status' => $status,
                'isRecurring' => (bool) $isRecurring,
                'recurringFrequency' => $recurringFrequency,
                'created_at' => date('Y-m-d H:i:s')
            ];
            
            sendSuccessResponse($expense, 'Expense added successfully', 201);
        } else {
            throw new Exception("Failed to add expense");
        }
    } catch (Exception $e) {
        sendErrorResponse('Error adding expense: ' . $e->getMessage(), 400);
    }
}

/**
 * Handle PUT requests - Update an existing expense
 */
function handlePutRequest($conn) {
    try {
        // Get request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!$data || !isset($data['id'])) {
            throw new Exception("Invalid request data or missing ID");
        }
        
        // Update expense
        $id = $data['id'];
        
        // Prepare the SET part of the SQL based on provided fields
        $setFields = [];
        $params = [];
        $types = "";
        
        // Add fields that might be updated
        if (isset($data['description'])) {
            $setFields[] = "description = ?";
            $params[] = $data['description'];
            $types .= "s";
        }
        
        if (isset($data['amount'])) {
            $setFields[] = "amount = ?";
            $params[] = (float) $data['amount'];
            $types .= "d";
        }
        
        if (isset($data['date'])) {
            $setFields[] = "date = ?";
            $params[] = $data['date'];
            $types .= "s";
        }
        
        if (isset($data['category'])) {
            $setFields[] = "category = ?";
            $params[] = $data['category'];
            $types .= "s";
        }
        
        if (isset($data['paymentMethod'])) {
            $setFields[] = "payment_method = ?";
            $params[] = $data['paymentMethod'];
            $types .= "s";
        }
        
        if (isset($data['vendor'])) {
            $setFields[] = "vendor = ?";
            $params[] = $data['vendor'];
            $types .= "s";
        }
        
        if (isset($data['billNumber'])) {
            $setFields[] = "bill_number = ?";
            $params[] = $data['billNumber'];
            $types .= "s";
        }
        
        if (isset($data['billDate'])) {
            $setFields[] = "bill_date = ?";
            $params[] = $data['billDate'];
            $types .= "s";
        }
        
        if (isset($data['notes'])) {
            $setFields[] = "notes = ?";
            $params[] = $data['notes'];
            $types .= "s";
        }
        
        if (isset($data['status'])) {
            $setFields[] = "status = ?";
            $params[] = $data['status'];
            $types .= "s";
        }
        
        if (isset($data['isRecurring'])) {
            $setFields[] = "is_recurring = ?";
            $params[] = $data['isRecurring'] ? 1 : 0;
            $types .= "i";
        }
        
        if (isset($data['recurringFrequency'])) {
            $setFields[] = "recurring_frequency = ?";
            $params[] = $data['recurringFrequency'];
            $types .= "s";
        }
        
        // Always update the updated_at timestamp
        $setFields[] = "updated_at = NOW()";
        
        // Add the ID parameter to the end
        $params[] = $id;
        $types .= "i";
        
        // Construct the SQL query
        $sql = "UPDATE financial_ledger 
                SET " . implode(', ', $setFields) . " 
                WHERE id = ? AND type = 'expense'";
        
        // Execute update
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }
        
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        
        if ($stmt->affected_rows > 0 || $stmt->sqlstate === "00000") {
            // Fetch the updated expense
            $sql = "SELECT * FROM financial_ledger WHERE id = ?";
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                throw new Exception("Prepare failed: " . $conn->error);
            }
            
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();
            $expense = $result->fetch_assoc();
            
            if ($expense) {
                $updatedExpense = [
                    'id' => $expense['id'],
                    'date' => $expense['date'],
                    'description' => $expense['description'],
                    'amount' => (float) $expense['amount'],
                    'type' => 'expense',
                    'category' => $expense['category'],
                    'paymentMethod' => $expense['payment_method'],
                    'vendor' => $expense['vendor'],
                    'billNumber' => $expense['bill_number'],
                    'billDate' => $expense['bill_date'],
                    'notes' => $expense['notes'],
                    'status' => $expense['status'],
                    'isRecurring' => (bool) $expense['is_recurring'],
                    'recurringFrequency' => $expense['recurring_frequency'],
                    'updated_at' => $expense['updated_at']
                ];
                
                sendSuccessResponse($updatedExpense, 'Expense updated successfully');
            } else {
                throw new Exception("Expense not found after update");
            }
        } else {
            throw new Exception("No changes made or expense not found");
        }
    } catch (Exception $e) {
        sendErrorResponse('Error updating expense: ' . $e->getMessage(), 400);
    }
}

/**
 * Handle DELETE requests - Delete an expense
 */
function handleDeleteRequest($conn) {
    try {
        // Get the expense ID
        $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
        
        if ($id <= 0) {
            throw new Exception("Invalid expense ID");
        }
        
        // Soft delete by setting is_deleted flag
        $sql = "UPDATE financial_ledger SET is_deleted = 1, updated_at = NOW() WHERE id = ? AND type = 'expense'";
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }
        
        $stmt->bind_param("i", $id);
        $stmt->execute();
        
        if ($stmt->affected_rows > 0) {
            sendSuccessResponse(['id' => $id], 'Expense deleted successfully');
        } else {
            throw new Exception("Expense not found or already deleted");
        }
    } catch (Exception $e) {
        sendErrorResponse('Error deleting expense: ' . $e->getMessage(), 400);
    }
}

// Helper function to get database connection
if (!function_exists('getDbConnection')) {
function getDbConnection() {
    $host = getenv('DB_HOST') ?: 'localhost';
    $username = getenv('DB_USER') ?: 'root';
    $password = getenv('DB_PASSWORD') ?: '';
    $database = getenv('DB_NAME') ?: 'cab_booking';
    
    $conn = new mysqli($host, $username, $password, $database);
    
    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }
    
    $conn->set_charset("utf8mb4");
    return $conn;
}
}
