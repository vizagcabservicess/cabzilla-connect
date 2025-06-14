<?php
require_once '../config.php';

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

// Connect to database
$conn = getDbConnection();
if (!$conn) {
    sendJsonResponse(['status' => 'error', 'message' => 'Database connection failed'], 500);
    exit;
}

// At the top, for debugging (remove in production):
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

function logErrorToFile($message, $context = []) {
    $logFile = __DIR__ . '/tours.log';
    $entry = date('Y-m-d H:i:s') . ' | ' . $message;
    if (!empty($context)) {
        $entry .= ' | ' . json_encode($context);
    }
    $entry .= "\n";
    file_put_contents($logFile, $entry, FILE_APPEND);
}

try {
    $method = $_SERVER['REQUEST_METHOD'];
    
    if ($method === 'GET') {
        $pathInfo = $_SERVER['PATH_INFO'] ?? '';
        $segments = explode('/', trim($pathInfo, '/'));
        
        if (count($segments) === 1 && !empty($segments[0])) {
            // Get specific tour by ID
            $tourId = $segments[0];
            getTourById($conn, $tourId);
        } else {
            // Get all tours list
            getAllTours($conn);
        }
    } else {
        sendJsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    logErrorToFile("Error in tours API", ['error' => $e->getMessage()]);
    sendJsonResponse(['status' => 'error', 'message' => 'Internal server error'], 500);
}

function getAllTours($conn) {
    $stmt = $conn->prepare("
        SELECT 
            tf.tour_id as tourId,
            tf.tour_name as tourName,
            tf.description,
            tf.distance,
            tf.days,
            tf.image_url as imageUrl,
            tf.is_active as isActive,
            tf.time_duration as timeDuration
        FROM tour_fares tf 
        WHERE tf.is_active = 1 
        ORDER BY tf.tour_name
    ");
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $tours = [];
    while ($row = $result->fetch_assoc()) {
        $tour = [
            'tourId' => $row['tourId'],
            'tourName' => $row['tourName'],
            'description' => $row['description'] ?? '',
            'distance' => intval($row['distance']),
            'days' => intval($row['days']),
            'imageUrl' => $row['imageUrl'] ?? 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=300&fit=crop',
            'pricing' => [],
            'minPrice' => 0,
            'timeDuration' => isset($row['timeDuration']) && $row['timeDuration'] !== null ? $row['timeDuration'] : ''
        ];
        
        // Get pricing for this tour
        $pricingStmt = $conn->prepare("
            SELECT tfr.vehicle_id, tfr.price, v.name as vehicle_name
            FROM tour_fare_rates tfr
            JOIN vehicles v ON tfr.vehicle_id = v.vehicle_id
            WHERE tfr.tour_id = ? AND v.is_active = 1
        ");
        $pricingStmt->bind_param("s", $row['tourId']);
        $pricingStmt->execute();
        $pricingResult = $pricingStmt->get_result();
        
        $prices = [];
        while ($pricingRow = $pricingResult->fetch_assoc()) {
            $tour['pricing'][$pricingRow['vehicle_id']] = floatval($pricingRow['price']);
            $prices[] = floatval($pricingRow['price']);
        }
        
        $tour['minPrice'] = !empty($prices) ? min($prices) : 0;
        $tours[] = $tour;
    }
    
    sendJsonResponse($tours);
}

function getTourById($conn, $tourId) {
    // Get basic tour info
    $stmt = $conn->prepare("
        SELECT 
            tf.id,
            tf.tour_id as tourId,
            tf.tour_name as tourName,
            tf.description,
            tf.distance,
            tf.days,
            tf.image_url as imageUrl,
            tf.is_active as isActive,
            tf.created_at as createdAt,
            tf.updated_at as updatedAt,
            tf.time_duration as timeDuration
        FROM tour_fares tf 
        WHERE tf.tour_id = ?
    ");
    
    $stmt->bind_param("s", $tourId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendJsonResponse(['status' => 'error', 'message' => 'Tour not found'], 404);
        return;
    }
    
    $tour = $result->fetch_assoc();
    
    $tourDetail = [
        'id' => $tour['id'],
        'tourId' => $tour['tourId'],
        'tourName' => $tour['tourName'],
        'description' => $tour['description'] ?? '',
        'duration' => 'Full Day',
        'distance' => intval($tour['distance']),
        'days' => intval($tour['days']),
        'difficulty' => 'Easy',
        'category' => 'Nature & Adventure',
        'imageUrl' => $tour['imageUrl'],
        'isActive' => boolval($tour['isActive']),
        'createdAt' => $tour['createdAt'],
        'updatedAt' => $tour['updatedAt'],
        'highlights' => [],
        'itinerary' => [],
        'gallery' => [],
        'inclusions' => [],
        'exclusions' => [],
        'pricing' => [],
        'timeDuration' => isset($tour['timeDuration']) && $tour['timeDuration'] !== null ? $tour['timeDuration'] : ''
    ];
    
    // Get gallery images
    $galleryStmt = $conn->prepare("
        SELECT id, image_url as url, alt_text as alt, caption
        FROM tour_gallery 
        WHERE tour_id = ? 
        ORDER BY id
    ");
    $galleryStmt->bind_param("s", $tourId);
    $galleryStmt->execute();
    $galleryResult = $galleryStmt->get_result();
    
    if (!$galleryStmt) {
        logErrorToFile('Failed to prepare galleryStmt', ['error' => $conn->error]);
    }
    
    while ($galleryRow = $galleryResult->fetch_assoc()) {
        $tourDetail['gallery'][] = [
            'id' => $galleryRow['id'],
            'url' => $galleryRow['url'],
            'alt' => $galleryRow['alt'] ?? $tour['tourName'],
            'caption' => $galleryRow['caption']
        ];
    }
    
    // Get inclusions (fetch only 'description')
    $inclusionsStmt = $conn->prepare("
        SELECT description
        FROM tour_inclusions
        WHERE tour_id = ?
        ORDER BY sort_order, id
    ");
    $inclusionsStmt->bind_param("s", $tourId);
    $inclusionsStmt->execute();
    $inclusionsResult = $inclusionsStmt->get_result();

    if (!$inclusionsStmt) {
        logErrorToFile('Failed to prepare inclusionsStmt', ['error' => $conn->error]);
    }

    $inclusionsDebugArr = [];
    while ($inclusionRow = $inclusionsResult->fetch_assoc()) {
        $desc = isset($inclusionRow['description']) ? trim($inclusionRow['description']) : '';
        $inclusionsDebugArr[] = $desc; // log for debug
        if ($desc !== '') {
            $tourDetail['inclusions'][] = $desc;
        }
    }
    // Debug log
    logErrorToFile('Fetched inclusions', ['tour_id' => $tourId, 'found' => $inclusionsDebugArr]);

    // Get exclusions (fetch only 'description')
    $exclusionsStmt = $conn->prepare("
        SELECT description
        FROM tour_exclusions
        WHERE tour_id = ?
        ORDER BY sort_order, id
    ");
    $exclusionsStmt->bind_param("s", $tourId);
    $exclusionsStmt->execute();
    $exclusionsResult = $exclusionsStmt->get_result();

    if (!$exclusionsStmt) {
        logErrorToFile('Failed to prepare exclusionsStmt', ['error' => $conn->error]);
    }

    $exclusionsDebugArr = [];
    while ($exclusionRow = $exclusionsResult->fetch_assoc()) {
        $desc = isset($exclusionRow['description']) ? trim($exclusionRow['description']) : '';
        $exclusionsDebugArr[] = $desc; // log for debug
        if ($desc !== '') {
            $tourDetail['exclusions'][] = $desc;
        }
    }
    // Debug log
    logErrorToFile('Fetched exclusions', ['tour_id' => $tourId, 'found' => $exclusionsDebugArr]);

    // Get itinerary
    $itineraryStmt = $conn->prepare("
        SELECT day as day, title, description, activities
        FROM tour_itinerary 
        WHERE tour_id = ? 
        ORDER BY day
    ");
    $itineraryStmt->bind_param("s", $tourId);
    $itineraryStmt->execute();
    $itineraryResult = $itineraryStmt->get_result();
    
    if (!$itineraryStmt) {
        logErrorToFile('Failed to prepare itineraryStmt', ['error' => $conn->error]);
    }
    
    while ($itineraryRow = $itineraryResult->fetch_assoc()) {
        $activities = [];
        if (!empty($itineraryRow['activities'])) {
            $activities = json_decode($itineraryRow['activities'], true) ?? explode(',', $itineraryRow['activities']);
        }
        
        $tourDetail['itinerary'][] = [
            'day' => intval($itineraryRow['day']),
            'title' => $itineraryRow['title'],
            'description' => $itineraryRow['description'],
            'activities' => $activities
        ];
    }
    
    // Get vehicle pricing with names
    $pricingStmt = $conn->prepare("
        SELECT tfr.vehicle_id, tfr.price, v.name as vehicle_name
        FROM tour_fare_rates tfr
        JOIN vehicles v ON tfr.vehicle_id = v.vehicle_id
        WHERE tfr.tour_id = ? AND v.is_active = 1
        ORDER BY v.name
    ");
    $pricingStmt->bind_param("s", $tourId);
    $pricingStmt->execute();
    $pricingResult = $pricingStmt->get_result();
    
    if (!$pricingStmt) {
        logErrorToFile('Failed to prepare pricingStmt', ['error' => $conn->error]);
    }
    
    while ($pricingRow = $pricingResult->fetch_assoc()) {
        $tourDetail['pricing'][$pricingRow['vehicle_id']] = floatval($pricingRow['price']);
    }
    
    // Add default highlights if none exist
    if (empty($tourDetail['highlights'])) {
        $tourDetail['highlights'] = [
            [
                'icon' => 'mountain',
                'title' => 'Scenic Views',
                'description' => 'Beautiful landscapes and natural beauty'
            ],
            [
                'icon' => 'camera',
                'title' => 'Photo Opportunities',
                'description' => 'Perfect spots for memorable photos'
            ],
            [
                'icon' => 'coffee',
                'title' => 'Local Experience',
                'description' => 'Authentic local culture and experiences'
            ]
        ];
    }
    
    sendJsonResponse($tourDetail);
}
?>
