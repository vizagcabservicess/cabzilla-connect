<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// CRITICAL: Set all response headers first before any output
// Turn off error display to prevent output before JSON
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Start output buffering to catch any unexpected output
ob_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Clear any potential output buffer to avoid content contamination
if (ob_get_level()) ob_end_clean();

// Debug mode
$debugMode = isset($_GET['debug']) || isset($_SERVER['HTTP_X_DEBUG']);

// For front-end testing, check if we're in demo mode
$demoMode = isset($_GET['demo']) || isset($_SERVER['HTTP_X_DEMO_MODE']);

// Log request
error_log("Admin generate-invoice endpoint called: " . $_SERVER['REQUEST_METHOD']);

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Function to send JSON response
function sendJsonResponse($data, $statusCode = 200) {
    // Clear all output buffers
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    // Clear any previous output
    if (ob_get_length()) {
        ob_clean();
    }
    
    http_response_code($statusCode);
    
    // Ensure headers are set
    header('Content-Type: application/json', true);
    
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    
    if ($json === false) {
        // If JSON encoding fails, send error
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to encode response: ' . json_last_error_msg()
        ]);
    } else {
        echo $json;
    }
    
    exit;
}

// Generate a proper invoice number
function generateInvoiceNumber($bookingId, $customNumber = '') {
    if (!empty($customNumber)) {
        return $customNumber;
    }
    return 'INV-' . date('Ymd') . '-' . $bookingId;
}

// Log error function
function logInvoiceError($message, $data = []) {
    error_log("INVOICE ERROR: $message " . json_encode($data));
    $logFile = __DIR__ . '/../../logs/invoice_errors.log';
    $dir = dirname($logFile);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    file_put_contents(
        $logFile,
        date('Y-m-d H:i:s') . " - $message - " . json_encode($data) . "\n",
        FILE_APPEND
    );
}

/**
 * Unified GST calculation helper.
 * Returns deterministic GST numbers for both tax-inclusive and tax-exclusive flows.
 */
function calculateGstBreakdown(array $input): array
{
    // #region agent log
    // Calculate path to workspace root: from src/backend/php-templates/api/admin/ go up 5 levels
    $workspaceRoot = dirname(dirname(dirname(dirname(dirname(__DIR__)))));
    $logPath = $workspaceRoot . DIRECTORY_SEPARATOR . '.cursor' . DIRECTORY_SEPARATOR . 'debug.log';
    $logDir = dirname($logPath);
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0755, true);
    }
    $logEntry = json_encode([
        'id' => 'log_' . time() . '_calc_entry',
        'timestamp' => round(microtime(true) * 1000),
        'location' => 'generate-invoice.php:97',
        'message' => 'calculateGstBreakdown ENTRY',
        'data' => [
            'gstEnabled' => $input['gstEnabled'] ?? false,
            'includeTax' => $input['includeTax'] ?? false,
            'gstRate' => $input['gstRate'] ?? 0.18,
            'extraCharges' => $input['extraCharges'] ?? 0,
            'baseHint' => $input['baseHint'] ?? 0,
            'totalHint' => $input['totalHint'] ?? 0,
            'originalTotal' => $input['originalTotal'] ?? 0,
            'isIGST' => $input['isIGST'] ?? false
        ],
        'sessionId' => 'debug-session',
        'runId' => 'run1',
        'hypothesisId' => 'A'
    ]) . "\n";
    @file_put_contents($logPath, $logEntry, FILE_APPEND);
    // #endregion
    
    $gstEnabled = (bool)($input['gstEnabled'] ?? false);
    $includeTax = (bool)($input['includeTax'] ?? false);
    $gstRate = $gstEnabled ? (float)($input['gstRate'] ?? 0.18) : 0.0;
    $extraCharges = max(0, (float)($input['extraCharges'] ?? 0));
    $baseHint = max(0, (float)($input['baseHint'] ?? 0));
    $totalHint = max(0, (float)($input['totalHint'] ?? 0));
    $originalTotal = max(0, (float)($input['originalTotal'] ?? 0));
    $isIGST = (bool)($input['isIGST'] ?? false);

    $result = [
        'baseFare' => 0.0,
        'taxAmount' => 0.0,
        'cgstAmount' => 0.0,
        'sgstAmount' => 0.0,
        'igstAmount' => 0.0,
        'totalAmount' => 0.0,
        'taxableSubtotal' => 0.0,
        'gstOnBaseFare' => 0.0,
        'gstOnExtraCharges' => 0.0
    ];

    // Fast exit when GST is disabled
    if (!$gstEnabled || $gstRate <= 0) {
        $base = $baseHint > 0 ? $baseHint : max(0, $originalTotal - $extraCharges);
        if ($base <= 0 && $totalHint > 0) {
            $base = max(0, $totalHint - $extraCharges);
        }
        $subtotal = round($base + $extraCharges, 2);
        $result['baseFare'] = round($base, 2);
        $result['totalAmount'] = $subtotal;
        $result['taxableSubtotal'] = $subtotal;
        return $result;
    }

    $base = 0.0;
    $taxAmount = 0.0;
    $taxableSubtotal = 0.0;
    $finalTotal = 0.0;

    if ($includeTax) {
        /**
         * GST-INCLUSIVE MODE
         * User amount already includes GST. We only need to back-calculate the split.
         * Formula:
         *  - GST Amount   = Total × 18 / 118
         *  - Base (preTax)= Total × 100 / 118
         */
        $inclusiveTotal = 0.0;
        if ($originalTotal > 0) {
            $inclusiveTotal = $originalTotal;
        } elseif ($totalHint > 0) {
            $inclusiveTotal = $totalHint;
        } else {
            $inclusiveTotal = ($baseHint + $extraCharges) * (1 + $gstRate);
        }
        $inclusiveTotal = round($inclusiveTotal, 2);

        if ($inclusiveTotal <= 0) {
            logInvoiceError("GST-inclusive calculation failed - no valid total provided", [
                'originalTotal' => $originalTotal,
                'totalHint' => $totalHint,
                'baseHint' => $baseHint
            ]);
            return $result;
        }

        $taxableSubtotal = round($inclusiveTotal / (1 + $gstRate), 2);
        $base = max(0, round($taxableSubtotal - $extraCharges, 2));
        $taxAmount = round($inclusiveTotal - $taxableSubtotal, 2);
        $finalTotal = $inclusiveTotal;

        logInvoiceError("GST-inclusive breakdown", [
            'total' => $finalTotal,
            'taxableSubtotal' => $taxableSubtotal,
            'base' => $base,
            'extraCharges' => $extraCharges,
            'taxAmount' => $taxAmount
        ]);
    } else {
        /**
         * GST-EXCLUSIVE MODE
         * Base fare is pre-tax. GST must be added on top.
         * Formula:
         *  - GST Amount = (Base + Extras) × 18%
         *  - Total      = Base + Extras + GST
         */
        if ($baseHint > 0) {
            $base = $baseHint;
        } elseif ($originalTotal > 0) {
            $base = max(0, $originalTotal - $extraCharges);
        } elseif ($totalHint > 0) {
            // totalHint might include GST if it came from a previous invoice
            $extractedSubtotal = round($totalHint / (1 + $gstRate), 2);
            $base = max(0, $extractedSubtotal - $extraCharges);
        } else {
            $base = 0;
        }

        $taxableSubtotal = round($base + $extraCharges, 2);
        $taxAmount = round($taxableSubtotal * $gstRate, 2);
        $finalTotal = round($taxableSubtotal + $taxAmount, 2);

        logInvoiceError("GST-exclusive breakdown", [
            'base' => $base,
            'extraCharges' => $extraCharges,
            'taxableSubtotal' => $taxableSubtotal,
            'taxAmount' => $taxAmount,
            'finalTotal' => $finalTotal,
            'baseHint' => $baseHint,
            'originalTotal' => $originalTotal,
            'totalHint' => $totalHint
        ]);
    }

    $result['baseFare'] = round($base, 2);
    $result['taxAmount'] = round($taxAmount, 2);
    $result['taxableSubtotal'] = round($taxableSubtotal, 2);
    $result['totalAmount'] = round($finalTotal, 2);

    // Split GST for IGST / CGST+SGST
    if ($isIGST) {
        $result['igstAmount'] = $result['taxAmount'];
    } else {
        $half = round($result['taxAmount'] / 2, 2);
        $result['cgstAmount'] = $half;
        $result['sgstAmount'] = round($result['taxAmount'] - $half, 2);
    }

    // Allocate GST between base fare and extras
    if ($result['taxableSubtotal'] > 0) {
        $baseShare = $result['baseFare'] / $result['taxableSubtotal'];
        $gstOnBase = round($result['taxAmount'] * $baseShare, 2);
        $gstOnExtra = round($result['taxAmount'] - $gstOnBase, 2);
        $result['gstOnBaseFare'] = max(0, $gstOnBase);
        $result['gstOnExtraCharges'] = max(0, $gstOnExtra);
    } else {
        $result['gstOnBaseFare'] = $result['taxAmount'];
        $result['gstOnExtraCharges'] = 0;
    }

    // #region agent log
    $workspaceRoot = dirname(dirname(dirname(dirname(dirname(__DIR__)))));
    $logPath = $workspaceRoot . DIRECTORY_SEPARATOR . '.cursor' . DIRECTORY_SEPARATOR . 'debug.log';
    $logDir = dirname($logPath);
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0755, true);
    }
    $logEntry = json_encode([
        'id' => 'log_' . time() . '_calc_exit',
        'timestamp' => round(microtime(true) * 1000),
        'location' => 'generate-invoice.php:239',
        'message' => 'calculateGstBreakdown EXIT',
        'data' => [
            'baseFare' => $result['baseFare'],
            'taxAmount' => $result['taxAmount'],
            'cgstAmount' => $result['cgstAmount'],
            'sgstAmount' => $result['sgstAmount'],
            'totalAmount' => $result['totalAmount'],
            'taxableSubtotal' => $result['taxableSubtotal'],
            'gstOnBaseFare' => $result['gstOnBaseFare'],
            'gstOnExtraCharges' => $result['gstOnExtraCharges'],
            'verification' => 'Base(' . $result['baseFare'] . ') + Extra(' . $extraCharges . ') + Tax(' . $result['taxAmount'] . ') = ' . ($result['baseFare'] + $extraCharges + $result['taxAmount']) . ', Expected: ' . $result['totalAmount']
        ],
        'sessionId' => 'debug-session',
        'runId' => 'run1',
        'hypothesisId' => 'A'
    ]) . "\n";
    @file_put_contents($logPath, $logEntry, FILE_APPEND);
    // #endregion

    return $result;
}



try {
    // #region agent log - Test logging at script start
    $workspaceRoot = dirname(dirname(dirname(dirname(dirname(__DIR__)))));
    $logPath = $workspaceRoot . DIRECTORY_SEPARATOR . '.cursor' . DIRECTORY_SEPARATOR . 'debug.log';
    $logDir = dirname($logPath);
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0755, true);
    }
    $testLogEntry = json_encode([
        'id' => 'log_' . time() . '_script_start',
        'timestamp' => round(microtime(true) * 1000),
        'location' => 'generate-invoice.php:244',
        'message' => 'SCRIPT START - Invoice generation initiated',
        'data' => [
            'requestMethod' => $_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN',
            'logPath' => $logPath,
            'logDirExists' => is_dir($logDir) ? 'YES' : 'NO',
            'logPathWritable' => is_writable($logDir) ? 'YES' : 'NO'
        ],
        'sessionId' => 'debug-session',
        'runId' => 'run1',
        'hypothesisId' => 'TEST'
    ]) . "\n";
    @file_put_contents($logPath, $testLogEntry, FILE_APPEND);
    // #endregion
    
    // Get booking ID
    $bookingId = null;
    $gstEnabled = false;
    $gstDetails = null;
    $isIGST = false;
    $includeTax = true;
    $customInvoiceNumber = '';
    $lockedBaseFare = null;
    $gstRate = 0.18; // GST rate is 18% (CGST 9% + SGST 9% or IGST 18%)
    
    // Handle both GET and POST methods
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $jsonData = file_get_contents('php://input');
        $data = json_decode($jsonData, true);
        
        // Log raw request data for debugging
        logInvoiceError("POST request received", [
            'raw_json' => $jsonData,
            'parsed_data' => $data,
            'json_error' => json_last_error_msg()
        ]);
        
        if (isset($data['bookingId'])) {
            $bookingId = (int)$data['bookingId'];
        }
        
        if (isset($data['gstEnabled'])) {
            $gstEnabled = filter_var($data['gstEnabled'], FILTER_VALIDATE_BOOLEAN);
        }
        
        if (isset($data['isIGST'])) {
            $isIGST = filter_var($data['isIGST'], FILTER_VALIDATE_BOOLEAN);
        }
        
        if (isset($data['includeTax'])) {
            $includeTax = filter_var($data['includeTax'], FILTER_VALIDATE_BOOLEAN);
        }
        
        if (isset($data['invoiceNumber'])) {
            $customInvoiceNumber = $data['invoiceNumber'];
        }
        
        if (isset($data['gstDetails'])) {
            $gstDetails = $data['gstDetails'];
            
            // CRITICAL: Extract lockedBaseFare from gstDetails if it's nested there
            // The frontend sends lockedBaseFare inside gstDetails object
            if (is_array($gstDetails) && isset($gstDetails['lockedBaseFare'])) {
                $lockedBaseFare = floatval($gstDetails['lockedBaseFare']);
                logInvoiceError("Extracted lockedBaseFare from gstDetails", [
                    'lockedBaseFare' => $lockedBaseFare,
                    'gstDetails_keys' => array_keys($gstDetails)
                ]);
            }
        }
        
        // Also check top-level lockedBaseFare (for backward compatibility)
        if (isset($data['lockedBaseFare']) && ($lockedBaseFare === null || $lockedBaseFare <= 0)) {
            $lockedBaseFare = floatval($data['lockedBaseFare']);
            logInvoiceError("Extracted lockedBaseFare from top-level data", [
                'lockedBaseFare' => $lockedBaseFare
            ]);
        }
    } 
    else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (isset($_GET['id'])) {
            $bookingId = (int)$_GET['id'];
        }
        
        if (isset($_GET['gstEnabled'])) {
            $gstEnabled = filter_var($_GET['gstEnabled'], FILTER_VALIDATE_BOOLEAN);
        }
        
        if (isset($_GET['isIGST'])) {
            $isIGST = filter_var($_GET['isIGST'], FILTER_VALIDATE_BOOLEAN);
        }
        
        if (isset($_GET['includeTax'])) {
            $includeTax = filter_var($_GET['includeTax'], FILTER_VALIDATE_BOOLEAN);
        }
        
        if (isset($_GET['invoiceNumber'])) {
            $customInvoiceNumber = $_GET['invoiceNumber'];
        }
        
        // Get GST details from query params if present
        if (isset($_GET['gstNumber']) && isset($_GET['companyName'])) {
            $gstDetails = [
                'gstNumber' => $_GET['gstNumber'],
                'companyName' => $_GET['companyName'],
                'companyAddress' => isset($_GET['companyAddress']) ? $_GET['companyAddress'] : '',
            ];
        }
        
        if (isset($_GET['lockedBaseFare'])) {
            $lockedBaseFare = floatval($_GET['lockedBaseFare']);
        }
    }
    
    logInvoiceError("Generate invoice request", [
        'bookingId' => $bookingId, 
        'gstEnabled' => $gstEnabled ? "true" : "false",
        'isIGST' => $isIGST ? "true" : "false",
        'includeTax' => $includeTax ? "true" : "false",
        'customInvoiceNumber' => $customInvoiceNumber,
        'lockedBaseFare' => $lockedBaseFare,
        'toggle_state' => $gstEnabled ? ($includeTax ? 'GST_ENABLED_INCLUDE_TAX' : 'GST_ENABLED_EXCLUDE_TAX') : 'GST_DISABLED_NEUTRAL'
    ]);
    
    if (!$bookingId && !$demoMode) {
        sendJsonResponse(['status' => 'error', 'message' => 'Missing booking ID'], 400);
    }

    // Connect to database using config.php function
    $conn = null;
    try {
        // Use the database connection function from config.php
        $conn = getDbConnection();
        logInvoiceError("Database connection successful", [
            'host' => DB_HOST ?? 'unknown',
            'database' => DB_NAME ?? 'unknown'
        ]);
    } catch (Exception $e) {
        logInvoiceError("Database connection error", ['error' => $e->getMessage()]);
        if ($demoMode) {
            // Return mock data in demo mode
            error_log("Demo mode enabled for invoice generation");
        } else {
            // In production, return an error
            sendJsonResponse([
                'status' => 'error', 
                'message' => 'Database connection failed: ' . $e->getMessage(),
                'error_details' => $debugMode ? $e->getMessage() : null
            ], 500);
        }
    }
    
    // Get booking details from database (or use mock data in demo mode)
    $booking = null;
    $extraChargesArr = [];
    $totalExtraCharges = 0;
    
    // Log the booking ID being searched for
    logInvoiceError("Searching for booking", [
        'bookingId' => $bookingId,
        'bookingId_type' => gettype($bookingId),
        'demoMode' => $demoMode ? 'true' : 'false',
        'conn_set' => isset($conn) ? 'true' : 'false'
    ]);
    
    if (!$demoMode && isset($conn)) {
        try {
            // First, let's check if the booking exists with better error handling
            $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
            if (!$stmt) {
                throw new Exception("Failed to prepare statement: " . $conn->error);
            }
            
            $stmt->bind_param("i", $bookingId);
            if (!$stmt->execute()) {
                throw new Exception("Failed to execute query: " . $stmt->error);
            }
            
            $result = $stmt->get_result();
            
            logInvoiceError("Query executed", [
                'bookingId' => $bookingId,
                'num_rows' => $result->num_rows,
                'query_error' => $stmt->error ? $stmt->error : 'none'
            ]);
            
            if ($result->num_rows === 0) {
                // Try to see if there are any bookings at all
                $checkStmt = $conn->query("SELECT COUNT(*) as total FROM bookings");
                $checkResult = $checkStmt->fetch_assoc();
                logInvoiceError("Booking not found - checking database", [
                    'bookingId_searched' => $bookingId,
                    'total_bookings_in_db' => $checkResult['total'] ?? 'unknown'
                ]);
                sendJsonResponse(['status' => 'error', 'message' => 'Booking not found', 'bookingId' => $bookingId], 404);
            }
            
            $booking = $result->fetch_assoc();
            logInvoiceError("Booking found", ['booking_id' => $booking['id'], 'amount' => $booking['total_amount']]);
            
            // DEBUG: Log the pickup date from database
            logInvoiceError("DEBUG - Booking pickup date from DB", [
                'booking_id' => $booking['id'],
                'pickup_date_raw' => $booking['pickup_date'],
                'pickup_date_type' => gettype($booking['pickup_date']),
                'pickup_date_strtotime' => strtotime($booking['pickup_date']),
                'pickup_date_formatted' => date('Y-m-d H:i:s', strtotime($booking['pickup_date']))
            ]);

            // Parse extra_charges robustly from booking
            $extraChargesArr = [];
            $totalExtraCharges = 0;
            if (!empty($booking['extra_charges'])) {
                $extraChargesArr = json_decode($booking['extra_charges'], true);
            } elseif (!empty($booking['extraCharges'])) {
                $extraChargesArr = is_array($booking['extraCharges']) ? $booking['extraCharges'] : json_decode($booking['extraCharges'], true);
            }
            if (is_array($extraChargesArr)) {
                foreach ($extraChargesArr as $charge) {
                    if (isset($charge['amount'])) {
                        $totalExtraCharges += floatval($charge['amount']);
                    }
                }
            } else {
                $extraChargesArr = [];
            }
            logInvoiceError('Loaded extra charges for invoice', ['booking_id' => $booking['id'], 'extraChargesArr' => $extraChargesArr]);

            logInvoiceError('Raw extra_charges in booking', [
                'booking_id' => $booking['id'],
                'extra_charges' => isset($booking['extra_charges']) ? $booking['extra_charges'] : null,
                'extraCharges' => isset($booking['extraCharges']) ? $booking['extraCharges'] : null
            ]);
        } catch (Exception $e) {
            // If there's a database error, enable demo mode for testing
            $demoMode = true;
            logInvoiceError("Error fetching booking", ['bookingId' => $bookingId, 'error' => $e->getMessage()]);
            error_log("Error fetching booking $bookingId: " . $e->getMessage() . ". Switching to demo mode.");
        }
    } else {
        // In demo mode, create a mock booking
        $demoMode = true;
    }
    
    if ($demoMode) {
        // Use mock data for testing purposes
        $booking = [
            'id' => $bookingId ?? 12345,
            'booking_number' => 'CB' . rand(1000000000, 9999999999),
            'passenger_name' => 'John Demo',
            'passenger_email' => 'john@example.com',
            'passenger_phone' => '9876543210',
            'trip_type' => 'local',
            'trip_mode' => 'outstation',
            'pickup_location' => 'Visakhapatnam Airport',
            'drop_location' => 'Araku Valley',
            'pickup_date' => date('Y-m-d H:i:s'),
            'cab_type' => 'Innova Crysta',
            'total_amount' => 3500,
            'driver_name' => 'Rajesh Kumar',
            'driver_phone' => '9876543210',
            'vehicle_number' => 'AP 31 AB 1234',
            'status' => 'confirmed',
            'extra_charges' => json_encode([
                ['label' => 'Toll Fee', 'amount' => 100],
                ['label' => 'Parking', 'amount' => 50]
            ])
        ];
        $extraChargesArr = [
            ['label' => 'Toll Fee', 'amount' => 100],
            ['label' => 'Parking', 'amount' => 50]
        ];
        $totalExtraCharges = 150;
    }

    // Normalize GST details into an array
    if (is_string($gstDetails)) {
        $decodedGstDetails = json_decode($gstDetails, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $gstDetails = $decodedGstDetails;
        }
    }
    
    // At the top, after POST/GET handling, set gstDetails to default if not set
    if (!is_array($gstDetails)) {
        $gstDetails = [
            'gstNumber' => '',
            'companyName' => '',
            'companyAddress' => ''
        ];
    }
    
    // Attempt to extract locked/base fare hints from GST details
    $attemptBaseFareExtraction = function($value) use (&$lockedBaseFare) {
        if (($lockedBaseFare === null || $lockedBaseFare <= 0) && isset($value) && $value !== '') {
            $candidate = floatval($value);
            if ($candidate > 0) {
                $lockedBaseFare = $candidate;
            }
        }
    };
    
    if (is_array($gstDetails)) {
        if (isset($gstDetails['lockedBaseFare'])) {
            $attemptBaseFareExtraction($gstDetails['lockedBaseFare']);
        }
        if (isset($gstDetails['originalFare'])) {
            $attemptBaseFareExtraction($gstDetails['originalFare']);
        }
    }

    // Current date for invoice generation
    $currentDate = date('Y-m-d');
    $invoiceNumber = generateInvoiceNumber($booking['id'], $customInvoiceNumber);
    
    // CRITICAL: Get original booking total FIRST - this is the source of truth
    // This is the amount the customer originally paid/booked
    // NEVER use invoice database values - always use booking table values
    // For tax-exclusive mode, prefer 'fare' field over 'total_amount' as fare is pre-GST
    $originalBookingTotal = null;
    
    // For tax-exclusive mode, prefer fare field (pre-GST base fare)
    if ($gstEnabled && !$includeTax && isset($booking['fare']) && $booking['fare'] > 0) {
        $originalBookingTotal = (float)$booking['fare'];
        logInvoiceError("Tax-exclusive: Using fare field as original booking total", [
            'fare' => $originalBookingTotal,
            'total_amount' => isset($booking['total_amount']) ? $booking['total_amount'] : 'not set',
            'note' => 'For tax-exclusive, fare field (₹18,814) is the base fare, not total_amount'
        ]);
    } else {
        // For tax-inclusive or no GST, use total_amount
        if (isset($booking['total_amount']) && $booking['total_amount'] > 0) {
            $originalBookingTotal = (float)$booking['total_amount'];
        } elseif (isset($booking['totalAmount']) && $booking['totalAmount'] > 0) {
            $originalBookingTotal = (float)$booking['totalAmount'];
        } elseif (isset($booking['amount']) && $booking['amount'] > 0) {
            $originalBookingTotal = (float)$booking['amount'];
        } elseif (isset($booking['fare']) && $booking['fare'] > 0) {
            // Fallback to fare if total_amount not available
            $originalBookingTotal = (float)$booking['fare'];
        }
    }
    
    logInvoiceError("Original booking total captured", [
        'original_booking_total' => $originalBookingTotal,
        'booking_id' => $booking['id'] ?? 'unknown',
        'booking_fare' => isset($booking['fare']) ? $booking['fare'] : 'not set',
        'booking_total_amount' => isset($booking['total_amount']) ? $booking['total_amount'] : 'not set',
        'gstEnabled' => $gstEnabled ? 'true' : 'false',
        'includeTax' => $includeTax ? 'true' : 'false',
        'mode' => $gstEnabled ? ($includeTax ? 'TAX-INCLUSIVE' : 'TAX-EXCLUSIVE') : 'NO-GST',
        'note' => 'This is the source of truth for base fare calculation'
    ]);
    
    // Calculate tax components using the new GST engine
    $baseFare = 0;
    $taxAmount = 0;
    $cgstAmount = 0;
    $sgstAmount = 0;
    $igstAmount = 0;
    $grossAmount = 0;
    $taxableAmount = 0;
    $gstOnBaseFare = 0;
    $totalGstOnExtraCharges = 0;
    $finalTotal = 0;
    $preservedOriginalTotal = false;
    
    // CRITICAL: For tax-exclusive, base fare should be original total (₹4,450)
    // For tax-inclusive, base fare will be calculated from original total
    $baseHint = 0;
    
    // Priority 1: Use locked base fare if provided (user-entered value)
    if ($lockedBaseFare !== null && $lockedBaseFare > 0) {
        $baseHint = (float)$lockedBaseFare;
    }
    // Priority 2: For tax-exclusive, original total IS the base fare
    elseif ($gstEnabled && !$includeTax && $originalBookingTotal !== null && $originalBookingTotal > 0) {
        // Tax-exclusive: Base fare = original booking total (₹4,450)
        // GST will be applied on top of this
        $baseHint = max(0, $originalBookingTotal - $totalExtraCharges);
        logInvoiceError("Tax-exclusive: Using original booking total as base fare", [
            'originalBookingTotal' => $originalBookingTotal,
            'totalExtraCharges' => $totalExtraCharges,
            'baseHint' => $baseHint,
            'note' => 'Original total (₹4,450) becomes base fare, GST will be added on top'
        ]);
    }
    // Priority 3: Use booking fare or base_fare
    elseif (isset($booking['fare']) && $booking['fare'] > 0) {
        $baseHint = (float)$booking['fare'];
    }
    elseif (isset($booking['base_fare']) && $booking['base_fare'] > 0) {
        $baseHint = (float)$booking['base_fare'];
    }
    // Priority 4: Fallback to original total
    elseif ($originalBookingTotal !== null && $originalBookingTotal > 0) {
        $baseHint = max(0, $originalBookingTotal - $totalExtraCharges);
    }
    
    $totalHintCandidates = [];
    if ($originalBookingTotal !== null && $originalBookingTotal > 0) {
        $totalHintCandidates[] = $originalBookingTotal;
    }
    if (isset($booking['total_amount']) && $booking['total_amount'] > 0) {
        $totalHintCandidates[] = (float)$booking['total_amount'];
    }
    if (isset($booking['amount']) && $booking['amount'] > 0) {
        $totalHintCandidates[] = (float)$booking['amount'];
    }
    $totalHint = count($totalHintCandidates) > 0 ? max($totalHintCandidates) : 0;
    
    $gstComputation = calculateGstBreakdown([
        'gstEnabled' => $gstEnabled,
        'includeTax' => $includeTax,
        'gstRate' => $gstRate,
        'baseHint' => $baseHint,
        'extraCharges' => $totalExtraCharges,
        'totalHint' => $totalHint,
        'originalTotal' => $originalBookingTotal,
        'isIGST' => $isIGST
    ]);
    
    $baseFare = $gstComputation['baseFare'];
    $taxAmount = $gstComputation['taxAmount'];
    $cgstAmount = $gstComputation['cgstAmount'];
    $sgstAmount = $gstComputation['sgstAmount'];
    $igstAmount = $gstComputation['igstAmount'];
    $finalTotal = $gstComputation['totalAmount'];
    $grossAmount = $gstComputation['taxableSubtotal'];
    $taxableAmount = $gstComputation['taxableSubtotal'];
    $gstOnBaseFare = $gstComputation['gstOnBaseFare'];
    $totalGstOnExtraCharges = $gstComputation['gstOnExtraCharges'];
    
    // #region agent log
    $workspaceRoot = dirname(dirname(dirname(dirname(dirname(__DIR__)))));
    $logPath = $workspaceRoot . DIRECTORY_SEPARATOR . '.cursor' . DIRECTORY_SEPARATOR . 'debug.log';
    $logDir = dirname($logPath);
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0755, true);
    }
    $logEntry = json_encode([
        'id' => 'log_' . time() . '_after_gst',
        'timestamp' => round(microtime(true) * 1000),
        'location' => 'generate-invoice.php:663',
        'message' => 'Values AFTER GST computation',
        'data' => [
            'baseFare' => $baseFare,
            'extraCharges' => $totalExtraCharges,
            'taxAmount' => $taxAmount,
            'cgstAmount' => $cgstAmount,
            'sgstAmount' => $sgstAmount,
            'finalTotal' => $finalTotal,
            'taxableSubtotal' => $taxableAmount,
            'gstEnabled' => $gstEnabled,
            'includeTax' => $includeTax,
            'verification_sum' => $baseFare + $totalExtraCharges + $taxAmount,
            'verification_cgst_sgst' => $cgstAmount + $sgstAmount
        ],
        'sessionId' => 'debug-session',
        'runId' => 'run1',
        'hypothesisId' => 'B'
    ]) . "\n";
    @file_put_contents($logPath, $logEntry, FILE_APPEND);
    // #endregion
    
    logInvoiceError("GST computation summary (new engine)", [
        'base_fare' => $baseFare,
        'extra_charges' => $totalExtraCharges,
        'tax_amount' => $taxAmount,
        'final_total' => $finalTotal,
        'include_tax' => $includeTax ? 'true' : 'false',
        'gst_enabled' => $gstEnabled ? 'true' : 'false'
    ]);
    
    // Legacy GST logic retained for reference (no longer executed)
    if (false) {
        // LEGACY BLOCK START
    
    // Only calculate if we don't have existing values
    // CRITICAL: Preserve original booking total_amount when calculating from it
    $originalBookingTotal = null;
    $preservedOriginalTotal = false; // Flag to track if we've preserved the original total
    
    // Try multiple field names to get the booking total
    if (isset($booking['total_amount']) && $booking['total_amount'] > 0) {
        $originalBookingTotal = (float)$booking['total_amount'];
    } elseif (isset($booking['totalAmount']) && $booking['totalAmount'] > 0) {
        $originalBookingTotal = (float)$booking['totalAmount'];
    } elseif (isset($booking['amount']) && $booking['amount'] > 0) {
        $originalBookingTotal = (float)$booking['amount'];
    }
    
    if ($originalBookingTotal !== null) {
        logInvoiceError("Original booking total_amount captured", [
            'original_booking_total' => $originalBookingTotal,
            'booking_id' => $booking['id'],
            'total_amount_field' => isset($booking['total_amount']) ? $booking['total_amount'] : 'not set',
            'totalAmount_field' => isset($booking['totalAmount']) ? $booking['totalAmount'] : 'not set',
            'amount_field' => isset($booking['amount']) ? $booking['amount'] : 'not set'
        ]);
    } else {
        logInvoiceError("WARNING: Could not find original booking total_amount", [
            'booking_id' => $booking['id'],
            'booking_keys' => array_keys($booking),
            'total_amount_field' => isset($booking['total_amount']) ? $booking['total_amount'] : 'not set',
            'totalAmount_field' => isset($booking['totalAmount']) ? $booking['totalAmount'] : 'not set'
        ]);
    }
    
    // CRITICAL: Skip ALL base fare calculation if we have existing invoice values
    if (!isset($calculationDone)) {
        // CRITICAL: When GST is disabled (neutral), default to original booking total as base fare
        // This ensures base fare shows ₹18,814 (with GST) not ₹15,944 (pre-GST)
        // Only use locked base fare if GST is enabled OR if user explicitly wants pre-GST amount
        if (!$gstEnabled && $originalBookingTotal !== null && $originalBookingTotal > 0) {
            // When GST is disabled (neutral), use original booking total as base fare (includes GST)
            // This is the default behavior: show full amount as base fare
            $baseFare = $originalBookingTotal - $totalExtraCharges;
            logInvoiceError("GST DISABLED: Using original booking total as base fare (default behavior)", [
                'original_booking_total' => $originalBookingTotal,
                'locked_base_fare' => $lockedBaseFare,
                'base_fare_set' => $baseFare,
                'gst_enabled' => false,
                'note' => 'When GST is disabled (neutral), base fare = original booking total (₹18,814), not pre-GST (₹15,944)'
            ]);
        } elseif ($lockedBaseFare !== null && $lockedBaseFare > 0) {
            // Always respect the user-entered base fare when provided
            $baseFare = $lockedBaseFare;
            logInvoiceError("Using locked base fare (user-entered value)", [
                'lockedBaseFare' => $lockedBaseFare,
                'baseFare_set' => $baseFare,
                'includeTax' => $includeTax ? 'true' : 'false',
                'gst_enabled' => $gstEnabled ? 'true' : 'false'
            ]);
        } else {
            // Only calculate base fare if lockedBaseFare was NOT provided
            // CRITICAL: First try to use booking fare if available, but ensure it doesn't include extra charges
            $bookingFare = isset($booking['fare']) ? (float)$booking['fare'] : 0;
            
            // If booking fare exists, check if it might include extra charges
            // If booking fare is close to (total_amount - extra_charges), it's likely the correct base fare
            // But if it's close to total_amount, it might include extra charges
            if ($bookingFare > 0) {
                $totalAmount = isset($booking['total_amount']) ? (float)$booking['total_amount'] : 0;
                // If booking fare is very close to total_amount (within 5%), it might include extra charges
                if ($totalAmount > 0 && abs($bookingFare - $totalAmount) < ($totalAmount * 0.05)) {
                    // Booking fare seems to include extra charges, subtract them
                    $baseFare = max(0, $bookingFare - $totalExtraCharges);
                    logInvoiceError("Booking fare appears to include extra charges, subtracting them", [
                        'booking_fare' => $bookingFare,
                        'total_amount' => $totalAmount,
                        'extra_charges' => $totalExtraCharges,
                        'adjusted_base_fare' => $baseFare
                    ]);
                } else {
                    // Booking fare seems correct (doesn't include extra charges)
                    $baseFare = $bookingFare;
                    logInvoiceError("Using booking fare as base fare (appears correct)", ['fare' => $baseFare]);
                }
            } else {
                $baseFare = 0;
            }
            
            // If no fare field or fare is 0, calculate base fare from total_amount by backing out GST and extra charges
            if ($baseFare <= 0 && isset($booking['total_amount']) && $booking['total_amount'] > 0) {
                $totalAmount = (float)$booking['total_amount'];
                
                // If GST is enabled, check if tax is included in the total_amount
                if ($gstEnabled) {
                    if ($includeTax) {
                        // Tax-inclusive: total_amount already includes tax
                        // taxable_amount = total_amount / 1.18
                        // base_fare = taxable_amount - extra_charges
                        // CRITICAL: Preserve original total_amount as finalTotal
                        $taxableAmount = round($totalAmount / 1.18, 2);
                        $baseFare = round($taxableAmount - $totalExtraCharges, 2);
                    } else {
                        // Tax-exclusive: base_fare should be original booking total (₹18,814)
                        // GST will be applied on top of this base fare
                        // base_fare = total_amount - extra_charges
                        $baseFare = $totalAmount - $totalExtraCharges;
                    }
                } else {
                    // CRITICAL: No GST enabled - base fare should use the original booking total
                    // When GST is disabled (neutral state), base fare = original booking total (includes GST)
                    // This is the default behavior: show the full amount as base fare
                    // Only when GST is explicitly excluded should we remove tax
                    $baseFare = $totalAmount - $totalExtraCharges;
                    
                    logInvoiceError("GST DISABLED: Base fare uses original booking total (includes GST)", [
                        'total_amount' => $totalAmount,
                        'extra_charges' => $totalExtraCharges,
                        'calculated_base_fare' => $baseFare,
                        'note' => 'When GST is disabled (neutral), base fare = original booking total (₹18,814), not pre-GST amount (₹15,944)'
                    ]);
                }
                
                // Ensure base fare is not negative
                $baseFare = max(0, $baseFare);
                logInvoiceError("Calculated base fare from total_amount (no locked base fare provided)", [
                    'total_amount' => $totalAmount,
                    'extra_charges' => $totalExtraCharges,
                    'calculated_base_fare' => $baseFare,
                    'gst_enabled' => $gstEnabled,
                    'include_tax' => $includeTax ? 'true' : 'false',
                    'original_booking_total_preserved' => $originalBookingTotal,
                    'calculation_mode' => $gstEnabled ? ($includeTax ? 'GST_ENABLED_TAX_INCLUSIVE' : 'GST_ENABLED_TAX_EXCLUSIVE') : 'GST_DISABLED_NO_TAX'
                ]);
            }
        }
    }
    
    // Only calculate tax if we don't already have it from existing invoice
    if (!isset($calculationDone)) {
    // GST rate is always 18% (either as IGST 18% or CGST 9% + SGST 9%)
    $gstRate = $gstEnabled ? 0.18 : 0; 
    
    // CRITICAL: When lockedBaseFare is provided, preserve it exactly as entered
    // EXCEPTION: When tax is EXCLUSIVE, use original booking total as base fare instead
    // This MUST happen BEFORE any validation or recalculation
    if ($lockedBaseFare !== null && $lockedBaseFare > 0) {
        $baseFare = $lockedBaseFare;
        logInvoiceError("Preserving user-entered base fare (CRITICAL)", [
            'locked_base_fare' => $lockedBaseFare,
            'base_fare_preserved' => $baseFare,
            'includeTax' => $includeTax ? 'true' : 'false',
            'gst_enabled' => $gstEnabled ? 'true' : 'false'
        ]);
    } else {
        // Only validate/convert if lockedBaseFare was NOT provided
        if (!is_numeric($baseFare)) {
            $baseFare = floatval($baseFare);
        }
        // Only set to 0 if it's negative (not if it's 0 by design)
        if ($baseFare < 0) {
            $baseFare = 0;
        }
    }
    
    // Calculate gross amount (base fare + all extra charges)
    // When tax-inclusive: gross amount = entered amounts (preserve user input)
    // When tax-exclusive: gross amount = entered amounts (will add tax later)
    $grossAmount = $baseFare + $totalExtraCharges;
    
    // Handle tax calculation based on includeTax setting
    if ($gstEnabled) {
        if ($includeTax) {
            // Tax-inclusive: treat the entered amount as the final total when provided
            // CRITICAL: If base fare is already locked from existing invoice, preserve it
            $inclusiveTotal = null;
            $baseFareLocked = isset($calculationDone) && $calculationDone;
            
            // Check if base fare is locked from existing invoice
            $baseFareLocked = isset($baseFareLockedFromInvoice) && $baseFareLockedFromInvoice;
            
            if ($baseFareLocked) {
                // Base fare is locked from existing invoice
                // CRITICAL: When tax is INCLUSIVE, we must use the original booking total as the inclusive total
                // The locked base fare from database might be wrong (it could be the total, not pre-tax)
                // Always use original booking total for tax-inclusive calculations
                if ($originalBookingTotal !== null && $originalBookingTotal > 0) {
                    // Use original booking total as the inclusive total (₹4,000)
                    $finalTotal = $originalBookingTotal;
                    
                    // Back-calculate: Taxable amount = Total / 1.18
                    $taxableAmount = round($finalTotal / (1 + $gstRate), 2);
                    // Back-calculate: GST = Total - Taxable Amount
                    $taxAmount = round($finalTotal - $taxableAmount, 2);
                    
                    // CRITICAL: Recalculate base fare from taxable amount
                    // Base Fare = Taxable Amount - Extra Charges
                    $preTaxBaseFare = round($taxableAmount - $totalExtraCharges, 2);
                    
                    // Update base fare to show pre-tax amount in HTML
                    $baseFare = $preTaxBaseFare;
                    $grossAmount = $baseFare + $totalExtraCharges;
                    
                    logInvoiceError("Tax-inclusive with LOCKED base fare - using original booking total and recalculating", [
                        'locked_base_fare_from_db' => $baseFare,
                        'original_booking_total' => $originalBookingTotal,
                        'recalculated_pre_tax_base_fare' => $preTaxBaseFare,
                        'extra_charges' => $totalExtraCharges,
                        'taxable_amount' => $taxableAmount,
                        'tax_amount' => $taxAmount,
                        'final_total' => $finalTotal,
                        'gross_amount' => $grossAmount,
                        'verification' => 'Total (' . $finalTotal . ') = Taxable (' . $taxableAmount . ') + Tax (' . $taxAmount . '), Base (' . $baseFare . ') + Extra (' . $totalExtraCharges . ') = Taxable (' . $taxableAmount . ')',
                        'note' => 'Tax-inclusive: Using original booking total (₹4,000) as inclusive total, back-calculated base fare (₹3,389.83) and GST (₹610.17)'
                    ]);
                } else {
                    // No original total available, treat locked base fare as pre-tax
                    $grossAmount = $baseFare + $totalExtraCharges;
                    $taxableAmount = $grossAmount;
                    $taxAmount = round($taxableAmount * $gstRate, 2);
                    $finalTotal = round($grossAmount + $taxAmount, 2);
                    
                    logInvoiceError("Tax-inclusive with LOCKED base fare - no original total, treating base as pre-tax", [
                        'locked_base_fare' => $baseFare,
                        'extra_charges' => $totalExtraCharges,
                        'gross_amount' => $grossAmount,
                        'taxable_amount' => $taxableAmount,
                        'tax_amount' => $taxAmount,
                        'final_total' => $finalTotal,
                        'note' => 'No original booking total available. Treating locked base fare as pre-tax amount.'
                    ]);
                }
            } elseif ($lockedBaseFare !== null && $lockedBaseFare > 0) {
                // User-entered base is the tax-inclusive total we must honor
                $inclusiveTotal = $lockedBaseFare;
                $baseFare = $lockedBaseFare; // Display exactly what the user entered
                $preservedOriginalTotal = false;
                
                // Calculate GST from the locked base fare
                $grossAmount = $baseFare + $totalExtraCharges;
                $taxAmount = round($grossAmount * $gstRate, 2);
                $finalTotal = round($grossAmount + $taxAmount, 2);
                
                logInvoiceError("Tax-inclusive with user-entered locked base fare", [
                    'locked_base_fare' => $baseFare,
                    'extra_charges' => $totalExtraCharges,
                    'gross_amount' => $grossAmount,
                    'tax_amount' => $taxAmount,
                    'final_total' => $finalTotal
                ]);
            } elseif ($originalBookingTotal !== null) {
                $inclusiveTotal = $originalBookingTotal;
                $preservedOriginalTotal = true;
                
                $finalTotal = $inclusiveTotal;
                
                // CRITICAL: For tax-inclusive mode, the total already includes GST
                // Back-calculate: Taxable amount = Total / 1.18
                // Then: Base fare = Taxable amount - Extra charges
                // Then: GST = Total - Taxable amount
                $taxableAmount = round($inclusiveTotal / (1 + $gstRate), 2);
                $taxAmount = round($inclusiveTotal - $taxableAmount, 2);
                
                // Calculate base fare from taxable amount
                $preTaxBase = round($taxableAmount - $totalExtraCharges, 2);
                
                // Gross amount represents the pre-tax subtotal (base + extras)
                $grossAmount = $preTaxBase + $totalExtraCharges;
                
                // CRITICAL: Verify gross amount matches taxable amount
                if (abs($grossAmount - $taxableAmount) > 0.01) {
                    logInvoiceError("WARNING: Gross amount mismatch in tax-inclusive mode", [
                        'gross_amount' => $grossAmount,
                        'taxable_amount' => $taxableAmount,
                        'difference' => abs($grossAmount - $taxableAmount)
                    ]);
                    // Correct: taxable amount should equal gross amount
                    $grossAmount = $taxableAmount;
                    $preTaxBase = round($taxableAmount - $totalExtraCharges, 2);
                }
                
                // Use the pre-tax base for display (this is the base fare excluding tax)
                $baseFare = $preTaxBase;
                
                logInvoiceError("Tax-inclusive calculation (FINAL)", [
                    'inclusive_total' => $finalTotal,
                    'base_fare_display' => $baseFare,
                    'pre_tax_base' => $preTaxBase,
                    'extra_charges' => $totalExtraCharges,
                    'gross_amount_pre_tax' => $grossAmount,
                    'taxable_amount' => $taxableAmount,
                    'tax_amount' => $taxAmount,
                    'gst_rate' => $gstRate,
                    'locked_base_fare' => $lockedBaseFare,
                    'preserved_original_total' => $preservedOriginalTotal ? 'YES' : 'NO',
                    'verification' => 'Total (' . $finalTotal . ') = Taxable (' . $taxableAmount . ') + Tax (' . $taxAmount . '), Base (' . $baseFare . ') + Extra (' . $totalExtraCharges . ') = Taxable (' . $taxableAmount . ')'
                ]);
            } else {
                // No totals provided; fall back to extracting tax from the current gross amount
                $taxableAmount = round($grossAmount / (1 + $gstRate), 2);
                $taxAmount = round($taxableAmount * $gstRate, 2);
                
                $verification = round($taxableAmount + $taxAmount, 2);
                if (abs($verification - $grossAmount) > 0.01) {
                    $taxAmount = round($grossAmount - $taxableAmount, 2);
                }
                
                $finalTotal = $grossAmount;
                
                logInvoiceError("Tax-inclusive calculation (fallback)", [
                    'base_fare_entered' => $baseFare,
                    'extra_charges' => $totalExtraCharges,
                    'gross_amount' => $grossAmount,
                    'taxable_amount' => $taxableAmount,
                    'tax_amount' => $taxAmount,
                    'final_total' => $finalTotal,
                    'gst_rate' => $gstRate
                ]);
            }
        } else {
            // Tax-exclusive: Add tax on top of the gross amount
            // CRITICAL: For tax-exclusive mode, base fare should NOT include GST
            // Check if base fare already includes GST (common issue when base fare = total from inclusive mode)
            // If original booking total exists and base fare is close to it, base fare likely includes GST
            if ($originalBookingTotal !== null && $originalBookingTotal > 0) {
                $baseFareRatio = $baseFare > 0 ? ($originalBookingTotal / $baseFare) : 0;
                // If base fare is very close to original total (within 5%), it likely includes GST
                // For tax-exclusive, base should be LESS than original total (original total = base + GST)
                if (abs($baseFare - $originalBookingTotal) < ($originalBookingTotal * 0.05)) {
                    // Base fare looks like it includes GST - extract pre-GST base fare
                    // For tax-exclusive: Original Total = (Base Fare + Extra Charges) + GST
                    // Original Total = (Base Fare + Extra Charges) × 1.18
                    // Therefore: Base Fare + Extra Charges = Original Total / 1.18
                    // So: Base Fare = (Original Total / 1.18) - Extra Charges
                    $preGstSubtotal = round($originalBookingTotal / (1 + $gstRate), 2);
                    $extractedBaseFare = round($preGstSubtotal - $totalExtraCharges, 2);
                    if ($extractedBaseFare > 0 && $extractedBaseFare < $baseFare) {
                        logInvoiceError("CRITICAL: Base fare appears to include GST in tax-exclusive mode - extracting pre-GST base", [
                            'original_base_fare' => $baseFare,
                            'original_booking_total' => $originalBookingTotal,
                            'pre_gst_subtotal' => $preGstSubtotal,
                            'extracted_base_fare' => $extractedBaseFare,
                            'extra_charges' => $totalExtraCharges,
                            'calculation' => 'Base Fare = (Original Total / 1.18) - Extra Charges = (' . $originalBookingTotal . ' / 1.18) - ' . $totalExtraCharges . ' = ' . $extractedBaseFare,
                            'note' => 'Base fare was equal/close to original total - extracting pre-GST base for tax-exclusive calculation'
                        ]);
                        $baseFare = max(0, $extractedBaseFare); // Ensure non-negative
                        $grossAmount = $baseFare + $totalExtraCharges;
                    }
                }
            }
            
            // CRITICAL: Calculate GST on SUBTOTAL (gross amount), not on any other amount
            // Formula: GST = Subtotal × 0.18
            // Formula: Total = Subtotal + GST
            // DO NOT use: GST = (Subtotal × 1.18) × 0.18 (this would be wrong)
            $taxableAmount = $grossAmount; // This is the subtotal (base fare + extra charges)
            $taxAmount = round($taxableAmount * $gstRate, 2); // GST = Subtotal × 18%
            $finalTotal = round($grossAmount + $taxAmount, 2); // Total = Subtotal + GST
            
            // Verification: Ensure no circular calculation
            $verificationTax = round($grossAmount * 0.18, 2);
            if (abs($taxAmount - $verificationTax) > 0.01) {
                logInvoiceError("WARNING: Tax calculation mismatch in tax-exclusive mode", [
                    'calculated_tax' => $taxAmount,
                    'expected_tax' => $verificationTax,
                    'difference' => abs($taxAmount - $verificationTax)
                ]);
                // Correct the tax amount
                $taxAmount = $verificationTax;
                $finalTotal = round($grossAmount + $taxAmount, 2);
            }
            
            logInvoiceError("Tax-exclusive calculation (VERIFIED)", [
                'gross_amount' => $grossAmount,
                'base_fare' => $baseFare,
                'extra_charges' => $totalExtraCharges,
                'taxable_amount' => $taxableAmount,
                'tax_amount' => $taxAmount,
                'final_total' => $finalTotal,
                'gst_rate' => $gstRate,
                'formula_check' => 'GST = Subtotal × 0.18 = ' . $grossAmount . ' × 0.18 = ' . $taxAmount
            ]);
        }
    } else {
        // CRITICAL: No GST enabled (neutral state) - base fare should use original booking total
        // When GST is disabled, base fare = original booking total (₹18,814, includes GST)
        // This is the default: show full amount as base fare, not pre-GST amount
        $taxableAmount = $grossAmount;
        $taxAmount = 0;
        
        // CRITICAL: When GST is disabled, base fare should be the original booking total
        // If we have an original booking total, use it as the base fare
        // This ensures base fare shows ₹18,814 (with GST) not ₹15,944 (pre-GST)
        if ($originalBookingTotal !== null && $originalBookingTotal > 0) {
            // Use original booking total as base fare when GST is disabled
            $baseFare = $originalBookingTotal - $totalExtraCharges;
            $grossAmount = $baseFare + $totalExtraCharges;
            $finalTotal = $originalBookingTotal; // Total = original booking total
            
            logInvoiceError("GST DISABLED: Using original booking total as base fare (includes GST)", [
                'original_booking_total' => $originalBookingTotal,
                'base_fare' => $baseFare,
                'extra_charges' => $totalExtraCharges,
                'gross_amount' => $grossAmount,
                'final_total' => $finalTotal,
                'tax_amount' => $taxAmount,
                'gst_enabled' => false,
                'note' => 'When GST is disabled (neutral), base fare = original booking total (₹18,814), not pre-GST (₹15,944)'
            ]);
        } else {
            // No original booking total, use calculated base fare
            $finalTotal = $grossAmount;
            
            logInvoiceError("GST DISABLED: Using calculated base fare (no original booking total available)", [
                'base_fare' => $baseFare,
                'gross_amount' => $grossAmount,
                'final_total' => $finalTotal,
                'tax_amount' => $taxAmount,
                'gst_enabled' => false,
                'note' => 'No original booking total available, using calculated base fare'
            ]);
        }
    }
    } else {
        // Use existing values from database
        // BUT: If we have an original booking total, preserve it instead
        $grossAmount = $baseFare + $totalExtraCharges;
        $calculatedTotal = $baseFare + $totalExtraCharges + $taxAmount;
        
        if ($originalBookingTotal !== null) {
            $difference = abs($calculatedTotal - $originalBookingTotal);
            $percentDifference = $originalBookingTotal > 0 ? ($difference / $originalBookingTotal) * 100 : 0;
            
            // If there's a significant difference, preserve original total
            if ($difference > 100 || $percentDifference > 1) {
                $finalTotal = $originalBookingTotal;
                $preservedOriginalTotal = true;
                
                // If GST is enabled, recalculate tax to match
                if ($gstEnabled && $includeTax) {
                    $taxAmount = round($finalTotal - $grossAmount, 2);
                }
                
                logInvoiceError("Using existing invoice values but preserving original booking total", [
                    'existing_base_fare' => $baseFare,
                    'existing_tax_amount' => $taxAmount,
                    'calculated_total' => $calculatedTotal,
                    'original_booking_total' => $originalBookingTotal,
                    'difference' => $difference,
                    'preserved_final_total' => $finalTotal,
                    'gst_enabled' => $gstEnabled
                ]);
            } else {
                $finalTotal = $calculatedTotal;
            }
        } else {
            $finalTotal = $calculatedTotal;
        }
    }
    
    // For GST, split into CGST and SGST or use IGST
    if ($gstEnabled) {
        if ($isIGST) {
            // Interstate - Use IGST (18%)
            $igstAmount = $taxAmount;
            $igstAmount = round($igstAmount, 2); // Round to ensure consistent display
            $cgstAmount = 0;
            $sgstAmount = 0;
        } else {
            // Intrastate - Split into CGST (9%) and SGST (9%)
            // Use exact division to ensure totals match
            $halfTax = $taxAmount / 2;
            $cgstAmount = round($halfTax, 2);
            $sgstAmount = round($taxAmount - $cgstAmount, 2); // Ensure the total is exact
            $igstAmount = 0;
        }
    } else {
        $cgstAmount = 0;
        $sgstAmount = 0;
        $igstAmount = 0;
    }
    
    // Final total is already calculated correctly above based on includeTax setting
    // CRITICAL: Only preserve original booking total if GST is enabled AND tax is INCLUSIVE
    // When tax is EXCLUSIVE, we MUST use calculated total (base + tax), not original booking total
    // When GST is disabled, original booking total might include tax, so we must ignore it
    if ($originalBookingTotal !== null && $gstEnabled && $includeTax && ($lockedBaseFare === null || $lockedBaseFare <= 0)) {
        // Only preserve original booking total in tax-INCLUSIVE mode
        $difference = abs($finalTotal - $originalBookingTotal);
        $percentDifference = $originalBookingTotal > 0 ? ($difference / $originalBookingTotal) * 100 : 0;
        
        // If there's a significant difference (>₹100 or >1%), preserve original total
        if ($difference > 100 || $percentDifference > 1) {
            $finalTotal = $originalBookingTotal;
            $preservedOriginalTotal = true;
            logInvoiceError("FORCE PRESERVING original booking total (final check) - GST ENABLED, TAX INCLUSIVE", [
                'original_booking_total' => $originalBookingTotal,
                'calculated_total' => $finalTotal,
                'difference' => $difference,
                'percent_difference' => $percentDifference,
                'final_total_preserved' => $finalTotal,
                'preserved_flag' => 'TRUE',
                'gst_enabled' => $gstEnabled,
                'include_tax' => $includeTax
            ]);
        }
    } elseif ($originalBookingTotal !== null && $gstEnabled && !$includeTax) {
        // CRITICAL: When tax is EXCLUSIVE, DO NOT preserve original booking total
        // We MUST use calculated total (base + tax) = ₹22,200.52, not original ₹18,814
        logInvoiceError("GST ENABLED, TAX EXCLUSIVE: Using calculated total (base + tax), NOT preserving original booking total", [
            'original_booking_total' => $originalBookingTotal,
            'calculated_total' => $finalTotal,
            'base_fare' => $baseFare,
            'tax_amount' => $taxAmount,
            'gst_enabled' => true,
            'include_tax' => false,
            'note' => 'When tax is exclusive, total MUST be base + tax (₹22,200.52), not original booking total (₹18,814)'
        ]);
    } elseif ($originalBookingTotal !== null && !$gstEnabled) {
        // When GST is disabled, do NOT preserve original booking total
        // It might include tax from a previous GST-enabled invoice
        logInvoiceError("GST DISABLED: Ignoring original booking total to prevent tax contamination", [
            'original_booking_total' => $originalBookingTotal,
            'calculated_total' => $finalTotal,
            'gst_enabled' => false,
            'note' => 'Original booking total ignored - using calculated total (base_fare + extra_charges)'
        ]);
    }
    
    if (!isset($finalTotal)) {
        // Only calculate if not set and not preserved
        if ($gstEnabled && $includeTax) {
            // Tax-inclusive: final total = gross amount
            $finalTotal = round($grossAmount, 2);
        } else if ($gstEnabled && !$includeTax) {
            // Tax-exclusive: final total = gross amount + tax
            $finalTotal = round($grossAmount + $taxAmount, 2);
        } else {
            // No GST: final total = gross amount
            $finalTotal = round($grossAmount, 2);
        }
    } else {
        // Round the final total, but don't change it if we preserved the original
        if (!$preservedOriginalTotal || $originalBookingTotal === null) {
            $finalTotal = round($finalTotal, 2);
        }
    }
    
    // CRITICAL: NEVER recalculate base fare if lockedBaseFare was provided
    // The backout calculation should ONLY happen if:
    // 1. No locked base fare was provided
    // 2. Base fare is missing or invalid
    // 3. We're in tax-inclusive mode
    // 4. We haven't already preserved the original booking total
    if ($gstEnabled && $includeTax && ($lockedBaseFare === null || $lockedBaseFare <= 0) && $originalBookingTotal === null) {
        // Only do backout if base fare is missing or suspicious
        // AND we haven't already preserved the original booking total
        if (!isset($baseFare) || $baseFare <= 0 || (isset($finalTotal) && $baseFare > $finalTotal * 0.99)) {
            $gstRateForBackout = 0.18; // 18% GST (9% CGST + 9% SGST)
            // If baseFare is missing or suspiciously high (matches total), back out GST
            // Calculate taxable amount first (base fare + extra charges), then GST
            if (isset($finalTotal) && $finalTotal > 0) {
                $taxableAmountForBackout = round($finalTotal / (1 + $gstRateForBackout), 2);
                $taxAmount = round($finalTotal - $taxableAmountForBackout, 2);
                $baseFare = max(0, $taxableAmountForBackout - $totalExtraCharges);
                // Final total should remain the same (tax-inclusive)
                $finalTotal = $finalTotal; // Keep original total
                logInvoiceError("Backed out GST from total to get pre-GST base fare (tax-inclusive, no locked base fare)", [
                    'corrected_base_fare' => $baseFare,
                    'corrected_tax_amount' => $taxAmount,
                    'corrected_total' => $finalTotal,
                    'include_tax' => 'true',
                    'locked_base_fare_provided' => 'false'
                ]);
            }
        }
    }
    
    // FINAL CHECK: Ensure we keep the correct base fare for the current GST mode
    if (!$gstEnabled && $originalBookingTotal !== null && $originalBookingTotal > 0) {
        if ($lockedBaseFare === null || $lockedBaseFare <= 0) {
            $baseFare = $originalBookingTotal - $totalExtraCharges;
            $grossAmount = $baseFare + $totalExtraCharges;
            $finalTotal = $originalBookingTotal;
            $taxAmount = 0;
            
            logInvoiceError("Final safety check: GST DISABLED - Using original booking total as base fare", [
                'original_booking_total' => $originalBookingTotal,
                'base_fare_final' => $baseFare,
                'final_total' => $finalTotal,
                'gst_enabled' => false,
                'note' => 'When GST is disabled (neutral), base fare = original booking total (₹18,814)'
            ]);
        }
    } elseif ($lockedBaseFare !== null && $lockedBaseFare > 0 && $gstEnabled) {
        $baseFare = $lockedBaseFare;
        if ($preservedOriginalTotal && $originalBookingTotal !== null && $includeTax) {
            $grossAmount = $baseFare + $totalExtraCharges;
            $taxAmount = round($originalBookingTotal - $grossAmount, 2);
            $finalTotal = $originalBookingTotal;
        } else {
            $grossAmount = $baseFare + $totalExtraCharges;
        }
        
        logInvoiceError("Final safety check: Preserving locked base fare (GST enabled)", [
            'locked_base_fare' => $lockedBaseFare,
            'base_fare_final' => $baseFare,
            'gst_enabled' => true,
            'include_tax' => $includeTax ? 'true' : 'false',
            'preserved_original_total' => $preservedOriginalTotal ? 'YES' : 'NO',
            'final_total' => $finalTotal,
            'tax_amount' => $taxAmount
        ]);
    }
    
    // ABSOLUTE FINAL CHECK: If we have an original booking total and GST is enabled in tax-inclusive mode,
    // FORCE preserve it one more time before HTML generation
    if ($originalBookingTotal !== null && $gstEnabled && $includeTax && ($lockedBaseFare === null || $lockedBaseFare <= 0)) {
        $finalTotal = $originalBookingTotal;
        logInvoiceError("ABSOLUTE FINAL CHECK: Force preserving original booking total before HTML generation", [
            'original_booking_total' => $originalBookingTotal,
            'final_total_forced' => $finalTotal,
            'base_fare' => $baseFare,
            'tax_amount' => $taxAmount
        ]);
    }
    // Log final calculation for debugging (always log, not just when GST is enabled)
    if (!isset($calculationDone)) {
        logInvoiceError("Final calculation summary", [
            'gst_enabled' => $gstEnabled ? 'true' : 'false',
            'include_tax' => $includeTax ? 'true' : 'false',
            'toggle_state' => $gstEnabled ? ($includeTax ? 'GST_ENABLED_INCLUDE_TAX' : 'GST_ENABLED_EXCLUDE_TAX') : 'GST_DISABLED_NEUTRAL',
            'base_fare' => $baseFare,
            'extra_charges' => $totalExtraCharges,
            'gross_amount' => $grossAmount ?? ($baseFare + $totalExtraCharges),
            'taxable_amount' => $taxableAmount ?? ($baseFare + $totalExtraCharges),
            'tax_amount' => $taxAmount,
            'cgst_amount' => $cgstAmount,
            'sgst_amount' => $sgstAmount,
            'igst_amount' => $igstAmount,
            'final_total' => $finalTotal,
            'locked_base_fare' => $lockedBaseFare,
            'base_fare_preserved' => ($lockedBaseFare !== null && $lockedBaseFare > 0) ? 'YES' : 'NO',
            'note' => $gstEnabled ? 'GST calculation applied' : 'GST disabled - base fare unchanged, no tax applied'
        ]);
    }
    
    // Create HTML content for invoice
    $invoiceHtml = '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <title>Invoice #' . $invoiceNumber . ' - ' . time() . '</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; line-height: 1.6; }
        .invoice-container { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; padding: 30px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); }
        .invoice-header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
        .company-info { text-align: right; }
        .invoice-body { margin-bottom: 30px; }
        .customer-details, .invoice-summary { margin-bottom: 20px; }
        .section-title { color: #555; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 15px; }
        .trip-details { margin-bottom: 30px; }
        .fare-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .fare-table th, .fare-table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        .fare-table th { background-color: #f9f9f9; }
        .total-row { font-weight: bold; }
        .gst-details { border: 1px solid #ddd; padding: 10px; background-color: #f9f9f9; margin-bottom: 20px; }
        .gst-title { font-weight: bold; margin-bottom: 10px; }
        .footer { margin-top: 30px; text-align: center; font-size: 0.9em; color: #777; border-top: 1px solid #eee; padding-top: 20px; }
        .tax-note { font-size: 0.8em; color: #666; font-style: italic; margin-top: 5px; }
        @media print {
            body { margin: 0; padding: 0; }
            .invoice-container { box-shadow: none; border: none; padding: 20px; }
            @page { size: A4; margin: 10mm; }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div style="border: 1px solid #000; padding: 5px; margin-bottom: 15px;">
            <table width="100%" cellpadding="2" cellspacing="0">
                <tr>
                    <td width="40%" valign="top">
                        <p><strong>Seller/Service Provider:</strong></p>
                        <p><strong>VIZAG TAXI HUB</strong></p>
                        <p>44-66-22/4, Singalamma Puram, Kailasapuram,<br>
                        Visakhapatnam, Andhra Pradesh - 530024</p>' . 
                        ($gstEnabled 
                            ? '<p><strong>GSTIN: 37AATFV5320K1ZL</strong></p>
                               <p><strong>PAN: AATFV5320K</strong></p>
                               <p><strong>HSN/SAC: 996423</strong></p>'
                            : ''
                        ) . '
                    </td>
                    
                    <td width="20%" align="center" valign="top">
                        <h2>' . ($gstEnabled ? 'TAX INVOICE' : 'INVOICE') . '</h2>
                        <p>Original for Recipient</p>
                    </td>
                    
                    <td width="40%" align="right" valign="top">
                        <p><strong>Invoice #:</strong> ' . $invoiceNumber . '</p>
                        <p><strong>Date:</strong> ' . date('d M Y', strtotime($currentDate)) . '</p>
                        <p><strong>Booking #:</strong> ' . $booking['booking_number'] . '</p>
                    </td>
                </tr>
            </table>
        </div>
        
        <div style="margin-bottom: 20px;">
            <table width="100%" cellpadding="5" cellspacing="0">
                <tr>
                    <td width="50%" valign="top">
                        <h3>Customer Details</h3>
                        <p><strong>Name:</strong> ' . $booking['passenger_name'] . '</p>
                        <p><strong>Phone:</strong> ' . $booking['passenger_phone'] . '</p>
                        <p><strong>Email:</strong> ' . $booking['passenger_email'] . '</p>
                    </td>
                    
                    <td width="50%" valign="top">
                        <h3>Trip Summary</h3>
                        <p><strong>Trip Type:</strong> ' . ucfirst($booking['trip_type']) . ($booking['trip_mode'] ? ' (' . ucfirst($booking['trip_mode']) . ')' : '') . '</p>
                        <p><strong>Date:</strong> ' . date('d M Y', strtotime($booking['pickup_date'])) . '</p>
                        <p><strong>Vehicle:</strong> ' . $booking['cab_type'] . '</p>
                    </td>
                </tr>
            </table>
            
            <div class="trip-details">
                <h3 class="section-title">Trip Details</h3>
                <p><strong>Pickup:</strong> ' . $booking['pickup_location'] . '</p>
                ' . ($booking['drop_location'] ? '<p><strong>Drop:</strong> ' . $booking['drop_location'] . '</p>' : '') . '
                <p><strong>Pickup Time:</strong> ' . date('d M Y, h:i A', strtotime($booking['pickup_date'])) . '</p>
            </div>';
            

            
    if ($gstEnabled && $gstDetails) {
        $invoiceHtml .= '
            <div class="gst-details">
                <div class="gst-title">GST Details</div>
                <p><strong>GST Number:</strong> ' . htmlspecialchars($gstDetails['gstNumber']) . '</p>
                <p><strong>Company Name:</strong> ' . htmlspecialchars($gstDetails['companyName']) . '</p>
                <p><strong>Company Address:</strong> ' . htmlspecialchars($gstDetails['companyAddress']) . '</p>
            </div>';
    }
            
    // ============================================================================
    // CRITICAL: FINAL CALCULATION BEFORE HTML GENERATION
    // This MUST happen before any HTML is generated to ensure correct values
    // BUT: Skip ALL recalculation if we have existing invoice values (calculationDone is set)
    // ============================================================================
    
    // CRITICAL: If calculationDone is set, we already have locked values from existing invoice
    // DO NOT recalculate anything - just use the values we already have
    if (!isset($calculationDone)) {
        // Step 1: Ensure base fare is set correctly based on tax mode
        // CRITICAL: When tax is EXCLUSIVE, base fare should be original booking total (₹18,814)
        // When tax is INCLUSIVE, base fare should be what user entered (₹18,814, shown as base but includes tax)
        if ($lockedBaseFare !== null && $lockedBaseFare > 0) {
            if ($gstEnabled && !$includeTax && $originalBookingTotal !== null && $originalBookingTotal > 0) {
                // Tax-exclusive: Use original booking total as base fare
                $baseFare = $originalBookingTotal - $totalExtraCharges;
            } else {
                // Tax-inclusive or no original total: Use locked base fare
                $baseFare = $lockedBaseFare;
            }
        }
        
        // Step 2: If we have an original booking total and GST is enabled in tax-inclusive mode,
        // FORCE preserve it and recalculate everything else to match
        if ($originalBookingTotal !== null && $gstEnabled && $includeTax && ($lockedBaseFare === null || $lockedBaseFare <= 0)) {
        // FORCE the final total to be the original booking total
        $finalTotal = $originalBookingTotal;
        $preservedOriginalTotal = true;
        
        // CRITICAL: When tax is INCLUSIVE, the total already includes GST
        // Formula: Taxable Amount = Total / 1.18
        // Formula: Tax = Total - Taxable Amount
        // Formula: Base Fare = Taxable Amount - Extra Charges
        $gstRate = 0.18;
        $taxableAmount = round($finalTotal / (1 + $gstRate), 2);
        $taxAmount = round($finalTotal - $taxableAmount, 2);
        
        // CRITICAL: Base fare must always be taxable amount minus extra charges
        // This ensures: Base + Extra = Taxable, and Taxable + Tax = Total
        if ($lockedBaseFare === null || $lockedBaseFare <= 0) {
            // Always calculate base fare from taxable amount to ensure accuracy
            $baseFare = round($taxableAmount - $totalExtraCharges, 2);
            logInvoiceError("Final base fare calculation (tax-inclusive, no locked base fare)", [
                'final_total' => $finalTotal,
                'taxable_amount' => $taxableAmount,
                'extra_charges' => $totalExtraCharges,
                'calculated_base_fare' => $baseFare,
                'tax_amount' => $taxAmount,
                'verification' => 'Base (' . $baseFare . ') + Extra (' . $totalExtraCharges . ') = Taxable (' . $taxableAmount . '), Taxable (' . $taxableAmount . ') + Tax (' . $taxAmount . ') = Total (' . $finalTotal . ')'
            ]);
        } else {
            // Use lockedBaseFare for display (user entered this as "base fare")
            $baseFare = $lockedBaseFare;
            // Recalculate taxable amount based on locked base fare
            $taxableAmount = $baseFare + $totalExtraCharges;
            // Recalculate tax to ensure it matches
            $taxAmount = round($finalTotal - $taxableAmount, 2);
            logInvoiceError("Using locked base fare for display (tax-inclusive)", [
                'locked_base_fare' => $lockedBaseFare,
                'taxable_amount' => $taxableAmount,
                'extra_charges' => $totalExtraCharges,
                'tax_amount' => $taxAmount,
                'final_total' => $finalTotal
            ]);
        }
        $grossAmount = $baseFare + $totalExtraCharges;
        
        // CRITICAL: Verify gross amount equals taxable amount
        if (abs($grossAmount - $taxableAmount) > 0.01) {
            logInvoiceError("WARNING: Gross amount mismatch in tax-inclusive final check", [
                'gross_amount' => $grossAmount,
                'taxable_amount' => $taxableAmount,
                'difference' => abs($grossAmount - $taxableAmount)
            ]);
            // Correct: taxable amount should equal gross amount
            $taxableAmount = $grossAmount;
            $taxAmount = round($finalTotal - $taxableAmount, 2);
        }
        
        // CRITICAL: Verify gross amount matches taxable amount (should be equal)
        if (abs($grossAmount - $taxableAmount) > 0.01) {
            logInvoiceError("WARNING: Gross amount mismatch - correcting base fare", [
                'gross_amount' => $grossAmount,
                'taxable_amount' => $taxableAmount,
                'difference' => abs($grossAmount - $taxableAmount),
                'base_fare_before' => $baseFare,
                'extra_charges' => $totalExtraCharges
            ]);
            // Force correct base fare: taxable amount - extra charges
            $baseFare = round($taxableAmount - $totalExtraCharges, 2);
            $grossAmount = $baseFare + $totalExtraCharges;
            logInvoiceError("Corrected base fare to ensure gross = taxable", [
                'corrected_base_fare' => $baseFare,
                'corrected_gross_amount' => $grossAmount,
                'taxable_amount' => $taxableAmount,
                'match' => abs($grossAmount - $taxableAmount) < 0.01 ? 'YES' : 'NO'
            ]);
        }
        
        // Recalculate CGST/SGST or IGST based on the new tax amount
        if ($isIGST) {
            $igstAmount = $taxAmount;
            $cgstAmount = 0;
            $sgstAmount = 0;
        } else {
            $halfTax = $taxAmount / 2;
            $cgstAmount = round($halfTax, 2);
            $sgstAmount = round($taxAmount - $cgstAmount, 2);
            $igstAmount = 0;
        }
        
        logInvoiceError("BEFORE HTML: Force preserving original booking total (tax-inclusive, back-calculated)", [
            'original_booking_total' => $originalBookingTotal,
            'final_total_set' => $finalTotal,
            'taxable_amount' => $taxableAmount,
            'display_base_fare' => $baseFare,
            'gross_amount' => $grossAmount,
            'tax_amount' => $taxAmount,
            'cgst_amount' => $cgstAmount,
            'sgst_amount' => $sgstAmount,
            'verification' => 'Total (' . $finalTotal . ') = Base Fare (' . $baseFare . ') includes tax',
            'calculation_method' => 'Tax back-calculated from total (tax-inclusive mode)'
        ]);
    } elseif ($originalBookingTotal !== null && $gstEnabled && !$includeTax && !isset($calculationDone)) {
        // CRITICAL: When tax is EXCLUSIVE, ensure base fare is original booking total
        // NOT the calculated total. Base fare should be ₹18,814, total should be ₹22,200.52
        // BUT: Skip if we have existing invoice values (calculationDone is set)
        $expectedBaseFare = $originalBookingTotal - $totalExtraCharges;
        if (abs($baseFare - $expectedBaseFare) > 0.01) {
            $baseFare = $expectedBaseFare;
            $grossAmount = $baseFare + $totalExtraCharges;
            // Recalculate tax and total
            $taxAmount = round($grossAmount * 0.18, 2);
            $finalTotal = round($grossAmount + $taxAmount, 2);
            
            // Recalculate CGST/SGST or IGST
            if ($isIGST) {
                $igstAmount = $taxAmount;
                $cgstAmount = 0;
                $sgstAmount = 0;
            } else {
                $halfTax = $taxAmount / 2;
                $cgstAmount = round($halfTax, 2);
                $sgstAmount = round($taxAmount - $cgstAmount, 2);
                $igstAmount = 0;
            }
            
            logInvoiceError("BEFORE HTML: Tax-exclusive mode - ensuring base fare is original booking total", [
                'original_booking_total' => $originalBookingTotal,
                'expected_base_fare' => $expectedBaseFare,
                'previous_base_fare' => $baseFare,
                'base_fare_set' => $baseFare,
                'gross_amount' => $grossAmount,
                'tax_amount' => $taxAmount,
                'final_total' => $finalTotal,
                'verification' => 'Base (' . $baseFare . ') + Extra (' . $totalExtraCharges . ') + Tax (' . $taxAmount . ') = Total (' . $finalTotal . ')'
            ]);
        }
    } // End of elseif for tax-exclusive
    } // End of if (!isset($calculationDone)) block
    } // END LEGACY GST BLOCK
        
    // If calculationDone is set, log that we're using existing invoice values
    if (isset($calculationDone)) {
        logInvoiceError("Using existing invoice values - skipping all recalculation", [
            'base_fare' => $baseFare,
            'tax_amount' => $taxAmount,
            'final_total' => $finalTotal,
            'gross_amount' => $grossAmount ?? ($baseFare + $totalExtraCharges),
            'extra_charges' => $totalExtraCharges
        ]);
    }
    
    // FINAL VERIFICATION: Ensure base fare is correct before HTML generation
    // CRITICAL: Only recalculate if no existing invoice and no locked base fare
    // If invoice exists, base fare is already locked and should not be recalculated
    if ($gstEnabled && $includeTax && ($lockedBaseFare === null || $lockedBaseFare <= 0) && !isset($calculationDone)) {
        // Only verify/correct if we don't have an existing invoice (calculationDone would be set)
        $expectedTaxableAmount = round($finalTotal / 1.18, 2);
        $expectedBaseFare = round($expectedTaxableAmount - $totalExtraCharges, 2);
        
        // If base fare doesn't match expected, correct it (only for new invoices)
        if (abs($baseFare - $expectedBaseFare) > 0.01) {
            logInvoiceError("FINAL CORRECTION: Base fare mismatch detected, correcting (new invoice only)", [
                'current_base_fare' => $baseFare,
                'expected_base_fare' => $expectedBaseFare,
                'difference' => abs($baseFare - $expectedBaseFare),
                'final_total' => $finalTotal,
                'extra_charges' => $totalExtraCharges,
                'expected_taxable_amount' => $expectedTaxableAmount,
                'calculation_done' => isset($calculationDone) ? 'YES' : 'NO'
            ]);
            
            // Only correct if this is a new invoice (not an existing one)
            if (!isset($calculationDone)) {
                $baseFare = $expectedBaseFare;
                $grossAmount = $baseFare + $totalExtraCharges;
                
                // Recalculate tax to ensure it matches
                $taxAmount = round($finalTotal - $grossAmount, 2);
                
                // Recalculate CGST/SGST or IGST
                if ($isIGST) {
                    $igstAmount = $taxAmount;
                    $cgstAmount = 0;
                    $sgstAmount = 0;
                } else {
                    $halfTax = $taxAmount / 2;
                    $cgstAmount = round($halfTax, 2);
                    $sgstAmount = round($taxAmount - $cgstAmount, 2);
                    $igstAmount = 0;
                }
                
                logInvoiceError("FINAL CORRECTION: Base fare corrected (new invoice)", [
                    'corrected_base_fare' => $baseFare,
                    'corrected_gross_amount' => $grossAmount,
                    'corrected_tax_amount' => $taxAmount,
                    'verification' => 'Base (' . $baseFare . ') + Extra (' . $totalExtraCharges . ') + Tax (' . $taxAmount . ') = Total (' . $finalTotal . ')'
                ]);
            } else {
                logInvoiceError("Skipping base fare correction - existing invoice values preserved", [
                    'current_base_fare' => $baseFare,
                    'expected_base_fare' => $expectedBaseFare
                ]);
            }
        }
    }
    
    // CRITICAL: Labels should clearly indicate GST inclusion/exclusion
    // For tax-inclusive: Base fare is excluding GST
    // For tax-exclusive: Base fare is excluding GST
    $baseFareLabel = 'Base Fare';
    if ($gstEnabled) {
        $baseFareLabel .= ' (excluding GST)';
    }
    
    // CRITICAL: Calculate GST breakdown correctly for both tax-inclusive and tax-exclusive
    // For tax-exclusive: GST = (Base + Extra) × 18%
    // For tax-inclusive: GST is already calculated in $taxAmount, we need to split it proportionally
    $gstOnBaseFare = 0;
    $totalGstOnExtraCharges = 0;
    $gstRate = $gstEnabled ? 0.18 : 0;
    
    if ($gstEnabled) {
        if ($includeTax) {
            // TAX-INCLUSIVE: GST is already in $taxAmount
            // CRITICAL: For tax-inclusive, taxable amount = Total / 1.18 (not base + extra)
            // The base fare shown should be pre-tax, so taxable amount = base + extra
            // But we need to ensure base fare is the pre-tax amount, not the total
            if ($originalBookingTotal !== null && $originalBookingTotal > 0) {
                // Use original booking total to calculate correct taxable amount
                $correctTaxableAmount = round($originalBookingTotal / 1.18, 2);
                // Base fare should be taxable amount minus extra charges
                $correctBaseFare = round($correctTaxableAmount - $totalExtraCharges, 2);
                
                // Use correct base fare for GST split calculation
                $baseFareForGstSplit = $correctBaseFare;
                $taxableAmountForGst = $correctTaxableAmount;
            } else {
                // No original total, use current base fare (should already be pre-tax)
                $baseFareForGstSplit = $baseFare;
                $taxableAmountForGst = $baseFare + $totalExtraCharges;
            }
            
            // Split GST proportionally: GST on base = (base / taxable) × total GST
            if ($taxableAmountForGst > 0) {
                $gstOnBaseFare = round(($baseFareForGstSplit / $taxableAmountForGst) * $taxAmount, 2);
                $totalGstOnExtraCharges = round($taxAmount - $gstOnBaseFare, 2);
            } else {
                $gstOnBaseFare = $taxAmount;
                $totalGstOnExtraCharges = 0;
            }
            
            logInvoiceError("TAX-INCLUSIVE: GST split calculation", [
                'base_fare_for_display' => $baseFare,
                'base_fare_for_gst_split' => $baseFareForGstSplit,
                'extra_charges' => $totalExtraCharges,
                'taxable_amount_for_gst' => $taxableAmountForGst,
                'total_tax_amount' => $taxAmount,
                'gst_on_base_fare' => $gstOnBaseFare,
                'gst_on_extra_charges' => $totalGstOnExtraCharges,
                'original_booking_total' => $originalBookingTotal,
                'verification' => 'GST on base (' . $gstOnBaseFare . ') + GST on extra (' . $totalGstOnExtraCharges . ') = Total GST (' . $taxAmount . ')'
            ]);
        } else {
            // TAX-EXCLUSIVE: Calculate GST directly on base and extra charges
            $gstOnBaseFare = round($baseFare * $gstRate, 2);
            
            // Calculate GST on each extra charge
            if (!empty($extraChargesArr)) {
                foreach ($extraChargesArr as $charge) {
                    if (isset($charge['amount'])) {
                        $chargeAmount = (float)$charge['amount'];
                        $totalGstOnExtraCharges += round($chargeAmount * $gstRate, 2);
                    }
                }
            }
            
            logInvoiceError("TAX-EXCLUSIVE: GST calculation", [
                'base_fare' => $baseFare,
                'gst_rate' => $gstRate,
                'gst_on_base_fare' => $gstOnBaseFare,
                'extra_charges' => $totalExtraCharges,
                'gst_on_extra_charges' => $totalGstOnExtraCharges,
                'calculated_total_gst' => $gstOnBaseFare + $totalGstOnExtraCharges,
                'expected_tax_amount' => $taxAmount
            ]);
        }
        
        // Verify total GST matches expected tax amount
        $calculatedTotalGst = $gstOnBaseFare + $totalGstOnExtraCharges;
        if (abs($calculatedTotalGst - $taxAmount) > 0.01) {
            logInvoiceError("GST calculation mismatch - adjusting to match expected tax amount", [
                'gst_on_base_fare' => $gstOnBaseFare,
                'gst_on_extra_charges' => $totalGstOnExtraCharges,
                'calculated_total_gst' => $calculatedTotalGst,
                'expected_tax_amount' => $taxAmount,
                'difference' => abs($calculatedTotalGst - $taxAmount),
                'mode' => $includeTax ? 'TAX-INCLUSIVE' : 'TAX-EXCLUSIVE'
            ]);
            // Adjust to match expected tax amount proportionally
            if ($calculatedTotalGst > 0) {
                $adjustmentFactor = $taxAmount / $calculatedTotalGst;
                $gstOnBaseFare = round($gstOnBaseFare * $adjustmentFactor, 2);
                $totalGstOnExtraCharges = round($taxAmount - $gstOnBaseFare, 2);
            } else {
                $gstOnBaseFare = $taxAmount;
                $totalGstOnExtraCharges = 0;
            }
        }
    }
    
    // CRITICAL FINAL VERIFICATION: Before HTML generation, ensure base fare is correct for tax-inclusive mode
    // If we have an existing invoice and tax is inclusive, base fare should be back-calculated from original booking total
    // This ensures the HTML shows the correct pre-tax base fare, not the locked value from database
    if ($gstEnabled && $includeTax) {
        // Get the total amount to use for back-calculation
        $totalToVerify = $originalBookingTotal;
        if ($totalToVerify === null || $totalToVerify <= 0) {
            // Fallback to finalTotal if original booking total not available
            $totalToVerify = $finalTotal;
        }
        
        if ($totalToVerify !== null && $totalToVerify > 0) {
            // Calculate expected pre-tax base fare from total amount
            // Formula: Taxable Amount = Total / (1 + GST Rate)
            // Base Fare = Taxable Amount - Extra Charges
            $expectedTaxableAmount = round($totalToVerify / (1 + $gstRate), 2);
            $expectedBaseFare = round($expectedTaxableAmount - $totalExtraCharges, 2);
            
            // CRITICAL: Check if base fare equals or is very close to total (this is wrong!)
            // In GST-inclusive mode, base fare should be pre-tax, so it should be LESS than total
            $baseFareEqualsTotal = abs($baseFare - $totalToVerify) < 0.01;
            
            // Also check if base fare matches expected pre-tax value
            $baseFareIsCorrect = abs($baseFare - $expectedBaseFare) < 0.01;
            
            // Base fare is wrong if:
            // 1. Base fare equals total (should be less)
            // 2. Base fare doesn't match expected pre-tax value
            $isBaseFareWrong = $baseFareEqualsTotal || !$baseFareIsCorrect;
            
            if ($isBaseFareWrong) {
                logInvoiceError("CRITICAL: Base fare is wrong for tax-inclusive mode - correcting before HTML generation", [
                    'current_base_fare' => $baseFare,
                    'expected_base_fare' => $expectedBaseFare,
                    'total_to_verify' => $totalToVerify,
                    'original_booking_total' => $originalBookingTotal,
                    'expected_taxable_amount' => $expectedTaxableAmount,
                    'current_tax_amount' => $taxAmount,
                    'base_fare_equals_total' => $baseFareEqualsTotal ? 'YES' : 'NO',
                    'base_fare_is_correct' => $baseFareIsCorrect ? 'YES' : 'NO',
                    'difference' => abs($baseFare - $expectedBaseFare),
                    'calculation_done' => isset($calculationDone) && $calculationDone ? 'YES' : 'NO',
                    'formula_applied' => 'Base Fare = (Total / 1.18) - Extra Charges',
                    'note' => 'GST-inclusive mode: Base fare must be back-calculated from total. Current value is wrong.'
                ]);
                
                // Correct base fare for HTML display (this is the pre-tax amount)
                // #region agent log
                $logPath = __DIR__ . '/../../../../../.cursor/debug.log';
                $logEntry = json_encode([
                    'id' => 'log_' . time() . '_overwrite_base',
                    'timestamp' => round(microtime(true) * 1000),
                    'location' => 'generate-invoice.php:1878',
                    'message' => 'OVERWRITE: Base fare corrected for tax-inclusive',
                    'data' => [
                        'old_baseFare' => $baseFare,
                        'new_baseFare' => $expectedBaseFare,
                        'old_taxAmount' => $taxAmount,
                        'old_finalTotal' => $finalTotal,
                        'totalToVerify' => $totalToVerify,
                        'expectedTaxableAmount' => $expectedTaxableAmount
                    ],
                    'sessionId' => 'debug-session',
                    'runId' => 'run1',
                    'hypothesisId' => 'F'
                ]) . "\n";
                @file_put_contents($logPath, $logEntry, FILE_APPEND);
                // #endregion
                $baseFare = $expectedBaseFare;
                $grossAmount = $baseFare + $totalExtraCharges;
                
                // Recalculate tax to match total amount
                $taxAmount = round($totalToVerify - $expectedTaxableAmount, 2);
                
                // Update finalTotal to ensure consistency
                $finalTotal = $totalToVerify;
                
                // Recalculate CGST/SGST or IGST
                if ($isIGST) {
                    $igstAmount = $taxAmount;
                    $cgstAmount = 0;
                    $sgstAmount = 0;
                } else {
                    $halfTax = $taxAmount / 2;
                    $cgstAmount = round($halfTax, 2);
                    $sgstAmount = round($taxAmount - $cgstAmount, 2);
                    $igstAmount = 0;
                }
                
                logInvoiceError("Base fare corrected for tax-inclusive HTML display", [
                    'corrected_base_fare' => $baseFare,
                    'corrected_tax_amount' => $taxAmount,
                    'cgst_amount' => $cgstAmount,
                    'sgst_amount' => $sgstAmount,
                    'final_total' => $finalTotal,
                    'verification' => 'Base (' . $baseFare . ') + Extra (' . $totalExtraCharges . ') + Tax (' . $taxAmount . ') = ' . ($baseFare + $totalExtraCharges + $taxAmount) . ', Expected: ' . $totalToVerify
                ]);
            }
        }
    }
    
    // FINAL VERIFICATION: Log the exact value being used in HTML
    logInvoiceError("HTML generation: Final values (DEEP DEBUG)", [
        'base_fare' => $baseFare,
        'base_fare_label' => $baseFareLabel,
        'locked_base_fare' => $lockedBaseFare,
        'base_fare_formatted' => number_format($baseFare, 2),
        'final_total' => $finalTotal,
        'final_total_formatted' => number_format($finalTotal, 2),
        'tax_amount' => $taxAmount,
        'gst_on_base_fare' => $gstOnBaseFare,
        'gst_on_extra_charges' => $totalGstOnExtraCharges,
        'extra_charges' => $totalExtraCharges,
        'gross_amount' => $grossAmount ?? ($baseFare + $totalExtraCharges),
        'original_booking_total' => $originalBookingTotal,
        'preserved_original' => $preservedOriginalTotal ? 'YES' : 'NO',
        'include_tax' => $includeTax ? 'true' : 'false',
        'gst_enabled' => $gstEnabled ? 'true' : 'false',
        'calculation_mode' => $gstEnabled ? ($includeTax ? 'TAX-INCLUSIVE' : 'TAX-EXCLUSIVE') : 'NO-GST',
        'calculation_done' => isset($calculationDone) && $calculationDone ? 'YES' : 'NO',
        'verification' => 'Base (' . $baseFare . ') + Extra (' . $totalExtraCharges . ') + Tax (' . $taxAmount . ') = ' . ($baseFare + $totalExtraCharges + $taxAmount) . ', Expected Total: ' . $finalTotal
    ]);
    
    // #region agent log
    $workspaceRoot = dirname(dirname(dirname(dirname(dirname(__DIR__)))));
    $logPath = $workspaceRoot . DIRECTORY_SEPARATOR . '.cursor' . DIRECTORY_SEPARATOR . 'debug.log';
    $logDir = dirname($logPath);
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0755, true);
    }
    $logEntry = json_encode([
        'id' => 'log_' . time() . '_before_html',
        'timestamp' => round(microtime(true) * 1000),
        'location' => 'generate-invoice.php:1836',
        'message' => 'Values BEFORE HTML generation (summary & breakdown)',
        'data' => [
            'baseFare' => $baseFare,
            'extraCharges' => $totalExtraCharges,
            'taxAmount' => $taxAmount,
            'cgstAmount' => $cgstAmount,
            'sgstAmount' => $sgstAmount,
            'finalTotal' => $finalTotal,
            'gstEnabled' => $gstEnabled,
            'includeTax' => $includeTax,
            'expectedGstRate' => $gstEnabled ? 0.18 : 0,
            'calculatedGstFromTaxable' => $gstEnabled ? round(($baseFare + $totalExtraCharges) * 0.18, 2) : 0,
            'cgstPlusSgst' => $cgstAmount + $sgstAmount,
            'verification_sum' => $baseFare + $totalExtraCharges + $taxAmount,
            'verification_cgst_sgst' => $cgstAmount + $sgstAmount
        ],
        'sessionId' => 'debug-session',
        'runId' => 'run1',
        'hypothesisId' => 'C'
    ]) . "\n";
    @file_put_contents($logPath, $logEntry, FILE_APPEND);
    // #endregion
    
    $invoiceHtml .= '
            <h3 class="section-title">Fare Breakdown</h3>
            <table class="fare-table">
                <tr>
                    <th>Description</th>
                    <th style="text-align: right;">Amount</th>
                </tr>';
    
    // CRITICAL: Different ordering based on tax inclusion mode
    // Tax-inclusive: Show Total first, then breakdown
    // Tax-exclusive: Show breakdown first, then Total
    if ($gstEnabled && $includeTax) {
        // Tax-inclusive: Total first, then base fare, then GST
        $totalLabel = 'Total Amount (including GST)';
        $invoiceHtml .= '
                <tr class="total-row">
                    <td><strong>' . $totalLabel . '</strong></td>
                    <td style="text-align: right;"><strong>₹ ' . number_format($finalTotal, 2) . '</strong></td>
                </tr>
                <tr>
                    <td>' . $baseFareLabel . '</td>
                    <td style="text-align: right;">₹ ' . number_format($baseFare, 2) . '</td>
                </tr>';
    } else {
        // Tax-exclusive or GST disabled: Base fare first
        $invoiceHtml .= '
                <tr>
                    <td>' . $baseFareLabel . '</td>
                    <td style="text-align: right;">₹ ' . number_format($baseFare, 2) . '</td>
                </tr>';
    }
    // Add extra charges as line items
    if (!empty($extraChargesArr)) {
        foreach ($extraChargesArr as $charge) {
            if ((isset($charge['label']) && $charge['label'] !== '') && isset($charge['amount'])) {
                $invoiceHtml .= '\n                <tr>\n                    <td>' . htmlspecialchars($charge['label']) . '</td>\n                    <td style="text-align: right;">₹ ' . number_format((float)$charge['amount'], 2) . '</td>\n                </tr>';
            }
        }
    } else {
        $invoiceHtml .= '\n                <tr>\n                    <td colspan="2" style="text-align:center; color:#888;">No extra charges</td>\n                </tr>';
    }
    
    // Display GST as a single line "GST @ 18%" (simplified format)
    if ($gstEnabled && $taxAmount > 0) {
        $gstLabel = 'GST @ 18%';
        // #region agent log
        $logPath = __DIR__ . '/../../../../.cursor/debug.log';
        $logEntry = json_encode([
            'id' => 'log_' . time() . '_breakdown_gst',
            'timestamp' => round(microtime(true) * 1000),
            'location' => 'generate-invoice.php:1900',
            'message' => 'Breakdown section: GST line item',
            'data' => [
                'gstLabel' => $gstLabel,
                'taxAmount' => $taxAmount,
                'cgstAmount' => $cgstAmount,
                'sgstAmount' => $sgstAmount,
                'cgstPlusSgst' => $cgstAmount + $sgstAmount,
                'baseFare' => $baseFare,
                'extraCharges' => $totalExtraCharges,
                'taxableAmount' => $baseFare + $totalExtraCharges,
                'expectedGst' => round(($baseFare + $totalExtraCharges) * 0.18, 2)
            ],
            'sessionId' => 'debug-session',
            'runId' => 'run1',
            'hypothesisId' => 'D'
        ]) . "\n";
        @file_put_contents($logPath, $logEntry, FILE_APPEND);
        // #endregion
        $invoiceHtml .= '
                <tr>
                    <td>' . $gstLabel . '</td>
                    <td style="text-align: right;">₹ ' . number_format($taxAmount, 2) . '</td>
                </tr>';
    }
    
    // ABSOLUTE FINAL CHECK: Right before inserting finalTotal into HTML
    // This is the last chance to ensure the correct value is used
    // CRITICAL: Only preserve original booking total if GST is enabled AND tax is INCLUSIVE
    // When tax is EXCLUSIVE, we MUST use calculated total (base + tax), not original booking total
    // When GST is disabled, original booking total might include tax, so we must ignore it
    // CRITICAL: Do NOT recalculate if we already have existing invoice values ($calculationDone is set)
    if ($originalBookingTotal !== null && $gstEnabled && $includeTax && ($lockedBaseFare === null || $lockedBaseFare <= 0) && !isset($calculationDone)) {
        // Only preserve original booking total in tax-INCLUSIVE mode
        // AND only if we don't have existing invoice values (calculationDone would be set)
        $difference = abs($finalTotal - $originalBookingTotal);
        $percentDifference = $originalBookingTotal > 0 ? ($difference / $originalBookingTotal) * 100 : 0;
        
        // If there's a significant difference, use the original total
        if ($difference > 100 || $percentDifference > 1) {
            $finalTotal = $originalBookingTotal;
            
            // CRITICAL: When tax is INCLUSIVE, back-calculate tax from total
            // Formula: Taxable Amount = Total / 1.18
            // Formula: Tax = Total - Taxable Amount
            $gstRate = 0.18;
            $taxableAmount = round($finalTotal / (1 + $gstRate), 2);
            $taxAmount = round($finalTotal - $taxableAmount, 2);
            // Base fare should be the taxable amount minus extra charges
            // But if lockedBaseFare was provided, keep it for display
            if ($lockedBaseFare === null || $lockedBaseFare <= 0) {
                $baseFare = round($taxableAmount - $totalExtraCharges, 2);
            }
            $grossAmount = $baseFare + $totalExtraCharges;
            
            // Recalculate CGST/SGST or IGST
            if ($isIGST) {
                $igstAmount = $taxAmount;
                $cgstAmount = 0;
                $sgstAmount = 0;
            } else {
                $halfTax = $taxAmount / 2;
                $cgstAmount = round($halfTax, 2);
                $sgstAmount = round($taxAmount - $cgstAmount, 2);
                $igstAmount = 0;
            }
            
            logInvoiceError("ABSOLUTE FINAL CHECK: Right before HTML total line - FORCING original total (GST ENABLED, TAX INCLUSIVE)", [
                'original_booking_total' => $originalBookingTotal,
                'calculated_total' => $finalTotal,
                'difference' => $difference,
                'percent_difference' => $percentDifference,
                'final_total_used_in_html' => $finalTotal,
                'base_fare' => $baseFare,
                'tax_amount' => $taxAmount,
                'gst_enabled' => $gstEnabled,
                'include_tax' => $includeTax
            ]);
        }
    } elseif ($originalBookingTotal !== null && $gstEnabled && !$includeTax) {
        // CRITICAL: When tax is EXCLUSIVE, DO NOT preserve original booking total
        // We MUST use calculated total (base + tax) = ₹22,200.52
        logInvoiceError("ABSOLUTE FINAL CHECK: GST ENABLED, TAX EXCLUSIVE - Using calculated total (base + tax), NOT original booking total", [
            'original_booking_total' => $originalBookingTotal,
            'calculated_total' => $finalTotal,
            'base_fare' => $baseFare,
            'tax_amount' => $taxAmount,
            'gst_enabled' => true,
            'include_tax' => false,
            'note' => 'When tax is exclusive, total MUST be base + tax (₹22,200.52), not original booking total (₹18,814)'
        ]);
    } elseif ($originalBookingTotal !== null && !$gstEnabled) {
        // When GST is disabled, do NOT preserve original booking total
        logInvoiceError("ABSOLUTE FINAL CHECK: GST DISABLED - Using calculated total, ignoring original booking total", [
            'original_booking_total' => $originalBookingTotal,
            'calculated_total' => $finalTotal,
            'gst_enabled' => false,
            'note' => 'Original booking total ignored - using calculated total (base_fare + extra_charges)'
        ]);
    }
    
    // CRITICAL VALIDATION: Ensure finalTotal is correct before generating HTML
    // For GST-exclusive: Total MUST be Base + Extra + Tax
    // For GST-inclusive: Total should be the original booking total (inclusive total), not calculated
    // CRITICAL: finalTotal should NEVER equal baseFare when GST is enabled
    if ($gstEnabled) {
        if ($includeTax) {
            // GST-INCLUSIVE MODE: Total should be the original booking total (₹18,814)
            // Base fare is pre-tax (₹15,944.07), so Base + Extra + Tax should equal original total
            // CRITICAL: Use original booking total as final total, don't recalculate
            
            // Double-check: finalTotal should NOT equal baseFare when there's tax
            if ($taxAmount > 0.01 && abs($finalTotal - $baseFare) < 0.01) {
                // finalTotal equals baseFare - this is wrong for GST-inclusive
                // Use original booking total if available, otherwise calculate sum
                if ($originalBookingTotal !== null && $originalBookingTotal > 0) {
                    $finalTotal = $originalBookingTotal;
                    logInvoiceError("CRITICAL ERROR: finalTotal was equal to baseFare - corrected to original booking total", [
                        'previous_final_total' => $finalTotal,
                        'base_fare' => $baseFare,
                        'original_booking_total' => $originalBookingTotal,
                        'corrected_final_total' => $finalTotal,
                        'note' => 'For GST-inclusive, using original booking total as final total'
                    ]);
                } else {
                    // No original total - calculate sum
                    $finalTotal = $baseFare + $totalExtraCharges + $taxAmount;
                    logInvoiceError("CRITICAL ERROR: finalTotal was equal to baseFare - corrected to calculated sum", [
                        'base_fare' => $baseFare,
                        'tax_amount' => $taxAmount,
                        'corrected_final_total' => $finalTotal
                    ]);
                }
            } elseif ($originalBookingTotal !== null && $originalBookingTotal > 0) {
                // Verify finalTotal matches original booking total for GST-inclusive
                // Allow small rounding differences (0.01)
                if (abs($finalTotal - $originalBookingTotal) > 0.01) {
                    // finalTotal doesn't match original - correct it
                    $finalTotal = $originalBookingTotal;
                    logInvoiceError("CRITICAL: Corrected finalTotal to match original booking total for GST-inclusive mode", [
                        'previous_final_total' => $finalTotal,
                        'original_booking_total' => $originalBookingTotal,
                        'corrected_final_total' => $finalTotal,
                        'base_fare' => $baseFare,
                        'tax_amount' => $taxAmount,
                        'note' => 'For GST-inclusive, final total must match original booking total'
                    ]);
                }
                
                // Verify the math: Base + Extra + Tax should approximately equal original total
                $calculatedSum = $baseFare + $totalExtraCharges + $taxAmount;
                if (abs($calculatedSum - $originalBookingTotal) > 0.01) {
                    logInvoiceError("WARNING: Math check for GST-inclusive - values don't sum correctly", [
                        'original_booking_total' => $originalBookingTotal,
                        'base_fare' => $baseFare,
                        'extra_charges' => $totalExtraCharges,
                        'tax_amount' => $taxAmount,
                        'calculated_sum' => $calculatedSum,
                        'difference' => abs($calculatedSum - $originalBookingTotal)
                    ]);
                }
            }
        } else {
            // GST-EXCLUSIVE MODE: Total MUST be Base + Extra + Tax
            $expectedTotal = $baseFare + $totalExtraCharges + $taxAmount;
            // Allow small rounding differences (0.01)
            if (abs($finalTotal - $expectedTotal) > 0.01) {
                // finalTotal is wrong - correct it
                $finalTotal = $expectedTotal;
                logInvoiceError("CRITICAL: Corrected finalTotal for GST-exclusive mode", [
                    'previous_final_total' => $finalTotal,
                    'corrected_final_total' => $expectedTotal,
                    'base_fare' => $baseFare,
                    'extra_charges' => $totalExtraCharges,
                    'tax_amount' => $taxAmount,
                    'calculation' => 'Total = Base (' . $baseFare . ') + Extra (' . $totalExtraCharges . ') + Tax (' . $taxAmount . ') = ' . $expectedTotal
                ]);
            }
            
            // Double-check: finalTotal should NOT equal baseFare when there's tax
            if ($taxAmount > 0.01 && abs($finalTotal - $baseFare) < 0.01) {
                // This is definitely wrong - recalculate
                $finalTotal = $baseFare + $totalExtraCharges + $taxAmount;
                logInvoiceError("CRITICAL ERROR: finalTotal was equal to baseFare in GST-exclusive mode - corrected", [
                    'base_fare' => $baseFare,
                    'tax_amount' => $taxAmount,
                    'corrected_final_total' => $finalTotal
                ]);
            }
        }
    } else {
        // No GST: Total should be Base + Extra
        $expectedTotal = $baseFare + $totalExtraCharges;
        if (abs($finalTotal - $expectedTotal) > 0.01) {
            $finalTotal = $expectedTotal;
        }
    }
    
    // Generate the total row - only for tax-exclusive mode (tax-inclusive shows total first)
    // For tax-inclusive, total was already shown at the beginning
    if (!($gstEnabled && $includeTax)) {
        $totalLabel = $gstEnabled 
            ? 'Total Amount (including GST)'  // Tax-exclusive: GST is added on top
            : 'Total Amount';
        // #region agent log
        $logPath = __DIR__ . '/../../../../.cursor/debug.log';
        $logEntry = json_encode([
            'id' => 'log_' . time() . '_breakdown_total',
            'timestamp' => round(microtime(true) * 1000),
            'location' => 'generate-invoice.php:2083',
            'message' => 'Breakdown section: Total row',
            'data' => [
                'totalLabel' => $totalLabel,
                'finalTotal' => $finalTotal,
                'baseFare' => $baseFare,
                'extraCharges' => $totalExtraCharges,
                'taxAmount' => $taxAmount,
                'calculatedSum' => $baseFare + $totalExtraCharges + $taxAmount,
                'originalBookingTotal' => $originalBookingTotal
            ],
            'sessionId' => 'debug-session',
            'runId' => 'run1',
            'hypothesisId' => 'E'
        ]) . "\n";
        @file_put_contents($logPath, $logEntry, FILE_APPEND);
        // #endregion
        $invoiceHtml .= '
                <tr class="total-row">
                    <td><strong>' . $totalLabel . '</strong></td>
                    <td style="text-align: right;"><strong>₹ ' . number_format($finalTotal, 2) . '</strong></td>
                </tr>';
        
        logInvoiceError("Generating total row HTML (tax-exclusive)", [
            'final_total' => $finalTotal,
            'final_total_formatted' => number_format($finalTotal, 2),
            'original_booking_total' => $originalBookingTotal
        ]);
    }
    
    $invoiceHtml .= '
            </table>';
            
    if (!$includeTax && $gstEnabled) {
        $invoiceHtml .= '
            <p class="tax-note">Note: This invoice shows base amounts excluding tax. Taxes will be charged separately.</p>';
    }
            
    $invoiceHtml .= '
        </div>
        
        <div class="footer">
            <p>Thank you for choosing Vizag Taxi Hub.</p>
            <p>For any questions regarding this invoice, please contact support@vizagtaxihub.com</p>
            <p style="font-size: 10px; color: #999; margin-top: 20px;">Generated on: ' . date('Y-m-d H:i:s') . ' (Timestamp: ' . time() . ')</p>
        </div>
    </div>
</body>
</html>';

    // CRITICAL FINAL CHECK: Before sending response, ensure original total is preserved ONLY if GST is enabled AND tax is INCLUSIVE
    // When tax is EXCLUSIVE, we MUST use calculated total (base + tax), not original booking total
    // When GST is disabled, do NOT preserve original booking total (it might include tax)
    // CRITICAL: Do NOT recalculate base fare if it's already locked from existing invoice
    $baseFareIsLocked = isset($calculationDone) && $calculationDone;
    if ($originalBookingTotal !== null && $gstEnabled && $includeTax && ($lockedBaseFare === null || $lockedBaseFare <= 0) && !$baseFareIsLocked) {
        // Only preserve original booking total in tax-INCLUSIVE mode
        // AND only if base fare is NOT locked from existing invoice
        $difference = abs($finalTotal - $originalBookingTotal);
        if ($difference > 100 || ($originalBookingTotal > 0 && ($difference / $originalBookingTotal) * 100 > 1)) {
            $finalTotal = $originalBookingTotal;
            
            // CRITICAL: When tax is INCLUSIVE, back-calculate tax from total
            // Formula: Taxable Amount = Total / 1.18
            // Formula: Tax = Total - Taxable Amount
            $gstRate = 0.18;
            $taxableAmount = round($finalTotal / (1 + $gstRate), 2);
            $taxAmount = round($finalTotal - $taxableAmount, 2);
            // Base fare should be the taxable amount minus extra charges
            // But if lockedBaseFare was provided, keep it for display
            if ($lockedBaseFare === null || $lockedBaseFare <= 0) {
                $baseFare = round($taxableAmount - $totalExtraCharges, 2);
            }
            $grossAmount = $baseFare + $totalExtraCharges;
            
            logInvoiceError("FINAL CHECK: Recalculating base fare for tax-inclusive (no existing invoice)", [
                'original_booking_total' => $originalBookingTotal,
                'recalculated_base_fare' => $baseFare,
                'taxable_amount' => $taxableAmount,
                'tax_amount' => $taxAmount,
                'final_total' => $finalTotal,
                'note' => 'No existing invoice - recalculating base fare from original booking total'
            ]);
            
            // Recalculate CGST/SGST or IGST
            if ($isIGST) {
                $igstAmount = $taxAmount;
                $cgstAmount = 0;
                $sgstAmount = 0;
            } else {
                $halfTax = $taxAmount / 2;
                $cgstAmount = round($halfTax, 2);
                $sgstAmount = round($taxAmount - $cgstAmount, 2);
                $igstAmount = 0;
            }
            
            // CRITICAL: Regenerate the total line in HTML with the correct value
            // Find and replace the total amount line in the HTML
            // Both tax-inclusive and tax-exclusive totals include tax
            $pattern = '/<tr class="total-row">.*?<td>Total Amount.*?<\/td>.*?<td style="text-align: right;">₹ [0-9,]+\.?[0-9]*<\/td>.*?<\/tr>/s';
            $replacement = '<tr class="total-row">
                        <td>Total Amount (including tax)</td>
                        <td style="text-align: right;">₹ ' . number_format($finalTotal, 2) . '</td>
                    </tr>';
            $invoiceHtml = preg_replace($pattern, $replacement, $invoiceHtml);
            
            logInvoiceError("FINAL CHECK before response: Force preserving original booking total and regenerated HTML (GST ENABLED, TAX INCLUSIVE)", [
                'original_booking_total' => $originalBookingTotal,
                'calculated_total' => $finalTotal,
                'difference' => $difference,
                'final_total_in_response' => $finalTotal,
                'base_fare' => $baseFare,
                'tax_amount' => $taxAmount,
                'gst_enabled' => $gstEnabled,
                'include_tax' => $includeTax
            ]);
        }
    } elseif ($originalBookingTotal !== null && $gstEnabled && !$includeTax) {
        // CRITICAL: When tax is EXCLUSIVE, DO NOT preserve original booking total
        // We MUST use calculated total (base + extra + tax) = ₹27,376.61
        // Regenerate the total line in HTML with the calculated value
        // Tax-exclusive total INCLUDES tax (base + extra + GST)
        $pattern = '/<tr class="total-row">.*?<td>Total Amount.*?<\/td>.*?<td style="text-align: right;">₹ [0-9,]+\.?[0-9]*<\/td>.*?<\/tr>/s';
        $replacement = '<tr class="total-row">
                    <td>Total Amount (including tax)</td>
                    <td style="text-align: right;">₹ ' . number_format($finalTotal, 2) . '</td>
                </tr>';
        $invoiceHtml = preg_replace($pattern, $replacement, $invoiceHtml);
        
        logInvoiceError("FINAL CHECK before response: GST ENABLED, TAX EXCLUSIVE - Using calculated total (base + tax), NOT original booking total", [
            'original_booking_total' => $originalBookingTotal,
            'calculated_total' => $finalTotal,
            'base_fare' => $baseFare,
            'tax_amount' => $taxAmount,
            'gst_enabled' => true,
            'include_tax' => false,
            'note' => 'When tax is exclusive, total MUST be base + tax (₹22,200.52), not original booking total (₹18,814). HTML regenerated.'
        ]);
    } elseif ($originalBookingTotal !== null && !$gstEnabled) {
        // When GST is disabled, do NOT preserve original booking total
        logInvoiceError("FINAL CHECK before response: GST DISABLED - Using calculated total, ignoring original booking total", [
            'original_booking_total' => $originalBookingTotal,
            'calculated_total' => $finalTotal,
            'gst_enabled' => false,
            'note' => 'Original booking total ignored - using calculated total (base_fare + extra_charges)'
        ]);
    }
    
    // CRITICAL: Ensure baseAmount in response is always the actual base fare, not the total
    // When tax is EXCLUSIVE: baseAmount = base fare (₹18,814), totalAmount = base + tax (₹22,200.52)
    // When tax is INCLUSIVE: baseAmount = base fare shown (₹18,814), totalAmount = same (₹18,814, includes tax)
    // NEVER send totalAmount as baseAmount
    $responseBaseAmount = $baseFare; // Always use the calculated base fare
    
    // CRITICAL: Final verification - ensure CGST + SGST = taxAmount (accounting for rounding)
    // This ensures the response values are consistent
    if ($gstEnabled && !$isIGST && $taxAmount > 0) {
        $cgstSgstSum = round($cgstAmount + $sgstAmount, 2);
        $difference = abs($cgstSgstSum - $taxAmount);
        if ($difference > 0.01) {
            // Recalculate CGST/SGST to ensure they sum to taxAmount exactly
            $halfTax = $taxAmount / 2;
            $cgstAmount = round($halfTax, 2);
            $sgstAmount = round($taxAmount - $cgstAmount, 2);
            logInvoiceError("CRITICAL: CGST+SGST mismatch corrected before response", [
                'old_cgst' => $cgstAmount,
                'old_sgst' => $sgstAmount,
                'old_sum' => $cgstSgstSum,
                'tax_amount' => $taxAmount,
                'difference' => $difference,
                'corrected_cgst' => $cgstAmount,
                'corrected_sgst' => $sgstAmount,
                'corrected_sum' => $cgstAmount + $sgstAmount
            ]);
        }
    }
    
    // CRITICAL: Final verification - ensure Base + Extra + Tax = Total (accounting for rounding)
    $calculatedTotal = round($baseFare + $totalExtraCharges + $taxAmount, 2);
    $totalDifference = abs($calculatedTotal - $finalTotal);
    if ($totalDifference > 0.01 && $gstEnabled) {
        logInvoiceError("WARNING: Total amount mismatch before response", [
            'base_fare' => $baseFare,
            'extra_charges' => $totalExtraCharges,
            'tax_amount' => $taxAmount,
            'calculated_total' => $calculatedTotal,
            'final_total' => $finalTotal,
            'difference' => $totalDifference,
            'gst_enabled' => $gstEnabled,
            'include_tax' => $includeTax
        ]);
    }
    
    // Prepare response data
    $responseData = [
        'status' => 'success',
        'message' => 'Invoice generated successfully',
        'data' => [
            'invoiceNumber' => $invoiceNumber,
            'invoiceDate' => date('d M Y'),
            'bookingNumber' => $booking['booking_number'],
            'passengerName' => $booking['passenger_name'],
            'totalAmount' => $finalTotal,
            'baseAmount' => $responseBaseAmount, // CRITICAL: Always base fare, never total
            'taxAmount' => $taxAmount,
            'cgstAmount' => $cgstAmount, // CRITICAL: Send CGST amount for frontend consistency
            'sgstAmount' => $sgstAmount, // CRITICAL: Send SGST amount for frontend consistency
            'igstAmount' => $igstAmount,
            'gstEnabled' => $gstEnabled,
            'isIGST' => $isIGST,
            'includeTax' => $includeTax,
            'extraCharges' => $extraChargesArr,
            'totalExtraCharges' => $totalExtraCharges,
            'invoiceHtml' => $invoiceHtml
        ]
    ];
    
    // Log to verify baseAmount is correct
    logInvoiceError("Response data verification", [
        'baseAmount_in_response' => $responseBaseAmount,
        'totalAmount_in_response' => $finalTotal,
        'taxAmount_in_response' => $taxAmount,
        'gst_enabled' => $gstEnabled,
        'include_tax' => $includeTax,
        'verification' => $gstEnabled && !$includeTax 
            ? 'EXCLUSIVE: baseAmount (' . $responseBaseAmount . ') + tax (' . $taxAmount . ') = total (' . $finalTotal . ')'
            : ($gstEnabled && $includeTax 
                ? 'INCLUSIVE: baseAmount (' . $responseBaseAmount . ') = total (' . $finalTotal . ') includes tax'
                : 'NO GST: baseAmount = total')
    ]);
    
    // Log the final values being sent in response
    logInvoiceError("Response data being sent", [
        'totalAmount' => $responseData['data']['totalAmount'],
        'baseAmount' => $responseData['data']['baseAmount'],
        'taxAmount' => $responseData['data']['taxAmount'],
        'original_booking_total' => $originalBookingTotal
    ]);
    
    if ($gstEnabled) {
        if ($isIGST) {
            $responseData['data']['igstAmount'] = $igstAmount;
        } else {
            $responseData['data']['cgstAmount'] = $cgstAmount;
            $responseData['data']['sgstAmount'] = $sgstAmount;
        }
        if ($gstDetails) {
            $responseData['data']['gstDetails'] = $gstDetails;
        }
    }
    
    // Store invoice in database if not in demo mode
    if (!$demoMode && isset($conn)) {
        try {
            // Check if invoice table exists, create if not
            $conn->query("
                CREATE TABLE IF NOT EXISTS invoices (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    booking_id INT NOT NULL,
                    invoice_number VARCHAR(50) NOT NULL,
                    invoice_date DATE NOT NULL,
                    base_amount DECIMAL(10,2) NOT NULL,
                    tax_amount DECIMAL(10,2) NOT NULL,
                    total_amount DECIMAL(10,2) NOT NULL,
                    gst_enabled TINYINT(1) DEFAULT 0,
                    is_igst TINYINT(1) DEFAULT 0,
                    include_tax TINYINT(1) DEFAULT 1,
                    gst_number VARCHAR(20),
                    company_name VARCHAR(100),
                    company_address TEXT,
                    invoice_html MEDIUMTEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY (invoice_number),
                    KEY (booking_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");
            
            // Check if invoice already exists for this booking
            $checkStmt = $conn->prepare("SELECT id FROM invoices WHERE booking_id = ? ORDER BY id DESC LIMIT 1");
            $checkStmt->bind_param("i", $booking['id']);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            
            if ($checkResult->num_rows > 0) {
                $invoiceRow = $checkResult->fetch_assoc();
                
                // CRITICAL: Always recalculate from original booking total to prevent compounding
                // Do NOT preserve base fare from existing invoice - it causes values to compound
                // Only use locked base fare if explicitly provided by user
                $preservedBaseFare = null;
                
                logInvoiceError("Existing invoice found - will recalculate from original booking total", [
                    'invoice_id' => $invoiceRow['id'],
                    'locked_base_fare_provided' => ($lockedBaseFare !== null && $lockedBaseFare > 0) ? 'YES' : 'NO',
                    'original_booking_total' => $originalBookingTotal,
                    'note' => 'Recalculating from scratch using original booking total to prevent compounding'
                ]);
                
                // Update existing invoice
                // CRITICAL: Always use recalculated base fare from original booking total
                // This prevents compounding - base fare is always calculated from scratch
                $baseFareForDB = $baseFare;
                
                logInvoiceError("Updating existing invoice with recalculated values", [
                    'base_fare_for_db' => $baseFareForDB,
                    'tax_amount' => $taxAmount,
                    'final_total' => $finalTotal,
                    'original_booking_total' => $originalBookingTotal,
                    'mode' => $gstEnabled ? ($includeTax ? 'TAX-INCLUSIVE' : 'TAX-EXCLUSIVE') : 'NO-GST',
                    'note' => 'All values recalculated from original booking total to prevent compounding'
                ]);
                
                $stmt = $conn->prepare("
                    UPDATE invoices SET 
                        invoice_number = ?,
                        invoice_date = ?, 
                        base_amount = ?, 
                        tax_amount = ?, 
                        total_amount = ?,
                        gst_enabled = ?,
                        is_igst = ?,
                        include_tax = ?,
                        gst_number = ?,
                        company_name = ?,
                        company_address = ?,
                        invoice_html = ?,
                        gst_amount = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ");
                $gstEnabledInt = $gstEnabled ? 1 : 0;
                $isIgstInt = $isIGST ? 1 : 0;
                $includeTaxInt = $includeTax ? 1 : 0;
                // Extract GST/company details safely
                $gstNumberVal = isset($gstDetails['gstNumber']) ? $gstDetails['gstNumber'] : '';
                $companyNameVal = isset($gstDetails['companyName']) ? $gstDetails['companyName'] : '';
                $companyAddressVal = isset($gstDetails['companyAddress']) ? $gstDetails['companyAddress'] : '';
                $taxAmountVal = isset($taxAmount) ? $taxAmount : 0;
                $gstAmountVal = isset($taxAmount) ? $taxAmount : 0;
                // Add debug logging before SQL
                logInvoiceError('Invoice SQL values (UPDATE)', [
                    'base_fare_for_db' => $baseFareForDB,
                    'base_fare_calculated' => $baseFare,
                    'preserved_base_fare' => $preservedBaseFare,
                    'tax_amount' => $taxAmountVal,
                    'final_total' => $finalTotal,
                    'gstEnabledInt' => $gstEnabledInt,
                    'isIgstInt' => $isIgstInt,
                    'includeTaxInt' => $includeTaxInt,
                    'locked_base_fare_provided' => ($lockedBaseFare !== null && $lockedBaseFare > 0) ? 'YES' : 'NO',
                    'preserving_existing' => ($preservedBaseFare !== null) ? 'YES' : 'NO',
                    'note' => $preservedBaseFare !== null ? 'Base fare is LOCKED - using preserved value in DB' : 'Base fare will be updated'
                ]);
                // 14 params: s = string, d = double, i = int
                $stmt->bind_param(
                    "ssdddiiiisssdi",
                    $invoiceNumber,
                    $currentDate,
                    $baseFareForDB,  // Use preserved base fare, not recalculated
                    $taxAmountVal,
                    $finalTotal,
                    $gstEnabledInt,
                    $isIgstInt,
                    $includeTaxInt,
                    $gstNumberVal,
                    $companyNameVal,
                    $companyAddressVal,
                    $invoiceHtml,
                    $gstAmountVal,
                    $invoiceRow['id']
                );
                
                $success = $stmt->execute();
                
                if (!$success || $stmt->error) {
                    logInvoiceError("Error updating invoice", [
                        'error' => $stmt->error,
                        'id' => $invoiceRow['id'],
                        'success' => $success ? 'true' : 'false'
                    ]);
                } else {
                    $responseData['message'] = 'Invoice updated successfully';
                    logInvoiceError("Invoice updated successfully", [
                        'invoice_id' => $invoiceRow['id'],
                        'invoice_number' => $invoiceNumber,
                        'rows_affected' => $stmt->affected_rows
                    ]);
                }
            } else {
                // Insert new invoice
                $stmt = $conn->prepare("
                    INSERT INTO invoices (
                        booking_id, invoice_number, invoice_date, base_amount, 
                        tax_amount, total_amount, gst_enabled, is_igst, include_tax, 
                        gst_number, company_name, company_address, invoice_html, gst_amount
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $gstEnabledInt = $gstEnabled ? 1 : 0;
                $isIgstInt = $isIGST ? 1 : 0;
                $includeTaxInt = $includeTax ? 1 : 0;
                // Extract GST/company details safely
                $gstNumberVal = isset($gstDetails['gstNumber']) ? $gstDetails['gstNumber'] : '';
                $companyNameVal = isset($gstDetails['companyName']) ? $gstDetails['companyName'] : '';
                $companyAddressVal = isset($gstDetails['companyAddress']) ? $gstDetails['companyAddress'] : '';
                $taxAmountVal = isset($taxAmount) ? $taxAmount : 0;
                $gstAmountVal = isset($taxAmount) ? $taxAmount : 0;
                // 14 params: i = int, s = string, d = double
                $stmt->bind_param(
                    "issdddiiiisssd",
                    $booking['id'],
                    $invoiceNumber,
                    $currentDate,
                    $baseFare,
                    $taxAmountVal,
                    $finalTotal,
                    $gstEnabledInt,
                    $isIgstInt,
                    $includeTaxInt,
                    $gstNumberVal, 
                    $companyNameVal,
                    $companyAddressVal,
                    $invoiceHtml,
                    $gstAmountVal
                );
                
                $success = $stmt->execute();
                
                if (!$success || $stmt->error) {
                    logInvoiceError("Error inserting invoice", [
                        'error' => $stmt->error, 
                        'success' => $success ? 'true' : 'false'
                    ]);
                } else {
                    $responseData['message'] = 'Invoice generated and saved successfully';
                    $newId = $stmt->insert_id;
                    logInvoiceError("New invoice created", [
                        'booking_id' => $booking['id'], 
                        'invoice_id' => $newId,
                        'invoice_number' => $invoiceNumber
                    ]);
                }
            }
        } catch (Exception $e) {
            logInvoiceError("Error saving invoice to database", ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            // Continue and return the invoice even if saving to DB fails
        }
        // First ensure the required columns exist in bookings table
        try {
            // Check and add GST columns if they don't exist
            $gstColumns = [
                'gst_enabled' => "TINYINT(1) DEFAULT 0",
                'gst_number' => "VARCHAR(20) DEFAULT ''",
                'company_name' => "VARCHAR(100) DEFAULT ''", 
                'company_address' => "TEXT DEFAULT ''"
            ];
            
            foreach ($gstColumns as $column => $definition) {
                $checkColumn = $conn->query("SHOW COLUMNS FROM bookings LIKE '$column'");
                if (!$checkColumn || $checkColumn->num_rows === 0) {
                    $conn->query("ALTER TABLE bookings ADD COLUMN $column $definition");
                    logInvoiceError("Added missing column $column to bookings table");
                }
            }
        } catch (Exception $e) {
            logInvoiceError("Error ensuring booking columns exist", ['error' => $e->getMessage()]);
        }
        
        // Also update the bookings table with the latest invoice settings
        try {
            $gstEnabledInt = $gstEnabled ? 1 : 0;
            $gstNumberVal = ($gstEnabled && $gstDetails && isset($gstDetails['gstNumber'])) ? $gstDetails['gstNumber'] : '';
            $companyNameVal = ($gstEnabled && $gstDetails && isset($gstDetails['companyName'])) ? $gstDetails['companyName'] : '';
            $companyAddressVal = ($gstEnabled && $gstDetails && isset($gstDetails['companyAddress'])) ? $gstDetails['companyAddress'] : '';
            
            logInvoiceError("Attempting to update bookings table with invoice settings", [
                'booking_id' => $booking['id'],
                'gst_enabled' => $gstEnabled,
                'gst_number' => $gstNumberVal,
                'company_name' => $companyNameVal,
                'company_address' => $companyAddressVal
            ]);
            
            $updateBookingStmt = $conn->prepare("
                UPDATE bookings SET
                    gst_enabled = ?,
                    gst_number = ?,
                    company_name = ?,
                    company_address = ?
                WHERE id = ?
            ");
            
            $updateBookingStmt->bind_param(
                "isssi",
                $gstEnabledInt,
                $gstNumberVal,
                $companyNameVal,
                $companyAddressVal,
                $booking['id']
            );
            
            $success = $updateBookingStmt->execute();
            if (!$success || $updateBookingStmt->error) {
                logInvoiceError("Error executing bookings update", [
                    'error' => $updateBookingStmt->error,
                    'success' => $success ? 'true' : 'false',
                    'booking_id' => $booking['id']
                ]);
            } else {
                logInvoiceError("Bookings table updated successfully", [
                    'booking_id' => $booking['id'],
                    'rows_affected' => $updateBookingStmt->affected_rows
                ]);
            }
            // CRITICAL: Do NOT update the booking's total_amount if we preserved the original total
            // The booking's total_amount should remain as it was originally set
            // Only update if we're NOT preserving the original total (i.e., new calculation)
            if (!$preservedOriginalTotal || $originalBookingTotal === null) {
                // Now update the price/total_amount in the bookings table
                try {
                    logInvoiceError("Attempting to update booking price", [
                        'booking_id' => $booking['id'],
                        'total_amount' => $finalTotal,
                        'preserved_original' => $preservedOriginalTotal ? 'YES' : 'NO'
                    ]);
                    $updatePriceStmt = $conn->prepare("
                        UPDATE bookings SET
                            total_amount = ?
                        WHERE id = ?
                    ");
                    $updatePriceStmt->bind_param(
                        "di",
                        $finalTotal,
                        $booking['id']
                    );
                    $successPrice = $updatePriceStmt->execute();
                    if (!$successPrice || $updatePriceStmt->error) {
                        logInvoiceError('Error updating booking price', [
                            'error' => $updatePriceStmt->error,
                            'success' => $successPrice ? 'true' : 'false',
                            'booking_id' => $booking['id'],
                            'total_amount' => $finalTotal
                        ]);
                    } else {
                        logInvoiceError('Booking price updated successfully', [
                            'booking_id' => $booking['id'],
                            'total_amount' => $finalTotal,
                            'rows_affected' => $updatePriceStmt->affected_rows
                        ]);
                    }
                } catch (Exception $e) {
                    logInvoiceError('Error updating booking price', ['error' => $e->getMessage()]);
                }
            } else {
                logInvoiceError('Skipping booking total_amount update - preserving original value', [
                    'booking_id' => $booking['id'],
                    'original_booking_total' => $originalBookingTotal,
                    'final_total' => $finalTotal,
                    'preserved_original' => 'YES'
                ]);
            }
        } catch (Exception $e) {
            logInvoiceError("Error updating booking with invoice settings", ['error' => $e->getMessage()]);
        }
    }
    
    // Send invoice data response
    sendJsonResponse($responseData);

} catch (Exception $e) {
    logInvoiceError("Error generating invoice", ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Failed to generate invoice: ' . $e->getMessage(),
        'error_details' => $debugMode ? $e->getMessage() : null
    ], 500);
}

// Close database connection
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
