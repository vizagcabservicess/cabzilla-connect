
<?php
/**
 * direct-vehicle-create.php - Create a new vehicle and sync across all vehicle tables
 */

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Enable error reporting for debug
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Create log directory if it doesn't exist
$logDir = dirname(__FILE__) . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Logging function
function logMessage($message) {
    global $logDir;
    $timestamp = date('Y-m-d H:i:s');
    error_log("[$timestamp] " . $message . "\n", 3, $logDir . '/direct-vehicle-create.log');
}

// Log request information
logMessage("Vehicle create request received: " . $_SERVER['REQUEST_METHOD']);
logMessage("Request body: " . file_get_contents('php://input'));

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Initialize response
$response = [
    'status' => 'error',
    'message' => 'Unknown error',
    'timestamp' => time()
];

// Only allow POST method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    $response['message'] = 'Only POST method is allowed';
    echo json_encode($response);
    exit;
}

// Get database connection
try {
    // First try to use config if available
    if (file_exists(dirname(__FILE__) . '/../../config.php')) {
        require_once dirname(__FILE__) . '/../../config.php';
        $conn = getDbConnection();
        logMessage("Connected to database using config.php");
    } 
    // Fallback to hardcoded credentials
    else {
        logMessage("Config file not found, using hardcoded credentials");
        $dbHost = 'localhost';
        $dbName = 'u644605165_new_bookingdb';
        $dbUser = 'u644605165_new_bookingusr';
        $dbPass = 'Vizag@1213';
        
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        
        if ($conn->connect_error) {
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
        
        logMessage("Connected to database using hardcoded credentials");
    }
} catch (Exception $e) {
    $response['message'] = 'Database connection failed: ' . $e->getMessage();
    echo json_encode($response);
    exit;
}

// Get vehicle data from the request
try {
    // Parse input data (support both JSON and form data)
    $vehicleData = [];
    $rawInput = file_get_contents('php://input');
    
    // Try to parse as JSON
    $jsonData = json_decode($rawInput, true);
    if (json_last_error() === JSON_ERROR_NONE && !empty($jsonData)) {
        $vehicleData = $jsonData;
        logMessage("Parsed vehicle data from JSON");
    }
    // Fallback to POST data
    else if (!empty($_POST)) {
        $vehicleData = $_POST;
        logMessage("Using standard POST data for vehicle");
    }
    // Try to parse as URL-encoded
    else {
        parse_str($rawInput, $parsedData);
        if (!empty($parsedData)) {
            $vehicleData = $parsedData;
            logMessage("Parsed vehicle data as URL-encoded");
        }
    }
    
    if (empty($vehicleData)) {
        throw new Exception("No vehicle data provided");
    }
    
    // Extract vehicle ID with fallbacks for different naming conventions
    $vehicleId = null;
    $possibleVehicleIdFields = ['vehicleId', 'vehicle_id', 'id'];
    
    foreach ($possibleVehicleIdFields as $field) {
        if (isset($vehicleData[$field]) && !empty($vehicleData[$field])) {
            $vehicleId = $vehicleData[$field];
            logMessage("Found vehicle ID in field '$field': $vehicleId");
            break;
        }
    }
    
    // Make sure we have a vehicle ID
    if (empty($vehicleId)) {
        throw new Exception("Vehicle ID is required");
    }
    
    // Extract vehicle name
    $vehicleName = null;
    $possibleNameFields = ['name', 'vehicleName', 'vehicle_name', 'cab_name', 'cabName'];
    
    foreach ($possibleNameFields as $field) {
        if (isset($vehicleData[$field]) && !empty($vehicleData[$field])) {
            $vehicleName = $vehicleData[$field];
            logMessage("Found vehicle name in field '$field': $vehicleName");
            break;
        }
    }
    
    if (empty($vehicleName)) {
        $vehicleName = $vehicleId; // Default to using the ID as name
        logMessage("No vehicle name found, defaulting to ID: $vehicleName");
    }
    
    // Extract other vehicle properties with defaults
    $capacity = isset($vehicleData['capacity']) ? intval($vehicleData['capacity']) : 4;
    $luggageCapacity = isset($vehicleData['luggageCapacity']) ? intval($vehicleData['luggageCapacity']) : 
                      (isset($vehicleData['luggage_capacity']) ? intval($vehicleData['luggage_capacity']) : 2);
    
    $ac = isset($vehicleData['ac']) ? (intval($vehicleData['ac']) ? 1 : 0) : 1;
    $isActive = isset($vehicleData['isActive']) ? (intval($vehicleData['isActive']) ? 1 : 0) : 
               (isset($vehicleData['is_active']) ? (intval($vehicleData['is_active']) ? 1 : 0) : 1);
    
    // Handle image path
    $image = isset($vehicleData['image']) && !empty($vehicleData['image']) ? $vehicleData['image'] : '/cars/sedan.png';
    
    // Handle amenities (convert to string if array)
    $amenities = isset($vehicleData['amenities']) ? $vehicleData['amenities'] : 'AC';
    if (is_array($amenities)) {
        $amenities = implode(', ', $amenities);
    }
    
    $description = isset($vehicleData['description']) ? $vehicleData['description'] : '';
    
    // Extract pricing data
    $basePrice = isset($vehicleData['basePrice']) ? floatval($vehicleData['basePrice']) : 
                (isset($vehicleData['base_price']) ? floatval($vehicleData['base_price']) : 
                (isset($vehicleData['price']) ? floatval($vehicleData['price']) : 0));
    
    $pricePerKm = isset($vehicleData['pricePerKm']) ? floatval($vehicleData['pricePerKm']) : 
                 (isset($vehicleData['price_per_km']) ? floatval($vehicleData['price_per_km']) : 0);
    
    $nightHaltCharge = isset($vehicleData['nightHaltCharge']) ? floatval($vehicleData['nightHaltCharge']) : 
                      (isset($vehicleData['night_halt_charge']) ? floatval($vehicleData['night_halt_charge']) : 0);
    
    $driverAllowance = isset($vehicleData['driverAllowance']) ? floatval($vehicleData['driverAllowance']) : 
                      (isset($vehicleData['driver_allowance']) ? floatval($vehicleData['driver_allowance']) : 0);
    
    // Begin transaction
    $conn->begin_transaction();
    
    try {
        // Check if vehicle ID already exists
        $checkQuery = "SELECT COUNT(*) as count FROM vehicles WHERE vehicle_id = ?";
        $checkStmt = $conn->prepare($checkQuery);
        $checkStmt->bind_param('s', $vehicleId);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        $row = $checkResult->fetch_assoc();
        
        if ($row['count'] > 0) {
            throw new Exception("Vehicle with ID '$vehicleId' already exists");
        }
        
        // Insert into vehicles table
        $insertVehicleQuery = "INSERT INTO vehicles 
            (vehicle_id, name, capacity, luggage_capacity, ac, image, amenities, description, is_active, base_price, price_per_km, night_halt_charge, driver_allowance) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
        $insertVehicleStmt = $conn->prepare($insertVehicleQuery);
        $insertVehicleStmt->bind_param('ssiiisssidddd', 
            $vehicleId, 
            $vehicleName, 
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
        
        if (!$insertVehicleStmt->execute()) {
            throw new Exception("Error inserting into vehicles table: " . $insertVehicleStmt->error);
        }
        
        // Insert into vehicle_types table as well (for compatibility)
        $insertVehicleTypeQuery = "INSERT INTO vehicle_types 
            (vehicle_id, name, capacity, luggage_capacity, ac, image, amenities, description, is_active, base_price, price_per_km, night_halt_charge, driver_allowance) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
        $insertVehicleTypeStmt = $conn->prepare($insertVehicleTypeQuery);
        $insertVehicleTypeStmt->bind_param('ssiiisssidddd', 
            $vehicleId, 
            $vehicleName, 
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
        
        if (!$insertVehicleTypeStmt->execute()) {
            throw new Exception("Error inserting into vehicle_types table: " . $insertVehicleTypeStmt->error);
        }
        
        // Insert into vehicle_pricing table for outstation
        $insertOutstationPricingQuery = "INSERT INTO vehicle_pricing 
            (vehicle_id, trip_type, base_fare, price_per_km, night_halt_charge, driver_allowance, base_price) 
            VALUES (?, 'outstation', ?, ?, ?, ?, ?)";
            
        $insertOutstationPricingStmt = $conn->prepare($insertOutstationPricingQuery);
        $insertOutstationPricingStmt->bind_param('sddddd', 
            $vehicleId, 
            $basePrice, 
            $pricePerKm, 
            $nightHaltCharge, 
            $driverAllowance,
            $basePrice
        );
        
        if (!$insertOutstationPricingStmt->execute()) {
            throw new Exception("Error inserting into vehicle_pricing for outstation: " . $insertOutstationPricingStmt->error);
        }
        
        // Calculate local package prices based on base price
        $price4hrs40km = round($basePrice * 0.3); // 30% of base price
        $price8hrs80km = round($basePrice * 0.6); // 60% of base price
        $price10hrs100km = round($basePrice * 0.75); // 75% of base price
        $extraKmCharge = $pricePerKm;
        $extraHourCharge = 250;
        
        // Insert into vehicle_pricing table for local packages
        $insertLocalPricingQuery = "INSERT INTO vehicle_pricing 
            (vehicle_id, trip_type, local_package_4hr, local_package_8hr, local_package_10hr, extra_km_charge, extra_hour_charge, base_price) 
            VALUES (?, 'local', ?, ?, ?, ?, ?, ?)";
            
        $insertLocalPricingStmt = $conn->prepare($insertLocalPricingQuery);
        $insertLocalPricingStmt->bind_param('sdddddd', 
            $vehicleId, 
            $price4hrs40km, 
            $price8hrs80km, 
            $price10hrs100km, 
            $extraKmCharge,
            $extraHourCharge,
            $price4hrs40km
        );
        
        if (!$insertLocalPricingStmt->execute()) {
            throw new Exception("Error inserting into vehicle_pricing for local: " . $insertLocalPricingStmt->error);
        }
        
        // Insert into local_package_fares table
        $insertLocalPackageQuery = "INSERT INTO local_package_fares 
            (vehicle_id, price_4hrs_40km, price_8hrs_80km, price_10hrs_100km, price_extra_km, price_extra_hour) 
            VALUES (?, ?, ?, ?, ?, ?)";
            
        $insertLocalPackageStmt = $conn->prepare($insertLocalPackageQuery);
        $insertLocalPackageStmt->bind_param('sddddd', 
            $vehicleId, 
            $price4hrs40km, 
            $price8hrs80km, 
            $price10hrs100km, 
            $extraKmCharge,
            $extraHourCharge
        );
        
        if (!$insertLocalPackageStmt->execute()) {
            throw new Exception("Error inserting into local_package_fares: " . $insertLocalPackageStmt->error);
        }
        
        // Calculate airport transfer prices based on base price
        $airportBasePrice = round($basePrice * 0.7); // 70% of base price
        $airportPricePerKm = $pricePerKm - 2; // Slightly less than standard rate
        $airportPickupPrice = round($basePrice * 0.2);
        $airportDropPrice = round($basePrice * 0.2);
        $airportTier1Price = round($basePrice * 0.15);
        $airportTier2Price = round($basePrice * 0.2);
        $airportTier3Price = round($basePrice * 0.25);
        $airportTier4Price = round($basePrice * 0.3);
        
        // Insert into vehicle_pricing table for airport transfers
        $insertAirportPricingQuery = "INSERT INTO vehicle_pricing 
            (vehicle_id, trip_type, airport_base_price, airport_price_per_km, airport_pickup_price, airport_drop_price,
             airport_tier1_price, airport_tier2_price, airport_tier3_price, airport_tier4_price, airport_extra_km_charge, base_price) 
            VALUES (?, 'airport', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
        $insertAirportPricingStmt = $conn->prepare($insertAirportPricingQuery);
        $insertAirportPricingStmt->bind_param('sddddddddd', 
            $vehicleId, 
            $airportBasePrice, 
            $airportPricePerKm, 
            $airportPickupPrice, 
            $airportDropPrice,
            $airportTier1Price,
            $airportTier2Price,
            $airportTier3Price,
            $airportTier4Price,
            $airportPricePerKm,
            $airportBasePrice
        );
        
        if (!$insertAirportPricingStmt->execute()) {
            throw new Exception("Error inserting into vehicle_pricing for airport: " . $insertAirportPricingStmt->error);
        }
        
        // Insert into airport_transfer_fares table
        $insertAirportFaresQuery = "INSERT INTO airport_transfer_fares 
            (vehicle_id, base_price, price_per_km, pickup_price, drop_price, 
             tier1_price, tier2_price, tier3_price, tier4_price, extra_km_charge) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
        $insertAirportFaresStmt = $conn->prepare($insertAirportFaresQuery);
        $insertAirportFaresStmt->bind_param('sddddddddd', 
            $vehicleId, 
            $airportBasePrice, 
            $airportPricePerKm, 
            $airportPickupPrice, 
            $airportDropPrice,
            $airportTier1Price,
            $airportTier2Price,
            $airportTier3Price,
            $airportTier4Price,
            $airportPricePerKm
        );
        
        // Don't fail completely if this table doesn't exist yet
        $insertAirportFaresStmt->execute();
        
        // Insert into outstation_fares table
        $insertOutstationFaresQuery = "INSERT INTO outstation_fares 
            (vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance, 
             roundtrip_base_price, roundtrip_price_per_km) 
            VALUES (?, ?, ?, ?, ?, ?, ?)";
            
        $roundtripBasePrice = round($basePrice * 0.95); // Slightly lower for round trips
        $roundtripPricePerKm = round($pricePerKm * 0.85, 1); // 85% of the one-way rate
        
        $insertOutstationFaresStmt = $conn->prepare($insertOutstationFaresQuery);
        $insertOutstationFaresStmt->bind_param('sdddddd', 
            $vehicleId, 
            $basePrice, 
            $pricePerKm, 
            $nightHaltCharge, 
            $driverAllowance,
            $roundtripBasePrice,
            $roundtripPricePerKm
        );
        
        // Don't fail completely if this table doesn't exist yet
        $insertOutstationFaresStmt->execute();
        
        // Commit transaction
        $conn->commit();
        
        // Prepare successful response
        $response['status'] = 'success';
        $response['message'] = "Vehicle '$vehicleName' created successfully";
        $response['vehicleId'] = $vehicleId;
        $response['vehicle'] = [
            'id' => $vehicleId,
            'vehicleId' => $vehicleId,
            'name' => $vehicleName,
            'capacity' => $capacity,
            'luggageCapacity' => $luggageCapacity,
            'ac' => $ac,
            'image' => $image,
            'description' => $description,
            'isActive' => $isActive,
            'basePrice' => $basePrice,
            'price' => $basePrice,
            'pricePerKm' => $pricePerKm,
            'nightHaltCharge' => $nightHaltCharge,
            'driverAllowance' => $driverAllowance
        ];
        
        logMessage("Vehicle '$vehicleName' created successfully with ID: $vehicleId");
        
    } catch (Exception $e) {
        // Rollback transaction on error
        $conn->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    $response['message'] = $e->getMessage();
    logMessage("Error creating vehicle: " . $e->getMessage());
}

// Send response
echo json_encode($response);
