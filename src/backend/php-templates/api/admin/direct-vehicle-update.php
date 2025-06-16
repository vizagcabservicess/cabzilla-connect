
<?php
/**
 * direct-vehicle-update.php - Update an existing vehicle and sync across all vehicle tables
 * ENHANCED: Now prioritizes database operations and ensures proper synchronization
 */

// Enable error reporting and log test
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode, X-Debug, Origin');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Create logs directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Create cache directory
$cacheDir = __DIR__ . '/../../cache';
if (!file_exists($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}

// Function to log debug info
function logDebug($message, $data = null) {
    global $logDir;
    $logFile = $logDir . '/direct_vehicle_update_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    
    $logMessage = "[$timestamp] $message";
    if ($data !== null) {
        $logMessage .= ": " . json_encode($data);
    }
    
    file_put_contents($logFile, $logMessage . "\n", FILE_APPEND);
}

// Handle OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get input data from various sources
$inputData = file_get_contents('php://input');
$vehicleData = json_decode($inputData, true);

if (!$vehicleData && !empty($_POST)) {
    $vehicleData = $_POST;
}

if (!$vehicleData && !empty($_GET)) {
    $vehicleData = $_GET;
}

logDebug("Received update request", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'data' => $vehicleData,
    'raw' => $inputData
]);

// Check if we have valid data
if (empty($vehicleData)) {
    logDebug("No vehicle data provided");
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'No vehicle data provided'
    ]);
    exit;
}

// Get vehicle ID
$vehicleId = null;
if (isset($vehicleData['id'])) {
    $vehicleId = $vehicleData['id'];
} elseif (isset($vehicleData['vehicleId'])) {
    $vehicleId = $vehicleData['vehicleId'];
} elseif (isset($vehicleData['vehicle_id'])) {
    $vehicleId = $vehicleData['vehicle_id'];
} elseif (isset($_GET['id'])) {
    $vehicleId = $_GET['id'];
}

if (!$vehicleId) {
    logDebug("Vehicle ID is required");
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Vehicle ID is required'
    ]);
    exit;
}

logDebug("Processing vehicle ID: $vehicleId");

// First, try to update the database if possible (DATABASE FIRST APPROACH)
$dbUpdated = false;
$dbVehicle = null;

try {
    // Database connection
    $conn = null;
    
    // Try to connect to database
    $dbHost = 'localhost';
    $dbName = 'u64460565_db_be';
    $dbUser = 'u64460565_usr_be';
    $dbPass = 'Vizag@1213';
    
    $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
    if ($conn->connect_error) {
        logDebug("Failed to connect to database: " . $conn->connect_error);
        $conn = null;
    } else {
        $conn->set_charset("utf8mb4");
    }
    
    if ($conn) {
        logDebug("Connected to database successfully");
        
        // Check if vehicle exists first
        $checkQuery = "SELECT * FROM vehicles WHERE vehicle_id = ?";
        $stmt = $conn->prepare($checkQuery);
        $stmt->bind_param('s', $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            // Get existing database record
            $dbVehicle = $result->fetch_assoc();
            logDebug("Found existing vehicle in database", $dbVehicle);
            
            // Prepare update fields
            $updateFields = [];
            $updateValues = [];
            $updateTypes = '';
            
            // Basic fields
            if (isset($vehicleData['name'])) {
                $updateFields[] = "name = ?";
                $updateValues[] = $vehicleData['name'];
                $updateTypes .= 's';
            }
            
            if (isset($vehicleData['capacity'])) {
                $updateFields[] = "capacity = ?";
                $updateValues[] = intval($vehicleData['capacity']);
                $updateTypes .= 'i';
            }
            
            if (isset($vehicleData['luggageCapacity'])) {
                $updateFields[] = "luggage_capacity = ?";
                $updateValues[] = intval($vehicleData['luggageCapacity']);
                $updateTypes .= 'i';
            }
            
            if (isset($vehicleData['basePrice'])) {
                $updateFields[] = "base_price = ?";
                $updateValues[] = floatval($vehicleData['basePrice']);
                $updateTypes .= 'd';
            }
            
            if (isset($vehicleData['pricePerKm'])) {
                $updateFields[] = "price_per_km = ?";
                $updateValues[] = floatval($vehicleData['pricePerKm']);
                $updateTypes .= 'd';
            }
            
            if (isset($vehicleData['image'])) {
                $updateFields[] = "image = ?";
                $updateValues[] = $vehicleData['image'];
                $updateTypes .= 's';
            }
            
            if (isset($vehicleData['description'])) {
                $updateFields[] = "description = ?";
                $updateValues[] = $vehicleData['description'];
                $updateTypes .= 's';
            }
            
            if (isset($vehicleData['ac'])) {
                $updateFields[] = "ac = ?";
                $updateValues[] = $vehicleData['ac'] ? 1 : 0;
                $updateTypes .= 'i';
            }
            
            if (isset($vehicleData['nightHaltCharge'])) {
                $updateFields[] = "night_halt_charge = ?";
                $updateValues[] = floatval($vehicleData['nightHaltCharge']);
                $updateTypes .= 'd';
            }
            
            if (isset($vehicleData['driverAllowance'])) {
                $updateFields[] = "driver_allowance = ?";
                $updateValues[] = floatval($vehicleData['driverAllowance']);
                $updateTypes .= 'd';
            }
            
            if (isset($vehicleData['isActive'])) {
                $updateFields[] = "is_active = ?";
                $updateValues[] = $vehicleData['isActive'] ? 1 : 0;
                $updateTypes .= 'i';
            }
            
            // Handle amenities
            if (isset($vehicleData['amenities'])) {
                $amenitiesValue = '';
                if (is_array($vehicleData['amenities'])) {
                    $amenitiesValue = json_encode($vehicleData['amenities']);
                } else if (is_string($vehicleData['amenities'])) {
                    if (substr($vehicleData['amenities'], 0, 1) === '[') {
                        $amenitiesValue = $vehicleData['amenities'];
                    } else {
                        $amenitiesArray = array_map('trim', explode(',', $vehicleData['amenities']));
                        $amenitiesValue = json_encode($amenitiesArray);
                    }
                }
                $updateFields[] = "amenities = ?";
                $updateValues[] = $amenitiesValue;
                $updateTypes .= 's';
            }
            
            // Handle new fields - inclusions, exclusions, cancellationPolicy, fuelType
            if (isset($vehicleData['inclusions'])) {
                $inclusionsValue = '';
                if (is_array($vehicleData['inclusions'])) {
                    $inclusionsValue = json_encode($vehicleData['inclusions']);
                } else {
                    $inclusionsValue = (string)$vehicleData['inclusions'];
                }
                
                // Check if column exists first
                $columnCheck = $conn->query("SHOW COLUMNS FROM vehicles LIKE 'inclusions'");
                if ($columnCheck->num_rows === 0) {
                    // Add column if it doesn't exist
                    $conn->query("ALTER TABLE vehicles ADD COLUMN inclusions TEXT DEFAULT NULL");
                    logDebug("Added inclusions column to vehicles table");
                }
                
                $updateFields[] = "inclusions = ?";
                $updateValues[] = $inclusionsValue;
                $updateTypes .= 's';
            }
            
            if (isset($vehicleData['exclusions'])) {
                $exclusionsValue = '';
                if (is_array($vehicleData['exclusions'])) {
                    $exclusionsValue = json_encode($vehicleData['exclusions']);
                } else {
                    $exclusionsValue = (string)$vehicleData['exclusions'];
                }
                
                // Check if column exists first
                $columnCheck = $conn->query("SHOW COLUMNS FROM vehicles LIKE 'exclusions'");
                if ($columnCheck->num_rows === 0) {
                    // Add column if it doesn't exist
                    $conn->query("ALTER TABLE vehicles ADD COLUMN exclusions TEXT DEFAULT NULL");
                    logDebug("Added exclusions column to vehicles table");
                }
                
                $updateFields[] = "exclusions = ?";
                $updateValues[] = $exclusionsValue;
                $updateTypes .= 's';
            }
            
            if (isset($vehicleData['cancellationPolicy'])) {
                $cancellationPolicy = (string)$vehicleData['cancellationPolicy'];
                
                // Check if column exists first
                $columnCheck = $conn->query("SHOW COLUMNS FROM vehicles LIKE 'cancellation_policy'");
                if ($columnCheck->num_rows === 0) {
                    // Add column if it doesn't exist
                    $conn->query("ALTER TABLE vehicles ADD COLUMN cancellation_policy TEXT DEFAULT NULL");
                    logDebug("Added cancellation_policy column to vehicles table");
                }
                
                $updateFields[] = "cancellation_policy = ?";
                $updateValues[] = $cancellationPolicy;
                $updateTypes .= 's';
            }
            
            if (isset($vehicleData['fuelType'])) {
                $fuelType = (string)$vehicleData['fuelType'];
                
                // Check if column exists first
                $columnCheck = $conn->query("SHOW COLUMNS FROM vehicles LIKE 'fuel_type'");
                if ($columnCheck->num_rows === 0) {
                    // Add column if it doesn't exist
                    $conn->query("ALTER TABLE vehicles ADD COLUMN fuel_type VARCHAR(50) DEFAULT NULL");
                    logDebug("Added fuel_type column to vehicles table");
                }
                
                $updateFields[] = "fuel_type = ?";
                $updateValues[] = $fuelType;
                $updateTypes .= 's';
            }
            
            // Always update the updated_at timestamp
            $updateFields[] = "updated_at = NOW()";
            
            if (!empty($updateFields)) {
                // Build and execute update query
                $query = "UPDATE vehicles SET " . implode(", ", $updateFields) . " WHERE vehicle_id = ?";
                $updateValues[] = $vehicleId;
                $updateTypes .= 's';
                
                logDebug("Executing update query", ['query' => $query, 'values' => $updateValues]);
                
                $stmt = $conn->prepare($query);
                $stmt->bind_param($updateTypes, ...$updateValues);
                
                $updateResult = $stmt->execute();
                $affectedRows = $stmt->affected_rows;
                
                if ($stmt->error) {
                    logDebug("SQL Error: " . $stmt->error);
                }
                
                if ($updateResult && $affectedRows >= 0) {
                    logDebug("Updated in database: " . $affectedRows . " rows affected");
                    $dbUpdated = true;
                    
                    // Re-fetch the updated row
                    $checkQuery = "SELECT * FROM vehicles WHERE vehicle_id = ?";
                    $stmt2 = $conn->prepare($checkQuery);
                    $stmt2->bind_param('s', $vehicleId);
                    $stmt2->execute();
                    $result2 = $stmt2->get_result();
                    if ($result2->num_rows > 0) {
                        $dbVehicle = $result2->fetch_assoc();
                        logDebug("Re-fetched updated vehicle", $dbVehicle);
                    }
                } else {
                    logDebug("Database update failed: " . $stmt->error);
                }
            } else {
                logDebug("No fields to update");
            }
        } else {
            logDebug("Vehicle not found in database for update");
        }
        
        $conn->close();
    } else {
        logDebug("Could not connect to database, skipping database update");
    }
} catch (Exception $e) {
    logDebug("Database error: " . $e->getMessage());
}

// Create vehicle object from database or input data
$vehicle = [];

if ($dbVehicle) {
    // Use database record as base
    $vehicle = [
        'id' => $dbVehicle['vehicle_id'],
        'vehicleId' => $dbVehicle['vehicle_id'],
        'name' => $dbVehicle['name'],
        'capacity' => intval($dbVehicle['capacity']),
        'luggageCapacity' => intval($dbVehicle['luggage_capacity']),
        'price' => floatval($dbVehicle['base_price']),
        'basePrice' => floatval($dbVehicle['base_price']),
        'pricePerKm' => floatval($dbVehicle['price_per_km']),
        'image' => $dbVehicle['image'],
        'description' => $dbVehicle['description'],
        'ac' => (bool)$dbVehicle['ac'],
        'nightHaltCharge' => floatval($dbVehicle['night_halt_charge']),
        'driverAllowance' => floatval($dbVehicle['driver_allowance']),
        'isActive' => (bool)$dbVehicle['is_active'],
        'inclusions' => isset($dbVehicle['inclusions']) ? 
            (json_decode($dbVehicle['inclusions'], true) ?: (string)$dbVehicle['inclusions']) : 
            (isset($vehicleData['inclusions']) ? $vehicleData['inclusions'] : []),
        'exclusions' => isset($dbVehicle['exclusions']) ? 
            (json_decode($dbVehicle['exclusions'], true) ?: (string)$dbVehicle['exclusions']) : 
            (isset($vehicleData['exclusions']) ? $vehicleData['exclusions'] : []),
        'cancellationPolicy' => isset($dbVehicle['cancellation_policy']) ? 
            $dbVehicle['cancellation_policy'] : 
            (isset($vehicleData['cancellationPolicy']) ? $vehicleData['cancellationPolicy'] : ''),
        'fuelType' => isset($dbVehicle['fuel_type']) ? 
            $dbVehicle['fuel_type'] : 
            (isset($vehicleData['fuelType']) ? $vehicleData['fuelType'] : ''),
    ];
    
    // Parse amenities from database
    if (!empty($dbVehicle['amenities'])) {
        try {
            $amenities = json_decode($dbVehicle['amenities'], true);
            if (is_array($amenities)) {
                $vehicle['amenities'] = $amenities;
            } else {
                $vehicle['amenities'] = array_map('trim', explode(',', $dbVehicle['amenities']));
            }
        } catch (Exception $e) {
            $vehicle['amenities'] = array_map('trim', explode(',', $dbVehicle['amenities']));
        }
    } else {
        $vehicle['amenities'] = ['AC'];
    }
    
    logDebug("Using database record as base for vehicle object", $vehicle);
} else {
    // Use input data as base
    $vehicle = [
        'id' => $vehicleId,
        'vehicleId' => $vehicleId,
        'name' => isset($vehicleData['name']) ? $vehicleData['name'] : ucwords(str_replace('_', ' ', $vehicleId)),
        'capacity' => isset($vehicleData['capacity']) ? (int)$vehicleData['capacity'] : 4,
        'luggageCapacity' => isset($vehicleData['luggageCapacity']) ? (int)$vehicleData['luggageCapacity'] : 2,
        'price' => isset($vehicleData['price']) ? (float)$vehicleData['price'] : 0,
        'basePrice' => isset($vehicleData['basePrice']) ? (float)$vehicleData['basePrice'] : 0,
        'pricePerKm' => isset($vehicleData['pricePerKm']) ? (float)$vehicleData['pricePerKm'] : 0,
        'image' => isset($vehicleData['image']) ? $vehicleData['image'] : "/cars/{$vehicleId}.png",
        'description' => isset($vehicleData['description']) ? $vehicleData['description'] : '',
        'ac' => isset($vehicleData['ac']) ? (bool)$vehicleData['ac'] : true,
        'nightHaltCharge' => isset($vehicleData['nightHaltCharge']) ? (float)$vehicleData['nightHaltCharge'] : 700,
        'driverAllowance' => isset($vehicleData['driverAllowance']) ? (float)$vehicleData['driverAllowance'] : 250,
        'isActive' => isset($vehicleData['isActive']) ? (bool)$vehicleData['isActive'] : true,
        'inclusions' => isset($vehicleData['inclusions']) ? $vehicleData['inclusions'] : [],
        'exclusions' => isset($vehicleData['exclusions']) ? $vehicleData['exclusions'] : [],
        'cancellationPolicy' => isset($vehicleData['cancellationPolicy']) ? $vehicleData['cancellationPolicy'] : '',
        'fuelType' => isset($vehicleData['fuelType']) ? $vehicleData['fuelType'] : '',
    ];
    
    // Handle amenities
    if (isset($vehicleData['amenities'])) {
        if (is_string($vehicleData['amenities'])) {
            try {
                $amenities = json_decode($vehicleData['amenities'], true);
                if (is_array($amenities)) {
                    $vehicle['amenities'] = $amenities;
                } else {
                    $vehicle['amenities'] = array_map('trim', explode(',', $vehicleData['amenities']));
                }
            } catch (Exception $e) {
                $vehicle['amenities'] = array_map('trim', explode(',', $vehicleData['amenities']));
            }
        } else {
            $vehicle['amenities'] = $vehicleData['amenities'];
        }
    } else {
        $vehicle['amenities'] = ['AC'];
    }
    
    logDebug("Using input data as base for vehicle object", $vehicle);
}

// Update persistent cache
$persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
$persistentData = [];

if (file_exists($persistentCacheFile)) {
    try {
        $persistentJson = file_get_contents($persistentCacheFile);
        $persistentData = json_decode($persistentJson, true);
        if (!is_array($persistentData)) {
            logDebug("Persistent data is not an array, resetting");
            $persistentData = [];
        }
    } catch (Exception $e) {
        logDebug("Error reading persistent cache: " . $e->getMessage());
        $persistentData = [];
    }
}

// Find vehicle in persistent data
$vehicleIndex = -1;
foreach ($persistentData as $index => $existingVehicle) {
    $curId = isset($existingVehicle['id']) ? $existingVehicle['id'] : (isset($existingVehicle['vehicleId']) ? $existingVehicle['vehicleId'] : '');
    if ($curId === $vehicleId) {
        $vehicleIndex = $index;
        break;
    }
}

if ($vehicleIndex >= 0) {
    // Update existing vehicle in persistent cache
    $persistentData[$vehicleIndex] = $vehicle;
    logDebug("Updated existing vehicle in persistent cache");
} else {
    // Add new vehicle to persistent cache
    $persistentData[] = $vehicle;
    logDebug("Added new vehicle to persistent cache");
}

// Save back to persistent cache
$saveResult = file_put_contents($persistentCacheFile, json_encode($persistentData, JSON_PRETTY_PRINT));
if ($saveResult === false) {
    logDebug("Failed to save to persistent cache");
} else {
    logDebug("Saved to persistent cache successfully");
}

// Clear any temporary cache files
$cacheFiles = glob($cacheDir . '/vehicles_*.json');
foreach ($cacheFiles as $file) {
    if ($file !== $persistentCacheFile && !strpos($file, 'persistent_backup')) {
        unlink($file);
        logDebug("Cleared cache file: " . basename($file));
    }
}

// Return success response
echo json_encode([
    'status' => 'success',
    'message' => 'Vehicle updated successfully' . ($dbUpdated ? ' and saved to database' : ''),
    'vehicle' => $vehicle,
    'dbUpdated' => $dbUpdated,
    'reload' => true
]);

logDebug("Vehicle update completed successfully", $vehicle);
?>
