<?php
/**
 * Web app manifest for one driver duty link or one event-manager link.
 * start_url is that page, so Add to Home Screen does not open the public site.
 */
header('Content-Type: application/manifest+json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

$start = (string) ($_GET['start'] ?? '');
if (!preg_match('#^/(driver/register|event/share)/[a-fA-F0-9]{16,128}$#', $start)) {
    http_response_code(400);
    echo '{}';
    exit;
}

$name = preg_replace('/[^A-Za-z0-9 ._-]+/', '', (string) ($_GET['name'] ?? '')) ?? '';
$name = trim(substr($name, 0, 40));
if ($name === '') {
    $name = 'Vizag Taxi Hub';
}
$short = preg_replace('/[^A-Za-z0-9 ]+/', '', (string) ($_GET['short'] ?? '')) ?? '';
$short = trim(substr($short, 0, 12));
if ($short === '') {
    $short = 'VTH';
}

$host = (string) ($_SERVER['HTTP_HOST'] ?? '');
$local = (bool) preg_match('/^(localhost|127\.0\.0\.1)(:\d+)?$/', $host);
$site = (bool) preg_match('/(^|\.)vizagtaxihub\.com$/i', $host);
if ($local || $site) {
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    $origin = ($https || $site ? 'https' : 'http') . '://' . $host;
} else {
    $origin = 'https://vizagtaxihub.com';
}

$icon = $origin . '/uploads/vizagtaxihub-logo.png';
echo json_encode([
    'id' => $start,
    'name' => $name,
    'short_name' => $short,
    'start_url' => $start,
    'scope' => '/',
    'display' => 'standalone',
    'background_color' => '#f3f6fb',
    'theme_color' => '#2f6bff',
    'icons' => [
        ['src' => $icon, 'sizes' => '192x192', 'type' => 'image/png', 'purpose' => 'any'],
        ['src' => $icon, 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'any'],
    ],
], JSON_UNESCAPED_SLASHES);
