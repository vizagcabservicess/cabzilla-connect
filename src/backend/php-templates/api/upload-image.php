<?php

/**

 * Generic image upload (mobile odometer, fuel receipts, carpool ID cards, etc.).

 * Carpool ID cards: always saved locally under uploads/carpool-id/ (+ optional GCS mirror).

 * Other categories: GCS when configured, else local uploads/.

 */

require_once __DIR__ . '/../config.php';

require_once __DIR__ . '/utils/gcloud.php';



header('Access-Control-Allow-Origin: *');

header('Access-Control-Allow-Methods: POST, OPTIONS');

header('Access-Control-Allow-Headers: Content-Type');

header('Content-Type: application/json');

header('Cache-Control: no-store, no-cache, must-revalidate');



if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {

    http_response_code(200);

    exit;

}



if ($_SERVER['REQUEST_METHOD'] !== 'POST') {

    echo json_encode(['error' => 'Invalid request method']);

    exit;

}



if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {

    echo json_encode(['error' => 'No file uploaded or upload error']);

    exit;

}



$filename = basename($_FILES['image']['name']);

$ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

$allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

if (!in_array($ext, $allowed)) {

    echo json_encode(['error' => 'Invalid file type']);

    exit;

}



$contentTypes = [

    'jpg' => 'image/jpeg',

    'jpeg' => 'image/jpeg',

    'png' => 'image/png',

    'gif' => 'image/gif',

    'webp' => 'image/webp',

];

$contentType = $contentTypes[$ext] ?? 'image/jpeg';



$category = isset($_POST['category']) ? strtolower(trim((string)$_POST['category'])) : '';

if ($category === '' && isset($_GET['category'])) {

    $category = strtolower(trim((string)$_GET['category']));

}



$folderPrefix = 'app-uploads/';

if ($category === 'odometer' || $category === 'odometer_reading' || $category === 'odometer-reading') {

    $folderPrefix = 'odometer-readings/';

} elseif ($category === 'carpool-id') {

    $folderPrefix = 'carpool-id/';

}



$fileBase = ($folderPrefix === 'odometer-readings/' ? 'odo_' : 'img_') . uniqid('', true) . '.' . $ext;

$objectName = $folderPrefix . $fileBase;

$tmpPath = $_FILES['image']['tmp_name'];

$uploadsRoot = defined('UPLOADS_PATH') ? UPLOADS_PATH : (dirname(__DIR__) . '/uploads');



/**

 * Carpool ID cards — local uploads/carpool-id/ (primary) + optional GCS carpool-id/ mirror.

 * Returns storage key "carpool-id/filename.ext" for admin media proxy.

 */

if ($category === 'carpool-id') {

    $localDir = $uploadsRoot . '/carpool-id';

    if (!is_dir($localDir)) {

        mkdir($localDir, 0755, true);

    }

    $localPath = $localDir . '/' . $fileBase;

    if (!move_uploaded_file($tmpPath, $localPath)) {

        echo json_encode(['error' => 'Failed to save ID card']);

        exit;

    }



    if (function_exists('uploadToGcs') && gcloudEnv('GCS_BUCKET')) {

        uploadToGcs($localPath, $objectName, $contentType);

    }



    echo json_encode(['url' => $objectName]);

    exit;

}



if (function_exists('uploadToGcs') && gcloudEnv('GCS_BUCKET')) {

    $res = uploadToGcs($tmpPath, $objectName, $contentType);

    if ($res && !empty($res['publicUrl'])) {

        echo json_encode(['url' => $res['publicUrl']]);

        exit;

    }

}



$localSubdir = rtrim($folderPrefix, '/');

$localDir = $uploadsRoot . '/' . $localSubdir;

if (!is_dir($localDir)) {

    mkdir($localDir, 0755, true);

}

$targetPath = $localDir . '/' . $fileBase;



if (!move_uploaded_file($tmpPath, $targetPath)) {

    echo json_encode(['error' => 'Failed to save file']);

    exit;

}



echo json_encode(['url' => $localSubdir . '/' . $fileBase]);



