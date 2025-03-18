
<?php
require_once '../../config.php';

// Allow only GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(['error' => 'Method not allowed'], 405);
}

// Connect to database
$conn = getDbConnection();

try {
    // Get all vehicle pricing
    $stmt = $conn->prepare("SELECT * FROM vehicle_pricing ORDER BY id");
    $stmt->execute();
    $result = $stmt->get_result();

    $vehiclePricing = [];
    while ($row = $result->fetch_assoc()) {
        // Convert numeric strings to actual numbers
        $pricing = [
            'id' => intval($row['id']),
            'vehicleType' => $row['vehicle_type'],
            'basePrice' => floatval($row['base_price']),
            'pricePerKm' => floatval($row['price_per_km']),
            'nightHaltCharge' => floatval($row['night_halt_charge']),
            'driverAllowance' => floatval($row['driver_allowance']),
            'isActive' => true // Default value to prevent type errors
        ];
        
        $vehiclePricing[] = $pricing;
    }

    // Send response as a simple array, not an object with numbered keys
    sendJsonResponse($vehiclePricing);
} catch (Exception $e) {
    logError("Error fetching vehicle pricing", ['error' => $e->getMessage()]);
    sendJsonResponse(['error' => 'Failed to fetch vehicle pricing: ' . $e->getMessage()], 500);
}
