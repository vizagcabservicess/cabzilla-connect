<?php
/**
 * POST /api/admin/purge-cache.php
 * { "scope": "all" }
 * { "scope": "url", "url": "/tours/vizag-south-city-tour" }
 *
 * Clears LiteSpeed cache on this server. Clears Cloudflare when
 * CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID are set in the server env.
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

function purge_json_headers(): void
{
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
}

function purge_load_config(): void
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

function purge_verify_jwt(string $token)
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

function purge_require_admin(): void
{
    purge_json_headers();
    purge_load_config();

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
    $payload = purge_verify_jwt($m[1]);
    if (!$payload || !in_array($payload['role'] ?? '', ['admin', 'super_admin'], true)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'errors' => ['Unauthorized']]);
        exit;
    }
}

/** @return string|null Site path such as /tours/araku-valley-tour */
function purge_normalize_path(string $raw): ?string
{
    $raw = trim($raw);
    if ($raw === '') {
        return null;
    }
    if (preg_match('#^https?://#i', $raw)) {
        $parts = parse_url($raw);
        $host = strtolower((string) ($parts['host'] ?? ''));
        if (!in_array($host, ['vizagtaxihub.com', 'www.vizagtaxihub.com'], true)) {
            return null;
        }
        $path = (string) ($parts['path'] ?? '/');
        if (!empty($parts['query'])) {
            $path .= '?' . $parts['query'];
        }
    } else {
        $path = $raw;
    }
    if ($path === '' || $path[0] !== '/') {
        return null;
    }
    if (str_contains($path, '..') || str_contains($path, '\\') || str_contains($path, "\n")) {
        return null;
    }
    return $path;
}

/** @return array{configured: bool, purged: bool, message: string} */
function purge_cloudflare(bool $everything, ?string $path): array
{
    $token = defined('CLOUDFLARE_API_TOKEN') ? trim((string) CLOUDFLARE_API_TOKEN) : '';
    $zone = defined('CLOUDFLARE_ZONE_ID') ? trim((string) CLOUDFLARE_ZONE_ID) : '';
    if ($token === '' || $zone === '') {
        return [
            'configured' => false,
            'purged' => false,
            'message' => 'Cloudflare is not configured. Add CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID on the server to purge the CDN.',
        ];
    }
    if (!preg_match('/^[a-zA-Z0-9]+$/', $zone)) {
        return [
            'configured' => true,
            'purged' => false,
            'message' => 'CLOUDFLARE_ZONE_ID is not a valid zone id.',
        ];
    }

    $body = $everything
        ? ['purge_everything' => true]
        : ['files' => ['https://vizagtaxihub.com' . $path, 'https://www.vizagtaxihub.com' . $path]];

    $url = 'https://api.cloudflare.com/client/v4/zones/' . rawurlencode($zone) . '/purge_cache';
    $payload = json_encode($body);
    $raw = false;
    $status = 0;

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $token,
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 20,
        ]);
        $raw = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
    } else {
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Authorization: Bearer {$token}\r\nContent-Type: application/json\r\n",
                'content' => $payload,
                'timeout' => 20,
                'ignore_errors' => true,
            ],
        ]);
        $raw = @file_get_contents($url, false, $context);
        if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) {
            $status = (int) $m[1];
        }
    }

    $decoded = is_string($raw) ? json_decode($raw, true) : null;
    $ok = is_array($decoded) && !empty($decoded['success']) && $status >= 200 && $status < 300;
    if ($ok) {
        return [
            'configured' => true,
            'purged' => true,
            'message' => $everything ? 'Cloudflare cache purged.' : 'Cloudflare cache purged for that page.',
        ];
    }

    $cfError = 'Cloudflare did not purge the cache.';
    if (is_array($decoded) && !empty($decoded['errors'][0]['message'])) {
        $cfError = (string) $decoded['errors'][0]['message'];
    }
    return [
        'configured' => true,
        'purged' => false,
        'message' => $cfError,
    ];
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    purge_json_headers();
    http_response_code(405);
    echo json_encode(['success' => false, 'errors' => ['Method not allowed']]);
    exit;
}

try {
    purge_require_admin();
} catch (Throwable $e) {
    purge_json_headers();
    http_response_code(500);
    echo json_encode(['success' => false, 'errors' => ['Could not load server config']]);
    exit;
}

$body = json_decode(file_get_contents('php://input') ?: '', true);
$scope = is_array($body) ? (string) ($body['scope'] ?? 'all') : 'all';
$path = null;

if ($scope === 'url') {
    $path = purge_normalize_path((string) (is_array($body) ? ($body['url'] ?? '') : ''));
    if ($path === null) {
        http_response_code(400);
        echo json_encode(['success' => false, 'errors' => ['Enter a page path on vizagtaxihub.com, such as /tours/vizag-south-city-tour']]);
        exit;
    }
    header('X-LiteSpeed-Purge: ' . $path);
} elseif ($scope === 'all') {
    header('X-LiteSpeed-Purge: *');
} else {
    http_response_code(400);
    echo json_encode(['success' => false, 'errors' => ['Unknown purge scope']]);
    exit;
}

$cloudflare = purge_cloudflare($scope === 'all', $path);
$litespeedMessage = $scope === 'all'
    ? 'Server cache purge requested for the whole site.'
    : 'Server cache purge requested for ' . $path . '.';

echo json_encode([
    'success' => !$cloudflare['configured'] || $cloudflare['purged'],
    'scope' => $scope,
    'path' => $path,
    'litespeed' => ['purged' => true, 'message' => $litespeedMessage],
    'cloudflare' => $cloudflare,
]);
