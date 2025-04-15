
<?php
// Mock PHP file for direct-local-fares.php
// Note: This file won't actually be executed in the Lovable preview environment,
// but it helps document the expected API structure and responses.

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh');
header('Content-Type: application/json');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include database utilities
require_once __DIR__ . '/../utils/database.php';

// Get vehicle ID from query string
$vehicleId = isset($_GET['vehicle_id']) ? $_GET['vehicle_id'] : null;

// If vehicle ID is not in query string, check for it in JSON body for POST requests
if (!$vehicleId && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $vehicleId = isset($data['vehicleId']) ? $data['vehicleId'] : (isset($data['vehicle_id']) ? $data['vehicle_id'] : null);
}

// If vehicle ID is not in JSON body, check POST data
if (!$vehicleId && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $vehicleId = isset($_POST['vehicleId']) ? $_POST['vehicleId'] : (isset($_POST['vehicle_id']) ? $_POST['vehicle_id'] : null);
}

// If still no vehicleId, set a default for the mock data
if (!$vehicleId) {
    $vehicleId = 'sedan';
}

// IMPORTANT: Additional normalization for common vehicle name variations
// This ensures we catch all possible vehicle name formats
function normalizeVehicleId($vehicleId) {
    // Convert to lowercase and replace spaces with underscores
    $result = strtolower(trim($vehicleId));
    $result = preg_replace('/[^a-z0-9_]/', '', str_replace(' ', '_', $result));
    
    // Handle common variations
    $mappings = [
        'innovahycross' => 'innova_hycross',
        'innovacrystal' => 'innova_crysta',
        'innovacrystal' => 'innova_crysta',
        'innovacrista' => 'innova_crysta',
        'innova_crista' => 'innova_crysta',
        'innovahicross' => 'innova_hycross',
        'innova_hicross' => 'innova_hycross',
        'tempotraveller' => 'tempo_traveller',
        'tempo_traveler' => 'tempo_traveller',
        'cng' => 'dzire_cng',
        'dzirecng' => 'dzire_cng',
        'sedancng' => 'dzire_cng',
        'swift' => 'sedan',
        'swiftdzire' => 'dzire',
        'swift_dzire' => 'dzire',
        'innovaold' => 'innova_crysta'
    ];
    
    foreach ($mappings as $search => $replace) {
        if ($result === $search) {
            return $replace;
        }
    }
    
    return $result;
}

// Normalize vehicle ID for consistency
$normalizedVehicleId = normalizeVehicleId($vehicleId);

// First attempt to get data directly from database
$localFares = [];
$dbSuccess = false;

try {
    // Connect to database
    $conn = getDbConnection();
    
    if ($conn) {
        // Query the local_package_fares table directly - try different variations of vehicle ID
        $possibleVehicleIds = [
            $normalizedVehicleId,
            str_replace('_', '', $normalizedVehicleId),
            // Add common variations for vehicle types
            str_replace('dzire_cng', 'dzire', $normalizedVehicleId),
            str_replace('dzire_cng', 'cng', $normalizedVehicleId),
            str_replace('innova_hycross', 'innova', $normalizedVehicleId),
            str_replace('innova_crysta', 'innova', $normalizedVehicleId),
            str_replace('tempo_traveller', 'tempo', $normalizedVehicleId)
        ];
        
        // Try to find an exact match first
        $exactMatch = false;
        foreach ($possibleVehicleIds as $possibleId) {
            if (empty($possibleId)) continue;
            
            $query = "SELECT * FROM local_package_fares WHERE vehicle_id = ? LIMIT 1";
            $stmt = $conn->prepare($query);
            $stmt->bind_param("s", $possibleId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result && $row = $result->fetch_assoc()) {
                // Successfully found data in database
                $localFares[] = [
                    'vehicleId' => $row['vehicle_id'],
                    'price4hrs40km' => (float)$row['price_4hrs_40km'],
                    'price8hrs80km' => (float)$row['price_8hrs_80km'],
                    'price10hrs100km' => (float)$row['price_10hrs_100km'],
                    'priceExtraKm' => (float)$row['price_extra_km'],
                    'priceExtraHour' => (float)$row['price_extra_hour'],
                    'source' => 'database',
                    'timestamp' => time()
                ];
                $dbSuccess = true;
                $exactMatch = true;
                break; // Found a match, exit the loop
            }
        }
        
        // If still not found, try checking for column name variations
        if (!$exactMatch) {
            // Try a more flexible query with alternate column names
            $query = "SHOW COLUMNS FROM local_package_fares";
            $stmt = $conn->prepare($query);
            $stmt->execute();
            $columnsResult = $stmt->get_result();
            
            $columnMap = [];
            $possiblePriceColumns = [
                'price_4hrs_40km', 'price4hrs40km', 'price_4hr_40km', 'price4hr40km', 'price_4_hour',
                'price_8hrs_80km', 'price8hrs80km', 'price_8hr_80km', 'price8hr80km', 'price_8_hour',
                'price_10hrs_100km', 'price10hrs100km', 'price_10hr_100km', 'price10hr100km', 'price_10_hour',
                'price_extra_km', 'priceextrakm', 'extra_km_rate', 'extra_km',
                'price_extra_hour', 'priceextrahour', 'extra_hour_rate', 'extra_hour'
            ];
            
            while ($column = $columnsResult->fetch_assoc()) {
                $columnName = $column['Field'];
                $normalizedName = strtolower(str_replace('_', '', $columnName));
                
                // Map each column to a standardized name
                foreach ($possiblePriceColumns as $standardColumn) {
                    $normalizedStandard = strtolower(str_replace('_', '', $standardColumn));
                    if ($normalizedName === $normalizedStandard) {
                        $columnMap[$standardColumn] = $columnName;
                        break;
                    }
                }
            }
            
            // Now try to query with the first vehicle ID and use the column map
            $possibleId = $possibleVehicleIds[0];
            $query = "SELECT * FROM local_package_fares WHERE vehicle_id = ? OR vehicle_id LIKE ? LIMIT 1";
            $likeParam = "%$possibleId%";
            $stmt = $conn->prepare($query);
            $stmt->bind_param("ss", $possibleId, $likeParam);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result && $row = $result->fetch_assoc()) {
                // Find the appropriate column names using our map
                $price4hrs40km = 0;
                $price8hrs80km = 0;
                $price10hrs100km = 0;
                $priceExtraKm = 0;
                $priceExtraHour = 0;
                
                // Try to find the values using the column mapping
                foreach (['price_4hrs_40km', 'price4hrs40km', 'price_4hr_40km', 'price4hr40km', 'price_4_hour'] as $colName) {
                    if (isset($row[$colName]) && $row[$colName] > 0) {
                        $price4hrs40km = (float)$row[$colName];
                        break;
                    }
                }
                
                foreach (['price_8hrs_80km', 'price8hrs80km', 'price_8hr_80km', 'price8hr80km', 'price_8_hour'] as $colName) {
                    if (isset($row[$colName]) && $row[$colName] > 0) {
                        $price8hrs80km = (float)$row[$colName];
                        break;
                    }
                }
                
                foreach (['price_10hrs_100km', 'price10hrs100km', 'price_10hr_100km', 'price10hr100km', 'price_10_hour'] as $colName) {
                    if (isset($row[$colName]) && $row[$colName] > 0) {
                        $price10hrs100km = (float)$row[$colName];
                        break;
                    }
                }
                
                foreach (['price_extra_km', 'priceextrakm', 'extra_km_rate', 'extra_km'] as $colName) {
                    if (isset($row[$colName]) && $row[$colName] > 0) {
                        $priceExtraKm = (float)$row[$colName];
                        break;
                    }
                }
                
                foreach (['price_extra_hour', 'priceextrahour', 'extra_hour_rate', 'extra_hour'] as $colName) {
                    if (isset($row[$colName]) && $row[$colName] > 0) {
                        $priceExtraHour = (float)$row[$colName];
                        break;
                    }
                }
                
                $localFares[] = [
                    'vehicleId' => $row['vehicle_id'],
                    'price4hrs40km' => $price4hrs40km,
                    'price8hrs80km' => $price8hrs80km,
                    'price10hrs100km' => $price10hrs100km,
                    'priceExtraKm' => $priceExtraKm,
                    'priceExtraHour' => $priceExtraHour,
                    'source' => 'database',
                    'timestamp' => time()
                ];
                $dbSuccess = true;
            }
        }
        
        // If still not found, try a more flexible query using LIKE
        if (!$dbSuccess) {
            $likePattern = '%' . str_replace('_', '%', $normalizedVehicleId) . '%';
            $query = "SELECT * FROM local_package_fares WHERE vehicle_id LIKE ? LIMIT 1";
            $stmt = $conn->prepare($query);
            $stmt->bind_param("s", $likePattern);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result && $row = $result->fetch_assoc()) {
                // Successfully found data with LIKE query
                $localFares[] = [
                    'vehicleId' => $row['vehicle_id'],
                    'price4hrs40km' => (float)$row['price_4hrs_40km'],
                    'price8hrs80km' => (float)$row['price_8hrs_80km'],
                    'price10hrs100km' => (float)$row['price_10hrs_100km'],
                    'priceExtraKm' => (float)$row['price_extra_km'],
                    'priceExtraHour' => (float)$row['price_extra_hour'],
                    'source' => 'database',
                    'timestamp' => time()
                ];
                $dbSuccess = true;
            }
        }
        
        // Close the database connection
        $conn->close();
    }
} catch (Exception $e) {
    // Log error but continue to fallback calculation
    error_log("Database error: " . $e->getMessage());
}

// If database query failed, generate dynamic prices as fallback
if (!$dbSuccess) {
    // Helper function to calculate package prices based on vehicle category
    function calculateDynamicPrices($baseValue, $multiplier) {
        return [
            'price4hrs40km' => round($baseValue['4hr'] * $multiplier),
            'price8hrs80km' => round($baseValue['8hr'] * $multiplier),
            'price10hrs100km' => round($baseValue['10hr'] * $multiplier),
            'priceExtraKm' => round(($baseValue['8hr'] * $multiplier) * 0.01),
            'priceExtraHour' => round(($baseValue['8hr'] * $multiplier) * 0.1)
        ];
    }

    // Base price values that will be used for calculations
    $basePrices = [
        '4hr' => 1200,
        '8hr' => 2000,
        '10hr' => 2500
    ];

    // Determine vehicle category and apply appropriate multiplier
    $vehicleCategory = 'standard';
    $multiplier = 1.0;

    if (strpos($normalizedVehicleId, 'sedan') !== false || 
        strpos($normalizedVehicleId, 'swift') !== false || 
        strpos($normalizedVehicleId, 'dzire') !== false ||
        strpos($normalizedVehicleId, 'amaze') !== false ||
        strpos($normalizedVehicleId, 'etios') !== false) {
        $vehicleCategory = 'sedan';
        $multiplier = 1.0;
    } else if (strpos($normalizedVehicleId, 'ertiga') !== false || 
        strpos($normalizedVehicleId, 'suv') !== false) {
        $vehicleCategory = 'suv';
        $multiplier = 1.25;
    } else if (strpos($normalizedVehicleId, 'innova') !== false) {
        $vehicleCategory = 'mpv';
        if (strpos($normalizedVehicleId, 'hycross') !== false) {
            $multiplier = 1.6;
        } else {
            $multiplier = 1.5;
        }
    } else if (strpos($normalizedVehicleId, 'tempo') !== false || 
        strpos($normalizedVehicleId, 'traveller') !== false) {
        $vehicleCategory = 'tempo';
        $multiplier = 2.0;
    } else if (strpos($normalizedVehicleId, 'cng') !== false) {
        $vehicleCategory = 'cng';
        $multiplier = 1.0; // Same as sedan
    } else {
        // Default - use standard sedan pricing
        $vehicleCategory = 'other';
        $multiplier = 1.0;
    }

    // Calculate prices dynamically
    $prices = calculateDynamicPrices($basePrices, $multiplier);

    // Create the response object
    $localFares[] = [
        'vehicleId' => $vehicleId,
        'vehicleCategory' => $vehicleCategory,
        'price4hrs40km' => $prices['price4hrs40km'],
        'price8hrs80km' => $prices['price8hrs80km'],
        'price10hrs100km' => $prices['price10hrs100km'],
        'priceExtraKm' => $prices['priceExtraKm'],
        'priceExtraHour' => $prices['priceExtraHour'],
        'source' => 'dynamic',
        'timestamp' => time()
    ];
}

// Return JSON response
echo json_encode([
    'status' => 'success',
    'message' => $dbSuccess ? 'Local fares retrieved from database' : 'Local fares dynamically generated',
    'fares' => $localFares,
    'dynamicallyGenerated' => !$dbSuccess,
    'requestedVehicleId' => $vehicleId,
    'normalizedVehicleId' => $normalizedVehicleId,
    'timestamp' => time()
]);
