<?php
// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

/**
 * API endpoint for payroll management
 */

// Include necessary files
require_once __DIR__ . '/../utils/database.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../common/db_helper.php';
require_once __DIR__ . '/db_setup.php';

// Set up CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Pre-flight OPTIONS request handler
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    sendErrorResponse('Database connection failed', 500);
}

// Get the HTTP method
$method = $_SERVER['REQUEST_METHOD'];

// Process based on method and action parameter
try {
    // Initialize the request data
    $requestBody = file_get_contents('php://input');
    $requestData = json_decode($requestBody, true) ?? [];
    
    // Get query parameters
    $action = $_GET['action'] ?? ($requestData['action'] ?? '');
    
    // Action router
    switch ($method) {
        case 'GET':
            if ($action === 'salary_components') {
                getSalaryComponents($conn);
            } else if ($action === 'summary') {
                getPayrollSummary($conn);
            } else if ($action === 'driver_summary') {
                $driverId = $_GET['driver_id'] ?? null;
                getDriverPaySummary($conn, $driverId);
            } else {
                getPayrollEntries($conn);
            }
            break;
            
        case 'POST':
            if ($action === 'salary_component') {
                addSalaryComponent($conn, $requestData);
            } else if ($action === 'attendance') {
                recordAttendance($conn, $requestData);
            } else if ($action === 'advance') {
                recordSalaryAdvance($conn, $requestData);
            } else if ($action === 'add_payroll') {
                addPayrollEntry($conn, $requestData);
            } else {
                sendErrorResponse('Invalid action specified', 400);
            }
            break;
            
        case 'PUT':
            if ($action === 'salary_component') {
                updateSalaryComponent($conn, $requestData);
            } else if ($action === 'attendance') {
                updateAttendance($conn, $requestData);
            } else {
                updatePayrollEntry($conn, $requestData);
            }
            break;
            
        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                sendErrorResponse('ID is required for deletion', 400);
            }
            
            if ($action === 'salary_component') {
                deleteSalaryComponent($conn, $id);
            } else if ($action === 'attendance') {
                deleteAttendance($conn, $id);
            } else if ($action === 'advance') {
                deleteSalaryAdvance($conn, $id);
            } else {
                deletePayrollEntry($conn, $id);
            }
            break;
            
        default:
            sendErrorResponse('Method not allowed', 405);
    }
} catch (Exception $e) {
    sendErrorResponse('Error: ' . $e->getMessage(), 500);
}

/**
 * Get salary components
 */
function getSalaryComponents($conn) {
    try {
        $query = "SELECT * FROM salary_components ORDER BY type, name";
        $result = executeQuery($conn, $query);
        
        $components = [];
        while ($row = $result->fetch_assoc()) {
            $components[] = [
                'id' => $row['id'],
                'name' => $row['name'],
                'type' => $row['type'],
                'amount' => (float)$row['amount'],
                'isFixed' => (bool)$row['is_fixed'],
                'calculationMethod' => $row['calculation_method'],
                'calculationBase' => $row['calculation_base'],
                'calculationValue' => ($row['calculation_value'] !== null) ? (float)$row['calculation_value'] : null,
                'description' => $row['description']
            ];
        }
        
        sendSuccessResponse($components);
    } catch (Exception $e) {
        sendErrorResponse('Failed to fetch salary components: ' . $e->getMessage(), 500);
    }
}

/**
 * Add a new salary component
 */
function addSalaryComponent($conn, $data) {
    try {
        // Validate required fields
        if (!isset($data['name']) || !isset($data['type']) || !isset($data['amount'])) {
            sendErrorResponse('Name, type, and amount are required fields', 400);
        }
        
        $name = $data['name'];
        $type = $data['type'];
        $amount = $data['amount'];
        $isFixed = isset($data['isFixed']) ? (int)$data['isFixed'] : 1;
        $calculationMethod = $data['calculationMethod'] ?? null;
        $calculationBase = $data['calculationBase'] ?? null;
        $calculationValue = $data['calculationValue'] ?? null;
        $description = $data['description'] ?? null;
        
        $sql = "INSERT INTO salary_components 
                (name, type, amount, is_fixed, calculation_method, calculation_base, calculation_value, description) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
                
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ssdiisds", $name, $type, $amount, $isFixed, $calculationMethod, $calculationBase, $calculationValue, $description);
        $stmt->execute();
        
        $id = $conn->insert_id;
        
        $component = [
            'id' => $id,
            'name' => $name,
            'type' => $type,
            'amount' => (float)$amount,
            'isFixed' => (bool)$isFixed,
            'calculationMethod' => $calculationMethod,
            'calculationBase' => $calculationBase,
            'calculationValue' => $calculationValue !== null ? (float)$calculationValue : null,
            'description' => $description
        ];
        
        sendSuccessResponse($component, 'Salary component added successfully');
    } catch (Exception $e) {
        sendErrorResponse('Failed to add salary component: ' . $e->getMessage(), 500);
    }
}

/**
 * Update a salary component
 */
function updateSalaryComponent($conn, $data) {
    try {
        // Validate required fields
        if (!isset($data['id'])) {
            sendErrorResponse('Component ID is required', 400);
        }
        
        $id = $data['id'];
        $name = $data['name'] ?? null;
        $type = $data['type'] ?? null;
        $amount = $data['amount'] ?? null;
        $isFixed = isset($data['isFixed']) ? (int)$data['isFixed'] : null;
        $calculationMethod = $data['calculationMethod'] ?? null;
        $calculationBase = $data['calculationBase'] ?? null;
        $calculationValue = $data['calculationValue'] ?? null;
        $description = $data['description'] ?? null;
        
        // Build update query dynamically based on provided fields
        $updates = [];
        $params = [];
        $types = "";
        
        if ($name !== null) {
            $updates[] = "name = ?";
            $params[] = $name;
            $types .= "s";
        }
        
        if ($type !== null) {
            $updates[] = "type = ?";
            $params[] = $type;
            $types .= "s";
        }
        
        if ($amount !== null) {
            $updates[] = "amount = ?";
            $params[] = $amount;
            $types .= "d";
        }
        
        if ($isFixed !== null) {
            $updates[] = "is_fixed = ?";
            $params[] = $isFixed;
            $types .= "i";
        }
        
        if (array_key_exists('calculationMethod', $data)) {
            $updates[] = "calculation_method = ?";
            $params[] = $calculationMethod;
            $types .= "s";
        }
        
        if (array_key_exists('calculationBase', $data)) {
            $updates[] = "calculation_base = ?";
            $params[] = $calculationBase;
            $types .= "s";
        }
        
        if (array_key_exists('calculationValue', $data)) {
            $updates[] = "calculation_value = ?";
            $params[] = $calculationValue;
            $types .= "d";
        }
        
        if (array_key_exists('description', $data)) {
            $updates[] = "description = ?";
            $params[] = $description;
            $types .= "s";
        }
        
        if (empty($updates)) {
            sendErrorResponse('No fields provided for update', 400);
        }
        
        $sql = "UPDATE salary_components SET " . implode(", ", $updates) . " WHERE id = ?";
        $params[] = $id;
        $types .= "i";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        
        if ($stmt->affected_rows === 0) {
            sendErrorResponse('Salary component not found or no changes made', 404);
        }
        
        // Fetch updated component
        $query = "SELECT * FROM salary_components WHERE id = ?";
        $stmtSelect = $conn->prepare($query);
        $stmtSelect->bind_param("i", $id);
        $stmtSelect->execute();
        $result = $stmtSelect->get_result();
        
        if ($row = $result->fetch_assoc()) {
            $component = [
                'id' => $row['id'],
                'name' => $row['name'],
                'type' => $row['type'],
                'amount' => (float)$row['amount'],
                'isFixed' => (bool)$row['is_fixed'],
                'calculationMethod' => $row['calculation_method'],
                'calculationBase' => $row['calculation_base'],
                'calculationValue' => ($row['calculation_value'] !== null) ? (float)$row['calculation_value'] : null,
                'description' => $row['description']
            ];
            
            sendSuccessResponse($component, 'Salary component updated successfully');
        } else {
            sendErrorResponse('Failed to retrieve updated component', 500);
        }
    } catch (Exception $e) {
        sendErrorResponse('Failed to update salary component: ' . $e->getMessage(), 500);
    }
}

/**
 * Get payroll entries with filters
 */
function getPayrollEntries($conn) {
    try {
        $conditions = [];
        $params = [];
        $types = "";
        
        // Apply filters
        if (isset($_GET['from_date'])) {
            $fromDate = $_GET['from_date'];
            $conditions[] = "(p.pay_period_start >= ? OR p.pay_period_end >= ?)";
            $params[] = $fromDate;
            $params[] = $fromDate;
            $types .= "ss";
        }
        
        if (isset($_GET['to_date'])) {
            $toDate = $_GET['to_date'];
            $conditions[] = "(p.pay_period_start <= ? OR p.pay_period_end <= ?)";
            $params[] = $toDate;
            $params[] = $toDate;
            $types .= "ss";
        }
        
        if (isset($_GET['driver_id'])) {
            $driverId = $_GET['driver_id'];
            $conditions[] = "p.driver_id = ?";
            $params[] = $driverId;
            $types .= "s";
        }
        
        if (isset($_GET['payment_status']) && $_GET['payment_status'] !== 'all') {
            $paymentStatus = $_GET['payment_status'];
            $conditions[] = "p.payment_status = ?";
            $params[] = $paymentStatus;
            $types .= "s";
        }
        
        $whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";
        
        // Get payroll entries
        $sql = "
            SELECT p.*,
                   d.name AS driver_name
            FROM payroll_entries p
            LEFT JOIN drivers d ON p.driver_id = d.id
            $whereClause
            ORDER BY p.date DESC
        ";
        
        $stmt = $conn->prepare($sql);
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        
        $entries = [];
        while ($row = $result->fetch_assoc()) {
            // Get allowances for this payroll
            $allowancesQuery = "SELECT type, amount FROM payroll_allowances WHERE payroll_id = ?";
            $allowancesStmt = $conn->prepare($allowancesQuery);
            $allowancesStmt->bind_param("i", $row['id']);
            $allowancesStmt->execute();
            $allowancesResult = $allowancesStmt->get_result();
            
            $allowances = [];
            while ($allowanceRow = $allowancesResult->fetch_assoc()) {
                $allowances[] = [
                    'type' => $allowanceRow['type'],
                    'amount' => (float)$allowanceRow['amount']
                ];
            }
            
            // Get deductions for this payroll
            $deductionsQuery = "SELECT type, amount FROM payroll_deductions WHERE payroll_id = ?";
            $deductionsStmt = $conn->prepare($deductionsQuery);
            $deductionsStmt->bind_param("i", $row['id']);
            $deductionsStmt->execute();
            $deductionsResult = $deductionsStmt->get_result();
            
            $deductions = [];
            while ($deductionRow = $deductionsResult->fetch_assoc()) {
                $deductions[] = [
                    'type' => $deductionRow['type'],
                    'amount' => (float)$deductionRow['amount']
                ];
            }
            
            // Get advances for this payroll
            $advancesQuery = "SELECT date, amount, notes FROM salary_advances WHERE driver_id = ? AND date BETWEEN ? AND ?";
            $advancesStmt = $conn->prepare($advancesQuery);
            $advancesStmt->bind_param("sss", $row['driver_id'], $row['pay_period_start'], $row['pay_period_end']);
            $advancesStmt->execute();
            $advancesResult = $advancesStmt->get_result();
            
            $advances = [];
            while ($advanceRow = $advancesResult->fetch_assoc()) {
                $advances[] = [
                    'date' => $advanceRow['date'],
                    'amount' => (float)$advanceRow['amount'],
                    'notes' => $advanceRow['notes']
                ];
            }
            
            $driverName = $row['driver_name'] ?? 'Unknown Driver';
            
            $entries[] = [
                'id' => $row['id'],
                'driverId' => $row['driver_id'],
                'date' => $row['date'],
                'description' => $row['description'],
                'amount' => (float)$row['amount'],
                'type' => $row['type'],
                'category' => $row['category'],
                'paymentMethod' => $row['payment_method'],
                'status' => $row['status'],
                'payPeriod' => [
                    'startDate' => $row['pay_period_start'],
                    'endDate' => $row['pay_period_end'],
                ],
                'basicSalary' => (float)$row['basic_salary'],
                'allowances' => $allowances,
                'deductions' => $deductions,
                'advances' => $advances,
                'daysWorked' => (int)$row['days_worked'],
                'daysLeave' => (int)$row['days_leave'],
                'overtimeHours' => (float)$row['overtime_hours'],
                'netSalary' => (float)$row['net_salary'],
                'paymentStatus' => $row['payment_status'],
                'paymentDate' => $row['payment_date'],
                'payslipIssued' => (bool)$row['payslip_issued'],
                'created_at' => $row['created_at'],
                'updated_at' => $row['updated_at']
            ];
        }
        
        sendSuccessResponse($entries);
    } catch (Exception $e) {
        sendErrorResponse('Failed to fetch payroll entries: ' . $e->getMessage(), 500);
    }
}

/**
 * Add a new payroll entry
 */
function addPayrollEntry($conn, $data) {
    try {
        // Begin transaction
        $conn->begin_transaction();
        
        // Validate required fields
        if (!isset($data['driverId']) || !isset($data['basicSalary']) || !isset($data['payPeriod'])) {
            $conn->rollback();
            sendErrorResponse('Driver ID, basic salary, and pay period are required', 400);
        }
        
        $driverId = $data['driverId'];
        $date = $data['date'] ?? date('Y-m-d');
        $description = $data['description'] ?? "Salary payment for " . date('F Y', strtotime($data['payPeriod']['startDate']));
        $payPeriodStart = $data['payPeriod']['startDate'];
        $payPeriodEnd = $data['payPeriod']['endDate'];
        $basicSalary = $data['basicSalary'];
        $allowances = $data['allowances'] ?? [];
        $deductions = $data['deductions'] ?? [];
        $advances = $data['advances'] ?? [];
        $daysWorked = $data['daysWorked'] ?? 0;
        $daysLeave = $data['daysLeave'] ?? 0;
        $overtimeHours = $data['overtimeHours'] ?? 0;
        $paymentStatus = $data['paymentStatus'] ?? 'pending';
        $paymentDate = $data['paymentDate'] ?? null;
        $paymentMethod = $data['paymentMethod'] ?? 'Bank Transfer';
        
        // Calculate totals
        $totalAllowances = 0;
        foreach ($allowances as $allowance) {
            $totalAllowances += $allowance['amount'];
        }
        
        $totalDeductions = 0;
        foreach ($deductions as $deduction) {
            $totalDeductions += $deduction['amount'];
        }
        
        $totalAdvances = 0;
        foreach ($advances as $advance) {
            $totalAdvances += $advance['amount'];
        }
        
        $netSalary = $basicSalary + $totalAllowances - $totalDeductions - $totalAdvances;
        
        // Insert payroll entry
        $sql = "
            INSERT INTO payroll_entries (
                driver_id, date, description, amount, type, category, 
                payment_method, status, pay_period_start, pay_period_end, 
                basic_salary, days_worked, days_leave, overtime_hours, 
                net_salary, payment_status, payment_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ";
        
        $status = ($paymentStatus === 'paid') ? 'reconciled' : 'pending';
        
        // Assign all bind_param arguments to variables
        $driverIdVar = $driverId;
        $dateVar = $date;
        $descriptionVar = $description;
        $netSalaryVar = $netSalary;
        $typeVar = $data['type'] ?? 'expense';
        $categoryVar = $data['category'] ?? 'Salary';
        $paymentMethodVar = $paymentMethod;
        $statusVar = $status;
        $payPeriodStartVar = $payPeriodStart;
        $payPeriodEndVar = $payPeriodEnd;
        $basicSalaryVar = $basicSalary;
        $daysWorkedVar = $daysWorked;
        $daysLeaveVar = $daysLeave;
        $overtimeHoursVar = $overtimeHours;
        $netSalaryVar2 = $netSalary;
        $paymentStatusVar = $paymentStatus;
        $paymentDateVar = $paymentDate;
        $stmt = $conn->prepare($sql);
        $stmt->bind_param(
            "sssdssssssdiiidss",
            $driverIdVar, $dateVar, $descriptionVar, $netSalaryVar, 
            $typeVar, $categoryVar, 
            $paymentMethodVar, $statusVar, $payPeriodStartVar, $payPeriodEndVar, 
            $basicSalaryVar, $daysWorkedVar, $daysLeaveVar, $overtimeHoursVar, 
            $netSalaryVar2, $paymentStatusVar, $paymentDateVar
        );
        $stmt->execute();
        
        $payrollId = $conn->insert_id;
        
        // Insert allowances
        foreach ($allowances as $allowance) {
            $allowanceSql = "INSERT INTO payroll_allowances (payroll_id, type, amount) VALUES (?, ?, ?)";
            $allowanceStmt = $conn->prepare($allowanceSql);
            $allowanceStmt->bind_param("isd", $payrollId, $allowance['type'], $allowance['amount']);
            $allowanceStmt->execute();
        }
        
        // Insert deductions
        foreach ($deductions as $deduction) {
            $deductionSql = "INSERT INTO payroll_deductions (payroll_id, type, amount) VALUES (?, ?, ?)";
            $deductionStmt = $conn->prepare($deductionSql);
            $deductionStmt->bind_param("isd", $payrollId, $deduction['type'], $deduction['amount']);
            $deductionStmt->execute();
        }
        
        // Link existing advances to this payroll
        if (!empty($advances)) {
            foreach ($advances as $advance) {
                // Check if advance already exists
                $advanceCheckSql = "
                    SELECT id FROM salary_advances 
                    WHERE driver_id = ? AND date = ? AND amount = ?
                ";
                $advanceCheckStmt = $conn->prepare($advanceCheckSql);
                $advanceDate = $advance['date'];
                $advanceAmount = $advance['amount'];
                $advanceCheckStmt->bind_param("ssd", $driverId, $advanceDate, $advanceAmount);
                $advanceCheckStmt->execute();
                $advanceCheckResult = $advanceCheckStmt->get_result();
                
                if ($advanceCheckResult->num_rows > 0) {
                    // Update existing advance to link to this payroll
                    $advanceRow = $advanceCheckResult->fetch_assoc();
                    $advanceId = $advanceRow['id'];
                    
                    $updateAdvanceSql = "UPDATE salary_advances SET payroll_id = ? WHERE id = ?";
                    $updateAdvanceStmt = $conn->prepare($updateAdvanceSql);
                    $updateAdvanceStmt->bind_param("ii", $payrollId, $advanceId);
                    $updateAdvanceStmt->execute();
                } else {
                    // Insert new advance record
                    $advanceSql = "
                        INSERT INTO salary_advances (driver_id, payroll_id, date, amount, notes) 
                        VALUES (?, ?, ?, ?, ?)
                    ";
                    $advanceStmt = $conn->prepare($advanceSql);
                    $advanceNotes = $advance['notes'] ?? null;
                    $advanceStmt->bind_param("sisds", $driverId, $payrollId, $advanceDate, $advanceAmount, $advanceNotes);
                    $advanceStmt->execute();
                }
            }
        }
        
        // Commit transaction
        $conn->commit();
        
        // Return the complete payroll entry with all relations
        $newPayroll = [
            'id' => $payrollId,
            'driverId' => $driverId,
            'date' => $date,
            'description' => $description,
            'amount' => $netSalary,
            'type' => $data['type'] ?? 'expense',
            'category' => $data['category'] ?? 'Salary',
            'paymentMethod' => $paymentMethod,
            'status' => $status,
            'payPeriod' => [
                'startDate' => $payPeriodStart,
                'endDate' => $payPeriodEnd,
            ],
            'basicSalary' => $basicSalary,
            'allowances' => $allowances,
            'deductions' => $deductions,
            'advances' => $advances,
            'daysWorked' => $daysWorked,
            'daysLeave' => $daysLeave,
            'overtimeHours' => $overtimeHours,
            'netSalary' => $netSalary,
            'paymentStatus' => $paymentStatus,
            'paymentDate' => $paymentDate,
            'payslipIssued' => false,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ];
        
        sendSuccessResponse($newPayroll, 'Payroll entry added successfully');
    } catch (Exception $e) {
        $conn->rollback();
        sendErrorResponse('Failed to add payroll entry: ' . $e->getMessage(), 500);
    }
}

/**
 * Update an existing payroll entry
 */
function updatePayrollEntry($conn, $data) {
    try {
        // Begin transaction
        $conn->begin_transaction();
        
        // Validate required field
        if (!isset($data['id'])) {
            $conn->rollback();
            sendErrorResponse('Payroll ID is required', 400);
        }
        
        $payrollId = $data['id'];
        
        // Check if payroll entry exists
        $checkSql = "SELECT * FROM payroll_entries WHERE id = ?";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bind_param("i", $payrollId);
        $checkStmt->execute();
        $result = $checkStmt->get_result();
        
        if ($result->num_rows === 0) {
            $conn->rollback();
            sendErrorResponse('Payroll entry not found', 404);
        }
        
        $existingPayroll = $result->fetch_assoc();
        
        // Update fields that were provided
        $updates = [];
        $params = [];
        $types = "";
        
        $fieldsToCheck = [
            'date' => 's',
            'description' => 's',
            'payment_method' => 's',
            'status' => 's',
            'basic_salary' => 'd',
            'days_worked' => 'i',
            'days_leave' => 'i',
            'overtime_hours' => 'd',
            'payment_status' => 's',
            'payment_date' => 's',
            'payslip_issued' => 'i'
        ];
        
        foreach ($fieldsToCheck as $field => $type) {
            $dataField = lcfirst(str_replace('_', '', ucwords($field, '_')));
            
            if (isset($data[$dataField])) {
                $updates[] = "$field = ?";
                
                // Convert boolean to integer for database
                if ($field === 'payslip_issued') {
                    $params[] = $data[$dataField] ? 1 : 0;
                } else {
                    $params[] = $data[$dataField];
                }
                
                $types .= $type;
            }
        }
        
        // Handle special fields like pay_period
        if (isset($data['payPeriod'])) {
            if (isset($data['payPeriod']['startDate'])) {
                $updates[] = "pay_period_start = ?";
                $params[] = $data['payPeriod']['startDate'];
                $types .= "s";
            }
            
            if (isset($data['payPeriod']['endDate'])) {
                $updates[] = "pay_period_end = ?";
                $params[] = $data['payPeriod']['endDate'];
                $types .= "s";
            }
        }
        
        // Calculate net salary if components changed
        $recalculateNetSalary = false;
        $basicSalary = $data['basicSalary'] ?? $existingPayroll['basic_salary'];
        
        // Update allowances if provided
        if (isset($data['allowances'])) {
            $recalculateNetSalary = true;
            
            // Delete existing allowances
            $deleteAllowancesSql = "DELETE FROM payroll_allowances WHERE payroll_id = ?";
            $deleteAllowancesStmt = $conn->prepare($deleteAllowancesSql);
            $deleteAllowancesStmt->bind_param("i", $payrollId);
            $deleteAllowancesStmt->execute();
            
            // Insert new allowances
            foreach ($data['allowances'] as $allowance) {
                $allowanceSql = "INSERT INTO payroll_allowances (payroll_id, type, amount) VALUES (?, ?, ?)";
                $allowanceStmt = $conn->prepare($allowanceSql);
                $allowanceStmt->bind_param("isd", $payrollId, $allowance['type'], $allowance['amount']);
                $allowanceStmt->execute();
            }
        }
        
        // Update deductions if provided
        if (isset($data['deductions'])) {
            $recalculateNetSalary = true;
            
            // Delete existing deductions
            $deleteDeductionsSql = "DELETE FROM payroll_deductions WHERE payroll_id = ?";
            $deleteDeductionsStmt = $conn->prepare($deleteDeductionsSql);
            $deleteDeductionsStmt->bind_param("i", $payrollId);
            $deleteDeductionsStmt->execute();
            
            // Insert new deductions
            foreach ($data['deductions'] as $deduction) {
                $deductionSql = "INSERT INTO payroll_deductions (payroll_id, type, amount) VALUES (?, ?, ?)";
                $deductionStmt = $conn->prepare($deductionSql);
                $deductionStmt->bind_param("isd", $payrollId, $deduction['type'], $deduction['amount']);
                $deductionStmt->execute();
            }
        }
        
        // Get allowances total
        $allowancesQuery = "SELECT SUM(amount) as total FROM payroll_allowances WHERE payroll_id = ?";
        $allowancesStmt = $conn->prepare($allowancesQuery);
        $allowancesStmt->bind_param("i", $payrollId);
        $allowancesStmt->execute();
        $allowancesResult = $allowancesStmt->get_result();
        $allowancesRow = $allowancesResult->fetch_assoc();
        $totalAllowances = $allowancesRow['total'] ?? 0;
        
        // Get deductions total
        $deductionsQuery = "SELECT SUM(amount) as total FROM payroll_deductions WHERE payroll_id = ?";
        $deductionsStmt = $conn->prepare($deductionsQuery);
        $deductionsStmt->bind_param("i", $payrollId);
        $deductionsStmt->execute();
        $deductionsResult = $deductionsStmt->get_result();
        $deductionsRow = $deductionsResult->fetch_assoc();
        $totalDeductions = $deductionsRow['total'] ?? 0;
        
        // Get advances total
        $advancesQuery = "SELECT SUM(amount) as total FROM salary_advances WHERE payroll_id = ?";
        $advancesStmt = $conn->prepare($advancesQuery);
        $advancesStmt->bind_param("i", $payrollId);
        $advancesStmt->execute();
        $advancesResult = $advancesStmt->get_result();
        $advancesRow = $advancesResult->fetch_assoc();
        $totalAdvances = $advancesRow['total'] ?? 0;
        
        // Calculate net salary
        $netSalary = $basicSalary + $totalAllowances - $totalDeductions - $totalAdvances;
        
        // Add net salary update
        if ($recalculateNetSalary) {
            $updates[] = "net_salary = ?";
            $params[] = $netSalary;
            $types .= "d";
            
            $updates[] = "amount = ?";
            $params[] = $netSalary;
            $types .= "d";
        }
        
        // If status is changing to paid, update ledger status
        if (isset($data['paymentStatus']) && $data['paymentStatus'] === 'paid') {
            $updates[] = "status = 'reconciled'";
        } else if (isset($data['paymentStatus']) && $data['paymentStatus'] !== 'paid') {
            $updates[] = "status = 'pending'";
        }
        
        // Update payroll entry if there are updates
        if (!empty($updates)) {
            $sql = "UPDATE payroll_entries SET " . implode(", ", $updates) . " WHERE id = ?";
            $params[] = $payrollId;
            $types .= "i";
            
            $stmt = $conn->prepare($sql);
            $stmt->bind_param($types, ...$params);
            $stmt->execute();
            
            if ($stmt->affected_rows === 0 && !$recalculateNetSalary) {
                $conn->rollback();
                sendErrorResponse('No changes were made or record not found', 400);
            }
        }
        
        // Commit transaction
        $conn->commit();
        
        // Fetch updated entry
        $sql = "
            SELECT p.*,
                   d.name AS driver_name
            FROM payroll_entries p
            LEFT JOIN drivers d ON p.driver_id = d.id
            WHERE p.id = ?
        ";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $payrollId);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        
        // Get allowances for this payroll
        $allowancesQuery = "SELECT type, amount FROM payroll_allowances WHERE payroll_id = ?";
        $allowancesStmt = $conn->prepare($allowancesQuery);
        $allowancesStmt->bind_param("i", $payrollId);
        $allowancesStmt->execute();
        $allowancesResult = $allowancesStmt->get_result();
        
        $allowances = [];
        while ($allowanceRow = $allowancesResult->fetch_assoc()) {
            $allowances[] = [
                'type' => $allowanceRow['type'],
                'amount' => (float)$allowanceRow['amount']
            ];
        }
        
        // Get deductions for this payroll
        $deductionsQuery = "SELECT type, amount FROM payroll_deductions WHERE payroll_id = ?";
        $deductionsStmt = $conn->prepare($deductionsQuery);
        $deductionsStmt->bind_param("i", $payrollId);
        $deductionsStmt->execute();
        $deductionsResult = $deductionsStmt->get_result();
        
        $deductions = [];
        while ($deductionRow = $deductionsResult->fetch_assoc()) {
            $deductions[] = [
                'type' => $deductionRow['type'],
                'amount' => (float)$deductionRow['amount']
            ];
        }
        
        // Get advances for this payroll
        $advancesQuery = "SELECT date, amount, notes FROM salary_advances WHERE payroll_id = ?";
        $advancesStmt = $conn->prepare($advancesQuery);
        $advancesStmt->bind_param("i", $payrollId);
        $advancesStmt->execute();
        $advancesResult = $advancesStmt->get_result();
        
        $advances = [];
        while ($advanceRow = $advancesResult->fetch_assoc()) {
            $advances[] = [
                'date' => $advanceRow['date'],
                'amount' => (float)$advanceRow['amount'],
                'notes' => $advanceRow['notes']
            ];
        }
        
        $updatedPayroll = [
            'id' => $row['id'],
            'driverId' => $row['driver_id'],
            'date' => $row['date'],
            'description' => $row['description'],
            'amount' => (float)$row['amount'],
            'type' => $row['type'],
            'category' => $row['category'],
            'paymentMethod' => $row['payment_method'],
            'status' => $row['status'],
            'payPeriod' => [
                'startDate' => $row['pay_period_start'],
                'endDate' => $row['pay_period_end'],
            ],
            'basicSalary' => (float)$row['basic_salary'],
            'allowances' => $allowances,
            'deductions' => $deductions,
            'advances' => $advances,
            'daysWorked' => (int)$row['days_worked'],
            'daysLeave' => (int)$row['days_leave'],
            'overtimeHours' => (float)$row['overtime_hours'],
            'netSalary' => (float)$row['net_salary'],
            'paymentStatus' => $row['payment_status'],
            'paymentDate' => $row['payment_date'],
            'payslipIssued' => (bool)$row['payslip_issued'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at']
        ];
        
        sendSuccessResponse($updatedPayroll, 'Payroll entry updated successfully');
    } catch (Exception $e) {
        $conn->rollback();
        sendErrorResponse('Failed to update payroll entry: ' . $e->getMessage(), 500);
    }
}

/**
 * Record salary advance
 */
function recordSalaryAdvance($conn, $data) {
    try {
        // Validate required fields
        if (!isset($data['driverId']) || !isset($data['amount']) || !isset($data['date'])) {
            sendErrorResponse('Driver ID, amount, and date are required', 400);
        }
        
        $driverId = $data['driverId'];
        $amount = $data['amount'];
        $date = $data['date'];
        $notes = $data['notes'] ?? 'Salary advance';
        
        $sql = "INSERT INTO salary_advances (driver_id, date, amount, notes) VALUES (?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ssds", $driverId, $date, $amount, $notes);
        $stmt->execute();
        
        $id = $conn->insert_id;
        
        $advance = [
            'id' => $id,
            'driverId' => $driverId,
            'date' => $date,
            'amount' => (float)$amount,
            'notes' => $notes
        ];
        
        sendSuccessResponse($advance, 'Salary advance recorded successfully');
    } catch (Exception $e) {
        sendErrorResponse('Failed to record salary advance: ' . $e->getMessage(), 500);
    }
}

/**
 * Get payroll summary (for dashboard and reports)
 */
function getPayrollSummary($conn) {
    try {
        $conditions = [];
        $params = [];
        $types = "";
        
        // Apply date range filters
        if (isset($_GET['from_date'])) {
            $fromDate = $_GET['from_date'];
            $conditions[] = "(p.pay_period_start >= ? OR p.pay_period_end >= ?)";
            $params[] = $fromDate;
            $params[] = $fromDate;
            $types .= "ss";
        }
        
        if (isset($_GET['to_date'])) {
            $toDate = $_GET['to_date'];
            $conditions[] = "(p.pay_period_start <= ? OR p.pay_period_end <= ?)";
            $params[] = $toDate;
            $params[] = $toDate;
            $types .= "ss";
        }
        
        $whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";
        
        // Get total paid and pending amounts
        $totalsSql = "
            SELECT 
                SUM(CASE WHEN p.payment_status = 'paid' THEN p.net_salary ELSE 0 END) as total_paid,
                SUM(CASE WHEN p.payment_status != 'paid' THEN p.net_salary ELSE 0 END) as total_pending
            FROM payroll_entries p
            $whereClause
        ";
        
        $totalsStmt = $conn->prepare($totalsSql);
        if (!empty($params)) {
            $totalsStmt->bind_param($types, ...$params);
        }
        $totalsStmt->execute();
        $totalsResult = $totalsStmt->get_result();
        $totalsRow = $totalsResult->fetch_assoc();
        
        $totalPaid = $totalsRow['total_paid'] ? (float)$totalsRow['total_paid'] : 0;
        $totalPending = $totalsRow['total_pending'] ? (float)$totalsRow['total_pending'] : 0;
        
        // Get summary by driver
        $driversSql = "
            SELECT 
                p.driver_id as driverId,
                d.name as driverName,
                SUM(p.net_salary) as amount,
                MIN(p.payment_status) as status
            FROM payroll_entries p
            LEFT JOIN drivers d ON p.driver_id = d.id
            $whereClause
            GROUP BY p.driver_id, d.name
        ";
        
        $driversStmt = $conn->prepare($driversSql);
        if (!empty($params)) {
            $driversStmt->bind_param($types, ...$params);
        }
        $driversStmt->execute();
        $driversResult = $driversStmt->get_result();
        
        $byDriver = [];
        while ($driverRow = $driversResult->fetch_assoc()) {
            $byDriver[] = [
                'driverId' => $driverRow['driverId'],
                'driverName' => $driverRow['driverName'] ?? 'Unknown Driver',
                'amount' => (float)$driverRow['amount'],
                'status' => $driverRow['status']
            ];
        }
        
        // Get summary by month
        $monthsSql = "
            SELECT 
                DATE_FORMAT(p.pay_period_start, '%b %Y') as month,
                SUM(p.net_salary) as amount
            FROM payroll_entries p
            $whereClause
            GROUP BY DATE_FORMAT(p.pay_period_start, '%Y-%m')
            ORDER BY p.pay_period_start DESC
            LIMIT 6
        ";
        
        $monthsStmt = $conn->prepare($monthsSql);
        if (!empty($params)) {
            $monthsStmt->bind_param($types, ...$params);
        }
        $monthsStmt->execute();
        $monthsResult = $monthsStmt->get_result();
        
        $byMonth = [];
        while ($monthRow = $monthsResult->fetch_assoc()) {
            $byMonth[] = [
                'month' => $monthRow['month'],
                'amount' => (float)$monthRow['amount']
            ];
        }
        
        // Get total drivers
        $driverCountQuery = "SELECT COUNT(DISTINCT driver_id) as total FROM payroll_entries p $whereClause";
        $driverCountStmt = $conn->prepare($driverCountQuery);
        if (!empty($params)) {
            $driverCountStmt->bind_param($types, ...$params);
        }
        $driverCountStmt->execute();
        $driverCountResult = $driverCountStmt->get_result();
        $driverCountRow = $driverCountResult->fetch_assoc();
        $totalDrivers = (int)$driverCountRow['total'];
        
        $summary = [
            'totalPaid' => $totalPaid,
            'totalPending' => $totalPending,
            'totalDrivers' => $totalDrivers,
            'byDriver' => $byDriver,
            'byMonth' => $byMonth
        ];
        
        sendSuccessResponse($summary);
    } catch (Exception $e) {
        sendErrorResponse('Failed to generate payroll summary: ' . $e->getMessage(), 500);
    }
}

/**
 * Record attendance
 */
function recordAttendance($conn, $data) {
    try {
        // Validate required fields
        if (!isset($data['driverId']) || !isset($data['date']) || !isset($data['status'])) {
            sendErrorResponse('Driver ID, date, and status are required', 400);
        }
        
        $driverId = $data['driverId'];
        $date = $data['date'];
        $status = $data['status'];
        $hoursWorked = $data['hoursWorked'] ?? null;
        $overtimeHours = $data['overtimeHours'] ?? 0;
        $notes = $data['notes'] ?? null;
        
        // Check if an attendance record already exists for this driver and date
        $checkSql = "SELECT id FROM attendance_records WHERE driver_id = ? AND date = ?";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bind_param("ss", $driverId, $date);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult->num_rows > 0) {
            // Update existing record
            $row = $checkResult->fetch_assoc();
            $id = $row['id'];
            
            $sql = "UPDATE attendance_records SET status = ?, hours_worked = ?, overtime_hours = ?, notes = ? WHERE id = ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("sddsi", $status, $hoursWorked, $overtimeHours, $notes, $id);
            $stmt->execute();
            
            $message = 'Attendance record updated successfully';
        } else {
            // Insert new record
            $sql = "INSERT INTO attendance_records (driver_id, date, status, hours_worked, overtime_hours, notes) VALUES (?, ?, ?, ?, ?, ?)";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("sssdds", $driverId, $date, $status, $hoursWorked, $overtimeHours, $notes);
            $stmt->execute();
            
            $id = $conn->insert_id;
            $message = 'Attendance record created successfully';
        }
        
        $attendance = [
            'id' => $id,
            'driverId' => $driverId,
            'date' => $date,
            'status' => $status,
            'hoursWorked' => $hoursWorked,
            'overtimeHours' => $overtimeHours,
            'notes' => $notes
        ];
        
        sendSuccessResponse($attendance, $message);
    } catch (Exception $e) {
        sendErrorResponse('Failed to record attendance: ' . $e->getMessage(), 500);
    }
}

/**
 * Get attendance records
 */
function getAttendanceRecords($conn) {
    try {
        $conditions = [];
        $params = [];
        $types = "";
        
        // Apply filters
        if (isset($_GET['driver_id'])) {
            $driverId = $_GET['driver_id'];
            $conditions[] = "a.driver_id = ?";
            $params[] = $driverId;
            $types .= "s";
        }
        
        if (isset($_GET['from_date'])) {
            $fromDate = $_GET['from_date'];
            $conditions[] = "a.date >= ?";
            $params[] = $fromDate;
            $types .= "s";
        }
        
        if (isset($_GET['to_date'])) {
            $toDate = $_GET['to_date'];
            $conditions[] = "a.date <= ?";
            $params[] = $toDate;
            $types .= "s";
        }
        
        if (isset($_GET['status'])) {
            $status = $_GET['status'];
            $conditions[] = "a.status = ?";
            $params[] = $status;
            $types .= "s";
        }
        
        $whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";
        
        // Get attendance records
        $sql = "
            SELECT a.*,
                   d.name AS driver_name
            FROM attendance_records a
            LEFT JOIN drivers d ON a.driver_id = d.id
            $whereClause
            ORDER BY a.date DESC
        ";
        
        $stmt = $conn->prepare($sql);
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        
        $records = [];
        while ($row = $result->fetch_assoc()) {
            $records[] = [
                'id' => $row['id'],
                'driverId' => $row['driver_id'],
                'date' => $row['date'],
                'status' => $row['status'],
                'hoursWorked' => $row['hours_worked'] !== null ? (float)$row['hours_worked'] : null,
                'overtimeHours' => (float)$row['overtime_hours'],
                'notes' => $row['notes']
            ];
        }
        
        sendSuccessResponse($records);
    } catch (Exception $e) {
        sendErrorResponse('Failed to fetch attendance records: ' . $e->getMessage(), 500);
    }
}

/**
 * Get driver pay summary
 */
function getDriverPaySummary($conn, $driverId, $month = null, $year = null) {
    try {
        // Validate required fields
        if (!isset($driverId)) {
            sendErrorResponse('Driver ID is required', 400);
        }
        // Use from_date and to_date from GET if provided
        $fromDate = $_GET['from_date'] ?? null;
        $toDate = $_GET['to_date'] ?? null;
        if ($fromDate && $toDate) {
            $startDate = $fromDate;
            $endDate = $toDate;
        } else {
            // Get current month/year if not provided
            if ($month === null) $month = date('n');
            if ($year === null) $year = date('Y');
            $startDate = "$year-$month-01";
            $endDate = date('Y-m-t', strtotime($startDate));
        }
        // Ensure driverId is a string for SQL binding
        $driverId = (string)$driverId;
        
        // Get driver info
        $driverSql = "SELECT name FROM drivers WHERE id = ?";
        $driverStmt = $conn->prepare($driverSql);
        $driverStmt->bind_param("s", $driverId);
        $driverStmt->execute();
        $driverResult = $driverStmt->get_result();
        $driverRow = $driverResult->fetch_assoc();
        $driverName = $driverRow['name'] ?? 'Unknown Driver';
        
        // Get latest payroll entry
        $payrollSql = "
            SELECT * FROM payroll_entries 
            WHERE driver_id = ? 
            ORDER BY pay_period_start DESC 
            LIMIT 1
        ";
        $payrollStmt = $conn->prepare($payrollSql);
        $payrollStmt->bind_param("s", $driverId);
        $payrollStmt->execute();
        $payrollResult = $payrollStmt->get_result();
        $payrollRow = $payrollResult->fetch_assoc();
        
        $basicSalary = $payrollRow ? (float)$payrollRow['basic_salary'] : 15000;
        
        // Get attendance summary
        $attendanceSql = "
            SELECT
                SUM(CASE WHEN LOWER(status) = 'present' THEN 1 ELSE 0 END) as days_present,
                SUM(CASE WHEN LOWER(status) = 'absent' THEN 1 ELSE 0 END) as days_absent,
                SUM(CASE WHEN LOWER(status) = 'half-day' THEN 1 ELSE 0 END) as half_days
            FROM attendance_records
            WHERE driver_id = ? AND date BETWEEN ? AND ?
        ";
        $attendanceStmt = $conn->prepare($attendanceSql);
        $attendanceStmt->bind_param("sss", $driverId, $startDate, $endDate);
        $attendanceStmt->execute();
        $attendanceResult = $attendanceStmt->get_result();
        $attendanceRow = $attendanceResult->fetch_assoc();
        $attendanceSummary = [
            'daysPresent' => (int)($attendanceRow['days_present'] ?? 0),
            'daysAbsent' => (int)($attendanceRow['days_absent'] ?? 0),
            'halfDays' => (int)($attendanceRow['half_days'] ?? 0),
        ];
        
        // Get outstanding advances
        $advancesSql = "
            SELECT SUM(amount) as total_advances
            FROM salary_advances
            WHERE driver_id = ? AND payroll_id IS NULL
        ";
        
        $advancesStmt = $conn->prepare($advancesSql);
        $advancesStmt->bind_param("s", $driverId);
        $advancesStmt->execute();
        $advancesResult = $advancesStmt->get_result();
        $advancesRow = $advancesResult->fetch_assoc();
        $totalAdvances = (float)($advancesRow['total_advances'] ?? 0);
        
        // Get previous payments
        $paymentsSql = "
            SELECT 
                DATE_FORMAT(pay_period_start, '%b %Y') as month,
                net_salary as amount,
                payment_date
            FROM payroll_entries
            WHERE driver_id = ? AND payment_status = 'paid' AND payment_date IS NOT NULL
            ORDER BY payment_date DESC
            LIMIT 3
        ";
        
        $paymentsStmt = $conn->prepare($paymentsSql);
        $paymentsStmt->bind_param("s", $driverId);
        $paymentsStmt->execute();
        $paymentsResult = $paymentsStmt->get_result();
        
        $previousPayments = [];
        while ($paymentRow = $paymentsResult->fetch_assoc()) {
            $previousPayments[] = [
                'month' => $paymentRow['month'],
                'amount' => (float)$paymentRow['amount'],
                'paymentDate' => $paymentRow['payment_date'],
            ];
        }
        
        // Calculate estimated earnings
        // Get all allowances
        $allowancesSql = "
            SELECT c.type, c.amount
            FROM salary_components c
            WHERE c.type IN ('allowance', 'bonus') AND c.is_fixed = 1
        ";
        
        $allowancesStmt = $conn->prepare($allowancesSql);
        $allowancesStmt->execute();
        $allowancesResult = $allowancesStmt->get_result();
        
        $totalFixedAllowances = 0;
        while ($allowanceRow = $allowancesResult->fetch_assoc()) {
            $totalFixedAllowances += (float)$allowanceRow['amount'];
        }
        
        $totalEarnings = $basicSalary + $totalFixedAllowances;
        
        // Get all fixed deductions
        $deductionsSql = "
            SELECT c.type, c.amount
            FROM salary_components c
            WHERE c.type = 'deduction' AND c.is_fixed = 1
        ";
        
        $deductionsStmt = $conn->prepare($deductionsSql);
        $deductionsStmt->execute();
        $deductionsResult = $deductionsStmt->get_result();
        
        $totalFixedDeductions = 0;
        while ($deductionRow = $deductionsResult->fetch_assoc()) {
            $totalFixedDeductions += (float)$deductionRow['amount'];
        }
        
        // Calculate PF based on basic
        $pfRate = 0.12; // 12%
        $pfDeduction = $basicSalary * $pfRate;
        $totalDeductions = $totalFixedDeductions + $pfDeduction;
        
        $pendingAmount = $totalEarnings - $totalDeductions - $totalAdvances;
        
        $driverSummary = [
            'driverId' => $driverId,
            'driverName' => $driverName,
            'basicSalary' => $basicSalary,
            'totalEarnings' => $totalEarnings,
            'totalDeductions' => $totalDeductions,
            'totalAdvances' => $totalAdvances,
            'pendingAmount' => $pendingAmount,
            'attendanceSummary' => $attendanceSummary,
            'previousPayments' => $previousPayments,
        ];
        
        sendSuccessResponse($driverSummary);
    } catch (Exception $e) {
        sendErrorResponse('Failed to fetch driver pay summary: ' . $e->getMessage(), 500);
    }
}

/**
 * Generate payslip
 */
function generatePayslip($conn, $payrollId, $format = 'pdf') {
    try {
        // Validate required fields
        if (!isset($payrollId)) {
            sendErrorResponse('Payroll ID is required', 400);
        }
        
        if (!in_array($format, ['pdf', 'excel'])) {
            $format = 'pdf';
        }
        
        // Update payslip_issued flag
        $updateSql = "UPDATE payroll_entries SET payslip_issued = 1 WHERE id = ?";
        $updateStmt = $conn->prepare($updateSql);
        $updateStmt->bind_param("i", $payrollId);
        $updateStmt->execute();
        
        // In a real implementation, generate the actual file
        // For now, just return success
        $payslipUrl = "payslip_$payrollId.$format";
        
        sendSuccessResponse(['url' => $payslipUrl], "Payslip generated successfully");
    } catch (Exception $e) {
        sendErrorResponse('Failed to generate payslip: ' . $e->getMessage(), 500);
    }
}
