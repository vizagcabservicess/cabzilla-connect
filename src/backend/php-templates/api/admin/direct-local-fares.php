
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

// Get package ID if available
$packageId = isset($_GET['package_id']) ? $_GET['package_id'] : null;
if (!$packageId && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $packageId = isset($data['packageId']) ? $data['packageId'] : (isset($data['package_id']) ? $data['package_id'] : null);
}

// If still no vehicleId, set a default for the mock data
if (!$vehicleId) {
    $vehicleId = 'sedan';
}

// IMPROVED: Normalize package ID to ensure consistency
function normalizePackageId($packageId) {
    if (!$packageId) return '8hrs-80km'; // Default
    
    $normalized = strtolower($packageId);
    
    if (strpos($normalized, '10hr') !== false || strpos($normalized, '100km') !== false) {
        return '10hrs-100km';
    }
    
    if (strpos($normalized, '8hr') !== false || strpos($normalized, '80km') !== false) {
        return '8hrs-80km';
    }
    
    if (strpos($normalized, '4hr') !== false || strpos($normalized, '40km') !== false) {
        return '4hrs-40km';
    }
    
    return '8hrs-80km'; // Default fallback
}

// IMPROVED: Additional normalization for common vehicle name variations
function normalizeVehicleId($vehicleId) {
    // Convert to lowercase and replace spaces with underscores
    $result = strtolower(trim($vehicleId));
    $result = preg_replace('/[^a-z0-9_]/', '', str_replace(' ', '_', $result));
    
    // Special case for MPV and Innova Hycross - always treated the same
    if ($result === 'mpv' || strpos($result, 'hycross') !== false) {
        return 'innova_hycross';
    }
    
    // Handle common variations
    $mappings = [
        'innovahycross' => 'innova_hycross',
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
        'innovaold' => 'innova_crysta',
        'mpv' => 'innova_hycross' // Map MPV to Innova Hycross
    ];
    
    foreach ($mappings as $search => $replace) {
        if ($result === $search) {
            return $replace;
        }
    }
    
    // Special handling for "innova" which might come without specifics
    if ($result === 'innova' || strpos($result, 'innova') !== false) {
        if (strpos($result, 'hycross') !== false) {
            return 'innova_hycross';
        }
        if (strpos($result, 'crysta') !== false) {
            return 'innova_crysta';
        }
        // Default any plain "innova" to crysta
        if ($result === 'innova') {
            return 'innova_crysta';
        }
    }
    
    return $result;
}

// Normalize vehicle ID and package ID
$normalizedVehicleId = normalizeVehicleId($vehicleId);
$normalizedPackageId = normalizePackageId($packageId);

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
            str_replace('tempo_traveller', 'tempo', $normalizedVehicleId),
            // Special handling for MPV which is often Innova Hycross
            ($normalizedVehicleId === 'mpv' ? 'innova_hycross' : $normalizedVehicleId),
            // Also try with the original format for max compatibility
            $vehicleId
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
                    'vehicleId' => $possibleId, // Keep the matched vehicle ID
                    'matchedWith' => $normalizedVehicleId, // Store what was matched
                    'originalRequest' => $vehicleId, // Store the original request
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
            
            // Now try to query with the normalized vehicle ID and use the column map
            $possibleId = $normalizedVehicleId;
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
                    'matchedWith' => $normalizedVehicleId,
                    'originalRequest' => $vehicleId,
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
                    'matchedWith' => $normalizedVehicleId,
                    'originalRequest' => $vehicleId,
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
        
        // Special vehicle-specific handling - always look for MPV as Innova Hycross
        if (!$dbSuccess && ($normalizedVehicleId === 'mpv' || strpos($normalizedVehicleId, 'hycross') !== false)) {
            $possibleIds = ['innova_hycross', 'innovahycross', 'mpv', 'hycross'];
            
            foreach ($possibleIds as $possibleId) {
                $query = "SELECT * FROM local_package_fares WHERE vehicle_id = ? OR vehicle_id LIKE ? LIMIT 1";
                $likeParam = "%$possibleId%";
                $stmt = $conn->prepare($query);
                $stmt->bind_param("ss", $possibleId, $likeParam);
                $stmt->execute();
                $result = $stmt->get_result();
                
                if ($result && $row = $result->fetch_assoc()) {
                    // Successfully found data
                    $localFares[] = [
                        'vehicleId' => $row['vehicle_id'],
                        'matchedWith' => 'mpv/innova_hycross',
                        'originalRequest' => $vehicleId,
                        'price4hrs40km' => (float)$row['price_4hrs_40km'],
                        'price8hrs80km' => (float)$row['price_8hrs_80km'],
                        'price10hrs100km' => (float)$row['price_10hrs_100km'],
                        'priceExtraKm' => (float)$row['price_extra_km'],
                        'priceExtraHour' => (float)$row['price_extra_hour'],
                        'source' => 'database',
                        'timestamp' => time()
                    ];
                    $dbSuccess = true;
                    break;
                }
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
    function calculateDynamicPrices($vehicleType) {
        // IMPROVED: More accurate vehicle type-specific pricing with special case for MPV/Innova Hycross
        $basePrices = [
            'sedan' => [
                'price4hrs40km' => 2400,
                'price8hrs80km' => 3000,
                'price10hrs100km' => 3500,
                'priceExtraKm' => 30,
                'priceExtraHour' => 300
            ],
            'ertiga' => [
                'price4hrs40km' => 2800,
                'price8hrs80km' => 3500,
                'price10hrs100km' => 4000,
                'priceExtraKm' => 35,
                'priceExtraHour' => 350
            ],
            'innova_crysta' => [
                'price4hrs40km' => 3200,
                'price8hrs80km' => 4000,
                'price10hrs100km' => 4500,
                'priceExtraKm' => 40,
                'priceExtraHour' => 400
            ],
            'innova_hycross' => [
                'price4hrs40km' => 3600,
                'price8hrs80km' => 4500,
                'price10hrs100km' => 5000,
                'priceExtraKm' => 45,
                'priceExtraHour' => 450
            ],
            'tempo_traveller' => [
                'price4hrs40km' => 4000,
                'price8hrs80km' => 5500,
                'price10hrs100km' => 7000,
                'priceExtraKm' => 55,
                'priceExtraHour' => 550
            ],
            'dzire_cng' => [
                'price4hrs40km' => 2400,
                'price8hrs80km' => 3000,
                'price10hrs100km' => 3500,
                'priceExtraKm' => 30,
                'priceExtraHour' => 300
            ]
        ];
        
        // Use specific vehicle type if available, otherwise fallback to category
        if (isset($basePrices[$vehicleType])) {
            return $basePrices[$vehicleType];
        }
        
        // Determine vehicle category based on type
        if (strpos($vehicleType, 'innova') !== false) {
            if (strpos($vehicleType, 'hycross') !== false) {
                return $basePrices['innova_hycross'];
            }
            return $basePrices['innova_crysta'];
        } 
        else if (strpos($vehicleType, 'ertiga') !== false) {
            return $basePrices['ertiga'];
        }
        else if (strpos($vehicleType, 'tempo') !== false || strpos($vehicleType, 'traveller') !== false) {
            return $basePrices['tempo_traveller'];
        }
        else if (strpos($vehicleType, 'dzire') !== false || strpos($vehicleType, 'cng') !== false) {
            return $basePrices['dzire_cng'];
        }
        else if ($vehicleType === 'mpv') {
            return $basePrices['innova_hycross'];
        }
        
        // Default to sedan pricing
        return $basePrices['sedan'];
    }

    // Calculate prices dynamically based on normalized vehicle ID
    $prices = calculateDynamicPrices($normalizedVehicleId);

    // Create the response object
    $localFares[] = [
        'vehicleId' => $normalizedVehicleId,
        'vehicleCategory' => $normalizedVehicleId,
        'matchedWith' => 'none',
        'originalRequest' => $vehicleId,
        'price4hrs40km' => $prices['price4hrs40km'],
        'price8hrs80km' => $prices['price8hrs80km'],
        'price10hrs100km' => $prices['price10hrs100km'],
        'priceExtraKm' => $prices['priceExtraKm'],
        'priceExtraHour' => $prices['priceExtraHour'],
        'source' => 'dynamic',
        'timestamp' => time()
    ];
}

// If a specific package was requested, include its price directly in the response
$packagePrice = null;
if ($normalizedPackageId && !empty($localFares)) {
    $fare = $localFares[0];
    
    if ($normalizedPackageId === '4hrs-40km' && isset($fare['price4hrs40km'])) {
        $packagePrice = $fare['price4hrs40km'];
    } else if ($normalizedPackageId === '8hrs-80km' && isset($fare['price8hrs80km'])) {
        $packagePrice = $fare['price8hrs80km'];
    } else if ($normalizedPackageId === '10hrs-100km' && isset($fare['price10hrs100km'])) {
        $packagePrice = $fare['price10hrs100km'];
    }
}

// Return JSON response
echo json_encode([
    'status' => 'success',
    'message' => $dbSuccess ? 'Local fares retrieved from database' : 'Local fares dynamically generated',
    'fares' => $localFares,
    'dynamicallyGenerated' => !$dbSuccess,
    'requestedVehicleId' => $vehicleId,
    'normalizedVehicleId' => $normalizedVehicleId,
    'requestedPackageId' => $packageId,
    'normalizedPackageId' => $normalizedPackageId,
    'price' => $packagePrice, // Include the specific package price if requested
    'timestamp' => time()
]);
