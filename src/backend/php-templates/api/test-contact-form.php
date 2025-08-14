<?php
/**
 * Test script to verify contact form functionality
 */

// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Function to send JSON response
function sendJsonResponse($data, $statusCode = 200) {
    // Clear any output buffers
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

try {
    // Test 1: Check if required files exist
    $requiredFiles = [
        __DIR__ . '/../config.php',
        __DIR__ . '/common/db_helper.php',
        __DIR__ . '/utils/mailer.php',
        __DIR__ . '/utils/email-templates.php',
        __DIR__ . '/contact-form.php'
    ];
    
    $fileStatus = [];
    foreach ($requiredFiles as $file) {
        $fileStatus[basename($file)] = [
            'exists' => file_exists($file),
            'readable' => is_readable($file),
            'path' => $file
        ];
    }
    
    // Test 2: Check database connection
    $dbStatus = 'unknown';
    try {
        require_once __DIR__ . '/../config.php';
        require_once __DIR__ . '/common/db_helper.php';
        
        $conn = getDbConnectionWithRetry();
        if ($conn && $conn->ping()) {
            $dbStatus = 'connected';
            $conn->close();
        } else {
            $dbStatus = 'failed';
        }
    } catch (Exception $e) {
        $dbStatus = 'error: ' . $e->getMessage();
    }
    
    // Test 3: Check if contact_messages table exists
    $tableStatus = 'unknown';
    try {
        if ($dbStatus === 'connected') {
            $conn = getDbConnectionWithRetry();
            $result = $conn->query("SHOW TABLES LIKE 'contact_messages'");
            $tableStatus = $result->num_rows > 0 ? 'exists' : 'missing';
            $conn->close();
        } else {
            $tableStatus = 'cannot_check';
        }
    } catch (Exception $e) {
        $tableStatus = 'error: ' . $e->getMessage();
    }
    
    // Test 4: Check email functions
    $emailStatus = 'unknown';
    try {
        require_once __DIR__ . '/utils/mailer.php';
        require_once __DIR__ . '/utils/email-templates.php';
        
        $emailFunctions = [
            'generateContactAdminEmail',
            'generateContactCustomerEmail',
            'sendEmailAllMethods'
        ];
        
        $emailStatus = [];
        foreach ($emailFunctions as $func) {
            $emailStatus[$func] = function_exists($func);
        }
    } catch (Exception $e) {
        $emailStatus = 'error: ' . $e->getMessage();
    }
    
    // Test 5: Simulate a contact form submission
    $testData = [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'phone' => '1234567890',
        'subject' => 'Test Message',
        'message' => 'This is a test message from the contact form test script.'
    ];
    
    $simulationStatus = 'not_tested';
    if ($dbStatus === 'connected' && $tableStatus === 'exists') {
        try {
            $conn = getDbConnectionWithRetry();
            
            // Insert test message
            $sql = "INSERT INTO contact_messages (name, email, phone, subject, message) 
                    VALUES (?, ?, ?, ?, ?)";
            
            $stmt = $conn->prepare($sql);
            if ($stmt) {
                $stmt->bind_param("sssss", 
                    $testData['name'],
                    $testData['email'],
                    $testData['phone'],
                    $testData['subject'],
                    $testData['message']
                );
                
                if ($stmt->execute()) {
                    $testId = $conn->insert_id;
                    
                    // Clean up test data
                    $conn->query("DELETE FROM contact_messages WHERE id = $testId");
                    
                    $simulationStatus = 'success';
                } else {
                    $simulationStatus = 'insert_failed: ' . $stmt->error;
                }
            } else {
                $simulationStatus = 'prepare_failed: ' . $conn->error;
            }
            
            $conn->close();
        } catch (Exception $e) {
            $simulationStatus = 'error: ' . $e->getMessage();
        }
    }
    
    // Return comprehensive test results
    sendJsonResponse([
        'status' => 'success',
        'message' => 'Contact form test completed',
        'timestamp' => date('Y-m-d H:i:s'),
        'tests' => [
            'files' => $fileStatus,
            'database' => $dbStatus,
            'table' => $tableStatus,
            'email_functions' => $emailStatus,
            'simulation' => $simulationStatus
        ],
        'recommendations' => [
            'If database connection fails, check database credentials in config.php',
            'If table is missing, the contact form will create it automatically',
            'If email functions are missing, emails will not be sent but form will still work',
            'If simulation fails, there may be database permission issues'
        ]
    ]);
    
} catch (Exception $e) {
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Test failed: ' . $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ], 500);
}
?>
