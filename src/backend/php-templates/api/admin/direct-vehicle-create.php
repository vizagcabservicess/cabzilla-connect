
<?php
/**
 * direct-vehicle-create.php - Create a new vehicle and sync across all tables
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

// Check if the request method is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Method not allowed. Only POST requests are accepted.',
        'received' => $_SERVER['REQUEST_METHOD']
    ]);
    exit;
}

// Include database configuration
require_once __DIR__ . '/../../config.php';

try {
    // Get the raw POST data
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
    if (!isset($vehicleData['vehicleId']) || !isset($vehicleData['name'])) {
        throw new Exception("Required fields missing: vehicleId and name are required");
    }
    
    // Normalize vehicle ID (remove spaces, lowercase)
    $vehicleId = strtolower(trim(preg_replace('/\s+/', '_', $vehicleData['vehicleId'])));
    
    // Connect to database
    $conn = getDbConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Start transaction - we'll either insert into all tables or none
    $conn->begin_transaction();
    
    try {
        // 1. Insert into vehicle_types table
        $stmt = $conn->prepare("
            INSERT INTO vehicle_types (
                vehicle_id, name, capacity, luggage_capacity, ac, image, 
                amenities, description, is_active, base_price, price_per_km, 
                night_halt_charge, driver_allowance
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                capacity = VALUES(capacity),
                luggage_capacity = VALUES(luggage_capacity),
                ac = VALUES(ac),
                image = VALUES(image),
                amenities = VALUES(amenities),
                description = VALUES(description),
                is_active = VALUES(is_active),
                base_price = VALUES(base_price),
                price_per_km = VALUES(price_per_km),
                night_halt_charge = VALUES(night_halt_charge),
                driver_allowance = VALUES(driver_allowance),
                updated_at = CURRENT_TIMESTAMP
        ");
        
        // Default values
        $capacity = $vehicleData['capacity'] ?? 4;
        $luggageCapacity = $vehicleData['luggageCapacity'] ?? 2;
        $ac = isset($vehicleData['ac']) ? ($vehicleData['ac'] ? 1 : 0) : 1;
        $image = $vehicleData['image'] ?? '/cars/sedan.png';
        $amenities = isset($vehicleData['amenities']) ? (is_array($vehicleData['amenities']) ? json_encode($vehicleData['amenities']) : $vehicleData['amenities']) : '["AC"]';
        $description = $vehicleData['description'] ?? '';
        $isActive = isset($vehicleData['isActive']) ? ($vehicleData['isActive'] ? 1 : 0) : 1;
        $basePrice = $vehicleData['basePrice'] ?? $vehicleData['price'] ?? 0;
        $pricePerKm = $vehicleData['pricePerKm'] ?? 0;
        $nightHaltCharge = $vehicleData['nightHaltCharge'] ?? 700;
        $driverAllowance = $vehicleData['driverAllowance'] ?? 250;
        
        $stmt->bind_param(
            "ssiiisssddddd",
            $vehicleId,
            $vehicleData['name'],
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
            $driverAllowance
        );
        
        // Execute the statement
        $stmt->execute();
        
        // 2. Also insert into vehicles table for legacy support
        $stmt = $conn->prepare("
            INSERT INTO vehicles (
                vehicle_id, name, capacity, luggage_capacity, ac, image, 
                amenities, description, is_active, base_price, price_per_km, 
                night_halt_charge, driver_allowance
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                capacity = VALUES(capacity),
                luggage_capacity = VALUES(luggage_capacity),
                ac = VALUES(ac),
                image = VALUES(image),
                amenities = VALUES(amenities),
                description = VALUES(description),
                is_active = VALUES(is_active),
                base_price = VALUES(base_price),
                price_per_km = VALUES(price_per_km),
                night_halt_charge = VALUES(night_halt_charge),
                driver_allowance = VALUES(driver_allowance),
                updated_at = CURRENT_TIMESTAMP
        ");
        
        $stmt->bind_param(
            "ssiiisssddddd",
            $vehicleId,
            $vehicleData['name'],
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
            $driverAllowance
        );
        
        // Execute the statement
        $stmt->execute();
        
        // 3. Insert into outstation_fares
        $stmt = $conn->prepare("
            INSERT INTO outstation_fares (
                vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance,
                roundtrip_base_price, roundtrip_price_per_km
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                base_price = VALUES(base_price),
                price_per_km = VALUES(price_per_km),
                night_halt_charge = VALUES(night_halt_charge),
                driver_allowance = VALUES(driver_allowance),
                roundtrip_base_price = VALUES(roundtrip_base_price),
                roundtrip_price_per_km = VALUES(roundtrip_price_per_km),
                updated_at = CURRENT_TIMESTAMP
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
        
        // 4. Insert into vehicle_pricing for each trip type (outstation, local, airport)
        $tripTypes = ['outstation', 'local', 'airport'];
        
        foreach ($tripTypes as $tripType) {
            $stmt = $conn->prepare("
                INSERT INTO vehicle_pricing (
                    vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance, base_price
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    base_fare = VALUES(base_fare),
                    price_per_km = VALUES(price_per_km),
                    night_halt_charge = VALUES(night_halt_charge),
                    driver_allowance = VALUES(driver_allowance),
                    base_price = VALUES(base_price),
                    updated_at = CURRENT_TIMESTAMP
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
        
        // 5. Insert into local_package_fares
        $stmt = $conn->prepare("
            INSERT INTO local_package_fares (
                vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour
            ) VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                price_4hrs_40km = VALUES(price_4hrs_40km),
                price_8hrs_80km = VALUES(price_8hrs_80km),
                price_10hrs_100km = VALUES(price_10hrs_100km),
                price_extra_km = VALUES(price_extra_km),
                price_extra_hour = VALUES(price_extra_hour),
                updated_at = CURRENT_TIMESTAMP
        ");
        
        // Calculate default local package prices based on base price and price per km
        $price4hrs40km = $basePrice > 0 ? $basePrice * 0.5 : 1200;
        $price8hrs80km = $basePrice > 0 ? $basePrice * 0.8 : 2200;
        $price10hrs100km = $basePrice > 0 ? $basePrice : 2500;
        $priceExtraKm = $pricePerKm > 0 ? $pricePerKm : 14;
        $priceExtraHour = $driverAllowance > 0 ? $driverAllowance : 250;
        
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
        
        // 6. Insert into airport_transfer_fares
        $stmt = $conn->prepare("
            INSERT INTO airport_transfer_fares (
                vehicle_id, base_price, price_per_km, pickup_price, drop_price,
                tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                base_price = VALUES(base_price),
                price_per_km = VALUES(price_per_km),
                pickup_price = VALUES(pickup_price),
                drop_price = VALUES(drop_price),
                tier1_price = VALUES(tier1_price),
                tier2_price = VALUES(tier2_price),
                tier3_price = VALUES(tier3_price),
                tier4_price = VALUES(tier4_price),
                extra_km_charge = VALUES(extra_km_charge),
                updated_at = CURRENT_TIMESTAMP
        ");
        
        // Default airport transfer prices
        $airportBasePrice = $basePrice > 0 ? $basePrice * 0.7 : 3000;
        $airportPricePerKm = $pricePerKm > 0 ? $pricePerKm : 15;
        $pickupPrice = $basePrice > 0 ? $basePrice * 0.2 : 800;
        $dropPrice = $pickupPrice;
        $tier1Price = $pickupPrice * 0.75;
        $tier2Price = $pickupPrice;
        $tier3Price = $pickupPrice * 1.25;
        $tier4Price = $pickupPrice * 1.5;
        $extraKmCharge = $pricePerKm;
        
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
        
        // Commit the transaction
        $conn->commit();
        
        // Return success response
        echo json_encode([
            'status' => 'success',
            'message' => 'Vehicle created successfully and synced across all tables',
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
    error_log("Error creating vehicle: " . $e->getMessage());
    
    // Send error response
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'file' => basename(__FILE__),
        'trace' => $e->getTraceAsString()
    ]);
}
