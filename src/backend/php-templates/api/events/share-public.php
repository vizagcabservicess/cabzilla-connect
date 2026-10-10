<?php
require_once __DIR__ . '/lib.php';

vth_event_cors();
vth_event_rate_limit('vth_event_share', 60, 60);

$conn = vth_event_conn();
vth_event_ensure_optional_columns($conn);
$body = vth_event_body();
$token = (string) ($_GET['token'] ?? ($body['token'] ?? ''));
$headers = function_exists('getallheaders') ? getallheaders() : [];
if ($token === '') {
    $token = (string) ($headers['X-Event-Share-Token'] ?? $headers['x-event-share-token'] ?? '');
}
$row = vth_event_lookup_token($conn, $token, 'event_share');
if (!$row) {
    vth_event_error('This event share link is invalid or has been revoked.', 401);
}
$event = vth_event_get($conn, (int) $row['event_id']);
if (!$event) {
    vth_event_error('Event not found', 404);
}

$date = (string) ($_GET['date'] ?? ($body['date'] ?? ''));
if ($date === '') {
    $today = date('Y-m-d');
    if ($today >= $event['start_date'] && $today <= $event['end_date']) {
        $date = $today;
    } else {
        $date = $event['start_date'];
    }
}

$eid = (int) $event['id'];
$action = (string) ($_GET['action'] ?? ($body['action'] ?? ''));
if ($action === 'tracking') {
    vth_event_ok([
        'selectedDate' => $date,
        'vehicles' => vth_event_track_list($conn, $eid, $date),
    ]);
}
if ($action === 'request_end') {
    $dutyId = (int) ($body['dutyId'] ?? $_GET['dutyId'] ?? 0);
    vth_event_ok(vth_event_request_driver_end($conn, $dutyId, 'share', $eid), 'Driver asked to end the duty');
}
if ($action === 'set_place') {
    $dutyId = (int) ($body['dutyId'] ?? 0);
    $place = (string) ($body['place'] ?? '');
    vth_event_ok(vth_event_set_duty_place($conn, $dutyId, $place, $eid), 'Vehicle place updated');
}

$dates = [];
$ds = $conn->prepare(
    'SELECT DISTINCT duty_date FROM vth_event_duties
     WHERE event_id = ? AND status <> \'cancelled\'
     ORDER BY duty_date'
);
$ds->bind_param('i', $eid);
$ds->execute();
$dres = $ds->get_result();
while ($d = $dres->fetch_assoc()) {
    $dates[] = $d['duty_date'];
}
$ds->close();

$stmt = $conn->prepare(
    'SELECT d.*, e.name AS event_name, e.event_code
     FROM vth_event_duties d
     JOIN vth_events e ON e.id = d.event_id
     WHERE d.event_id = ? AND d.duty_date = ? AND d.status <> \'cancelled\'
     ORDER BY d.vehicle_type, d.vehicle_reg_snapshot, d.id'
);
$stmt->bind_param('is', $eid, $date);
$stmt->execute();
$res = $stmt->get_result();
$rawRows = [];
while ($r = $res->fetch_assoc()) {
    $rawRows[] = $r;
}
$stmt->close();
$duties = vth_event_map_duty_rows($conn, $rawRows);
$missingAsg = [];
foreach ($rawRows as $i => $r) {
    $driverId = (int) ($duties[$i]['driverId'] ?? $r['driver_id'] ?? 0);
    $assignmentId = (int) ($duties[$i]['assignmentId'] ?? $r['assignment_id'] ?? 0);
    if ($driverId < 1 && $assignmentId > 0) {
        $missingAsg[$assignmentId] = $assignmentId;
    }
}
$asgDrivers = [];
$asgSql = vth_event_id_sql($missingAsg);
if ($asgSql !== '') {
    $asgRes = $conn->query("SELECT id, driver_id FROM vth_event_assignments WHERE id IN ($asgSql)");
    if ($asgRes) {
        while ($asg = $asgRes->fetch_assoc()) {
            $asgDrivers[(int) $asg['id']] = $asg['driver_id'] !== null ? (int) $asg['driver_id'] : 0;
        }
    }
}
$photoDriverIds = [];
foreach ($rawRows as $i => $r) {
    $driverId = (int) ($duties[$i]['driverId'] ?? $r['driver_id'] ?? 0);
    if ($driverId < 1) {
        $assignmentId = (int) ($duties[$i]['assignmentId'] ?? $r['assignment_id'] ?? 0);
        $driverId = $asgDrivers[$assignmentId] ?? 0;
    }
    if ($driverId > 0) {
        $photoDriverIds[] = $driverId;
    }
}
$photoDocs = vth_event_doc_checklists($conn, 'driver', $photoDriverIds);
$driverPhones = vth_event_driver_phones($conn, $photoDriverIds);
$vehicles = [];
foreach ($rawRows as $i => $r) {
    $duty = $duties[$i];
    $driverId = (int) ($duty['driverId'] ?? $r['driver_id'] ?? 0);
    $assignmentId = (int) ($duty['assignmentId'] ?? $r['assignment_id'] ?? 0);
    if ($driverId < 1 && $assignmentId > 0) {
        $driverId = $asgDrivers[$assignmentId] ?? 0;
    }
    $photoId = $driverId > 0 && isset($photoDocs[$driverId]['driver_photo']['id'])
        ? (int) $photoDocs[$driverId]['driver_photo']['id']
        : null;
    $vehicleNumber = trim((string) ($duty['vehicleNumber'] ?? ''));
    $driverName = trim((string) ($duty['driverName'] ?? ''));
    if (!vth_event_share_row_assigned($vehicleNumber, $driverName)) {
        continue;
    }
    $liveMobile = $driverId > 0 ? trim((string) ($driverPhones[$driverId] ?? '')) : '';
    $vehicles[] = [
        'vehicleType' => $duty['vehicleTypeLabel'] ?: $duty['vehicleType'],
        'vehicleNumber' => $vehicleNumber,
        'driverName' => $driverName,
        'driverMobile' => $liveMobile !== '' ? $liveMobile : ($duty['driverMobile'] ?: ''),
        'driverPhotoId' => $photoId,
        'driverPhoto' => null,
        'reportingTime' => $duty['reportingTime'],
        'reportingLocation' => $duty['reportingLocation'],
        'status' => $duty['status'],
        'openingKm' => $duty['openingKm'],
        'closingKm' => $duty['closingKm'],
        'totalKm' => $duty['totalKm'],
        'openingPhotoId' => $duty['openingPhotoId'],
        'closingPhotoId' => $duty['closingPhotoId'],
        'dutyId' => $duty['id'],
        'dutySlipNo' => $duty['dutySlipNo'],
        'openingAt' => $duty['openingAt'],
        'closingAt' => $duty['closingAt'],
        'endRequestedAt' => $duty['endRequestedAt'] ?? null,
        'endRequestSeenAt' => $duty['endRequestSeenAt'] ?? null,
        'dutyPlace' => ($duty['dutyPlace'] ?? '') === 'parking' ? 'parking' : 'trip',
        'parkingAsked' => ($duty['dutyPlace'] ?? '') !== 'parking' && !empty($duty['parkingPromptNonce']),
        'openingGps' => $duty['openingGps'],
        'closingGps' => $duty['closingGps'],
    ];
}

vth_event_ok([
    'event' => vth_event_format_public($event),
    'dates' => $dates,
    'selectedDate' => $date,
    'stats' => vth_event_share_stats($vehicles, $date),
    'vehicles' => $vehicles,
]);
