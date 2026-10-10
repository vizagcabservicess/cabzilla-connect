<?php
/**
 * Open Graph titles for WhatsApp / Facebook crawlers on event share and driver duty links.
 * Crawlers do not execute the SPA, so seo-handler.php uses this instead of the homepage meta.
 */

function vth_event_og_image(): string
{
    $root = rtrim((string) ($_SERVER['DOCUMENT_ROOT'] ?? ''), '/\\');
    $candidates = [
        ['https://vizagtaxihub.com/uploads/og-image.png', $root . '/uploads/og-image.png'],
        ['https://vizagtaxihub.com/og-image.png', $root . '/og-image.png'],
        ['https://vizagtaxihub.com/uploads/vizagtaxihub-logo.png', $root . '/uploads/vizagtaxihub-logo.png'],
    ];
    foreach ($candidates as [$url, $file]) {
        if ($file !== '/uploads/og-image.png' && is_file($file)) {
            return $url;
        }
    }
    return 'https://vizagtaxihub.com/uploads/vizagtaxihub-logo.png';
}

function vth_event_og_logo(): string
{
    return 'https://vizagtaxihub.com/uploads/vizagtaxihub-logo.png';
}

function vth_event_og_db(): ?mysqli
{
    $helpers = [
        __DIR__ . '/../common/db_helper.php',
        dirname(__DIR__, 3) . '/api/common/db_helper.php',
    ];
    foreach ($helpers as $path) {
        if (is_file($path)) {
            require_once $path;
            break;
        }
    }
    if (!function_exists('getDbConnectionWithRetry')) {
        return null;
    }
    try {
        $conn = getDbConnectionWithRetry(1, 100);
        return $conn instanceof mysqli ? $conn : null;
    } catch (Throwable $e) {
        return null;
    }
}

function vth_event_og_row(string $rawToken, string $type): ?array
{
    $conn = vth_event_og_db();
    if (!$conn) {
        return null;
    }
    $hash = hash('sha256', $rawToken);
    $sql = $type === 'driver'
        ? 'SELECT e.name, e.event_code, e.start_date, e.end_date, a.vehicle_type
           FROM vth_event_tokens t
           INNER JOIN vth_events e ON e.id = t.event_id
           LEFT JOIN vth_event_assignments a ON a.id = t.assignment_id
           WHERE t.token_hash = ? AND t.token_type = ? AND t.revoked_at IS NULL
             AND (t.expires_at IS NULL OR t.expires_at > NOW())
           LIMIT 1'
        : 'SELECT e.name, e.event_code, e.start_date, e.end_date
           FROM vth_event_tokens t
           INNER JOIN vth_events e ON e.id = t.event_id
           WHERE t.token_hash = ? AND t.token_type = ? AND t.revoked_at IS NULL
             AND (t.expires_at IS NULL OR t.expires_at > NOW())
           LIMIT 1';
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        return null;
    }
    $stmt->bind_param('ss', $hash, $type);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $row ?: null;
}

function vth_event_og_meta(string $requestedUrl): ?array
{
    $path = ltrim($requestedUrl, '/');
    $canonical = 'https://vizagtaxihub.com/' . $path;
    $image = vth_event_og_image();
    $token = '';
    $kind = '';
    if (preg_match('#^event/share/([A-Za-z0-9_-]+)#', $path, $m)) {
        $kind = 'event_share';
        $token = $m[1];
    } elseif (preg_match('#^driver/register/([A-Za-z0-9_-]+)#', $path, $m)) {
        $kind = 'driver';
        $token = $m[1];
    } else {
        return null;
    }

    $isShare = $kind === 'event_share';
    $title = $isShare ? 'Event Vehicle List | Vizag Taxi Hub' : 'Driver Duty | Vizag Taxi Hub';
    $description = $isShare
        ? 'View assigned vehicles, duty status, and live tracking for this Vizag Taxi Hub event.'
        : 'Complete driver registration and start duty for this Vizag Taxi Hub event.';
    $h1 = $isShare ? 'Event vehicle list' : 'Driver duty';

    $row = vth_event_og_row($token, $kind);
    if ($row) {
        $name = trim((string) ($row['name'] ?? ''));
        if ($name === '') {
            $name = 'Event';
        }
        if ($isShare) {
            $title = $name . ' | Event Vehicle List | Vizag Taxi Hub';
            $description = 'Live vehicle list, duty status, and tracking for ' . $name . '.';
            $h1 = $name;
        } else {
            $vehicle = trim((string) ($row['vehicle_type'] ?? ''));
            $vehicle = $vehicle !== '' ? ucwords(str_replace(['_', '-'], ' ', $vehicle)) : 'vehicle';
            $title = $name . ' | Driver Duty | Vizag Taxi Hub';
            $description = 'Register and start duty for ' . $vehicle . ' — ' . $name . '.';
            $h1 = $name . ' driver duty';
        }
    }

    return [
        'title' => $title,
        'description' => $description,
        'keywords' => 'Vizag Taxi Hub, event vehicles, driver duty',
        'canonical' => $canonical,
        'image' => $image,
        'logo' => vth_event_og_logo(),
        'h1' => $h1,
        'robots' => 'noindex, nofollow',
    ];
}
