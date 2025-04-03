
<?php
// fix-vehicle-tables.php - Fixes database tables for vehicles and pricing

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check if database config is included
if (!function_exists('getDbConnection')) {
    require_once __DIR__ . '/../../config.php';
}

try {
    // Connect to database
    $conn = getDbConnection();
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    $result = [
        'status' => 'success',
        'message' => 'Database tables fixed successfully',
        'details' => []
    ];
    
    // Fix vehicle_types table
    $vehicleTypesFixed = fixVehicleTypesTable($conn);
    $result['details']['vehicle_types_fixed'] = $vehicleTypesFixed;
    
    // Fix vehicle_pricing table
    $vehiclePricingFixed = fixVehiclePricingTable($conn);
    $result['details']['vehicle_pricing_fixed'] = $vehiclePricingFixed;
    
    // Fix airport_transfer_fares table
    $airportFaresFixed = fixAirportTransferFaresTable($conn);
    $result['details']['airport_fares_fixed'] = $airportFaresFixed;
    
    // Fix local_package_fares table
    $localFaresFixed = fixLocalPackageFaresTable($conn);
    $result['details']['local_fares_fixed'] = $localFaresFixed;
    
    // Fix outstation_fares table
    $outstationFaresFixed = fixOutstationFaresTable($conn);
    $result['details']['outstation_fares_fixed'] = $outstationFaresFixed;
    
    // Create pricing entries for all vehicles and trip types
    $pricingEntriesCreated = createPricingEntries($conn);
    $result['details']['pricing_entries_created'] = $pricingEntriesCreated;
    
    // Return success response
    echo json_encode($result);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}

/**
 * Fix vehicle_types table
 */
function fixVehicleTypesTable($conn) {
    $result = [];
    
    try {
        // Check if the table exists
        $checkTable = $conn->query("SHOW TABLES LIKE 'vehicle_types'");
        if ($checkTable->num_rows === 0) {
            // Create the table
            $conn->query("
                CREATE TABLE IF NOT EXISTS vehicle_types (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    vehicle_id VARCHAR(50) NOT NULL UNIQUE,
                    name VARCHAR(100) NOT NULL,
                    capacity INT DEFAULT 4,
                    luggage_capacity INT DEFAULT 2,
                    ac TINYINT(1) DEFAULT 1,
                    image VARCHAR(255) DEFAULT '/cars/sedan.png',
                    amenities TEXT DEFAULT NULL,
                    description TEXT DEFAULT NULL,
                    is_active TINYINT(1) DEFAULT 1,
                    base_price DECIMAL(10,2) DEFAULT 0,
                    price_per_km DECIMAL(10,2) DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");
            $result[] = "Created vehicle_types table";
        } else {
            // Check and add columns if they don't exist
            $columns = [
                'vehicle_id' => 'VARCHAR(50) NOT NULL',
                'name' => 'VARCHAR(100) NOT NULL',
                'capacity' => 'INT DEFAULT 4',
                'luggage_capacity' => 'INT DEFAULT 2',
                'ac' => 'TINYINT(1) DEFAULT 1',
                'image' => 'VARCHAR(255) DEFAULT \'/cars/sedan.png\'',
                'amenities' => 'TEXT DEFAULT NULL',
                'description' => 'TEXT DEFAULT NULL',
                'is_active' => 'TINYINT(1) DEFAULT 1',
                'base_price' => 'DECIMAL(10,2) DEFAULT 0',
                'price_per_km' => 'DECIMAL(10,2) DEFAULT 0',
                'created_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
                'updated_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
            ];
            
            foreach ($columns as $column => $definition) {
                $checkColumn = $conn->query("SHOW COLUMNS FROM vehicle_types LIKE '$column'");
                if ($checkColumn->num_rows === 0) {
                    $conn->query("ALTER TABLE vehicle_types ADD COLUMN $column $definition");
                    $result[] = "Added column $column to vehicle_types table";
                }
            }
            
            // Ensure unique constraint on vehicle_id
            $checkIndex = $conn->query("SHOW INDEX FROM vehicle_types WHERE Key_name = 'vehicle_id' AND Column_name = 'vehicle_id'");
            if ($checkIndex->num_rows === 0) {
                try {
                    $conn->query("ALTER TABLE vehicle_types ADD UNIQUE KEY vehicle_id (vehicle_id)");
                    $result[] = "Added unique constraint on vehicle_id to vehicle_types table";
                } catch (Exception $e) {
                    $result[] = "Failed to add unique constraint on vehicle_id: " . $e->getMessage();
                }
            }
        }
        
        return $result;
    } catch (Exception $e) {
        return ["Error fixing vehicle_types table: " . $e->getMessage()];
    }
}

/**
 * Fix vehicle_pricing table
 */
function fixVehiclePricingTable($conn) {
    $result = [];
    
    try {
        // Check if the table exists
        $checkTable = $conn->query("SHOW TABLES LIKE 'vehicle_pricing'");
        if ($checkTable->num_rows === 0) {
            // Create the table
            $conn->query("
                CREATE TABLE IF NOT EXISTS vehicle_pricing (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    vehicle_id VARCHAR(50) NOT NULL,
                    trip_type VARCHAR(20) NOT NULL DEFAULT 'outstation',
                    base_fare DECIMAL(10,2) DEFAULT 0,
                    price_per_km DECIMAL(10,2) DEFAULT 0,
                    night_halt_charge DECIMAL(10,2) DEFAULT 700,
                    driver_allowance DECIMAL(10,2) DEFAULT 300,
                    local_package_4hr DECIMAL(10,2) DEFAULT 0,
                    local_package_8hr DECIMAL(10,2) DEFAULT 0,
                    local_package_10hr DECIMAL(10,2) DEFAULT 0,
                    extra_km_charge DECIMAL(10,2) DEFAULT 0,
                    extra_hour_charge DECIMAL(10,2) DEFAULT 0,
                    airport_base_price DECIMAL(10,2) DEFAULT 0,
                    airport_price_per_km DECIMAL(10,2) DEFAULT 0,
                    airport_pickup_price DECIMAL(10,2) DEFAULT 0,
                    airport_drop_price DECIMAL(10,2) DEFAULT 0,
                    airport_tier1_price DECIMAL(10,2) DEFAULT 0,
                    airport_tier2_price DECIMAL(10,2) DEFAULT 0,
                    airport_tier3_price DECIMAL(10,2) DEFAULT 0,
                    airport_tier4_price DECIMAL(10,2) DEFAULT 0,
                    airport_extra_km_charge DECIMAL(10,2) DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_vehicle_trip (vehicle_id, trip_type)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");
            $result[] = "Created vehicle_pricing table";
        } else {
            // Check if the column vehicle_type exists
            $checkVehicleTypeColumn = $conn->query("SHOW COLUMNS FROM vehicle_pricing LIKE 'vehicle_type'");
            
            // If it has vehicle_type but no vehicle_id, add vehicle_id
            if ($checkVehicleTypeColumn->num_rows > 0) {
                $checkVehicleIdColumn = $conn->query("SHOW COLUMNS FROM vehicle_pricing LIKE 'vehicle_id'");
                if ($checkVehicleIdColumn->num_rows === 0) {
                    $conn->query("ALTER TABLE vehicle_pricing ADD COLUMN vehicle_id VARCHAR(50) NOT NULL AFTER id");
                    $conn->query("UPDATE vehicle_pricing SET vehicle_id = vehicle_type");
                    $result[] = "Added vehicle_id column and copied data from vehicle_type";
                }
            }
            
            // Check and add columns if they don't exist
            $columns = [
                'vehicle_id' => 'VARCHAR(50) NOT NULL',
                'trip_type' => 'VARCHAR(20) NOT NULL DEFAULT \'outstation\'',
                'base_fare' => 'DECIMAL(10,2) DEFAULT 0',
                'price_per_km' => 'DECIMAL(10,2) DEFAULT 0',
                'night_halt_charge' => 'DECIMAL(10,2) DEFAULT 700',
                'driver_allowance' => 'DECIMAL(10,2) DEFAULT 300',
                'local_package_4hr' => 'DECIMAL(10,2) DEFAULT 0',
                'local_package_8hr' => 'DECIMAL(10,2) DEFAULT 0',
                'local_package_10hr' => 'DECIMAL(10,2) DEFAULT 0',
                'extra_km_charge' => 'DECIMAL(10,2) DEFAULT 0',
                'extra_hour_charge' => 'DECIMAL(10,2) DEFAULT 0',
                'airport_base_price' => 'DECIMAL(10,2) DEFAULT 0',
                'airport_price_per_km' => 'DECIMAL(10,2) DEFAULT 0',
                'airport_pickup_price' => 'DECIMAL(10,2) DEFAULT 0',
                'airport_drop_price' => 'DECIMAL(10,2) DEFAULT 0',
                'airport_tier1_price' => 'DECIMAL(10,2) DEFAULT 0',
                'airport_tier2_price' => 'DECIMAL(10,2) DEFAULT 0',
                'airport_tier3_price' => 'DECIMAL(10,2) DEFAULT 0',
                'airport_tier4_price' => 'DECIMAL(10,2) DEFAULT 0',
                'airport_extra_km_charge' => 'DECIMAL(10,2) DEFAULT 0',
                'created_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
                'updated_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
            ];
            
            foreach ($columns as $column => $definition) {
                $checkColumn = $conn->query("SHOW COLUMNS FROM vehicle_pricing LIKE '$column'");
                if ($checkColumn->num_rows === 0) {
                    $conn->query("ALTER TABLE vehicle_pricing ADD COLUMN $column $definition");
                    $result[] = "Added column $column to vehicle_pricing table";
                }
            }
            
            // Ensure unique constraint on vehicle_id and trip_type
            $checkIndex = $conn->query("SHOW INDEX FROM vehicle_pricing WHERE Key_name = 'unique_vehicle_trip'");
            if ($checkIndex->num_rows === 0) {
                try {
                    $conn->query("ALTER TABLE vehicle_pricing ADD CONSTRAINT unique_vehicle_trip UNIQUE (vehicle_id, trip_type)");
                    $result[] = "Added unique constraint on vehicle_id and trip_type to vehicle_pricing table";
                } catch (Exception $e) {
                    // If adding the constraint fails, it's likely due to duplicate entries
                    $result[] = "Failed to add unique constraint: " . $e->getMessage();
                    
                    // Try to fix duplicate entries
                    $query = "
                        SELECT vehicle_id, trip_type, COUNT(*) as count
                        FROM vehicle_pricing
                        GROUP BY vehicle_id, trip_type
                        HAVING COUNT(*) > 1
                    ";
                    $duplicates = $conn->query($query);
                    
                    if ($duplicates && $duplicates->num_rows > 0) {
                        while ($row = $duplicates->fetch_assoc()) {
                            // Get all rows for this vehicle_id and trip_type
                            $vehicleId = $row['vehicle_id'];
                            $tripType = $row['trip_type'];
                            
                            $duplicateIds = [];
                            $getAllQuery = "SELECT id FROM vehicle_pricing WHERE vehicle_id = '$vehicleId' AND trip_type = '$tripType' ORDER BY id ASC";
                            $allRows = $conn->query($getAllQuery);
                            
                            if ($allRows && $allRows->num_rows > 0) {
                                $firstId = null;
                                while ($idRow = $allRows->fetch_assoc()) {
                                    if ($firstId === null) {
                                        $firstId = $idRow['id']; // Keep the first one
                                    } else {
                                        $duplicateIds[] = $idRow['id']; // Mark others for deletion
                                    }
                                }
                                
                                // Delete duplicates
                                if (!empty($duplicateIds)) {
                                    $deleteIds = implode(',', $duplicateIds);
                                    $conn->query("DELETE FROM vehicle_pricing WHERE id IN ($deleteIds)");
                                    $result[] = "Deleted duplicate entries for vehicle_id=$vehicleId, trip_type=$tripType";
                                }
                            }
                        }
                        
                        // Try adding the constraint again
                        try {
                            $conn->query("ALTER TABLE vehicle_pricing ADD CONSTRAINT unique_vehicle_trip UNIQUE (vehicle_id, trip_type)");
                            $result[] = "Added unique constraint after fixing duplicates";
                        } catch (Exception $e2) {
                            $result[] = "Still failed to add unique constraint after fixing duplicates: " . $e2->getMessage();
                        }
                    }
                }
            }
        }
        
        return $result;
    } catch (Exception $e) {
        return ["Error fixing vehicle_pricing table: " . $e->getMessage()];
    }
}

/**
 * Fix airport_transfer_fares table
 */
function fixAirportTransferFaresTable($conn) {
    $result = [];
    
    try {
        // Check if the table exists
        $checkTable = $conn->query("SHOW TABLES LIKE 'airport_transfer_fares'");
        if ($checkTable->num_rows === 0) {
            // Create the table
            $conn->query("
                CREATE TABLE IF NOT EXISTS airport_transfer_fares (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    vehicle_id VARCHAR(50) NOT NULL,
                    base_price DECIMAL(10,2) DEFAULT 0,
                    price_per_km DECIMAL(5,2) DEFAULT 0,
                    pickup_price DECIMAL(10,2) DEFAULT 0,
                    drop_price DECIMAL(10,2) DEFAULT 0,
                    tier1_price DECIMAL(10,2) DEFAULT 0,
                    tier2_price DECIMAL(10,2) DEFAULT 0,
                    tier3_price DECIMAL(10,2) DEFAULT 0,
                    tier4_price DECIMAL(10,2) DEFAULT 0,
                    extra_km_charge DECIMAL(5,2) DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY vehicle_id (vehicle_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");
            $result[] = "Created airport_transfer_fares table";
        } else {
            // Check and add columns if they don't exist
            $columns = [
                'vehicle_id' => 'VARCHAR(50) NOT NULL',
                'base_price' => 'DECIMAL(10,2) DEFAULT 0',
                'price_per_km' => 'DECIMAL(5,2) DEFAULT 0',
                'pickup_price' => 'DECIMAL(10,2) DEFAULT 0',
                'drop_price' => 'DECIMAL(10,2) DEFAULT 0',
                'tier1_price' => 'DECIMAL(10,2) DEFAULT 0',
                'tier2_price' => 'DECIMAL(10,2) DEFAULT 0',
                'tier3_price' => 'DECIMAL(10,2) DEFAULT 0',
                'tier4_price' => 'DECIMAL(10,2) DEFAULT 0',
                'extra_km_charge' => 'DECIMAL(5,2) DEFAULT 0',
                'created_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
                'updated_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
            ];
            
            foreach ($columns as $column => $definition) {
                $checkColumn = $conn->query("SHOW COLUMNS FROM airport_transfer_fares LIKE '$column'");
                if ($checkColumn->num_rows === 0) {
                    $conn->query("ALTER TABLE airport_transfer_fares ADD COLUMN $column $definition");
                    $result[] = "Added column $column to airport_transfer_fares table";
                }
            }
            
            // Ensure unique constraint on vehicle_id
            $checkIndex = $conn->query("SHOW INDEX FROM airport_transfer_fares WHERE Key_name = 'vehicle_id' AND Column_name = 'vehicle_id'");
            if ($checkIndex->num_rows === 0) {
                try {
                    $conn->query("ALTER TABLE airport_transfer_fares ADD UNIQUE KEY vehicle_id (vehicle_id)");
                    $result[] = "Added unique constraint on vehicle_id to airport_transfer_fares table";
                } catch (Exception $e) {
                    $result[] = "Failed to add unique constraint on vehicle_id: " . $e->getMessage();
                }
            }
        }
        
        return $result;
    } catch (Exception $e) {
        return ["Error fixing airport_transfer_fares table: " . $e->getMessage()];
    }
}

/**
 * Fix local_package_fares table
 */
function fixLocalPackageFaresTable($conn) {
    $result = [];
    
    try {
        // Check if the table exists
        $checkTable = $conn->query("SHOW TABLES LIKE 'local_package_fares'");
        if ($checkTable->num_rows === 0) {
            // Create the table
            $conn->query("
                CREATE TABLE IF NOT EXISTS local_package_fares (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    vehicle_id VARCHAR(50) NOT NULL,
                    price_4hrs_40km DECIMAL(10,2) DEFAULT 0,
                    price_8hrs_80km DECIMAL(10,2) DEFAULT 0,
                    price_10hrs_100km DECIMAL(10,2) DEFAULT 0,
                    price_extra_km DECIMAL(5,2) DEFAULT 0,
                    price_extra_hour DECIMAL(5,2) DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY vehicle_id (vehicle_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");
            $result[] = "Created local_package_fares table";
        } else {
            // Check and add columns if they don't exist
            $columns = [
                'vehicle_id' => 'VARCHAR(50) NOT NULL',
                'price_4hrs_40km' => 'DECIMAL(10,2) DEFAULT 0',
                'price_8hrs_80km' => 'DECIMAL(10,2) DEFAULT 0',
                'price_10hrs_100km' => 'DECIMAL(10,2) DEFAULT 0',
                'price_extra_km' => 'DECIMAL(5,2) DEFAULT 0',
                'price_extra_hour' => 'DECIMAL(5,2) DEFAULT 0',
                'created_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
                'updated_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
            ];
            
            foreach ($columns as $column => $definition) {
                $checkColumn = $conn->query("SHOW COLUMNS FROM local_package_fares LIKE '$column'");
                if ($checkColumn->num_rows === 0) {
                    $conn->query("ALTER TABLE local_package_fares ADD COLUMN $column $definition");
                    $result[] = "Added column $column to local_package_fares table";
                }
            }
            
            // Ensure unique constraint on vehicle_id
            $checkIndex = $conn->query("SHOW INDEX FROM local_package_fares WHERE Key_name = 'vehicle_id' AND Column_name = 'vehicle_id'");
            if ($checkIndex->num_rows === 0) {
                try {
                    $conn->query("ALTER TABLE local_package_fares ADD UNIQUE KEY vehicle_id (vehicle_id)");
                    $result[] = "Added unique constraint on vehicle_id to local_package_fares table";
                } catch (Exception $e) {
                    $result[] = "Failed to add unique constraint on vehicle_id: " . $e->getMessage();
                }
            }
        }
        
        return $result;
    } catch (Exception $e) {
        return ["Error fixing local_package_fares table: " . $e->getMessage()];
    }
}

/**
 * Fix outstation_fares table
 */
function fixOutstationFaresTable($conn) {
    $result = [];
    
    try {
        // Check if the table exists
        $checkTable = $conn->query("SHOW TABLES LIKE 'outstation_fares'");
        if ($checkTable->num_rows === 0) {
            // Create the table
            $conn->query("
                CREATE TABLE IF NOT EXISTS outstation_fares (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    vehicle_id VARCHAR(50) NOT NULL,
                    base_price DECIMAL(10,2) DEFAULT 0,
                    price_per_km DECIMAL(5,2) DEFAULT 0,
                    night_halt_charge DECIMAL(10,2) DEFAULT 700,
                    driver_allowance DECIMAL(10,2) DEFAULT 300,
                    roundtrip_base_price DECIMAL(10,2) DEFAULT 0,
                    roundtrip_price_per_km DECIMAL(5,2) DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY vehicle_id (vehicle_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");
            $result[] = "Created outstation_fares table";
        } else {
            // Check if base_fare column exists instead of base_price
            $checkBasePrice = $conn->query("SHOW COLUMNS FROM outstation_fares LIKE 'base_price'");
            $checkBaseFare = $conn->query("SHOW COLUMNS FROM outstation_fares LIKE 'base_fare'");
            
            if ($checkBaseFare->num_rows > 0 && $checkBasePrice->num_rows === 0) {
                // Rename base_fare to base_price
                $conn->query("ALTER TABLE outstation_fares CHANGE COLUMN base_fare base_price DECIMAL(10,2) DEFAULT 0");
                $result[] = "Renamed base_fare to base_price in outstation_fares table";
            }
            
            // Check and add columns if they don't exist
            $columns = [
                'vehicle_id' => 'VARCHAR(50) NOT NULL',
                'base_price' => 'DECIMAL(10,2) DEFAULT 0',
                'price_per_km' => 'DECIMAL(5,2) DEFAULT 0',
                'night_halt_charge' => 'DECIMAL(10,2) DEFAULT 700',
                'driver_allowance' => 'DECIMAL(10,2) DEFAULT 300',
                'roundtrip_base_price' => 'DECIMAL(10,2) DEFAULT 0',
                'roundtrip_price_per_km' => 'DECIMAL(5,2) DEFAULT 0',
                'created_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
                'updated_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
            ];
            
            foreach ($columns as $column => $definition) {
                $checkColumn = $conn->query("SHOW COLUMNS FROM outstation_fares LIKE '$column'");
                if ($checkColumn->num_rows === 0) {
                    $conn->query("ALTER TABLE outstation_fares ADD COLUMN $column $definition");
                    $result[] = "Added column $column to outstation_fares table";
                }
            }
            
            // Ensure unique constraint on vehicle_id
            $checkIndex = $conn->query("SHOW INDEX FROM outstation_fares WHERE Key_name = 'vehicle_id' AND Column_name = 'vehicle_id'");
            if ($checkIndex->num_rows === 0) {
                try {
                    $conn->query("ALTER TABLE outstation_fares ADD UNIQUE KEY vehicle_id (vehicle_id)");
                    $result[] = "Added unique constraint on vehicle_id to outstation_fares table";
                } catch (Exception $e) {
                    $result[] = "Failed to add unique constraint on vehicle_id: " . $e->getMessage();
                }
            }
        }
        
        return $result;
    } catch (Exception $e) {
        return ["Error fixing outstation_fares table: " . $e->getMessage()];
    }
}

/**
 * Create pricing entries for all vehicles in all trip types
 */
function createPricingEntries($conn) {
    $result = [];
    
    try {
        // Get all vehicles from vehicle_types
        $vehicles = $conn->query("SELECT vehicle_id FROM vehicle_types");
        if (!$vehicles) {
            return ["No vehicles found"];
        }
        
        $tripTypes = ['airport', 'local', 'outstation'];
        $vehiclesCount = 0;
        $newEntriesCount = 0;
        
        while ($vehicle = $vehicles->fetch_assoc()) {
            $vehicleId = $vehicle['vehicle_id'];
            $vehiclesCount++;
            
            foreach ($tripTypes as $tripType) {
                // Check if pricing entry exists for this vehicle and trip type
                $checkQuery = "SELECT id FROM vehicle_pricing WHERE vehicle_id = ? AND trip_type = ?";
                $stmt = $conn->prepare($checkQuery);
                $stmt->bind_param("ss", $vehicleId, $tripType);
                $stmt->execute();
                $checkResult = $stmt->get_result();
                
                if ($checkResult->num_rows === 0) {
                    // Insert empty pricing entry
                    $insertQuery = "
                        INSERT INTO vehicle_pricing (
                            vehicle_id, trip_type, base_fare, price_per_km, 
                            night_halt_charge, driver_allowance, created_at, updated_at
                        ) VALUES (?, ?, 0, 0, 700, 300, NOW(), NOW())
                    ";
                    
                    $insertStmt = $conn->prepare($insertQuery);
                    $insertStmt->bind_param("ss", $vehicleId, $tripType);
                    $insertStmt->execute();
                    
                    $newEntriesCount++;
                    $result[] = "Created pricing entry for vehicle_id=$vehicleId, trip_type=$tripType";
                    
                    // Also add to the specific fare tables if entry doesn't exist
                    if ($tripType === 'airport') {
                        $checkSpecific = $conn->prepare("SELECT id FROM airport_transfer_fares WHERE vehicle_id = ?");
                        $checkSpecific->bind_param("s", $vehicleId);
                        $checkSpecific->execute();
                        $specificResult = $checkSpecific->get_result();
                        
                        if ($specificResult->num_rows === 0) {
                            $specificInsert = $conn->prepare("
                                INSERT INTO airport_transfer_fares (
                                    vehicle_id, base_price, price_per_km, pickup_price, drop_price,
                                    tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge,
                                    created_at, updated_at
                                ) VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0, 0, NOW(), NOW())
                            ");
                            $specificInsert->bind_param("s", $vehicleId);
                            $specificInsert->execute();
                            $result[] = "Created entry in airport_transfer_fares for vehicle_id=$vehicleId";
                        }
                    } else if ($tripType === 'local') {
                        $checkSpecific = $conn->prepare("SELECT id FROM local_package_fares WHERE vehicle_id = ?");
                        $checkSpecific->bind_param("s", $vehicleId);
                        $checkSpecific->execute();
                        $specificResult = $checkSpecific->get_result();
                        
                        if ($specificResult->num_rows === 0) {
                            $specificInsert = $conn->prepare("
                                INSERT INTO local_package_fares (
                                    vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km,
                                    price_extra_km, price_extra_hour, created_at, updated_at
                                ) VALUES (?, 0, 0, 0, 0, 0, NOW(), NOW())
                            ");
                            $specificInsert->bind_param("s", $vehicleId);
                            $specificInsert->execute();
                            $result[] = "Created entry in local_package_fares for vehicle_id=$vehicleId";
                        }
                    } else if ($tripType === 'outstation') {
                        $checkSpecific = $conn->prepare("SELECT id FROM outstation_fares WHERE vehicle_id = ?");
                        $checkSpecific->bind_param("s", $vehicleId);
                        $checkSpecific->execute();
                        $specificResult = $checkSpecific->get_result();
                        
                        if ($specificResult->num_rows === 0) {
                            $specificInsert = $conn->prepare("
                                INSERT INTO outstation_fares (
                                    vehicle_id, base_price, price_per_km, night_halt_charge,
                                    driver_allowance, roundtrip_base_price, roundtrip_price_per_km,
                                    created_at, updated_at
                                ) VALUES (?, 0, 0, 700, 300, 0, 0, NOW(), NOW())
                            ");
                            $specificInsert->bind_param("s", $vehicleId);
                            $specificInsert->execute();
                            $result[] = "Created entry in outstation_fares for vehicle_id=$vehicleId";
                        }
                    }
                }
            }
        }
        
        $result[] = "Processed $vehiclesCount vehicles, created $newEntriesCount new pricing entries";
        
        return $result;
    } catch (Exception $e) {
        return ["Error creating pricing entries: " . $e->getMessage()];
    }
}
