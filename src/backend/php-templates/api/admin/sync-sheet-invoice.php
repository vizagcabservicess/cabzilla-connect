<?php
/**
 * POST /api/admin/sync-sheet-invoice.php
 * { "booking_id": 123 }
 *
 * Match the booking to its Google Sheet row by guest name/phone/DOJ and
 * adopt column A's Invoice no onto bookings.invoice_no (and invoices.invoice_number).
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

function sync_inv_json_headers(): void
{
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
}

function sync_inv_load_config(): void
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

function sync_inv_verify_jwt(string $token)
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

function sync_inv_require_admin(): void
{
    sync_inv_json_headers();
    sync_inv_load_config();

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
    $payload = sync_inv_verify_jwt($m[1]);
    if (!$payload || !in_array($payload['role'] ?? '', ['admin', 'super_admin'], true)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'errors' => ['Unauthorized']]);
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sync_inv_json_headers();
    http_response_code(405);
    echo json_encode(['success' => false, 'errors' => ['Method not allowed']]);
    exit;
}

try {
    sync_inv_require_admin();
    require_once dirname(__DIR__) . '/utils/ai-booking-db.php';
    require_once dirname(__DIR__) . '/ai-booking/config/sheets-config.php';
    require_once dirname(__DIR__) . '/ai-booking/services/GoogleSheetService.php';
    require_once dirname(__DIR__) . '/ai-booking/services/OnlineBookingSheetSync.php';
} catch (Throwable $e) {
    sync_inv_json_headers();
    http_response_code(500);
    echo json_encode(['success' => false, 'errors' => [$e->getMessage()]]);
    exit;
}

$body = json_decode(file_get_contents('php://input') ?: '', true);
$bookingId = is_array($body) ? (int) ($body['booking_id'] ?? 0) : 0;
if ($bookingId <= 0) {
    echo json_encode(['success' => false, 'errors' => ['booking_id is required']]);
    exit;
}

try {
    $pdo = ai_booking_get_pdo();
    $stmt = $pdo->prepare(
        'SELECT id, invoice_no, passenger_name, customer_name, passenger_phone, customer_mobile, pickup_date
         FROM bookings WHERE id = ? LIMIT 1'
    );
    $stmt->execute([$bookingId]);
    $booking = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$booking) {
        echo json_encode(['success' => false, 'errors' => ['Booking not found']]);
        exit;
    }

    $before = (int) ($booking['invoice_no'] ?? 0);
    $adopt = OnlineBookingSheetSync::adoptInvoiceFromSheet($bookingId);

    if (!empty($adopt['error'])) {
        echo json_encode([
            'success' => false,
            'errors' => [(string) $adopt['error']],
            'invoice_no_before' => $before > 0 ? $before : null,
            'detail' => $adopt,
        ]);
        exit;
    }

    $invoiceNo = (int) ($adopt['invoice_no'] ?? 0);
    if ($invoiceNo <= 0) {
        echo json_encode([
            'success' => false,
            'errors' => [
                'No matching Google Sheet row found for this guest (name / phone / DOJ). '
                . 'Confirm the trip is on the correct month tab (e.g. Nov 2026), then try again.',
            ],
            'invoice_no_before' => $before > 0 ? $before : null,
            'passenger_name' => $booking['passenger_name'] ?? $booking['customer_name'] ?? '',
            'pickup_date' => $booking['pickup_date'] ?? '',
            'detail' => $adopt,
        ]);
        exit;
    }

    // Keep invoices.invoice_number in sync so PDF/HTML stop showing the old MAX+1 value.
    try {
        $upd = $pdo->prepare(
            "UPDATE invoices
             SET invoice_number = ?
             WHERE booking_id = ?"
        );
        $upd->execute([(string) $invoiceNo, $bookingId]);
    } catch (Throwable $ignored) {
        // Non-fatal
    }

    // Also push COST / % VTH / Tolls from booking + latest invoice extras.
    $costSync = ['success' => true, 'skipped' => true];
    try {
        $costSync = OnlineBookingSheetSync::syncCostForBooking($bookingId);
    } catch (Throwable $costError) {
        $costSync = ['success' => false, 'error' => $costError->getMessage()];
    }

    echo json_encode([
        'success' => true,
        'booking_id' => $bookingId,
        'invoice_no' => $invoiceNo,
        'invoice_number' => (string) $invoiceNo,
        'invoice_no_before' => $before > 0 ? $before : null,
        'changed' => $before !== $invoiceNo,
        'sheet_row' => $adopt['sheet_row'] ?? ($costSync['sheet_row'] ?? null),
        'tab_name' => $adopt['tab_name'] ?? ($costSync['tab_name'] ?? null),
        'sheet_cost' => $costSync['cost'] ?? null,
        'cost_sync' => $costSync,
        'message' => $before === $invoiceNo
            ? "Invoice #{$invoiceNo} already matches the Google Sheet."
            : "Updated invoice from #{$before} to sheet Invoice #{$invoiceNo}.",
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'errors' => [$e->getMessage()],
    ]);
}
