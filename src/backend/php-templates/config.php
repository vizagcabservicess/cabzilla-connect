
<?php
/**
 * Configuration file for database and application settings
 */

// Database connection configuration
$db_host = 'localhost';
$db_user = 'u64460565_usr_be';
$db_pass = 'Vizag@1213';
$db_name = 'u64460565_db_be';

// Function to get database connection
function getDbConnection() {
    global $db_host, $db_user, $db_pass, $db_name;
    
    // For development/mock purposes, we'll simulate the DB connection and return a mock object if needed
    if (defined('MOCK_DB') && MOCK_DB === true) {
        return createMockDbConnection();
    }
    
    // Check for in-memory DB mode (for preview environments)
    $isPreview = false;
    $host = $_SERVER['HTTP_HOST'] ?? '';
    if (strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false || strpos($host, 'demo') !== false) {
        $isPreview = true;
    }
    
    if ($isPreview) {
        return createPreviewDbConnection();
    }
    
    // Create a real connection
    try {
        $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
        
        // Check connection
        if ($conn->connect_error) {
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
        
        // Set character set
        $conn->set_charset("utf8mb4");
        
        return $conn;
    } catch (Exception $e) {
        // If real connection fails, fall back to in-memory for development
        error_log("Real DB connection failed, falling back to preview mode: " . $e->getMessage());
        return createPreviewDbConnection();
    }
}

// Create a mock/in-memory database for preview environments
function createPreviewDbConnection() {
    // Create an object that simulates MySQLi
    $conn = new class {
        public $cache_dir;
        public $tables = [];
        public $insert_id = 0;
        public $affected_rows = 0;
        public $error = '';
        public $errno = 0;
        
        function __construct() {
            // Create cache directory if it doesn't exist
            $this->cache_dir = __DIR__ . '/cache';
            if (!file_exists($this->cache_dir)) {
                mkdir($this->cache_dir, 0755, true);
            }
            
            // Initialize tables if needed
            $this->createTablesIfNotExist();
        }
        
        function createTablesIfNotExist() {
            // Check and create tables if they don't exist
            $vehiclesFile = $this->cache_dir . '/vehicles.json';
            $localFaresFile = $this->cache_dir . '/local_package_fares.json';
            $airportFaresFile = $this->cache_dir . '/airport_transfer_fares.json';
            $outstationFaresFile = $this->cache_dir . '/outstation_fares.json';
            
            if (!file_exists($vehiclesFile)) {
                file_put_contents($vehiclesFile, json_encode([]));
            }
            
            if (!file_exists($localFaresFile)) {
                file_put_contents($localFaresFile, json_encode([]));
            }
            
            if (!file_exists($airportFaresFile)) {
                file_put_contents($airportFaresFile, json_encode([]));
            }
            
            if (!file_exists($outstationFaresFile)) {
                file_put_contents($outstationFaresFile, json_encode([]));
            }
            
            // Load tables into memory
            $this->tables['vehicles'] = json_decode(file_get_contents($vehiclesFile), true) ?: [];
            $this->tables['local_package_fares'] = json_decode(file_get_contents($localFaresFile), true) ?: [];
            $this->tables['airport_transfer_fares'] = json_decode(file_get_contents($airportFaresFile), true) ?: [];
            $this->tables['outstation_fares'] = json_decode(file_get_contents($outstationFaresFile), true) ?: [];
            
            // Also load from vehicles_persistent.json if it exists
            $persistentFile = $this->cache_dir . '/vehicles_persistent.json';
            if (file_exists($persistentFile)) {
                $persistentData = json_decode(file_get_contents($persistentFile), true) ?: [];
                
                // Convert to DB schema and update tables
                foreach ($persistentData as $vehicle) {
                    $dbVehicle = $this->convertToDbSchema($vehicle);
                    
                    // Check if vehicle already exists in our table
                    $found = false;
                    foreach ($this->tables['vehicles'] as &$v) {
                        if ($v['vehicle_id'] === $dbVehicle['vehicle_id']) {
                            $v = $dbVehicle; // Update
                            $found = true;
                            break;
                        }
                    }
                    
                    if (!$found) {
                        $this->tables['vehicles'][] = $dbVehicle; // Add new
                    }
                }
                
                // Save updated vehicles table
                file_put_contents($vehiclesFile, json_encode($this->tables['vehicles'], JSON_PRETTY_PRINT));
            }
        }
        
        function convertToDbSchema($vehicle) {
            // Convert from frontend schema to DB schema
            return [
                'id' => count($this->tables['vehicles']) + 1,
                'vehicle_id' => $vehicle['id'] ?? $vehicle['vehicleId'] ?? '',
                'name' => $vehicle['name'] ?? '',
                'capacity' => $vehicle['capacity'] ?? 4,
                'luggage_capacity' => $vehicle['luggageCapacity'] ?? 2,
                'ac' => isset($vehicle['ac']) ? ($vehicle['ac'] ? 1 : 0) : 1,
                'image' => $vehicle['image'] ?? '',
                'amenities' => json_encode($vehicle['amenities'] ?? ['AC']),
                'description' => $vehicle['description'] ?? '',
                'is_active' => isset($vehicle['isActive']) ? ($vehicle['isActive'] ? 1 : 0) : 1,
                'base_price' => $vehicle['basePrice'] ?? $vehicle['price'] ?? 0,
                'price_per_km' => $vehicle['pricePerKm'] ?? 0,
                'night_halt_charge' => $vehicle['nightHaltCharge'] ?? 700,
                'driver_allowance' => $vehicle['driverAllowance'] ?? 250,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ];
        }
        
        function query($sql) {
            // Simple query execution
            $this->error = '';
            $table = '';
            
            // Very basic SQL parsing
            if (preg_match('/CREATE TABLE IF NOT EXISTS (\w+)/i', $sql, $matches)) {
                $table = $matches[1];
                // Just return true for CREATE TABLE statements
                return true;
            } else if (preg_match('/SELECT .* FROM (\w+)/i', $sql, $matches)) {
                $table = $matches[1];
                
                // Handle COUNT query
                if (strpos($sql, 'COUNT(*)') !== false) {
                    return new class($this->tables[$table] ?? []) {
                        private $data;
                        private $position = 0;
                        
                        function __construct($data) {
                            $this->data = $data;
                        }
                        
                        function fetch_assoc() {
                            return ['count' => count($this->data)];
                        }
                        
                        function get_result() {
                            return $this;
                        }
                        
                        function num_rows() {
                            return 1;
                        }
                    };
                }
                
                // Basic SELECT, return all rows for now
                return new class($this->tables[$table] ?? []) {
                    private $data;
                    private $position = 0;
                    
                    function __construct($data) {
                        $this->data = $data;
                    }
                    
                    function fetch_assoc() {
                        if ($this->position >= count($this->data)) {
                            return null;
                        }
                        
                        return $this->data[$this->position++];
                    }
                    
                    function get_result() {
                        return $this;
                    }
                    
                    function num_rows() {
                        return count($this->data);
                    }
                };
            }
            
            // Default behavior
            return true;
        }
        
        function prepare($sql) {
            $self = $this;
            
            return new class($sql, $self) {
                private $sql;
                private $db;
                private $params = [];
                private $types = '';
                public $error = '';
                
                function __construct($sql, $db) {
                    $this->sql = $sql;
                    $this->db = $db;
                }
                
                function bind_param($types, ...$params) {
                    $this->types = $types;
                    $this->params = $params;
                    return true;
                }
                
                function execute() {
                    // Basic SQL operations handling
                    $sql = $this->sql;
                    $table = '';
                    
                    if (preg_match('/INSERT INTO (\w+)/i', $sql, $matches)) {
                        $table = $matches[1];
                        
                        // Handle INSERT
                        if (!isset($this->db->tables[$table])) {
                            $this->db->tables[$table] = [];
                        }
                        
                        // Create a new row with auto increment ID
                        $id = count($this->db->tables[$table]) + 1;
                        $row = ['id' => $id];
                        
                        // For vehicles table, extract columns and values
                        if ($table === 'vehicles') {
                            $columns = [];
                            if (preg_match('/\((.*?)\) VALUES/i', $sql, $matches)) {
                                $columns = array_map('trim', explode(',', $matches[1]));
                                
                                // Map params to columns
                                for ($i = 0; $i < count($columns); $i++) {
                                    if (isset($this->params[$i])) {
                                        $row[$columns[$i]] = $this->params[$i];
                                    }
                                }
                                
                                // Save to file
                                $this->db->tables[$table][] = $row;
                                file_put_contents($this->db->cache_dir . "/$table.json", json_encode($this->db->tables[$table], JSON_PRETTY_PRINT));
                                
                                // Update persistent cache too
                                $frontendVehicle = $this->convertToFrontendSchema($row);
                                $persistentFile = $this->db->cache_dir . '/vehicles_persistent.json';
                                $persistentData = [];
                                
                                if (file_exists($persistentFile)) {
                                    $persistentData = json_decode(file_get_contents($persistentFile), true) ?: [];
                                }
                                
                                // Check if vehicle exists in persistent data
                                $found = false;
                                foreach ($persistentData as &$v) {
                                    if ($v['id'] === $frontendVehicle['id'] || $v['vehicleId'] === $frontendVehicle['id']) {
                                        $v = $frontendVehicle; // Update
                                        $found = true;
                                        break;
                                    }
                                }
                                
                                if (!$found) {
                                    $persistentData[] = $frontendVehicle; // Add new
                                }
                                
                                file_put_contents($persistentFile, json_encode($persistentData, JSON_PRETTY_PRINT));
                            }
                        }
                        
                        $this->db->insert_id = $id;
                        $this->db->affected_rows = 1;
                        
                    } else if (preg_match('/UPDATE (\w+)/i', $sql, $matches)) {
                        $table = $matches[1];
                        
                        // Handle UPDATE
                        if (isset($this->db->tables[$table])) {
                            // For vehicles table with WHERE vehicle_id = ?
                            if ($table === 'vehicles' && strpos($sql, 'WHERE vehicle_id = ?') !== false) {
                                // The vehicle_id is the last parameter
                                $vehicleId = end($this->params);
                                
                                // Find the vehicle
                                foreach ($this->db->tables[$table] as &$row) {
                                    if ($row['vehicle_id'] === $vehicleId) {
                                        // Extract column names from SET clause
                                        if (preg_match('/SET(.*?)WHERE/is', $sql, $matches)) {
                                            $setParts = explode(',', $matches[1]);
                                            $columnCount = 0;
                                            
                                            foreach ($setParts as $setPart) {
                                                if (preg_match('/(\w+)\s*=\s*\?/', $setPart, $colMatch)) {
                                                    $column = $colMatch[1];
                                                    $row[$column] = $this->params[$columnCount++];
                                                }
                                            }
                                        }
                                        
                                        break;
                                    }
                                }
                                
                                // Save to file
                                file_put_contents($this->db->cache_dir . "/$table.json", json_encode($this->db->tables[$table], JSON_PRETTY_PRINT));
                                
                                // Update persistent cache too
                                $persistentFile = $this->db->cache_dir . '/vehicles_persistent.json';
                                $persistentData = [];
                                
                                if (file_exists($persistentFile)) {
                                    $persistentData = json_decode(file_get_contents($persistentFile), true) ?: [];
                                }
                                
                                // Update vehicle in persistent data
                                foreach ($this->db->tables[$table] as $dbVehicle) {
                                    if ($dbVehicle['vehicle_id'] === $vehicleId) {
                                        $frontendVehicle = $this->convertToFrontendSchema($dbVehicle);
                                        
                                        // Find and update in persistent data
                                        $found = false;
                                        foreach ($persistentData as &$v) {
                                            if ($v['id'] === $vehicleId || $v['vehicleId'] === $vehicleId) {
                                                $v = $frontendVehicle;
                                                $found = true;
                                                break;
                                            }
                                        }
                                        
                                        if (!$found) {
                                            $persistentData[] = $frontendVehicle;
                                        }
                                        
                                        break;
                                    }
                                }
                                
                                file_put_contents($persistentFile, json_encode($persistentData, JSON_PRETTY_PRINT));
                            }
                            
                            $this->db->affected_rows = 1;
                        }
                    } else if (preg_match('/DELETE FROM (\w+)/i', $sql, $matches)) {
                        $table = $matches[1];
                        
                        // Handle DELETE
                        if (isset($this->db->tables[$table])) {
                            // For vehicles table with WHERE vehicle_id = ?
                            if ($table === 'vehicles' && strpos($sql, 'WHERE vehicle_id = ?') !== false) {
                                // The vehicle_id is the last parameter
                                $vehicleId = end($this->params);
                                
                                $deleted = false;
                                foreach ($this->db->tables[$table] as $index => $row) {
                                    if ($row['vehicle_id'] === $vehicleId) {
                                        array_splice($this->db->tables[$table], $index, 1);
                                        $deleted = true;
                                        break;
                                    }
                                }
                                
                                if ($deleted) {
                                    // Save to file
                                    file_put_contents($this->db->cache_dir . "/$table.json", json_encode($this->db->tables[$table], JSON_PRETTY_PRINT));
                                    
                                    // Update persistent cache too
                                    $persistentFile = $this->db->cache_dir . '/vehicles_persistent.json';
                                    if (file_exists($persistentFile)) {
                                        $persistentData = json_decode(file_get_contents($persistentFile), true) ?: [];
                                        
                                        // Remove from persistent data
                                        foreach ($persistentData as $index => $v) {
                                            if ($v['id'] === $vehicleId || $v['vehicleId'] === $vehicleId) {
                                                array_splice($persistentData, $index, 1);
                                                break;
                                            }
                                        }
                                        
                                        file_put_contents($persistentFile, json_encode($persistentData, JSON_PRETTY_PRINT));
                                    }
                                }
                            }
                            
                            $this->db->affected_rows = 1;
                        }
                    } else if (preg_match('/SELECT/i', $sql)) {
                        // Handle SELECT
                        if (preg_match('/FROM (\w+)/i', $sql, $matches)) {
                            $table = $matches[1];
                            
                            // For vehicles table with WHERE vehicle_id = ?
                            if ($table === 'vehicles' && strpos($sql, 'WHERE vehicle_id = ?') !== false) {
                                // The vehicle_id is the parameter
                                $vehicleId = $this->params[0];
                                
                                $results = [];
                                foreach ($this->db->tables[$table] as $row) {
                                    if ($row['vehicle_id'] === $vehicleId) {
                                        $results[] = $row;
                                        break;
                                    }
                                }
                                
                                return new class($results) {
                                    private $data;
                                    private $position = 0;
                                    
                                    function __construct($data) {
                                        $this->data = $data;
                                    }
                                    
                                    function fetch_assoc() {
                                        if ($this->position >= count($this->data)) {
                                            return null;
                                        }
                                        
                                        return $this->data[$this->position++];
                                    }
                                    
                                    function get_result() {
                                        return $this;
                                    }
                                    
                                    function num_rows() {
                                        return count($this->data);
                                    }
                                };
                            } else if ($table === 'vehicles') {
                                // General SELECT on vehicles
                                return new class($this->db->tables[$table] ?? []) {
                                    private $data;
                                    private $position = 0;
                                    
                                    function __construct($data) {
                                        $this->data = $data;
                                    }
                                    
                                    function fetch_assoc() {
                                        if ($this->position >= count($this->data)) {
                                            return null;
                                        }
                                        
                                        return $this->data[$this->position++];
                                    }
                                    
                                    function get_result() {
                                        return $this;
                                    }
                                    
                                    function num_rows() {
                                        return count($this->data);
                                    }
                                };
                            }
                        }
                    }
                    
                    return true;
                }
                
                function get_result() {
                    // For SELECT COUNT query
                    if (strpos($this->sql, 'COUNT(*)') !== false && preg_match('/FROM (\w+)/i', $this->sql, $matches)) {
                        $table = $matches[1];
                        
                        if (strpos($this->sql, 'WHERE vehicle_id = ?') !== false) {
                            $vehicleId = $this->params[0];
                            $count = 0;
                            
                            foreach ($this->db->tables[$table] as $row) {
                                if ($row['vehicle_id'] === $vehicleId) {
                                    $count = 1;
                                    break;
                                }
                            }
                            
                            return new class($count) {
                                private $count;
                                
                                function __construct($count) {
                                    $this->count = $count;
                                }
                                
                                function fetch_assoc() {
                                    return ['count' => $this->count];
                                }
                            };
                        } else {
                            // General COUNT query
                            return new class(isset($this->db->tables[$table]) ? count($this->db->tables[$table]) : 0) {
                                private $count;
                                
                                function __construct($count) {
                                    $this->count = $count;
                                }
                                
                                function fetch_assoc() {
                                    return ['count' => $this->count];
                                }
                            };
                        }
                    }
                    
                    return null;
                }
                
                function convertToFrontendSchema($dbVehicle) {
                    // Convert from DB schema to frontend schema
                    $amenities = $dbVehicle['amenities'];
                    if (is_string($amenities)) {
                        try {
                            $amenities = json_decode($amenities, true);
                            if (!is_array($amenities)) {
                                $amenities = ['AC'];
                            }
                        } catch (Exception $e) {
                            $amenities = ['AC'];
                        }
                    }
                    
                    return [
                        'id' => $dbVehicle['vehicle_id'],
                        'vehicleId' => $dbVehicle['vehicle_id'],
                        'name' => $dbVehicle['name'],
                        'capacity' => (int)$dbVehicle['capacity'],
                        'luggageCapacity' => (int)$dbVehicle['luggage_capacity'],
                        'price' => (float)$dbVehicle['base_price'],
                        'basePrice' => (float)$dbVehicle['base_price'],
                        'pricePerKm' => (float)$dbVehicle['price_per_km'],
                        'image' => $dbVehicle['image'],
                        'amenities' => $amenities,
                        'description' => $dbVehicle['description'],
                        'ac' => (bool)$dbVehicle['ac'],
                        'nightHaltCharge' => (float)$dbVehicle['night_halt_charge'],
                        'driverAllowance' => (float)$dbVehicle['driver_allowance'],
                        'isActive' => (bool)$dbVehicle['is_active']
                    ];
                }
            };
        }
        
        function set_charset($charset) {
            // Just a stub
            return true;
        }
    };
    
    return $conn;
}

// Create a mock database connection for unit tests
function createMockDbConnection() {
    // Similar to preview connection but with in-memory tables only
    // ... implementation omitted for brevity ...
    return createPreviewDbConnection(); // Just use preview for now
}

// App configuration
define('APP_URL', 'https://vizagtaxihub.com');
define('APP_NAME', 'Vizag Taxi Hub');
define('APP_EMAIL', 'info@vizagtaxihub.com');
define('APP_PHONE', '+91-9876543210');

// Cache settings
define('CACHE_ENABLED', true);
define('CACHE_DURATION', 3600); // 1 hour

// API settings
define('API_RATE_LIMIT', 100); // Per minute
