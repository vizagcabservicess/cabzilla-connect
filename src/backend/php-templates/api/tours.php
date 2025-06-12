
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
    logError("Error in tours API", ['error' => $e->getMessage()]);
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
            tf.is_active as isActive
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
            'minPrice' => 0
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
            tf.updated_at as updatedAt
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
        'pricing' => []
    ];
    
    // Get gallery images
    $galleryStmt = $conn->prepare("
        SELECT id, image_url as url, alt_text as alt, caption
        FROM tour_gallery 
        WHERE tour_id = ? 
        ORDER BY sort_order, id
    ");
    $galleryStmt->bind_param("s", $tourId);
    $galleryStmt->execute();
    $galleryResult = $galleryStmt->get_result();
    
    while ($galleryRow = $galleryResult->fetch_assoc()) {
        $tourDetail['gallery'][] = [
            'id' => $galleryRow['id'],
            'url' => $galleryRow['url'],
            'alt' => $galleryRow['alt'] ?? $tour['tourName'],
            'caption' => $galleryRow['caption']
        ];
    }
    
    // Get inclusions
    $inclusionsStmt = $conn->prepare("
        SELECT description
        FROM tour_inclusions 
        WHERE tour_id = ? 
        ORDER BY sort_order, id
    ");
    $inclusionsStmt->bind_param("s", $tourId);
    $inclusionsStmt->execute();
    $inclusionsResult = $inclusionsStmt->get_result();
    
    while ($inclusionRow = $inclusionsResult->fetch_assoc()) {
        $tourDetail['inclusions'][] = $inclusionRow['description'];
    }
    
    // Get exclusions
    $exclusionsStmt = $conn->prepare("
        SELECT description
        FROM tour_exclusions 
        WHERE tour_id = ? 
        ORDER BY sort_order, id
    ");
    $exclusionsStmt->bind_param("s", $tourId);
    $exclusionsStmt->execute();
    $exclusionsResult = $exclusionsStmt->get_result();
    
    while ($exclusionRow = $exclusionsResult->fetch_assoc()) {
        $tourDetail['exclusions'][] = $exclusionRow['description'];
    }
    
    // Get itinerary
    $itineraryStmt = $conn->prepare("
        SELECT day_number as day, title, description, activities
        FROM tour_itinerary 
        WHERE tour_id = ? 
        ORDER BY day_number
    ");
    $itineraryStmt->bind_param("s", $tourId);
    $itineraryStmt->execute();
    $itineraryResult = $itineraryStmt->get_result();
    
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
