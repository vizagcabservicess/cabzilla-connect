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
$format = isset($_GET['format']) ? $_GET['format'] : 'json';
$detailed = isset($_GET['detailed']) ? filter_var($_GET['detailed'], FILTER_VALIDATE_BOOLEAN) : false;
$period = isset($_GET['period']) ? $_GET['period'] : 'custom'; // 'daily', 'weekly', 'monthly', 'yearly'
$withGst = isset($_GET['gst']) ? filter_var($_GET['gst'], FILTER_VALIDATE_BOOLEAN) : false;
$paymentMethod = isset($_GET['payment_method']) ? $_GET['payment_method'] : '';
$onlyGstEnabled = isset($_GET['only_gst_enabled']) ? filter_var($_GET['only_gst_enabled'], FILTER_VALIDATE_BOOLEAN) : false;

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
    "only_gst_enabled" => $onlyGstEnabled
]);

try {
    $reportData = [];
    
    switch ($reportType) {
        case 'bookings':
            // Get booking statistics
            if ($detailed) {
                $sql = "SELECT * FROM bookings WHERE DATE(created_at) BETWEEN ? AND ? ORDER BY created_at DESC";
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
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("ss", $startDate, $endDate);
                $stmt->execute();
                $result = $stmt->get_result()->fetch_assoc();
                $summaryData['totalBookings'] = (int)$result['total'];
                
                // Bookings by status
                $sql = "SELECT status, COUNT(*) as count FROM bookings WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY status";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("ss", $startDate, $endDate);
                $stmt->execute();
                $result = $stmt->get_result();
                
                $bookingsByStatus = [];
                while ($row = $result->fetch_assoc()) {
                    $bookingsByStatus[$row['status']] = (int)$row['count'];
                }
                $summaryData['bookingsByStatus'] = $bookingsByStatus;
                
                // Daily booking counts
                $sql = "SELECT DATE(created_at) as date, COUNT(*) as count FROM bookings 
                        WHERE DATE(created_at) BETWEEN ? AND ? 
                        GROUP BY DATE(created_at) ORDER BY DATE(created_at)";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("ss", $startDate, $endDate);
                $stmt->execute();
                $result = $stmt->get_result();
                
                $dailyBookings = [];
                while ($row = $result->fetch_assoc()) {
                    $dailyBookings[] = [
                        'date' => $row['date'],
                        'count' => (int)$row['count']
                    ];
                }
                $summaryData['dailyBookings'] = $dailyBookings;
                
                $reportData = $summaryData;
            }
            break;
            
        case 'revenue':
            // Get revenue statistics
            if ($detailed) {
                $sqlBase = "SELECT id, booking_number, passenger_name, passenger_phone, total_amount, payment_method, payment_status";
                
                // Add GST related columns if requested
                if ($withGst) {
                    $sqlBase .= ", gst_enabled, extra_charges, gst_number, company_name, company_address, total_amount as taxable_value";
                }
                
                $sqlBase .= ", created_at FROM bookings WHERE DATE(created_at) BETWEEN ? AND ?";
                
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
                // Summary revenue report
                $summaryData = [];
                
                // Base query parts
                $whereClause = "DATE(created_at) BETWEEN ? AND ?";
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
                $sql = "SELECT id, invoice_number, gst_number, company_name, company_address, base_amount as taxable_value, tax_amount as gst_amount, total_amount, invoice_date as created_at FROM invoices WHERE DATE(invoice_date) BETWEEN ? AND ? AND (gst_enabled = 1 OR is_igst = 1)";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("ss", $startDate, $endDate);
                $stmt->execute();
                $result = $stmt->get_result();
                $gstReportData = [];
                $totalTaxableValue = 0;
                $totalGstAmount = 0;
                while ($row = $result->fetch_assoc()) {
                    $taxableValue = (float)$row['taxable_value'];
                    $gstAmount = (float)$row['gst_amount'];
                    $gstRate = $taxableValue > 0 ? round(($gstAmount / $taxableValue) * 100) : 0;
                    $gstReportData[] = [
                        'id' => $row['id'],
                        'invoiceNumber' => $row['invoice_number'],
                        'customerName' => $row['company_name'] ?? 'N/A',
                        'gstNumber' => $row['gst_number'] ?? 'N/A',
                        'companyName' => $row['company_name'] ?? 'N/A',
                        'taxableValue' => $taxableValue,
                        'gstRate' => $gstRate . '%',
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
            try {
                // 1. Main vehicle stats
                $sql = "SELECT 
                            v.id as vehicle_id,
                            v.name as vehicle_name,
                            v.vehicle_number,
                            v.vehicle_type,
                            COUNT(*) as total_trips,
                            SUM(b.total_amount) as total_revenue
                        FROM bookings b
                        JOIN fleet_vehicles v ON b.fleet_vehicle_id = v.id
                        WHERE b.fleet_vehicle_id IS NOT NULL
                          AND DATE(b.created_at) BETWEEN ? AND ?
                        GROUP BY v.id
                        ORDER BY total_trips DESC";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("ss", $startDate, $endDate);
                $stmt->execute();
                $result = $stmt->get_result();
                $vehicleStats = [];
                while ($row = $result->fetch_assoc()) {
                    $vehicleStats[$row['vehicle_id']] = [
                        'vehicle_id' => $row['vehicle_id'],
                        'vehicle_name' => $row['vehicle_name'],
                        'vehicle_number' => $row['vehicle_number'],
                        'vehicle_type' => $row['vehicle_type'],
                        'total_trips' => (int)$row['total_trips'],
                        'total_revenue' => (float)$row['total_revenue'],
                        'fuel_cost' => 0,
                        'maintenance_cost' => 0,
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
                    $stat['profit'] = $stat['total_revenue'] - $stat['fuel_cost'] - $stat['maintenance_cost'];
                }
                unset($stat);

                // 5. Return as indexed array
                $reportData = array_values($vehicleStats);
            } catch (Exception $e) {
                debugLog("Error in vehicles report: " . $e->getMessage());
                // Provide sample data as fallback
                $reportData = [
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
                ];
            }
            break;
            
        case 'nongst':
            // Get non-GST bills data
            try {
                // First check if non_gst_bills table exists
                $tableExists = false;
                try {
                    $tableCheck = $conn->query("SHOW TABLES LIKE 'non_gst_bills'");
                    $tableExists = ($tableCheck && $tableCheck->num_rows > 0);
                } catch (Exception $e) {
                    debugLog("Error checking table: " . $e->getMessage());
                }
                
                if ($tableExists) {
                    // Use the non_gst_bills table if it exists
                    $sql = "SELECT id, bill_number as billNumber, bill_date as date, customer_name as customerName, 
                            amount, description, payment_status as paymentStatus, payment_method as paymentMethod
                            FROM non_gst_bills 
                            WHERE DATE(bill_date) BETWEEN ? AND ?";
                            
                    // Add payment method filter if specified
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
                    
                    $nonGstBills = [];
                    while ($row = $result->fetch_assoc()) {
                        // Ensure numeric values
                        $row['amount'] = (float)$row['amount'];
                        
                        $nonGstBills[] = $row;
                    }
                    
                    $reportData = ['bills' => $nonGstBills];
                } else {
                    // Create sample data for development and testing
                    $reportData = [
                        'bills' => [
                            [
                                'id' => '1',
                                'billNumber' => 'NON-GST-001',
                                'date' => date('Y-m-d', strtotime('-5 days')),
                                'customerName' => 'Local Customer 1',
                                'amount' => 1200,
                                'description' => 'Airport transfer',
                                'paymentStatus' => 'paid',
                                'paymentMethod' => 'cash'
                            ],
                            [
                                'id' => '2',
                                'billNumber' => 'NON-GST-002',
                                'date' => date('Y-m-d', strtotime('-8 days')),
                                'customerName' => 'Local Customer 2',
                                'amount' => 2500,
                                'description' => 'City tour',
                                'paymentStatus' => 'pending',
                                'paymentMethod' => null
                            ]
                        ]
                    ];
                }
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
