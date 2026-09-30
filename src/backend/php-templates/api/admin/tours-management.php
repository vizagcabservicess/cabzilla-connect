<?php
require_once '../../config.php';
require_once '../utils/auth.php'; // Ensure auth utilities are loaded
require_once '../utils/tour_seo_cache.php';
require_once '../utils/tour_fares_sort.php';

// SECURITY FIX: Remove dangerous fallback function that granted admin access to anyone
// CORS Headers - RESTRICTED for admin endpoints
header('Access-Control-Allow-Origin: ' . (isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : ''));
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

function tour_fares_ensure_is_active_column(mysqli $conn): void
{
    $col = $conn->query("SHOW COLUMNS FROM tour_fares LIKE 'is_active'");
    if ($col && $col->num_rows > 0) {
        return;
    }
    $conn->query("ALTER TABLE tour_fares ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1");
}

function tour_row_is_active(array $row): bool
{
    if (!array_key_exists('is_active', $row) || $row['is_active'] === null || $row['is_active'] === '') {
        return true;
    }
    $value = $row['is_active'];
    if (is_bool($value)) {
        return $value;
    }
    return (int)$value === 1;
}

function request_has_bearer_token(): bool
{
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    if (!is_array($headers)) {
        $headers = [];
    }
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
    return is_string($auth) && stripos($auth, 'Bearer ') === 0;
}

// Allow unauthenticated access for vehicles endpoint
if (
    $_SERVER['REQUEST_METHOD'] === 'GET' &&
    isset($_GET['action']) && $_GET['action'] === 'vehicles'
) {
    // Connect to database
    $conn = getDbConnection();
    if (!$conn) {
        sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
        exit;
    }
    $stmt = $conn->prepare("SELECT vehicle_id, name, capacity FROM vehicles WHERE is_active = 1 ORDER BY name");
    $stmt->execute();
    $result = $stmt->get_result();
    $vehicles = [];
    while ($row = $result->fetch_assoc()) {
        $vehicles[] = [
            'id' => $row['vehicle_id'],
            'name' => $row['name'],
            'capacity' => isset($row['capacity']) ? intval($row['capacity']) : 4
        ];
    }
    sendJsonResponse(['status' => 'success', 'data' => $vehicles]);
    exit;
}

// --- PUBLIC TOUR LIST ENDPOINT ---
// This block is now before the admin check to allow public fetching of all tours.
// Public tour list (no JWT). Admin list with Bearer must not use this — it omitted isActive.
if ($_SERVER['REQUEST_METHOD'] === 'GET' && !isset($_GET['tourId']) && !request_has_bearer_token()) {
    try {
        $db_conn = getDbConnection();
        if (!$db_conn) {
            sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
            exit;
        }
        
        tour_fares_ensure_is_active_column($db_conn);
        tour_fares_ensure_sort_order_column($db_conn);
        $tour_stmt = $db_conn->prepare("SELECT id, tour_id, tour_name, distance, days, description, image_url, time_duration, is_active, sort_order FROM tour_fares ORDER BY sort_order ASC, id ASC");
        $tour_stmt->execute();
        $tour_result = $tour_stmt->get_result();

        $all_tours = [];
        while ($tour_row = $tour_result->fetch_assoc()) {
            $current_tour = [
                'id' => intval($tour_row['id']),
                'tourId' => $tour_row['tour_id'],
                'tourName' => $tour_row['tour_name'],
                'distance' => intval($tour_row['distance']),
                'days' => intval($tour_row['days']),
                'description' => $tour_row['description'] ?? '',
                'imageUrl' => $tour_row['image_url'] ?? '',
                'timeDuration' => $tour_row['time_duration'] ?? '',
                'isActive' => tour_row_is_active($tour_row),
                'sortOrder' => intval($tour_row['sort_order'] ?? 0),
                'pricing' => []
            ];
            
            $pricing_stmt = $db_conn->prepare("SELECT vehicle_id, price FROM tour_fare_rates WHERE tour_id = ?");
            $pricing_stmt->bind_param("s", $tour_row['tour_id']);
            $pricing_stmt->execute();
            $pricing_result = $pricing_stmt->get_result();
            $tour_pricing = [];
            while ($pricing_row = $pricing_result->fetch_assoc()) {
                $tour_pricing[$pricing_row['vehicle_id']] = floatval($pricing_row['price']);
            }
            $current_tour['pricing'] = $tour_pricing;
            
            $all_tours[] = $current_tour;
        }

        sendJsonResponse(['status' => 'success', 'data' => $all_tours]);
    } catch (Exception $e) {
        logError("Public tour fetch failed", ['error' => $e->getMessage()]);
        sendJsonResponse(['status' => 'error', 'message' => 'Failed to fetch public tour data.'], 500);
    }
    exit;
}

// Check authentication and admin role (admin + super_admin)
if (!validateAdminAuth()) {
    sendJsonResponse(['status' => 'error', 'message' => 'Unauthorized. Admin privileges required.'], 403);
    exit;
}

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
    exit;
}

try {
    // Handle GET request - Get all tours or specific tour
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $tourId = isset($_GET['tourId']) ? $_GET['tourId'] : null;
        
        if ($tourId) {
            tour_fares_ensure_is_active_column($conn);
            // Fetch a single tour by ID with ALL related data
            $stmt = $conn->prepare("SELECT * FROM tour_fares WHERE tour_id = ?");
            $stmt->bind_param("s", $tourId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                sendJsonResponse(['status' => 'error', 'message' => 'Tour not found'], 404);
                exit;
            }
            
            $row = $result->fetch_assoc();
            $tour = [
                'id' => intval($row['id']),
                'tourId' => $row['tour_id'],
                'tourName' => $row['tour_name'],
                'distance' => intval($row['distance']),
                'days' => intval($row['days']),
                'description' => $row['description'] ?? '',
                'imageUrl' => $row['image_url'] ?? '',
                'isActive' => tour_row_is_active($row),
                'createdAt' => $row['created_at'],
                'updatedAt' => $row['updated_at'],
                'timeDuration' => $row['time_duration'] ?? '',
                'pricing' => [],
                'gallery' => [],
                'inclusions' => [],
                'exclusions' => [],
                'itinerary' => []
            ];
            
            // Get gallery images - ensure we always have an array
            $galleryStmt = $conn->prepare("SELECT image_url, alt_text, caption FROM tour_gallery WHERE tour_id = ? ORDER BY sort_order, id");
            $galleryStmt->bind_param("s", $tourId);
            $galleryStmt->execute();
            $galleryResult = $galleryStmt->get_result();
            $gallery = [];
            while ($img = $galleryResult->fetch_assoc()) {
                $gallery[] = [
                    'url' => $img['image_url'],
                    'alt' => $img['alt_text'] ?? '',
                    'caption' => $img['caption'] ?? ''
                ];
            }
            $tour['gallery'] = $gallery;
            
            // Get dynamic vehicle pricing
            $pricingStmt = $conn->prepare("SELECT vehicle_id, price FROM tour_fare_rates WHERE tour_id = ?");
            $pricingStmt->bind_param("s", $tourId);
            $pricingStmt->execute();
            $pricingResult = $pricingStmt->get_result();
            $pricing = [];
            while ($pricingRow = $pricingResult->fetch_assoc()) {
                $pricing[$pricingRow['vehicle_id']] = floatval($pricingRow['price']);
            }
            $tour['pricing'] = $pricing;
            
            // Get inclusions - ensure we always have an array
            $inclusionsStmt = $conn->prepare("SELECT description FROM tour_inclusions WHERE tour_id = ? ORDER BY sort_order, id");
            $inclusionsStmt->bind_param("s", $tourId);
            $inclusionsStmt->execute();
            $inclusionsResult = $inclusionsStmt->get_result();
            $inclusions = [];
            while ($inc = $inclusionsResult->fetch_assoc()) {
                $inclusions[] = $inc['description'];
            }
            $tour['inclusions'] = $inclusions;
            
            // Get exclusions - ensure we always have an array
            $exclusionsStmt = $conn->prepare("SELECT description FROM tour_exclusions WHERE tour_id = ? ORDER BY sort_order, id");
            $exclusionsStmt->bind_param("s", $tourId);
            $exclusionsStmt->execute();
            $exclusionsResult = $exclusionsStmt->get_result();
            $exclusions = [];
            while ($exc = $exclusionsResult->fetch_assoc()) {
                $exclusions[] = $exc['description'];
            }
            $tour['exclusions'] = $exclusions;
            
            // Get itinerary - ensure we always have an array
            $itineraryStmt = $conn->prepare("SELECT day_number, title, description, activities FROM tour_itinerary WHERE tour_id = ? ORDER BY day_number, id");
            $itineraryStmt->bind_param("s", $tourId);
            $itineraryStmt->execute();
            $itineraryResult = $itineraryStmt->get_result();
            $itinerary = [];
            while ($it = $itineraryResult->fetch_assoc()) {
                $activities = [];
                if (!empty($it['activities'])) {
                    $decoded = json_decode($it['activities'], true);
                    $activities = is_array($decoded) ? $decoded : explode(',', $it['activities']);
                }
                
                $itinerary[] = [
                    'day' => intval($it['day_number']),
                    'title' => $it['title'] ?? '',
                    'description' => $it['description'] ?? '',
                    'activities' => $activities
                ];
            }
            $tour['itinerary'] = $itinerary;
            
            sendJsonResponse(['status' => 'success', 'data' => $tour]);
            exit;
        } else {
            // This block is for fetching all tours within the admin context, which might have different requirements (e.g., include inactive tours)
            tour_fares_ensure_is_active_column($conn);
            tour_fares_ensure_sort_order_column($conn);
            $stmt = $conn->prepare("SELECT * FROM tour_fares ORDER BY sort_order ASC, id ASC");
            $stmt->execute();
            $result = $stmt->get_result();

            $tours = [];
            while ($row = $result->fetch_assoc()) {
                $tour = [
                    'id' => intval($row['id']),
                    'tourId' => $row['tour_id'],
                    'tourName' => $row['tour_name'],
                    'distance' => intval($row['distance']),
                    'days' => intval($row['days']),
                    'description' => $row['description'] ?? '',
                    'imageUrl' => $row['image_url'] ?? '',
                    'isActive' => tour_row_is_active($row),
                    'sortOrder' => intval($row['sort_order'] ?? 0),
                    'createdAt' => $row['created_at'],
                    'updatedAt' => $row['updated_at'],
                    'timeDuration' => $row['time_duration'] ?? '',
                    'pricing' => []
                ];
                
                // Get dynamic vehicle pricing from tour_fare_rates
                $pricingStmt = $conn->prepare("SELECT vehicle_id, price FROM tour_fare_rates WHERE tour_id = ?");
                $pricingStmt->bind_param("s", $row['tour_id']);
                $pricingStmt->execute();
                $pricingResult = $pricingStmt->get_result();
                $pricing = [];
                while ($pricingRow = $pricingResult->fetch_assoc()) {
                    $pricing[$pricingRow['vehicle_id']] = floatval($pricingRow['price']);
                }
                $tour['pricing'] = $pricing;
                
                $tours[] = $tour;
            }

            sendJsonResponse(['status' => 'success', 'data' => $tours]);
        }
    }
    // Handle POST request - Add new tour
    else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $requestData = json_decode(file_get_contents('php://input'), true);
        if (!is_array($requestData)) {
            $requestData = [];
        }

        if (($requestData['action'] ?? '') === 'reorder') {
            $tourIds = $requestData['tourIds'] ?? [];
            if (!is_array($tourIds) || $tourIds === []) {
                sendJsonResponse(['status' => 'error', 'message' => 'tourIds are required'], 400);
                exit;
            }
            tour_fares_ensure_sort_order_column($conn);
            $order = 1;
            foreach ($tourIds as $orderedId) {
                $orderedId = trim((string) $orderedId);
                if ($orderedId === '') {
                    continue;
                }
                $stmt = $conn->prepare("UPDATE tour_fares SET sort_order = ? WHERE tour_id = ?");
                $stmt->bind_param("is", $order, $orderedId);
                $stmt->execute();
                $order++;
            }
            sendJsonResponse(['status' => 'success', 'message' => 'Tour order saved']);
            exit;
        }
        
        if (!isset($requestData['tourId']) || !isset($requestData['tourName'])) {
            sendJsonResponse(['status' => 'error', 'message' => 'Tour ID and name are required'], 400);
            exit;
        }
        
        $tourId = $requestData['tourId'];
        $tourName = $requestData['tourName'];
        $distance = intval($requestData['distance'] ?? 0);
        $days = intval($requestData['days'] ?? 1);
        $description = $requestData['description'] ?? '';
        $imageUrl = $requestData['imageUrl'] ?? '';
        $timeDuration = $requestData['timeDuration'] ?? '';
        $pricing = $requestData['pricing'] ?? [];
        $gallery = $requestData['gallery'] ?? [];
        $inclusions = $requestData['inclusions'] ?? [];
        $exclusions = $requestData['exclusions'] ?? [];
        $itinerary = $requestData['itinerary'] ?? [];
        $isActive = array_key_exists('isActive', $requestData)
            ? ((int)!empty($requestData['isActive']))
            : 1;

        tour_fares_ensure_is_active_column($conn);
        $sortOrder = tour_fares_next_sort_order($conn);

        // Check if tour already exists
        $stmt = $conn->prepare("SELECT id FROM tour_fares WHERE tour_id = ?");
        $stmt->bind_param("s", $tourId);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result->num_rows > 0) {
            sendJsonResponse(['status' => 'error', 'message' => 'Tour with this ID already exists'], 409);
            exit;
        }
        
        // Insert into tour_fares
        $stmt = $conn->prepare("INSERT INTO tour_fares (tour_id, tour_name, distance, days, description, image_url, time_duration, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("ssissssii", $tourId, $tourName, $distance, $days, $description, $imageUrl, $timeDuration, $isActive, $sortOrder);
        $success = $stmt->execute();
        if (!$success) {
            throw new Exception("Failed to add new tour: " . $conn->error);
        }
        
        // Insert vehicle pricing into tour_fare_rates
        foreach ($pricing as $vehicleId => $price) {
            if ($price > 0) {
                $stmt = $conn->prepare("INSERT INTO tour_fare_rates (tour_id, vehicle_id, price) VALUES (?, ?, ?)");
                $stmt->bind_param("ssd", $tourId, $vehicleId, $price);
                $stmt->execute();
            }
        }
        
        // Insert gallery images
        foreach ($gallery as $index => $image) {
            if (!empty($image['url'])) {
                $alt = isset($image['alt']) ? $image['alt'] : '';
                $caption = isset($image['caption']) ? $image['caption'] : '';
                $stmt = $conn->prepare("INSERT INTO tour_gallery (tour_id, image_url, alt_text, caption, sort_order) VALUES (?, ?, ?, ?, ?)");
                $stmt->bind_param("ssssi", $tourId, $image['url'], $alt, $caption, $index);
                $stmt->execute();
            }
        }
        
        // Insert inclusions
        foreach ($inclusions as $index => $inclusion) {
            if (!empty($inclusion)) {
                $stmt = $conn->prepare("INSERT INTO tour_inclusions (tour_id, description, sort_order) VALUES (?, ?, ?)");
                $stmt->bind_param("ssi", $tourId, $inclusion, $index);
                $stmt->execute();
            }
        }
        
        // Insert exclusions
        foreach ($exclusions as $index => $exclusion) {
            if (!empty($exclusion)) {
                $stmt = $conn->prepare("INSERT INTO tour_exclusions (tour_id, description, sort_order) VALUES (?, ?, ?)");
                $stmt->bind_param("ssi", $tourId, $exclusion, $index);
                $stmt->execute();
            }
        }
        
        // Insert itinerary
        foreach ($itinerary as $day) {
            if (!empty($day['title'])) {
                $activities = json_encode($day['activities']);
                $stmt = $conn->prepare("INSERT INTO tour_itinerary (tour_id, day_number, title, description, activities) VALUES (?, ?, ?, ?, ?)");
                $stmt->bind_param("sisss", $tourId, $day['day'], $day['title'], $day['description'], $activities);
                $stmt->execute();
            }
        }
        
        vth_rebuild_tour_seo_cache($conn);
        sendJsonResponse(['status' => 'success', 'message' => 'Tour added successfully']);
    }
    // Handle PUT request - Update existing tour
    else if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $requestData = json_decode(file_get_contents('php://input'), true);
        if (!isset($requestData['tourId'])) {
            sendJsonResponse(['status' => 'error', 'message' => 'Tour ID is required'], 400);
            exit;
        }
        
        $tourId = $requestData['tourId'];
        tour_fares_ensure_is_active_column($conn);
        $updateFields = [];
        $types = "";
        $values = [];
        
        if (isset($requestData['tourName'])) { $updateFields[] = "tour_name = ?"; $types .= "s"; $values[] = $requestData['tourName']; }
        if (isset($requestData['distance'])) { $updateFields[] = "distance = ?"; $types .= "i"; $values[] = intval($requestData['distance']); }
        if (isset($requestData['days'])) { $updateFields[] = "days = ?"; $types .= "i"; $values[] = intval($requestData['days']); }
        if (isset($requestData['description'])) { $updateFields[] = "description = ?"; $types .= "s"; $values[] = $requestData['description']; }
        if (isset($requestData['imageUrl'])) { $updateFields[] = "image_url = ?"; $types .= "s"; $values[] = $requestData['imageUrl']; }
        if (isset($requestData['isActive'])) { $updateFields[] = "is_active = ?"; $types .= "i"; $values[] = $requestData['isActive'] ? 1 : 0; }
        if (isset($requestData['timeDuration'])) { $updateFields[] = "time_duration = ?"; $types .= "s"; $values[] = $requestData['timeDuration']; }
        
        if (!empty($updateFields)) {
            $updateFields[] = "updated_at = NOW()";
            $sql = "UPDATE tour_fares SET " . implode(", ", $updateFields) . " WHERE tour_id = ?";
            $types .= "s";
            $values[] = $tourId;
            $stmt = $conn->prepare($sql);
            $stmt->bind_param($types, ...$values);
            $stmt->execute();
        }
        
        // Update vehicle pricing in tour_fare_rates
        if (isset($requestData['pricing'])) {
            // Delete existing pricing
            $stmt = $conn->prepare("DELETE FROM tour_fare_rates WHERE tour_id = ?");
            $stmt->bind_param("s", $tourId);
            $stmt->execute();
            
            // Insert new pricing
            foreach ($requestData['pricing'] as $vehicleId => $price) {
                if ($price > 0) {
                    $stmt = $conn->prepare("INSERT INTO tour_fare_rates (tour_id, vehicle_id, price) VALUES (?, ?, ?)");
                    $stmt->bind_param("ssd", $tourId, $vehicleId, $price);
                    $stmt->execute();
                }
            }
        }
        
        // Update gallery if provided
        if (isset($requestData['gallery'])) {
            // Delete existing gallery
            $stmt = $conn->prepare("DELETE FROM tour_gallery WHERE tour_id = ?");
            $stmt->bind_param("s", $tourId);
            $stmt->execute();
            
            // Insert new gallery
            foreach ($requestData['gallery'] as $index => $image) {
                if (!empty($image['url'])) {
                    $alt = isset($image['alt']) ? $image['alt'] : '';
                    $caption = isset($image['caption']) ? $image['caption'] : '';
                    $stmt = $conn->prepare("INSERT INTO tour_gallery (tour_id, image_url, alt_text, caption, sort_order) VALUES (?, ?, ?, ?, ?)");
                    $stmt->bind_param("ssssi", $tourId, $image['url'], $alt, $caption, $index);
                    $stmt->execute();
                }
            }
        }
        
        // Update inclusions if provided
        if (isset($requestData['inclusions'])) {
            // Delete existing inclusions
            $stmt = $conn->prepare("DELETE FROM tour_inclusions WHERE tour_id = ?");
            $stmt->bind_param("s", $tourId);
            $stmt->execute();
            
            // Insert new inclusions
            foreach ($requestData['inclusions'] as $index => $inclusion) {
                if (!empty($inclusion)) {
                    $stmt = $conn->prepare("INSERT INTO tour_inclusions (tour_id, description, sort_order) VALUES (?, ?, ?)");
                    $stmt->bind_param("ssi", $tourId, $inclusion, $index);
                    $stmt->execute();
                }
            }
        }
        
        // Update exclusions if provided
        if (isset($requestData['exclusions'])) {
            // Delete existing exclusions
            $stmt = $conn->prepare("DELETE FROM tour_exclusions WHERE tour_id = ?");
            $stmt->bind_param("s", $tourId);
            $stmt->execute();
            
            // Insert new exclusions
            foreach ($requestData['exclusions'] as $index => $exclusion) {
                if (!empty($exclusion)) {
                    $stmt = $conn->prepare("INSERT INTO tour_exclusions (tour_id, description, sort_order) VALUES (?, ?, ?)");
                    $stmt->bind_param("ssi", $tourId, $exclusion, $index);
                    $stmt->execute();
                }
            }
        }
        
        // Update itinerary if provided
        if (isset($requestData['itinerary'])) {
            // Delete existing itinerary
            $stmt = $conn->prepare("DELETE FROM tour_itinerary WHERE tour_id = ?");
            $stmt->bind_param("s", $tourId);
            $stmt->execute();
            
            // Insert new itinerary
            foreach ($requestData['itinerary'] as $day) {
                if (!empty($day['title'])) {
                    $activities = json_encode($day['activities']);
                    $stmt = $conn->prepare("INSERT INTO tour_itinerary (tour_id, day_number, title, description, activities) VALUES (?, ?, ?, ?, ?)");
                    $stmt->bind_param("sisss", $tourId, $day['day'], $day['title'], $day['description'], $activities);
                    $stmt->execute();
                }
            }
        }
        
        vth_rebuild_tour_seo_cache($conn);
        sendJsonResponse(['status' => 'success', 'message' => 'Tour updated successfully']);
    }
    // Handle DELETE request - Delete tour
    else if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $tourId = isset($_GET['tourId']) ? $_GET['tourId'] : null;
        
        if (!$tourId) {
            sendJsonResponse(['status' => 'error', 'message' => 'Tour ID is required'], 400);
            exit;
        }
        
        // Delete related data first
        $stmt = $conn->prepare("DELETE FROM tour_fare_rates WHERE tour_id = ?");
        $stmt->bind_param("s", $tourId);
        $stmt->execute();
        
        $stmt = $conn->prepare("DELETE FROM tour_gallery WHERE tour_id = ?");
        $stmt->bind_param("s", $tourId);
        $stmt->execute();
        
        $stmt = $conn->prepare("DELETE FROM tour_inclusions WHERE tour_id = ?");
        $stmt->bind_param("s", $tourId);
        $stmt->execute();
        
        $stmt = $conn->prepare("DELETE FROM tour_exclusions WHERE tour_id = ?");
        $stmt->bind_param("s", $tourId);
        $stmt->execute();
        
        $stmt = $conn->prepare("DELETE FROM tour_itinerary WHERE tour_id = ?");
        $stmt->bind_param("s", $tourId);
        $stmt->execute();
        
        // Delete main tour record
        $stmt = $conn->prepare("DELETE FROM tour_fares WHERE tour_id = ?");
        $stmt->bind_param("s", $tourId);
        $success = $stmt->execute();
        
        if (!$success) {
            throw new Exception("Failed to delete tour: " . $conn->error);
        }
        
        vth_rebuild_tour_seo_cache($conn);
        sendJsonResponse(['status' => 'success', 'message' => 'Tour deleted successfully']);
    } else {
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    logError("Error in tours-management endpoint", ['error' => $e->getMessage()]);
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to process request: ' . $e->getMessage()], 500);
}
?>
