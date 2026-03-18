<?php
/**
 * Admin Direct Local Fares - GET fetches from DB, POST persists fare updates
 * Mobile app uses this for local package fare updates (8hrs-80km, 10hrs-100km, 4hrs-40km)
 */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config.php';

$conn = getDbConnection();
if (!$conn) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed']);
    exit;
}

// Ensure local_package_fares table exists
$check = $conn->query("SHOW TABLES LIKE 'local_package_fares'");
if (!$check || $check->num_rows === 0) {
    $conn->query("
        CREATE TABLE IF NOT EXISTS `local_package_fares` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `vehicle_id` VARCHAR(50) NOT NULL UNIQUE,
            `price_4hrs_40km` DECIMAL(10,2) NOT NULL DEFAULT 0,
            `price_8hrs_80km` DECIMAL(10,2) NOT NULL DEFAULT 0,
            `price_10hrs_100km` DECIMAL(10,2) NOT NULL DEFAULT 0,
            `price_extra_km` DECIMAL(5,2) NOT NULL DEFAULT 0,
            `price_extra_hour` DECIMAL(5,2) NOT NULL DEFAULT 0,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // GET: Fetch fares from DB (optionally filtered by vehicle_id)
    $vehicleId = isset($_GET['vehicle_id']) ? trim($_GET['vehicle_id']) : null;
    $query = "SELECT vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour FROM local_package_fares";
    $params = [];
    $types = '';
    if ($vehicleId) {
        $query .= " WHERE vehicle_id = ?";
        $params[] = $vehicleId;
        $types = 's';
    }
    $query .= " ORDER BY vehicle_id";

    if (!empty($params)) {
        $stmt = $conn->prepare($query);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $result = $stmt->get_result();
    } else {
        $result = $conn->query($query);
    }

    $fares = [];
    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $fares[] = [
                'vehicleId' => $row['vehicle_id'],
                'price4hrs40km' => (float)$row['price_4hrs_40km'],
                'price8hrs80km' => (float)$row['price_8hrs_80km'],
                'price10hrs100km' => (float)$row['price_10hrs_100km'],
                'priceExtraKm' => (float)$row['price_extra_km'],
                'priceExtraHour' => (float)$row['price_extra_hour'],
            ];
        }
    }

    // Optional: include raw DB row for tempo_traveller when ?debug=1 (persistence debugging)
    $debug = [];
    if (!empty($_GET['debug'])) {
        $dbgStmt = $conn->prepare("SELECT * FROM local_package_fares WHERE LOWER(vehicle_id) IN ('tempo_traveller', 'tempo') ORDER BY vehicle_id");
        if ($dbgStmt) {
            $dbgStmt->execute();
            $dbgRows = $dbgStmt->get_result()->fetch_all(MYSQLI_ASSOC);
            if (!empty($dbgRows)) {
                $debug['local_fares_from_db'] = $dbgRows;
            }
        }
    }

    $response = ['status' => 'success', 'message' => 'Local fares retrieved', 'fares' => $fares];
    if (!empty($debug)) {
        $response['_debug'] = $debug;
    }
    echo json_encode($response);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // POST: Persist fare update to DB (accepts JSON, FormData, x-www-form-urlencoded)
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data) || empty($data)) {
        $data = !empty($_POST) ? $_POST : [];
    }
    if (empty($data)) {
        parse_str($raw, $parsed);
        if (!empty($parsed)) $data = $parsed;
    }

    $vehicleId = $data['vehicleId'] ?? $data['vehicle_id'] ?? $data['cabType'] ?? null;
    if (empty($vehicleId)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Vehicle ID is required']);
        exit;
    }
    $vehicleId = trim((string)$vehicleId);

    // Accept multiple field names (mobile sends price4hrs40km, package4hr40km, etc.)
    $p4 = 0;
    foreach (['price4hrs40km', 'package4hr40km', 'price_4hrs_40km'] as $k) {
        if (isset($data[$k]) && is_numeric($data[$k])) { $p4 = (float)$data[$k]; break; }
    }
    $p8 = 0;
    foreach (['price8hrs80km', 'package8hr80km', 'price_8hrs_80km'] as $k) {
        if (isset($data[$k]) && is_numeric($data[$k])) { $p8 = (float)$data[$k]; break; }
    }
    $p10 = 0;
    foreach (['price10hrs100km', 'package10hr100km', 'price_10hrs_100km'] as $k) {
        if (isset($data[$k]) && is_numeric($data[$k])) { $p10 = (float)$data[$k]; break; }
    }
    $extraKm = 0;
    foreach (['priceExtraKm', 'extraKmRate', 'price_extra_km', 'extra_km_charge'] as $k) {
        if (isset($data[$k]) && is_numeric($data[$k])) { $extraKm = (float)$data[$k]; break; }
    }
    $extraHour = 0;
    foreach (['priceExtraHour', 'extraHourRate', 'price_extra_hour', 'extra_hour_charge'] as $k) {
        if (isset($data[$k]) && is_numeric($data[$k])) { $extraHour = (float)$data[$k]; break; }
    }

    // Default extra rates if not provided
    if ($extraKm <= 0) {
        $v = strtolower($vehicleId);
        $extraKm = (strpos($v, 'tempo') !== false) ? 22 : ((strpos($v, 'innova') !== false) ? 20 : 15);
    }
    if ($extraHour <= 0) {
        $v = strtolower($vehicleId);
        $extraHour = (strpos($v, 'tempo') !== false) ? 400 : ((strpos($v, 'innova') !== false) ? 350 : 250);
    }

    // Explicit UPDATE first (case-insensitive) - matches outstation-fares-update fix for persistence.
    // ON DUPLICATE KEY / INSERT may fail to update due to collation or duplicate-key quirks.
    $updateStmt = $conn->prepare("
        UPDATE local_package_fares SET
            price_4hrs_40km=?, price_8hrs_80km=?, price_10hrs_100km=?,
            price_extra_km=?, price_extra_hour=?, updated_at=NOW()
        WHERE LOWER(TRIM(vehicle_id)) = LOWER(TRIM(?))
    ");
    $updateStmt->bind_param('ddddds', $p4, $p8, $p10, $extraKm, $extraHour, $vehicleId);
    $updateStmt->execute();
    $affected = $updateStmt->affected_rows;

    if ($affected === 0) {
        $insertStmt = $conn->prepare("INSERT INTO local_package_fares (vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour) VALUES (?,?,?,?,?,?)");
        $insertStmt->bind_param('sddddd', $vehicleId, $p4, $p8, $p10, $extraKm, $extraHour);
        if (!$insertStmt->execute()) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Failed to save fare: ' . $insertStmt->error]);
            exit;
        }
    }

    // Sync to vehicle_pricing if table exists (for backward compatibility)
    $vpCheck = $conn->query("SHOW COLUMNS FROM vehicle_pricing LIKE 'local_package_%'");
    if ($vpCheck && $vpCheck->num_rows > 0) {
        $sync = $conn->prepare("
            INSERT INTO vehicle_pricing (vehicle_id, trip_type, local_package_4hr, local_package_8hr, local_package_10hr, extra_km_charge, extra_hour_charge)
            VALUES (?, 'local', ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE local_package_4hr=VALUES(local_package_4hr), local_package_8hr=VALUES(local_package_8hr), local_package_10hr=VALUES(local_package_10hr), extra_km_charge=VALUES(extra_km_charge), extra_hour_charge=VALUES(extra_hour_charge)
        ");
        if ($sync) {
            $sync->bind_param('sddddd', $vehicleId, $p4, $p8, $p10, $extraKm, $extraHour);
            @$sync->execute();
        }
    }

    echo json_encode([
        'status' => 'success',
        'message' => 'Local fare updated successfully',
        'data' => [
            'vehicleId' => $vehicleId,
            'price4hrs40km' => $p4,
            'price8hrs80km' => $p8,
            'price10hrs100km' => $p10,
        ],
    ]);
    exit;
}

http_response_code(405);
echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
