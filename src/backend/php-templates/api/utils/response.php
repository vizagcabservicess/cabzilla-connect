
<?php
/**
 * API response utility functions
 */

/**
 * Send a JSON success response
 *
 * @param array $data Response data
 * @param string $message Success message
 * @param int $statusCode HTTP status code
 * @return void
 */
function sendSuccessResponse($data = [], $message = 'Operation successful', $statusCode = 200) {
    http_response_code($statusCode);
    
    $response = [
        'status' => 'success',
        'message' => $message,
        'data' => $data,
        'timestamp' => time()
    ];
    
    echo json_encode($response);
    exit();
}

/**
 * Send a JSON error response
 *
 * @param string $message Error message
 * @param int $statusCode HTTP status code
 * @param array $details Error details
 * @return void
 */
function sendErrorResponse($message = 'An error occurred', $statusCode = 400, $details = []) {
    http_response_code($statusCode);
    
    $response = [
        'status' => 'error',
        'message' => $message,
        'timestamp' => time()
    ];
    
    if (!empty($details)) {
        $response['details'] = $details;
    }
    
    // Add debug backtrace in development environments
    if (isset($_GET['debug']) && $_GET['debug'] === 'true') {
        $response['debug'] = [
            'backtrace' => debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 5),
            'request' => $_REQUEST,
            'server' => $_SERVER
        ];
    }
    
    echo json_encode($response);
    exit();
}

/**
 * Log an API request
 *
 * @param string $endpoint API endpoint
 * @param array $data Request data
 * @param string $method Request method
 * @return void
 */
function logApiRequest($endpoint, $data = [], $method = 'GET') {
    $logDir = __DIR__ . '/../../logs';
    
    // Create logs directory if it doesn't exist
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    $logFile = $logDir . '/api_requests.log';
    
    // Format log entry
    $logEntry = sprintf(
        "[%s] %s request to %s\n%s\n\n",
        date('Y-m-d H:i:s'),
        $method,
        $endpoint,
        json_encode($data, JSON_PRETTY_PRINT)
    );
    
    // Append to log file
    file_put_contents($logFile, $logEntry, FILE_APPEND);
}

/**
 * Validate required fields in a request
 *
 * @param array $data Request data
 * @param array $requiredFields List of required field names
 * @return array Array of missing field names
 */
function validateRequiredFields($data, $requiredFields) {
    $missingFields = [];
    
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
            $missingFields[] = $field;
        }
    }
    
    return $missingFields;
}

/**
 * Parse query parameters from URL
 * 
 * @param string $paramName Parameter name
 * @param mixed $default Default value
 * @return mixed Parameter value or default
 */
function getQueryParam($paramName, $default = null) {
    return isset($_GET[$paramName]) ? $_GET[$paramName] : $default;
}

/**
 * Get request headers
 *
 * @return array Headers array
 */
function getRequestHeaders() {
    $headers = [];
    
    // If getallheaders() is available (Apache)
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
    } else {
        // Otherwise manually extract headers
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) === 'HTTP_') {
                $name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))));
                $headers[$name] = $value;
            } else if ($name === 'CONTENT_TYPE') {
                $headers['Content-Type'] = $value;
            } else if ($name === 'CONTENT_LENGTH') {
                $headers['Content-Length'] = $value;
            }
        }
    }
    
    return $headers;
}

/**
 * Debug helper to log and optionally display SQL queries
 *
 * @param string $sql SQL query
 * @param array $params Query parameters
 * @param string $types Parameter types
 * @param bool $display Whether to include in response (when debug=true)
 * @return void
 */
function debugSqlQuery($sql, $params = [], $types = '', $display = false) {
    static $queries = [];
    
    // Format the query for logging
    $query = [
        'sql' => $sql,
        'params' => $params,
        'types' => $types,
        'time' => date('Y-m-d H:i:s')
    ];
    
    // Add to queries array
    $queries[] = $query;
    
    // Log the query
    error_log('SQL Query: ' . json_encode($query));
    
    // If this is enabled and debug mode is on, it will be included in error responses
    if ($display && isset($_GET['debug']) && $_GET['debug'] === 'true') {
        if (!isset($GLOBALS['debug_sql_queries'])) {
            $GLOBALS['debug_sql_queries'] = [];
        }
        $GLOBALS['debug_sql_queries'][] = $query;
    }
}
