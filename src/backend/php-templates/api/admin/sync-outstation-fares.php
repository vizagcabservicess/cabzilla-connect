
<?php
/**
 * This script syncs the outstation_fares table with vehicle_pricing table.
 * It can be run in either direction:
 * - from outstation_fares to vehicle_pricing (default)
 * - from vehicle_pricing to outstation_fares (with source=vehicle_pricing parameter)
 */
require_once '../../config.php';

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Add debugging headers
header('X-Debug-File: sync-outstation-fares.php');
header('X-API-Version: 1.0.3');
header('X-Timestamp: ' . time());

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $conn = getDbConnection();
    
    // Check if the connection was successful
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
    // Determine the sync direction
    $source = isset($_GET['source']) ? $_GET['source'] : 'outstation_fares';
    $vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null;
    
    // Start transaction
    $conn->begin_transaction();
    
    // Log the operation
    error_log("Starting sync operation with source: $source and vehicle_id: " . ($vehicleId ?: 'all'));
    
    $updated = 0;
    
    if ($source === 'outstation_fares') {
        // Sync from outstation_fares to vehicle_pricing
        
        // First one-way prices
        $syncQuery = "
            UPDATE vehicle_pricing vp
            JOIN outstation_fares of ON vp.vehicle_id = of.vehicle_id
            SET 
                vp.base_fare = of.base_price,
                vp.price_per_km = of.price_per_km,
                vp.night_halt_charge = of.night_halt_charge,
                vp.driver_allowance = of.driver_allowance,
                vp.updated_at = CURRENT_TIMESTAMP
            WHERE vp.trip_type IN ('outstation', 'outstation-one-way')
        ";
        
        // Add vehicle filter if specified
        if ($vehicleId) {
            $syncQuery .= " AND vp.vehicle_id = '$vehicleId'";
        }
        
        $syncResult = $conn->query($syncQuery);
        if (!$syncResult) {
            throw new Exception("Failed to sync one-way fares: " . $conn->error);
        }
        $updated += $conn->affected_rows;
        
        // Then round-trip prices
        $syncRtQuery = "
            UPDATE vehicle_pricing vp
            JOIN outstation_fares of ON vp.vehicle_id = of.vehicle_id
            SET 
                vp.base_fare = of.roundtrip_base_price,
                vp.price_per_km = of.roundtrip_price_per_km,
                vp.night_halt_charge = of.night_halt_charge,
                vp.driver_allowance = of.driver_allowance,
                vp.updated_at = CURRENT_TIMESTAMP
            WHERE vp.trip_type = 'outstation-round-trip'
        ";
        
        // Add vehicle filter if specified
        if ($vehicleId) {
            $syncRtQuery .= " AND vp.vehicle_id = '$vehicleId'";
        }
        
        $syncRtResult = $conn->query($syncRtQuery);
        if (!$syncRtResult) {
            throw new Exception("Failed to sync round-trip fares: " . $conn->error);
        }
        $updated += $conn->affected_rows;
        
        error_log("Synced $updated records from outstation_fares to vehicle_pricing");
    } else {
        // Sync from vehicle_pricing to outstation_fares
        
        // First get the one-way prices
        $getOneWayQuery = "
            SELECT 
                vp.vehicle_id,
                vp.base_fare,
                vp.price_per_km,
                vp.night_halt_charge,
                vp.driver_allowance
            FROM 
                vehicle_pricing vp
            WHERE 
                (vp.trip_type = 'outstation' OR vp.trip_type = 'outstation-one-way')
        ";
        
        // Add vehicle filter if specified
        if ($vehicleId) {
            $getOneWayQuery .= " AND vp.vehicle_id = '$vehicleId'";
        }
        
        $oneWayResult = $conn->query($getOneWayQuery);
        if (!$oneWayResult) {
            throw new Exception("Failed to get one-way fares: " . $conn->error);
        }
        
        // Process each vehicle
        while ($row = $oneWayResult->fetch_assoc()) {
            $vId = $row['vehicle_id'];
            $baseFare = $row['base_fare'];
            $pricePerKm = $row['price_per_km'];
            $nightHaltCharge = $row['night_halt_charge'];
            $driverAllowance = $row['driver_allowance'];
            
            // Get round-trip prices if available
            $getRtQuery = "
                SELECT base_fare, price_per_km 
                FROM vehicle_pricing 
                WHERE vehicle_id = '$vId' AND trip_type = 'outstation-round-trip'
            ";
            
            $rtResult = $conn->query($getRtQuery);
            $rtRow = $rtResult->fetch_assoc();
            
            $rtBaseFare = ($rtRow && isset($rtRow['base_fare'])) ? $rtRow['base_fare'] : 0;
            $rtPricePerKm = ($rtRow && isset($rtRow['price_per_km'])) ? $rtRow['price_per_km'] : 0;
            
            // Check if vehicle exists in outstation_fares
            $checkQuery = "SELECT id FROM outstation_fares WHERE vehicle_id = '$vId'";
            $checkResult = $conn->query($checkQuery);
            
            if ($checkResult->num_rows > 0) {
                // Update existing record
                $updateQuery = "
                    UPDATE outstation_fares 
                    SET 
                        base_price = $baseFare,
                        price_per_km = $pricePerKm,
                        night_halt_charge = $nightHaltCharge,
                        driver_allowance = $driverAllowance,
                        roundtrip_base_price = $rtBaseFare,
                        roundtrip_price_per_km = $rtPricePerKm,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE vehicle_id = '$vId'
                ";
                
                if (!$conn->query($updateQuery)) {
                    throw new Exception("Failed to update outstation_fares for $vId: " . $conn->error);
                }
            } else {
                // Insert new record
                $insertQuery = "
                    INSERT INTO outstation_fares (
                        vehicle_id, base_price, price_per_km, night_halt_charge, driver_allowance,
                        roundtrip_base_price, roundtrip_price_per_km
                    ) VALUES (
                        '$vId', $baseFare, $pricePerKm, $nightHaltCharge, $driverAllowance,
                        $rtBaseFare, $rtPricePerKm
                    )
                ";
                
                if (!$conn->query($insertQuery)) {
                    throw new Exception("Failed to insert into outstation_fares for $vId: " . $conn->error);
                }
            }
            
            $updated++;
        }
        
        error_log("Synced $updated records from vehicle_pricing to outstation_fares");
    }
    
    // Commit the transaction
    $conn->commit();
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'message' => "Successfully synced $updated records between outstation_fares and vehicle_pricing",
        'direction' => $source === 'outstation_fares' ? 'outstation_fares → vehicle_pricing' : 'vehicle_pricing → outstation_fares',
        'updated' => $updated,
        'timestamp' => time()
    ]);
    
} catch (Exception $e) {
    // Rollback transaction if there was an error
    if (isset($conn) && $conn->ping()) {
        $conn->rollback();
    }
    
    error_log("Error in sync-outstation-fares.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
