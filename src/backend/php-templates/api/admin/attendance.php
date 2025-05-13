<?php
// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

/**
 * API endpoint for attendance management
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

// Process based on method
try {
    // Initialize the request data
    $requestBody = file_get_contents('php://input');
    $requestData = json_decode($requestBody, true) ?? [];
    
    switch ($method) {
        case 'GET':
            getAttendanceRecords($conn);
            break;
            
        case 'POST':
            recordAttendance($conn, $requestData);
            break;
            
        case 'PUT':
            updateAttendance($conn, $requestData);
            break;
            
        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                sendErrorResponse('ID is required for deletion', 400);
            }
            deleteAttendance($conn, $id);
            break;
            
        default:
            sendErrorResponse('Method not allowed', 405);
    }
} catch (Exception $e) {
    sendErrorResponse('Error: ' . $e->getMessage(), 500);
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
 * Update attendance record
 */
function updateAttendance($conn, $data) {
    try {
        // Validate required fields
        if (!isset($data['id'])) {
            sendErrorResponse('Attendance ID is required', 400);
        }
        
        $id = $data['id'];
        $status = $data['status'] ?? null;
        $hoursWorked = $data['hoursWorked'] ?? null;
        $overtimeHours = $data['overtimeHours'] ?? null;
        $notes = $data['notes'] ?? null;
        
        // Build update query dynamically based on provided fields
        $updates = [];
        $params = [];
        $types = "";
        
        if ($status !== null) {
            $updates[] = "status = ?";
            $params[] = $status;
            $types .= "s";
        }
        
        if (array_key_exists('hoursWorked', $data)) {
            $updates[] = "hours_worked = ?";
            $params[] = $hoursWorked;
            $types .= "d";
        }
        
        if (array_key_exists('overtimeHours', $data)) {
            $updates[] = "overtime_hours = ?";
            $params[] = $overtimeHours;
            $types .= "d";
        }
        
        if (array_key_exists('notes', $data)) {
            $updates[] = "notes = ?";
            $params[] = $notes;
            $types .= "s";
        }
        
        if (empty($updates)) {
            sendErrorResponse('No fields provided for update', 400);
        }
        
        $sql = "UPDATE attendance_records SET " . implode(", ", $updates) . " WHERE id = ?";
        $params[] = $id;
        $types .= "i";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        
        if ($stmt->affected_rows === 0) {
            sendErrorResponse('Attendance record not found or no changes made', 404);
        }
        
        // Fetch updated record
        $query = "SELECT * FROM attendance_records WHERE id = ?";
        $stmtSelect = $conn->prepare($query);
        $stmtSelect->bind_param("i", $id);
        $stmtSelect->execute();
        $result = $stmtSelect->get_result();
        
        if ($row = $result->fetch_assoc()) {
            $attendance = [
                'id' => $row['id'],
                'driverId' => $row['driver_id'],
                'date' => $row['date'],
                'status' => $row['status'],
                'hoursWorked' => $row['hours_worked'] !== null ? (float)$row['hours_worked'] : null,
                'overtimeHours' => (float)$row['overtime_hours'],
                'notes' => $row['notes']
            ];
            
            sendSuccessResponse($attendance, 'Attendance record updated successfully');
        } else {
            sendErrorResponse('Failed to retrieve updated attendance record', 500);
        }
    } catch (Exception $e) {
        sendErrorResponse('Failed to update attendance record: ' . $e->getMessage(), 500);
    }
}

/**
 * Delete attendance record
 */
function deleteAttendance($conn, $id) {
    try {
        $sql = "DELETE FROM attendance_records WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $id);
        $stmt->execute();
        
        if ($stmt->affected_rows === 0) {
            sendErrorResponse('Attendance record not found', 404);
        }
        
        sendSuccessResponse(['id' => $id], 'Attendance record deleted successfully');
    } catch (Exception $e) {
        sendErrorResponse('Failed to delete attendance record: ' . $e->getMessage(), 500);
    }
}
