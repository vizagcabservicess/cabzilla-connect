<?php
/**
 * Generic image upload (mobile odometer, fuel receipts, carpool ID cards, vendor KYC, etc.).
 * Carpool ID cards: always saved locally under uploads/carpool-id/ (+ optional GCS mirror).
 * Smart Budget vendor (sb-vendor*): always local uploads/sb-vendor/ (GCS bucket is private).
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
$allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'];
if (!in_array($ext, $allowed, true)) {
    echo json_encode(['error' => 'Invalid file type']);
    exit;
}

$contentTypes = [
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png' => 'image/png',
    'gif' => 'image/gif',
    'webp' => 'image/webp',
    'pdf' => 'application/pdf',
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
} elseif (strpos($category, 'sb-vendor') === 0) {
    $folderPrefix = 'sb-vendor/';
} elseif (strpos($category, 'vth-event') === 0) {
    $folderPrefix = 'vth-event-private/';
}

$fileBase = ($folderPrefix === 'odometer-readings/' ? 'odo_' : 'img_') . uniqid('', true) . '.' . $ext;
$objectName = $folderPrefix . $fileBase;
$tmpPath = $_FILES['image']['tmp_name'];
$uploadsRoot = defined('UPLOADS_PATH') ? UPLOADS_PATH : (dirname(__DIR__) . '/uploads');

function public_html_uploads_root(string $fallback): string
{
    $docRoot = isset($_SERVER['DOCUMENT_ROOT']) ? rtrim((string) $_SERVER['DOCUMENT_ROOT'], '/\\') : '';
    if ($docRoot !== '') {
        $pub = $docRoot . DIRECTORY_SEPARATOR . 'uploads';
        if (!is_dir($pub)) {
            @mkdir($pub, 0755, true);
        }
        if (is_dir($pub) && is_writable($pub)) {
            return $pub;
        }
    }
    return $fallback;
}

function save_dated_public_upload(
    string $tmpPath,
    string $originalName,
    string $ext,
    string $categoryFolder,
    string $uploadsFallback
): array {
    $year = date('Y');
    $dateFolder = date('Y-m-d');
    $stem = strtolower((string) pathinfo($originalName, PATHINFO_FILENAME));
    $stem = preg_replace('/[^a-z0-9._-]+/', '-', $stem) ?? '';
    $stem = trim($stem, '.-_');
    if ($stem === '') {
        $stem = $categoryFolder;
    }
    $fileBase = $stem . '-' . date('His') . '-' . substr(uniqid('', true), -6) . '.' . $ext;
    $relativeDir = $categoryFolder . '/' . $year . '/' . $dateFolder;
    $localDir = public_html_uploads_root($uploadsFallback) . '/' . $relativeDir;
    if (!is_dir($localDir) && !mkdir($localDir, 0755, true) && !is_dir($localDir)) {
        return ['error' => 'Failed to create upload folder on Hostinger'];
    }
    $localPath = rtrim($localDir, '/\\') . DIRECTORY_SEPARATOR . $fileBase;
    if (!move_uploaded_file($tmpPath, $localPath)) {
        return ['error' => 'Failed to save file to Hostinger uploads'];
    }
    $relUrl = '/uploads/' . $relativeDir . '/' . $fileBase;
    $publicBase = defined('APP_URL') ? rtrim((string) APP_URL, '/') : 'https://vizagtaxihub.com';
    return [
        'url' => $publicBase . $relUrl,
        'path' => $relUrl,
        'folder' => $relativeDir,
    ];
}

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

/**
 * Tour main + gallery images — always public Hostinger uploads:
 * public_html/uploads/tours/{year}/{Y-m-d}/filename.jpg
 */
if ($category === 'tours' || $category === 'tour' || $category === 'tour-gallery') {
    $imageOnly = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    if (!in_array($ext, $imageOnly, true)) {
        echo json_encode(['error' => 'Tour images must be JPG, PNG, WEBP, or GIF']);
        exit;
    }
    $saved = save_dated_public_upload($tmpPath, $filename, $ext, 'tours', $uploadsRoot);
    if (!empty($saved['error'])) {
        echo json_encode(['error' => $saved['error']]);
        exit;
    }
    echo json_encode($saved);
    exit;
}

/**
 * Site banner / notice — local public uploads (GCS bucket is private).
 * Use notice_ prefix (not img_) so ad blockers are less likely to block the URL.
 */
if ($category === 'site-banner' || $category === 'site-notice' || $category === 'site-promo') {
    $folderPrefix = 'site-banners/';
    $fileBase = 'notice_' . uniqid('', true) . '.' . $ext;
    $objectName = $folderPrefix . $fileBase;
    $localDir = $uploadsRoot . '/site-banners';
    if (!is_dir($localDir)) {
        mkdir($localDir, 0755, true);
    }
    $localPath = $localDir . '/' . $fileBase;
    if (!move_uploaded_file($tmpPath, $localPath)) {
        echo json_encode(['error' => 'Failed to save banner']);
        exit;
    }
    if (function_exists('uploadToGcs') && gcloudEnv('GCS_BUCKET')) {
        uploadToGcs($localPath, $objectName, $contentType);
    }
    echo json_encode([
        'url' => '/uploads/site-banners/' . $fileBase,
        'object' => $objectName,
    ]);
    exit;
}

/**
 * Event & Duty private documents — never expose a public /uploads URL.
 */
if (strpos($category, 'vth-event') === 0) {
    $privateRoot = rtrim($uploadsRoot, '/\\') . '/vth-event-private';
    if (!is_dir($privateRoot)) {
        @mkdir($privateRoot, 0700, true);
    }
    $ht = $privateRoot . '/.htaccess';
    if (!is_file($ht)) {
        @file_put_contents($ht, "Require all denied\nDeny from all\nOptions -Indexes\n");
    }
    $relDir = date('Y/m');
    $localDir = $privateRoot . '/' . $relDir;
    if (!is_dir($localDir)) {
        @mkdir($localDir, 0700, true);
    }
    $fileBase = 'evt_' . bin2hex(random_bytes(8)) . '.' . $ext;
    $localPath = $localDir . '/' . $fileBase;
    if (!move_uploaded_file($tmpPath, $localPath)) {
        echo json_encode(['error' => 'Failed to save private document']);
        exit;
    }
    @chmod($localPath, 0600);
    echo json_encode([
        'object' => 'vth-event-private/' . $relDir . '/' . $fileBase,
        'private' => true,
    ]);
    exit;
}

/**
 * Smart Budget vendor profile + KYC.
 * GCS objects are private (AccessDenied for anonymous), so always use public /uploads/.
 */
if (strpos($category, 'sb-vendor') === 0) {
    $localDir = $uploadsRoot . '/sb-vendor';
    if (!is_dir($localDir)) {
        mkdir($localDir, 0755, true);
    }
    $localPath = $localDir . '/' . $fileBase;
    if (!move_uploaded_file($tmpPath, $localPath)) {
        echo json_encode(['error' => 'Failed to save vendor file']);
        exit;
    }

    if (function_exists('uploadToGcs') && gcloudEnv('GCS_BUCKET')) {
        uploadToGcs($localPath, $objectName, $contentType);
    }

    echo json_encode([
        'url' => '/uploads/sb-vendor/' . $fileBase,
        'object' => $objectName,
    ]);
    exit;
}

if (function_exists('uploadToGcs') && gcloudEnv('GCS_BUCKET')) {
    $res = uploadToGcs($tmpPath, $objectName, $contentType);
    if ($res && !empty($res['publicUrl'])) {
        // Prefer object key when bucket is private — callers can use media proxy.
        // Keep publicUrl for backward compatibility, but also return object.
        echo json_encode([
            'url' => $res['publicUrl'],
            'object' => $objectName,
        ]);
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
