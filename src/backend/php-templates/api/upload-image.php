<?php
/**
 * Generic image upload (mobile odometer, fuel receipts, etc.).
 * Uses Google Cloud Storage when GCS_BUCKET + GCP credentials are configured; otherwise local uploads/.
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
}
// Distinct prefix inside folder so odometer shots are easy to spot in GCS console.
$newName = ($folderPrefix === 'odometer-readings/' ? 'odo_' : 'img_') . uniqid('', true) . '.' . $ext;
$objectName = $folderPrefix . $newName;
$tmpPath = $_FILES['image']['tmp_name'];

if (function_exists('uploadToGcs') && gcloudEnv('GCS_BUCKET')) {
    $res = uploadToGcs($tmpPath, $objectName, $contentType);
    if ($res && !empty($res['publicUrl'])) {
        echo json_encode(['url' => $res['publicUrl']]);
        exit;
    }
}

$uploadDir = defined('UPLOADS_PATH') ? UPLOADS_PATH : (dirname(__DIR__) . '/uploads');
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}
$targetPath = $uploadDir . '/' . $newName;

if (!move_uploaded_file($_FILES['image']['tmp_name'], $targetPath)) {
    echo json_encode(['error' => 'Failed to save file']);
    exit;
}

$url = '/uploads/' . $newName;
echo json_encode(['url' => $url]);
