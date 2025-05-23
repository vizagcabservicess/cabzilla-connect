<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');
// Include necessary files
require_once __DIR__ . '/../utils/database.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth.php';

// Ensure user is authenticated
validateAdminAuth();

// Get the request method
$method = $_SERVER['REQUEST_METHOD'];

// Get query parameters
$action = isset($_GET['action']) ? $_GET['action'] : null;

// Connect to database
$db = connectToDatabase();

// Process based on method and action
switch ($method) {
    case 'GET':
        if ($action === 'summary') {
            getLedgerSummary($db);
        } elseif ($action === 'categories') {
            getCategorySummaries($db);
        } elseif ($action === 'payment-methods') {
            getPaymentMethodSummaries($db);
        } elseif ($action === 'entity-summaries') {
            getEntitySummaries($db);
        } elseif ($action === 'vehicle-emis') {
            getVehicleEmis($db);
        } else {
            getLedgerEntries($db);
        }
        break;
    case 'POST':
        createLedgerEntry($db);
        break;
    case 'PUT':
        updateLedgerEntry($db);
        break;
    case 'DELETE':
        deleteLedgerEntry($db);
        break;
    default:
        sendErrorResponse("Unsupported request method", [], 405);
        break;
}

// Get ledger entries with filters
function getLedgerEntries($db) {
    try {
        // Get query parameters for filtering
        $filters = [];
        $params = [];
        $query = "SELECT * FROM financial_ledger WHERE 1=1";
        
        // Date range filter
        if (isset($_GET['from_date']) && isset($_GET['to_date'])) {
            $query .= " AND date BETWEEN ? AND ?";
            $params[] = $_GET['from_date'];
            $params[] = $_GET['to_date'];
        }
        
        // Type filter
        if (isset($_GET['type']) && $_GET['type'] !== 'all') {
            $query .= " AND type = ?";
            $params[] = $_GET['type'];
        }
        
        // Category filter
        if (isset($_GET['category'])) {
            $query .= " AND category = ?";
            $params[] = $_GET['category'];
        }
        
        // Payment method filter
        if (isset($_GET['payment_method'])) {
            $query .= " AND payment_method = ?";
            $params[] = $_GET['payment_method'];
        }
        
        // Entity filter
        if (isset($_GET['entity_type']) && isset($_GET['entity_id'])) {
            $query .= " AND entity_type = ? AND entity_id = ?";
            $params[] = $_GET['entity_type'];
            $params[] = $_GET['entity_id'];
        }
        
        // Status filter
        if (isset($_GET['status']) && $_GET['status'] !== 'all') {
            $query .= " AND status = ?";
            $params[] = $_GET['status'];
        }
        
        // Search filter
        if (isset($_GET['search']) && !empty($_GET['search'])) {
            $query .= " AND (description LIKE ? OR reference LIKE ?)";
            $searchTerm = "%" . $_GET['search'] . "%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }
        
        // Amount range filter
        if (isset($_GET['min_amount'])) {
            $query .= " AND amount >= ?";
            $params[] = $_GET['min_amount'];
        }
        if (isset($_GET['max_amount'])) {
            $query .= " AND amount <= ?";
            $params[] = $_GET['max_amount'];
        }
        
        // Order by
        $query .= " ORDER BY date DESC, id DESC";
        
        // Limit and offset for pagination
        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 100;
        $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
        $query .= " LIMIT ? OFFSET ?";
        $params[] = $limit;
        $params[] = $offset;
        
        // Prepare and execute the query
        $stmt = $db->prepare($query);
        if ($stmt === false) {
            sendErrorResponse("Database error: " . $db->error);
        }
        
        // Bind parameters dynamically
        if (count($params) > 0) {
            $types = str_repeat('s', count($params));
            $stmt->bind_param($types, ...$params);
        }
        
        $stmt->execute();
        $result = $stmt->get_result();
        
        // Fetch all entries
        $entries = [];
        $running_balance = 0;  // Initialize running balance
        
        while ($row = $result->fetch_assoc()) {
            // Adjust balance based on transaction type
            if ($row['type'] === 'income') {
                $running_balance += $row['amount'];
            } else {
                $running_balance -= $row['amount'];
            }
            
            // Add balance to the row
            $row['balance'] = $running_balance;
            $entries[] = $row;
        }
        
        // Return the entries
        sendSuccessResponse($entries, "Ledger entries fetched successfully");
    } catch (Exception $e) {
        sendErrorResponse("Error fetching ledger entries: " . $e->getMessage());
    }
}

// Get ledger summary
function getLedgerSummary($db) {
    try {
        // Get query parameters for filtering
        $params = [];
        $whereClause = "1=1";
        
        // Date range filter
        if (isset($_GET['from_date']) && isset($_GET['to_date'])) {
            $whereClause .= " AND date BETWEEN ? AND ?";
            $params[] = $_GET['from_date'];
            $params[] = $_GET['to_date'];
        }
        
        // Type filter
        if (isset($_GET['type']) && $_GET['type'] !== 'all') {
            $whereClause .= " AND type = ?";
            $params[] = $_GET['type'];
        }
        
        // Prepare and execute query for income
        $incomeQuery = "SELECT SUM(amount) as total FROM financial_ledger WHERE $whereClause AND type = 'income'";
        $stmt = $db->prepare($incomeQuery);
        
        // Bind parameters if needed
        if (count($params) > 0) {
            $types = str_repeat('s', count($params));
            $stmt->bind_param($types, ...$params);
        }
        
        $stmt->execute();
        $incomeResult = $stmt->get_result()->fetch_assoc();
        $totalIncome = $incomeResult['total'] ? floatval($incomeResult['total']) : 0;
        
        // Add 'expense' type to parameters for expense query
        $expenseParams = $params;
        $expenseParams[] = 'expense';
        $expenseParams[] = 'emi';
        
        // Prepare and execute query for expenses
        $expenseWhereClause = $whereClause . " AND type IN (?, ?)";
        $expenseQuery = "SELECT SUM(amount) as total FROM financial_ledger WHERE $expenseWhereClause";
        $stmt = $db->prepare($expenseQuery);
        
        // Bind parameters
        $types = str_repeat('s', count($expenseParams));
        $stmt->bind_param($types, ...$expenseParams);
        
        $stmt->execute();
        $expenseResult = $stmt->get_result()->fetch_assoc();
        $totalExpenses = $expenseResult['total'] ? floatval($expenseResult['total']) : 0;
        
        // Query for cash accepted
        $cashQuery = "SELECT SUM(amount) as total FROM financial_ledger WHERE $whereClause AND type = 'income' AND payment_method = 'Cash'";
        $stmt = $db->prepare($cashQuery);
        
        if (count($params) > 0) {
            $types = str_repeat('s', count($params));
            $stmt->bind_param($types, ...$params);
        }
        
        $stmt->execute();
        $cashResult = $stmt->get_result()->fetch_assoc();
        $cashAccepted = $cashResult['total'] ? floatval($cashResult['total']) : 0;
        
        // Query for bank account
        $bankParams = $params;
        $bankParams[] = 'Bank Transfer';
        $bankParams[] = 'Card';
        
        $bankWhereClause = $whereClause . " AND type = 'income' AND payment_method IN (?, ?)";
        $bankQuery = "SELECT SUM(amount) as total FROM financial_ledger WHERE $bankWhereClause";
        $stmt = $db->prepare($bankQuery);
        
        $types = str_repeat('s', count($bankParams));
        $stmt->bind_param($types, ...$bankParams);
        
        $stmt->execute();
        $bankResult = $stmt->get_result()->fetch_assoc();
        $inBankAccount = $bankResult['total'] ? floatval($bankResult['total']) : 0;
        
        // Query for pending payments
        $pendingQuery = "SELECT SUM(amount) as total FROM financial_ledger WHERE $whereClause AND status = 'pending'";
        $stmt = $db->prepare($pendingQuery);
        
        if (count($params) > 0) {
            $types = str_repeat('s', count($params));
            $stmt->bind_param($types, ...$params);
        }
        
        $stmt->execute();
        $pendingResult = $stmt->get_result()->fetch_assoc();
        $pendingPayments = $pendingResult['total'] ? floatval($pendingResult['total']) : 0;
        
        // Create summary object
        $summary = [
            'totalIncome' => $totalIncome,
            'totalExpenses' => $totalExpenses,
            'netBalance' => $totalIncome - $totalExpenses,
            'cashAccepted' => $cashAccepted,
            'inBankAccount' => $inBankAccount,
            'pendingPayments' => $pendingPayments
        ];
        
        // Return the summary
        sendSuccessResponse($summary, "Ledger summary fetched successfully");
    } catch (Exception $e) {
        sendErrorResponse("Error fetching ledger summary: " . $e->getMessage());
    }
}

// Get category summaries
function getCategorySummaries($db) {
    try {
        // Get query parameters for filtering
        $params = [];
        $whereClause = "1=1";
        
        // Date range filter
        if (isset($_GET['from_date']) && isset($_GET['to_date'])) {
            $whereClause .= " AND date BETWEEN ? AND ?";
            $params[] = $_GET['from_date'];
            $params[] = $_GET['to_date'];
        }
        
        // Type filter
        if (isset($_GET['type']) && $_GET['type'] !== 'all') {
            $whereClause .= " AND type = ?";
            $params[] = $_GET['type'];
        }
        
        // Query for total amount
        $totalQuery = "SELECT SUM(amount) as total FROM financial_ledger WHERE $whereClause";
        $stmt = $db->prepare($totalQuery);
        
        if (count($params) > 0) {
            $types = str_repeat('s', count($params));
            $stmt->bind_param($types, ...$params);
        }
        
        $stmt->execute();
        $totalResult = $stmt->get_result()->fetch_assoc();
        $totalAmount = $totalResult['total'] ? floatval($totalResult['total']) : 0;
        
        // Query for category breakdowns
        $query = "SELECT category, SUM(amount) as amount, COUNT(*) as count 
                 FROM financial_ledger 
                 WHERE $whereClause 
                 GROUP BY category 
                 ORDER BY amount DESC";
        
        $stmt = $db->prepare($query);
        
        if (count($params) > 0) {
            $types = str_repeat('s', count($params));
            $stmt->bind_param($types, ...$params);
        }
        
        $stmt->execute();
        $result = $stmt->get_result();
        
        $categories = [];
        while ($row = $result->fetch_assoc()) {
            $percentage = $totalAmount > 0 ? ($row['amount'] / $totalAmount) * 100 : 0;
            
            $categories[] = [
                'category' => $row['category'],
                'amount' => floatval($row['amount']),
                'percentage' => $percentage,
                'count' => intval($row['count'])
            ];
        }
        
        sendSuccessResponse($categories, "Category summaries fetched successfully");
    } catch (Exception $e) {
        sendErrorResponse("Error fetching category summaries: " . $e->getMessage());
    }
}

// Get payment method summaries
function getPaymentMethodSummaries($db) {
    try {
        // Get query parameters for filtering
        $params = [];
        $whereClause = "1=1";
        
        // Date range filter
        if (isset($_GET['from_date']) && isset($_GET['to_date'])) {
            $whereClause .= " AND date BETWEEN ? AND ?";
            $params[] = $_GET['from_date'];
            $params[] = $_GET['to_date'];
        }
        
        // Type filter
        if (isset($_GET['type']) && $_GET['type'] !== 'all') {
            $whereClause .= " AND type = ?";
            $params[] = $_GET['type'];
        }
        
        // Query for payment method breakdowns
        $query = "SELECT payment_method as method, SUM(amount) as amount, COUNT(*) as count 
                 FROM financial_ledger 
                 WHERE $whereClause 
                 GROUP BY payment_method 
                 ORDER BY amount DESC";
        
        $stmt = $db->prepare($query);
        
        if (count($params) > 0) {
            $types = str_repeat('s', count($params));
            $stmt->bind_param($types, ...$params);
        }
        
        $stmt->execute();
        $result = $stmt->get_result();
        
        $methods = [];
        while ($row = $result->fetch_assoc()) {
            $methods[] = [
                'method' => $row['method'],
                'amount' => floatval($row['amount']),
                'count' => intval($row['count'])
            ];
        }
        
        sendSuccessResponse($methods, "Payment method summaries fetched successfully");
    } catch (Exception $e) {
        sendErrorResponse("Error fetching payment method summaries: " . $e->getMessage());
    }
}

// Get entity summaries
function getEntitySummaries($db) {
    try {
        $entityType = isset($_GET['entity_type']) ? $_GET['entity_type'] : 'vehicle';
        
        // Determine the entity ID and name fields based on entity type
        switch ($entityType) {
            case 'vehicle':
                $entityTable = "vehicles";
                $entityIdField = "vehicle_id";
                $entityNameField = "vehicle_number";
                break;
            case 'driver':
                $entityTable = "drivers";
                $entityIdField = "driver_id";
                $entityNameField = "name";
                break;
            case 'customer':
                $entityTable = "customers";
                $entityIdField = "customer_id";
                $entityNameField = "name";
                break;
            case 'project':
                $entityTable = "projects";
                $entityIdField = "project_id";
                $entityNameField = "name";
                break;
            default:
                sendErrorResponse("Invalid entity type");
                return;
        }
        
        // Query to get entities with their financial data
        $query = "SELECT e.{$entityIdField} as id, e.{$entityNameField} as name,
                 COALESCE(SUM(CASE WHEN fl.type = 'income' THEN fl.amount ELSE 0 END), 0) as income,
                 COALESCE(SUM(CASE WHEN fl.type IN ('expense', 'emi') THEN fl.amount ELSE 0 END), 0) as expense
                 FROM {$entityTable} e
                 LEFT JOIN financial_ledger fl ON fl.entity_id = e.{$entityIdField} AND fl.entity_type = ?
                 GROUP BY e.{$entityIdField}, e.{$entityNameField}";
        
        $stmt = $db->prepare($query);
        $stmt->bind_param('s', $entityType);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $entities = [];
        while ($row = $result->fetch_assoc()) {
            $income = floatval($row['income']);
            $expense = floatval($row['expense']);
            
            $entities[] = [
                'id' => $row['id'],
                'name' => $row['name'],
                'income' => $income,
                'expense' => $expense,
                'balance' => $income - $expense
            ];
        }
        
        // Sort by balance in descending order
        usort($entities, function($a, $b) {
            return $b['balance'] <=> $a['balance'];
        });
        
        sendSuccessResponse($entities, "Entity summaries fetched successfully");
    } catch (Exception $e) {
        sendErrorResponse("Error fetching entity summaries: " . $e->getMessage());
    }
}

// Get vehicle EMIs
function getVehicleEmis($db) {
    try {
        $query = "SELECT ve.id, v.vehicle_id as vehicleId, v.vehicle_number as vehicleNumber, 
                 ve.amount as emiAmount, ve.due_date as dueDate, ve.status, 
                 ve.bank_name as bankName, ve.loan_reference as loanRef
                 FROM vehicle_emis ve
                 JOIN vehicles v ON ve.vehicle_id = v.vehicle_id
                 ORDER BY ve.due_date ASC";
        
        $stmt = $db->prepare($query);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $emis = [];
        while ($row = $result->fetch_assoc()) {
            $emis[] = [
                'id' => $row['id'],
                'vehicleId' => $row['vehicleId'],
                'vehicleNumber' => $row['vehicleNumber'],
                'emiAmount' => floatval($row['emiAmount']),
                'dueDate' => $row['dueDate'],
                'status' => $row['status'],
                'bankName' => $row['bankName'],
                'loanRef' => $row['loanRef']
            ];
        }
        
        sendSuccessResponse($emis, "Vehicle EMIs fetched successfully");
    } catch (Exception $e) {
        sendErrorResponse("Error fetching vehicle EMIs: " . $e->getMessage());
    }
}

// Create new ledger entry
function createLedgerEntry($db) {
    try {
        // Get request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate required fields
        $requiredFields = ['date', 'description', 'amount', 'type', 'category', 'payment_method'];
        $validation = validateRequiredFields($data, $requiredFields);
        
        if (!$validation['valid']) {
            sendErrorResponse("Missing required fields: " . implode(', ', $validation['missing']), $validation);
            return;
        }
        
        // Insert query
        $query = "INSERT INTO financial_ledger (date, description, amount, type, category, payment_method, 
                 reference, entity_type, entity_id, status, notes, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
        
        $stmt = $db->prepare($query);
        
        // Set default values for optional fields
        $reference = isset($data['reference']) ? $data['reference'] : null;
        $entityType = isset($data['entityType']) ? $data['entityType'] : null;
        $entityId = isset($data['entityId']) ? $data['entityId'] : null;
        $status = isset($data['status']) ? $data['status'] : 'completed';
        $notes = isset($data['notes']) ? $data['notes'] : null;
        
        // Bind parameters
        $stmt->bind_param('ssdsssssss', 
            $data['date'],
            $data['description'],
            $data['amount'],
            $data['type'],
            $data['category'],
            $data['payment_method'],
            $reference,
            $entityType,
            $entityId,
            $status,
            $notes
        );
        
        $stmt->execute();
        $newId = $db->insert_id;
        
        // Fetch the created entry
        $query = "SELECT * FROM financial_ledger WHERE id = ?";
        $stmt = $db->prepare($query);
        $stmt->bind_param('i', $newId);
        $stmt->execute();
        $result = $stmt->get_result();
        $entry = $result->fetch_assoc();
        
        sendSuccessResponse($entry, "Ledger entry created successfully");
    } catch (Exception $e) {
        sendErrorResponse("Error creating ledger entry: " . $e->getMessage());
    }
}

// Update ledger entry
function updateLedgerEntry($db) {
    try {
        // Get entry ID from URL
        $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
        
        if ($id <= 0) {
            sendErrorResponse("Invalid entry ID", [], 400);
            return;
        }
        
        // Get request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (empty($data)) {
            sendErrorResponse("No data provided for update", [], 400);
            return;
        }
        
        // Build update query
        $updateFields = [];
        $params = [];
        $types = '';
        
        // Check each possible field and add to update if present
        if (isset($data['date'])) {
            $updateFields[] = "date = ?";
            $params[] = $data['date'];
            $types .= 's';
        }
        
        if (isset($data['description'])) {
            $updateFields[] = "description = ?";
            $params[] = $data['description'];
            $types .= 's';
        }
        
        if (isset($data['amount'])) {
            $updateFields[] = "amount = ?";
            $params[] = $data['amount'];
            $types .= 'd';
        }
        
        if (isset($data['type'])) {
            $updateFields[] = "type = ?";
            $params[] = $data['type'];
            $types .= 's';
        }
        
        if (isset($data['category'])) {
            $updateFields[] = "category = ?";
            $params[] = $data['category'];
            $types .= 's';
        }
        
        if (isset($data['payment_method'])) {
            $updateFields[] = "payment_method = ?";
            $params[] = $data['payment_method'];
            $types .= 's';
        }
        
        if (isset($data['reference'])) {
            $updateFields[] = "reference = ?";
            $params[] = $data['reference'];
            $types .= 's';
        }
        
        if (isset($data['entity_type'])) {
            $updateFields[] = "entity_type = ?";
            $params[] = $data['entity_type'];
            $types .= 's';
        }
        
        if (isset($data['entity_id'])) {
            $updateFields[] = "entity_id = ?";
            $params[] = $data['entity_id'];
            $types .= 's';
        }
        
        if (isset($data['status'])) {
            $updateFields[] = "status = ?";
            $params[] = $data['status'];
            $types .= 's';
        }
        
        if (isset($data['notes'])) {
            $updateFields[] = "notes = ?";
            $params[] = $data['notes'];
            $types .= 's';
        }
        
        // Always update the updated_at timestamp
        $updateFields[] = "updated_at = NOW()";
        
        // If no fields to update, return
        if (empty($updateFields)) {
            sendErrorResponse("No valid fields provided for update", [], 400);
            return;
        }
        
        // Build the query
        $query = "UPDATE financial_ledger SET " . implode(', ', $updateFields) . " WHERE id = ?";
        
        // Add ID to params and types
        $params[] = $id;
        $types .= 'i';
        
        // Prepare and execute query
        $stmt = $db->prepare($query);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        
        if ($stmt->affected_rows === 0) {
            sendErrorResponse("No changes made or entry not found", [], 404);
            return;
        }
        
        // Fetch the updated entry
        $query = "SELECT * FROM financial_ledger WHERE id = ?";
        $stmt = $db->prepare($query);
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            sendErrorResponse("Entry not found after update", [], 404);
            return;
        }
        
        $entry = $result->fetch_assoc();
        sendSuccessResponse($entry, "Ledger entry updated successfully");
    } catch (Exception $e) {
        sendErrorResponse("Error updating ledger entry: " . $e->getMessage());
    }
}

// Delete ledger entry
function deleteLedgerEntry($db) {
    try {
        // Get entry ID from URL
        $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
        
        if ($id <= 0) {
            sendErrorResponse("Invalid entry ID", [], 400);
            return;
        }
        
        // Check if entry exists
        $checkQuery = "SELECT id FROM financial_ledger WHERE id = ?";
        $stmt = $db->prepare($checkQuery);
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            sendErrorResponse("Entry not found", [], 404);
            return;
        }
        
        // Delete the entry
        $query = "DELETE FROM financial_ledger WHERE id = ?";
        $stmt = $db->prepare($query);
        $stmt->bind_param('i', $id);
        $stmt->execute();
        
        sendSuccessResponse(['id' => $id], "Ledger entry deleted successfully");
    } catch (Exception $e) {
        sendErrorResponse("Error deleting ledger entry: " . $e->getMessage());
    }
}
