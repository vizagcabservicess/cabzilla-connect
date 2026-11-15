<?php
/**
 * POST /api/admin/sync-sheet-cost.php
 * { "booking_id": 123 }
 *
 * Push booking + invoice extras to Google Sheet COST / % VTH / Tolls.
 * Does not regenerate the invoice.
 */

declare(strict_types=1);

header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function sync_cost_json_headers(): void
{
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
}

function sync_cost_load_config(): void
{
    if (defined('JWT_SECRET')) {
        return;
    }
    foreach ([
        __DIR__ . '/../../config.php',
        __DIR__ . '/../../../config.php',
        dirname(__DIR__, 2) . '/config.php',
        dirname(__DIR__) . '/config.php',
    ] as $path) {
        if (is_readable($path)) {
            require_once $path;
            return;
        }
    }
    throw new RuntimeException('config.php not found');
}

if (!function_exists('base64url_decode')) {
    function base64url_decode($data)
    {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $data .= str_repeat('=', 4 - $remainder);
        }
        return base64_decode(strtr($data, '-_', '+/'));
    }
}

function sync_cost_verify_jwt(string $token)
{
    if (!defined('JWT_SECRET') || !JWT_SECRET) {
        return false;
    }
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return false;
    }
    [$headerB64, $payloadB64, $signatureB64] = $parts;
    $header = json_decode(base64url_decode($headerB64), true);
    if (!$header || ($header['alg'] ?? '') !== 'HS256') {
        return false;
    }
    $payload = json_decode(base64url_decode($payloadB64), true);
    if (!$payload) {
        return false;
    }
    if (isset($payload['exp']) && time() > (int) $payload['exp']) {
        return false;
    }
    $signature = base64url_decode($signatureB64);
    $expected = hash_hmac('sha256', "{$headerB64}.{$payloadB64}", JWT_SECRET, true);
    if (!hash_equals($expected, $signature)) {
        return false;
    }
    return $payload;
}

function sync_cost_require_admin(): void
{
    sync_cost_json_headers();
    sync_cost_load_config();

    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if ($authHeader === '' && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    }
    if (!preg_match('/Bearer\s+(\S+)/i', $authHeader, $m)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'errors' => ['Unauthorized']]);
        exit;
    }
    $payload = sync_cost_verify_jwt($m[1]);
    if (!$payload || !in_array($payload['role'] ?? '', ['admin', 'super_admin'], true)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'errors' => ['Unauthorized']]);
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sync_cost_json_headers();
    http_response_code(405);
    echo json_encode(['success' => false, 'errors' => ['Method not allowed']]);
    exit;
}

try {
    sync_cost_require_admin();
    require_once dirname(__DIR__) . '/utils/ai-booking-db.php';
    require_once dirname(__DIR__) . '/ai-booking/config/sheets-config.php';
    require_once dirname(__DIR__) . '/ai-booking/services/GoogleSheetService.php';
    require_once dirname(__DIR__) . '/ai-booking/services/OnlineBookingSheetSync.php';
} catch (Throwable $e) {
    sync_cost_json_headers();
    http_response_code(500);
    echo json_encode(['success' => false, 'errors' => [$e->getMessage()]]);
    exit;
}

$body = json_decode(file_get_contents('php://input') ?: '', true);
$bookingId = is_array($body) ? (int) ($body['booking_id'] ?? $body['bookingId'] ?? 0) : 0;
if ($bookingId <= 0) {
    echo json_encode(['success' => false, 'errors' => ['booking_id is required']]);
    exit;
}

try {
    $result = OnlineBookingSheetSync::syncCostForBooking($bookingId);
    $ok = !empty($result['success']) && empty($result['skipped']);
    echo json_encode([
        'success' => $ok,
        'booking_id' => $bookingId,
        'sheet_cost' => $result['cost'] ?? null,
        'sheet_row' => $result['sheet_row'] ?? null,
        'tab_name' => $result['tab_name'] ?? null,
        'invoice_no' => $result['invoice_no'] ?? null,
        'skipped' => !empty($result['skipped']),
        'error' => $result['error'] ?? null,
        'detail' => $result,
        'message' => $ok
            ? ('Google Sheet COST updated to ₹' . number_format((float) ($result['cost'] ?? 0), 0) . '.')
            : (string) ($result['error'] ?? 'Sheet COST was not updated.'),
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'errors' => [$e->getMessage()],
    ]);
}
