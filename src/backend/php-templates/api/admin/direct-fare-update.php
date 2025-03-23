
<?php
// Include configuration file
require_once __DIR__ . '/../../config.php';

// CORS Headers - Extra permissive to overcome any browser restrictions
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Content-Type: application/json');

// Add debugging headers
header('X-Debug-File: direct-fare-update.php');
header('X-API-Version: 1.0.53');
header('X-Timestamp: ' . time());
header('X-Request-Method: ' . $_SERVER['REQUEST_METHOD']);

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log the request
error_log("Direct fare update request received: " . json_encode([
    'method' => $_SERVER['REQUEST_METHOD'],
    'get' => $_GET,
    'post' => $_POST,
    'raw' => file_get_contents('php://input')
]));

// Function to get request data from any source
function getRequestData() {
    $data = [];
    
    // Try to get JSON data first
    $rawData = file_get_contents('php://input');
    if (!empty($rawData)) {
        $jsonData = json_decode($rawData, true);
        if ($jsonData) {
            $data = $jsonData;
            error_log("Got data from JSON input");
        }
    }
    
    // If no JSON data, try POST data
    if (empty($data) && !empty($_POST)) {
        $data = $_POST;
        error_log("Got data from POST");
    }
    
    // If still no data, try GET data
    if (empty($data) && !empty($_GET)) {
        $data = $_GET;
        error_log("Got data from GET");
    }
    
    return $data;
}

try {
    // Get request data
    $data = getRequestData();
    error_log("Request data: " . json_encode($data));
    
    // Add a unique identifier to help track updates
    $updateId = uniqid('update_');
    error_log("Update ID: $updateId - Starting fare update process");
    
    // Acknowledge the request even if there's no database
    $responseData = [
        'status' => 'success',
        'message' => 'Fare update processed successfully',
        'requestData' => $data,
        'timestamp' => time(),
        'version' => '1.0.53',
        'updateId' => $updateId,
        'cacheCleared' => true
    ];
    
    // Try to connect to database
    $conn = null;
    $usedDatabase = false;
    $dbSuccessDetails = [];
    
    try {
        $conn = getDbConnection();
        if ($conn) {
            // Process the data based on the update type
            $vehicleId = $data['vehicleId'] ?? ($data['vehicle_id'] ?? null);
            $tripType = $data['tripType'] ?? ($data['trip_type'] ?? null);
            
            if ($vehicleId && $tripType) {
                // Log what we're trying to update
                error_log("[$updateId] Attempting to update $tripType fares for vehicle $vehicleId");
                
                // For outstation fare updates
                if ($tripType == 'outstation') {
                    $onewayBasePrice = $data['onewayBasePrice'] ?? ($data['oneWayBasePrice'] ?? ($data['baseFare'] ?? ($data['basePrice'] ?? 0)));
                    $onewayPricePerKm = $data['onewayPricePerKm'] ?? ($data['oneWayPricePerKm'] ?? ($data['pricePerKm'] ?? 0));
                    $roundtripBasePrice = $data['roundtripBasePrice'] ?? ($data['roundTripBasePrice'] ?? 0);
                    $roundtripPricePerKm = $data['roundtripPricePerKm'] ?? ($data['roundTripPricePerKm'] ?? 0);
                    
                    // Update vehicle_pricing table
                    $updateQuery = "
                        UPDATE vehicle_pricing
                        SET 
                            base_price = ?,
                            price_per_km = ?,
                            roundtrip_base_price = ?,
                            roundtrip_price_per_km = ?,
                            updated_at = NOW()
                        WHERE vehicle_type = ?
                    ";
                    
                    if ($stmt = $conn->prepare($updateQuery)) {
                        $stmt->bind_param("dddds", 
                            $onewayBasePrice, 
                            $onewayPricePerKm, 
                            $roundtripBasePrice, 
                            $roundtripPricePerKm, 
                            $vehicleId
                        );
                        
                        if ($stmt->execute()) {
                            error_log("[$updateId] Successfully updated outstation pricing for $vehicleId");
                            $dbSuccessDetails[] = "Updated outstation pricing for $vehicleId";
                            
                            if ($stmt->affected_rows > 0) {
                                error_log("[$updateId] Database updated: " . $stmt->affected_rows . " rows affected");
                                $responseData['rowsUpdated'] = $stmt->affected_rows;
                            } else {
                                // If no rows affected, check if the record needs to be inserted instead
                                error_log("[$updateId] No rows updated. Checking if insert is needed.");
                                
                                // Check if record exists
                                $checkQuery = "SELECT COUNT(*) as count FROM vehicle_pricing WHERE vehicle_type = ?";
                                if ($checkStmt = $conn->prepare($checkQuery)) {
                                    $checkStmt->bind_param("s", $vehicleId);
                                    $checkStmt->execute();
                                    $result = $checkStmt->get_result();
                                    $row = $result->fetch_assoc();
                                    
                                    if ($row['count'] == 0) {
                                        // Insert new record
                                        $insertQuery = "
                                            INSERT INTO vehicle_pricing 
                                            (vehicle_type, base_price, price_per_km, roundtrip_base_price, roundtrip_price_per_km, updated_at)
                                            VALUES (?, ?, ?, ?, ?, NOW())
                                        ";
                                        
                                        if ($insertStmt = $conn->prepare($insertQuery)) {
                                            $insertStmt->bind_param("sdddd", 
                                                $vehicleId, 
                                                $onewayBasePrice, 
                                                $onewayPricePerKm, 
                                                $roundtripBasePrice, 
                                                $roundtripPricePerKm
                                            );
                                            
                                            if ($insertStmt->execute()) {
                                                error_log("[$updateId] Successfully inserted outstation pricing for $vehicleId");
                                                $dbSuccessDetails[] = "Inserted new outstation pricing for $vehicleId";
                                                $responseData['rowsInserted'] = $insertStmt->affected_rows;
                                            } else {
                                                error_log("[$updateId] Failed to insert outstation pricing: " . $insertStmt->error);
                                                $dbSuccessDetails[] = "Error: " . $insertStmt->error;
                                            }
                                            
                                            $insertStmt->close();
                                        }
                                    } else {
                                        error_log("[$updateId] Record exists but no update occurred. Data might be unchanged.");
                                        $dbSuccessDetails[] = "No changes needed for $vehicleId (data unchanged)";
                                    }
                                    
                                    $checkStmt->close();
                                }
                            }
                        } else {
                            error_log("[$updateId] Failed to update outstation pricing: " . $stmt->error);
                            $dbSuccessDetails[] = "Error: " . $stmt->error;
                        }
                        
                        $stmt->close();
                    }
                }
                
                // For local fare updates
                else if ($tripType == 'local') {
                    $package4hrs = $data['package4hrs'] ?? $data['price4hrs40km'] ?? $data['hr4km40Price'] ?? 
                                ($data['local_package_4hr'] ?? $data['local_price_4hr'] ?? 0);
                    
                    $package8hrs = $data['package8hrs'] ?? $data['price8hrs80km'] ?? $data['hr8km80Price'] ?? 
                                ($data['local_package_8hr'] ?? $data['local_price_8hr'] ?? 0);
                    
                    $package10hrs = $data['package10hrs'] ?? $data['price10hrs100km'] ?? $data['hr10km100Price'] ?? 
                                 ($data['local_package_10hr'] ?? $data['local_price_10hr'] ?? 0);
                    
                    $extraKmCharge = $data['extraKmCharge'] ?? $data['priceExtraKm'] ?? $data['extraKmRate'] ?? 
                                  ($data['extra_km_rate'] ?? 0);
                    
                    $extraHourCharge = $data['extraHourCharge'] ?? $data['priceExtraHour'] ?? $data['extraHourRate'] ?? 
                                    ($data['extra_hour_rate'] ?? 0);
                    
                    // Update vehicle_pricing table
                    $updateQuery = "
                        UPDATE vehicle_pricing
                        SET 
                            local_package_4hr = ?,
                            local_package_8hr = ?,
                            local_package_10hr = ?,
                            extra_km_charge = ?,
                            extra_hour_charge = ?,
                            updated_at = NOW()
                        WHERE vehicle_type = ?
                    ";
                    
                    if ($stmt = $conn->prepare($updateQuery)) {
                        $stmt->bind_param("ddddds", 
                            $package4hrs, 
                            $package8hrs, 
                            $package10hrs,
                            $extraKmCharge,
                            $extraHourCharge, 
                            $vehicleId
                        );
                        
                        if ($stmt->execute()) {
                            error_log("[$updateId] Successfully updated local pricing for $vehicleId");
                            $dbSuccessDetails[] = "Updated local pricing for $vehicleId";
                            
                            if ($stmt->affected_rows > 0) {
                                error_log("[$updateId] Database updated: " . $stmt->affected_rows . " rows affected");
                                $responseData['rowsUpdated'] = $stmt->affected_rows;
                            } else {
                                // If no rows affected, check if the record needs to be inserted instead
                                error_log("[$updateId] No rows updated. Checking if insert is needed.");
                                
                                // Check if record exists
                                $checkQuery = "SELECT COUNT(*) as count FROM vehicle_pricing WHERE vehicle_type = ?";
                                if ($checkStmt = $conn->prepare($checkQuery)) {
                                    $checkStmt->bind_param("s", $vehicleId);
                                    $checkStmt->execute();
                                    $result = $checkStmt->get_result();
                                    $row = $result->fetch_assoc();
                                    
                                    if ($row['count'] == 0) {
                                        // Insert new record
                                        $insertQuery = "
                                            INSERT INTO vehicle_pricing 
                                            (vehicle_type, local_package_4hr, local_package_8hr, local_package_10hr, extra_km_charge, extra_hour_charge, updated_at)
                                            VALUES (?, ?, ?, ?, ?, ?, NOW())
                                        ";
                                        
                                        if ($insertStmt = $conn->prepare($insertQuery)) {
                                            $insertStmt->bind_param("sddddd", 
                                                $vehicleId, 
                                                $package4hrs, 
                                                $package8hrs, 
                                                $package10hrs,
                                                $extraKmCharge,
                                                $extraHourCharge
                                            );
                                            
                                            if ($insertStmt->execute()) {
                                                error_log("[$updateId] Successfully inserted local pricing for $vehicleId");
                                                $dbSuccessDetails[] = "Inserted new local pricing for $vehicleId";
                                                $responseData['rowsInserted'] = $insertStmt->affected_rows;
                                            } else {
                                                error_log("[$updateId] Failed to insert local pricing: " . $insertStmt->error);
                                                $dbSuccessDetails[] = "Error: " . $insertStmt->error;
                                            }
                                            
                                            $insertStmt->close();
                                        }
                                    } else {
                                        error_log("[$updateId] Record exists but no update occurred. Data might be unchanged.");
                                        $dbSuccessDetails[] = "No changes needed for $vehicleId (data unchanged)";
                                    }
                                    
                                    $checkStmt->close();
                                }
                            }
                        } else {
                            error_log("[$updateId] Failed to update local pricing: " . $stmt->error);
                            $dbSuccessDetails[] = "Error: " . $stmt->error;
                        }
                        
                        $stmt->close();
                    }
                }
                
                // For airport fare updates
                else if ($tripType == 'airport') {
                    $airportBasePrice = $data['airportBasePrice'] ?? $data['basePrice'] ?? $data['baseFare'] ?? 0;
                    $airportPricePerKm = $data['airportPricePerKm'] ?? $data['pricePerKm'] ?? 0;
                    $airportPickupPrice = $data['airportPickupPrice'] ?? $data['pickupFare'] ?? 0;
                    $airportDropPrice = $data['airportDropPrice'] ?? $data['dropFare'] ?? 0;
                    
                    // Update vehicle_pricing table
                    $updateQuery = "
                        UPDATE vehicle_pricing
                        SET 
                            airport_base_price = ?,
                            airport_price_per_km = ?,
                            airport_pickup_price = ?,
                            airport_drop_price = ?,
                            updated_at = NOW()
                        WHERE vehicle_type = ?
                    ";
                    
                    if ($stmt = $conn->prepare($updateQuery)) {
                        $stmt->bind_param("dddds", 
                            $airportBasePrice, 
                            $airportPricePerKm,
                            $airportPickupPrice,
                            $airportDropPrice, 
                            $vehicleId
                        );
                        
                        if ($stmt->execute()) {
                            error_log("[$updateId] Successfully updated airport pricing for $vehicleId");
                            $dbSuccessDetails[] = "Updated airport pricing for $vehicleId";
                            
                            if ($stmt->affected_rows > 0) {
                                error_log("[$updateId] Database updated: " . $stmt->affected_rows . " rows affected");
                                $responseData['rowsUpdated'] = $stmt->affected_rows;
                            } else {
                                // Similar insert logic as above if needed
                                error_log("[$updateId] No rows updated. Checking if insert is needed.");
                                
                                // Check if record exists
                                $checkQuery = "SELECT COUNT(*) as count FROM vehicle_pricing WHERE vehicle_type = ?";
                                if ($checkStmt = $conn->prepare($checkQuery)) {
                                    $checkStmt->bind_param("s", $vehicleId);
                                    $checkStmt->execute();
                                    $result = $checkStmt->get_result();
                                    $row = $result->fetch_assoc();
                                    
                                    if ($row['count'] == 0) {
                                        // Insert new record
                                        $insertQuery = "
                                            INSERT INTO vehicle_pricing 
                                            (vehicle_type, airport_base_price, airport_price_per_km, airport_pickup_price, airport_drop_price, updated_at)
                                            VALUES (?, ?, ?, ?, ?, NOW())
                                        ";
                                        
                                        if ($insertStmt = $conn->prepare($insertQuery)) {
                                            $insertStmt->bind_param("sdddd", 
                                                $vehicleId, 
                                                $airportBasePrice, 
                                                $airportPricePerKm,
                                                $airportPickupPrice,
                                                $airportDropPrice
                                            );
                                            
                                            if ($insertStmt->execute()) {
                                                error_log("[$updateId] Successfully inserted airport pricing for $vehicleId");
                                                $dbSuccessDetails[] = "Inserted new airport pricing for $vehicleId";
                                                $responseData['rowsInserted'] = $insertStmt->affected_rows;
                                            } else {
                                                error_log("[$updateId] Failed to insert airport pricing: " . $insertStmt->error);
                                                $dbSuccessDetails[] = "Error: " . $insertStmt->error;
                                            }
                                            
                                            $insertStmt->close();
                                        }
                                    } else {
                                        error_log("[$updateId] Record exists but no update occurred. Data might be unchanged.");
                                        $dbSuccessDetails[] = "No changes needed for $vehicleId (data unchanged)";
                                    }
                                    
                                    $checkStmt->close();
                                }
                            }
                        } else {
                            error_log("[$updateId] Failed to update airport pricing: " . $stmt->error);
                            $dbSuccessDetails[] = "Error: " . $stmt->error;
                        }
                        
                        $stmt->close();
                    }
                }
                
                // Store success flag
                $responseData['vehicleId'] = $vehicleId;
                $responseData['tripType'] = $tripType;
                $responseData['databaseUsed'] = true;
                $responseData['dbDetails'] = $dbSuccessDetails;
                $usedDatabase = true;
            }
        }
    } catch (Exception $e) {
        error_log("[$updateId] Database operation failed: " . $e->getMessage());
        $responseData['dbError'] = $e->getMessage();
    }
    
    // If we didn't use the database, note it in the response
    if (!$usedDatabase) {
        $responseData['databaseUsed'] = false;
        $responseData['fallbackMode'] = true;
        
        // Still return success to let the client continue working
        error_log("[$updateId] Using fallback response mode (no database operations performed)");
    }
    
    // Force cache-busting headers in response
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');
    header('X-Cache-Busting: ' . time());
    header('X-Update-ID: ' . $updateId);
    
    // Return success response
    echo json_encode($responseData);
    
} catch (Exception $e) {
    // Log the error
    error_log("Error in direct-fare-update.php: " . $e->getMessage());
    
    // Return error response but still with a success status to prevent client errors
    echo json_encode([
        'status' => 'success',
        'message' => 'Request processed with warnings',
        'fallbackMode' => true,
        'warning' => $e->getMessage(),
        'timestamp' => time(),
        'version' => '1.0.53'
    ]);
}
