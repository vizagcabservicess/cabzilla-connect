<?php
// reports.php - Generate various types of reports
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Debug, *');
header('Cache-Control: no-cache, no-store, must-revalidate');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Function to send JSON response
function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

// Get database connection
try {
    $conn = getDbConnectionWithRetry();
} catch (Exception $e) {
    sendResponse(['status' => 'error', 'message' => 'Database connection failed: ' . $e->getMessage()], 500);
}

// Debug logging
$logFile = __DIR__ . '/../../logs/reports_' . date('Y-m-d') . '.log';
function debugLog($message, $data = null) {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    $dataStr = $data ? json_encode($data, JSON_PRETTY_PRINT) : '';
    file_put_contents(
        $logFile, 
        "[$timestamp] $message $dataStr\n", 
        FILE_APPEND
    );
}

debugLog("Reports API called with params", $_GET);

// Get report parameters from query string
$reportType = isset($_GET['type']) ? $_GET['type'] : 'bookings';
$startDate = isset($_GET['start_date']) ? $_GET['start_date'] : date('Y-m-d', strtotime('-30 days'));
$endDate = isset($_GET['end_date']) ? $_GET['end_date'] : date('Y-m-d');
$filterDate = isset($_GET['date']) ? $_GET['date'] : null; // For drill-down: fetch bookings for single date
$format = isset($_GET['format']) ? $_GET['format'] : 'json';
$detailed = isset($_GET['detailed']) ? filter_var($_GET['detailed'], FILTER_VALIDATE_BOOLEAN) : false;
$period = isset($_GET['period']) ? $_GET['period'] : 'custom'; // 'daily', 'weekly', 'monthly', 'yearly'
$withGst = isset($_GET['gst']) ? filter_var($_GET['gst'], FILTER_VALIDATE_BOOLEAN) : false;
$paymentMethod = isset($_GET['payment_method']) ? $_GET['payment_method'] : '';
$onlyGstEnabled = isset($_GET['only_gst_enabled']) ? filter_var($_GET['only_gst_enabled'], FILTER_VALIDATE_BOOLEAN) : false;
$vehicleId = isset($_GET['vehicle_id']) ? trim($_GET['vehicle_id']) : '';
$driverId = isset($_GET['driver_id']) ? trim($_GET['driver_id']) : '';
$serviceType = isset($_GET['service_type']) ? trim($_GET['service_type']) : '';
$tripStatusFilter = isset($_GET['trip_status']) ? strtolower(trim($_GET['trip_status'])) : '';
$paymentStatusFilter = isset($_GET['payment_status']) ? strtolower(trim($_GET['payment_status'])) : '';

function buildTripStatusSqlClause(mysqli $conn, $tripStatusFilter, $tableAlias = 'b') {
    $pref = ($tableAlias !== '' && $tableAlias !== null) ? $tableAlias . '.' : '';
    $sql = '';
    $ts = strtolower(trim($tripStatusFilter ?? ''));
    if ($ts !== '' && $ts !== 'all') {
        $allowed = ['pending', 'confirmed', 'assigned', 'completed', 'cancelled'];
        if (in_array($ts, $allowed, true)) {
            $sql .= " AND LOWER(TRIM(COALESCE({$pref}status,''))) = '" . $conn->real_escape_string($ts) . "'";
        }
    }
    return $sql;
}

/** Filter on raw bookings.payment_status (fallback when payments table missing) */
function buildLegacyPaymentStatusSqlClause(mysqli $conn, $paymentStatusFilter, $tableAlias = 'b') {
    $pref = ($tableAlias !== '' && $tableAlias !== null) ? $tableAlias . '.' : '';
    $sql = '';
    $f = strtolower(trim($paymentStatusFilter ?? ''));
    if ($f !== '' && $f !== 'all') {
        if ($f === 'paid') {
            $sql .= " AND LOWER(TRIM(COALESCE({$pref}payment_status,''))) IN ('paid','payment_received','successful','paid_full')";
        } elseif ($f === 'partial') {
            $sql .= " AND LOWER(TRIM(COALESCE({$pref}payment_status,''))) IN ('partial','partially_paid')";
        } elseif ($f === 'pending') {
            $sql .= " AND LOWER(TRIM(COALESCE({$pref}payment_status,''))) NOT IN ('paid','payment_received','successful','paid_full','partial','partially_paid')";
        }
    }
    return $sql;
}

/**
 * Extra WHERE for trip + legacy payment column. $tableAlias e.g. 'b' or '' for no prefix.
 */
function buildTripPaymentSqlClause(mysqli $conn, $tripStatusFilter, $paymentStatusFilter, $tableAlias = 'b') {
    return buildTripStatusSqlClause($conn, $tripStatusFilter, $tableAlias)
        . buildLegacyPaymentStatusSqlClause($conn, $paymentStatusFilter, $tableAlias);
}

function reportsPaymentsTableExists(mysqli $conn) {
    static $ok = null;
    if ($ok === null) {
        $t = @$conn->query("SHOW TABLES LIKE 'payments'");
        $ok = ($t && $t->num_rows > 0);
    }
    return $ok;
}

function reportsPaymentJoinSql($bookingAlias, $payAlias = 'rpt_pmts') {
    return "LEFT JOIN (
        SELECT booking_id, SUM(amount) AS paid_amount
        FROM payments
        WHERE status = 'confirmed'
        GROUP BY booking_id
    ) {$payAlias} ON {$payAlias}.booking_id = {$bookingAlias}.id";
}

function reportsAdvancePaidSqlExpr(mysqli $conn, $bookingAlias = 'b') {
    static $hasCol = null;
    if ($hasCol === null) {
        $c = @$conn->query("SHOW COLUMNS FROM bookings LIKE 'advance_paid_amount'");
        $hasCol = ($c && $c->num_rows > 0);
    }
    return $hasCol ? "COALESCE({$bookingAlias}.advance_paid_amount, 0)" : "0";
}

/** Same buckets as admin bookings.php list (payments + advance vs total_amount) */
function reportsComputedPaymentCaseSql(mysqli $conn, $bookingAlias = 'b', $payAlias = 'rpt_pmts') {
    $adv = reportsAdvancePaidSqlExpr($conn, $bookingAlias);
    $paid = "COALESCE({$payAlias}.paid_amount, 0)";
    return "CASE
        WHEN LOWER(COALESCE({$bookingAlias}.status,'')) = 'cancelled' THEN 'cancelled'
        WHEN ({$paid} + {$adv}) >= {$bookingAlias}.total_amount AND ({$paid} + {$adv}) > 0 THEN 'paid'
        WHEN ({$paid} + {$adv}) > 0 THEN 'partial'
        ELSE 'pending'
    END";
}

function buildComputedPaymentFilterWhere(mysqli $conn, $paymentStatusFilter, $bookingAlias = 'b', $payAlias = 'rpt_pmts') {
    $f = strtolower(trim($paymentStatusFilter ?? ''));
    if ($f === '' || $f === 'all') {
        return '';
    }
    $case = reportsComputedPaymentCaseSql($conn, $bookingAlias, $payAlias);
    if ($f === 'paid') {
        return " AND ({$case}) = 'paid'";
    }
    if ($f === 'partial') {
        return " AND ({$case}) = 'partial'";
    }
    if ($f === 'pending') {
        return " AND ({$case}) = 'pending'";
    }
    return '';
}

/**
 * Computed payment bucket for single-table "FROM bookings" queries (correlated subquery — no JOIN refactor).
 * Matches admin bookings.php calculated_payment_status.
 */
function reportsComputedPaymentCaseSqlSingleTable(mysqli $conn, $tableName = 'bookings') {
    $adv = reportsAdvancePaidSqlExpr($conn, $tableName);
    $subPaid = "(SELECT COALESCE(SUM(pay_rpt.amount), 0) FROM payments pay_rpt WHERE pay_rpt.booking_id = {$tableName}.id AND pay_rpt.status = 'confirmed')";
    return "CASE
        WHEN LOWER(COALESCE({$tableName}.status,'')) = 'cancelled' THEN 'cancelled'
        WHEN ({$subPaid} + {$adv}) >= {$tableName}.total_amount AND ({$subPaid} + {$adv}) > 0 THEN 'paid'
        WHEN ({$subPaid} + {$adv}) > 0 THEN 'partial'
        ELSE 'pending'
    END";
}

function buildBookingsReportPaymentFilterSql(mysqli $conn, $paymentStatusFilter) {
    $f = strtolower(trim($paymentStatusFilter ?? ''));
    if ($f === '' || $f === 'all') {
        return '';
    }
    if (!reportsPaymentsTableExists($conn)) {
        return buildLegacyPaymentStatusSqlClause($conn, $paymentStatusFilter, '');
    }
    $case = reportsComputedPaymentCaseSqlSingleTable($conn, 'bookings');
    if ($f === 'paid') {
        return " AND ({$case}) = 'paid'";
    }
    if ($f === 'partial') {
        return " AND ({$case}) = 'partial'";
    }
    if ($f === 'pending') {
        return " AND ({$case}) = 'pending'";
    }
    return '';
}

/** payment_status only (e.g. non_gst_bills — no trip status) */
function buildPaymentStatusOnlySqlClause($paymentStatusFilter) {
    $f = strtolower(trim($paymentStatusFilter ?? ''));
    if ($f === '' || $f === 'all') {
        return '';
    }
    if ($f === 'paid') {
        return " AND LOWER(TRIM(COALESCE(payment_status,''))) IN ('paid','payment_received','successful','paid_full')";
    }
    if ($f === 'partial') {
        return " AND LOWER(TRIM(COALESCE(payment_status,''))) IN ('partial','partially_paid')";
    }
    if ($f === 'pending') {
        return " AND LOWER(TRIM(COALESCE(payment_status,''))) NOT IN ('paid','payment_received','successful','paid_full','partial','partially_paid')";
    }
    return '';
}

// Calculate dynamic date range based on period parameter
if ($period !== 'custom') {
    $today = date('Y-m-d');
    switch ($period) {
        case 'daily':
            $startDate = $today;
            $endDate = $today;
            break;
        case 'weekly':
            $startDate = date('Y-m-d', strtotime('monday this week'));
            $endDate = date('Y-m-d', strtotime('sunday this week'));
            break;
        case 'monthly':
            $startDate = date('Y-m-01');
            $endDate = date('Y-m-t');
            break;
        case 'last_month':
            $startDate = date('Y-m-01', strtotime('first day of last month'));
            $endDate = date('Y-m-t', strtotime('last day of last month'));
            break;
        case 'quarterly':
            $month = date('n');
            $quarter = ceil($month / 3);
            $startDate = date('Y-' . (($quarter - 1) * 3 + 1) . '-01');
            $endDate = date('Y-m-t', strtotime($startDate . ' +2 month'));
            break;
        case 'yearly':
            $startDate = date('Y-01-01');
            $endDate = date('Y-12-31');
            break;
        case 'last_year':
            $startDate = date('Y-01-01', strtotime('-1 year'));
            $endDate = date('Y-12-31', strtotime('-1 year'));
            break;
    }
}

// DB setup - ensure required tables exist
require_once __DIR__ . '/db_setup.php';

// For debugging
debugLog("Report request", [
    "type" => $reportType,
    "period" => $period,
    "start" => $startDate,
    "end" => $endDate,
    "format" => $format,
    "detailed" => $detailed,
    "gst" => $withGst,
    "payment_method" => $paymentMethod,
    "only_gst_enabled" => $onlyGstEnabled,
    "trip_status" => $tripStatusFilter,
    "payment_status" => $paymentStatusFilter
]);

try {
    $reportData = [];
    
    switch ($reportType) {
        case 'filter_options':
            // Return filter dropdown options (vehicles, drivers) - same API, no date range needed
            $filterWhat = isset($_GET['filter']) ? trim($_GET['filter']) : 'vehicles';
            $vehicleList = [];
            $driverList = [];
            if ($filterWhat === 'vehicles' || $filterWhat === 'all') {
                $fvCheck = @$conn->query("SHOW TABLES LIKE 'fleet_vehicles'");
                if ($fvCheck && $fvCheck->num_rows > 0) {
                    $vq = @$conn->query("SELECT id, name, vehicle_number FROM fleet_vehicles ORDER BY COALESCE(name, vehicle_number), id");
                    if ($vq) {
                        while ($v = $vq->fetch_assoc()) {
                            $vehicleList[] = ['id' => (int)$v['id'], 'name' => $v['name'] ?? $v['vehicle_number'] ?? 'Vehicle ' . $v['id'], 'vehicle_number' => $v['vehicle_number'] ?? ''];
                        }
                    }
                }
                // Fallback: get vehicles from bookings (vehicles that have been assigned to trips)
                if (empty($vehicleList)) {
                    $bCheck = @$conn->query("SHOW COLUMNS FROM bookings LIKE 'fleet_vehicle_id'");
                    if ($bCheck && $bCheck->num_rows > 0) {
                        $bq = @$conn->query("SELECT DISTINCT b.fleet_vehicle_id as id FROM bookings b WHERE b.fleet_vehicle_id IS NOT NULL AND b.fleet_vehicle_id != '' ORDER BY b.fleet_vehicle_id");
                        if ($bq) {
                            while ($row = $bq->fetch_assoc()) {
                                $id = $row['id'];
                                $vehicleList[] = ['id' => (int)$id, 'name' => 'Vehicle ' . $id];
                            }
                        }
                    }
                }
            }
            if ($filterWhat === 'drivers' || $filterWhat === 'all') {
                $dCheck = @$conn->query("SHOW TABLES LIKE 'drivers'");
                if ($dCheck && $dCheck->num_rows > 0) {
                    $dq = @$conn->query("SELECT id, name FROM drivers ORDER BY name");
                    if ($dq) {
                        while ($d = $dq->fetch_assoc()) {
                            $driverList[] = ['id' => (int)$d['id'], 'name' => $d['name'] ?? 'Driver #' . $d['id']];
                        }
                    }
                }
            }
            $reportData = ['vehicles' => $vehicleList, 'drivers' => $driverList];
            break;

        case 'bookings':
            // Fetch bookings by vehicle_id and date range (for Vehicles report trip drill-down)
            if (!empty($vehicleId)) {
                $bCheck = @$conn->query("SHOW COLUMNS FROM bookings LIKE 'fleet_vehicle_id'");
                if ($bCheck && $bCheck->num_rows > 0) {
                    $sql = "SELECT id, booking_number, passenger_name, passenger_phone, pickup_location, drop_location, 
                            pickup_date, DATE_FORMAT(pickup_date, '%H:%i') AS pickup_time, total_amount, status, created_at 
                            FROM bookings 
                            WHERE fleet_vehicle_id = ? AND DATE(created_at) BETWEEN ? AND ? ";
                    $sql .= buildTripStatusSqlClause($conn, $tripStatusFilter, '');
                    $sql .= buildBookingsReportPaymentFilterSql($conn, $paymentStatusFilter);
                    $sql .= " ORDER BY created_at DESC";
                    $stmt = $conn->prepare($sql);
                    $vidInt = ctype_digit((string)$vehicleId) ? (int)$vehicleId : 0;
                    if ($vidInt > 0) {
                        $stmt->bind_param("iss", $vidInt, $startDate, $endDate);
                        $stmt->execute();
                        $result = $stmt->get_result();
                        $bookings = [];
                        while ($row = $result->fetch_assoc()) {
                            $bookings[] = $row;
                        }
                        $reportData = $bookings;
                        break;
                    }
                }
            }
            // Drill-down: fetch bookings for a single date when date param is provided
            if ($filterDate) {
                $sql = "SELECT id, booking_number, passenger_name, passenger_phone, pickup_location, drop_location, 
                        pickup_date, DATE_FORMAT(pickup_date, '%H:%i') AS pickup_time, total_amount, status, created_at 
                        FROM bookings WHERE DATE(created_at) = ? ";
                $sql .= buildTripStatusSqlClause($conn, $tripStatusFilter, '');
                $sql .= buildBookingsReportPaymentFilterSql($conn, $paymentStatusFilter);
                $sql .= " ORDER BY created_at DESC";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("s", $filterDate);
                $stmt->execute();
                $result = $stmt->get_result();
                $bookings = [];
                while ($row = $result->fetch_assoc()) {
                    $bookings[] = $row;
                }
                $reportData = $bookings;
            } elseif ($detailed) {
                $sql = "SELECT * FROM bookings WHERE DATE(created_at) BETWEEN ? AND ? ";
                $sql .= buildTripStatusSqlClause($conn, $tripStatusFilter, '');
                $sql .= buildBookingsReportPaymentFilterSql($conn, $paymentStatusFilter);
                $sql .= " ORDER BY created_at DESC";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("ss", $startDate, $endDate);
                $stmt->execute();
                $result = $stmt->get_result();
                
                $bookings = [];
                while ($row = $result->fetch_assoc()) {
                    $bookings[] = $row;
                }
                $reportData = $bookings;
            } else {
                // Summary report
                $summaryData = [];
                
                // Total bookings
                $sql = "SELECT COUNT(*) as total FROM bookings WHERE DATE(created_at) BETWEEN ? AND ?";
                $sql .= buildTripStatusSqlClause($conn, $tripStatusFilter, '');
                $sql .= buildBookingsReportPaymentFilterSql($conn, $paymentStatusFilter);
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("ss", $startDate, $endDate);
                $stmt->execute();
                $result = $stmt->get_result()->fetch_assoc();
                $summaryData['totalBookings'] = (int)$result['total'];
                
                // Bookings by status
                $sql = "SELECT status, COUNT(*) as count FROM bookings WHERE DATE(created_at) BETWEEN ? AND ?";
                $sql .= buildTripStatusSqlClause($conn, $tripStatusFilter, '');
                $sql .= buildBookingsReportPaymentFilterSql($conn, $paymentStatusFilter);
                $sql .= " GROUP BY status";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("ss", $startDate, $endDate);
                $stmt->execute();
                $result = $stmt->get_result();
                
                $bookingsByStatus = [];
                while ($row = $result->fetch_assoc()) {
                    $key = strtolower(trim($row['status'] ?? ''));
                    if ($key === '') $key = 'pending';
                    if (!isset($bookingsByStatus[$key])) $bookingsByStatus[$key] = 0;
                    $bookingsByStatus[$key] += (int)$row['count'];
                }
                $summaryData['bookingsByStatus'] = $bookingsByStatus;
                
                // Daily booking counts with per-date status breakdown
                $sql = "SELECT DATE(created_at) as date, COUNT(*) as count,
                        SUM(CASE WHEN LOWER(COALESCE(status,'')) = 'completed' THEN 1 ELSE 0 END) as completed,
                        SUM(CASE WHEN LOWER(COALESCE(status,'')) = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                        SUM(CASE WHEN LOWER(COALESCE(status,'')) = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
                        SUM(CASE WHEN LOWER(COALESCE(status,'')) = 'assigned' THEN 1 ELSE 0 END) as assigned,
                        SUM(CASE WHEN LOWER(COALESCE(status,'')) = 'pending' THEN 1 ELSE 0 END) as pending
                        FROM bookings 
                        WHERE DATE(created_at) BETWEEN ? AND ? ";
                $sql .= buildTripStatusSqlClause($conn, $tripStatusFilter, '');
                $sql .= buildBookingsReportPaymentFilterSql($conn, $paymentStatusFilter);
                $sql .= " GROUP BY DATE(created_at) ORDER BY DATE(created_at)";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("ss", $startDate, $endDate);
                $stmt->execute();
                $result = $stmt->get_result();
                
                $dailyBookings = [];
                while ($row = $result->fetch_assoc()) {
                    $dailyBookings[] = [
                        'date' => $row['date'],
                        'count' => (int)$row['count'],
                        'completed' => (int)$row['completed'],
                        'cancelled' => (int)$row['cancelled'],
                        'confirmed' => (int)$row['confirmed'],
                        'assigned' => (int)$row['assigned'],
                        'pending' => (int)$row['pending']
                    ];
                }
                $summaryData['dailyBookings'] = $dailyBookings;
                
                $reportData = $summaryData;
            }
            break;
            
        case 'revenue':
            // Get revenue statistics (exclude cancelled)
            if ($detailed) {
                $sqlBase = "SELECT id, booking_number, passenger_name, passenger_phone, total_amount, payment_method, payment_status";
                
                // Add GST related columns if requested
                if ($withGst) {
                    $sqlBase .= ", gst_enabled, extra_charges, gst_number, company_name, company_address, total_amount as taxable_value";
                }
                
                $sqlBase .= ", created_at FROM bookings WHERE DATE(created_at) BETWEEN ? AND ? AND (status IS NULL OR status != 'cancelled')";
                
                // Filter by payment method if specified
                if (!empty($paymentMethod)) {
                    $sqlBase .= " AND payment_method = ?";
                }
                
                $sqlBase .= " ORDER BY created_at DESC";
                
                $stmt = $conn->prepare($sqlBase);
                
                if (!empty($paymentMethod)) {
                    $stmt->bind_param("sss", $startDate, $endDate, $paymentMethod);
                } else {
                    $stmt->bind_param("ss", $startDate, $endDate);
                }
                
                $stmt->execute();
                $result = $stmt->get_result();
                
                $transactions = [];
                while ($row = $result->fetch_assoc()) {
                    // Calculate GST if applicable
                    if ($withGst && ($row['gst_enabled'] ?? 0) == 1) {
                        // Default GST rate
                        $gstRate = 5; // 5% GST rate for transport services
                        
                        // Calculate GST amount
                        $taxableValue = (float)$row['taxable_value'];
                        $gstAmount = $taxableValue * ($gstRate / 100);
                        
                        // Add GST information
                        $row['gst_rate'] = $gstRate . '%';
                        $row['gst_amount'] = $gstAmount;
                    }
                    
                    $transactions[] = $row;
                }
                $reportData = $transactions;
            } else {
                // Summary revenue report (exclude cancelled bookings)
                $summaryData = [];
                
                // Base query parts - exclude cancelled from revenue
                $whereClause = "DATE(created_at) BETWEEN ? AND ? AND (status IS NULL OR status != 'cancelled')";
                $params = [$startDate, $endDate];
                $types = "ss";
                
                // Filter by payment method if specified
                if (!empty($paymentMethod)) {
                    $whereClause .= " AND payment_method = ?";
                    $params[] = $paymentMethod;
                    $types .= "s";
                }
                
                // Total revenue
                $sql = "SELECT SUM(total_amount) as total FROM bookings WHERE $whereClause";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param($types, ...$params);
                $stmt->execute();
                $result = $stmt->get_result()->fetch_assoc();
                $summaryData['totalRevenue'] = (float)($result['total'] ?? 0);
                
                // Revenue by trip type
                $sql = "SELECT trip_type, SUM(total_amount) as total FROM bookings 
                        WHERE $whereClause GROUP BY trip_type";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param($types, ...$params);
                $stmt->execute();
                $result = $stmt->get_result();
                
                $revenueByTripType = [];
                while ($row = $result->fetch_assoc()) {
                    $revenueByTripType[$row['trip_type']] = (float)$row['total'];
                }
                $summaryData['revenueByTripType'] = $revenueByTripType;
                
                // Revenue by payment method
                $sql = "SELECT payment_method, SUM(total_amount) as total FROM bookings 
                        WHERE $whereClause AND payment_method IS NOT NULL AND payment_method != '' 
                        GROUP BY payment_method";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param($types, ...$params);
                $stmt->execute();
                $result = $stmt->get_result();
                
                $revenueByPaymentMethod = [];
                while ($row = $result->fetch_assoc()) {
                    $method = $row['payment_method'] ?: 'Unknown';
                    $revenueByPaymentMethod[$method] = (float)$row['total'];
                }
                $summaryData['revenueByPaymentMethod'] = $revenueByPaymentMethod;
                
                // Daily revenue
                $sql = "SELECT DATE(created_at) as date, SUM(total_amount) as total FROM bookings 
                        WHERE $whereClause 
                        GROUP BY DATE(created_at) ORDER BY DATE(created_at)";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param($types, ...$params);
                $stmt->execute();
                $result = $stmt->get_result();
                
                $dailyRevenue = [];
                while ($row = $result->fetch_assoc()) {
                    $dailyRevenue[] = [
                        'date' => $row['date'],
                        'total' => (float)$row['total']
                    ];
                }
                $summaryData['dailyRevenue'] = $dailyRevenue;
                
                // Add GST summary if requested
                if ($withGst) {
                    $sqlGST = "SELECT SUM(total_amount) as taxable_amount FROM bookings 
                            WHERE $whereClause AND (gst_enabled = 1 OR gst_enabled = '1')";
                    $stmt = $conn->prepare($sqlGST);
                    $stmt->bind_param($types, ...$params);
                    $stmt->execute();
                    $gstResult = $stmt->get_result()->fetch_assoc();
                    
                    $taxableAmount = (float)($gstResult['taxable_amount'] ?? 0);
                    $gstAmount = $taxableAmount * 0.05; // 5% GST
                    
                    $summaryData['gstSummary'] = [
                        'taxableAmount' => $taxableAmount,
                        'gstRate' => '5%',
                        'gstAmount' => $gstAmount,
                        'totalWithGst' => $taxableAmount + $gstAmount
                    ];
                }
                
                $reportData = $summaryData;
            }
            break;
            
        case 'gst':
            try {
                // Ensure gst_rate column exists (MySQL doesn't support ADD COLUMN IF NOT EXISTS)
                $checkCol = @$conn->query("SHOW COLUMNS FROM invoices LIKE 'gst_rate'");
                if (!$checkCol || $checkCol->num_rows === 0) {
                    @$conn->query("ALTER TABLE invoices ADD COLUMN gst_rate DECIMAL(5,2) DEFAULT NULL");
                }
                // INNER JOIN bookings - exclude orphaned invoices (booking deleted)
                // Customer = passenger who booked; Company = GST billing entity
                // Fallback gst_number from bookings when invoice has invalid/short value (GSTIN is 15 chars)
                $sql = "SELECT i.id, i.booking_id, i.invoice_number, i.company_name, i.company_address,
                        b.passenger_name,
                        i.base_amount, i.extra_charges, i.tax_amount as gst_amount, i.total_amount, i.invoice_date as created_at,
                        i.include_tax, i.gst_rate as stored_gst_rate,
                        CASE WHEN COALESCE(TRIM(i.gst_number),'') != '' AND LENGTH(TRIM(i.gst_number)) >= 10 
                             THEN TRIM(i.gst_number) ELSE COALESCE(NULLIF(TRIM(b.gst_number),''), TRIM(i.gst_number), 'N/A') END as gst_number
                        FROM invoices i
                        INNER JOIN bookings b ON i.booking_id = b.id
                        WHERE DATE(i.invoice_date) BETWEEN ? AND ? AND (i.gst_enabled = 1 OR i.is_igst = 1)";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("ss", $startDate, $endDate);
                $stmt->execute();
                $result = $stmt->get_result();
                $gstReportData = [];
                $totalTaxableValue = 0;
                $totalGstAmount = 0;
                $standardRates = [5, 12, 18];
                while ($row = $result->fetch_assoc()) {
                    $gstAmount = (float)$row['gst_amount'];
                    $totalAmount = (float)$row['total_amount'];
                    $baseAmount = (float)$row['base_amount'];
                    $extraCharges = (float)($row['extra_charges'] ?? 0);
                    $includeTax = isset($row['include_tax']) ? (int)$row['include_tax'] : 1;
                    $storedRate = isset($row['stored_gst_rate']) && $row['stored_gst_rate'] !== null ? (float)$row['stored_gst_rate'] : null;
                    // gst_rate stored as percentage (18) or decimal (0.18); normalize to 0-1
                    $gstRatePct = ($storedRate !== null && $storedRate > 0) ? ($storedRate > 1 ? $storedRate / 100 : $storedRate) : 0.18;
                    // Tax-inclusive: total includes GST, so taxable = total / (1 + rate)
                    // Tax-exclusive: total = taxable + gst, so taxable = base + extra_charges
                    if ($includeTax == 1) {
                        $taxableValue = $totalAmount > 0 ? round($totalAmount / (1 + $gstRatePct), 2) : 0;
                    } else {
                        $taxableValue = round($baseAmount + $extraCharges, 2);
                    }
                    if ($storedRate !== null && $storedRate > 0) {
                        $gstRateDisplay = round($storedRate) . '%';
                    } else {
                        $derived = $taxableValue > 0 ? ($gstAmount / $taxableValue) * 100 : 0;
                        $nearest = 18;
                        $minDist = 999;
                        foreach ($standardRates as $r) {
                            $d = abs($derived - $r);
                            if ($d < $minDist) { $minDist = $d; $nearest = $r; }
                        }
                        $gstRateDisplay = $nearest . '%';
                    }
                    $gstReportData[] = [
                        'id' => $row['id'],
                        'bookingId' => $row['booking_id'],
                        'invoiceNumber' => $row['invoice_number'],
                        'customerName' => $row['passenger_name'] ?? 'N/A',
                        'gstNumber' => $row['gst_number'] ?? 'N/A',
                        'companyName' => $row['company_name'] ?? 'N/A',
                        'taxableValue' => $taxableValue,
                        'gstRate' => $gstRateDisplay,
                        'gstAmount' => $gstAmount,
                        'totalAmount' => (float)$row['total_amount'],
                        'invoiceDate' => $row['created_at']
                    ];
                    $totalTaxableValue += $taxableValue;
                    $totalGstAmount += $gstAmount;
                }
                $reportData = [
                    'gstInvoices' => $gstReportData,
                    'summary' => [
                        'totalInvoices' => count($gstReportData),
                        'totalTaxableValue' => $totalTaxableValue,
                        'totalGstAmount' => $totalGstAmount,
                        'totalWithGst' => $totalTaxableValue + $totalGstAmount
                    ]
                ];
                sendResponse(['status' => 'success', 'data' => $reportData]);
            } catch (Exception $e) {
                debugLog("Error in GST report: " . $e->getMessage() . ' | Trace: ' . $e->getTraceAsString());
                sendResponse(['status' => 'error', 'data' => []]);
            }
            break;
            
        case 'drivers':
            // Get driver statistics
            try {
                // Check if drivers table exists
                $tableExists = false;
                try {
                    $tableCheck = $conn->query("SHOW TABLES LIKE 'drivers'");
                    $tableExists = ($tableCheck && $tableCheck->num_rows > 0);
                } catch (Exception $e) {
                    debugLog("Error checking table: " . $e->getMessage());
                }
                
                // Use real data if table exists
                if ($tableExists) {
                    // Get driver data from database
                    $sql = "SELECT id as driver_id, name as driver_name, 
                            (SELECT COUNT(*) FROM bookings b WHERE b.driver_id = d.id) as total_trips,
                            (SELECT SUM(total_amount) FROM bookings b WHERE b.driver_id = d.id) as total_earnings,
                            (SELECT COALESCE(AVG(rating), 0) FROM driver_ratings r WHERE r.driver_id = d.id) as rating,
                            COALESCE((SELECT SUM(total_amount) FROM bookings b WHERE b.driver_id = d.id) / 
                                    (SELECT COUNT(*) FROM bookings b WHERE b.driver_id = d.id AND b.total_amount > 0), 0) as average_trip_value
                            FROM drivers d
                            ORDER BY total_earnings DESC";
                            
                    $stmt = $conn->prepare($sql);
                    $stmt->execute();
                    $result = $stmt->get_result();
                    
                    $drivers = [];
                    while ($row = $result->fetch_assoc()) {
                        // Ensure numeric values
                        $row['total_trips'] = (int)($row['total_trips'] ?? 0);
                        $row['total_earnings'] = (float)($row['total_earnings'] ?? 0);
                        $row['average_trip_value'] = (float)($row['average_trip_value'] ?? 0);
                        $row['rating'] = (float)($row['rating'] ?? 0);
                        
                        $drivers[] = $row;
                    }
                    
                    $reportData = ['drivers' => $drivers];
                } else {
                    // Create sample data for development and testing
                    $reportData = [
                        'drivers' => [
                            [
                                'driver_id' => 1,
                                'driver_name' => 'Rajesh Kumar',
                                'total_trips' => 352,
                                'total_earnings' => 120000,
                                'rating' => 4.8,
                                'average_trip_value' => 341
                            ],
                            [
                                'driver_id' => 2,
                                'driver_name' => 'Pavan Reddy',
                                'total_trips' => 215,
                                'total_earnings' => 85500,
                                'rating' => 4.6,
                                'average_trip_value' => 398
                            ],
                            [
                                'driver_id' => 3,
                                'driver_name' => 'Suresh Verma',
                                'total_trips' => 180,
                                'total_earnings' => 72000,
                                'rating' => 4.5,
                                'average_trip_value' => 400
                            ]
                        ]
                    ];
                }
            } catch (Exception $e) {
                debugLog("Error in drivers report: " . $e->getMessage());
                // Create sample data as fallback
                $reportData = [
                    'drivers' => [
                        [
                            'driver_id' => 1,
                            'driver_name' => 'Rajesh Kumar',
                            'total_trips' => 352,
                            'total_earnings' => 120000,
                            'rating' => 4.8,
                            'average_trip_value' => 341
                        ]
                    ]
                ];
            }
            break;
            
        case 'vehicles':
            // Get vehicle utilization statistics (auto-sync with assigned fleet vehicles)
            debugLog("Vehicles report", ['vehicle_id' => $vehicleId, 'vehicle_id_trimmed' => trim($vehicleId)]);
            try {
                // 0. Fetch vehicle list for filter dropdown
                $vehicleList = [];
                $fvCheck = @$conn->query("SHOW TABLES LIKE 'fleet_vehicles'");
                if ($fvCheck && $fvCheck->num_rows > 0) {
                    $vq = @$conn->query("SELECT id, name, vehicle_number FROM fleet_vehicles ORDER BY name");
                    if ($vq) {
                        while ($v = $vq->fetch_assoc()) {
                            $vehicleList[] = ['id' => $v['id'], 'name' => $v['name'] ?? $v['vehicle_number'] ?? 'Vehicle ' . $v['id'], 'vehicle_number' => $v['vehicle_number'] ?? ''];
                        }
                    }
                }

                // 1. Main vehicle stats (optionally filter by vehicle_id)
                $sql = "SELECT 
                            v.id as vehicle_id,
                            v.name as vehicle_name,
                            v.vehicle_number,
                            v.vehicle_type,
                            v.emi,
                            COUNT(*) as total_trips,
                            SUM(b.total_amount) as total_revenue
                        FROM bookings b
                        JOIN fleet_vehicles v ON b.fleet_vehicle_id = v.id
                        WHERE b.fleet_vehicle_id IS NOT NULL
                          AND DATE(b.created_at) BETWEEN ? AND ?";
                if (!empty($vehicleId)) {
                    $sql .= " AND v.id = ?";
                }
                $sql .= " GROUP BY v.id ORDER BY total_trips DESC";
                $stmt = $conn->prepare($sql);
                if (!empty($vehicleId)) {
                    // Cast to int so v.id (INT) matches correctly
                    $vidInt = ctype_digit((string)$vehicleId) ? (int)$vehicleId : 0;
                    $stmt->bind_param("ssi", $startDate, $endDate, $vidInt);
                } else {
                    $stmt->bind_param("ss", $startDate, $endDate);
                }
                $stmt->execute();
                $result = $stmt->get_result();
                $vehicleStats = [];
                while ($row = $result->fetch_assoc()) {
                    $vehicleStats[$row['vehicle_id']] = [
                        'vehicle_id' => $row['vehicle_id'],
                        'vehicle_name' => $row['vehicle_name'],
                        'vehicle_number' => $row['vehicle_number'],
                        'vehicle_type' => $row['vehicle_type'],
                        'emi' => isset($row['emi']) ? (float)$row['emi'] : 0,
                        'total_trips' => (int)$row['total_trips'],
                        'total_revenue' => (float)$row['total_revenue'],
                        'fuel_cost' => 0,
                        'maintenance_cost' => 0,
                        'commission' => 0,
                        'avg_driver_salary' => 0,
                        'profit' => 0
                    ];
                }

                // 2. Fuel costs
                $fuelCosts = [];
                $sql = "SELECT vehicle_id, SUM(total_cost) AS fuel_cost FROM fuel_records WHERE vehicle_id IS NOT NULL AND DATE(fill_date) BETWEEN ? AND ? GROUP BY vehicle_id";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("ss", $startDate, $endDate);
                $stmt->execute();
                $result = $stmt->get_result();
                while ($row = $result->fetch_assoc()) {
                    $fuelCosts[$row['vehicle_id']] = (float)$row['fuel_cost'];
                }

                // 3. Maintenance costs
                $maintenanceCosts = [];
                $sql = "SELECT vehicle_id, SUM(cost) AS maintenance_cost FROM maintenance_records WHERE vehicle_id IS NOT NULL AND DATE(service_date) BETWEEN ? AND ? GROUP BY vehicle_id";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("ss", $startDate, $endDate);
                $stmt->execute();
                $result = $stmt->get_result();
                while ($row = $result->fetch_assoc()) {
                    $maintenanceCosts[$row['vehicle_id']] = (float)$row['maintenance_cost'];
                }

                // 4. Merge costs into vehicleStats
                foreach ($vehicleStats as $id => &$stat) {
                    $stat['fuel_cost'] = $fuelCosts[$id] ?? 0;
                    $stat['maintenance_cost'] = $maintenanceCosts[$id] ?? 0;
                }
                unset($stat);

                // 5. Commission per vehicle
                $commissions = [];
                $sql = "SELECT vehicle_id, SUM(commission_amount) AS total_commission FROM fleet_commission_payments WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY vehicle_id";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("ss", $startDate, $endDate);
                $stmt->execute();
                $result = $stmt->get_result();
                while ($row = $result->fetch_assoc()) {
                    $commissions[$row['vehicle_id']] = (float)$row['total_commission'];
                }

                // 6. Get average driver salary for all drivers in the period
                $avgDriverSalary = 0;
                $sql = "SELECT AVG(net_salary) AS avg_driver_salary FROM payroll_entries WHERE status = 'reconciled' AND DATE(date) BETWEEN ? AND ?";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("ss", $startDate, $endDate);
                $stmt->execute();
                $result = $stmt->get_result();
                if ($row = $result->fetch_assoc()) {
                    $avgDriverSalary = (float)$row['avg_driver_salary'];
                }

                // 6b. Get average and total expenses for all expenses in the period
                $avgExpense = 0;
                $totalExpense = 0;
                $sql = "SELECT AVG(amount) AS avg_expense, SUM(amount) AS total_expense FROM financial_ledger WHERE type = 'expense' AND date BETWEEN ? AND ? AND is_deleted = 0";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("ss", $startDate, $endDate);
                $stmt->execute();
                $result = $stmt->get_result();
                if ($row = $result->fetch_assoc()) {
                    $avgExpense = (float)$row['avg_expense'];
                    $totalExpense = (float)$row['total_expense'];
                }

                // 7. Merge commission, avg_driver_salary, and expenses into vehicleStats
                foreach ($vehicleStats as $id => &$stat) {
                    $stat['commission'] = $commissions[$id] ?? 0;
                    $stat['avg_driver_salary'] = $avgDriverSalary;
                    $stat['expenses'] = $avgExpense;
                    $stat['total_expenses'] = $totalExpense;
                    // Updated profit calculation
                    $stat['profit'] = $stat['total_revenue'] - $stat['fuel_cost'] - $stat['maintenance_cost'] - $stat['commission'] - $stat['emi'] - $stat['avg_driver_salary'] - $stat['expenses'];
                }
                unset($stat);

                // 8. Return with vehicle list for filter dropdown
                $reportData = [
                    'vehicles' => array_values($vehicleStats),
                    'filters' => ['vehicles' => $vehicleList]
                ];
            } catch (Exception $e) {
                debugLog("Error in vehicles report: " . $e->getMessage());
                // Provide sample data as fallback (match success structure for consistency)
                $reportData = [
                    'vehicles' => [
                        [
                            'vehicle_id' => 1,
                            'vehicle_name' => 'Toyota Etios',
                            'vehicle_number' => 'AP31AB1234',
                            'vehicle_type' => 'sedan',
                            'total_trips' => 45,
                            'total_revenue' => 175640,
                            'fuel_cost' => 10000,
                            'maintenance_cost' => 5000,
                            'profit' => 160640
                        ]
                    ],
                    'filters' => ['vehicles' => []]
                ];
            }
            break;
            
        case 'nongst':
            // Non-GST report: (1) non-GST rows in invoices, (2) bookings without invoices that are non-GST
            //     by guest/booking flags, (3) standalone non_gst_bills. Previously only (1)+(3) appeared,
            //     so most trips never showed until an invoice was generated.
            try {
                $nonGstBills = [];

                $normalizePaymentStatus = function ($psRaw) {
                    $ps = strtolower(trim($psRaw ?? ''));
                    if (in_array($ps, ['paid', 'payment_received', 'successful', 'paid_full'])) {
                        return 'paid';
                    }
                    if (in_array($ps, ['partial', 'partially_paid'])) {
                        return 'partial';
                    }
                    return 'pending';
                };

                // 1. Fetch non-GST generated invoices from invoices table (like GST report)
                $invTableCheck = @$conn->query("SHOW TABLES LIKE 'invoices'");
                if ($invTableCheck && $invTableCheck->num_rows > 0) {
                    $payAlias = 'rpt_pmts';
                    $usePayJoin = reportsPaymentsTableExists($conn);
                    $caseSql = $usePayJoin ? reportsComputedPaymentCaseSql($conn, 'b', $payAlias) : '';
                    $sql = "SELECT i.id, i.booking_id, i.invoice_number, i.total_amount, i.invoice_date,
                            b.passenger_name, b.booking_number, b.pickup_date, b.created_at AS booking_created_at,
                            b.payment_status, b.payment_method";
                    if ($usePayJoin) {
                        $sql .= ", ({$caseSql}) AS computed_payment_status";
                    }
                    $sql .= " FROM invoices i
                            INNER JOIN bookings b ON i.booking_id = b.id ";
                    if ($usePayJoin) {
                        $sql .= reportsPaymentJoinSql('b', $payAlias) . ' ';
                    }
                    $sql .= "WHERE DATE(i.invoice_date) BETWEEN ? AND ?
                            AND (i.gst_enabled = 0 OR i.gst_enabled IS NULL)
                            AND (i.is_igst = 0 OR i.is_igst IS NULL)
                            AND LOWER(COALESCE(b.status,'')) NOT IN ('cancelled')";
                    $sql .= buildTripStatusSqlClause($conn, $tripStatusFilter, 'b');
                    if ($usePayJoin) {
                        $sql .= buildComputedPaymentFilterWhere($conn, $paymentStatusFilter, 'b', $payAlias);
                    } else {
                        $sql .= buildLegacyPaymentStatusSqlClause($conn, $paymentStatusFilter, 'b');
                    }
                    if (!empty($paymentMethod)) {
                        $sql .= " AND b.payment_method = ?";
                    }
                    $sql .= " ORDER BY i.invoice_date DESC, i.id DESC";
                    $stmt = $conn->prepare($sql);
                    if (!empty($paymentMethod)) {
                        $stmt->bind_param("sss", $startDate, $endDate, $paymentMethod);
                    } else {
                        $stmt->bind_param("ss", $startDate, $endDate);
                    }
                    $stmt->execute();
                    $result = $stmt->get_result();
                    while ($row = $result->fetch_assoc()) {
                        $rawPs = $usePayJoin && isset($row['computed_payment_status'])
                            ? $row['computed_payment_status']
                            : ($row['payment_status'] ?? '');
                        $nonGstBills[] = [
                            'id' => 'inv-' . $row['id'],
                            'billNumber' => $row['invoice_number'],
                            // Booking Date = when the booking was created (not invoice or journey date)
                            'date' => $row['booking_created_at'] ?? $row['invoice_date'],
                            'journeyDate' => $row['pickup_date'] ?? null,
                            'customerName' => $row['passenger_name'] ?? 'N/A',
                            'amount' => (float)$row['total_amount'],
                            'paymentStatus' => $normalizePaymentStatus($rawPs),
                            'paymentMethod' => $row['payment_method'] ?? null,
                            'bookingId' => $row['booking_id'],
                            'source' => 'invoice'
                        ];
                    }
                }

                // 2. Bookings with no invoice row yet: non-GST trip (admin: gstEnabled = gst_enabled OR gst_number)
                $gstNumCol = @$conn->query("SHOW COLUMNS FROM bookings LIKE 'gst_number'");
                $bookingsHasGstNumber = ($gstNumCol && $gstNumCol->num_rows > 0);
                $gstEnabledCol = @$conn->query("SHOW COLUMNS FROM bookings LIKE 'gst_enabled'");
                $invTableOk = ($invTableCheck && $invTableCheck->num_rows > 0);
                if ($gstEnabledCol && $gstEnabledCol->num_rows > 0 && $invTableOk) {
                    $nonGstBookingWhere = "DATE(b.pickup_date) BETWEEN ? AND ?
                        AND LOWER(COALESCE(b.status,'')) NOT IN ('cancelled')
                        AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.booking_id = b.id)";
                    if ($bookingsHasGstNumber) {
                        $nonGstBookingWhere .= " AND NOT (
                            COALESCE(b.gst_enabled,0) = 1
                            OR (b.gst_number IS NOT NULL AND TRIM(b.gst_number) <> '')
                        )";
                    } else {
                        $nonGstBookingWhere .= " AND COALESCE(b.gst_enabled,0) = 0";
                    }
                    if (!empty($paymentMethod)) {
                        $nonGstBookingWhere .= " AND b.payment_method = ?";
                    }
                    $payAliasB = 'rpt_pmts_b';
                    $usePayJoinB = reportsPaymentsTableExists($conn);
                    $nonGstBookingWhere .= buildTripStatusSqlClause($conn, $tripStatusFilter, 'b');
                    if ($usePayJoinB) {
                        $nonGstBookingWhere .= buildComputedPaymentFilterWhere($conn, $paymentStatusFilter, 'b', $payAliasB);
                    } else {
                        $nonGstBookingWhere .= buildLegacyPaymentStatusSqlClause($conn, $paymentStatusFilter, 'b');
                    }
                    $caseSqlB = $usePayJoinB ? reportsComputedPaymentCaseSql($conn, 'b', $payAliasB) : '';
                    $sqlB = "SELECT b.id, b.booking_number, b.passenger_name, b.pickup_date, b.created_at AS booking_created_at,
                            b.total_amount, b.payment_status, b.payment_method";
                    if ($usePayJoinB) {
                        $sqlB .= ", ({$caseSqlB}) AS computed_payment_status";
                    }
                    $sqlB .= " FROM bookings b ";
                    if ($usePayJoinB) {
                        $sqlB .= reportsPaymentJoinSql('b', $payAliasB) . ' ';
                    }
                    $sqlB .= "WHERE " . $nonGstBookingWhere . "
                            ORDER BY b.pickup_date DESC, b.id DESC";
                    $stmtB = $conn->prepare($sqlB);
                    if (!$stmtB) {
                        debugLog('Non-GST bookings query prepare failed: ' . $conn->error);
                    } else {
                        if (!empty($paymentMethod)) {
                            $stmtB->bind_param("sss", $startDate, $endDate, $paymentMethod);
                        } else {
                            $stmtB->bind_param("ss", $startDate, $endDate);
                        }
                        $stmtB->execute();
                        $resB = $stmtB->get_result();
                        while ($row = $resB->fetch_assoc()) {
                            $rawPsB = $usePayJoinB && isset($row['computed_payment_status'])
                                ? $row['computed_payment_status']
                                : ($row['payment_status'] ?? '');
                            $nonGstBills[] = [
                                'id' => 'bkg-' . $row['id'],
                                'billNumber' => $row['booking_number'] ?? ('BK-' . $row['id']),
                                'date' => $row['booking_created_at'] ?? $row['pickup_date'],
                                'journeyDate' => $row['pickup_date'] ?? null,
                                'customerName' => $row['passenger_name'] ?? 'N/A',
                                'amount' => (float)($row['total_amount'] ?? 0),
                                'paymentStatus' => $normalizePaymentStatus($rawPsB),
                                'paymentMethod' => $row['payment_method'] ?? null,
                                'bookingId' => (int)$row['id'],
                                'source' => 'booking'
                            ];
                        }
                    }
                }

                // 3. Also fetch standalone non_gst_bills if table exists (no booking row — skip when filtering by trip status)
                $ngbTableCheck = @$conn->query("SHOW TABLES LIKE 'non_gst_bills'");
                $nongstTripStatusActive = in_array($tripStatusFilter, ['pending', 'confirmed', 'assigned', 'completed', 'cancelled'], true);
                if ($ngbTableCheck && $ngbTableCheck->num_rows > 0 && !$nongstTripStatusActive) {
                    $sql = "SELECT id, bill_number as billNumber, bill_date as date, customer_name as customerName,
                            amount, description, payment_status as paymentStatus, payment_method as paymentMethod
                            FROM non_gst_bills WHERE DATE(bill_date) BETWEEN ? AND ?";
                    $sql .= buildPaymentStatusOnlySqlClause($paymentStatusFilter);
                    if (!empty($paymentMethod)) {
                        $sql .= " AND payment_method = ?";
                    }
                    $sql .= " ORDER BY bill_date DESC";
                    $stmt = $conn->prepare($sql);
                    if (!empty($paymentMethod)) {
                        $stmt->bind_param("sss", $startDate, $endDate, $paymentMethod);
                    } else {
                        $stmt->bind_param("ss", $startDate, $endDate);
                    }
                    $stmt->execute();
                    $result = $stmt->get_result();
                    while ($row = $result->fetch_assoc()) {
                        $nonGstBills[] = [
                            'id' => 'bill-' . $row['id'],
                            'billNumber' => $row['billNumber'],
                            'date' => $row['date'],
                            'journeyDate' => null,
                            'customerName' => $row['customerName'],
                            'amount' => (float)$row['amount'],
                            'paymentStatus' => in_array($row['paymentStatus'], ['paid', 'pending', 'partial']) ? $row['paymentStatus'] : 'pending',
                            'paymentMethod' => $row['paymentMethod'] ?? null
                        ];
                    }
                }

                // Sort combined list by date desc
                usort($nonGstBills, function ($a, $b) {
                    return strcmp($b['date'] ?? '', $a['date'] ?? '');
                });

                $reportData = ['bills' => $nonGstBills];
            } catch (Exception $e) {
                debugLog("Error in non-GST report: " . $e->getMessage());
                $reportData = ['bills' => []];
            }
            break;
            
        case 'maintenance':
            // Get vehicle maintenance records
            try {
                // Check if maintenance table exists
                $tableExists = false;
                try {
                    $tableCheck = $conn->query("SHOW TABLES LIKE 'vehicle_maintenance'");
                    $tableExists = ($tableCheck && $tableCheck->num_rows > 0);
                } catch (Exception $e) {
                    debugLog("Error checking maintenance table: " . $e->getMessage());
                }
                
                if ($tableExists) {
                    // Use actual maintenance data
                    $sql = "SELECT id, vehicle_id as vehicleId, maintenance_date as date, 
                            service_type as serviceType, description, cost, vendor, 
                            next_service_date as nextServiceDate
                            FROM vehicle_maintenance 
                            WHERE DATE(maintenance_date) BETWEEN ? AND ? 
                            ORDER BY maintenance_date DESC";
                    
                    $stmt = $conn->prepare($sql);
                    $stmt->bind_param("ss", $startDate, $endDate);
                    $stmt->execute();
                    $result = $stmt->get_result();
                    
                    $maintenanceRecords = [];
                    $totalCost = 0;
                    $costByVehicle = [];
                    $costByType = [];
                    
                    while ($row = $result->fetch_assoc()) {
                        // Ensure numeric values
                        $row['cost'] = (float)$row['cost'];
                        
                        $maintenanceRecords[] = $row;
                        
                        // Calculate totals
                        $totalCost += $row['cost'];
                        
                        // By vehicle
                        if (!isset($costByVehicle[$row['vehicleId']])) {
                            $costByVehicle[$row['vehicleId']] = 0;
                        }
                        $costByVehicle[$row['vehicleId']] += $row['cost'];
                        
                        // By service type
                        if (!isset($costByType[$row['serviceType']])) {
                            $costByType[$row['serviceType']] = 0;
                        }
                        $costByType[$row['serviceType']] += $row['cost'];
                    }
                    
                    $reportData = [
                        'maintenance' => $maintenanceRecords,
                        'totalCost' => $totalCost,
                        'costByVehicle' => $costByVehicle,
                        'costByType' => $costByType
                    ];
                } else {
                    // Create sample data for development and testing
                    $reportData = [
                        'maintenance' => [
                            [
                                'id' => 1,
                                'vehicleId' => 'TN01AB1234',
                                'date' => date('Y-m-d', strtotime('-15 days')),
                                'serviceType' => 'Oil Change',
                                'description' => 'Regular service',
                                'cost' => 2500,
                                'vendor' => 'Service Center',
                                'nextServiceDate' => date('Y-m-d', strtotime('+75 days'))
                            ],
                            [
                                'id' => 2,
                                'vehicleId' => 'TN01CD5678',
                                'date' => date('Y-m-d', strtotime('-10 days')),
                                'serviceType' => 'Tire Replacement',
                                'description' => 'All 4 tires replaced',
                                'cost' => 16000,
                                'vendor' => 'Tire Shop',
                                'nextServiceDate' => date('Y-m-d', strtotime('+180 days'))
                            ]
                        ],
                        'totalCost' => 18500,
                        'costByVehicle' => [
                            'TN01AB1234' => 2500,
                            'TN01CD5678' => 16000
                        ],
                        'costByType' => [
                            'Oil Change' => 2500,
                            'Tire Replacement' => 16000
                        ]
                    ];
                }
            } catch (Exception $e) {
                debugLog("Error in maintenance report: " . $e->getMessage());
                $reportData = ['maintenance' => [], 'totalCost' => 0, 'costByVehicle' => [], 'costByType' => []];
            }
            break;
            
        case 'ledger':
            // Get financial ledger data
            try {
                // Check if ledger table exists
                $tableExists = false;
                try {
                    $tableCheck = $conn->query("SHOW TABLES LIKE 'financial_ledger'");
                    $tableExists = ($tableCheck && $tableCheck->num_rows > 0);
                } catch (Exception $e) {
                    debugLog("Error checking ledger table: " . $e->getMessage());
                }
                
                if ($tableExists) {
                    // Use actual ledger data
                    $sql = "SELECT id, transaction_date as date, description, type, 
                            amount, category, payment_method as paymentMethod, reference, balance
                            FROM financial_ledger 
                            WHERE DATE(transaction_date) BETWEEN ? AND ?";
                            
                    // Add payment method filter if specified
                    if (!empty($paymentMethod)) {
                        $sql .= " AND payment_method = ?";
                    }
                    
                    $sql .= " ORDER BY transaction_date DESC, id DESC";
                    
                    $stmt = $conn->prepare($sql);
                    
                    if (!empty($paymentMethod)) {
                        $stmt->bind_param("sss", $startDate, $endDate, $paymentMethod);
                    } else {
                        $stmt->bind_param("ss", $startDate, $endDate);
                    }
                    
                    $stmt->execute();
                    $result = $stmt->get_result();
                    
                    $ledgerEntries = [];
                    $totalIncome = 0;
                    $totalExpense = 0;
                    $latestBalance = 0;
                    $byCategory = [];
                    
                    while ($row = $result->fetch_assoc()) {
                        // Ensure numeric values
                        $row['amount'] = (float)$row['amount'];
                        $row['balance'] = (float)$row['balance'];
                        
                        $ledgerEntries[] = $row;
                        
                        // Calculate totals
                        if ($row['type'] === 'income') {
                            $totalIncome += $row['amount'];
                        } else {
                            $totalExpense += $row['amount'];
                        }
                        
                        // Track latest balance
                        if (count($ledgerEntries) === 1) {
                            $latestBalance = $row['balance'];
                        }
                        
                        // By category
                        if (!isset($byCategory[$row['category']])) {
                            $byCategory[$row['category']] = [
                                'income' => 0,
                                'expense' => 0
                            ];
                        }
                        
                        if ($row['type'] === 'income') {
                            $byCategory[$row['category']]['income'] += $row['amount'];
                        } else {
                            $byCategory[$row['category']]['expense'] += $row['amount'];
                        }
                    }
                    
                    $reportData = [
                        'entries' => $ledgerEntries,
                        'totalIncome' => $totalIncome,
                        'totalExpense' => $totalExpense,
                        'netChange' => $totalIncome - $totalExpense,
                        'latestBalance' => $latestBalance,
                        'byCategory' => $byCategory
                    ];
                } else {
                    // Create sample data for development and testing
                    $reportData = [
                        'entries' => [
                            [
                                'id' => 1,
                                'date' => date('Y-m-d', strtotime('-20 days')),
                                'description' => 'Initial Balance',
                                'type' => 'income',
                                'amount' => 50000,
                                'category' => 'Initial',
                                'paymentMethod' => 'bank_transfer',
                                'reference' => 'Opening Balance',
                                'balance' => 50000
                            ],
                            [
                                'id' => 2,
                                'date' => date('Y-m-d', strtotime('-15 days')),
                                'description' => 'Fuel Purchase',
                                'type' => 'expense',
                                'amount' => 5000,
                                'category' => 'Fuel',
                                'paymentMethod' => 'cash',
                                'reference' => 'Invoice #FUEL-001',
                                'balance' => 45000
                            ],
                            [
                                'id' => 3,
                                'date' => date('Y-m-d', strtotime('-10 days')),
                                'description' => 'Booking Revenue',
                                'type' => 'income',
                                'amount' => 12500,
                                'category' => 'Bookings',
                                'paymentMethod' => 'card',
                                'reference' => 'BOOK-123',
                                'balance' => 57500
                            ]
                        ],
                        'totalIncome' => 62500,
                        'totalExpense' => 5000,
                        'netChange' => 57500,
                        'latestBalance' => 57500,
                        'byCategory' => [
                            'Initial' => ['income' => 50000, 'expense' => 0],
                            'Fuel' => ['income' => 0, 'expense' => 5000],
                            'Bookings' => ['income' => 12500, 'expense' => 0]
                        ]
                    ];
                }
            } catch (Exception $e) {
                debugLog("Error in ledger report: " . $e->getMessage());
                $reportData = [
                    'entries' => [], 
                    'totalIncome' => 0, 
                    'totalExpense' => 0, 
                    'netChange' => 0, 
                    'latestBalance' => 0, 
                    'byCategory' => []
                ];
            }
            break;
            
        case 'fuels':
            // Get fuel records
            try {
                // Check if the fuel_records table exists
                $tableExists = false;
                try {
                    $tableCheck = $conn->query("SHOW TABLES LIKE 'fuel_records'");
                    $tableExists = ($tableCheck && $tableCheck->num_rows > 0);
                } catch (Exception $e) {
                    debugLog("Error checking fuel table: " . $e->getMessage());
                }
                
                if ($tableExists) {
                    // Use actual fuel data
                    $sql = "SELECT id, vehicle_id as vehicleId, fill_date as date, 
                            quantity_liters as liters, price_per_liter as pricePerLiter, 
                            total_cost as cost, odometer_reading as odometer, 
                            station as fuelStation, payment_method as paymentMethod
                            FROM fuel_records 
                            WHERE DATE(fill_date) BETWEEN ? AND ?";
                            
                    // Add payment method filter if specified
                    if (!empty($paymentMethod)) {
                        $sql .= " AND payment_method = ?";
                    }
                    
                    $sql .= " ORDER BY fill_date DESC";
                    
                    $stmt = $conn->prepare($sql);
                    
                    if (!empty($paymentMethod)) {
                        $stmt->bind_param("sss", $startDate, $endDate, $paymentMethod);
                    } else {
                        $stmt->bind_param("ss", $startDate, $endDate);
                    }
                    
                    $stmt->execute();
                    $result = $stmt->get_result();
                    
                    $fuelRecords = [];
                    $totalLiters = 0;
                    $totalCost = 0;
                    $byVehicle = [];
                    $byStation = [];
                    $byPaymentMethod = [];
                    
                    while ($row = $result->fetch_assoc()) {
                        // Ensure numeric values
                        $row['liters'] = (float)$row['liters'];
                        $row['pricePerLiter'] = (float)$row['pricePerLiter'];
                        $row['cost'] = (float)$row['cost'];
                        if ($row['odometer']) {
                            $row['odometer'] = (int)$row['odometer'];
                        }
                        
                        // Add vehicle name for display (would come from a vehicles table in real implementation)
                        $row['vehicleName'] = 'Vehicle ' . $row['vehicleId'];
                        $row['vehicleNumber'] = $row['vehicleId']; // Duplicate as vehicleNumber for UI compatibility
                        
                        $fuelRecords[] = $row;
                        
                        // Calculate totals
                        $totalLiters += $row['liters'];
                        $totalCost += $row['cost'];
                        
                        // By vehicle
                        if (!isset($byVehicle[$row['vehicleId']])) {
                            $byVehicle[$row['vehicleId']] = [
                                'liters' => 0,
                                'cost' => 0,
                                'fillCount' => 0
                            ];
                        }
                        $byVehicle[$row['vehicleId']]['liters'] += $row['liters'];
                        $byVehicle[$row['vehicleId']]['cost'] += $row['cost'];
                        $byVehicle[$row['vehicleId']]['fillCount']++;
                        
                        // By station
                        if ($row['fuelStation']) {
                            if (!isset($byStation[$row['fuelStation']])) {
                                $byStation[$row['fuelStation']] = [
                                    'liters' => 0,
                                    'cost' => 0,
                                    'fillCount' => 0
                                ];
                            }
                            $byStation[$row['fuelStation']]['liters'] += $row['liters'];
                            $byStation[$row['fuelStation']]['cost'] += $row['cost'];
                            $byStation[$row['fuelStation']]['fillCount']++;
                        }
                        
                        // By payment method
                        if ($row['paymentMethod']) {
                            if (!isset($byPaymentMethod[$row['paymentMethod']])) {
                                $byPaymentMethod[$row['paymentMethod']] = 0;
                            }
                            $byPaymentMethod[$row['paymentMethod']] += $row['cost'];
                        }
                    }
                    
                    $reportData = [
                        'fuels' => $fuelRecords,
                        'totalLiters' => $totalLiters,
                        'totalCost' => $totalCost,
                        'avgPricePerLiter' => $totalLiters > 0 ? $totalCost / $totalLiters : 0,
                        'byVehicle' => $byVehicle,
                        'byStation' => $byStation,
                        'byPaymentMethod' => $byPaymentMethod
                    ];
                } else {
                    // Create sample data for development and testing
                    $reportData = [
                        'fuels' => [
                            [
                                'id' => 1,
                                'vehicleId' => 'TN01AB1234',
                                'vehicleName' => 'Sedan',
                                'vehicleNumber' => 'TN01AB1234',
                                'date' => date('Y-m-d', strtotime('-15 days')),
                                'liters' => 40.5,
                                'pricePerLiter' => 102.5,
                                'cost' => 4151.25,
                                'odometer' => 25680,
                                'fuelStation' => 'IOCL',
                                'paymentMethod' => 'cash'
                            ],
                            [
                                'id' => 2,
                                'vehicleId' => 'TN01CD5678',
                                'vehicleName' => 'Ertiga',
                                'vehicleNumber' => 'TN01CD5678',
                                'date' => date('Y-m-d', strtotime('-10 days')),
                                'liters' => 35.2,
                                'pricePerLiter' => 102.8,
                                'cost' => 3618.56,
                                'odometer' => 42350,
                                'fuelStation' => 'BPCL',
                                'paymentMethod' => 'card'
                            ]
                        ],
                        'totalLiters' => 75.7,
                        'totalCost' => 7769.81,
                        'avgPricePerLiter' => 102.64,
                        'byVehicle' => [
                            'TN01AB1234' => ['liters' => 40.5, 'cost' => 4151.25, 'fillCount' => 1],
                            'TN01CD5678' => ['liters' => 35.2, 'cost' => 3618.56, 'fillCount' => 1]
                        ],
                        'byStation' => [
                            'IOCL' => ['liters' => 40.5, 'cost' => 4151.25, 'fillCount' => 1],
                            'BPCL' => ['liters' => 35.2, 'cost' => 3618.56, 'fillCount' => 1]
                        ],
                        'byPaymentMethod' => [
                            'cash' => 4151.25,
                            'card' => 3618.56
                        ]
                    ];
                }
            } catch (Exception $e) {
                debugLog("Error in fuel report: " . $e->getMessage());
                $reportData = [
                    'fuels' => [], 
                    'totalLiters' => 0, 
                    'totalCost' => 0, 
                    'avgPricePerLiter' => 0, 
                    'byVehicle' => [], 
                    'byStation' => [],
                    'byPaymentMethod' => []
                ];
            }
            break;
            
        case 'profit':
            try {
                $todayStr = date('Y-m-d');
                $bookingsWhere = "DATE(b.created_at) BETWEEN ? AND ? AND LOWER(COALESCE(b.status,'')) IN ('confirmed', 'completed')";
                $params = [$startDate, $endDate];
                $types = "ss";
                if (!empty($vehicleId)) {
                    $bookingsWhere .= " AND b.fleet_vehicle_id = ?";
                    $params[] = $vehicleId;
                    $types .= "i";
                }
                if (!empty($driverId)) {
                    $bookingsWhere .= " AND b.driver_id = ?";
                    $params[] = $driverId;
                    $types .= "i";
                }
                if (!empty($serviceType)) {
                    $bookingsWhere .= " AND (b.trip_type = ? OR b.cab_type LIKE ?)";
                    $params[] = $serviceType;
                    $params[] = '%' . $serviceType . '%';
                    $types .= "ss";
                }

                $totalRevenue = 0;
                $totalTrips = 0;
                $revenueByService = ['Local' => 0, 'Outstation' => 0, 'Airport' => 0, 'Packages' => 0];
                $dailyData = [];
                $vehicleStats = [];
                $driverStats = [];
                $areaStats = [];
                $todayRevenue = 0;
                $todayExpense = 0;

                $fleetTable = @$conn->query("SHOW TABLES LIKE 'fleet_vehicles'");
                $driversTable = @$conn->query("SHOW TABLES LIKE 'drivers'");

                $sql = "SELECT b.id, b.fleet_vehicle_id, b.driver_id, b.total_amount, b.trip_type, b.cab_type, b.pickup_location, DATE(b.created_at) as dt
                        FROM bookings b WHERE $bookingsWhere";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param($types, ...$params);
                $stmt->execute();
                $result = $stmt->get_result();
                while ($row = $result->fetch_assoc()) {
                    $amt = (float)$row['total_amount'];
                    $totalRevenue += $amt;
                    $totalTrips++;
                    $vid = $row['fleet_vehicle_id'];
                    $did = $row['driver_id'];
                    $dt = $row['dt'];
                    $tt = strtolower($row['trip_type'] ?? '');
                    $ct = strtolower($row['cab_type'] ?? '');
                    if (strpos($tt, 'airport') !== false) $revenueByService['Airport'] += $amt;
                    elseif (strpos($tt, 'outstation') !== false) $revenueByService['Outstation'] += $amt;
                    elseif (strpos($ct, 'package') !== false || strpos($tt, 'local') !== false && preg_match('/package|4hr|8hr|10hr/i', $ct . $tt)) $revenueByService['Packages'] += $amt;
                    else $revenueByService['Local'] += $amt;
                    if (!isset($dailyData[$dt])) $dailyData[$dt] = ['revenue' => 0, 'expense' => 0, 'profit' => 0];
                    $dailyData[$dt]['revenue'] += $amt;
                    if ($vid) {
                        if (!isset($vehicleStats[$vid])) $vehicleStats[$vid] = ['revenue' => 0, 'expense' => 0];
                        $vehicleStats[$vid]['revenue'] += $amt;
                    }
                    if ($did) {
                        if (!isset($driverStats[$did])) $driverStats[$did] = ['trips' => 0, 'revenue' => 0, 'expense' => 0];
                        $driverStats[$did]['trips']++;
                        $driverStats[$did]['revenue'] += $amt;
                    }
                    $loc = trim($row['pickup_location'] ?? '');
                    if ($loc) {
                        $area = preg_match('/^([^,]+)/', $loc, $m) ? trim($m[1]) : substr($loc, 0, 30);
                        if (!isset($areaStats[$area])) $areaStats[$area] = ['trips' => 0, 'revenue' => 0];
                        $areaStats[$area]['trips']++;
                        $areaStats[$area]['revenue'] += $amt;
                    }
                    if ($dt === $todayStr) $todayRevenue += $amt;
                }

                $fuelTotal = 0;
                $fuelByVehicle = [];
                $fc = @$conn->query("SHOW TABLES LIKE 'fuel_records'");
                if ($fc && $fc->num_rows > 0) {
                    $fCol = @$conn->query("SHOW COLUMNS FROM fuel_records LIKE 'fill_date'");
                    $dateCol = ($fCol && $fCol->num_rows) ? 'fill_date' : 'fill_date';
                    $costCol = @$conn->query("SHOW COLUMNS FROM fuel_records LIKE 'total_cost'");
                    $costColName = ($costCol && $costCol->num_rows) ? 'total_cost' : 'total_cost';
                    $fWhere = "DATE($dateCol) BETWEEN ? AND ?";
                    if (!empty($vehicleId)) {
                        $fWhere .= " AND vehicle_id = ?";
                        $fStmt = $conn->prepare("SELECT vehicle_id, SUM($costColName) as c FROM fuel_records WHERE $fWhere GROUP BY vehicle_id");
                        $fStmt->bind_param($types, ...$params);
                    } else {
                        $fStmt = $conn->prepare("SELECT vehicle_id, SUM($costColName) as c FROM fuel_records WHERE $fWhere GROUP BY vehicle_id");
                        $fStmt->bind_param("ss", $startDate, $endDate);
                    }
                    $fStmt->execute();
                    $fr = $fStmt->get_result();
                    while ($f = $fr->fetch_assoc()) {
                        $c = (float)$f['c'];
                        $fuelTotal += $c;
                        $fuelByVehicle[$f['vehicle_id']] = $c;
                        if (!empty($vehicleId) && isset($vehicleStats[$f['vehicle_id']])) $vehicleStats[$f['vehicle_id']]['expense'] += $c;
                        elseif (empty($vehicleId) && isset($vehicleStats[$f['vehicle_id']])) $vehicleStats[$f['vehicle_id']]['expense'] += $c;
                    }
                    foreach ($fuelByVehicle as $vId => $c) {
                        if (isset($vehicleStats[$vId])) $vehicleStats[$vId]['expense'] += $c;
                    }
                }

                $maintTotal = 0;
                $mc = @$conn->query("SHOW TABLES LIKE 'maintenance_records'");
                if ($mc && $mc->num_rows > 0) {
                    $mStmt = $conn->prepare("SELECT vehicle_id, SUM(cost) as c FROM maintenance_records WHERE vehicle_id IS NOT NULL AND DATE(service_date) BETWEEN ? AND ? GROUP BY vehicle_id");
                    $mStmt->bind_param("ss", $startDate, $endDate);
                    $mStmt->execute();
                    $mr = $mStmt->get_result();
                    while ($m = $mr->fetch_assoc()) {
                        $c = (float)$m['c'];
                        $maintTotal += $c;
                        if (isset($vehicleStats[$m['vehicle_id']])) $vehicleStats[$m['vehicle_id']]['expense'] += $c;
                    }
                }

                $ledgerDateCol = 'date';
                $flTable = @$conn->query("SHOW TABLES LIKE 'financial_ledger'");
                if ($flTable && $flTable->num_rows > 0) {
                $lc = @$conn->query("SHOW COLUMNS FROM financial_ledger LIKE 'transaction_date'");
                if ($lc && $lc->num_rows > 0) $ledgerDateCol = 'transaction_date';
                $ledgerWhere = "type IN ('expense','emi') AND $ledgerDateCol BETWEEN ? AND ?";
                $ledgerParams = [$startDate, $endDate];
                if (@$conn->query("SHOW COLUMNS FROM financial_ledger LIKE 'is_deleted'")) $ledgerWhere .= " AND (is_deleted = 0 OR is_deleted IS NULL)";
                $lStmt = $conn->prepare("SELECT category, amount, $ledgerDateCol as dt FROM financial_ledger WHERE $ledgerWhere");
                $lStmt->bind_param("ss", $startDate, $endDate);
                $lStmt->execute();
                $lr = $lStmt->get_result();
                $expenseByCategory = ['Fuel' => 0, 'Driver Payments' => 0, 'Maintenance' => 0, 'Toll' => 0, 'Other' => 0];
                while ($l = $lr->fetch_assoc()) {
                    $c = (float)$l['amount'];
                    $cat = strtolower(trim($l['category'] ?? ''));
                    if (strpos($cat, 'fuel') !== false) $expenseByCategory['Fuel'] += $c;
                    elseif (preg_match('/driver|salary|payment/i', $cat)) $expenseByCategory['Driver Payments'] += $c;
                    elseif (strpos($cat, 'maint') !== false || strpos($cat, 'repair') !== false) $expenseByCategory['Maintenance'] += $c;
                    elseif (strpos($cat, 'toll') !== false) $expenseByCategory['Toll'] += $c;
                    else $expenseByCategory['Other'] += $c;
                    $dt = $l['dt'];
                    if (isset($dailyData[$dt])) $dailyData[$dt]['expense'] += $c;
                    elseif (!isset($dailyData[$dt])) $dailyData[$dt] = ['revenue' => 0, 'expense' => $c, 'profit' => 0];
                    else $dailyData[$dt]['expense'] += $c;
                    if ($dt === $todayStr) $todayExpense += $c;
                }
                }
                $expenseByCategory = $expenseByCategory ?? ['Fuel' => 0, 'Driver Payments' => 0, 'Maintenance' => 0, 'Toll' => 0, 'Other' => 0];
                $expenseByCategory['Fuel'] += $fuelTotal;
                $expenseByCategory['Maintenance'] += $maintTotal;

                $commTotal = 0;
                $cc = @$conn->query("SHOW TABLES LIKE 'fleet_commission_payments'");
                if ($cc && $cc->num_rows > 0) {
                    $cStmt = $conn->prepare("SELECT vehicle_id, driver_id, SUM(commission_amount) as c FROM fleet_commission_payments WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY vehicle_id, driver_id");
                    $cStmt->bind_param("ss", $startDate, $endDate);
                    $cStmt->execute();
                    $cr = $cStmt->get_result();
                    while ($c = $cr->fetch_assoc()) {
                        $commTotal += (float)$c['c'];
                        $expenseByCategory['Driver Payments'] += (float)$c['c'];
                        if (isset($vehicleStats[$c['vehicle_id']])) $vehicleStats[$c['vehicle_id']]['expense'] += (float)$c['c'];
                        if (isset($driverStats[$c['driver_id']])) $driverStats[$c['driver_id']]['expense'] += (float)$c['c'];
                    }
                }

                $totalExpense = $fuelTotal + $maintTotal + array_sum($expenseByCategory) - $fuelTotal - $maintTotal + $fuelTotal + $maintTotal;
                $totalExpense = $fuelTotal + $maintTotal + $expenseByCategory['Driver Payments'] + $expenseByCategory['Toll'] + $expenseByCategory['Other'];
                $netProfit = $totalRevenue - $totalExpense;
                $profitMargin = $totalRevenue > 0 ? round(($netProfit / $totalRevenue) * 100, 2) : 0;
                $avgRevenuePerTrip = $totalTrips > 0 ? round($totalRevenue / $totalTrips, 2) : 0;

                foreach ($dailyData as $d => &$v) {
                    $v['profit'] = $v['revenue'] - $v['expense'];
                }
                unset($v);
                ksort($dailyData);

                $vehicleList = [];
                if ($fleetTable && $fleetTable->num_rows > 0) {
                    $vq = $conn->query("SELECT id, name, vehicle_number FROM fleet_vehicles ORDER BY name");
                    while ($v = $vq->fetch_assoc()) {
                        $vehicleList[] = ['id' => $v['id'], 'name' => $v['name'] ?? $v['vehicle_number'], 'vehicle_number' => $v['vehicle_number'] ?? ''];
                    }
                }
                $driverList = [];
                if ($driversTable && $driversTable->num_rows > 0) {
                    $dq = $conn->query("SELECT id, name FROM drivers ORDER BY name");
                    while ($d = $dq->fetch_assoc()) {
                        $driverList[] = ['id' => $d['id'], 'name' => $d['name'] ?? 'Driver #' . $d['id']];
                    }
                }

                $vehicleTable = [];
                foreach ($vehicleStats as $vId => $v) {
                    $vName = 'Vehicle #' . $vId;
                    foreach ($vehicleList as $vl) {
                        if ((string)$vl['id'] === (string)$vId) {
                            $vName = $vl['name'] . ' (' . ($vl['vehicle_number'] ?? '') . ')';
                            break;
                        }
                    }
                    $vehicleTable[] = [
                        'vehicle' => $vName,
                        'vehicleId' => $vId,
                        'revenue' => $v['revenue'],
                        'expense' => $v['expense'],
                        'profit' => $v['revenue'] - $v['expense']
                    ];
                }
                usort($vehicleTable, function ($a, $b) { return $b['profit'] <=> $a['profit']; });

                $driverTable = [];
                foreach ($driverStats as $dId => $d) {
                    $dName = 'Driver #' . $dId;
                    foreach ($driverList as $dl) {
                        if ((string)$dl['id'] === (string)$dId) {
                            $dName = $dl['name'];
                            break;
                        }
                    }
                    $driverTable[] = [
                        'driver' => $dName,
                        'driverId' => $dId,
                        'trips' => $d['trips'],
                        'revenue' => $d['revenue'],
                        'expense' => $d['expense'],
                        'profit' => $d['revenue'] - $d['expense']
                    ];
                }
                usort($driverTable, function ($a, $b) { return $b['profit'] <=> $a['profit']; });

                $areaTable = [];
                foreach ($areaStats as $area => $a) {
                    $areaTable[] = ['area' => $area, 'trips' => $a['trips'], 'revenue' => $a['revenue']];
                }
                usort($areaTable, function ($a, $b) { return $b['revenue'] <=> $a['revenue']; });

                $reportData = [
                    'kpis' => [
                        'totalRevenue' => $totalRevenue,
                        'totalExpenses' => $totalExpense,
                        'netProfit' => $netProfit,
                        'profitMargin' => $profitMargin,
                        'totalTrips' => $totalTrips,
                        'avgRevenuePerTrip' => $avgRevenuePerTrip
                    ],
                    'dailyChart' => array_values(array_map(function ($d, $v) { return ['date' => $d, 'revenue' => $v['revenue'], 'expense' => $v['expense'], 'profit' => $v['profit']]; }, array_keys($dailyData), $dailyData)),
                    'revenueBreakdown' => $revenueByService,
                    'expenseBreakdown' => $expenseByCategory,
                    'vehicleProfit' => $vehicleTable,
                    'driverProfit' => $driverTable,
                    'areaReport' => $areaTable,
                    'todaySnapshot' => [
                        'revenue' => $todayRevenue,
                        'expense' => $todayExpense,
                        'profit' => $todayRevenue - $todayExpense
                    ],
                    'filters' => [
                        'vehicles' => $vehicleList,
                        'drivers' => $driverList,
                        'serviceTypes' => ['local', 'outstation', 'airport', 'outstation-one-way', 'outstation-round-trip']
                    ]
                ];
            } catch (Exception $e) {
                debugLog("Error in profit report: " . $e->getMessage());
                $reportData = [
                    'kpis' => ['totalRevenue' => 0, 'totalExpenses' => 0, 'netProfit' => 0, 'profitMargin' => 0, 'totalTrips' => 0, 'avgRevenuePerTrip' => 0],
                    'dailyChart' => [],
                    'revenueBreakdown' => ['Local' => 0, 'Outstation' => 0, 'Airport' => 0, 'Packages' => 0],
                    'expenseBreakdown' => ['Fuel' => 0, 'Driver Payments' => 0, 'Maintenance' => 0, 'Toll' => 0, 'Other' => 0],
                    'vehicleProfit' => [],
                    'driverProfit' => [],
                    'areaReport' => [],
                    'todaySnapshot' => ['revenue' => 0, 'expense' => 0, 'profit' => 0],
                    'filters' => ['vehicles' => [], 'drivers' => [], 'serviceTypes' => []]
                ];
            }
            break;
    }
    
    // Send the response
    sendResponse([
        'status' => 'success', 
        'reportType' => $reportType, 
        'period' => $period,
        'startDate' => $startDate,
        'endDate' => $endDate,
        'data' => $reportData
    ]);
    
} catch (Exception $e) {
    debugLog("Error in reports API: " . $e->getMessage());
    sendResponse([
        'status' => 'error',
        'message' => $e->getMessage()
    ], 500);
}
