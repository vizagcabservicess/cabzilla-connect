<?php
require_once __DIR__ . '/lib.php';

vth_event_cors();
vth_event_rate_limit('vth_event_ocr', 40, 60);

$headers = function_exists('getallheaders') ? getallheaders() : [];
$allowed = false;
$authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
if ($authHeader && stripos($authHeader, 'Bearer ') === 0) {
    $payload = verifyJwtToken(trim(substr($authHeader, 7)));
    if ($payload && in_array($payload['role'] ?? '', ['admin', 'super_admin'], true)) {
        $allowed = true;
    }
}
$driverToken = (string) ($_POST['token'] ?? $headers['X-Event-Driver-Token'] ?? '');
if (!$allowed && $driverToken !== '') {
    $conn = vth_event_conn();
    $tok = vth_event_lookup_token($conn, $driverToken, 'driver');
    $allowed = (bool) $tok;
}
if (!$allowed) {
    vth_event_error('Unauthorized', 401);
}

if (empty($_FILES['image']) && empty($_FILES['photo']) && empty($_FILES['file'])) {
    vth_event_ok(['available' => false, 'reading' => null, 'text' => ''], 'No image');
}

$file = $_FILES['image'] ?? $_FILES['photo'] ?? $_FILES['file'];
$tmp = $file['tmp_name'] ?? '';
if (!$tmp || !is_file($tmp)) {
    vth_event_ok(['available' => false, 'reading' => null]);
}

$ocrPath = vth_event_shrink_ocr_tmp($tmp);
$gcloud = __DIR__ . '/../utils/gcloud.php';
$text = '';
$visionErr = null;
if (is_file($gcloud)) {
    require_once $gcloud;
    $imageB64 = base64_encode((string) file_get_contents($ocrPath));
    if (function_exists('visionDocumentTextDetection')) {
        $hasGcp = ($_ENV['GCP_PROJECT_ID'] ?? getenv('GCP_PROJECT_ID')) || ($_ENV['GCP_SERVICE_ACCOUNT_JSON'] ?? getenv('GCP_SERVICE_ACCOUNT_JSON'));
        if ($hasGcp) {
            $text = (string) visionDocumentTextDetection($imageB64, $visionErr);
        }
    }
}
if ($ocrPath !== $tmp && is_file($ocrPath)) {
    @unlink($ocrPath);
}

$reading = vth_event_extract_odometer($text);
vth_event_ok([
    'available' => $text !== '' || $reading !== null,
    'reading' => $reading,
    'text' => $text,
    'message' => $reading ? null : ($visionErr ?: ($text === '' ? 'Could not read the odometer. Type the KM or crop the digits and try again.' : null)),
]);
