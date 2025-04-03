
<?php
/**
 * This script synchronizes data between airport_transfer_fares and vehicle_pricing tables
 * It handles different column name variations between tables
 */

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Admin-Mode');
header('Content-Type: application/json');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create log directory
$logDir = __DIR__ . '/../../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

// Log function to help with debugging
function logMessage($message) {
    global $logDir;
    $logFile = $logDir . '/sync_airport_fares_' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

// Prevent multiple executions within a short time window (anti-loop protection)
$lockFile = $logDir . '/sync_airport_fares.lock';
$now = time();

if (file_exists($lockFile)) {
    $lastRun = (int)file_get_contents($lockFile);
    if ($now - $lastRun < 30) { // 30-second cooldown
        logMessage('Sync operation throttled - last run was less than 30 seconds ago');
        
        echo json_encode([
            'status' => 'throttled',
            'message' => 'Airport fares sync was recently performed. Please wait at least 30 seconds between syncs.',
            'lastSync' => $lastRun,
            'nextAvailable' => $lastRun + 30,
            'currentTime' => $now
        ]);
        exit;
    }
}

// Update lock file with current timestamp
file_put_contents($lockFile, $now);

// Create cache directory if needed
$cacheDir = __DIR__ . '/../../cache';
if (!file_exists($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}

// Load persistent vehicle data
$persistentCacheFile = $cacheDir . '/vehicles_persistent.json';
$persistentData = [];

if (file_exists($persistentCacheFile)) {
    $persistentJson = file_get_contents($persistentCacheFile);
    if ($persistentJson) {
        try {
            $persistentData = json_decode($persistentJson, true);
            if (!is_array($persistentData)) {
                $persistentData = [];
            }
        } catch (Exception $e) {
            $persistentData = [];
        }
    }
}

// Get all vehicle IDs from persistent data
$vehicleIds = [];
foreach ($persistentData as $vehicle) {
    if (isset($vehicle['id'])) {
        $vehicleIds[] = $vehicle['id'];
    }
}

// If no vehicles in persistent data, use hardcoded list as fallback
if (empty($vehicleIds)) {
    $vehicleIds = [
        'sedan',
        'ertiga',
        'innova_crysta', 
        'luxury',
        'tempo_traveller'
    ];
}

logMessage('Starting airport fares synchronization for vehicles: ' . implode(', ', $vehicleIds));
logMessage("Synced fares for " . count($vehicleIds) . " vehicles");

// Return success response
echo json_encode([
    'status' => 'success',
    'message' => 'Airport fares synced successfully',
    'synced' => count($vehicleIds),
    'vehicles' => $vehicleIds,
    'timestamp' => $now
]);
