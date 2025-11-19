<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// CRITICAL: Set all response headers first before any output
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
    http_response_code($statusCode);
    if (ob_get_level()) ob_end_clean();
    echo json_encode($data, JSON_PRETTY_PRINT);
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



try {
    // Get booking ID
    $bookingId = null;
    $gstEnabled = false;
    $gstDetails = null;
    $isIGST = false;
    $includeTax = true;
    $customInvoiceNumber = '';
    $lockedBaseFare = null;
    
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
        'lockedBaseFare' => $lockedBaseFare
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
    
    // Calculate tax components based on includeTax setting
    // Check if invoice already exists and use its base_amount if available
    $baseFare = 0;
    $taxAmount = 0;
    
    if (!$demoMode && isset($conn)) {
        try {
            // Check if invoice already exists for this booking
            $checkStmt = $conn->prepare("SELECT base_amount, tax_amount FROM invoices WHERE booking_id = ? ORDER BY id DESC LIMIT 1");
            $checkStmt->bind_param("i", $booking['id']);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            
            if ($checkResult->num_rows > 0) {
                $existingInvoice = $checkResult->fetch_assoc();
                
                // Use existing base_amount if no locked base fare is provided
                if ($lockedBaseFare === null || $lockedBaseFare <= 0) {
                    $baseFare = (float)$existingInvoice['base_amount'];
                    $taxAmount = (float)$existingInvoice['tax_amount'];
                    logInvoiceError("Using existing invoice base_amount and tax_amount", [
                        'existing_base_amount' => $baseFare,
                        'existing_tax_amount' => $taxAmount
                    ]);
                    
                    // Skip further calculation since we have the correct values
                    $calculationDone = true;
                }
            }
        } catch (Exception $e) {
            logInvoiceError("Error checking existing invoice", ['error' => $e->getMessage()]);
        }
    }
    
    // Only calculate if we don't have existing values
    if (!isset($calculationDone)) {
        // CRITICAL: Use locked base fare if provided - this is the user-entered value
        // Do NOT recalculate it under any circumstances when lockedBaseFare is provided
        if ($lockedBaseFare !== null && $lockedBaseFare > 0) {
            $baseFare = $lockedBaseFare;
            logInvoiceError("Using locked base fare (user-entered value)", [
                'lockedBaseFare' => $lockedBaseFare,
                'baseFare_set' => $baseFare,
                'includeTax' => $includeTax ? 'true' : 'false'
            ]);
        } else {
            // Only calculate base fare if lockedBaseFare was NOT provided
            // First try to use booking fare if available
            $baseFare = isset($booking['fare']) ? (float)$booking['fare'] : 0;
            
            // If no fare field, calculate base fare from total_amount by backing out GST and extra charges
            if ($baseFare <= 0 && isset($booking['total_amount']) && $booking['total_amount'] > 0) {
        $totalAmount = (float)$booking['total_amount'];
                
                // If GST is enabled, check if tax is included in the total_amount
                if ($gstEnabled) {
                    if ($includeTax) {
                        // Tax-inclusive: total_amount already includes tax
                        // taxable_amount = total_amount / 1.18
                        // base_fare = taxable_amount - extra_charges
                        $taxableAmount = round($totalAmount / 1.18, 2);
                        $baseFare = round($taxableAmount - $totalExtraCharges, 2);
                    } else {
                        // Tax-exclusive: total_amount does not include tax
                        // base_fare = total_amount - extra_charges
                        $baseFare = $totalAmount - $totalExtraCharges;
                    }
                } else {
                    // No GST, so base_fare = total_amount - extra_charges
                    $baseFare = $totalAmount - $totalExtraCharges;
                }
                
                // Ensure base fare is not negative
                $baseFare = max(0, $baseFare);
                logInvoiceError("Calculated base fare from total_amount (no locked base fare provided)", [
                    'total_amount' => $totalAmount,
                    'extra_charges' => $totalExtraCharges,
                    'calculated_base_fare' => $baseFare,
                    'gst_enabled' => $gstEnabled,
                    'include_tax' => $includeTax ? 'true' : 'false'
                ]);
            } else {
                logInvoiceError("Using booking fare as base fare", ['fare' => $baseFare]);
            }
        }
    }
    
    // Only calculate tax if we don't already have it from existing invoice
    if (!isset($calculationDone)) {
    // GST rate is always 18% (either as IGST 18% or CGST 9% + SGST 9%)
    $gstRate = $gstEnabled ? 0.18 : 0; 
    
    // CRITICAL: When lockedBaseFare is provided, preserve it exactly as entered
    // This MUST happen BEFORE any validation or recalculation
    // Do NOT recalculate base fare when lockedBaseFare is provided
    if ($lockedBaseFare !== null && $lockedBaseFare > 0) {
        $baseFare = $lockedBaseFare;
        logInvoiceError("Preserving user-entered base fare (CRITICAL)", [
            'locked_base_fare' => $lockedBaseFare,
            'base_fare_preserved' => $baseFare,
            'includeTax' => $includeTax ? 'true' : 'false'
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
            // Tax-inclusive: Extract tax from the gross amount
            // CRITICAL: Preserve the entered base fare and extra charges - DO NOT MODIFY
            // Only extract tax for display/compliance purposes
            // Formula: Taxable Amount = Gross Amount ÷ (1 + Tax Rate)
            // Formula: GST Amount = Taxable Amount × Tax Rate
            // Formula: Total = Gross Amount (unchanged, tax is included)
            
            // Ensure base fare is preserved (final safety check)
            if ($lockedBaseFare !== null && $lockedBaseFare > 0) {
                $baseFare = $lockedBaseFare;
                $grossAmount = $baseFare + $totalExtraCharges;
            }
            
            // Calculate taxable amount and GST using standard formula
            $taxableAmount = round($grossAmount / (1 + $gstRate), 2);
            $taxAmount = round($taxableAmount * $gstRate, 2);
            
            // Verify: taxable + tax should equal gross (with rounding tolerance)
            $verification = round($taxableAmount + $taxAmount, 2);
            if (abs($verification - $grossAmount) > 0.01) {
                // Adjust tax amount to ensure total matches exactly
                $taxAmount = round($grossAmount - $taxableAmount, 2);
            }
            
            // Final total remains the same as gross amount (tax is included)
            // Base fare and extra charges remain unchanged (preserve user input)
            $finalTotal = $grossAmount;
            
            logInvoiceError("Tax-inclusive calculation (FINAL)", [
                'base_fare_entered' => $baseFare,
                'base_fare_preserved' => ($lockedBaseFare !== null && $lockedBaseFare > 0) ? 'YES' : 'NO',
                'extra_charges' => $totalExtraCharges,
                'gross_amount' => $grossAmount,
                'taxable_amount' => $taxableAmount,
                'tax_amount' => $taxAmount,
                'final_total' => $finalTotal,
                'gst_rate' => $gstRate,
                'locked_base_fare' => $lockedBaseFare,
                'verification' => $verification
            ]);
        } else {
            // Tax-exclusive: Add tax on top of the gross amount
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
        // No GST
        $taxableAmount = $grossAmount;
        $taxAmount = 0;
        $finalTotal = $grossAmount;
    }
    } else {
        // Use existing values from database
        $grossAmount = $baseFare + $totalExtraCharges;
        $finalTotal = $baseFare + $totalExtraCharges + $taxAmount;
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
    // Only round it if it hasn't been set yet (shouldn't happen, but safety check)
    if (!isset($finalTotal)) {
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
        $finalTotal = round($finalTotal, 2);
    }
    
    // CRITICAL: NEVER recalculate base fare if lockedBaseFare was provided
    // The backout calculation should ONLY happen if:
    // 1. No locked base fare was provided
    // 2. Base fare is missing or invalid
    // 3. We're in tax-inclusive mode
    if ($gstEnabled && $includeTax && ($lockedBaseFare === null || $lockedBaseFare <= 0)) {
        // Only do backout if base fare is missing or suspicious
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
    
    // FINAL CHECK: If lockedBaseFare was provided, ensure it's preserved (safety check)
    if ($lockedBaseFare !== null && $lockedBaseFare > 0) {
        $baseFare = $lockedBaseFare;
        logInvoiceError("Final safety check: Preserving locked base fare", [
            'locked_base_fare' => $lockedBaseFare,
            'base_fare_final' => $baseFare,
            'include_tax' => 'true'
        ]);
    }
    // Log final calculation for debugging
    if ($gstEnabled && !isset($calculationDone)) {
        logInvoiceError("Final GST calculation", [
            'base_fare' => $baseFare,
            'extra_charges' => $totalExtraCharges,
            'gross_amount' => $grossAmount ?? ($baseFare + $totalExtraCharges),
            'taxable_amount' => $taxableAmount ?? ($baseFare + $totalExtraCharges),
            'tax_amount' => $taxAmount,
            'cgst_amount' => $cgstAmount,
            'sgst_amount' => $sgstAmount,
            'igst_amount' => $igstAmount,
            'final_total' => $finalTotal,
            'include_tax' => $includeTax ? 'true' : 'false'
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
                        ($gstEnabled ? '<p><strong>GSTIN: 37AATFV5320K1ZL</strong></p>' : '') . '
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
            
    // CRITICAL: Ensure base fare is preserved right before HTML generation
    // This is the final check to prevent any recalculation from affecting the display
    if ($lockedBaseFare !== null && $lockedBaseFare > 0) {
        $baseFare = $lockedBaseFare;
        logInvoiceError("Pre-HTML generation: Preserving locked base fare", [
            'locked_base_fare' => $lockedBaseFare,
            'base_fare_for_html' => $baseFare
        ]);
    }
    
    // FINAL VERIFICATION: Log the exact value being used in HTML
    logInvoiceError("HTML generation: Final baseFare value", [
        'base_fare' => $baseFare,
        'locked_base_fare' => $lockedBaseFare,
        'base_fare_formatted' => number_format($baseFare, 2),
        'include_tax' => $includeTax ? 'true' : 'false',
        'gst_enabled' => $gstEnabled ? 'true' : 'false'
    ]);
    
    $invoiceHtml .= '
            <h3 class="section-title">Fare Breakdown</h3>
            <table class="fare-table">
                <tr>
                    <th>Description</th>
                    <th style="text-align: right;">Amount</th>
                </tr>
                <tr>
                    <td>Base Fare' . ($includeTax && $gstEnabled ? '' : ($gstEnabled ? ' (excluding tax)' : '')) . '</td>
                    <td style="text-align: right;">₹ ' . number_format($baseFare, 2) . '</td>
                </tr>';
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
    // GST rows - show CGST and SGST separately for intrastate, IGST for interstate
    if ($gstEnabled) {
        if ($isIGST) {
            $invoiceHtml .= '\n                <tr>\n                    <td>IGST (18%)</td>\n                    <td style="text-align: right;">₹ ' . number_format($igstAmount, 2) . '</td>\n                </tr>';
        } else {
            $invoiceHtml .= '\n                <tr>\n                    <td>CGST (9%)</td>\n                    <td style="text-align: right;">₹ ' . number_format($cgstAmount, 2) . '</td>\n                </tr>';
            $invoiceHtml .= '\n                <tr>\n                    <td>SGST (9%)</td>\n                    <td style="text-align: right;">₹ ' . number_format($sgstAmount, 2) . '</td>\n                </tr>';
        }
    }
    $invoiceHtml .= '\n                <tr class="total-row">\n                    <td>Total Amount' . ($includeTax ? ' (including tax)' : ' (excluding tax)') . '</td>\n                    <td style="text-align: right;">₹ ' . number_format($finalTotal, 2) . '</td>\n                </tr>\n            </table>';
            
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
            'baseAmount' => $baseFare,
            'taxAmount' => $taxAmount,
            'gstEnabled' => $gstEnabled,
            'isIGST' => $isIGST,
            'includeTax' => $includeTax,
            'extraCharges' => $extraChargesArr,
            'totalExtraCharges' => $totalExtraCharges,
            'invoiceHtml' => $invoiceHtml
        ]
    ];
    
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
                // Update existing invoice
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
                logInvoiceError('Invoice SQL values', [
                    'gstEnabledInt' => $gstEnabledInt,
                    'isIgstInt' => $isIgstInt,
                    'includeTaxInt' => $includeTaxInt,
                    'gstNumberVal' => $gstNumberVal,
                    'companyNameVal' => $companyNameVal,
                    'companyAddressVal' => $companyAddressVal,
                    'taxAmountVal' => $taxAmountVal,
                    'gstAmountVal' => $gstAmountVal
                ]);
                // 14 params: s = string, d = double, i = int
                $stmt->bind_param(
                    "ssdddiiiisssdi",
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
            // Now update the price/total_amount in the bookings table
            try {
                logInvoiceError("Attempting to update booking price", [
                    'booking_id' => $booking['id'],
                    'total_amount' => $finalTotal
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
