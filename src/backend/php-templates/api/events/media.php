<?php
require_once __DIR__ . '/lib.php';

vth_event_cors(false);
$conn = vth_event_conn();
$id = (int) ($_GET['id'] ?? 0);
if ($id < 1) {
    vth_event_error('Document id required', 400);
}

$stmt = $conn->prepare('SELECT * FROM vth_event_documents WHERE id = ?');
$stmt->bind_param('i', $id);
$stmt->execute();
$doc = $stmt->get_result()->fetch_assoc();
$stmt->close();
if (!$doc) {
    vth_event_error('Document not found', 404);
}

$allowed = false;
$headers = function_exists('getallheaders') ? getallheaders() : [];
$authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
if ($authHeader && stripos($authHeader, 'Bearer ') === 0) {
    $payload = verifyJwtToken(trim(substr($authHeader, 7)));
    if ($payload && in_array($payload['role'] ?? '', ['admin', 'super_admin'], true)) {
        $allowed = true;
    }
}

$driverToken = (string) ($_GET['driverToken'] ?? $headers['X-Event-Driver-Token'] ?? '');
if (!$allowed && $driverToken !== '') {
    $tok = vth_event_lookup_token($conn, $driverToken, 'driver');
    if ($tok) {
        $sensitive = in_array($doc['doc_type'], VTH_EVENT_SENSITIVE_DOCS, true);
        if ($doc['owner_type'] === 'driver' && (int) $doc['owner_id'] === (int) $tok['driver_id']) {
            $allowed = true;
        } elseif ($doc['owner_type'] === 'duty') {
            $chk = $conn->prepare('SELECT assignment_id FROM vth_event_duties WHERE id = ?');
            $oid = (int) $doc['owner_id'];
            $chk->bind_param('i', $oid);
            $chk->execute();
            $duty = $chk->get_result()->fetch_assoc();
            $chk->close();
            if ($duty && (int) $duty['assignment_id'] === (int) $tok['assignment_id']) {
                $allowed = true;
            }
        } elseif (!$sensitive && $doc['owner_type'] === 'vehicle') {
            $asg = $conn->prepare('SELECT event_vehicle_id, fleet_vehicle_id FROM vth_event_assignments WHERE id = ?');
            $aid = (int) $tok['assignment_id'];
            $asg->bind_param('i', $aid);
            $asg->execute();
            $a = $asg->get_result()->fetch_assoc();
            $asg->close();
            $ownerId = (int) $doc['owner_id'];
            if ($a && ((int) ($a['event_vehicle_id'] ?? 0) === $ownerId || (int) ($a['fleet_vehicle_id'] ?? 0) === $ownerId)) {
                $allowed = true;
            }
        }
    }
}

$shareToken = (string) ($_GET['shareToken'] ?? $headers['X-Event-Share-Token'] ?? '');
if (!$allowed && $shareToken !== '') {
    $tok = vth_event_lookup_token($conn, $shareToken, 'event_share');
    if ($tok) {
        $eventId = (int) $tok['event_id'];
        if (in_array($doc['doc_type'], ['opening_odometer', 'closing_odometer'], true)) {
            $chk = $conn->prepare('SELECT event_id FROM vth_event_duties WHERE id = ?');
            $oid = (int) $doc['owner_id'];
            $chk->bind_param('i', $oid);
            $chk->execute();
            $duty = $chk->get_result()->fetch_assoc();
            $chk->close();
            if ($duty && (int) $duty['event_id'] === $eventId) {
                $allowed = true;
            }
        } elseif ($doc['doc_type'] === 'driver_photo' && $doc['owner_type'] === 'driver') {
            $chk = $conn->prepare(
                'SELECT id FROM vth_event_assignments WHERE event_id = ? AND driver_id = ? LIMIT 1'
            );
            $did = (int) $doc['owner_id'];
            $chk->bind_param('ii', $eventId, $did);
            $chk->execute();
            $asg = $chk->get_result()->fetch_assoc();
            $chk->close();
            if ($asg) {
                $allowed = true;
            }
        }
    }
}

if (!$allowed) {
    vth_event_error('Forbidden', 403);
}

$payload = vth_event_media_payload($doc);
if (($_GET['format'] ?? '') === 'json') {
    vth_event_ok($payload);
}

$bytes = base64_decode($payload['data'], true);
if ($bytes === false) {
    vth_event_error('File missing', 404);
}
$mime = $payload['mime'];
$name = $payload['name'];
if (function_exists('header_remove')) {
    header_remove('Content-Type');
}
header('Content-Type: ' . $mime);
header('Content-Length: ' . strlen($bytes));
header('X-Content-Type-Options: nosniff');
header('Cache-Control: ' . (str_starts_with($mime, 'image/') ? 'private, max-age=86400' : 'private, no-store'));
header('Content-Disposition: inline; filename="' . $name . '"');
echo $bytes;
exit;
