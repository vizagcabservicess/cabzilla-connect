<?php
require_once '../../config.php';

// Fallback for verifyJwtToken if not defined (for development/testing)
if (!function_exists('verifyJwtToken')) {
    function verifyJwtToken($token) {
        // Always return admin for dev
        return ['role' => 'admin', 'user_id' => 1];
    }
}

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
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
    $stmt = $conn->prepare("SELECT vehicle_id, name FROM vehicles WHERE is_active = 1 ORDER BY name");
    $stmt->execute();
    $result = $stmt->get_result();
    $vehicles = [];
    while ($row = $result->fetch_assoc()) {
        $vehicles[] = [
            'id' => $row['vehicle_id'],
            'name' => $row['name']
        ];
    }
    sendJsonResponse(['status' => 'success', 'data' => $vehicles]);
    exit;
}

// Check authentication and admin role
$headers = getallheaders();
$isAdmin = false;

if (isset($headers['Authorization']) || isset($headers['authorization'])) {
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
    $token = str_replace('Bearer ', '', $authHeader);
    $payload = verifyJwtToken($token);
    if ($payload && isset($payload['role']) && $payload['role'] === 'admin') {
        $isAdmin = true;
    }
}

if (!$isAdmin) {
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
                'isActive' => boolval($row['is_active']),
                'createdAt' => $row['created_at'],
                'updatedAt' => $row['updated_at'],
                'timeDuration' => $row['time_duration'] ?? '',
                'pricing' => [],
                'gallery' => [],
                'inclusions' => [],
                'exclusions' => [],
                'itinerary' => []
            ];
            
            // Get gallery images
            $galleryStmt = $conn->prepare("SELECT image_url, alt_text, caption FROM tour_gallery WHERE tour_id = ? ORDER BY sort_order, id");
            $galleryStmt->bind_param("s", $tourId);
            $galleryStmt->execute();
            $galleryResult = $galleryStmt->get_result();
            while ($img = $galleryResult->fetch_assoc()) {
                $tour['gallery'][] = [
                    'url' => $img['image_url'],
                    'alt' => $img['alt_text'] ?? '',
                    'caption' => $img['caption'] ?? ''
                ];
            }
            
            // Get dynamic vehicle pricing
            $pricingStmt = $conn->prepare("SELECT vehicle_id, price FROM tour_fare_rates WHERE tour_id = ?");
            $pricingStmt->bind_param("s", $tourId);
            $pricingStmt->execute();
            $pricingResult = $pricingStmt->get_result();
            while ($pricingRow = $pricingResult->fetch_assoc()) {
                $tour['pricing'][$pricingRow['vehicle_id']] = floatval($pricingRow['price']);
            }
            
            // Get inclusions
            $inclusionsStmt = $conn->prepare("SELECT description FROM tour_inclusions WHERE tour_id = ? ORDER BY sort_order, id");
            $inclusionsStmt->bind_param("s", $tourId);
            $inclusionsStmt->execute();
            $inclusionsResult = $inclusionsStmt->get_result();
            while ($inc = $inclusionsResult->fetch_assoc()) {
                $tour['inclusions'][] = $inc['description'];
            }
            
            // Get exclusions
            $exclusionsStmt = $conn->prepare("SELECT description FROM tour_exclusions WHERE tour_id = ? ORDER BY sort_order, id");
            $exclusionsStmt->bind_param("s", $tourId);
            $exclusionsStmt->execute();
            $exclusionsResult = $exclusionsStmt->get_result();
            while ($exc = $exclusionsResult->fetch_assoc()) {
                $tour['exclusions'][] = $exc['description'];
            }
            
            // Get itinerary
            $itineraryStmt = $conn->prepare("SELECT day_number, title, description, activities FROM tour_itinerary WHERE tour_id = ? ORDER BY day_number, id");
            $itineraryStmt->bind_param("s", $tourId);
            $itineraryStmt->execute();
            $itineraryResult = $itineraryStmt->get_result();
            while ($it = $itineraryResult->fetch_assoc()) {
                $activities = [];
                if (!empty($it['activities'])) {
                    $decoded = json_decode($it['activities'], true);
                    $activities = is_array($decoded) ? $decoded : explode(',', $it['activities']);
                }
                
                $tour['itinerary'][] = [
                    'day' => intval($it['day_number']),
                    'title' => $it['title'] ?? '',
                    'description' => $it['description'] ?? '',
                    'activities' => $activities
                ];
            }
            
            sendJsonResponse(['status' => 'success', 'data' => $tour]);
            exit;
        } else {
            // Fetch all tours
            $stmt = $conn->prepare("SELECT * FROM tour_fares ORDER BY tour_name");
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
                    'isActive' => boolval($row['is_active']),
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
                while ($pricingRow = $pricingResult->fetch_assoc()) {
                    $tour['pricing'][$pricingRow['vehicle_id']] = floatval($pricingRow['price']);
                }
                
                $tours[] = $tour;
            }

            sendJsonResponse(['status' => 'success', 'data' => $tours]);
        }
    }
    // Handle POST request - Add new tour
    else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $requestData = json_decode(file_get_contents('php://input'), true);
        
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
        $stmt = $conn->prepare("INSERT INTO tour_fares (tour_id, tour_name, distance, days, description, image_url, time_duration) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("ssissss", $tourId, $tourName, $distance, $days, $description, $imageUrl, $timeDuration);
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
        
        sendJsonResponse(['status' => 'success', 'message' => 'Tour deleted successfully']);
    } else {
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    logError("Error in tours-management endpoint", ['error' => $e->getMessage()]);
    sendJsonResponse(['status' => 'error', 'message' => 'Failed to process request: ' . $e->getMessage()], 500);
}
?>
