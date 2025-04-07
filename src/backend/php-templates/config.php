
<?php
/**
 * Database Configuration and Connection Helper
 */

// Error reporting for development - remove in production
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't display errors directly, log them instead

// Create log directory
$logDir = __DIR__ . '/logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/database_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');

// DB Config - in a real application these would be in .env or similar
$DB_HOST = 'localhost';
$DB_USER = 'root'; // Change as needed
$DB_PASS = ''; // Change as needed
$DB_NAME = 'cabzilla_db'; // Change as needed

/**
 * Gets a database connection
 */
function getDbConnection() {
    global $DB_HOST, $DB_USER, $DB_PASS, $DB_NAME, $logFile, $timestamp;
    
    try {
        $conn = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME);
        
        if ($conn->connect_error) {
            file_put_contents($logFile, "[$timestamp] Database connection failed: " . $conn->connect_error . "\n", FILE_APPEND);
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
        
        // Set UTF-8 charset
        $conn->set_charset("utf8mb4");
        
        return $conn;
    } catch (Exception $e) {
        file_put_contents($logFile, "[$timestamp] Database connection error: " . $e->getMessage() . "\n", FILE_APPEND);
        
        // For preview/development purposes, create a fake connection that logs operations
        if (preg_match('/localhost|lovableproject\.com/', $_SERVER['HTTP_HOST'] ?? '')) {
            return createMockConnection();
        }
        
        throw $e;
    }
}

/**
 * Creates a mock database connection for development/preview
 */
function createMockConnection() {
    global $logFile, $timestamp;
    
    file_put_contents($logFile, "[$timestamp] Creating mock database connection for preview/dev\n", FILE_APPEND);
    
    // Create an object that will pretend to be a mysqli connection
    // but actually just log operations to a file
    $mock = new class {
        public $connect_error = null;
        public $error = null;
        private $logFile;
        
        public function __construct($logFile) {
            $this->logFile = $logFile;
        }
        
        public function query($sql) {
            $timestamp = date('Y-m-d H:i:s');
            file_put_contents($this->logFile, "[$timestamp] MOCK QUERY: $sql\n", FILE_APPEND);
            
            // Pretend all table exists checks are successful
            if (stripos($sql, 'SHOW TABLES LIKE') !== false) {
                return $this->createMockResult(1);
            }
            
            // Pretend all column checks are successful
            if (stripos($sql, 'SHOW COLUMNS') !== false) {
                return $this->createMockResult(1);
            }
            
            // Pretend all creates and alters succeed
            if (stripos($sql, 'CREATE TABLE') !== false || stripos($sql, 'ALTER TABLE') !== false) {
                return true;
            }
            
            return $this->createMockResult(5); // Default 5 mock rows
        }
        
        public function prepare($sql) {
            $timestamp = date('Y-m-d H:i:s');
            file_put_contents($this->logFile, "[$timestamp] MOCK PREPARE: $sql\n", FILE_APPEND);
            return $this->createMockStatement($sql, $this->logFile);
        }
        
        public function set_charset($charset) {
            $timestamp = date('Y-m-d H:i:s');
            file_put_contents($this->logFile, "[$timestamp] MOCK SET CHARSET: $charset\n", FILE_APPEND);
            return true;
        }
        
        private function createMockResult($numRows) {
            return new class($numRows) {
                private $numRows;
                
                public function __construct($numRows) {
                    $this->numRows = $numRows;
                }
                
                public function fetch_assoc() {
                    static $counter = 0;
                    
                    if ($counter < $this->numRows) {
                        $counter++;
                        return ['id' => $counter, 'name' => 'Mock Item ' . $counter];
                    }
                    
                    $counter = 0; // Reset for next time
                    return null;
                }
                
                public function __get($name) {
                    if ($name === 'num_rows') {
                        return $this->numRows;
                    }
                    return null;
                }
            };
        }
        
        private function createMockStatement($sql, $logFile) {
            return new class($sql, $logFile) {
                private $sql;
                private $logFile;
                private $params = [];
                private $types = '';
                
                public function __construct($sql, $logFile) {
                    $this->sql = $sql;
                    $this->logFile = $logFile;
                }
                
                public function bind_param($types, ...$params) {
                    $this->types = $types;
                    $this->params = $params;
                    
                    $timestamp = date('Y-m-d H:i:s');
                    file_put_contents($this->logFile, "[$timestamp] MOCK BIND_PARAM: types=$types, params=" . json_encode($params) . "\n", FILE_APPEND);
                    return true;
                }
                
                public function execute() {
                    $timestamp = date('Y-m-d H:i:s');
                    file_put_contents($this->logFile, "[$timestamp] MOCK EXECUTE: " . $this->sql . " with params: " . json_encode($this->params) . "\n", FILE_APPEND);
                    return true;
                }
                
                public function get_result() {
                    $timestamp = date('Y-m-d H:i:s');
                    file_put_contents($this->logFile, "[$timestamp] MOCK GET_RESULT\n", FILE_APPEND);
                    
                    // If this is a SELECT query checking for existence, return 1 row
                    if (stripos($this->sql, 'SELECT') !== false) {
                        $mockNumRows = 1;
                        if (stripos($this->sql, 'vehicle_id') !== false && !empty($this->params)) {
                            // Extract vehicle ID to make mock data more accurate
                            $vehicleId = $this->params[0] ?? null;
                            if ($vehicleId == 'new_vehicle') {
                                $mockNumRows = 0; // Pretend this is a new vehicle
                            }
                        }
                        return $this->createMockResult($mockNumRows);
                    }
                    
                    return $this->createMockResult(0);
                }
                
                public function close() {
                    $timestamp = date('Y-m-d H:i:s');
                    file_put_contents($this->logFile, "[$timestamp] MOCK CLOSE\n", FILE_APPEND);
                    return true;
                }
                
                private function createMockResult($numRows) {
                    return new class($numRows) {
                        private $numRows;
                        
                        public function __construct($numRows) {
                            $this->numRows = $numRows;
                        }
                        
                        public function fetch_assoc() {
                            static $counter = 0;
                            
                            if ($counter < $this->numRows) {
                                $counter++;
                                return ['id' => $counter, 'name' => 'Mock Item ' . $counter];
                            }
                            
                            $counter = 0; // Reset for next time
                            return null;
                        }
                        
                        public function __get($name) {
                            if ($name === 'num_rows') {
                                return $this->numRows;
                            }
                            return null;
                        }
                    };
                }
            };
        }
    };
    
    return new $mock($logFile);
}
