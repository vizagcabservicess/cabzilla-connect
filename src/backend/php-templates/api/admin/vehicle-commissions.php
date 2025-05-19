
<?php
// Set proper headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include database connection
require_once __DIR__ . '/../../config.php';

// Function to log errors
function logCommissionError($message, $data = []) {
    error_log("COMMISSION ERROR: $message " . json_encode($data));
}

// Function to send JSON response
function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

try {
    // Connect to the database
    $conn = getDbConnection();

    // Get request method
    $method = $_SERVER['REQUEST_METHOD'];
    
    // GET - Fetch commission records
    if ($method === 'GET') {
        // Determine if requesting a specific commission or list
        if (isset($_GET['id'])) {
            // Get specific commission payment
            $id = intval($_GET['id']);
            $stmt = $conn->prepare("SELECT cp.*, b.booking_number, b.passenger_name, v.name AS vehicle_name, v.vehicle_number 
                                    FROM fleet_commission_payments cp
                                    LEFT JOIN bookings b ON cp.booking_id = b.id
                                    LEFT JOIN fleet_vehicles v ON cp.vehicle_id = v.id
                                    WHERE cp.id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                sendResponse(['status' => 'error', 'message' => 'Commission payment not found'], 404);
            }
            
            $payment = $result->fetch_assoc();
            sendResponse(['status' => 'success', 'data' => $payment]);
        }
        else if (isset($_GET['booking_id'])) {
            // Get commission payment for a specific booking
            $bookingId = intval($_GET['booking_id']);
            $stmt = $conn->prepare("SELECT cp.*, v.name AS vehicle_name, v.vehicle_number 
                                    FROM fleet_commission_payments cp
                                    LEFT JOIN fleet_vehicles v ON cp.vehicle_id = v.id
                                    WHERE cp.booking_id = ?");
            $stmt->bind_param("i", $bookingId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                sendResponse(['status' => 'error', 'message' => 'No commission payment found for this booking'], 404);
            }
            
            $payment = $result->fetch_assoc();
            sendResponse(['status' => 'success', 'data' => $payment]);
        }
        else if (isset($_GET['vehicle_id'])) {
            // Get commission payments for a specific vehicle
            $vehicleId = intval($_GET['vehicle_id']);
            $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 100;
            $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
            
            $stmt = $conn->prepare("SELECT cp.*, b.booking_number, b.passenger_name, b.pickup_date
                                    FROM fleet_commission_payments cp
                                    LEFT JOIN bookings b ON cp.booking_id = b.id
                                    WHERE cp.vehicle_id = ?
                                    ORDER BY cp.created_at DESC
                                    LIMIT ? OFFSET ?");
            $stmt->bind_param("iii", $vehicleId, $limit, $offset);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $payments = [];
            while ($row = $result->fetch_assoc()) {
                $payments[] = $row;
            }
            
            // Count total records for pagination
            $countStmt = $conn->prepare("SELECT COUNT(*) as total FROM fleet_commission_payments WHERE vehicle_id = ?");
            $countStmt->bind_param("i", $vehicleId);
            $countStmt->execute();
            $countResult = $countStmt->get_result();
            $totalCount = $countResult->fetch_assoc()['total'];
            
            sendResponse([
                'status' => 'success',
                'data' => $payments,
                'pagination' => [
                    'total' => intval($totalCount),
                    'limit' => $limit,
                    'offset' => $offset
                ]
            ]);
        }
        else {
            // Get all commission payments with optional filters
            $filters = [];
            $params = [];
            $bindTypes = "";
            
            if (isset($_GET['status']) && in_array($_GET['status'], ['pending', 'paid', 'cancelled'])) {
                $filters[] = "cp.status = ?";
                $params[] = $_GET['status'];
                $bindTypes .= "s";
            }
            
            if (isset($_GET['start_date'])) {
                $filters[] = "b.pickup_date >= ?";
                $params[] = $_GET['start_date'];
                $bindTypes .= "s";
            }
            
            if (isset($_GET['end_date'])) {
                $filters[] = "b.pickup_date <= ?";
                $params[] = $_GET['end_date'];
                $bindTypes .= "s";
            }
            
            $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 100;
            $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
            
            $whereClause = !empty($filters) ? "WHERE " . implode(" AND ", $filters) : "";
            
            $query = "SELECT cp.*, b.booking_number, b.passenger_name, b.pickup_date, 
                      v.name AS vehicle_name, v.vehicle_number
                      FROM fleet_commission_payments cp
                      LEFT JOIN bookings b ON cp.booking_id = b.id
                      LEFT JOIN fleet_vehicles v ON cp.vehicle_id = v.id
                      $whereClause
                      ORDER BY cp.created_at DESC
                      LIMIT ? OFFSET ?";
            
            $stmt = $conn->prepare($query);
            
            // Add pagination parameters
            $bindTypes .= "ii";
            $params[] = $limit;
            $params[] = $offset;
            
            if (!empty($params)) {
                $stmt->bind_param($bindTypes, ...$params);
            }
            
            $stmt->execute();
            $result = $stmt->get_result();
            
            $payments = [];
            while ($row = $result->fetch_assoc()) {
                $payments[] = $row;
            }
            
            // Count total records for pagination
            $countQuery = "SELECT COUNT(*) as total 
                           FROM fleet_commission_payments cp
                           LEFT JOIN bookings b ON cp.booking_id = b.id
                           $whereClause";
            
            $countStmt = $conn->prepare($countQuery);
            
            if (!empty($params)) {
                // Remove the pagination parameters
                array_pop($params);
                array_pop($params);
                
                if (!empty($params)) {
                    $countStmt->bind_param(substr($bindTypes, 0, -2), ...$params);
                }
            }
            
            $countStmt->execute();
            $countResult = $countStmt->get_result();
            $totalCount = $countResult->fetch_assoc()['total'];
            
            sendResponse([
                'status' => 'success',
                'data' => $payments,
                'pagination' => [
                    'total' => intval($totalCount),
                    'limit' => $limit,
                    'offset' => $offset
                ]
            ]);
        }
    }
    
    // POST - Create or calculate a commission payment
    else if ($method === 'POST') {
        // Get request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Check if this is a calculation request or a payment record creation
        if (isset($data['action']) && $data['action'] === 'calculate') {
            // Calculation request - requires booking_id or amount and vehicle_id
            if (!isset($data['booking_id']) && (!isset($data['amount']) || !isset($data['vehicle_id']))) {
                sendResponse(['status' => 'error', 'message' => 'Missing required parameters for calculation'], 400);
            }
            
            // If booking_id provided, fetch booking details
            if (isset($data['booking_id'])) {
                $bookingId = intval($data['booking_id']);
                $bookingStmt = $conn->prepare("SELECT id, total_amount, cab_type, vehicle_number FROM bookings WHERE id = ?");
                $bookingStmt->bind_param("i", $bookingId);
                $bookingStmt->execute();
                $bookingResult = $bookingStmt->get_result();
                
                if ($bookingResult->num_rows === 0) {
                    sendResponse(['status' => 'error', 'message' => 'Booking not found'], 404);
                }
                
                $booking = $bookingResult->fetch_assoc();
                $amount = floatval($booking['total_amount']);
                
                // Find the vehicle ID from vehicle_number
                if (isset($booking['vehicle_number']) && !empty($booking['vehicle_number'])) {
                    $vehicleStmt = $conn->prepare("SELECT id, commission_percentage, use_default_commission FROM fleet_vehicles WHERE vehicle_number = ?");
                    $vehicleStmt->bind_param("s", $booking['vehicle_number']);
                    $vehicleStmt->execute();
                    $vehicleResult = $vehicleStmt->get_result();
                    
                    if ($vehicleResult->num_rows === 0) {
                        // Try to find by vehicle type/cab type
                        if (isset($booking['cab_type']) && !empty($booking['cab_type'])) {
                            $vehicleStmt = $conn->prepare("SELECT id, commission_percentage, use_default_commission FROM fleet_vehicles WHERE vehicleType = ? OR vehicle_type = ? LIMIT 1");
                            $vehicleStmt->bind_param("ss", $booking['cab_type'], $booking['cab_type']);
                            $vehicleStmt->execute();
                            $vehicleResult = $vehicleStmt->get_result();
                        }
                    }
                    
                    if ($vehicleResult->num_rows === 0) {
                        sendResponse(['status' => 'error', 'message' => 'Vehicle not found for this booking'], 404);
                    }
                    
                    $vehicle = $vehicleResult->fetch_assoc();
                    $vehicleId = $vehicle['id'];
                    $customCommission = $vehicle['commission_percentage'];
                    $useDefaultCommission = $vehicle['use_default_commission'];
                } else {
                    sendResponse(['status' => 'error', 'message' => 'No vehicle assigned to this booking'], 400);
                }
            } else {
                // Direct calculation with provided amount and vehicle_id
                $amount = floatval($data['amount']);
                $vehicleId = intval($data['vehicle_id']);
                
                // Get vehicle commission details
                $vehicleStmt = $conn->prepare("SELECT commission_percentage, use_default_commission FROM fleet_vehicles WHERE id = ?");
                $vehicleStmt->bind_param("i", $vehicleId);
                $vehicleStmt->execute();
                $vehicleResult = $vehicleStmt->get_result();
                
                if ($vehicleResult->num_rows === 0) {
                    sendResponse(['status' => 'error', 'message' => 'Vehicle not found'], 404);
                }
                
                $vehicle = $vehicleResult->fetch_assoc();
                $customCommission = $vehicle['commission_percentage'];
                $useDefaultCommission = $vehicle['use_default_commission'];
                $bookingId = null;
            }
            
            // Get default commission percentage if needed
            if ($useDefaultCommission || $customCommission === null) {
                $defaultResult = $conn->query("SELECT default_percentage FROM fleet_commission_settings WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1");
                
                if ($defaultResult->num_rows === 0) {
                    // No commission setting found, use 10% as default
                    $commissionPercentage = 10.00;
                } else {
                    $defaultSetting = $defaultResult->fetch_assoc();
                    $commissionPercentage = floatval($defaultSetting['default_percentage']);
                }
            } else {
                $commissionPercentage = floatval($customCommission);
            }
            
            // Calculate commission amount
            $commissionAmount = $amount * ($commissionPercentage / 100);
            
            sendResponse([
                'status' => 'success',
                'data' => [
                    'booking_id' => $bookingId,
                    'vehicle_id' => $vehicleId,
                    'total_amount' => $amount,
                    'commission_percentage' => $commissionPercentage,
                    'commission_amount' => $commissionAmount,
                    'calculated_only' => true
                ]
            ]);
        } 
        else {
            // Create a new commission payment record
            if (!isset($data['booking_id']) || !isset($data['vehicle_id']) || !isset($data['total_amount']) || !isset($data['commission_percentage'])) {
                sendResponse(['status' => 'error', 'message' => 'Missing required fields'], 400);
            }
            
            $bookingId = intval($data['booking_id']);
            $vehicleId = intval($data['vehicle_id']);
            $driverId = isset($data['driver_id']) ? intval($data['driver_id']) : null;
            $totalAmount = floatval($data['total_amount']);
            $commissionPercentage = floatval($data['commission_percentage']);
            $commissionAmount = floatval($data['commission_amount']);
            $status = isset($data['status']) ? $data['status'] : 'pending';
            $notes = isset($data['notes']) ? $data['notes'] : '';
            
            // Check if commission record already exists for this booking
            $checkStmt = $conn->prepare("SELECT id FROM fleet_commission_payments WHERE booking_id = ?");
            $checkStmt->bind_param("i", $bookingId);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            
            if ($checkResult->num_rows > 0) {
                $existingId = $checkResult->fetch_assoc()['id'];
                sendResponse(['status' => 'error', 'message' => 'Commission payment already exists for this booking', 'existing_id' => $existingId], 400);
            }
            
            // Insert commission payment
            $stmt = $conn->prepare("INSERT INTO fleet_commission_payments (booking_id, vehicle_id, driver_id, total_amount, commission_amount, commission_percentage, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("iiidddss", $bookingId, $vehicleId, $driverId, $totalAmount, $commissionAmount, $commissionPercentage, $status, $notes);
            
            if ($stmt->execute()) {
                $id = $conn->insert_id;
                
                // Fetch the created commission payment
                $result = $conn->query("SELECT cp.*, b.booking_number, v.name AS vehicle_name, v.vehicle_number 
                                       FROM fleet_commission_payments cp
                                       LEFT JOIN bookings b ON cp.booking_id = b.id
                                       LEFT JOIN fleet_vehicles v ON cp.vehicle_id = v.id
                                       WHERE cp.id = $id");
                $payment = $result->fetch_assoc();
                
                sendResponse(['status' => 'success', 'message' => 'Commission payment created successfully', 'data' => $payment]);
            } else {
                logCommissionError("Error creating commission payment", ['error' => $conn->error]);
                sendResponse(['status' => 'error', 'message' => 'Failed to create commission payment'], 500);
            }
        }
    }
    
    // PUT - Update commission payment status
    else if ($method === 'PUT') {
        // Get request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['id'])) {
            sendResponse(['status' => 'error', 'message' => 'Commission payment ID is required'], 400);
        }
        
        $id = intval($data['id']);
        
        // Check if payment exists
        $checkStmt = $conn->prepare("SELECT id FROM fleet_commission_payments WHERE id = ?");
        $checkStmt->bind_param("i", $id);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult->num_rows === 0) {
            sendResponse(['status' => 'error', 'message' => 'Commission payment not found'], 404);
        }
        
        // Prepare update fields
        $updateFields = [];
        $queryParams = [];
        $bindTypes = "";
        
        if (isset($data['status']) && in_array($data['status'], ['pending', 'paid', 'cancelled'])) {
            $updateFields[] = "status = ?";
            $queryParams[] = $data['status'];
            $bindTypes .= "s";
            
            // If status is paid, set payment date to current time
            if ($data['status'] === 'paid' && !isset($data['payment_date'])) {
                $updateFields[] = "payment_date = NOW()";
            }
        }
        
        if (isset($data['payment_date'])) {
            $updateFields[] = "payment_date = ?";
            $queryParams[] = $data['payment_date'];
            $bindTypes .= "s";
        }
        
        if (isset($data['payment_method'])) {
            $updateFields[] = "payment_method = ?";
            $queryParams[] = $data['payment_method'];
            $bindTypes .= "s";
        }
        
        if (isset($data['transaction_id'])) {
            $updateFields[] = "transaction_id = ?";
            $queryParams[] = $data['transaction_id'];
            $bindTypes .= "s";
        }
        
        if (isset($data['notes'])) {
            $updateFields[] = "notes = ?";
            $queryParams[] = $data['notes'];
            $bindTypes .= "s";
        }
        
        if (empty($updateFields)) {
            sendResponse(['status' => 'error', 'message' => 'No fields to update'], 400);
        }
        
        // Add ID as the last parameter
        $queryParams[] = $id;
        $bindTypes .= "i";
        
        // Update commission payment
        $updateQuery = "UPDATE fleet_commission_payments SET " . implode(", ", $updateFields) . " WHERE id = ?";
        $updateStmt = $conn->prepare($updateQuery);
        
        // Dynamically bind parameters
        $updateStmt->bind_param($bindTypes, ...$queryParams);
        
        if ($updateStmt->execute()) {
            // Fetch the updated payment
            $result = $conn->query("SELECT cp.*, b.booking_number, v.name AS vehicle_name, v.vehicle_number 
                                   FROM fleet_commission_payments cp
                                   LEFT JOIN bookings b ON cp.booking_id = b.id
                                   LEFT JOIN fleet_vehicles v ON cp.vehicle_id = v.id
                                   WHERE cp.id = $id");
            $payment = $result->fetch_assoc();
            
            sendResponse(['status' => 'success', 'message' => 'Commission payment updated successfully', 'data' => $payment]);
        } else {
            logCommissionError("Error updating commission payment", ['error' => $conn->error]);
            sendResponse(['status' => 'error', 'message' => 'Failed to update commission payment'], 500);
        }
    }
    
    // DELETE - Delete a commission payment record
    else if ($method === 'DELETE') {
        // Get ID from URL
        if (!isset($_GET['id'])) {
            sendResponse(['status' => 'error', 'message' => 'Commission payment ID is required'], 400);
        }
        
        $id = intval($_GET['id']);
        
        // Check if payment exists
        $checkStmt = $conn->prepare("SELECT id FROM fleet_commission_payments WHERE id = ?");
        $checkStmt->bind_param("i", $id);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult->num_rows === 0) {
            sendResponse(['status' => 'error', 'message' => 'Commission payment not found'], 404);
        }
        
        // Delete commission payment
        $deleteStmt = $conn->prepare("DELETE FROM fleet_commission_payments WHERE id = ?");
        $deleteStmt->bind_param("i", $id);
        
        if ($deleteStmt->execute()) {
            sendResponse(['status' => 'success', 'message' => 'Commission payment deleted successfully']);
        } else {
            logCommissionError("Error deleting commission payment", ['error' => $conn->error]);
            sendResponse(['status' => 'error', 'message' => 'Failed to delete commission payment'], 500);
        }
    }
    
    // Unsupported method
    else {
        sendResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    logCommissionError("Vehicle commissions API error", ['error' => $e->getMessage()]);
    sendResponse(['status' => 'error', 'message' => 'An error occurred: ' . $e->getMessage()], 500);
}

// Close database connection
if (isset($conn)) {
    $conn->close();
}
