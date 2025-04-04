
<?php
/**
 * Admin-specific vehicle data endpoint
 * This provides extended vehicle information for admin interfaces
 */

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode, X-Debug, Cache-Control');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Process GET parameters
$includeInactive = isset($_GET['includeInactive']) && $_GET['includeInactive'] === 'true';
$forceRefresh = isset($_GET['force']) && $_GET['force'] === 'true';
$vehicleId = isset($_GET['id']) ? $_GET['id'] : null;

// Log request for debugging
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

$logFile = $logDir . '/admin_vehicles_data_' . date('Y-m-d') . '.log';
$timestamp = date('Y-m-d H:i:s');
file_put_contents($logFile, "[$timestamp] Admin vehicles data request: includeInactive=$includeInactive, forceRefresh=$forceRefresh" . ($vehicleId ? ", vehicleId=$vehicleId" : "") . "\n", FILE_APPEND);

// This endpoint should always return the same data as the main vehicles-data.php
// but ensure we're passing the admin mode flag
$_SERVER['HTTP_X_ADMIN_MODE'] = 'true';

// Before including the main file, let's make sure the cache directories exist
$cacheDir = __DIR__ . '/../../cache';
if (!file_exists($cacheDir)) {
    mkdir($cacheDir, 0777, true);
}

// Check if persistent cache file exists, if not, create it
$persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
if (!file_exists($persistentCacheFile)) {
    // Create default vehicle data
    $defaultVehicles = [
        [
            'id' => 'sedan',
            'vehicleId' => 'sedan',
            'name' => 'Sedan',
            'capacity' => 4,
            'luggageCapacity' => 2,
            'price' => 2500,
            'basePrice' => 2500,
            'pricePerKm' => 14,
            'image' => '/cars/sedan.png',
            'amenities' => ['AC', 'Bottle Water', 'Music System'],
            'description' => 'Comfortable sedan suitable for 4 passengers.',
            'ac' => true,
            'nightHaltCharge' => 700,
            'driverAllowance' => 250,
            'isActive' => true
        ],
        [
            'id' => 'ertiga',
            'vehicleId' => 'ertiga',
            'name' => 'Ertiga',
            'capacity' => 6,
            'luggageCapacity' => 3,
            'price' => 3200,
            'basePrice' => 3200,
            'pricePerKm' => 18,
            'image' => '/cars/ertiga.png',
            'amenities' => ['AC', 'Bottle Water', 'Music System', 'Extra Legroom'],
            'description' => 'Spacious SUV suitable for 6 passengers.',
            'ac' => true,
            'nightHaltCharge' => 1000,
            'driverAllowance' => 250,
            'isActive' => true
        ],
        [
            'id' => 'innova_crysta',
            'vehicleId' => 'innova_crysta',
            'name' => 'Innova Crysta',
            'capacity' => 7,
            'luggageCapacity' => 4,
            'price' => 3800,
            'basePrice' => 3800,
            'pricePerKm' => 20,
            'image' => '/cars/innova.png',
            'amenities' => ['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point'],
            'description' => 'Premium SUV with ample space for 7 passengers.',
            'ac' => true,
            'nightHaltCharge' => 1000,
            'driverAllowance' => 250,
            'isActive' => true
        ],
        [
            'id' => 'luxury',
            'vehicleId' => 'luxury',
            'name' => 'Luxury Sedan',
            'capacity' => 4,
            'luggageCapacity' => 3,
            'price' => 4500,
            'basePrice' => 4500,
            'pricePerKm' => 25,
            'image' => '/cars/luxury.png',
            'amenities' => ['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point', 'Premium Amenities'],
            'description' => 'Premium luxury sedan with high-end amenities for a comfortable journey.',
            'ac' => true,
            'nightHaltCharge' => 1200,
            'driverAllowance' => 300,
            'isActive' => true
        ],
        [
            'id' => 'tempo_traveller',
            'vehicleId' => 'tempo_traveller',
            'name' => 'Tempo Traveller',
            'capacity' => 12,
            'luggageCapacity' => 8,
            'price' => 5500,
            'basePrice' => 5500,
            'pricePerKm' => 25,
            'image' => '/cars/tempo.png',
            'amenities' => ['AC', 'Bottle Water', 'Music System', 'Extra Legroom', 'Charging Point', 'Pushback Seats'],
            'description' => 'Large vehicle suitable for groups of up to 12 passengers.',
            'ac' => true,
            'nightHaltCharge' => 1200,
            'driverAllowance' => 300,
            'isActive' => true
        ]
    ];
    
    $jsonOptions = defined('JSON_PRETTY_PRINT') ? JSON_PRETTY_PRINT : 0;
    $writeResult = file_put_contents($persistentCacheFile, json_encode($defaultVehicles, $jsonOptions));
    
    if ($writeResult === false) {
        file_put_contents($logFile, "[$timestamp] Failed to write default vehicles to persistent cache\n", FILE_APPEND);
    } else {
        file_put_contents($logFile, "[$timestamp] Created new persistent cache file with default vehicles\n", FILE_APPEND);
    }
} else if ($forceRefresh) {
    // If we're doing a force refresh, first check if we need to reload from persistent storage
    file_put_contents($logFile, "[$timestamp] Force refresh requested, checking if reload from persistent storage is needed\n", FILE_APPEND);
    
    // Try to load the persistent data first to make sure it's valid
    $persistentJson = file_get_contents($persistentCacheFile);
    if ($persistentJson) {
        try {
            $persistentData = json_decode($persistentJson, true);
            if (!is_array($persistentData)) {
                file_put_contents($logFile, "[$timestamp] Invalid persistent data format, not an array\n", FILE_APPEND);
                // Try to create a backup of the problematic file
                $backupFile = $cacheDir . '/vehicles_persistent_backup_' . time() . '.json';
                copy($persistentCacheFile, $backupFile);
                file_put_contents($logFile, "[$timestamp] Created backup of problematic file at $backupFile\n", FILE_APPEND);
            } else {
                file_put_contents($logFile, "[$timestamp] Successfully loaded " . count($persistentData) . " vehicles from persistent storage\n", FILE_APPEND);
            }
        } catch (Exception $e) {
            file_put_contents($logFile, "[$timestamp] Error parsing persistent JSON: " . $e->getMessage() . "\n", FILE_APPEND);
            // Try to create a backup of the problematic file
            $backupFile = $cacheDir . '/vehicles_persistent_backup_' . time() . '.json';
            copy($persistentCacheFile, $backupFile);
            file_put_contents($logFile, "[$timestamp] Created backup of problematic file at $backupFile\n", FILE_APPEND);
        }
    } else {
        file_put_contents($logFile, "[$timestamp] Failed to read persistent cache file\n", FILE_APPEND);
    }
}

// For admin access, clear any temporary cache files before loading
if ($forceRefresh) {
    $cacheFiles = glob($cacheDir . '/vehicles_*.json');
    $cleared = 0;
    foreach ($cacheFiles as $file) {
        // Don't delete the persistent file itself
        if ($file !== $persistentCacheFile) {
            if (@unlink($file)) {
                $cleared++;
                file_put_contents($logFile, "[$timestamp] Cleared temporary cache file: " . basename($file) . "\n", FILE_APPEND);
            }
        }
    }
    file_put_contents($logFile, "[$timestamp] Force refresh: cleared $cleared temporary cache files\n", FILE_APPEND);
}

// Just include the main vehicles-data.php which now has persistent storage logic
require_once __DIR__ . '/../vehicles-data.php';
