<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
// Include configuration file
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';

// CRITICAL: Set all response headers first before any output
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Debug mode
$debugMode = isset($_GET['debug']) || isset($_SERVER['HTTP_X_DEBUG']);

// Log request
error_log("Admin assign-driver endpoint called: " . $_SERVER['REQUEST_METHOD']);

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Function to send JSON response
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    if (ob_get_level()) ob_end_clean();
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

// Helper function to log errors
function logAssignDriverError($message, $data = []) {
    error_log("ASSIGN DRIVER ERROR: $message " . json_encode($data));
    $logFile = __DIR__ . '/../../logs/assign_driver_errors.log';
    $dir = dirname($logFile);
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    @file_put_contents(
        $logFile,
        date('Y-m-d H:i:s') . " - $message - " . json_encode($data) . "\n",
        FILE_APPEND
    );
}

try {
    // Only allow POST or PUT requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }

    // Get JSON input data
    $jsonData = file_get_contents('php://input');
    $data = json_decode($jsonData, true);
    
    if ($debugMode) {
        error_log("Assign driver request data: " . print_r($data, true));
    }

    $bookingId = null;
    $driverId = null;

    if (isset($data['bookingId'])) {
        $bookingId = $data['bookingId'];
    } elseif (isset($data['booking_id'])) {
        $bookingId = $data['booking_id'];
    }

    if (isset($data['driverId'])) {
        $driverId = $data['driverId'];
    } elseif (isset($data['driver_id'])) {
        $driverId = $data['driver_id'];
    }

    if (!$bookingId || !$driverId) {
        error_log('Missing required data: bookingId=' . var_export($bookingId, true) . ', driverId=' . var_export($driverId, true));
        sendJsonResponse(['status' => 'error', 'message' => 'Missing required data (bookingId, driverId)'], 400);
        exit;
    }

    // Connect to database
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    if (!$conn) {
        logAssignDriverError('Database connection failed');
        sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
    }

    // Start transaction
    $conn->begin_transaction();

    try {
        // Get driver details first
        $driverStmt = $conn->prepare("SELECT * FROM drivers WHERE id = ?");
        if (!$driverStmt) {
            throw new Exception("Failed to prepare driver statement: " . $conn->error);
        }
        
        $driverStmt->bind_param("i", $driverId);
        if (!$driverStmt->execute()) {
            throw new Exception("Failed to fetch driver: " . $driverStmt->error);
        }
        
        $driverResult = $driverStmt->get_result();
        if ($driverResult->num_rows === 0) {
            throw new Exception("Driver not found");
        }
        
        $driver = $driverResult->fetch_assoc();
        
        // Check if driver is available
        if ($driver['status'] !== 'available') {
            throw new Exception("Driver is not available");
        }
        
        // Get booking details
        $bookingStmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
        if (!$bookingStmt) {
            throw new Exception("Failed to prepare booking statement: " . $conn->error);
        }
        
        $bookingStmt->bind_param("i", $bookingId);
        if (!$bookingStmt->execute()) {
            throw new Exception("Failed to fetch booking: " . $bookingStmt->error);
        }
        
        $bookingResult = $bookingStmt->get_result();
        if ($bookingResult->num_rows === 0) {
            throw new Exception("Booking not found");
        }
        
        $booking = $bookingResult->fetch_assoc();
        
        // PATCH: Check for missing or empty status
        if (!isset($booking['status']) || $booking['status'] === null || $booking['status'] === '') {
            throw new Exception("Booking status is missing for booking ID: {$bookingId}");
        }

        if (!in_array($booking['status'], ['pending', 'confirmed'])) {
            throw new Exception("Booking cannot be assigned (current status: {$booking['status']})");
        }
        
        // Update booking with driver information
        $updateBookingStmt = $conn->prepare("
            UPDATE bookings 
            SET driver_id = ?,
                driver_name = ?,
                driver_phone = ?,
                vehicle_number = ?,
                status = 'assigned',
                updated_at = NOW()
            WHERE id = ?
        ");
        
        if (!$updateBookingStmt) {
            throw new Exception("Failed to prepare booking update statement: " . $conn->error);
        }
        
        $updateBookingStmt->bind_param(
            "isssi",
            $driver['id'],
            $driver['name'],
            $driver['phone'],
            $driver['vehicle'],
            $bookingId
        );
        
        if (!$updateBookingStmt->execute()) {
            throw new Exception("Failed to update booking: " . $updateBookingStmt->error);
        }
        
        // Update driver status to busy
        $updateDriverStmt = $conn->prepare("
            UPDATE drivers 
            SET status = 'busy',
                updated_at = NOW()
            WHERE id = ?
        ");
        
        if (!$updateDriverStmt) {
            throw new Exception("Failed to prepare driver update statement: " . $conn->error);
        }
        
        $updateDriverStmt->bind_param("i", $driver['id']);
        if (!$updateDriverStmt->execute()) {
            throw new Exception("Failed to update driver status: " . $updateDriverStmt->error);
        }
        
        // Commit transaction
        $conn->commit();
        
        // Send success response
        sendJsonResponse([
            'status' => 'success',
            'message' => 'Driver assigned successfully',
            'data' => [
                'bookingId' => (int)$bookingId,
                'bookingNumber' => $booking['booking_number'],
                'driverId' => (int)$driver['id'],
                'driverName' => $driver['name'],
                'driverPhone' => $driver['phone'],
                'vehicleNumber' => $driver['vehicle'],
                'status' => 'assigned',
                'updatedAt' => date('Y-m-d H:i:s')
            ]
        ]);
        
    } catch (Exception $e) {
        // Rollback transaction on error
        $conn->rollback();
        
        logAssignDriverError('Failed to assign driver', [
            'error' => $e->getMessage(),
            'booking_id' => $bookingId,
            'driver_id' => $driverId
        ]);
        
        sendJsonResponse([
            'status' => 'error',
            'message' => $e->getMessage()
        ], 500);
    }
    
} catch (Exception $e) {
    logAssignDriverError('Critical error', ['error' => $e->getMessage()]);
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Internal server error: ' . $e->getMessage()
    ], 500);
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
