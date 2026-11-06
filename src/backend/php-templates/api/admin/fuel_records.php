<?php
require_once __DIR__ . '/../../config.php';
/**
 * Fuel Records API Endpoint
 * Manages fuel records for the fleet.
 */

// Enable error reporting for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Set headers for CORS and JSON response
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include database utilities and setup
require_once __DIR__ . '/../common/db_helper.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../common/fuel_record_schema.inc.php';
require_once __DIR__ . '/../common/fuel_trip_match.inc.php';
require_once __DIR__ . '/../common/fuel_sheet_sync.inc.php';

// Handle GET request - Fetch fuel records
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        ensureFuelRecordsTableExists($conn);
        ensureFuelRecordsColumns($conn);
        
        // Build query with filters
        $sql = "SELECT fr.*, 
                v.vehicle_number as vehicle_number,
                v.name as vehicle_name,
                v.model as vehicle_model,
                COALESCE(NULLIF(TRIM(d.name), ''), NULLIF(TRIM(bd.name), '')) as driver_name,
                COALESCE(fr.driver_id, b.driver_id) as resolved_driver_id
                FROM fuel_records fr
                LEFT JOIN fleet_vehicles v ON fr.vehicle_id = v.id
                LEFT JOIN drivers d ON d.id = fr.driver_id
                LEFT JOIN bookings b ON b.id = fr.booking_id
                LEFT JOIN drivers bd ON bd.id = b.driver_id";
        
        $where = [];
        $params = [];
        $types = "";
        
        // Apply vehicle filter
        if (isset($_GET['vehicle_id']) && $_GET['vehicle_id']) {
            $where[] = "fr.vehicle_id = ?";
            $params[] = $_GET['vehicle_id'];
            $types .= "s";
        }
        
        // Apply fuel type filter
        if (isset($_GET['fuel_type']) && $_GET['fuel_type']) {
            $where[] = "fr.fuel_type = ?";
            $params[] = $_GET['fuel_type'];
            $types .= "s";
        }
        
        // Apply payment method filter
        if (isset($_GET['payment_method']) && $_GET['payment_method']) {
            $where[] = "fr.payment_method = ?";
            $params[] = $_GET['payment_method'];
            $types .= "s";
        }
        
        // Apply date range filter
        if (isset($_GET['start_date']) && $_GET['start_date']) {
            $where[] = "fr.fill_date >= ?";
            $params[] = $_GET['start_date'];
            $types .= "s";
        }
        
        if (isset($_GET['end_date']) && $_GET['end_date']) {
            $where[] = "fr.fill_date <= ?";
            $params[] = $_GET['end_date'];
            $types .= "s";
        }
        
        // Add WHERE clause if filters exist
        if (count($where) > 0) {
            $sql .= " WHERE " . implode(" AND ", $where);
        }
        
        // Add ORDER BY
        $sql .= " ORDER BY fr.fill_date DESC, fr.id DESC";
        
        // Add LIMIT if specified
        if (isset($_GET['limit']) && is_numeric($_GET['limit'])) {
            $sql .= " LIMIT " . intval($_GET['limit']);
        }
        
        // Execute query
        $fuelRecords = [];
        if (count($params) > 0) {
            // Prepared statement for filtered query
            $stmt = $conn->prepare($sql);
            $stmt->bind_param($types, ...$params);
            $stmt->execute();
            $result = $stmt->get_result();
            
            while ($row = $result->fetch_assoc()) {
                $fuelRecords[] = formatFuelRecord($row);
            }
        } else {
            // Direct query when no filters
            $result = $conn->query($sql);
            
            while ($row = $result->fetch_assoc()) {
                $fuelRecords[] = formatFuelRecord($row);
            }
        }
        
        sendSuccessResponse(['fuelRecords' => $fuelRecords], 'Fuel records fetched successfully');
    } catch (Exception $e) {
        sendErrorResponse('Failed to fetch fuel records: ' . $e->getMessage());
    }
}

// Handle POST request - Create fuel record, or refill the sheet from saved fuel
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (is_array($data) && (($data['action'] ?? '') === 'fill-sheet')) {
        $stream = !empty($data['stream']);
        try {
            set_time_limit(180);
            if ($stream) {
                @ini_set('zlib.output_compression', '0');
                @ini_set('output_buffering', 'off');
                @ini_set('implicit_flush', '1');
                while (ob_get_level() > 0) {
                    ob_end_clean();
                }
                header('Content-Type: application/x-ndjson; charset=utf-8');
                header('Cache-Control: no-cache, no-store, must-revalidate');
                header('X-Accel-Buffering: no');
                header('Content-Encoding: none');
            }
            $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
            ensureFuelRecordsTableExists($conn);
            ensureFuelRecordsColumns($conn);
            $onProgress = null;
            if ($stream) {
                $onProgress = static function (array $event): void {
                    echo json_encode($event, JSON_UNESCAPED_UNICODE) . "\n";
                    echo str_repeat(' ', 4096) . "\n";
                    flush();
                };
            }
            $report = fuel_sheet_fill_visible_rows($conn, $onProgress);
            $conn->close();
            $filled = (int) ($report['filled'] ?? 0);
            $missing = is_array($report['missing'] ?? null) ? $report['missing'] : [];
            $failedRows = is_array($report['failed'] ?? null) ? $report['failed'] : [];
            $message = $filled === 1
                ? 'Fuel on 1 trip was written onto the sheet.'
                : 'Fuel on ' . $filled . ' trips was written onto the sheet.';
            if (count($missing) > 0) {
                $message .= ' ' . count($missing) . (count($missing) === 1
                    ? ' fuel entry has no matching trip on the sheet.'
                    : ' fuel entries have no matching trip on the sheet.');
            }
            if (count($failedRows) > 0) {
                $message .= ' ' . count($failedRows) . (count($failedRows) === 1
                    ? ' trip could not be updated.'
                    : ' trips could not be updated.');
            }
            $payload = [
                'filled' => $filled,
                'missing' => $missing,
                'failed' => $failedRows,
            ];
            if ($stream) {
                echo json_encode([
                    'type' => 'result',
                    'status' => 'success',
                    'message' => $message,
                    'data' => $payload,
                ], JSON_UNESCAPED_UNICODE) . "\n";
                flush();
                exit;
            }
            sendSuccessResponse($payload, $message);
        } catch (Exception $e) {
            if ($stream) {
                echo json_encode([
                    'type' => 'error',
                    'message' => 'Failed to fill the sheet: ' . $e->getMessage(),
                ], JSON_UNESCAPED_UNICODE) . "\n";
                flush();
                exit;
            }
            sendErrorResponse('Failed to fill the sheet: ' . $e->getMessage());
        }
    }

    try {
        
        // Validate request data
        if (!isset($data['vehicleId']) || !isset($data['fillDate']) || 
            !isset($data['quantity']) || !isset($data['pricePerUnit']) || 
            !isset($data['totalCost']) || !isset($data['odometer'])) {
            sendErrorResponse('Missing required fields', [], 400);
            exit;
        }
        
        // Connect to database
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        ensureFuelRecordsTableExists($conn);
        ensureFuelRecordsColumns($conn);
        
        // Prepare data
        $vehicleId = $data['vehicleId'];
        $fillDate = date('Y-m-d', strtotime($data['fillDate']));
        $quantity = floatval($data['quantity']);
        $pricePerUnit = floatval($data['pricePerUnit']);
        $totalCost = floatval($data['totalCost']);
        $odometer = intval($data['odometer']);
        $fuelStation = isset($data['fuelStation']) ? $data['fuelStation'] : null;
        $fuelType = isset($data['fuelType']) ? $data['fuelType'] : 'Petrol';
        $mileage = isset($data['mileage']) ? floatval($data['mileage']) : null;
        $paymentMethod = isset($data['paymentMethod']) ? $data['paymentMethod'] : 'Cash';
        $bankName = null;
        $lastFourDigits = null;
        $notes = isset($data['notes']) ? $data['notes'] : null;
        $latitude = (isset($data['latitude']) && $data['latitude'] !== '' && is_numeric($data['latitude'])) ? (float)$data['latitude'] : null;
        $longitude = (isset($data['longitude']) && $data['longitude'] !== '' && is_numeric($data['longitude'])) ? (float)$data['longitude'] : null;
        
        // Set bank details if payment method is Card
        if ($paymentMethod === 'Card' && isset($data['paymentDetails'])) {
            $bankName = isset($data['paymentDetails']['bankName']) ? $data['paymentDetails']['bankName'] : null;
            $lastFourDigits = isset($data['paymentDetails']['lastFourDigits']) ? $data['paymentDetails']['lastFourDigits'] : null;
        }
        
        // Insert new fuel record (columns must match ensureFuelRecordsTableExists)
        $stmt = $conn->prepare("INSERT INTO fuel_records (
            vehicle_id, fill_date, quantity, price_per_unit, total_cost, 
            odometer, fuel_station, fuel_type, mileage, payment_method, 
            bank_name, last_four_digits, notes, latitude, longitude
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        $stmt->bind_param(
            "ssdddissdssssdd",
            $vehicleId, $fillDate, $quantity, $pricePerUnit, $totalCost,
            $odometer, $fuelStation, $fuelType, $mileage, $paymentMethod,
            $bankName, $lastFourDigits, $notes, $latitude, $longitude
        );
        
        $stmt->execute();
        $id = $stmt->insert_id;

        $postedDriverId = 0;
        if (isset($data['driverId']) && $data['driverId'] !== '' && is_numeric($data['driverId'])) {
            $postedDriverId = (int)$data['driverId'];
        }
        $recordedAt = time();
        if ($fillDate !== date('Y-m-d')) {
            $fillTs = strtotime($fillDate . ' 12:00:00');
            if ($fillTs !== false) {
                $recordedAt = $fillTs;
            }
        }
        $tripLink = fuel_fill_resolve_trip($conn, [
            'vehicleId' => (int)$vehicleId,
            'driverId' => $postedDriverId,
            'odometer' => $odometer,
            'recordedAt' => $recordedAt,
            'explicitBookingId' => isset($data['bookingId']) ? (int)$data['bookingId'] : 0,
        ]);
        $linkDriver = $postedDriverId > 0 ? $postedDriverId : (int)($tripLink['driverId'] ?? 0);
        fuel_fill_store_link(
            $conn,
            (int)$id,
            (int)($tripLink['bookingId'] ?? 0),
            $linkDriver,
            array_key_exists('loggedAfterTripEnd', $tripLink) ? $tripLink['loggedAfterTripEnd'] : null
        );
        fuel_sheet_sync_booking((int)($tripLink['bookingId'] ?? 0));
        
        // Get the created record
        $stmt = $conn->prepare("SELECT fr.*, 
                v.vehicle_number as vehicle_number,
                v.name as vehicle_name,
                v.model as vehicle_model
                FROM fuel_records fr
                LEFT JOIN fleet_vehicles v ON fr.vehicle_id = v.id
                WHERE fr.id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        
        sendSuccessResponse(['fuelRecord' => formatFuelRecord($row)], 'Fuel record created successfully');
    } catch (Exception $e) {
        sendErrorResponse('Failed to create fuel record: ' . $e->getMessage());
    }
}

// Handle PUT request - Update fuel record
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    try {
        // Get request body and ID from URL
        $data = json_decode(file_get_contents('php://input'), true);
        $recordId = isset($_GET['id']) ? intval($_GET['id']) : null;
        
        if (!$recordId) {
            sendErrorResponse('Record ID is required', [], 400);
            exit;
        }
        
        // Connect to database
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        ensureFuelRecordsTableExists($conn);
        ensureFuelRecordsColumns($conn);
        
        $colsRes = $conn->query("SHOW COLUMNS FROM fuel_records");
        $colsMeta = [];
        if ($colsRes) {
            while ($c = $colsRes->fetch_assoc()) {
                $colsMeta[$c['Field']] = true;
            }
        }
        $phys = fuelRecordPhysicalColumns($colsMeta);
        
        // Check if record exists
        $stmt = $conn->prepare("SELECT * FROM fuel_records WHERE id = ?");
        $stmt->bind_param("i", $recordId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            sendErrorResponse('Fuel record not found', [], 404);
            exit;
        }
        $existingFuel = $result->fetch_assoc();
        $existingBookingId = (int)($existingFuel['booking_id'] ?? 0);
        
        // Prepare update fields
        $updateFields = [];
        $params = [];
        $types = "";
        
        // Build dynamic update query based on provided fields
        if (isset($data['vehicleId'])) {
            $updateFields[] = "vehicle_id = ?";
            $params[] = $data['vehicleId'];
            $types .= "s";
        }
        
        if (isset($data['fillDate'])) {
            $updateFields[] = "fill_date = ?";
            $params[] = date('Y-m-d', strtotime($data['fillDate']));
            $types .= "s";
        }
        
        if (isset($data['quantity'])) {
            $updateFields[] = $phys['quantity'] . " = ?";
            $params[] = floatval($data['quantity']);
            $types .= "d";
        }
        
        if (isset($data['pricePerUnit'])) {
            $updateFields[] = $phys['price_per_unit'] . " = ?";
            $params[] = floatval($data['pricePerUnit']);
            $types .= "d";
        }
        
        if (isset($data['totalCost'])) {
            $updateFields[] = "total_cost = ?";
            $params[] = floatval($data['totalCost']);
            $types .= "d";
        }
        
        if (isset($data['odometer'])) {
            $updateFields[] = $phys['odometer'] . " = ?";
            $params[] = intval($data['odometer']);
            $types .= "i";
        }
        
        if (isset($data['fuelStation'])) {
            $updateFields[] = $phys['fuel_station'] . " = ?";
            $params[] = $data['fuelStation'];
            $types .= "s";
        }
        
        if (isset($data['fuelType'])) {
            $updateFields[] = "fuel_type = ?";
            $params[] = $data['fuelType'];
            $types .= "s";
        }
        
        if (isset($data['mileage'])) {
            $updateFields[] = "mileage = ?";
            $params[] = floatval($data['mileage']);
            $types .= "d";
        }
        
        if (isset($data['paymentMethod'])) {
            $updateFields[] = "payment_method = ?";
            $params[] = $data['paymentMethod'];
            $types .= "s";
            
            // Reset bank details if payment method changes from Card
            if ($data['paymentMethod'] !== 'Card') {
                $updateFields[] = "bank_name = NULL";
                $updateFields[] = "last_four_digits = NULL";
            }
        }
        
        // Update bank details if payment method is Card
        if (isset($data['paymentDetails']) && (!isset($data['paymentMethod']) || $data['paymentMethod'] === 'Card')) {
            if (isset($data['paymentDetails']['bankName'])) {
                $updateFields[] = "bank_name = ?";
                $params[] = $data['paymentDetails']['bankName'];
                $types .= "s";
            }
            
            if (isset($data['paymentDetails']['lastFourDigits'])) {
                $updateFields[] = "last_four_digits = ?";
                $params[] = $data['paymentDetails']['lastFourDigits'];
                $types .= "s";
            }
        }
        
        if (isset($data['notes'])) {
            $updateFields[] = "notes = ?";
            $params[] = $data['notes'];
            $types .= "s";
        }
        
        if ($phys['latitude'] && array_key_exists('latitude', $data)) {
            $updateFields[] = $phys['latitude'] . " = ?";
            $params[] = ($data['latitude'] !== null && $data['latitude'] !== '' && is_numeric($data['latitude']))
                ? (float)$data['latitude'] : null;
            $types .= "d";
        }
        if ($phys['longitude'] && array_key_exists('longitude', $data)) {
            $updateFields[] = $phys['longitude'] . " = ?";
            $params[] = ($data['longitude'] !== null && $data['longitude'] !== '' && is_numeric($data['longitude']))
                ? (float)$data['longitude'] : null;
            $types .= "d";
        }
        
        // If no fields to update, return success
        if (count($updateFields) === 0) {
            sendSuccessResponse([], 'No fields to update');
            exit;
        }
        
        // Add record ID to parameters
        $params[] = $recordId;
        $types .= "i";
        
        // Execute update
        $sql = "UPDATE fuel_records SET " . implode(", ", $updateFields) . " WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        fuel_sheet_sync_booking($existingBookingId);
        
        // Get the updated record
        $stmt = $conn->prepare("SELECT fr.*, 
                v.vehicle_number as vehicle_number,
                v.name as vehicle_name,
                v.model as vehicle_model
                FROM fuel_records fr
                LEFT JOIN fleet_vehicles v ON fr.vehicle_id = v.id
                WHERE fr.id = ?");
        $stmt->bind_param("i", $recordId);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        
        sendSuccessResponse(['fuelRecord' => formatFuelRecord($row)], 'Fuel record updated successfully');
    } catch (Exception $e) {
        sendErrorResponse('Failed to update fuel record: ' . $e->getMessage());
    }
}

// Handle DELETE request - Delete fuel record
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    try {
        $recordId = isset($_GET['id']) ? intval($_GET['id']) : null;
        
        if (!$recordId) {
            sendErrorResponse('Record ID is required', [], 400);
            exit;
        }
        
        // Connect to database
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        ensureFuelRecordsTableExists($conn);

        $linkedBookingId = 0;
        $lookup = $conn->prepare("SELECT booking_id FROM fuel_records WHERE id = ?");
        if ($lookup) {
            $lookup->bind_param("i", $recordId);
            $lookup->execute();
            $lookup->bind_result($linkedBookingId);
            $lookup->fetch();
            $lookup->close();
            $linkedBookingId = (int)$linkedBookingId;
        }
        
        // Delete record
        $stmt = $conn->prepare("DELETE FROM fuel_records WHERE id = ?");
        $stmt->bind_param("i", $recordId);
        $stmt->execute();
        
        if ($stmt->affected_rows === 0) {
            sendErrorResponse('Fuel record not found', [], 404);
            exit;
        }

        fuel_sheet_sync_booking($linkedBookingId);
        
        sendSuccessResponse([], 'Fuel record deleted successfully');
    } catch (Exception $e) {
        sendErrorResponse('Failed to delete fuel record: ' . $e->getMessage());
    }
}
?>
