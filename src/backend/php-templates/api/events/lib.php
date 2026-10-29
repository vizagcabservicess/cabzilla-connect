<?php
/**
 * Shared helpers for VTH Event & Duty Management.
 * New module only — does not change booking/auth/fleet APIs.
 */
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../common/db_helper.php';
require_once __DIR__ . '/../utils/auth.php';
require_once __DIR__ . '/../utils/security.php';
require_once __DIR__ . '/../utils/gcloud.php';

define('VTH_EVENT_VEHICLE_TYPES', [
    'sedan',
    'innova',
    'innova_crysta',
    'ertiga',
    'fortuner',
    'mini_bus',
    'tempo_traveller',
    'urbania',
    'other',
]);

define('VTH_EVENT_DUTY_STATUSES', [
    'scheduled',
    'not_started',
    'in_progress',
    'completed',
    'missing_opening',
    'missing_closing',
    'exception',
    'cancelled',
]);

define('VTH_EVENT_SENSITIVE_DOCS', [
    'aadhaar',
    'aadhaar_back',
    'dl_front',
    'dl_back',
    'rc',
    'rc_back',
    'insurance',
    'insurance_back',
    'permit',
    'fitness',
    'pollution',
    'driver_photo',
]);

function vth_event_cors(bool $json = true): void
{
    $allowed = ['https://vizagtaxihub.com', 'https://www.vizagtaxihub.com', 'http://localhost:8080', 'http://127.0.0.1:8080'];
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origin, $allowed, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
    } else {
        header('Access-Control-Allow-Origin: https://vizagtaxihub.com');
    }
    header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Force-Refresh, X-Event-Driver-Token, X-Event-Share-Token');
    header('Access-Control-Expose-Headers: Content-Disposition, Content-Type, Content-Length');
    header('Access-Control-Max-Age: 86400');
    header('Cache-Control: no-store');
    if ($json) {
        header('Content-Type: application/json; charset=utf-8');
    }
    if (function_exists('setSecurityHeaders')) {
        setSecurityHeaders();
    }
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

function vth_event_slice_document(string $bytes): string
{
    $len = strlen($bytes);
    $limit = min($len, 4096);
    for ($i = 0; $i < $limit; $i++) {
        if ($i + 2 < $len && $bytes[$i] === "\xFF" && $bytes[$i + 1] === "\xD8" && $bytes[$i + 2] === "\xFF") {
            return substr($bytes, $i);
        }
        if ($i + 3 < $len && substr($bytes, $i, 4) === '%PDF') {
            return substr($bytes, $i);
        }
        if ($i + 3 < $len && substr($bytes, $i, 4) === "\x89PNG") {
            return substr($bytes, $i);
        }
    }
    return $bytes;
}

function vth_event_media_payload(array $doc): array
{
    $mime = $doc['mime'] ?: null;
    $bytes = vth_event_read_file((string) $doc['storage_key'], $mime);
    if ($bytes === null) {
        vth_event_error('File missing', 404);
    }
    $bytes = vth_event_slice_document($bytes);
    $mime = vth_event_sniff_mime($bytes, $mime);
    return [
        'mime' => $mime,
        'data' => base64_encode($bytes),
        'name' => basename((string) ($doc['original_name'] ?: 'document')),
        'size' => strlen($bytes),
    ];
}

function vth_event_sniff_mime(string $bytes, ?string $fallback = null): string
{
    if (strncmp($bytes, "\xFF\xD8\xFF", 3) === 0) {
        return 'image/jpeg';
    }
    if (strncmp($bytes, "\x89PNG", 4) === 0) {
        return 'image/png';
    }
    if (strncmp($bytes, '%PDF', 4) === 0) {
        return 'application/pdf';
    }
    if (strlen($bytes) >= 12 && strncmp($bytes, 'RIFF', 4) === 0 && substr($bytes, 8, 4) === 'WEBP') {
        return 'image/webp';
    }
    if (is_string($fallback) && $fallback !== '' && stripos($fallback, 'json') === false) {
        return $fallback;
    }
    return 'application/octet-stream';
}

function vth_event_json($data, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function vth_event_error(string $message, int $code = 400, array $extra = []): void
{
    vth_event_json(array_merge(['status' => 'error', 'success' => false, 'message' => $message], $extra), $code);
}

function vth_event_ok(array $data = [], string $message = 'OK'): void
{
    vth_event_json(array_merge(['status' => 'success', 'success' => true, 'message' => $message], $data));
}

function vth_event_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw) {
        $json = json_decode($raw, true);
        if (is_array($json)) {
            return $json;
        }
    }
    return $_POST ?: [];
}

function vth_event_action(array $body): string
{
    $action = $body['action'] ?? ($_GET['action'] ?? '');
    return is_string($action) ? trim($action) : '';
}

function vth_event_ip(): string
{
    $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
    $ip = explode(',', (string) $ip)[0];
    return substr(trim($ip), 0, 64);
}

function vth_event_conn(): mysqli
{
    $conn = getDbConnectionWithRetry();
    if (!$conn) {
        vth_event_error('Database connection failed', 500);
    }
    return $conn;
}

function vth_event_require_user(): array
{
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (!$authHeader || stripos($authHeader, 'Bearer ') !== 0) {
        vth_event_error('Unauthorized', 401);
    }
    $token = trim(substr($authHeader, 7));
    $payload = verifyJwtToken($token);
    $role = (string) ($payload['role'] ?? '');
    if (!$payload || !in_array($role, ['admin', 'super_admin', 'driver', 'customer', 'guest'], true)) {
        vth_event_error('Unauthorized', 401);
    }
    return $payload;
}

function vth_event_jwt_user_id(array $payload): int
{
    foreach (['user_id', 'id', 'uid', 'sub'] as $key) {
        if (isset($payload[$key]) && (int) $payload[$key] > 0) {
            return (int) $payload[$key];
        }
    }
    return 0;
}

function vth_event_ensure_app_access(mysqli $conn): void
{
    $conn->query(
        "CREATE TABLE IF NOT EXISTS vth_user_app_access (
          user_id INT NOT NULL PRIMARY KEY,
          access VARCHAR(32) NOT NULL,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
}

function vth_event_app_access_for(mysqli $conn, int $userId): string
{
    vth_event_ensure_app_access($conn);
    if ($userId < 1) {
        return 'full';
    }
    $stmt = $conn->prepare('SELECT access FROM vth_user_app_access WHERE user_id = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    $access = (string) ($row['access'] ?? 'full');
    return in_array($access, ['full', 'event_manager', 'event_driver'], true) ? $access : 'full';
}

function vth_event_driver_id_for_login(mysqli $conn, int $userId, array $payload): int
{
    if ($userId > 0) {
        try {
            $stmt = $conn->prepare('SELECT id FROM drivers WHERE user_id = ? ORDER BY id DESC LIMIT 1');
            if ($stmt) {
                $stmt->bind_param('i', $userId);
                $stmt->execute();
                $driver = $stmt->get_result()->fetch_assoc();
                $stmt->close();
                $linked = (int) ($driver['id'] ?? 0);
                if ($linked > 0) {
                    return $linked;
                }
            }
        } catch (Throwable $e) {
            /* drivers.user_id is optional */
        }
    }

    $phone = preg_replace('/\D+/', '', (string) ($payload['phone'] ?? $payload['mobile'] ?? ''));
    $email = trim((string) ($payload['email'] ?? ''));
    if ($userId > 0 && ($phone === '' || $email === '')) {
        try {
            $userStmt = $conn->prepare('SELECT phone, email FROM users WHERE id = ? LIMIT 1');
            if ($userStmt) {
                $userStmt->bind_param('i', $userId);
                $userStmt->execute();
                $userRow = $userStmt->get_result()->fetch_assoc();
                $userStmt->close();
                if ($phone === '') {
                    $phone = preg_replace('/\D+/', '', (string) ($userRow['phone'] ?? ''));
                }
                if ($email === '') {
                    $email = trim((string) ($userRow['email'] ?? ''));
                }
            }
        } catch (Throwable $e) {
            /* login row is optional when the token already carries phone or email */
        }
    }

    if (strlen($phone) >= 10) {
        $tail = substr($phone, -10);
        $byPhone = $conn->prepare(
            'SELECT id FROM drivers
             WHERE RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(IFNULL(phone, ""), " ", ""), "-", ""), "+", ""), "(", ""), 10) = ?
             ORDER BY id DESC LIMIT 1'
        );
        if ($byPhone) {
            $byPhone->bind_param('s', $tail);
            $byPhone->execute();
            $phoneRow = $byPhone->get_result()->fetch_assoc();
            $byPhone->close();
            $phoneId = (int) ($phoneRow['id'] ?? 0);
            if ($phoneId > 0) {
                return $phoneId;
            }
        }
    }

    if ($email !== '') {
        $byEmail = $conn->prepare('SELECT id FROM drivers WHERE email = ? ORDER BY id DESC LIMIT 1');
        if ($byEmail) {
            $byEmail->bind_param('s', $email);
            $byEmail->execute();
            $emailRow = $byEmail->get_result()->fetch_assoc();
            $byEmail->close();
            return (int) ($emailRow['id'] ?? 0);
        }
    }

    return 0;
}

function vth_event_phone_tail(string $phone): string
{
    $digits = preg_replace('/\D+/', '', $phone);
    if (!is_string($digits) || $digits === '') {
        return '';
    }
    if (strlen($digits) >= 12 && substr($digits, 0, 2) === '91') {
        $digits = substr($digits, 2);
    }
    if (strlen($digits) >= 11 && substr($digits, 0, 1) === '0') {
        $digits = substr($digits, 1);
    }
    if (strlen($digits) < 10) {
        return '';
    }
    return substr($digits, -10);
}

function vth_event_ensure_token_plain(mysqli $conn): void
{
    $col = @$conn->query("SHOW COLUMNS FROM `vth_event_tokens` LIKE 'token_plain'");
    if ($col instanceof mysqli_result && $col->num_rows > 0) {
        return;
    }
    @$conn->query('ALTER TABLE vth_event_tokens ADD COLUMN token_plain VARCHAR(128) NULL');
}

function vth_event_driver_token_for_user(mysqli $conn, int $userId, array $payload = []): ?string
{
    vth_event_ensure_token_plain($conn);
    $phone = preg_replace('/\D+/', '', (string) ($payload['phone'] ?? $payload['mobile'] ?? ''));
    if ((!is_string($phone) || $phone === '') && $userId > 0) {
        $userStmt = $conn->prepare('SELECT phone FROM users WHERE id = ? LIMIT 1');
        if ($userStmt) {
            $userStmt->bind_param('i', $userId);
            $userStmt->execute();
            $userRow = $userStmt->get_result()->fetch_assoc();
            $userStmt->close();
            $phone = preg_replace('/\D+/', '', (string) ($userRow['phone'] ?? ''));
        }
    }
    $tail = vth_event_phone_tail(is_string($phone) ? $phone : '');
    $driverIds = [];
    $primary = vth_event_driver_id_for_login($conn, $userId, $payload);
    if ($primary > 0) {
        $driverIds[$primary] = $primary;
    }
    $assignmentIds = [];
    if ($tail !== '') {
        $like = '%' . $tail;
        $byPhone = $conn->prepare('SELECT id FROM drivers WHERE phone LIKE ?');
        if ($byPhone) {
            $byPhone->bind_param('s', $like);
            $byPhone->execute();
            $phoneRes = $byPhone->get_result();
            while ($phoneRow = $phoneRes->fetch_assoc()) {
                $id = (int) ($phoneRow['id'] ?? 0);
                if ($id > 0) {
                    $driverIds[$id] = $id;
                }
            }
            $byPhone->close();
        }
        $byDuty = $conn->prepare(
            "SELECT driver_id, assignment_id FROM vth_event_duties
             WHERE status <> 'cancelled' AND driver_mobile_snapshot LIKE ?"
        );
        if ($byDuty) {
            $byDuty->bind_param('s', $like);
            $byDuty->execute();
            $dutyRes = $byDuty->get_result();
            while ($dutyRow = $dutyRes->fetch_assoc()) {
                $id = (int) ($dutyRow['driver_id'] ?? 0);
                $assignmentId = (int) ($dutyRow['assignment_id'] ?? 0);
                if ($id > 0) {
                    $driverIds[$id] = $id;
                }
                if ($assignmentId > 0) {
                    $assignmentIds[$assignmentId] = $assignmentId;
                }
            }
            $byDuty->close();
        }
    }
    if (!$driverIds && !$assignmentIds) {
        return null;
    }
    $where = [];
    if ($driverIds) {
        $where[] = 'driver_id IN (' . implode(',', array_map('intval', $driverIds)) . ')';
    }
    if ($assignmentIds) {
        $where[] = 'assignment_id IN (' . implode(',', array_map('intval', $assignmentIds)) . ')';
    }
    $sql = "SELECT id, token_plain, event_id, assignment_id, driver_id
            FROM vth_event_tokens
            WHERE token_type = 'driver' AND revoked_at IS NULL
              AND (" . implode(' OR ', $where) . ')
            ORDER BY id DESC
            LIMIT 8';
    $tokenRes = $conn->query($sql);
    $fallback = null;
    if ($tokenRes) {
        while ($tokenRow = $tokenRes->fetch_assoc()) {
            $plain = trim((string) ($tokenRow['token_plain'] ?? ''));
            if ($plain !== '') {
                return $plain;
            }
            if ($fallback === null) {
                $fallback = $tokenRow;
            }
        }
    }
    $eventId = $fallback ? (int) ($fallback['event_id'] ?? 0) : 0;
    $assignmentId = $fallback ? (int) ($fallback['assignment_id'] ?? 0) : 0;
    $driverId = $fallback ? (int) ($fallback['driver_id'] ?? 0) : $primary;
    if ($assignmentId < 1 && $assignmentIds) {
        $assignmentId = (int) reset($assignmentIds);
    }
    if (($eventId < 1 || $driverId < 1) && $assignmentId > 0) {
        $asgStmt = $conn->prepare('SELECT event_id, driver_id FROM vth_event_assignments WHERE id = ?');
        if ($asgStmt) {
            $asgStmt->bind_param('i', $assignmentId);
            $asgStmt->execute();
            $asgRow = $asgStmt->get_result()->fetch_assoc();
            $asgStmt->close();
            if ($eventId < 1) {
                $eventId = (int) ($asgRow['event_id'] ?? 0);
            }
            if ($driverId < 1) {
                $driverId = (int) ($asgRow['driver_id'] ?? 0);
            }
        }
    }
    if ($eventId < 1 || $assignmentId < 1) {
        return null;
    }
    $issuedDriver = $driverId > 0 ? $driverId : null;
    return vth_event_issue_token(
        $conn,
        'driver',
        $eventId,
        $assignmentId,
        $issuedDriver,
        date('Y-m-d H:i:s', time() + 45 * 86400)
    );
}

function vth_event_require_admin(): array
{
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (!$authHeader || stripos($authHeader, 'Bearer ') !== 0) {
        vth_event_error('Unauthorized', 401);
    }
    $token = trim(substr($authHeader, 7));
    $payload = verifyJwtToken($token);
    if (!$payload || !isset($payload['role']) || !in_array($payload['role'], ['admin', 'super_admin'], true)) {
        vth_event_error('Unauthorized', 401);
    }
    return $payload;
}

function vth_event_rate_limit(string $bucket, int $max, int $window): void
{
    $id = $bucket . '_' . vth_event_ip();
    if (!checkRateLimit($id, $max, $window)) {
        vth_event_error('Too many requests. Please try again later.', 429);
    }
}

function vth_event_hash_token(string $token): string
{
    return hash('sha256', $token);
}

function vth_event_new_token(): string
{
    return bin2hex(random_bytes(32));
}

function vth_event_pii_key(): string
{
    $env = $_ENV['EVENT_PII_ENCRYPT_KEY'] ?? getenv('EVENT_PII_ENCRYPT_KEY') ?: '';
    if (is_string($env) && $env !== '') {
        return hash('sha256', $env, true);
    }
    $secret = defined('JWT_SECRET') ? (string) JWT_SECRET : 'vth-event-fallback';
    return hash('sha256', $secret . '|vth-event-pii', true);
}

function vth_event_encrypt(?string $plain): ?string
{
    if ($plain === null || $plain === '') {
        return null;
    }
    $iv = random_bytes(16);
    $cipher = openssl_encrypt($plain, 'AES-256-CBC', vth_event_pii_key(), OPENSSL_RAW_DATA, $iv);
    if ($cipher === false) {
        return null;
    }
    return base64_encode($iv . $cipher);
}

function vth_event_decrypt(?string $payload): ?string
{
    if ($payload === null || $payload === '') {
        return null;
    }
    $raw = base64_decode($payload, true);
    if ($raw === false || strlen($raw) < 17) {
        return null;
    }
    $iv = substr($raw, 0, 16);
    $cipher = substr($raw, 16);
    $plain = openssl_decrypt($cipher, 'AES-256-CBC', vth_event_pii_key(), OPENSSL_RAW_DATA, $iv);
    return $plain === false ? null : $plain;
}

function vth_event_mask_aadhaar(?string $aadhaar): ?string
{
    $digits = preg_replace('/\D+/', '', (string) $aadhaar);
    if ($digits === '' || strlen($digits) < 4) {
        return $aadhaar ? 'XXXX XXXX ****' : null;
    }
    return 'XXXX XXXX ' . substr($digits, -4);
}

function vth_event_normalize_reg(?string $reg): string
{
    $reg = strtoupper(preg_replace('/\s+/', '', (string) $reg) ?? '');
    return $reg;
}

function vth_event_validate_mobile(?string $mobile): ?string
{
    $digits = preg_replace('/\D+/', '', (string) $mobile);
    if (strlen($digits) === 12 && str_starts_with($digits, '91')) {
        $digits = substr($digits, 2);
    }
    if (strlen($digits) === 11 && str_starts_with($digits, '0')) {
        $digits = substr($digits, 1);
    }
    if (!preg_match('/^[6-9]\d{9}$/', $digits)) {
        return null;
    }
    return $digits;
}

function vth_event_validate_aadhaar(?string $aadhaar): ?string
{
    $digits = preg_replace('/\D+/', '', (string) $aadhaar);
    if (strlen($digits) !== 12) {
        return null;
    }
    return $digits;
}

function vth_event_validate_dl(?string $dl): ?string
{
    $dl = strtoupper(preg_replace('/\s+/', '', (string) $dl) ?? '');
    if ($dl === '' || strlen($dl) < 8 || strlen($dl) > 20) {
        return null;
    }
    if (!preg_match('/^[A-Z0-9\-\/]+$/', $dl)) {
        return null;
    }
    return $dl;
}

function vth_event_vehicle_type_label(string $type): string
{
    $map = [
        'sedan' => 'Sedan',
        'innova' => 'Innova',
        'innova_crysta' => 'Innova Crysta',
        'ertiga' => 'Ertiga',
        'fortuner' => 'Fortuner',
        'mini_bus' => 'Mini Bus',
        'tempo_traveller' => 'Tempo Traveller',
        'urbania' => 'Urbania',
        'other' => 'Other',
    ];
    return $map[$type] ?? $type;
}

function vth_event_audit(
    mysqli $conn,
    string $actorType,
    $actorId,
    string $action,
    string $entityType,
    $entityId,
    $eventId = null,
    $old = null,
    $new = null
): void {
    $stmt = $conn->prepare(
        'INSERT INTO vth_event_audit_logs
        (actor_type, actor_id, action, entity_type, entity_id, event_id, old_value, new_value, ip)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $actor = $actorId === null ? null : (string) $actorId;
    $entity = $entityId === null ? null : (string) $entityId;
    $event = $eventId === null ? null : (int) $eventId;
    $oldJson = $old === null ? null : json_encode($old);
    $newJson = $new === null ? null : json_encode($new);
    $ip = vth_event_ip();
    $stmt->bind_param(
        'sssssisss',
        $actorType,
        $actor,
        $action,
        $entityType,
        $entity,
        $event,
        $oldJson,
        $newJson,
        $ip
    );
    $stmt->execute();
    $stmt->close();
}

function vth_event_private_root(): string
{
    $uploads = defined('UPLOADS_PATH') ? UPLOADS_PATH : (dirname(__DIR__, 2) . '/uploads');
    $root = rtrim($uploads, '/\\') . DIRECTORY_SEPARATOR . 'vth-event-private';
    if (!is_dir($root)) {
        @mkdir($root, 0700, true);
    }
    $ht = $root . DIRECTORY_SEPARATOR . '.htaccess';
    if (!is_file($ht)) {
        @file_put_contents($ht, "Require all denied\nDeny from all\nOptions -Indexes\n");
    }
    return $root;
}

function vth_event_save_upload(array $file, string $kind = 'doc'): array
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        return ['error' => 'File upload failed'];
    }
    $max = 8 * 1024 * 1024;
    if (($file['size'] ?? 0) > $max) {
        return ['error' => 'File too large (max 8 MB)'];
    }
    $ext = strtolower(pathinfo((string) ($file['name'] ?? ''), PATHINFO_EXTENSION));
    $allowed = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
    if (!in_array($ext, $allowed, true)) {
        return ['error' => 'Invalid file type'];
    }
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($file['tmp_name']) ?: '';
    $okMime = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!in_array($mime, $okMime, true)) {
        return ['error' => 'Invalid file contents'];
    }
    $safe = preg_replace('/[^a-z0-9]+/i', '-', strtolower((string) pathinfo((string) $file['name'], PATHINFO_FILENAME)));
    $safe = trim((string) $safe, '-');
    if ($safe === '') {
        $safe = $kind;
    }
    $name = $kind . '_' . date('YmdHis') . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
    $rel = date('Y/m') . '/' . $name;
    $dir = vth_event_private_root() . DIRECTORY_SEPARATOR . date('Y') . DIRECTORY_SEPARATOR . date('m');
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) {
        return ['error' => 'Could not create secure upload folder'];
    }
    $dest = $dir . DIRECTORY_SEPARATOR . $name;
    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        return ['error' => 'Could not store file'];
    }
    @chmod($dest, 0600);
    $objectName = 'vth-event-private/' . $rel;
    if (function_exists('gcloudEnv') && function_exists('uploadToGcs') && gcloudEnv('GCS_BUCKET')) {
        $gcs = uploadToGcs($dest, $objectName, $mime);
        if (!$gcs) {
            @unlink($dest);
            return ['error' => 'Could not store file in Google Cloud Storage'];
        }
    }
    return [
        'storage_key' => $objectName,
        'mime' => $mime,
        'size' => (int) $file['size'],
        'original_name' => substr((string) ($file['name'] ?? $name), 0, 180),
    ];
}

function vth_event_allowed_bytes(string $bytes): bool
{
    if (strlen($bytes) < 5) {
        return false;
    }
    if (str_starts_with($bytes, '%PDF')) {
        return true;
    }
    if (function_exists('gcsIsValidImageBytes')) {
        return gcsIsValidImageBytes($bytes);
    }
    return true;
}

function vth_event_fetch_gcs(string $objectName, ?string &$contentType = null): ?string
{
    if (!function_exists('getGcpAccessToken') || !function_exists('gcloudEnv')) {
        return null;
    }
    $bucket = gcloudEnv('GCS_BUCKET');
    if (!$bucket) {
        return null;
    }
    $token = getGcpAccessToken();
    if (!$token) {
        return null;
    }
    $encoded = function_exists('gcsObjectApiSegment') ? gcsObjectApiSegment($objectName) : rawurlencode($objectName);
    $mediaUrl = "https://storage.googleapis.com/download/storage/v1/b/$bucket/o/$encoded?alt=media";
    $ch = curl_init($mediaUrl);
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 120,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_ENCODING => '',
    ]);
    $data = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code !== 200 || $data === false || $data === '' || !vth_event_allowed_bytes($data)) {
        return null;
    }
    if (!$contentType || $contentType === 'application/octet-stream') {
        $contentType = function_exists('gcsGuessContentType') ? gcsGuessContentType($objectName) : $contentType;
    }
    return $data;
}

function vth_event_read_file(string $key, ?string &$mime = null): ?string
{
    $local = vth_event_resolve_storage($key);
    if ($local) {
        if (!$mime && function_exists('mime_content_type')) {
            $detected = mime_content_type($local);
            if (is_string($detected) && $detected !== '') {
                $mime = $detected;
            }
        }
        $bytes = file_get_contents($local);
        return $bytes === false ? null : $bytes;
    }
    return vth_event_fetch_gcs($key, $mime);
}

function vth_event_attach_posted_file(
    mysqli $conn,
    ?int $eventId,
    string $ownerType,
    int $ownerId,
    string $docType,
    string $fileKey,
    string $uploadedBy,
    bool $required = false
): ?int {
    $missing = empty($_FILES[$fileKey]) || (($_FILES[$fileKey]['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE);
    if ($missing) {
        if ($required) {
            vth_event_error(strtoupper(str_replace('_', ' ', $docType)) . ' document is required');
        }
        return null;
    }
    $saved = vth_event_save_upload($_FILES[$fileKey], $docType);
    if (!empty($saved['error'])) {
        vth_event_error($saved['error']);
    }
    return vth_event_insert_document($conn, $eventId, $ownerType, $ownerId, $docType, $saved, $uploadedBy);
}

function vth_event_resolve_storage(string $key): ?string
{
    if (!preg_match('#^vth-event-private/[a-zA-Z0-9._/-]+$#', $key)) {
        return null;
    }
    if (str_contains($key, '..')) {
        return null;
    }
    $path = vth_event_private_root() . DIRECTORY_SEPARATOR . str_replace(['vth-event-private/', '/'], ['', DIRECTORY_SEPARATOR], $key);
    return is_file($path) ? $path : null;
}

function vth_event_insert_document(
    mysqli $conn,
    ?int $eventId,
    string $ownerType,
    int $ownerId,
    string $docType,
    array $saved,
    string $uploadedBy
): int {
    $stmt = $conn->prepare(
        'INSERT INTO vth_event_documents
        (event_id, owner_type, owner_id, doc_type, storage_key, original_name, mime, size_bytes, status, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, \'pending\', ?)'
    );
    $key = $saved['storage_key'];
    $orig = $saved['original_name'] ?? null;
    $mime = $saved['mime'] ?? null;
    $size = (int) ($saved['size'] ?? 0);
    $stmt->bind_param('isissssis', $eventId, $ownerType, $ownerId, $docType, $key, $orig, $mime, $size, $uploadedBy);
    $stmt->execute();
    $id = (int) $conn->insert_id;
    $stmt->close();
    return $id;
}

function vth_event_get(mysqli $conn, int $id): ?array
{
    $stmt = $conn->prepare('SELECT * FROM vth_events WHERE id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $row ?: null;
}

function vth_event_next_slip_no(mysqli $conn, string $eventCode, string $dutyDate): string
{
    $day = date('d', strtotime($dutyDate));
    $prefix = $eventCode . '-' . $day . '-';
    $like = $prefix . '%';
    $stmt = $conn->prepare('SELECT duty_slip_no FROM vth_event_duties WHERE duty_slip_no LIKE ? ORDER BY duty_slip_no DESC LIMIT 1');
    $stmt->bind_param('s', $like);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    $next = 1;
    if ($row && preg_match('/-(\d+)$/', $row['duty_slip_no'], $m)) {
        $next = ((int) $m[1]) + 1;
    }
    return $prefix . str_pad((string) $next, 2, '0', STR_PAD_LEFT);
}

function vth_event_verification_code(): string
{
    return strtoupper(bin2hex(random_bytes(4)));
}

function vth_event_clock_hm(?string $value): ?string
{
    $value = trim((string) $value);
    if (!preg_match('/^(\d{1,2}):(\d{2})/', $value, $match)) {
        return null;
    }
    $hours = (int) $match[1];
    $minutes = (int) $match[2];
    if ($hours < 0 || $hours > 23 || $minutes < 0 || $minutes > 59) {
        return null;
    }
    return sprintf('%02d:%02d', $hours, $minutes);
}

function vth_event_schedule_map(array $schedules): array
{
    $map = [];
    foreach ($schedules as $item) {
        if (!is_array($item)) {
            continue;
        }
        $date = substr((string) ($item['date'] ?? ''), 0, 10);
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            continue;
        }
        $time = vth_event_clock_hm((string) ($item['reportingTime'] ?? ''));
        if ($time === null) {
            continue;
        }
        $locIn = trim((string) ($item['reportingLocation'] ?? ''));
        $dutyId = (int) ($item['dutyId'] ?? 0);
        $map[$date] = [
            'time' => $time,
            'location' => $locIn !== '' ? $locIn : null,
            'dutyId' => $dutyId > 0 ? $dutyId : 0,
        ];
    }
    return $map;
}

function vth_event_set_duty_schedule(mysqli $conn, int $assignmentId, string $date, string $time, ?string $location, int $dutyId = 0): void
{
    if ($dutyId > 0) {
        if ($location === null) {
            $stmt = $conn->prepare(
                "UPDATE vth_event_duties
                 SET reporting_time = ?, reporting_location = NULL
                 WHERE id = ? AND assignment_id = ? AND status <> 'cancelled'"
            );
            $stmt->bind_param('sii', $time, $dutyId, $assignmentId);
        } else {
            $stmt = $conn->prepare(
                "UPDATE vth_event_duties
                 SET reporting_time = ?, reporting_location = ?
                 WHERE id = ? AND assignment_id = ? AND status <> 'cancelled'"
            );
            $stmt->bind_param('ssii', $time, $location, $dutyId, $assignmentId);
        }
        $stmt->execute();
        $stmt->close();
    }
    if ($location === null) {
        $stmt = $conn->prepare(
            "UPDATE vth_event_duties
             SET reporting_time = ?, reporting_location = NULL
             WHERE assignment_id = ? AND DATE(duty_date) = ? AND status <> 'cancelled'"
        );
        $stmt->bind_param('sis', $time, $assignmentId, $date);
    } else {
        $stmt = $conn->prepare(
            "UPDATE vth_event_duties
             SET reporting_time = ?, reporting_location = ?
             WHERE assignment_id = ? AND DATE(duty_date) = ? AND status <> 'cancelled'"
        );
        $stmt->bind_param('ssis', $time, $location, $assignmentId, $date);
    }
    $stmt->execute();
    $stmt->close();
}

function vth_event_create_duties_for_dates(mysqli $conn, array $assignment, array $dates, array $schedules = []): array
{
    $event = vth_event_get($conn, (int) $assignment['event_id']);
    if (!$event) {
        return ['created' => 0, 'skipped' => 0, 'errors' => ['Event not found']];
    }
    $created = 0;
    $skipped = 0;
    $errors = [];
    $scheduleMap = vth_event_schedule_map($schedules);
    $eventVehicleId = isset($assignment['event_vehicle_id']) && $assignment['event_vehicle_id'] !== null
        ? (int) $assignment['event_vehicle_id'] : null;
    $fleetVehicleId = isset($assignment['fleet_vehicle_id']) && $assignment['fleet_vehicle_id'] !== null
        ? (int) $assignment['fleet_vehicle_id'] : null;
    $driverId = $assignment['driver_id'] !== null ? (int) $assignment['driver_id'] : null;
    $snap = vth_event_snapshots($conn, $eventVehicleId, $driverId, $fleetVehicleId);
    $asgId = (int) $assignment['id'];
    foreach ($dates as $date) {
        $date = substr((string) $date, 0, 10);
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $errors[] = "Invalid date: $date";
            continue;
        }
        if (isset($scheduleMap[$date])) {
            $own = $conn->prepare(
                'SELECT id FROM vth_event_duties
                 WHERE assignment_id = ? AND duty_date = ? AND status <> \'cancelled\' LIMIT 1'
            );
            $own->bind_param('is', $asgId, $date);
            $own->execute();
            $mine = $own->get_result()->fetch_assoc();
            $own->close();
            if ($mine) {
                vth_event_set_duty_schedule(
                    $conn,
                    $asgId,
                    $date,
                    $scheduleMap[$date]['time'],
                    $scheduleMap[$date]['location'],
                    (int) ($scheduleMap[$date]['dutyId'] ?? 0)
                );
                $skipped++;
                continue;
            }
        }
        if ($eventVehicleId) {
            $chk = $conn->prepare(
                'SELECT id, assignment_id, status, opening_at FROM vth_event_duties
                 WHERE event_id = ? AND event_vehicle_id = ? AND duty_date = ? AND status <> \'cancelled\' LIMIT 1'
            );
            $chk->bind_param('iis', $assignment['event_id'], $eventVehicleId, $date);
            $chk->execute();
            $existingVehicleDuty = $chk->get_result()->fetch_assoc();
            $chk->close();
            if ($existingVehicleDuty) {
                $existingVehicleId = (int) $existingVehicleDuty['id'];
                $ownsDuty = (int) $existingVehicleDuty['assignment_id'] === $asgId;
                if (empty($existingVehicleDuty['opening_at']) && !$ownsDuty) {
                    $clash = $conn->prepare(
                        'SELECT id FROM vth_event_duties WHERE assignment_id = ? AND duty_date = ? AND id <> ? LIMIT 1'
                    );
                    $clash->bind_param('isi', $asgId, $date, $existingVehicleId);
                    $clash->execute();
                    $blocked = (bool) $clash->get_result()->fetch_assoc();
                    $clash->close();
                    if (!$blocked) {
                        $move = $conn->prepare('UPDATE vth_event_duties SET assignment_id = ? WHERE id = ? AND opening_at IS NULL');
                        $move->bind_param('ii', $asgId, $existingVehicleId);
                        $move->execute();
                        $move->close();
                        $ownsDuty = true;
                    }
                }
                if ($ownsDuty && isset($scheduleMap[$date])) {
                    vth_event_set_duty_schedule(
                        $conn,
                        $asgId,
                        $date,
                        $scheduleMap[$date]['time'],
                        $scheduleMap[$date]['location'],
                        $existingVehicleId
                    );
                }
                $skipped++;
                continue;
            }
        } elseif ($fleetVehicleId) {
            $chk = $conn->prepare(
                'SELECT id FROM vth_event_duties
                 WHERE event_id = ? AND fleet_vehicle_id = ? AND duty_date = ? AND status <> \'cancelled\' LIMIT 1'
            );
            $chk->bind_param('iis', $assignment['event_id'], $fleetVehicleId, $date);
            $chk->execute();
            if ($chk->get_result()->fetch_assoc()) {
                $chk->close();
                $skipped++;
                $errors[] = 'Duty already exists for this vehicle on this date.';
                continue;
            }
            $chk->close();
        }
        $exists = $conn->prepare(
            'SELECT id, status, opening_at FROM vth_event_duties WHERE assignment_id = ? AND duty_date = ? LIMIT 1'
        );
        $exists->bind_param('is', $asgId, $date);
        $exists->execute();
        $existingDuty = $exists->get_result()->fetch_assoc();
        $exists->close();
        if ($existingDuty) {
            $existingId = (int) $existingDuty['id'];
            $canRevive = ($existingDuty['status'] ?? '') === 'cancelled' && empty($existingDuty['opening_at']);
            if ($canRevive) {
                $revive = $conn->prepare(
                    "UPDATE vth_event_duties SET status = 'not_started'
                     WHERE id = ? AND status = 'cancelled' AND opening_at IS NULL"
                );
                $revive->bind_param('i', $existingId);
                $revive->execute();
                $revive->close();
                if (isset($scheduleMap[$date])) {
                    vth_event_set_duty_schedule(
                        $conn,
                        $asgId,
                        $date,
                        $scheduleMap[$date]['time'],
                        $scheduleMap[$date]['location'],
                        $existingId
                    );
                }
            }
            $skipped++;
            continue;
        }

        $slip = vth_event_next_slip_no($conn, $event['event_code'], $date);
        $code = vth_event_verification_code();
        $time = $assignment['reporting_time'] ?: $event['default_reporting_time'];
        $loc = $assignment['reporting_location'] ?: $event['reporting_location'];
        if (isset($scheduleMap[$date])) {
            $time = $scheduleMap[$date]['time'];
            if ($scheduleMap[$date]['location'] !== null) {
                $loc = $scheduleMap[$date]['location'];
            }
        }
        $vtype = $assignment['vehicle_type'];
        $eventId = (int) $assignment['event_id'];
        $stmt = $conn->prepare(
            'INSERT INTO vth_event_duties
            (duty_slip_no, event_id, assignment_id, event_vehicle_id, fleet_vehicle_id, driver_id, vehicle_type,
             vehicle_reg_snapshot, driver_name_snapshot, driver_mobile_snapshot,
             duty_date, reporting_time, reporting_location, status, verification_code)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, \'not_started\', ?)'
        );
        $stmt->bind_param(
            'siiiiissssssss',
            $slip,
            $eventId,
            $asgId,
            $eventVehicleId,
            $fleetVehicleId,
            $driverId,
            $vtype,
            $snap['vehicle_reg_snapshot'],
            $snap['driver_name_snapshot'],
            $snap['driver_mobile_snapshot'],
            $date,
            $time,
            $loc,
            $code
        );
        try {
            $stmt->execute();
            $created++;
        } catch (Throwable $e) {
            $skipped++;
            $errors[] = 'Duty already exists for this vehicle on this date.';
        }
        $stmt->close();
    }
    return ['created' => $created, 'skipped' => $skipped, 'errors' => $errors];
}

function vth_event_snapshots(mysqli $conn, ?int $eventVehicleId, ?int $driverId, ?int $fleetVehicleId = null): array
{
    $out = [
        'vehicle_reg_snapshot' => null,
        'driver_name_snapshot' => null,
        'driver_mobile_snapshot' => null,
    ];
    if ($eventVehicleId) {
        $stmt = $conn->prepare('SELECT registration_number FROM vth_event_vehicles WHERE id = ?');
        $stmt->bind_param('i', $eventVehicleId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        $out['vehicle_reg_snapshot'] = $row['registration_number'] ?? null;
    } elseif ($fleetVehicleId) {
        $stmt = $conn->prepare('SELECT vehicle_number FROM fleet_vehicles WHERE id = ?');
        $stmt->bind_param('i', $fleetVehicleId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        $out['vehicle_reg_snapshot'] = $row['vehicle_number'] ?? null;
    }
    if ($driverId) {
        $stmt = $conn->prepare('SELECT name, phone FROM drivers WHERE id = ?');
        $stmt->bind_param('i', $driverId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        $out['driver_name_snapshot'] = $row['name'] ?? null;
        $out['driver_mobile_snapshot'] = $row['phone'] ?? null;
    }
    return $out;
}

function vth_event_sync_assignment_dates(mysqli $conn, int $assignmentId, array $dates): void
{
    $keep = [];
    foreach ($dates as $d) {
        $d = substr((string) $d, 0, 10);
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $d)) {
            continue;
        }
        $keep[] = $d;
        $stmt = $conn->prepare('INSERT IGNORE INTO vth_event_assignment_dates (assignment_id, duty_date) VALUES (?, ?)');
        $stmt->bind_param('is', $assignmentId, $d);
        $stmt->execute();
        $stmt->close();
    }
    $locked = $conn->prepare(
        "SELECT duty_date FROM vth_event_duties
         WHERE assignment_id = ? AND status NOT IN ('not_started','scheduled','cancelled')"
    );
    $locked->bind_param('i', $assignmentId);
    $locked->execute();
    $lockRes = $locked->get_result();
    while ($row = $lockRes->fetch_assoc()) {
        $lockedDay = substr((string) ($row['duty_date'] ?? ''), 0, 10);
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $lockedDay)) {
            $keep[] = $lockedDay;
        }
    }
    $locked->close();
    $keep = array_values(array_unique($keep));
    if ($keep) {
        $in = implode(',', array_fill(0, count($keep), '?'));
        $types = 'i' . str_repeat('s', count($keep));
        $params = array_merge([$assignmentId], $keep);
        $sql = "DELETE FROM vth_event_assignment_dates WHERE assignment_id = ? AND DATE(duty_date) NOT IN ($in)";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $stmt->close();
        $cancelSql = "UPDATE vth_event_duties SET status = 'cancelled'
                      WHERE assignment_id = ? AND status IN ('not_started','scheduled') AND DATE(duty_date) NOT IN ($in)";
        $cancel = $conn->prepare($cancelSql);
        $cancel->bind_param($types, ...$params);
        $cancel->execute();
        $cancel->close();
        return;
    }
    $wipe = $conn->prepare('DELETE FROM vth_event_assignment_dates WHERE assignment_id = ?');
    $wipe->bind_param('i', $assignmentId);
    $wipe->execute();
    $wipe->close();
    $cancelAll = $conn->prepare(
        "UPDATE vth_event_duties SET status = 'cancelled'
         WHERE assignment_id = ? AND status IN ('not_started','scheduled')"
    );
    $cancelAll->bind_param('i', $assignmentId);
    $cancelAll->execute();
    $cancelAll->close();
}

function vth_event_lookup_token(mysqli $conn, string $raw, ?string $type = null): ?array
{
    $hash = vth_event_hash_token($raw);
    if ($type) {
        $stmt = $conn->prepare(
            'SELECT * FROM vth_event_tokens WHERE token_hash = ? AND token_type = ? LIMIT 1'
        );
        $stmt->bind_param('ss', $hash, $type);
    } else {
        $stmt = $conn->prepare('SELECT * FROM vth_event_tokens WHERE token_hash = ? LIMIT 1');
        $stmt->bind_param('s', $hash);
    }
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row) {
        return null;
    }
    if (!empty($row['revoked_at'])) {
        return null;
    }
    if (!empty($row['expires_at']) && strtotime($row['expires_at']) < time()) {
        return null;
    }
    $id = (int) $row['id'];
    $upd = $conn->prepare('UPDATE vth_event_tokens SET last_used_at = NOW() WHERE id = ?');
    $upd->bind_param('i', $id);
    $upd->execute();
    $upd->close();
    return $row;
}

function vth_event_issue_token(mysqli $conn, string $type, int $eventId, ?int $assignmentId, ?int $driverId, ?string $expiresAt = null): string
{
    vth_event_ensure_token_plain($conn);
    $raw = vth_event_new_token();
    $hash = vth_event_hash_token($raw);
    $stmt = $conn->prepare(
        'INSERT INTO vth_event_tokens (token_hash, token_type, event_id, assignment_id, driver_id, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->bind_param('ssiiis', $hash, $type, $eventId, $assignmentId, $driverId, $expiresAt);
    $stmt->execute();
    $id = (int) $conn->insert_id;
    $stmt->close();
    if (($type === 'event_share' || $type === 'driver') && $id > 0) {
        try {
            $plain = $conn->prepare('UPDATE vth_event_tokens SET token_plain = ? WHERE id = ?');
            if ($plain) {
                $plain->bind_param('si', $raw, $id);
                $plain->execute();
                $plain->close();
            }
        } catch (Throwable $e) {
            // column is added on the next request
        }
    }
    return $raw;
}

function vth_event_date_span(string $start, string $end): array
{
    $out = [];
    $cursor = strtotime($start . ' 00:00:00');
    $last = strtotime($end . ' 00:00:00');
    if ($cursor === false || $last === false || $cursor > $last) {
        return $out;
    }
    while ($cursor <= $last) {
        $out[] = date('Y-m-d', $cursor);
        $cursor = strtotime('+1 day', $cursor);
    }
    return $out;
}

function vth_event_public_base(): string
{
    return defined('APP_URL') ? rtrim((string) APP_URL, '/') : 'https://vizagtaxihub.com';
}

function vth_event_format_public(array $event): array
{
    return [
        'id' => (int) $event['id'],
        'eventCode' => $event['event_code'],
        'name' => $event['name'],
        'startDate' => $event['start_date'],
        'endDate' => $event['end_date'],
        'reportingLocation' => $event['reporting_location'],
        'defaultReportingTime' => $event['default_reporting_time'],
        'status' => $event['status'],
        'gpsRequired' => (bool) $event['gps_required'],
        'showSerialNo' => !empty($event['show_serial_no']),
        'supportMobile' => !empty($event['support_mobile']) ? (string) $event['support_mobile'] : '9966363662',
        'updatedAt' => $event['updated_at'] ?? null,
    ];
}

function vth_event_has_registration_sql(string $column): string
{
    return "TRIM(COALESCE($column, '')) <> ''"
        . " AND LOWER(TRIM($column)) <> 'not assigned'"
        . " AND TRIM($column) <> '-'";
}

function vth_event_share_row_assigned(?string $vehicleNumber, ?string $driverName): bool
{
    $vehicle = trim((string) $vehicleNumber);
    $driver = trim((string) $driverName);
    if ($vehicle === '' || strcasecmp($vehicle, 'Not assigned') === 0 || $vehicle === '-') {
        return false;
    }
    if ($driver === '' || strcasecmp($driver, 'Not assigned') === 0 || $driver === '-') {
        return false;
    }
    return true;
}

function vth_event_counts_to_stats(array $counts, string $date): array
{
    $total = array_sum($counts);
    $completed = $counts['completed'] ?? 0;
    $inProgress = $counts['in_progress'] ?? 0;
    $started = $completed + $inProgress + ($counts['missing_closing'] ?? 0);
    $pending = ($counts['not_started'] ?? 0) + ($counts['scheduled'] ?? 0);
    return [
        'date' => $date,
        'totalVehicles' => $total,
        'started' => $started,
        'inProgress' => $inProgress,
        'completed' => $completed,
        'pending' => $pending,
        'missingOpening' => $counts['missing_opening'] ?? 0,
        'missingClosing' => $counts['missing_closing'] ?? 0,
        'exception' => $counts['exception'] ?? 0,
        'byStatus' => $counts,
    ];
}

function vth_event_share_stats(array $vehicles, string $date): array
{
    $counts = [];
    foreach ($vehicles as $vehicle) {
        $status = (string) ($vehicle['status'] ?? 'not_started');
        $counts[$status] = ($counts[$status] ?? 0) + 1;
    }
    return vth_event_counts_to_stats($counts, $date);
}

function vth_event_daily_stats(mysqli $conn, int $eventId, string $date): array
{
    $stmt = $conn->prepare(
        'SELECT status, COUNT(*) AS c FROM vth_event_duties
         WHERE event_id = ? AND duty_date = ? AND status <> \'cancelled\'
           AND ' . vth_event_has_registration_sql('vehicle_reg_snapshot') . '
         GROUP BY status'
    );
    $stmt->bind_param('is', $eventId, $date);
    $stmt->execute();
    $res = $stmt->get_result();
    $counts = [];
    while ($row = $res->fetch_assoc()) {
        $counts[$row['status']] = (int) $row['c'];
    }
    $stmt->close();
    return vth_event_counts_to_stats($counts, $date);
}

function vth_event_schema_marker(): string
{
    return rtrim(sys_get_temp_dir(), '/\\') . DIRECTORY_SEPARATOR . 'vth_event_schema_v19.ok';
}

function vth_event_schema_ready(mysqli $conn): bool
{
    $duty = @$conn->query("SHOW COLUMNS FROM `vth_event_duties` LIKE 'duty_place'");
    $prompt = @$conn->query("SHOW COLUMNS FROM `vth_event_duties` LIKE 'parking_prompt_nonce'");
    $gpsClient = @$conn->query("SHOW COLUMNS FROM `vth_event_duties` LIKE 'last_gps_client'");
    $token = @$conn->query("SHOW COLUMNS FROM `vth_event_tokens` LIKE 'token_plain'");
    $push = @$conn->query("SHOW TABLES LIKE 'vth_event_driver_push'");
    $placeSince = @$conn->query("SHOW COLUMNS FROM `vth_event_duties` LIKE 'place_since'");
    $spans = @$conn->query("SHOW TABLES LIKE 'vth_event_duty_spans'");
    $expo = @$conn->query("SHOW TABLES LIKE 'vth_event_driver_expo'");
    $paused = @$conn->query("SHOW COLUMNS FROM `vth_event_duties` LIKE 'paused_seconds'");
    $tollParking = @$conn->query("SHOW COLUMNS FROM `vth_event_duties` LIKE 'toll_parking'");
    $showSerial = @$conn->query("SHOW COLUMNS FROM `vth_events` LIKE 'show_serial_no'");
    $billingHours = @$conn->query("SHOW COLUMNS FROM `vth_events` LIKE 'billing_included_hours'");
    $billingKm = @$conn->query("SHOW COLUMNS FROM `vth_events` LIKE 'billing_included_km'");
    $vendorRate = @$conn->query("SHOW COLUMNS FROM `vth_event_vehicles` LIKE 'vendor_package_price'");
    $vthRate = @$conn->query("SHOW COLUMNS FROM `vth_event_vehicles` LIKE 'vth_extra_km'");
    return $duty instanceof mysqli_result && $duty->num_rows > 0
        && $prompt instanceof mysqli_result && $prompt->num_rows > 0
        && $gpsClient instanceof mysqli_result && $gpsClient->num_rows > 0
        && $token instanceof mysqli_result && $token->num_rows > 0
        && $push instanceof mysqli_result && $push->num_rows > 0
        && $placeSince instanceof mysqli_result && $placeSince->num_rows > 0
        && $spans instanceof mysqli_result && $spans->num_rows > 0
        && $expo instanceof mysqli_result && $expo->num_rows > 0
        && $paused instanceof mysqli_result && $paused->num_rows > 0
        && $tollParking instanceof mysqli_result && $tollParking->num_rows > 0
        && $showSerial instanceof mysqli_result && $showSerial->num_rows > 0
        && $billingHours instanceof mysqli_result && $billingHours->num_rows > 0
        && $billingKm instanceof mysqli_result && $billingKm->num_rows > 0
        && $vendorRate instanceof mysqli_result && $vendorRate->num_rows > 0
        && $vthRate instanceof mysqli_result && $vthRate->num_rows > 0;
}

function vth_event_ensure_optional_columns(mysqli $conn): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;
    $marker = vth_event_schema_marker();
    if (@is_file($marker)) {
        return;
    }
    if (vth_event_schema_ready($conn)) {
        @file_put_contents($marker, '1');
        return;
    }
    try {
        $conn->query(
            "CREATE TABLE IF NOT EXISTS `vth_event_vehicles` (
              `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
              `event_id` INT UNSIGNED NOT NULL,
              `registration_number` VARCHAR(50) NOT NULL,
              `vehicle_type` VARCHAR(40) NOT NULL DEFAULT 'other',
              `make` VARCHAR(100) NULL,
              `model` VARCHAR(100) NULL,
              `seating_capacity` INT UNSIGNED NULL,
              `owner_name` VARCHAR(120) NULL,
              `owner_mobile` VARCHAR(20) NULL,
              `notes` TEXT NULL,
              `status` ENUM('active','inactive') NOT NULL DEFAULT 'active',
              `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              PRIMARY KEY (`id`),
              UNIQUE KEY `uq_vth_event_vehicle_reg` (`event_id`, `registration_number`),
              KEY `idx_vth_event_vehicle_event` (`event_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    } catch (Throwable $e) {
        // table already exists
    }
    try {
        $conn->query(
            "CREATE TABLE IF NOT EXISTS `vth_event_duty_spans` (
              `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
              `duty_id` INT UNSIGNED NOT NULL,
              `place` VARCHAR(12) NOT NULL,
              `started_at` DATETIME NOT NULL,
              `ended_at` DATETIME NULL,
              PRIMARY KEY (`id`),
              KEY `idx_vth_duty_span` (`duty_id`, `started_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    } catch (Throwable $e) {
        // table already exists
    }
    try {
        $conn->query(
            "CREATE TABLE IF NOT EXISTS `vth_event_track_points` (
              `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
              `event_id` INT UNSIGNED NOT NULL,
              `duty_id` INT UNSIGNED NOT NULL,
              `lat` DECIMAL(10,7) NOT NULL,
              `lng` DECIMAL(10,7) NOT NULL,
              `accuracy` DECIMAL(8,2) NULL,
              `speed` DECIMAL(8,2) NULL,
              `heading` DECIMAL(6,2) NULL,
              `recorded_at` DATETIME NOT NULL,
              `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (`id`),
              KEY `idx_vth_track_duty_time` (`duty_id`, `recorded_at`),
              KEY `idx_vth_track_event_time` (`event_id`, `recorded_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    } catch (Throwable $e) {
        // table already exists
    }
    try {
        $conn->query(
            "CREATE TABLE IF NOT EXISTS `vth_event_driver_push` (
              `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
              `assignment_id` INT UNSIGNED NOT NULL,
              `endpoint` TEXT NOT NULL,
              `p256dh` VARCHAR(255) NOT NULL,
              `auth_key` VARCHAR(255) NOT NULL,
              `open_path` VARCHAR(180) NOT NULL,
              `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              PRIMARY KEY (`id`),
              UNIQUE KEY `uq_vth_driver_push_endpoint` (`endpoint`(191)),
              KEY `idx_vth_driver_push_asg` (`assignment_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    } catch (Throwable $e) {
        // table already exists
    }
    vth_event_ensure_expo_table($conn);
    $alters = [
        "ALTER TABLE drivers ADD COLUMN alt_mobile VARCHAR(20) NULL",
        "ALTER TABLE drivers ADD COLUMN aadhaar_last4 CHAR(4) NULL",
        "ALTER TABLE drivers ADD COLUMN address VARCHAR(255) NULL",
        "ALTER TABLE fleet_vehicles ADD COLUMN owner_name VARCHAR(120) NULL",
        "ALTER TABLE fleet_vehicles ADD COLUMN owner_mobile VARCHAR(20) NULL",
        "ALTER TABLE vth_event_assignments ADD COLUMN event_vehicle_id INT UNSIGNED NULL",
        "ALTER TABLE vth_event_duties ADD COLUMN event_vehicle_id INT UNSIGNED NULL",
        "ALTER TABLE vth_event_duties ADD COLUMN opening_address VARCHAR(255) NULL",
        "ALTER TABLE vth_event_duties ADD COLUMN closing_address VARCHAR(255) NULL",
        "ALTER TABLE vth_event_duties ADD COLUMN last_lat DECIMAL(10,7) NULL",
        "ALTER TABLE vth_event_duties ADD COLUMN last_lng DECIMAL(10,7) NULL",
        "ALTER TABLE vth_event_duties ADD COLUMN last_gps_accuracy DECIMAL(8,2) NULL",
        "ALTER TABLE vth_event_duties ADD COLUMN last_gps_at DATETIME NULL",
        "ALTER TABLE vth_event_duties ADD COLUMN last_gps_address VARCHAR(255) NULL",
        "ALTER TABLE vth_events ADD COLUMN support_mobile VARCHAR(20) NULL",
        "ALTER TABLE vth_events ADD COLUMN show_serial_no TINYINT(1) NOT NULL DEFAULT 0",
        "ALTER TABLE vth_events ADD COLUMN billing_included_hours DECIMAL(6,2) NOT NULL DEFAULT 10",
        "ALTER TABLE vth_events ADD COLUMN billing_included_km DECIMAL(8,2) NOT NULL DEFAULT 100",
        "ALTER TABLE vth_event_vehicles ADD COLUMN vendor_package_price DECIMAL(10,2) NULL",
        "ALTER TABLE vth_event_vehicles ADD COLUMN vendor_extra_hour DECIMAL(10,2) NULL",
        "ALTER TABLE vth_event_vehicles ADD COLUMN vendor_extra_km DECIMAL(10,2) NULL",
        "ALTER TABLE vth_event_vehicles ADD COLUMN vth_package_price DECIMAL(10,2) NULL",
        "ALTER TABLE vth_event_vehicles ADD COLUMN vth_extra_hour DECIMAL(10,2) NULL",
        "ALTER TABLE vth_event_vehicles ADD COLUMN vth_extra_km DECIMAL(10,2) NULL",
        "ALTER TABLE vth_event_duties ADD COLUMN end_requested_at DATETIME NULL",
        "ALTER TABLE vth_event_duties ADD COLUMN end_request_seen_at DATETIME NULL",
        "ALTER TABLE vth_event_duties ADD COLUMN end_request_nonce VARCHAR(32) NULL",
        "ALTER TABLE vth_event_duties ADD COLUMN end_requested_by VARCHAR(20) NULL",
        "ALTER TABLE vth_event_duties ADD COLUMN duty_place VARCHAR(12) NOT NULL DEFAULT 'trip'",
        "ALTER TABLE vth_event_duties ADD COLUMN parking_prompt_at DATETIME NULL",
        "ALTER TABLE vth_event_duties ADD COLUMN parking_prompt_nonce VARCHAR(32) NULL",
        "ALTER TABLE vth_event_duties ADD COLUMN trip_seconds INT UNSIGNED NOT NULL DEFAULT 0",
        "ALTER TABLE vth_event_duties ADD COLUMN parking_seconds INT UNSIGNED NOT NULL DEFAULT 0",
        "ALTER TABLE vth_event_duties ADD COLUMN place_since DATETIME NULL",
        "ALTER TABLE vth_event_duties ADD COLUMN paused_seconds INT UNSIGNED NOT NULL DEFAULT 0",
        "ALTER TABLE vth_event_duties ADD COLUMN toll_parking DECIMAL(10,2) NOT NULL DEFAULT 0",
        "ALTER TABLE vth_event_duties ADD COLUMN last_gps_client VARCHAR(64) NULL",
        "ALTER TABLE vth_event_tokens ADD COLUMN token_plain VARCHAR(128) NULL",
    ];
    foreach ($alters as $sql) {
        try {
            @$conn->query($sql);
        } catch (Throwable $e) {
            // column already exists
        }
    }
    if (vth_event_schema_ready($conn)) {
        @file_put_contents($marker, '1');
    }
}

function vth_event_upsert_driver_pii(mysqli $conn, int $driverId, ?string $aadhaar, ?string $alt, ?string $address): void
{
    $last4 = null;
    $enc = null;
    if ($aadhaar) {
        $digits = vth_event_validate_aadhaar($aadhaar);
        if ($digits) {
            $last4 = substr($digits, -4);
            $enc = vth_event_encrypt($digits);
            try {
                $conn->query("UPDATE drivers SET aadhaar_last4 = '" . $conn->real_escape_string($last4) . "' WHERE id = " . (int) $driverId);
            } catch (Throwable $e) {
                // optional column
            }
        }
    }
    $stmt = $conn->prepare(
        'INSERT INTO vth_event_driver_pii (driver_id, aadhaar_last4, aadhaar_encrypted, alt_mobile, address)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            aadhaar_last4 = COALESCE(VALUES(aadhaar_last4), aadhaar_last4),
            aadhaar_encrypted = COALESCE(VALUES(aadhaar_encrypted), aadhaar_encrypted),
            alt_mobile = COALESCE(VALUES(alt_mobile), alt_mobile),
            address = COALESCE(VALUES(address), address)'
    );
    $stmt->bind_param('issss', $driverId, $last4, $enc, $alt, $address);
    $stmt->execute();
    $stmt->close();
}

function vth_event_doc_checklist(mysqli $conn, string $ownerType, int $ownerId): array
{
    $stmt = $conn->prepare(
        'SELECT id, doc_type, status, rejection_reason, created_at
         FROM vth_event_documents
         WHERE owner_type = ? AND owner_id = ?
         ORDER BY id DESC'
    );
    $stmt->bind_param('si', $ownerType, $ownerId);
    $stmt->execute();
    $res = $stmt->get_result();
    $latest = [];
    while ($row = $res->fetch_assoc()) {
        if (!isset($latest[$row['doc_type']])) {
            $latest[$row['doc_type']] = [
                'id' => (int) $row['id'],
                'docType' => $row['doc_type'],
                'status' => $row['status'],
                'rejectionReason' => $row['rejection_reason'],
                'createdAt' => $row['created_at'],
                'uploaded' => true,
            ];
        }
    }
    $stmt->close();
    return $latest;
}

function vth_event_id_sql(array $ids): string
{
    $clean = [];
    foreach ($ids as $id) {
        $id = (int) $id;
        if ($id > 0) {
            $clean[$id] = $id;
        }
    }
    return $clean ? implode(',', $clean) : '';
}

function vth_event_doc_checklists(mysqli $conn, string $ownerType, array $ownerIds): array
{
    $out = [];
    foreach ($ownerIds as $id) {
        $id = (int) $id;
        if ($id > 0) {
            $out[$id] = [];
        }
    }
    $in = vth_event_id_sql(array_keys($out));
    if ($in === '' || !in_array($ownerType, ['driver', 'vehicle', 'duty', 'event'], true)) {
        return $out;
    }
    $res = $conn->query(
        "SELECT id, owner_id, doc_type, status, rejection_reason, created_at
         FROM vth_event_documents
         WHERE owner_type = '" . $conn->real_escape_string($ownerType) . "' AND owner_id IN ($in)
         ORDER BY id DESC"
    );
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $oid = (int) $row['owner_id'];
            if (!isset($out[$oid][$row['doc_type']])) {
                $out[$oid][$row['doc_type']] = [
                    'id' => (int) $row['id'],
                    'docType' => $row['doc_type'],
                    'status' => $row['status'],
                    'rejectionReason' => $row['rejection_reason'],
                    'createdAt' => $row['created_at'],
                    'uploaded' => true,
                ];
            }
        }
    }
    return $out;
}

function vth_event_existing_document_ids(mysqli $conn, array $ids): array
{
    $in = vth_event_id_sql($ids);
    if ($in === '') {
        return [];
    }
    $found = [];
    $res = $conn->query("SELECT id FROM vth_event_documents WHERE id IN ($in)");
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $found[(int) $row['id']] = true;
        }
    }
    return $found;
}

/** Current plate on the vehicle record, so a corrected number shows on duties that already started. */
function vth_event_stamp_live_registrations(mysqli $conn, array $rows): array
{
    if (!$rows) {
        return $rows;
    }
    $eventIds = [];
    $fleetIds = [];
    foreach ($rows as $row) {
        $eventId = (int) ($row['event_vehicle_id'] ?? 0);
        $fleetId = (int) ($row['fleet_vehicle_id'] ?? 0);
        if ($eventId > 0) {
            $eventIds[$eventId] = $eventId;
        }
        if ($fleetId > 0) {
            $fleetIds[$fleetId] = $fleetId;
        }
    }
    $eventRegs = [];
    $eventSql = vth_event_id_sql($eventIds);
    if ($eventSql !== '') {
        $res = $conn->query(
            "SELECT id, registration_number FROM vth_event_vehicles
             WHERE id IN ($eventSql) AND status <> 'inactive'"
        );
        if ($res) {
            while ($found = $res->fetch_assoc()) {
                $reg = trim((string) ($found['registration_number'] ?? ''));
                if ($reg !== '') {
                    $eventRegs[(int) $found['id']] = $reg;
                }
            }
        }
    }
    $fleetRegs = [];
    $fleetSql = vth_event_id_sql($fleetIds);
    if ($fleetSql !== '') {
        $res = $conn->query("SELECT id, vehicle_number FROM fleet_vehicles WHERE id IN ($fleetSql)");
        if ($res) {
            while ($found = $res->fetch_assoc()) {
                $reg = trim((string) ($found['vehicle_number'] ?? ''));
                if ($reg !== '') {
                    $fleetRegs[(int) $found['id']] = $reg;
                }
            }
        }
    }
    foreach ($rows as $i => $row) {
        $eventId = (int) ($row['event_vehicle_id'] ?? 0);
        $fleetId = (int) ($row['fleet_vehicle_id'] ?? 0);
        $reg = '';
        if ($eventId > 0 && isset($eventRegs[$eventId])) {
            $reg = $eventRegs[$eventId];
        } elseif ($fleetId > 0 && isset($fleetRegs[$fleetId])) {
            $reg = $fleetRegs[$fleetId];
        }
        if ($reg !== '') {
            $rows[$i]['vehicle_reg_snapshot'] = $reg;
        }
    }
    return $rows;
}

function vth_event_map_duty_rows(mysqli $conn, array $rows): array
{
    $rows = vth_event_stamp_live_registrations($conn, $rows);
    $ids = [];
    foreach ($rows as $row) {
        if (!empty($row['opening_photo_id'])) {
            $ids[] = (int) $row['opening_photo_id'];
        }
        if (!empty($row['closing_photo_id'])) {
            $ids[] = (int) $row['closing_photo_id'];
        }
    }
    $known = vth_event_existing_document_ids($conn, $ids);
    $out = [];
    foreach ($rows as $row) {
        $out[] = vth_admin_duty_row($row, null, $known);
    }
    return $out;
}

function vth_event_face_thumb(string $bytes, string $mime): ?string
{
    if (function_exists('imagecreatefromstring')) {
        $src = @imagecreatefromstring($bytes);
        if ($src) {
            $w = imagesx($src);
            $h = imagesy($src);
            $max = 240;
            $scale = min(1, $max / max($w, $h, 1));
            $nw = max(1, (int) round($w * $scale));
            $nh = max(1, (int) round($h * $scale));
            $dst = imagecreatetruecolor($nw, $nh);
            imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);
            ob_start();
            imagejpeg($dst, null, 82);
            $out = ob_get_clean();
            imagedestroy($src);
            imagedestroy($dst);
            if (is_string($out) && $out !== '') {
                return 'data:image/jpeg;base64,' . base64_encode($out);
            }
        }
    }
    if (strlen($bytes) > 160000) {
        return null;
    }
    return 'data:' . ($mime ?: 'image/jpeg') . ';base64,' . base64_encode($bytes);
}

function vth_event_driver_face(mysqli $conn, int $driverId, array &$cache): array
{
    if (isset($cache[$driverId])) {
        return $cache[$driverId];
    }
    $empty = ['id' => null, 'photo' => null];
    if ($driverId < 1) {
        return $empty;
    }
    $docs = vth_event_doc_checklist($conn, 'driver', $driverId);
    $id = isset($docs['driver_photo']['id']) ? (int) $docs['driver_photo']['id'] : 0;
    $photo = null;
    if ($id > 0) {
        $stmt = $conn->prepare('SELECT * FROM vth_event_documents WHERE id = ?');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $doc = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if ($doc) {
            $mime = $doc['mime'] ?: null;
            $bytes = vth_event_read_file((string) $doc['storage_key'], $mime);
            if (is_string($bytes) && $bytes !== '') {
                $bytes = vth_event_slice_document($bytes);
                $mime = vth_event_sniff_mime($bytes, $mime);
                $photo = vth_event_face_thumb($bytes, $mime);
            }
        }
    }
    $cache[$driverId] = ['id' => $id > 0 ? $id : null, 'photo' => $photo];
    return $cache[$driverId];
}

function vth_event_odometer_is_year(int $value): bool
{
    return $value >= 1900 && $value <= 2099;
}

function vth_event_odometer_is_year_month(int $value): bool
{
    if ($value < 200001 || $value > 209912) {
        return false;
    }
    $month = $value % 100;
    return $month >= 1 && $month <= 12;
}

function vth_event_odometer_is_clock(int $value): bool
{
    $digits = strlen((string) $value);
    if ($digits === 6) {
        $hours = intdiv($value, 10000);
        $minutes = intdiv($value % 10000, 100);
        $seconds = $value % 100;
        return $hours <= 23 && $minutes <= 59 && $seconds <= 59;
    }
    if ($digits === 4) {
        $hours = intdiv($value, 100);
        $minutes = $value % 100;
        return $hours <= 23 && $minutes <= 59;
    }
    return false;
}

function vth_event_pick_odometer(array $values, bool $filterDateNoise = true): ?int
{
    $filtered = [];
    foreach ($values as $value) {
        $n = (int) $value;
        if ($n < 1000 || vth_event_odometer_is_year($n)) {
            continue;
        }
        if ($filterDateNoise && (vth_event_odometer_is_year_month($n) || vth_event_odometer_is_clock($n))) {
            continue;
        }
        $filtered[] = $n;
    }
    if (!$filtered) {
        return null;
    }
    foreach ([6, 5, 7, 4] as $length) {
        foreach ($filtered as $n) {
            if (strlen((string) $n) === $length) {
                return $n;
            }
        }
    }
    return $filtered[0];
}

function vth_event_extract_odometer(?string $text): ?int
{
    if (!$text) {
        return null;
    }
    $normalized = preg_replace('/(\d),(\d)/', '$1$2', $text) ?? $text;
    $labeled = [];
    if (preg_match_all('/(\d{4,7})\s*(?:km|kms|kilomet)/i', $normalized, $m)) {
        foreach ($m[1] as $raw) {
            $labeled[] = (int) $raw;
        }
    }
    $fromLabel = vth_event_pick_odometer($labeled, false);
    if ($fromLabel !== null) {
        return $fromLabel;
    }
    $consecutive = [];
    if (preg_match_all('/\d{4,7}/', $normalized, $m2)) {
        foreach ($m2[0] as $raw) {
            $consecutive[] = (int) $raw;
        }
    }
    if (preg_match_all('/(\d{2,3})\s+(\d{3})(?:\s+(\d{3}))?/', $normalized, $m3, PREG_SET_ORDER)) {
        foreach ($m3 as $row) {
            $consecutive[] = (int) ($row[1] . $row[2] . ($row[3] ?? ''));
        }
    }
    return vth_event_pick_odometer($consecutive);
}

function vth_event_shrink_ocr_tmp(string $tmp): string
{
    if (!function_exists('imagecreatefromstring')) {
        return $tmp;
    }
    $raw = @file_get_contents($tmp);
    if ($raw === false || strlen($raw) < 800000) {
        return $tmp;
    }
    $src = @imagecreatefromstring($raw);
    if (!$src) {
        return $tmp;
    }
    $w = imagesx($src);
    $h = imagesy($src);
    $max = 1600;
    $scale = min(1, $max / max($w, $h));
    if ($scale >= 1) {
        imagedestroy($src);
        return $tmp;
    }
    $nw = (int) round($w * $scale);
    $nh = (int) round($h * $scale);
    $dst = imagecreatetruecolor($nw, $nh);
    imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);
    $out = $tmp . '.ocr.jpg';
    imagejpeg($dst, $out, 82);
    imagedestroy($src);
    imagedestroy($dst);
    return is_file($out) ? $out : $tmp;
}

function vth_event_document_exists(mysqli $conn, $id): bool
{
    $id = (int) $id;
    if ($id < 1) {
        return false;
    }
    $stmt = $conn->prepare('SELECT id FROM vth_event_documents WHERE id = ? LIMIT 1');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $ok = (bool) $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $ok;
}

function vth_event_reset_duty_opening(mysqli $conn, int $dutyId): void
{
    $stmt = $conn->prepare(
        "UPDATE vth_event_duties
         SET opening_km = NULL, opening_photo_id = NULL, opening_at = NULL,
             opening_lat = NULL, opening_lng = NULL, opening_gps_accuracy = NULL, opening_ip = NULL,
             closing_km = NULL, closing_photo_id = NULL, closing_at = NULL,
             closing_lat = NULL, closing_lng = NULL, closing_gps_accuracy = NULL, closing_ip = NULL,
             total_km = NULL, status = 'not_started'
         WHERE id = ?"
    );
    $stmt->bind_param('i', $dutyId);
    $stmt->execute();
    $stmt->close();
}

function vth_event_reset_duty_closing(mysqli $conn, int $dutyId): void
{
    $stmt = $conn->prepare(
        "UPDATE vth_event_duties
         SET closing_km = NULL, closing_photo_id = NULL, closing_at = NULL,
             closing_lat = NULL, closing_lng = NULL, closing_gps_accuracy = NULL, closing_ip = NULL,
             total_km = NULL, status = IF(opening_km IS NULL, 'not_started', 'in_progress')
         WHERE id = ?"
    );
    $stmt->bind_param('i', $dutyId);
    $stmt->execute();
    $stmt->close();
}

function vth_event_maps_api_key(): string
{
    foreach (['GOOGLE_MAPS_API_KEY', 'GOOGLE_GEOCODING_API_KEY', 'VITE_GOOGLE_MAPS_API_KEY'] as $name) {
        $value = (string) ($_ENV[$name] ?? getenv($name) ?: '');
        if ($value !== '' && $value !== 'YOUR_GOOGLE_MAPS_API_KEY') {
            return $value;
        }
    }
    return function_exists('gcloudEnv') ? (string) (gcloudEnv('GOOGLE_MAPS_API_KEY') ?: '') : '';
}

function vth_event_http_json(string $url, array $headers = []): ?array
{
    $headerBag = array_merge(['Accept: application/json'], $headers);
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 4,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTPHEADER => $headerBag,
            CURLOPT_USERAGENT => 'VizagTaxiHub-EventDuty/1.0',
        ]);
        $raw = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($code < 200 || $code >= 300 || !is_string($raw) || $raw === '') {
            return null;
        }
        $json = json_decode($raw, true);
        return is_array($json) ? $json : null;
    }
    $ctx = stream_context_create([
        'http' => [
            'timeout' => 4,
            'header' => implode("\r\n", $headerBag) . "\r\n",
            'user_agent' => 'VizagTaxiHub-EventDuty/1.0',
        ],
    ]);
    $raw = @file_get_contents($url, false, $ctx);
    if (!is_string($raw) || $raw === '') {
        return null;
    }
    $json = json_decode($raw, true);
    return is_array($json) ? $json : null;
}

function vth_event_short_google_address(array $result): ?string
{
    $parts = [];
    $want = ['neighborhood', 'sublocality_level_1', 'sublocality', 'locality'];
    foreach ($result['address_components'] ?? [] as $component) {
        $types = $component['types'] ?? [];
        $name = trim((string) ($component['long_name'] ?? ''));
        if ($name === '') {
            continue;
        }
        foreach ($want as $type) {
            if (in_array($type, $types, true) && !in_array($name, $parts, true)) {
                $parts[] = $name;
                break;
            }
        }
    }
    if ($parts) {
        return implode(', ', array_slice($parts, 0, 3));
    }
    $full = trim((string) ($result['formatted_address'] ?? ''));
    if ($full === '') {
        return null;
    }
    $full = preg_replace('/,?\s*India$/i', '', $full) ?? $full;
    return $full !== '' ? $full : null;
}

function vth_event_reverse_geocode(?float $lat, ?float $lng): ?string
{
    if ($lat === null || $lng === null || (abs($lat) < 0.0001 && abs($lng) < 0.0001)) {
        return null;
    }
    $key = vth_event_maps_api_key();
    if ($key !== '') {
        $url = 'https://maps.googleapis.com/maps/api/geocode/json?latlng='
            . rawurlencode($lat . ',' . $lng)
            . '&key=' . rawurlencode($key);
        $json = vth_event_http_json($url);
        if (($json['status'] ?? '') === 'OK' && !empty($json['results'][0]) && is_array($json['results'][0])) {
            return vth_event_short_google_address($json['results'][0]);
        }
    }
    $url = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat='
        . rawurlencode((string) $lat)
        . '&lon=' . rawurlencode((string) $lng)
        . '&zoom=18&addressdetails=1';
    $json = vth_event_http_json($url);
    if (!$json) {
        return null;
    }
    $addr = is_array($json['address'] ?? null) ? $json['address'] : [];
    $parts = array_values(array_filter([
        $addr['neighbourhood'] ?? $addr['suburb'] ?? $addr['residential'] ?? $addr['road'] ?? null,
        $addr['city'] ?? $addr['town'] ?? $addr['village'] ?? $addr['county'] ?? null,
    ]));
    if ($parts) {
        return implode(', ', array_unique($parts));
    }
    $display = trim((string) ($json['display_name'] ?? ''));
    return $display !== '' ? $display : null;
}

function vth_event_gps_payload(?mysqli $conn, array $row, string $side): ?array
{
    if ($side !== 'opening' && $side !== 'closing') {
        return null;
    }
    $latRaw = $row[$side . '_lat'] ?? null;
    $lngRaw = $row[$side . '_lng'] ?? null;
    if ($latRaw === null || $latRaw === '' || $lngRaw === null || $lngRaw === '') {
        return null;
    }
    $lat = (float) $latRaw;
    $lng = (float) $lngRaw;
    $accRaw = $row[$side . '_gps_accuracy'] ?? null;
    // Address is stored when the driver starts, ends, or moves. Looking it up here
    // blocked every event and driver page on a maps request per duty.
    $addr = isset($row[$side . '_address']) ? trim((string) $row[$side . '_address']) : '';
    return [
        'lat' => $lat,
        'lng' => $lng,
        'accuracy' => $accRaw !== null && $accRaw !== '' ? (float) $accRaw : null,
        'address' => $addr !== '' ? $addr : null,
    ];
}

function vth_admin_duty_row(array $row, ?mysqli $conn = null, ?array $knownDocIds = null): array
{
    if ($conn) {
        $stamped = vth_event_stamp_live_registrations($conn, [$row]);
        $row = $stamped[0];
    }
    $openId = $row['opening_photo_id'] !== null ? (int) $row['opening_photo_id'] : null;
    $closeId = $row['closing_photo_id'] !== null ? (int) $row['closing_photo_id'] : null;
    $keepPhoto = static function (?int $id) use ($conn, $knownDocIds): ?int {
        if (!$id) {
            return null;
        }
        if (is_array($knownDocIds)) {
            return isset($knownDocIds[$id]) ? $id : null;
        }
        if ($conn && !vth_event_document_exists($conn, $id)) {
            return null;
        }
        return $id;
    };
    $openId = $keepPhoto($openId);
    $closeId = $keepPhoto($closeId);
    $spanTotals = $conn ? vth_event_place_span_totals($conn, $row) : null;
    return [
        'id' => (int) $row['id'],
        'dutySlipNo' => $row['duty_slip_no'],
        'eventId' => (int) $row['event_id'],
        'eventName' => $row['event_name'] ?? null,
        'eventCode' => $row['event_code'] ?? null,
        'assignmentId' => (int) $row['assignment_id'],
        'vehicleId' => isset($row['event_vehicle_id']) && $row['event_vehicle_id'] !== null
            ? (int) $row['event_vehicle_id']
            : ($row['fleet_vehicle_id'] !== null ? (int) $row['fleet_vehicle_id'] : null),
        'driverId' => $row['driver_id'] !== null ? (int) $row['driver_id'] : null,
        'vehicleType' => $row['vehicle_type'],
        'vehicleTypeLabel' => vth_event_vehicle_type_label((string) ($row['vehicle_type'] ?? '')),
        'vehicleNumber' => $row['vehicle_reg_snapshot'],
        'driverName' => $row['driver_name_snapshot'],
        'driverMobile' => $row['driver_mobile_snapshot'],
        'dutyDate' => $row['duty_date'],
        'reportingTime' => $row['reporting_time'],
        'reportingLocation' => $row['reporting_location'],
        'openingKm' => $row['opening_km'] !== null ? (int) $row['opening_km'] : null,
        'closingKm' => $row['closing_km'] !== null ? (int) $row['closing_km'] : null,
        'totalKm' => $row['total_km'] !== null ? (int) $row['total_km'] : null,
        'openingAt' => $row['opening_at'],
        'closingAt' => $row['closing_at'],
        'openingPhotoId' => $openId,
        'closingPhotoId' => $closeId,
        'needsOpeningReupload' => $openId === null && ($row['opening_km'] !== null || $row['opening_photo_id'] !== null),
        'needsClosingReupload' => $closeId === null && ($row['closing_km'] !== null || $row['closing_photo_id'] !== null),
        'openingGps' => vth_event_gps_payload($conn, $row, 'opening'),
        'closingGps' => vth_event_gps_payload($conn, $row, 'closing'),
        'status' => $row['status'],
        'endRequestedAt' => $row['end_requested_at'] ?? null,
        'pausedSeconds' => isset($row['paused_seconds']) ? (int) $row['paused_seconds'] : 0,
        'tollParking' => isset($row['toll_parking']) ? round((float) $row['toll_parking'], 2) : 0,
        'dutyPlace' => (($row['duty_place'] ?? '') === 'parking') ? 'parking' : 'trip',
        'tripSeconds' => $spanTotals
            ? (int) $spanTotals['tripSeconds']
            : (isset($row['trip_seconds']) ? (int) $row['trip_seconds'] : 0),
        'parkingSeconds' => $spanTotals
            ? (int) $spanTotals['parkingSeconds']
            : (isset($row['parking_seconds']) ? (int) $row['parking_seconds'] : 0),
        'placeSince' => $spanTotals
            ? $spanTotals['placeSince']
            : (!empty($row['place_since']) ? $row['place_since'] : null),
        'placeSpans' => ($spanTotals && !empty($spanTotals['spans'])) ? $spanTotals['spans'] : [],
        'parkingPromptAt' => $row['parking_prompt_at'] ?? null,
        'parkingPromptNonce' => $row['parking_prompt_nonce'] ?? null,
        'endRequestSeenAt' => $row['end_request_seen_at'] ?? null,
        'endRequestNonce' => $row['end_request_nonce'] ?? null,
        'notes' => $row['notes'],
        'verificationCode' => $row['verification_code'],
        'createdAt' => $row['created_at'],
        'updatedAt' => $row['updated_at'],
    ];
}

function vth_event_refresh_assignment_snapshots(mysqli $conn, array $assignment, bool $futureOnly = true): void
{
    $eventVid = isset($assignment['event_vehicle_id']) && $assignment['event_vehicle_id'] !== null
        ? (int) $assignment['event_vehicle_id'] : null;
    $fleetVid = isset($assignment['fleet_vehicle_id']) && $assignment['fleet_vehicle_id'] !== null
        ? (int) $assignment['fleet_vehicle_id'] : null;
    $snap = vth_event_snapshots(
        $conn,
        $eventVid,
        $assignment['driver_id'] !== null ? (int) $assignment['driver_id'] : null,
        $fleetVid
    );
    $sql = 'UPDATE vth_event_duties
            SET event_vehicle_id = ?, fleet_vehicle_id = ?, driver_id = ?, vehicle_type = ?,
                vehicle_reg_snapshot = ?, driver_name_snapshot = ?, driver_mobile_snapshot = ?
            WHERE assignment_id = ? AND status IN (\'not_started\', \'scheduled\')';
    if ($futureOnly) {
        $sql .= ' AND duty_date >= CURDATE()';
    }
    $did = $assignment['driver_id'] !== null ? (int) $assignment['driver_id'] : null;
    $vtype = $assignment['vehicle_type'];
    $asg = (int) $assignment['id'];
    $stmt = $conn->prepare($sql);
    $stmt->bind_param(
        'iiissssi',
        $eventVid,
        $fleetVid,
        $did,
        $vtype,
        $snap['vehicle_reg_snapshot'],
        $snap['driver_name_snapshot'],
        $snap['driver_mobile_snapshot'],
        $asg
    );
    $stmt->execute();
    $stmt->close();
    $liveVehicle = $conn->prepare(
        "UPDATE vth_event_duties
         SET event_vehicle_id = ?, fleet_vehicle_id = ?, vehicle_type = ?, vehicle_reg_snapshot = ?
         WHERE assignment_id = ? AND status = 'in_progress'"
    );
    $liveVehicle->bind_param(
        'iissi',
        $eventVid,
        $fleetVid,
        $vtype,
        $snap['vehicle_reg_snapshot'],
        $asg
    );
    $liveVehicle->execute();
    $liveVehicle->close();
    if ($did) {
        $live = $conn->prepare(
            "UPDATE vth_event_duties
             SET driver_id = ?, driver_name_snapshot = ?, driver_mobile_snapshot = ?
             WHERE assignment_id = ? AND status = 'in_progress'"
        );
        $live->bind_param('issi', $did, $snap['driver_name_snapshot'], $snap['driver_mobile_snapshot'], $asg);
        $live->execute();
        $live->close();
    }
}

function vth_event_apply_date_schedules(mysqli $conn, int $assignmentId, array $schedules): void
{
    foreach (vth_event_schedule_map($schedules) as $date => $item) {
        vth_event_set_duty_schedule($conn, $assignmentId, (string) $date, $item['time'], $item['location'], (int) ($item['dutyId'] ?? 0));
    }
}

function vth_event_driver_phones(mysqli $conn, array $driverIds): array
{
    $sql = vth_event_id_sql($driverIds);
    if ($sql === '') {
        return [];
    }
    $out = [];
    $res = $conn->query("SELECT id, phone FROM drivers WHERE id IN ($sql)");
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $phone = trim((string) ($row['phone'] ?? ''));
            if ($phone !== '') {
                $out[(int) $row['id']] = $phone;
            }
        }
    }
    return $out;
}

function vth_event_haversine_m(float $lat1, float $lng1, float $lat2, float $lng2): float
{
    $earth = 6371000;
    $dLat = deg2rad($lat2 - $lat1);
    $dLng = deg2rad($lng2 - $lng1);
    $a = sin($dLat / 2) ** 2
        + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
    return 2 * $earth * asin(min(1, sqrt($a)));
}

function vth_event_track_signal(?string $lastAt): string
{
    if (!$lastAt) {
        return 'none';
    }
    $ts = strtotime($lastAt);
    if ($ts === false) {
        return 'none';
    }
    $age = time() - $ts;
    if ($age <= 120) {
        return 'live';
    }
    if ($age <= 900) {
        return 'stale';
    }
    return 'offline';
}

function vth_event_track_row(array $row): array
{
    $lat = $row['last_lat'] ?? $row['opening_lat'] ?? null;
    $lng = $row['last_lng'] ?? $row['opening_lng'] ?? null;
    $at = $row['last_gps_at'] ?? $row['opening_at'] ?? null;
    $acc = $row['last_gps_accuracy'] ?? $row['opening_gps_accuracy'] ?? null;
    $addr = $row['last_gps_address'] ?? $row['opening_address'] ?? null;
    $has = $lat !== null && $lat !== '' && $lng !== null && $lng !== '';
    return [
        'dutyId' => (int) $row['id'],
        'dutySlipNo' => $row['duty_slip_no'] ?? '',
        'vehicleNumber' => $row['vehicle_reg_snapshot'] ?: 'Not assigned',
        'vehicleType' => vth_event_vehicle_type_label((string) ($row['vehicle_type'] ?? '')),
        'driverName' => $row['driver_name_snapshot'] ?: 'Not assigned',
        'driverMobile' => $row['driver_mobile_snapshot'] ?: '',
        'status' => $row['status'] ?? '',
        'openingAt' => $row['opening_at'] ?? null,
        'closingAt' => $row['closing_at'] ?? null,
        'lat' => $has ? (float) $lat : null,
        'lng' => $has ? (float) $lng : null,
        'accuracy' => $acc !== null && $acc !== '' ? (float) $acc : null,
        'address' => $addr ? (string) $addr : null,
        'lastGpsAt' => $at,
        'signal' => $has ? vth_event_track_signal($at) : 'none',
    ];
}

function vth_event_track_list(mysqli $conn, int $eventId, string $date): array
{
    $stmt = $conn->prepare(
        'SELECT id, duty_slip_no, driver_id, event_vehicle_id, fleet_vehicle_id, vehicle_type, vehicle_reg_snapshot,
                driver_name_snapshot, driver_mobile_snapshot,
                status, opening_at, closing_at, opening_lat, opening_lng, opening_gps_accuracy, opening_address,
                last_lat, last_lng, last_gps_accuracy, last_gps_at, last_gps_address
         FROM vth_event_duties
         WHERE event_id = ? AND duty_date = ? AND status <> \'cancelled\'
         ORDER BY (last_gps_at IS NULL), last_gps_at DESC, vehicle_reg_snapshot'
    );
    $stmt->bind_param('is', $eventId, $date);
    $stmt->execute();
    $res = $stmt->get_result();
    $raw = [];
    while ($row = $res->fetch_assoc()) {
        if (!vth_event_share_row_assigned(
            (string) ($row['vehicle_reg_snapshot'] ?? ''),
            (string) ($row['driver_name_snapshot'] ?? '')
        )) {
            continue;
        }
        $raw[] = $row;
    }
    $stmt->close();
    $raw = vth_event_stamp_live_registrations($conn, $raw);
    $phones = vth_event_driver_phones($conn, array_column($raw, 'driver_id'));
    $out = [];
    foreach ($raw as $row) {
        $mapped = vth_event_track_row($row);
        $driverId = (int) ($row['driver_id'] ?? 0);
        if ($driverId > 0 && !empty($phones[$driverId])) {
            $mapped['driverMobile'] = $phones[$driverId];
        }
        $out[] = $mapped;
    }
    usort($out, static function (array $a, array $b): int {
        $rank = ['live' => 0, 'stale' => 1, 'offline' => 2, 'none' => 3];
        $cmp = ($rank[$a['signal']] ?? 4) <=> ($rank[$b['signal']] ?? 4);
        return $cmp !== 0 ? $cmp : strcasecmp((string) $a['vehicleNumber'], (string) $b['vehicleNumber']);
    });
    return $out;
}

function vth_event_gps_client_id(array $body): string
{
    $raw = (string) ($body['clientId'] ?? '');
    $clean = preg_replace('/[^a-zA-Z0-9_-]/', '', $raw) ?? '';
    return substr($clean, 0, 64);
}

/** app = VTH driver app, phone = mobile browser, desktop = a computer that must not move the pin. */
function vth_event_gps_kind(string $clientId): string
{
    if ($clientId === 'vth-app') {
        return 'app';
    }
    $ua = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
    if (preg_match('/okhttp|CFNetwork|Expo/i', $ua) && !preg_match('/Mozilla/i', $ua)) {
        return 'app';
    }
    if (preg_match('/Android|iPhone|iPad|iPod|Mobile/i', $ua)) {
        return 'phone';
    }
    return 'desktop';
}

function vth_event_track_ping(mysqli $conn, array $duty, float $lat, float $lng, ?float $acc, ?float $speed, ?float $heading, string $clientId = '', bool $claim = false): array
{
    if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
        vth_event_error('Invalid location');
    }
    $dutyId = (int) $duty['id'];
    $eventId = (int) $duty['event_id'];
    $kind = vth_event_gps_kind($clientId);
    if ($kind === 'app') {
        $clientId = 'vth-app';
    }
    $prevLat = isset($duty['last_lat']) && $duty['last_lat'] !== null && $duty['last_lat'] !== '' ? (float) $duty['last_lat'] : null;
    $prevLng = isset($duty['last_lng']) && $duty['last_lng'] !== null && $duty['last_lng'] !== '' ? (float) $duty['last_lng'] : null;
    $moved = $prevLat === null || $prevLng === null
        ? 9999.0
        : vth_event_haversine_m($prevLat, $prevLng, $lat, $lng);
    $lastAt = $duty['last_gps_at'] ?? null;
    $age = $lastAt ? (time() - (int) strtotime((string) $lastAt)) : 9999;
    $newAcc = $acc === null ? 99999.0 : (float) $acc;
    $prevAccRaw = $duty['last_gps_accuracy'] ?? null;
    $prevAcc = ($prevAccRaw !== null && $prevAccRaw !== '') ? (float) $prevAccRaw : 99999.0;
    if ($age < 120 && $prevAcc > 0 && $prevAcc <= 100 && $newAcc > 300 && $moved < 400) {
        $kept = vth_event_stamp_live_registrations($conn, [$duty]);
        return ['accepted' => true, 'reason' => 'kept_precise', 'track' => vth_event_track_row($kept[0])];
    }
    $insert = $age >= 20 && $moved >= 15;
    $accVal = $acc ?? 0;
    $speedVal = $speed ?? 0;
    $headingVal = $heading ?? 0;
    if ($insert) {
        $ins = $conn->prepare(
            'INSERT INTO vth_event_track_points (event_id, duty_id, lat, lng, accuracy, speed, heading, recorded_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())'
        );
        $ins->bind_param('iiddddd', $eventId, $dutyId, $lat, $lng, $accVal, $speedVal, $headingVal);
        $ins->execute();
        $ins->close();
    }
    $address = (string) ($duty['last_gps_address'] ?? '');
    $saved = false;
    if ($clientId !== '') {
        try {
            $upd = $conn->prepare(
                'UPDATE vth_event_duties
                 SET last_lat = ?, last_lng = ?, last_gps_accuracy = ?, last_gps_at = NOW(), last_gps_address = ?, last_gps_client = ?
                 WHERE id = ?'
            );
            if ($upd instanceof mysqli_stmt) {
                $upd->bind_param('dddssi', $lat, $lng, $accVal, $address, $clientId, $dutyId);
                $saved = $upd->execute();
                $upd->close();
            }
        } catch (Throwable $e) {
            $saved = false;
        }
    }
    if (!$saved) {
        $upd = $conn->prepare(
            'UPDATE vth_event_duties
             SET last_lat = ?, last_lng = ?, last_gps_accuracy = ?, last_gps_at = NOW(), last_gps_address = ?
             WHERE id = ?'
        );
        if ($upd instanceof mysqli_stmt) {
            $upd->bind_param('dddsi', $lat, $lng, $accVal, $address, $dutyId);
            $upd->execute();
            $upd->close();
        }
    }
    if ($address === '' || $moved >= 250) {
        $geo = vth_event_reverse_geocode($lat, $lng);
        if ($geo) {
            $address = $geo;
            $addr = $conn->prepare('UPDATE vth_event_duties SET last_gps_address = ? WHERE id = ?');
            $addr->bind_param('si', $address, $dutyId);
            $addr->execute();
            $addr->close();
        }
    }
    $fresh = $conn->prepare(
        'SELECT id, duty_slip_no, event_vehicle_id, fleet_vehicle_id, vehicle_type, vehicle_reg_snapshot,
                driver_name_snapshot, driver_mobile_snapshot,
                status, opening_at, closing_at, opening_lat, opening_lng, opening_gps_accuracy, opening_address,
                last_lat, last_lng, last_gps_accuracy, last_gps_at, last_gps_address
         FROM vth_event_duties WHERE id = ?'
    );
    $fresh->bind_param('i', $dutyId);
    $fresh->execute();
    $row = $fresh->get_result()->fetch_assoc();
    $fresh->close();
    $tracked = vth_event_stamp_live_registrations($conn, [$row ?: $duty]);
    return ['accepted' => true, 'track' => vth_event_track_row($tracked[0])];
}

function vth_event_secret(string $name): string
{
    $value = (string) ($_ENV[$name] ?? getenv($name) ?: '');
    if ($value === '' && function_exists('gcloudEnv')) {
        $value = (string) (gcloudEnv($name) ?: '');
    }
    return $value;
}

function vth_event_load_web_push(): bool
{
    if (class_exists(\Minishlink\WebPush\WebPush::class)) {
        return true;
    }
    $candidates = [
        dirname(__DIR__, 3) . '/vendor/autoload.php',
        dirname(__DIR__, 4) . '/vendor/autoload.php',
        dirname(__DIR__, 2) . '/vendor/autoload.php',
    ];
    foreach ($candidates as $file) {
        if (!is_file($file)) {
            continue;
        }
        require_once $file;
        if (class_exists(\Minishlink\WebPush\WebPush::class)) {
            return true;
        }
    }
    return false;
}

function vth_event_clip_end(array $row): int
{
    $now = time();
    $closed = !empty($row['closing_at']) ? strtotime((string) $row['closing_at']) : 0;
    $asked = !empty($row['end_requested_at']) ? strtotime((string) $row['end_requested_at']) : 0;
    if ($asked && (!$closed || $closed > $asked)) {
        return $asked;
    }
    if ($closed) {
        return $closed;
    }
    return $now;
}

function vth_event_place_span_ensure(mysqli $conn): bool
{
    static $ok = null;
    if ($ok === true) {
        return true;
    }
    @$conn->query(
        "CREATE TABLE IF NOT EXISTS `vth_event_duty_spans` (
          `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
          `duty_id` INT UNSIGNED NOT NULL,
          `place` VARCHAR(12) NOT NULL,
          `started_at` DATETIME NOT NULL,
          `ended_at` DATETIME NULL,
          PRIMARY KEY (`id`),
          KEY `idx_vth_duty_span` (`duty_id`, `started_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );
    $res = @$conn->query("SHOW TABLES LIKE 'vth_event_duty_spans'");
    $ok = $res instanceof mysqli_result && $res->num_rows > 0;
    return $ok;
}

function vth_event_place_span_totals(mysqli $conn, array $row): ?array
{
    if (!vth_event_place_span_ensure($conn)) {
        return null;
    }
    $dutyId = (int) ($row['id'] ?? 0);
    if ($dutyId < 1) {
        return null;
    }
    $stmt = $conn->prepare('SELECT place, started_at, ended_at FROM vth_event_duty_spans WHERE duty_id = ? ORDER BY id');
    if (!$stmt) {
        return null;
    }
    $stmt->bind_param('i', $dutyId);
    $stmt->execute();
    $res = $stmt->get_result();
    $spans = [];
    while ($span = $res->fetch_assoc()) {
        $spans[] = $span;
    }
    $stmt->close();
    if (!$spans) {
        return null;
    }
    $trip = 0;
    $parking = 0;
    $since = null;
    $spanList = [];
    $closedAt = !empty($row['closing_at']) ? strtotime((string) $row['closing_at']) : 0;
    $clockEnd = $closedAt > 0 ? $closedAt : time();
    foreach ($spans as $span) {
        $start = strtotime((string) $span['started_at']);
        if (!$start) {
            continue;
        }
        $spanList[] = [
            'place' => (($span['place'] ?? '') === 'parking') ? 'parking' : 'trip',
            'at' => $span['started_at'],
        ];
        $stop = !empty($span['ended_at']) ? strtotime((string) $span['ended_at']) : $clockEnd;
        if (!$stop || $stop < $start) {
            $stop = $start;
        }
        $add = $stop - $start;
        if (($span['place'] ?? '') === 'parking') {
            $parking += $add;
        } else {
            $trip += $add;
        }
        if (empty($span['ended_at'])) {
            $since = $span['started_at'];
        }
    }
    return [
        'tripSeconds' => $trip,
        'parkingSeconds' => $parking,
        'placeSince' => $since,
        'spans' => $spanList,
    ];
}

function vth_event_place_span_switch(mysqli $conn, int $dutyId, string $newPlace): void
{
    if ($dutyId < 1 || ($newPlace !== 'trip' && $newPlace !== 'parking')) {
        return;
    }
    if (!vth_event_place_span_ensure($conn)) {
        return;
    }
    $stmt = $conn->prepare('SELECT opening_at, closing_at, end_requested_at, duty_place FROM vth_event_duties WHERE id = ?');
    if (!$stmt) {
        return;
    }
    $stmt->bind_param('i', $dutyId);
    $stmt->execute();
    $duty = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$duty || empty($duty['opening_at'])) {
        return;
    }
    $stampTs = time();
    if (!empty($duty['closing_at'])) {
        $closedAt = strtotime((string) $duty['closing_at']);
        if ($closedAt && $closedAt < $stampTs) {
            $stampTs = $closedAt;
        }
    }
    $stamp = date('Y-m-d H:i:s', $stampTs);
    $openStmt = $conn->prepare(
        'SELECT id, place FROM vth_event_duty_spans WHERE duty_id = ? AND ended_at IS NULL ORDER BY id DESC LIMIT 1'
    );
    if (!$openStmt) {
        return;
    }
    $openStmt->bind_param('i', $dutyId);
    $openStmt->execute();
    $open = $openStmt->get_result()->fetch_assoc();
    $openStmt->close();
    if (!$open) {
        $old = (($duty['duty_place'] ?? '') === 'parking') ? 'parking' : 'trip';
        if ($old === $newPlace) {
            $seed = $conn->prepare('INSERT INTO vth_event_duty_spans (duty_id, place, started_at) VALUES (?, ?, ?)');
            if ($seed) {
                $opening = (string) $duty['opening_at'];
                $seed->bind_param('iss', $dutyId, $old, $opening);
                $seed->execute();
                $seed->close();
            }
            return;
        }
        if ($old === 'trip') {
            $seed = $conn->prepare('INSERT INTO vth_event_duty_spans (duty_id, place, started_at, ended_at) VALUES (?, ?, ?, ?)');
            if ($seed) {
                $opening = (string) $duty['opening_at'];
                $seed->bind_param('isss', $dutyId, $old, $opening, $stamp);
                $seed->execute();
                $seed->close();
            }
        }
        $next = $conn->prepare('INSERT INTO vth_event_duty_spans (duty_id, place, started_at) VALUES (?, ?, ?)');
        if ($next) {
            $next->bind_param('iss', $dutyId, $newPlace, $stamp);
            $next->execute();
            $next->close();
        }
        return;
    }
    if (($open['place'] ?? '') === $newPlace) {
        return;
    }
    $openId = (int) $open['id'];
    $close = $conn->prepare('UPDATE vth_event_duty_spans SET ended_at = ? WHERE id = ? AND ended_at IS NULL');
    if ($close) {
        $close->bind_param('si', $stamp, $openId);
        $close->execute();
        $close->close();
    }
    $next = $conn->prepare('INSERT INTO vth_event_duty_spans (duty_id, place, started_at) VALUES (?, ?, ?)');
    if ($next) {
        $next->bind_param('iss', $dutyId, $newPlace, $stamp);
        $next->execute();
        $next->close();
    }
}

function vth_event_roll_place(mysqli $conn, int $dutyId): void
{
    if ($dutyId < 1) {
        return;
    }
    $col = @$conn->query("SHOW COLUMNS FROM `vth_event_duties` LIKE 'place_since'");
    if (!($col instanceof mysqli_result) || $col->num_rows < 1) {
        return;
    }
    $stmt = $conn->prepare(
        "UPDATE vth_event_duties
         SET trip_seconds = trip_seconds + IF(
                 place_since IS NULL,
                 GREATEST(0, TIMESTAMPDIFF(SECOND, opening_at, COALESCE(closing_at, NOW()))),
                 IF(duty_place = 'parking', 0, GREATEST(0, TIMESTAMPDIFF(SECOND, place_since, COALESCE(closing_at, NOW()))))
             ),
             parking_seconds = parking_seconds + IF(
                 place_since IS NULL OR duty_place <> 'parking',
                 0,
                 GREATEST(0, TIMESTAMPDIFF(SECOND, place_since, COALESCE(closing_at, NOW())))
             ),
             place_since = COALESCE(closing_at, NOW())
         WHERE id = ? AND opening_at IS NOT NULL"
    );
    if (!$stmt) {
        return;
    }
    $stmt->bind_param('i', $dutyId);
    $stmt->execute();
    $stmt->close();
}

function vth_event_set_duty_place(mysqli $conn, int $dutyId, string $place, int $eventId): array
{
    if ($place !== 'trip' && $place !== 'parking') {
        vth_event_error('Choose In Trip or In Parking');
    }
    if ($dutyId < 1) {
        vth_event_error('Duty not found', 404);
    }
    $stmt = $conn->prepare('SELECT id, event_id, assignment_id, status, opening_at, closing_at FROM vth_event_duties WHERE id = ?');
    $stmt->bind_param('i', $dutyId);
    $stmt->execute();
    $duty = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$duty || (int) $duty['event_id'] !== $eventId) {
        vth_event_error('Duty not found', 404);
    }
    if (($duty['status'] ?? '') !== 'in_progress' || empty($duty['opening_at']) || !empty($duty['closing_at'])) {
        vth_event_error('In Trip and In Parking are available only after the driver starts the duty');
    }
    vth_event_place_span_switch($conn, $dutyId, $place);
    vth_event_roll_place($conn, $dutyId);
    if ($place === 'trip') {
        $nonce = bin2hex(random_bytes(8));
        $upd = $conn->prepare(
            'UPDATE vth_event_duties
             SET duty_place = ?, parking_prompt_at = NOW(), parking_prompt_nonce = ?, place_since = NOW()
             WHERE id = ?'
        );
        $upd->bind_param('ssi', $place, $nonce, $dutyId);
        $upd->execute();
        $upd->close();
        $delivery = ['sent' => 0, 'subscribed' => 0, 'reason' => 'no_subscription'];
        try {
            $delivery = vth_event_push_end_notice(
                $conn,
                $duty,
                'You are on a trip',
                'When you drop the guest, tap In Parking.',
                'event-duty-parking-' . $dutyId
            );
        } catch (Throwable $e) {
            $delivery['reason'] = 'push_failed';
        }
        return [
            'dutyId' => $dutyId,
            'dutyPlace' => 'trip',
            'prompted' => true,
            'delivery' => $delivery,
        ];
    }
    $upd = $conn->prepare(
        'UPDATE vth_event_duties
         SET duty_place = ?, parking_prompt_nonce = NULL, place_since = NOW()
         WHERE id = ?'
    );
    $upd->bind_param('si', $place, $dutyId);
    $upd->execute();
    $upd->close();
    return ['dutyId' => $dutyId, 'dutyPlace' => 'parking', 'prompted' => false];
}

function vth_event_request_driver_end(mysqli $conn, int $dutyId, string $actorType, ?int $eventId = null, $actorId = null): array
{
    if ($dutyId < 1) {
        vth_event_error('Duty not found', 404);
    }
    if ($actorType !== 'admin' && $actorType !== 'share') {
        vth_event_error('Invalid requester');
    }
    $stmt = $conn->prepare('SELECT * FROM vth_event_duties WHERE id = ?');
    $stmt->bind_param('i', $dutyId);
    $stmt->execute();
    $duty = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$duty) {
        vth_event_error('Duty not found', 404);
    }
    if ($eventId !== null && (int) $duty['event_id'] !== $eventId) {
        vth_event_error('Duty not found', 404);
    }
    if (($duty['status'] ?? '') !== 'in_progress' || empty($duty['opening_at']) || !empty($duty['closing_at'])) {
        vth_event_error('Ask to end is only available while the duty is in progress');
    }
    $nonce = bin2hex(random_bytes(8));
    $by = $actorType === 'admin' ? 'admin' : 'event_manager';
    if (empty($duty['end_requested_at'])) {
        $upd = $conn->prepare(
            'UPDATE vth_event_duties
             SET end_requested_at = NOW(), end_request_nonce = ?, end_requested_by = ?
             WHERE id = ? AND end_requested_at IS NULL'
        );
        $upd->bind_param('ssi', $nonce, $by, $dutyId);
    } else {
        $upd = $conn->prepare('UPDATE vth_event_duties SET end_request_nonce = ? WHERE id = ?');
        $upd->bind_param('si', $nonce, $dutyId);
    }
    $upd->execute();
    $upd->close();
    vth_event_audit($conn, $actorType, $actorId, 'ask_driver_end', 'duty', $dutyId, (int) $duty['event_id'], null, [
        'nonce' => $nonce,
        'first' => empty($duty['end_requested_at']),
    ]);
    $freshStmt = $conn->prepare(
        'SELECT d.*, e.name AS event_name, e.event_code,
                e.reporting_location AS event_reporting_location, e.support_mobile
         FROM vth_event_duties d
         JOIN vth_events e ON e.id = d.event_id
         WHERE d.id = ?'
    );
    $freshStmt->bind_param('i', $dutyId);
    $freshStmt->execute();
    $fresh = $freshStmt->get_result()->fetch_assoc();
    $freshStmt->close();
    if (!$fresh) {
        vth_event_error('Duty not found', 404);
    }
    $delivery = vth_event_push_end_notice($conn, $fresh);
    try {
        $delivery = array_merge($delivery, vth_event_send_end_whatsapp($conn, $fresh));
    } catch (Throwable $e) {
        $delivery['whatsapp'] = 'failed';
    }
    return [
        'duty' => vth_admin_duty_row($fresh, $conn),
        'delivery' => $delivery,
    ];
}

function vth_event_revoke_driver_end(mysqli $conn, int $dutyId, string $actorType, ?int $eventId = null, $actorId = null): array
{
    if ($dutyId < 1) {
        vth_event_error('Duty not found', 404);
    }
    if ($actorType !== 'admin' && $actorType !== 'share') {
        vth_event_error('Invalid requester');
    }
    $stmt = $conn->prepare('SELECT * FROM vth_event_duties WHERE id = ?');
    $stmt->bind_param('i', $dutyId);
    $stmt->execute();
    $duty = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$duty) {
        vth_event_error('Duty not found', 404);
    }
    if ($eventId !== null && (int) $duty['event_id'] !== $eventId) {
        vth_event_error('Duty not found', 404);
    }
    if (($duty['status'] ?? '') !== 'in_progress' || empty($duty['opening_at']) || !empty($duty['closing_at'])) {
        vth_event_error('Revoke is only available while the duty is still open');
    }
    if (empty($duty['end_requested_at'])) {
        vth_event_error('There is no end request to revoke');
    }
    $previous = (string) $duty['end_requested_at'];
    $upd = $conn->prepare(
        'UPDATE vth_event_duties
         SET end_requested_at = NULL, end_request_seen_at = NULL,
             end_request_nonce = NULL, end_requested_by = NULL
         WHERE id = ? AND status = \'in_progress\' AND closing_at IS NULL AND end_requested_at IS NOT NULL'
    );
    $upd->bind_param('i', $dutyId);
    $upd->execute();
    $changed = $upd->affected_rows > 0;
    $upd->close();
    if (!$changed) {
        vth_event_error('This trip is no longer waiting to end');
    }
    vth_event_audit($conn, $actorType, $actorId, 'revoke_driver_end', 'duty', $dutyId, (int) $duty['event_id'], [
        'endRequestedAt' => $previous,
    ], ['revoked' => true]);
    $freshStmt = $conn->prepare(
        'SELECT d.*, e.name AS event_name, e.event_code,
                e.reporting_location AS event_reporting_location, e.support_mobile
         FROM vth_event_duties d
         JOIN vth_events e ON e.id = d.event_id
         WHERE d.id = ?'
    );
    $freshStmt->bind_param('i', $dutyId);
    $freshStmt->execute();
    $fresh = $freshStmt->get_result()->fetch_assoc();
    $freshStmt->close();
    if (!$fresh) {
        vth_event_error('Duty not found', 404);
    }
    $delivery = vth_event_push_end_notice(
        $conn,
        $fresh,
        'Continue this duty',
        'The end request was cancelled. Time is counting again.',
        'event-duty-end-' . $dutyId
    );
    try {
        $delivery = array_merge($delivery, vth_event_send_continue_whatsapp($conn, $fresh));
    } catch (Throwable $e) {
        $delivery['whatsapp'] = 'failed';
    }
    return [
        'duty' => vth_admin_duty_row($fresh, $conn),
        'delivery' => $delivery,
    ];
}

function vth_event_reopen_place_span(mysqli $conn, int $dutyId, string $place, ?string $closedAt): void
{
    if ($dutyId < 1 || !vth_event_place_span_ensure($conn)) {
        return;
    }
    $count = $conn->prepare('SELECT COUNT(*) AS n FROM vth_event_duty_spans WHERE duty_id = ?');
    if (!$count) {
        return;
    }
    $count->bind_param('i', $dutyId);
    $count->execute();
    $existing = (int) ($count->get_result()->fetch_assoc()['n'] ?? 0);
    $count->close();
    if ($existing < 1) {
        return;
    }
    $stamp = $closedAt && strtotime($closedAt) ? date('Y-m-d H:i:s', strtotime($closedAt)) : date('Y-m-d H:i:s');
    $close = $conn->prepare('UPDATE vth_event_duty_spans SET ended_at = ? WHERE duty_id = ? AND ended_at IS NULL');
    if ($close) {
        $close->bind_param('si', $stamp, $dutyId);
        $close->execute();
        $close->close();
    }
    $next = $place === 'parking' ? 'parking' : 'trip';
    $ins = $conn->prepare('INSERT INTO vth_event_duty_spans (duty_id, place, started_at) VALUES (?, ?, NOW())');
    if ($ins) {
        $ins->bind_param('is', $dutyId, $next);
        $ins->execute();
        $ins->close();
    }
}

function vth_event_resume_duty(mysqli $conn, int $dutyId, string $actorType, ?int $eventId = null, $actorId = null): array
{
    if ($dutyId < 1) {
        vth_event_error('Duty not found', 404);
    }
    if ($actorType !== 'admin' && $actorType !== 'share') {
        vth_event_error('Invalid requester');
    }
    $stmt = $conn->prepare('SELECT * FROM vth_event_duties WHERE id = ?');
    $stmt->bind_param('i', $dutyId);
    $stmt->execute();
    $duty = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$duty) {
        vth_event_error('Duty not found', 404);
    }
    if ($eventId !== null && (int) $duty['event_id'] !== $eventId) {
        vth_event_error('Duty not found', 404);
    }
    if (empty($duty['opening_at'])) {
        vth_event_error('This duty has not started');
    }
    $stopped = ($duty['status'] ?? '') === 'completed' || !empty($duty['closing_at']) || $duty['closing_km'] !== null;
    if (!$stopped) {
        vth_event_error('This duty is already open');
    }
    $paused = isset($duty['paused_seconds']) ? (int) $duty['paused_seconds'] : 0;
    if (!empty($duty['closing_at'])) {
        $closed = strtotime((string) $duty['closing_at']);
        if ($closed) {
            $paused += max(0, time() - $closed);
        }
    }
    $place = (($duty['duty_place'] ?? '') === 'parking') ? 'parking' : 'trip';
    $closedAt = !empty($duty['closing_at']) ? (string) $duty['closing_at'] : null;
    $upd = $conn->prepare(
        'UPDATE vth_event_duties
         SET paused_seconds = ?,
             closing_km = NULL, closing_photo_id = NULL, closing_at = NULL,
             closing_lat = NULL, closing_lng = NULL, closing_gps_accuracy = NULL, closing_ip = NULL,
             closing_address = NULL, total_km = NULL,
             end_requested_at = NULL, end_request_seen_at = NULL,
             end_request_nonce = NULL, end_requested_by = NULL,
             status = \'in_progress\', place_since = NOW()
         WHERE id = ? AND opening_at IS NOT NULL'
    );
    $upd->bind_param('ii', $paused, $dutyId);
    $upd->execute();
    $changed = $upd->affected_rows > 0;
    $upd->close();
    if (!$changed) {
        vth_event_error('This duty could not be continued');
    }
    vth_event_reopen_place_span($conn, $dutyId, $place, $closedAt);
    vth_event_audit($conn, $actorType, $actorId, 'resume_duty', 'duty', $dutyId, (int) $duty['event_id'], [
        'closingAt' => $duty['closing_at'] ?? null,
        'closingKm' => $duty['closing_km'] ?? null,
        'status' => $duty['status'] ?? null,
    ], [
        'pausedSeconds' => $paused,
        'status' => 'in_progress',
    ]);
    $freshStmt = $conn->prepare(
        'SELECT d.*, e.name AS event_name, e.event_code,
                e.reporting_location AS event_reporting_location, e.support_mobile
         FROM vth_event_duties d
         JOIN vth_events e ON e.id = d.event_id
         WHERE d.id = ?'
    );
    $freshStmt->bind_param('i', $dutyId);
    $freshStmt->execute();
    $fresh = $freshStmt->get_result()->fetch_assoc();
    $freshStmt->close();
    if (!$fresh) {
        vth_event_error('Duty not found', 404);
    }
    $delivery = vth_event_push_end_notice(
        $conn,
        $fresh,
        'Duty continued',
        'The ending reading was cleared. Time is counting again.',
        'event-duty-resume-' . $dutyId
    );
    try {
        $delivery = array_merge($delivery, vth_event_send_resume_whatsapp($conn, $fresh));
    } catch (Throwable $e) {
        $delivery['whatsapp'] = 'failed';
    }
    return [
        'duty' => vth_admin_duty_row($fresh, $conn),
        'delivery' => $delivery,
    ];
}

function vth_event_driver_duty_url(mysqli $conn, array $duty): string
{
    $base = vth_event_public_base();
    $assignmentId = (int) ($duty['assignment_id'] ?? 0);
    if ($assignmentId > 0) {
        $stmt = $conn->prepare(
            "SELECT token_plain FROM vth_event_tokens
             WHERE assignment_id = ? AND token_type = 'driver' AND revoked_at IS NULL
               AND token_plain IS NOT NULL AND TRIM(token_plain) <> ''
             ORDER BY id DESC LIMIT 1"
        );
        if ($stmt) {
            $stmt->bind_param('i', $assignmentId);
            $stmt->execute();
            $row = $stmt->get_result()->fetch_assoc();
            $stmt->close();
            $plain = trim((string) ($row['token_plain'] ?? ''));
            if ($plain !== '') {
                return $base . '/driver/register/' . $plain;
            }
        }
        $push = $conn->prepare(
            'SELECT open_path FROM vth_event_driver_push WHERE assignment_id = ? ORDER BY id DESC LIMIT 1'
        );
        if ($push) {
            $push->bind_param('i', $assignmentId);
            $push->execute();
            $pathRow = $push->get_result()->fetch_assoc();
            $push->close();
            $path = (string) ($pathRow['open_path'] ?? '');
            if (preg_match('#^/driver/register/[a-fA-F0-9]{16,128}$#', $path)) {
                return $base . $path;
            }
        }
        $eventId = (int) ($duty['event_id'] ?? 0);
        $driverId = isset($duty['driver_id']) && $duty['driver_id'] !== null && $duty['driver_id'] !== ''
            ? (int) $duty['driver_id']
            : null;
        if ($eventId > 0) {
            $raw = vth_event_issue_token($conn, 'driver', $eventId, $assignmentId, $driverId, date('Y-m-d H:i:s', time() + 45 * 86400));
            return $base . '/driver/register/' . $raw;
        }
    }
    return $base . '/driver/register';
}

function vth_event_whatsapp_moment(?string $value): ?DateTimeImmutable
{
    $value = trim((string) $value);
    if ($value === '') {
        return null;
    }
    try {
        return new DateTimeImmutable($value, new DateTimeZone('Asia/Kolkata'));
    } catch (Throwable $e) {
        return null;
    }
}

function vth_event_end_whatsapp_text(array $duty, string $url, string $phone): string
{
    $event = trim((string) ($duty['event_name'] ?? 'Event'));
    $vehicle = trim((string) ($duty['vehicle_reg_snapshot'] ?? ''));
    if ($vehicle === '') {
        $vehicle = '—';
    }
    $driver = trim((string) ($duty['driver_name_snapshot'] ?? 'Driver'));
    $shown = strlen($phone) >= 10 ? ('+91 ' . substr($phone, -10)) : $phone;
    $place = trim((string) ($duty['reporting_location'] ?? ''));
    if ($place === '') {
        $place = trim((string) ($duty['event_reporting_location'] ?? ''));
    }
    if ($place === '') {
        $place = '—';
    }
    $startedAt = vth_event_whatsapp_moment(isset($duty['opening_at']) ? (string) $duty['opening_at'] : null);
    $endedAt = vth_event_whatsapp_moment(isset($duty['end_requested_at']) ? (string) $duty['end_requested_at'] : null)
        ?? new DateTimeImmutable('now', new DateTimeZone('Asia/Kolkata'));
    $started = $startedAt ? $startedAt->format('d-M-Y, g:i A') : '—';
    $ended = $endedAt->format('d-M-Y, g:i A');
    $deadlineTime = $endedAt->format('g:i A');
    $deadlineDate = $endedAt->format('d-M-Y');
    $kmRaw = $duty['opening_km'] ?? null;
    $km = ($kmRaw !== null && $kmRaw !== '') ? ((string) (int) $kmRaw . ' KM') : '—';
    $support = preg_replace('/\D+/', '', (string) ($duty['support_mobile'] ?? '')) ?? '';
    if (strlen($support) < 10) {
        $support = '9966363662';
    }
    $supportShown = '+91 ' . substr($support, -10);
    return "🛑 *END DUTY REMINDER – VIZAG TAXI HUB*\n\n"
        . "👤 *Driver:* {$driver}\n"
        . "📞 *Mobile:* {$shown}\n"
        . "🚗 *Vehicle No.:* {$vehicle}\n"
        . "📅 *Event:* {$event}\n"
        . "📍 *Reporting Location:* {$place}\n\n"
        . "🕒 *Duty Start:* {$started}\n"
        . "🕒 *Duty End Deadline:* {$ended}\n"
        . "🔢 *Starting KM:* {$km}\n\n"
        . "⚠️ *ACTION REQUIRED: END YOUR DUTY IMMEDIATELY.*\n\n"
        . "Please open the duty link below and complete the *End Duty* process now.\n\n"
        . "⏰ *Important:* Any time after {$deadlineTime} on {$deadlineDate} will not be counted towards this duty. Please ensure you submit the ending odometer reading and complete all required details.\n\n"
        . "🔗 *End Duty Link:*\n{$url}\n\n"
        . "📵 *Please do not reply to or call this number for support.*\n\n"
        . "📞 For any assistance, please contact our support team at *{$supportShown}*.\n\n"
        . "*Vizag Taxi Hub – Operations Team*";
}

function vth_event_duty_phone(mysqli $conn, array $duty): string
{
    $driverId = (int) ($duty['driver_id'] ?? 0);
    $phones = $driverId > 0 ? vth_event_driver_phones($conn, [$driverId]) : [];
    $phone = preg_replace('/\D+/', '', (string) ($phones[$driverId] ?? $duty['driver_mobile_snapshot'] ?? '')) ?? '';
    return strlen($phone) >= 10 ? $phone : '';
}

function vth_event_send_duty_text(mysqli $conn, array $duty, string $text): array
{
    $phone = vth_event_duty_phone($conn, $duty);
    if ($phone === '') {
        return ['whatsapp' => 'no_phone'];
    }
    $client = __DIR__ . '/../utils/whatsapp_cloud_client.php';
    $recipientsFile = __DIR__ . '/../utils/admin_tomorrow_reminder_core.php';
    if (!is_file($client) || !is_file($recipientsFile)) {
        return ['whatsapp' => 'not_configured'];
    }
    require_once $client;
    require_once $recipientsFile;
    if (!function_exists('whatsapp_send_text_message_auto_chunk') || !function_exists('admin_whatsapp_recipients')) {
        return ['whatsapp' => 'not_configured'];
    }
    $targets = [whatsapp_normalize_phone($phone)];
    foreach (admin_whatsapp_recipients() as $adminPhone) {
        $targets[] = whatsapp_normalize_phone((string) $adminPhone);
    }
    $targets = array_values(array_unique(array_filter($targets, static function (string $to): bool {
        return strlen($to) >= 10;
    })));
    $sent = 0;
    foreach ($targets as $to) {
        try {
            $result = whatsapp_send_text_message_auto_chunk('trip', $to, $text);
        } catch (Throwable $e) {
            $result = ['ok' => false];
        }
        if (!empty($result['ok'])) {
            $sent++;
        }
    }
    return ['whatsapp' => $sent > 0 ? 'sent' : 'failed', 'whatsappSent' => $sent];
}

function vth_event_send_end_whatsapp(mysqli $conn, array $duty): array
{
    $phone = vth_event_duty_phone($conn, $duty);
    if ($phone === '') {
        return ['whatsapp' => 'no_phone'];
    }
    $url = vth_event_driver_duty_url($conn, $duty);
    return vth_event_send_duty_text($conn, $duty, vth_event_end_whatsapp_text($duty, $url, $phone));
}

function vth_event_continue_whatsapp_text(array $duty, string $url): string
{
    $event = trim((string) ($duty['event_name'] ?? 'Event'));
    $vehicle = trim((string) ($duty['vehicle_reg_snapshot'] ?? ''));
    if ($vehicle === '') {
        $vehicle = '—';
    }
    $driver = trim((string) ($duty['driver_name_snapshot'] ?? 'Driver'));
    return "✅ *DUTY CONTINUES – VIZAG TAXI HUB*\n\n"
        . "👤 *Driver:* {$driver}\n"
        . "🚗 *Vehicle No.:* {$vehicle}\n"
        . "📅 *Event:* {$event}\n\n"
        . "The earlier end-duty request was cancelled.\n"
        . "Please continue this duty. Time is counting again.\n\n"
        . "🔗 *Duty link:*\n{$url}\n\n"
        . "*Vizag Taxi Hub – Operations Team*";
}

function vth_event_send_continue_whatsapp(mysqli $conn, array $duty): array
{
    $url = vth_event_driver_duty_url($conn, $duty);
    return vth_event_send_duty_text($conn, $duty, vth_event_continue_whatsapp_text($duty, $url));
}

function vth_event_resume_whatsapp_text(array $duty, string $url): string
{
    $event = trim((string) ($duty['event_name'] ?? 'Event'));
    $vehicle = trim((string) ($duty['vehicle_reg_snapshot'] ?? ''));
    if ($vehicle === '') {
        $vehicle = '—';
    }
    $driver = trim((string) ($duty['driver_name_snapshot'] ?? 'Driver'));
    return "✅ *DUTY CONTINUED – VIZAG TAXI HUB*\n\n"
        . "👤 *Driver:* {$driver}\n"
        . "🚗 *Vehicle No.:* {$vehicle}\n"
        . "📅 *Event:* {$event}\n\n"
        . "The ending odometer was removed. Please continue this duty.\n"
        . "Time is counting again from where it stopped.\n"
        . "Submit the ending reading only when the trip is finished.\n\n"
        . "🔗 *Duty link:*\n{$url}\n\n"
        . "*Vizag Taxi Hub – Operations Team*";
}

function vth_event_send_resume_whatsapp(mysqli $conn, array $duty): array
{
    $url = vth_event_driver_duty_url($conn, $duty);
    return vth_event_send_duty_text($conn, $duty, vth_event_resume_whatsapp_text($duty, $url));
}

function vth_event_ensure_expo_table(mysqli $conn): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;
    @$conn->query(
        "CREATE TABLE IF NOT EXISTS `vth_event_driver_expo` (
          `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
          `assignment_id` INT UNSIGNED NOT NULL,
          `expo_token` VARCHAR(255) NOT NULL,
          `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`),
          UNIQUE KEY `uq_vth_driver_expo_token` (`expo_token`),
          KEY `idx_vth_driver_expo_asg` (`assignment_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );
}

function vth_event_driver_plain_token(mysqli $conn, int $assignmentId): string
{
    if ($assignmentId < 1) {
        return '';
    }
    $stmt = $conn->prepare(
        "SELECT token_plain FROM vth_event_tokens
         WHERE assignment_id = ? AND token_type = 'driver' AND revoked_at IS NULL
           AND token_plain IS NOT NULL AND TRIM(token_plain) <> ''
         ORDER BY id DESC LIMIT 1"
    );
    if (!$stmt) {
        return '';
    }
    $stmt->bind_param('i', $assignmentId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return trim((string) ($row['token_plain'] ?? ''));
}

function vth_event_send_expo_alerts(mysqli $conn, int $assignmentId, string $title, string $body, array $duty): array
{
    $none = ['sent' => 0, 'subscribed' => 0, 'reason' => 'no_subscription'];
    if ($assignmentId < 1) {
        return $none;
    }
    vth_event_ensure_expo_table($conn);
    $stmt = $conn->prepare('SELECT expo_token FROM vth_event_driver_expo WHERE assignment_id = ?');
    if (!$stmt) {
        return $none;
    }
    $stmt->bind_param('i', $assignmentId);
    $stmt->execute();
    $res = $stmt->get_result();
    $tokens = [];
    while ($row = $res->fetch_assoc()) {
        $token = trim((string) ($row['expo_token'] ?? ''));
        if (preg_match('/^(Exponent|Expo)PushToken\[[^\]]+\]$/', $token)) {
            $tokens[$token] = $token;
        }
    }
    $stmt->close();
    if (!$tokens) {
        return $none;
    }
    $driverToken = vth_event_driver_plain_token($conn, $assignmentId);
    $messages = [];
    foreach ($tokens as $to) {
        $messages[] = [
            'to' => $to,
            'title' => $title,
            'body' => $body,
            'sound' => 'default',
            'priority' => 'high',
            'channelId' => 'event_duty_alerts_v1',
            'data' => [
                'type' => 'event_duty',
                'token' => $driverToken,
                'dutyId' => (string) ((int) ($duty['id'] ?? 0)),
            ],
        ];
    }
    $payload = json_encode(array_values($messages), JSON_UNESCAPED_UNICODE);
    if ($payload === false || !function_exists('curl_init')) {
        return ['sent' => 0, 'subscribed' => count($tokens), 'reason' => 'push_failed'];
    }
    $ch = curl_init('https://exp.host/--/api/v2/push/send');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 8,
        CURLOPT_CONNECTTIMEOUT => 4,
        CURLOPT_HTTPHEADER => ['Accept: application/json', 'Content-Type: application/json'],
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_USERAGENT => 'VizagTaxiHub-EventDuty/1.0',
    ]);
    $raw = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code < 200 || $code >= 300 || !is_string($raw) || $raw === '') {
        return ['sent' => 0, 'subscribed' => count($tokens), 'reason' => 'push_failed'];
    }
    $json = json_decode($raw, true);
    $tickets = is_array($json['data'] ?? null) ? $json['data'] : [];
    if (isset($tickets['status'])) {
        $tickets = [$tickets];
    }
    $sent = 0;
    $tokenList = array_values($tokens);
    foreach ($tickets as $index => $ticket) {
        if (!is_array($ticket)) {
            continue;
        }
        if (($ticket['status'] ?? '') === 'ok') {
            $sent++;
            continue;
        }
        if (($ticket['details']['error'] ?? '') === 'DeviceNotRegistered') {
            $dead = (string) ($tokenList[$index] ?? '');
            if ($dead !== '') {
                $del = $conn->prepare('DELETE FROM vth_event_driver_expo WHERE expo_token = ?');
                if ($del) {
                    $del->bind_param('s', $dead);
                    $del->execute();
                    $del->close();
                }
            }
        }
    }
    return [
        'sent' => $sent,
        'subscribed' => count($tokens),
        'reason' => $sent > 0 ? 'sent' : 'push_failed',
    ];
}

function vth_event_merge_alert_delivery(array $web, array $expo): array
{
    $sent = (int) ($web['sent'] ?? 0) + (int) ($expo['sent'] ?? 0);
    $subscribed = (int) ($web['subscribed'] ?? 0) + (int) ($expo['subscribed'] ?? 0);
    if ($sent > 0) {
        return ['sent' => $sent, 'subscribed' => $subscribed, 'reason' => 'sent'];
    }
    if ($subscribed < 1) {
        return ['sent' => 0, 'subscribed' => 0, 'reason' => 'no_subscription'];
    }
    $reason = (string) (($expo['subscribed'] ?? 0) > 0 ? ($expo['reason'] ?? 'push_failed') : ($web['reason'] ?? 'push_failed'));
    if ($reason !== 'push_not_configured' && $reason !== 'push_failed' && $reason !== 'no_subscription') {
        $reason = 'push_failed';
    }
    return ['sent' => 0, 'subscribed' => $subscribed, 'reason' => $reason];
}

function vth_event_push_end_notice(
    mysqli $conn,
    array $duty,
    string $title = 'Please end your duty',
    string $body = 'End this trip now. Time after this message is not counted.',
    string $tag = ''
): array
{
    $assignmentId = (int) ($duty['assignment_id'] ?? 0);
    $expo = vth_event_send_expo_alerts($conn, $assignmentId, $title, $body, $duty);
    $empty = ['sent' => 0, 'subscribed' => 0, 'reason' => 'no_subscription'];
    if ($assignmentId < 1) {
        return vth_event_merge_alert_delivery($empty, $expo);
    }
    $stmt = $conn->prepare(
        'SELECT id, endpoint, p256dh, auth_key, open_path FROM vth_event_driver_push WHERE assignment_id = ?'
    );
    $stmt->bind_param('i', $assignmentId);
    $stmt->execute();
    $res = $stmt->get_result();
    $subs = [];
    while ($row = $res->fetch_assoc()) {
        $subs[] = $row;
    }
    $stmt->close();
    $count = count($subs);
    if ($count < 1) {
        return vth_event_merge_alert_delivery($empty, $expo);
    }
    $subject = vth_event_secret('WEB_PUSH_VAPID_SUBJECT');
    $public = vth_event_secret('WEB_PUSH_VAPID_PUBLIC_KEY');
    $private = vth_event_secret('WEB_PUSH_VAPID_PRIVATE_KEY');
    if ($subject === '' || $public === '' || $private === '' || !vth_event_load_web_push()) {
        return vth_event_merge_alert_delivery(['sent' => 0, 'subscribed' => $count, 'reason' => 'push_not_configured'], $expo);
    }
    try {
        $webPush = new \Minishlink\WebPush\WebPush([
            'VAPID' => [
                'subject' => $subject,
                'publicKey' => $public,
                'privateKey' => $private,
            ],
        ]);
    } catch (Throwable $e) {
        return vth_event_merge_alert_delivery(['sent' => 0, 'subscribed' => $count, 'reason' => 'push_not_configured'], $expo);
    }
    $dutyId = (int) $duty['id'];
    if ($tag === '') {
        $tag = 'event-duty-end-' . $dutyId;
    }
    $queued = 0;
    foreach ($subs as $sub) {
        $path = (string) ($sub['open_path'] ?? '');
        if (!preg_match('#^/driver/register/[a-fA-F0-9]{16,128}$#', $path)) {
            continue;
        }
        $payload = json_encode([
            'title' => $title,
            'body' => $body,
            'url' => $path,
            'tag' => $tag,
        ], JSON_UNESCAPED_UNICODE);
        if ($payload === false) {
            continue;
        }
        try {
            $webPush->queueNotification(
                \Minishlink\WebPush\Subscription::create([
                    'endpoint' => $sub['endpoint'],
                    'keys' => [
                        'p256dh' => $sub['p256dh'],
                        'auth' => $sub['auth_key'],
                    ],
                ]),
                $payload
            );
            $queued++;
        } catch (Throwable $e) {
            continue;
        }
    }
    if ($queued < 1) {
        return vth_event_merge_alert_delivery(['sent' => 0, 'subscribed' => $count, 'reason' => 'push_failed'], $expo);
    }
    $sent = 0;
    try {
        foreach ($webPush->flush() as $report) {
            if ($report->isSuccess()) {
                $sent++;
                continue;
            }
            if (method_exists($report, 'isSubscriptionExpired') && $report->isSubscriptionExpired()) {
                $endpoint = $report->getEndpoint();
                $del = $conn->prepare('DELETE FROM vth_event_driver_push WHERE endpoint = ?');
                $del->bind_param('s', $endpoint);
                $del->execute();
                $del->close();
            }
        }
    } catch (Throwable $e) {
        return vth_event_merge_alert_delivery(
            ['sent' => $sent, 'subscribed' => $count, 'reason' => $sent > 0 ? 'sent' : 'push_failed'],
            $expo
        );
    }
    return vth_event_merge_alert_delivery(
        ['sent' => $sent, 'subscribed' => $count, 'reason' => $sent > 0 ? 'sent' : 'push_failed'],
        $expo
    );
}
