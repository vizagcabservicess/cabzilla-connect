<?php
// Alias for vehicle-update.php
// This file simply includes the main vehicle-update.php file for compatibility
// with different API endpoint naming conventions

// First, set all necessary CORS headers for preflight requests
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');

// Handle OPTIONS request directly here to ensure it works
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log request for debugging
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/vehicle_update_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');
$requestMethod = $_SERVER['REQUEST_METHOD'];

// Get the raw input data for logging
$rawInput = file_get_contents('php://input');
file_put_contents($logFile, "[$timestamp] $requestMethod request received\n", FILE_APPEND);
file_put_contents($logFile, "[$timestamp] Input data: $rawInput\n", FILE_APPEND);

// Before passing to vehicle-update.php, make sure the data is parsed and set correctly
$vehicleData = json_decode($rawInput, true);
if (!$vehicleData && $_POST) {
    $vehicleData = $_POST;
    file_put_contents($logFile, "[$timestamp] Using POST data instead\n", FILE_APPEND);
}

// Force values to be set when passed to the update script
if ($vehicleData) {
    // If id/vehicleId is provided but no price data, keep these fields non-zero
    // to prevent data loss during refresh
    if (!isset($vehicleData['price']) || $vehicleData['price'] === 0) {
        // Try to look up current price from database or use a default
        $vehicleData['price'] = $vehicleData['basePrice'] ?? 1500;
    }
    
    if (!isset($vehicleData['basePrice']) || $vehicleData['basePrice'] === 0) {
        $vehicleData['basePrice'] = $vehicleData['price'] ?? 1500;
    }
    
    if (!isset($vehicleData['pricePerKm']) || $vehicleData['pricePerKm'] === 0) {
        $vehicleData['pricePerKm'] = 14; // Default value
    }
    
    if (!isset($vehicleData['isActive'])) {
        $vehicleData['isActive'] = true;
    }
    
    if (empty($vehicleData['amenities'])) {
        $vehicleData['amenities'] = ['AC', 'Bottle Water', 'Music System'];
    }
    
    // Make sure the data is available to vehicle-update.php
    $_POST = array_merge($_POST, $vehicleData);
    $_SERVER['VEHICLE_DATA'] = $vehicleData;
    file_put_contents($logFile, "[$timestamp] Enhanced data: " . json_encode($vehicleData) . "\n", FILE_APPEND);
}

// Include the main vehicle update file
require_once __DIR__ . '/vehicle-update.php';
