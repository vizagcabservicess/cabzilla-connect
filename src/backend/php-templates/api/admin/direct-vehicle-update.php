
<?php
/**
 * direct-vehicle-update.php - Update a vehicle and sync across all tables
 */

// Set ultra-aggressive CORS headers
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Force-Refresh, *');
header('Access-Control-Max-Age: 86400');
header('Access-Control-Expose-Headers: *');

// Handle OPTIONS requests immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'CORS preflight request successful'
    ]);
    exit;
}

// Check if the request method is PUT, POST or PATCH
if (!in_array($_SERVER['REQUEST_METHOD'], ['PUT', 'POST', 'PATCH'])) {
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Method not allowed. Only PUT, POST, or PATCH requests are accepted.',
        'received' => $_SERVER['REQUEST_METHOD']
    ]);
    exit;
}

// Include database configuration
require_once __DIR__ . '/../../config.php';

try {
    // Get the raw input data
    $jsonData = file_get_contents('php://input');
    $vehicleData = json_decode($jsonData, true);
    
    // Check if data was successfully decoded
    if (!$vehicleData || json_last_error() !== JSON_ERROR_NONE) {
        // Try to get form data if JSON failed
        $vehicleData = $_POST;
        
        if (empty($vehicleData)) {
            throw new Exception("No valid data received in the request");
        }
    }
    
    // Validate required fields
    if (!isset($vehicleData['vehicleId']) && !isset($vehicleData['id'])) {
        throw new Exception("Required field missing: vehicleId or id is required");
    }
    
    // Use vehicleId if provided, otherwise use id
    $vehicleId = isset($vehicleData['vehicleId']) ? $vehicleData['vehicleId'] : $vehicleData['id'];
    
    // Connect to database
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Start transaction - we'll either update all tables or none
    $conn->begin_transaction();
    
    try {
        // Get current vehicle data to fill in missing values
        $stmt = $conn->prepare("SELECT * FROM vehicle_types WHERE vehicle_id = ?");
        $stmt->bind_param("s", $vehicleId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            throw new Exception("Vehicle not found with ID: $vehicleId");
        }
        
        $existingVehicle = $result->fetch_assoc();
        
        // Prepare update data with defaults from existing data
        $name = $vehicleData['name'] ?? $existingVehicle['name'];
        $capacity = $vehicleData['capacity'] ?? $existingVehicle['capacity'];
        $luggageCapacity = $vehicleData['luggageCapacity'] ?? $existingVehicle['luggage_capacity'];
        $ac = isset($vehicleData['ac']) ? ($vehicleData['ac'] ? 1 : 0) : $existingVehicle['ac'];
        $image = $vehicleData['image'] ?? $existingVehicle['image'];
        
        // Handle amenities - could be array or string
        if (isset($vehicleData['amenities'])) {
            if (is_array($vehicleData['amenities'])) {
                $amenities = json_encode($vehicleData['amenities']);
            } else {
                $amenities = $vehicleData['amenities'];
            }
        } else {
            $amenities = $existingVehicle['amenities'];
        }
        
        $description = $vehicleData['description'] ?? $existingVehicle['description'];
        $isActive = isset($vehicleData['isActive']) ? ($vehicleData['isActive'] ? 1 : 0) : $existingVehicle['is_active'];
        $basePrice = $vehicleData['basePrice'] ?? $vehicleData['price'] ?? $existingVehicle['base_price'];
        $pricePerKm = $vehicleData['pricePerKm'] ?? $existingVehicle['price_per_km'];
        $nightHaltCharge = $vehicleData['nightHaltCharge'] ?? $existingVehicle['night_halt_charge'];
        $driverAllowance = $vehicleData['driverAllowance'] ?? $existingVehicle['driver_allowance'];
        
        // 1. Update vehicle_types table
        $stmt = $conn->prepare("
            UPDATE vehicle_types SET
                name = ?,
                capacity = ?,
                luggage_capacity = ?,
                ac = ?,
                image = ?,
                amenities = ?,
                description = ?,
                is_active = ?,
                base_price = ?,
                price_per_km = ?,
                night_halt_charge = ?,
                driver_allowance = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE vehicle_id = ?
        ");
        
        $stmt->bind_param(
            "siiisssidddds",
            $name,
            $capacity,
            $luggageCapacity,
            $ac,
            $image,
            $amenities,
            $description,
            $isActive,
            $basePrice,
            $pricePerKm,
            $nightHaltCharge,
            $driverAllowance,
            $vehicleId
        );
        
        // Execute the statement
        $stmt->execute();
        
        // 2. Update vehicles table for legacy support
        $stmt = $conn->prepare("
            UPDATE vehicles SET
                name = ?,
                capacity = ?,
                luggage_capacity = ?,
                ac = ?,
                image = ?,
                amenities = ?,
                description = ?,
                is_active = ?,
                base_price = ?,
                price_per_km = ?,
                night_halt_charge = ?,
                driver_allowance = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE vehicle_id = ?
        ");
        
        $stmt->bind_param(
            "siiisssidddds",
            $name,
            $capacity,
            $luggageCapacity,
            $ac,
            $image,
            $amenities,
            $description,
            $isActive,
            $basePrice,
            $pricePerKm,
            $nightHaltCharge,
            $driverAllowance,
            $vehicleId
        );
        
        // Execute the statement
        $stmt->execute();
        
        // 3. Update outstation_fares
        $stmt = $conn->prepare("
            UPDATE outstation_fares SET
                base_price = ?,
                price_per_km = ?,
                night_halt_charge = ?,
                driver_allowance = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE vehicle_id = ?
        ");
        
        $stmt->bind_param(
            "dddds",
            $basePrice,
            $pricePerKm,
            $nightHaltCharge,
            $driverAllowance,
            $vehicleId
        );
        
        // Execute the statement
        $stmt->execute();
        
        // If no rows were affected, insert a new record
        if ($stmt->affected_rows === 0) {
            $stmt = $conn->prepare("
                INSERT INTO outstation_fares (
                    vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance,
                    roundtrip_base_price, roundtrip_price_per_km
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            
            $roundtripBasePrice = $basePrice * 0.95; // Default to 5% discount for roundtrip
            $roundtripPricePerKm = $pricePerKm * 0.9; // Default to 10% discount for roundtrip
            
            $stmt->bind_param(
                "sdddddd",
                $vehicleId,
                $basePrice,
                $pricePerKm,
                $nightHaltCharge,
                $driverAllowance,
                $roundtripBasePrice,
                $roundtripPricePerKm
            );
            
            // Execute the statement
            $stmt->execute();
        }
        
        // 4. Update vehicle_pricing for each trip type (outstation, local, airport)
        $tripTypes = ['outstation', 'local', 'airport'];
        
        foreach ($tripTypes as $tripType) {
            $stmt = $conn->prepare("
                UPDATE vehicle_pricing SET
                    base_fare = ?,
                    price_per_km = ?,
                    night_halt_charge = ?,
                    driver_allowance = ?,
                    base_price = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE vehicle_id = ? AND trip_type = ?
            ");
            
            $stmt->bind_param(
                "ddddss",
                $basePrice,
                $pricePerKm,
                $nightHaltCharge,
                $driverAllowance,
                $basePrice,
                $vehicleId,
                $tripType
            );
            
            // Execute the statement
            $stmt->execute();
            
            // If no rows were affected, insert a new record
            if ($stmt->affected_rows === 0) {
                $stmt = $conn->prepare("
                    INSERT INTO vehicle_pricing (
                        vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance, base_price
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ");
                
                $stmt->bind_param(
                    "ssddddd",
                    $vehicleId,
                    $tripType,
                    $basePrice,
                    $pricePerKm,
                    $nightHaltCharge,
                    $driverAllowance,
                    $basePrice
                );
                
                // Execute the statement
                $stmt->execute();
            }
        }
        
        // 5. Update local_package_fares if provided in the request
        if (isset($vehicleData['localFares'])) {
            $localFares = $vehicleData['localFares'];
            
            $stmt = $conn->prepare("
                UPDATE local_package_fares SET
                    price_4hrs_40km = ?,
                    price_8hrs_80km = ?,
                    price_10hrs_100km = ?,
                    price_extra_km = ?,
                    price_extra_hour = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE vehicle_id = ?
            ");
            
            $price4hrs40km = $localFares['price_4hrs_40km'] ?? ($basePrice > 0 ? $basePrice * 0.5 : 1200);
            $price8hrs80km = $localFares['price_8hrs_80km'] ?? ($basePrice > 0 ? $basePrice * 0.8 : 2200);
            $price10hrs100km = $localFares['price_10hrs_100km'] ?? ($basePrice > 0 ? $basePrice : 2500);
            $priceExtraKm = $localFares['price_extra_km'] ?? ($pricePerKm > 0 ? $pricePerKm : 14);
            $priceExtraHour = $localFares['price_extra_hour'] ?? ($driverAllowance > 0 ? $driverAllowance : 250);
            
            $stmt->bind_param(
                "ddddds",
                $price4hrs40km,
                $price8hrs80km,
                $price10hrs100km,
                $priceExtraKm,
                $priceExtraHour,
                $vehicleId
            );
            
            // Execute the statement
            $stmt->execute();
            
            // If no rows were affected, insert a new record
            if ($stmt->affected_rows === 0) {
                $stmt = $conn->prepare("
                    INSERT INTO local_package_fares (
                        vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour
                    ) VALUES (?, ?, ?, ?, ?, ?)
                ");
                
                $stmt->bind_param(
                    "sddddd",
                    $vehicleId,
                    $price4hrs40km,
                    $price8hrs80km,
                    $price10hrs100km,
                    $priceExtraKm,
                    $priceExtraHour
                );
                
                // Execute the statement
                $stmt->execute();
            }
        }
        
        // 6. Update airport_transfer_fares if provided in the request
        if (isset($vehicleData['airportFares'])) {
            $airportFares = $vehicleData['airportFares'];
            
            $stmt = $conn->prepare("
                UPDATE airport_transfer_fares SET
                    base_price = ?,
                    price_per_km = ?,
                    pickup_price = ?,
                    drop_price = ?,
                    tier1_price = ?,
                    tier2_price = ?,
                    tier3_price = ?,
                    tier4_price = ?,
                    extra_km_charge = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE vehicle_id = ?
            ");
            
            $airportBasePrice = $airportFares['base_price'] ?? ($basePrice > 0 ? $basePrice * 0.7 : 3000);
            $airportPricePerKm = $airportFares['price_per_km'] ?? ($pricePerKm > 0 ? $pricePerKm : 15);
            $pickupPrice = $airportFares['pickup_price'] ?? ($basePrice > 0 ? $basePrice * 0.2 : 800);
            $dropPrice = $airportFares['drop_price'] ?? $pickupPrice;
            $tier1Price = $airportFares['tier1_price'] ?? ($pickupPrice * 0.75);
            $tier2Price = $airportFares['tier2_price'] ?? $pickupPrice;
            $tier3Price = $airportFares['tier3_price'] ?? ($pickupPrice * 1.25);
            $tier4Price = $airportFares['tier4_price'] ?? ($pickupPrice * 1.5);
            $extraKmCharge = $airportFares['extra_km_charge'] ?? $pricePerKm;
            
            $stmt->bind_param(
                "dddddddds",
                $airportBasePrice,
                $airportPricePerKm,
                $pickupPrice,
                $dropPrice,
                $tier1Price,
                $tier2Price,
                $tier3Price,
                $tier4Price,
                $extraKmCharge,
                $vehicleId
            );
            
            // Execute the statement
            $stmt->execute();
            
            // If no rows were affected, insert a new record
            if ($stmt->affected_rows === 0) {
                $stmt = $conn->prepare("
                    INSERT INTO airport_transfer_fares (
                        vehicle_id, base_price, price_per_km, pickup_price, drop_price,
                        tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                
                $stmt->bind_param(
                    "sddddddddd",
                    $vehicleId,
                    $airportBasePrice,
                    $airportPricePerKm,
                    $pickupPrice,
                    $dropPrice,
                    $tier1Price,
                    $tier2Price,
                    $tier3Price,
                    $tier4Price,
                    $extraKmCharge
                );
                
                // Execute the statement
                $stmt->execute();
            }
        }
        
        // Commit the transaction
        $conn->commit();
        
        // Return success response
        echo json_encode([
            'status' => 'success',
            'message' => 'Vehicle updated successfully and synced across all tables',
            'vehicleId' => $vehicleId,
            'details' => [
                'tables_updated' => [
                    'vehicle_types',
                    'vehicles',
                    'vehicle_pricing',
                    'outstation_fares',
                    'local_package_fares',
                    'airport_transfer_fares'
                ]
            ]
        ]);
        
    } catch (Exception $e) {
        // Rollback the transaction on error
        $conn->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    // Log error
    error_log("Error updating vehicle: " . $e->getMessage());
    
    // Send error response
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'file' => basename(__FILE__),
        'trace' => $e->getTraceAsString()
    ]);
}
