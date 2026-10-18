<?php
require_once __DIR__ . '/lib.php';

vth_event_cors();
// Shared hotel Wi-Fi and mobile-carrier addresses must not block every driver.
vth_event_rate_limit('vth_event_driver_ip', 800, 60);

$conn = vth_event_conn();
vth_event_ensure_optional_columns($conn);
$body = vth_event_body();
$action = vth_event_action($body);
if ($action === '' && ($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
    $action = 'bootstrap';
}

$token = (string) ($body['token'] ?? $_GET['token'] ?? '');
$headers = function_exists('getallheaders') ? getallheaders() : [];
if ($token === '') {
    $token = (string) ($headers['X-Event-Driver-Token'] ?? $headers['x-event-driver-token'] ?? '');
}
if ($token !== '') {
    vth_event_rate_limit('vth_event_driver_' . substr(hash('sha256', $token), 0, 24), 120, 60);
}
$row = vth_event_lookup_token($conn, $token, 'driver');
if (!$row) {
    vth_event_error('This registration link is invalid or has expired.', 401);
}

$event = vth_event_get($conn, (int) $row['event_id']);
if (!$event) {
    vth_event_error('Event not found', 404);
}

$asgStmt = $conn->prepare(
    'SELECT a.*,
            COALESCE(ev.registration_number, v.vehicle_number) AS vehicle_number,
            COALESCE(ev.make, v.make) AS make,
            COALESCE(ev.model, v.model) AS model,
            dr.name AS driver_name, dr.phone AS driver_phone, dr.license_no
     FROM vth_event_assignments a
     LEFT JOIN vth_event_vehicles ev ON ev.id = a.event_vehicle_id
     LEFT JOIN fleet_vehicles v ON v.id = a.fleet_vehicle_id
     LEFT JOIN drivers dr ON dr.id = a.driver_id
     WHERE a.id = ?'
);
$asgId = (int) $row['assignment_id'];
$asgStmt->bind_param('i', $asgId);
$asgStmt->execute();
$asg = $asgStmt->get_result()->fetch_assoc();
$asgStmt->close();
if (!$asg) {
    vth_event_error('Assignment not found', 404);
}

switch ($action) {
    case 'bootstrap':
        vth_event_ok(vth_driver_bootstrap($conn, $event, $asg, $row));
        break;
    case 'register':
        vth_event_ok(vth_driver_register($conn, $event, $asg, $row, $body), 'Registration submitted successfully.');
        break;
    case 'start_duty':
        vth_event_ok(['duty' => vth_driver_start($conn, $event, $asg, $row, $body)], 'Duty started');
        break;
    case 'end_duty':
        vth_event_ok(['duty' => vth_driver_end($conn, $event, $asg, $row, $body)], 'Duty completed');
        break;
    case 'upload':
        vth_event_ok(['document' => vth_driver_upload($conn, $event, $asg, $row)], 'Uploaded');
        break;
    case 'ping_gps':
        vth_event_ok(vth_driver_ping_gps($conn, $asg, $body));
        break;
    case 'end_notices':
        vth_event_ok(['notices' => vth_driver_end_notices($conn, (int) $asg['id'])]);
        break;
    case 'ack_end_notice':
        vth_event_ok(vth_driver_ack_end($conn, $asg, $body));
        break;
    case 'mark_parking':
        vth_event_ok(vth_driver_mark_parking($conn, $asg, $body), 'Marked In Parking');
        break;
    case 'register_push':
        vth_event_ok(vth_driver_save_push($conn, $asg, $body), 'Alerts saved');
        break;
    case 'register_expo':
        vth_event_ok(vth_driver_save_expo($conn, $asg, $body), 'Phone alerts saved');
        break;
    default:
        vth_event_error('Unknown action');
}

function vth_driver_dates(mysqli $conn, int $assignmentId): array
{
    $stmt = $conn->prepare('SELECT duty_date FROM vth_event_assignment_dates WHERE assignment_id = ? ORDER BY duty_date');
    $stmt->bind_param('i', $assignmentId);
    $stmt->execute();
    $res = $stmt->get_result();
    $dates = [];
    while ($row = $res->fetch_assoc()) {
        $dates[] = $row['duty_date'];
    }
    $stmt->close();
    return $dates;
}

function vth_driver_duties(mysqli $conn, int $assignmentId): array
{
    $stmt = $conn->prepare(
        'SELECT d.*, e.name AS event_name, e.event_code
         FROM vth_event_duties d
         JOIN vth_events e ON e.id = d.event_id
         WHERE d.assignment_id = ?
         ORDER BY d.duty_date'
    );
    $stmt->bind_param('i', $assignmentId);
    $stmt->execute();
    $res = $stmt->get_result();
    $rows = [];
    while ($row = $res->fetch_assoc()) {
        $rows[] = $row;
    }
    $stmt->close();
    return vth_event_map_duty_rows($conn, $rows);
}

function vth_driver_bootstrap(mysqli $conn, array $event, array $asg, array $token): array
{
    $driverId = $asg['driver_id'] !== null ? (int) $asg['driver_id'] : null;
    $vehicleId = isset($asg['event_vehicle_id']) && $asg['event_vehicle_id'] !== null
        ? (int) $asg['event_vehicle_id']
        : ($asg['fleet_vehicle_id'] !== null ? (int) $asg['fleet_vehicle_id'] : null);
    $vehicleDocs = $vehicleId ? vth_event_doc_checklist($conn, 'vehicle', $vehicleId) : [];
    $needVehicleDocs = $vehicleId && (!isset($vehicleDocs['rc']) || !isset($vehicleDocs['insurance']));
    $docs = $driverId ? vth_event_doc_checklist($conn, 'driver', $driverId) : [];
    return [
        'event' => vth_event_format_public($event),
        'assignment' => [
            'id' => (int) $asg['id'],
            'vehicleType' => $asg['vehicle_type'],
            'vehicleTypeLabel' => vth_event_vehicle_type_label((string) $asg['vehicle_type']),
            'vehicleNumber' => $asg['vehicle_number'],
            'driverName' => $asg['driver_name'],
            'driverMobile' => $asg['driver_phone'],
            'licenseNo' => $asg['license_no'],
            'dates' => vth_driver_dates($conn, (int) $asg['id']),
            'reportingTime' => $asg['reporting_time'] ?: $event['default_reporting_time'],
            'reportingLocation' => $asg['reporting_location'] ?: $event['reporting_location'],
        ],
        'registered' => (bool) (isset($docs['driver_photo']) || isset($docs['dl_front']) || isset($docs['aadhaar'])),
        'documents' => $docs ?: (object) [],
        'driverPhoto' => null,
        'needVehicleDocuments' => $needVehicleDocs,
        'duties' => vth_driver_duties($conn, (int) $asg['id']),
        'gpsRequired' => (bool) $event['gps_required'],
    ];
}

function vth_driver_register(mysqli $conn, array $event, array $asg, array $token, array $body): array
{
    $name = trim((string) ($body['fullName'] ?? $body['name'] ?? $asg['driver_name'] ?? ''));
    $mobile = vth_event_validate_mobile((string) ($body['mobile'] ?? $asg['driver_phone'] ?? ''));
    $dl = vth_event_validate_dl((string) ($body['licenseNumber'] ?? $body['dlNumber'] ?? $asg['license_no'] ?? ''));
    $aadhaar = vth_event_validate_aadhaar((string) ($body['aadhaar'] ?? $body['aadhaarNumber'] ?? ''));
    if ($name === '' || !$mobile || !$dl || !$aadhaar) {
        vth_event_error('Full name, mobile, driving licence and Aadhaar are required');
    }
    $driverId = $asg['driver_id'] !== null ? (int) $asg['driver_id'] : null;
    if (!$driverId) {
        $find = $conn->prepare('SELECT id FROM drivers WHERE phone = ? LIMIT 1');
        $find->bind_param('s', $mobile);
        $find->execute();
        $found = $find->get_result()->fetch_assoc();
        $find->close();
        if ($found) {
            $driverId = (int) $found['id'];
            $u = $conn->prepare('UPDATE drivers SET name = ?, license_no = ? WHERE id = ?');
            $u->bind_param('ssi', $name, $dl, $driverId);
            $u->execute();
            $u->close();
        } else {
            $email = $mobile . '@event.vizagtaxihub.local';
            $status = 'available';
            $loc = 'Visakhapatnam';
            $ins = $conn->prepare('INSERT INTO drivers (name, phone, email, license_no, status, location) VALUES (?, ?, ?, ?, ?, ?)');
            $ins->bind_param('ssssss', $name, $mobile, $email, $dl, $status, $loc);
            $ins->execute();
            $driverId = (int) $conn->insert_id;
            $ins->close();
        }
        $aid = (int) $asg['id'];
        $link = $conn->prepare('UPDATE vth_event_assignments SET driver_id = ? WHERE id = ?');
        $link->bind_param('ii', $driverId, $aid);
        $link->execute();
        $link->close();
        $tok = $conn->prepare('UPDATE vth_event_tokens SET driver_id = ? WHERE id = ?');
        $tid = (int) $token['id'];
        $tok->bind_param('ii', $driverId, $tid);
        $tok->execute();
        $tok->close();
        $asg['driver_id'] = $driverId;
        vth_event_refresh_assignment_snapshots($conn, $asg, false);
    } else {
        $u = $conn->prepare('UPDATE drivers SET name = ?, phone = ?, license_no = ? WHERE id = ?');
        $u->bind_param('sssi', $name, $mobile, $dl, $driverId);
        $u->execute();
        $u->close();
        $asg['driver_id'] = $driverId;
        vth_event_refresh_assignment_snapshots($conn, $asg, true);
    }
    $alt = !empty($body['altMobile']) ? vth_event_validate_mobile((string) $body['altMobile']) : null;
    vth_event_upsert_driver_pii($conn, $driverId, $aadhaar, $alt, $body['address'] ?? null);

    foreach (['driver_photo', 'dl_front', 'dl_back', 'aadhaar', 'aadhaar_back'] as $kind) {
        if (!empty($_FILES[$kind]) && ($_FILES[$kind]['error'] ?? 1) === UPLOAD_ERR_OK) {
            $saved = vth_event_save_upload($_FILES[$kind], $kind);
            if (!empty($saved['error'])) {
                vth_event_error($saved['error']);
            }
            vth_event_insert_document($conn, (int) $event['id'], 'driver', $driverId, $kind, $saved, 'driver');
            vth_event_audit($conn, 'driver', $driverId, $kind . '_uploaded', 'document', $driverId, (int) $event['id'], null, ['docType' => $kind]);
        }
    }
    $needVehicle = empty($body['skipVehicleDocs']);
    $vehicleId = isset($asg['event_vehicle_id']) && $asg['event_vehicle_id'] !== null
        ? (int) $asg['event_vehicle_id']
        : ($asg['fleet_vehicle_id'] !== null ? (int) $asg['fleet_vehicle_id'] : null);
    if ($needVehicle && $vehicleId) {
        $existing = vth_event_doc_checklist($conn, 'vehicle', $vehicleId);
        foreach (['rc', 'rc_back', 'insurance', 'insurance_back', 'permit', 'fitness', 'pollution'] as $kind) {
            if (isset($existing[$kind])) {
                continue;
            }
            if (!empty($_FILES[$kind]) && ($_FILES[$kind]['error'] ?? 1) === UPLOAD_ERR_OK) {
                $saved = vth_event_save_upload($_FILES[$kind], $kind);
                if (empty($saved['error'])) {
                    vth_event_insert_document($conn, (int) $event['id'], 'vehicle', $vehicleId, $kind, $saved, 'driver');
                }
            }
        }
    }
    vth_event_audit($conn, 'driver', $driverId, 'driver_registered', 'driver', $driverId, (int) $event['id'], null, [
        'name' => $name,
        'mobile' => $mobile,
    ]);
    $asg['driver_name'] = $name;
    $asg['driver_phone'] = $mobile;
    $asg['license_no'] = $dl;
    return vth_driver_bootstrap($conn, $event, $asg, $token);
}

function vth_driver_upload(mysqli $conn, array $event, array $asg, array $token): array
{
    $file = $_FILES['file'] ?? $_FILES['image'] ?? null;
    if (!$file) {
        vth_event_error('File is required');
    }
    $docType = (string) ($_POST['docType'] ?? 'driver_photo');
    $saved = vth_event_save_upload($file, $docType);
    if (!empty($saved['error'])) {
        vth_event_error($saved['error']);
    }
    $ownerType = in_array($docType, ['rc', 'rc_back', 'insurance', 'insurance_back', 'permit', 'fitness', 'pollution'], true) ? 'vehicle' : 'driver';
    $vehicleId = isset($asg['event_vehicle_id']) && $asg['event_vehicle_id'] !== null
        ? (int) $asg['event_vehicle_id']
        : (int) ($asg['fleet_vehicle_id'] ?? 0);
    $ownerId = $ownerType === 'vehicle' ? $vehicleId : (int) $asg['driver_id'];
    if ($ownerId < 1) {
        vth_event_error('Complete registration before uploading this document');
    }
    $id = vth_event_insert_document($conn, (int) $event['id'], $ownerType, $ownerId, $docType, $saved, 'driver');
    return ['id' => $id, 'docType' => $docType];
}

function vth_driver_read_gps(array $body, string $prefix): array
{
    $lat = $body[$prefix . 'Lat'] ?? $body['lat'] ?? null;
    $lng = $body[$prefix . 'Lng'] ?? $body['lng'] ?? null;
    $acc = $body[$prefix . 'Accuracy'] ?? $body['accuracy'] ?? null;
    return [
        $lat !== null && $lat !== '' ? (float) $lat : null,
        $lng !== null && $lng !== '' ? (float) $lng : null,
        $acc !== null && $acc !== '' ? (float) $acc : null,
    ];
}

function vth_driver_start(mysqli $conn, array $event, array $asg, array $token, array $body): array
{
    $dutyId = (int) ($body['dutyId'] ?? 0);
    $stmt = $conn->prepare('SELECT * FROM vth_event_duties WHERE id = ? AND assignment_id = ?');
    $aid = (int) $asg['id'];
    $stmt->bind_param('ii', $dutyId, $aid);
    $stmt->execute();
    $duty = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$duty) {
        vth_event_error('Duty not found', 404);
    }
    $hasOpeningPhoto = vth_event_document_exists($conn, $duty['opening_photo_id'] ?? null);
    if ($duty['opening_km'] !== null && $hasOpeningPhoto) {
        vth_event_error('Opening reading already submitted');
    }
    $km = (int) ($body['openingKm'] ?? $body['km'] ?? 0);
    if ($km < 1) {
        vth_event_error('Opening KM is required');
    }
    $file = $_FILES['photo'] ?? $_FILES['image'] ?? $_FILES['file'] ?? null;
    if (!$file) {
        vth_event_error('Opening odometer photo is required');
    }
    $saved = vth_event_save_upload($file, 'opening_odometer');
    if (!empty($saved['error'])) {
        vth_event_error($saved['error']);
    }
    $photoId = vth_event_insert_document($conn, (int) $event['id'], 'duty', $dutyId, 'opening_odometer', $saved, 'driver');
    [$lat, $lng, $acc] = vth_driver_read_gps($body, 'opening');
    if ($event['gps_required'] && ($lat === null || $lng === null)) {
        vth_event_error('Location permission is required for this event');
    }
    $address = vth_event_reverse_geocode($lat, $lng);
    $ip = vth_event_ip();
    $upd = $conn->prepare(
        'UPDATE vth_event_duties
         SET opening_km = ?, opening_photo_id = ?, opening_at = NOW(),
             opening_lat = ?, opening_lng = ?, opening_gps_accuracy = ?, opening_ip = ?, opening_address = ?, status = \'in_progress\'
         WHERE id = ?'
    );
    $upd->bind_param('iidddssi', $km, $photoId, $lat, $lng, $acc, $ip, $address, $dutyId);
    $upd->execute();
    $upd->close();
    @$conn->query(
        'UPDATE vth_event_duties
         SET trip_seconds = 0, parking_seconds = 0, place_since = opening_at, duty_place = \'trip\'
         WHERE id = ' . (int) $dutyId
    );
    vth_event_place_span_switch($conn, $dutyId, 'trip');
    vth_event_audit($conn, 'driver', $asg['driver_id'] ?? null, 'opening_km_submitted', 'duty', $dutyId, (int) $event['id'], null, [
        'opening_km' => $km,
        'photo_id' => $photoId,
        'gps' => $lat !== null,
    ]);
    vth_event_audit($conn, 'driver', $asg['driver_id'] ?? null, 'opening_photo_submitted', 'duty', $dutyId, (int) $event['id'], null, ['photo_id' => $photoId]);
    $fresh = $conn->prepare('SELECT d.*, e.name AS event_name, e.event_code FROM vth_event_duties d JOIN vth_events e ON e.id = d.event_id WHERE d.id = ?');
    $fresh->bind_param('i', $dutyId);
    $fresh->execute();
    $row = $fresh->get_result()->fetch_assoc();
    $fresh->close();
    return vth_admin_duty_row($row, $conn);
}

function vth_driver_end(mysqli $conn, array $event, array $asg, array $token, array $body): array
{
    $dutyId = (int) ($body['dutyId'] ?? 0);
    $stmt = $conn->prepare('SELECT * FROM vth_event_duties WHERE id = ? AND assignment_id = ?');
    $aid = (int) $asg['id'];
    $stmt->bind_param('ii', $dutyId, $aid);
    $stmt->execute();
    $duty = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$duty) {
        vth_event_error('Duty not found', 404);
    }
    if ($duty['opening_km'] === null) {
        vth_event_error('Start duty before submitting closing kilometres');
    }
    $hasClosingPhoto = vth_event_document_exists($conn, $duty['closing_photo_id'] ?? null);
    if ($duty['closing_km'] !== null && $hasClosingPhoto) {
        vth_event_error('Closing reading already submitted');
    }
    $km = (int) ($body['closingKm'] ?? $body['km'] ?? 0);
    if ($km < 1) {
        vth_event_error('Closing KM is required');
    }
    if ($km < (int) $duty['opening_km']) {
        vth_event_error('Closing KM cannot normally be lower than opening KM. Contact VTH administrator if this is an error.');
    }
    $file = $_FILES['photo'] ?? $_FILES['image'] ?? $_FILES['file'] ?? null;
    if (!$file) {
        vth_event_error('Closing odometer photo is required');
    }
    $saved = vth_event_save_upload($file, 'closing_odometer');
    if (!empty($saved['error'])) {
        vth_event_error($saved['error']);
    }
    $photoId = vth_event_insert_document($conn, (int) $event['id'], 'duty', $dutyId, 'closing_odometer', $saved, 'driver');
    [$lat, $lng, $acc] = vth_driver_read_gps($body, 'closing');
    if ($event['gps_required'] && ($lat === null || $lng === null)) {
        vth_event_error('Location permission is required for this event');
    }
    $address = vth_event_reverse_geocode($lat, $lng);
    $total = $km - (int) $duty['opening_km'];
    $ip = vth_event_ip();
    $upd = $conn->prepare(
        'UPDATE vth_event_duties
         SET closing_km = ?, closing_photo_id = ?, closing_at = NOW(),
             closing_lat = ?, closing_lng = ?, closing_gps_accuracy = ?, closing_ip = ?, closing_address = ?,
             total_km = ?, status = \'completed\'
         WHERE id = ?'
    );
    $upd->bind_param('iidddssii', $km, $photoId, $lat, $lng, $acc, $ip, $address, $total, $dutyId);
    $upd->execute();
    $upd->close();
    vth_event_roll_place($conn, $dutyId);
    vth_event_audit($conn, 'driver', $asg['driver_id'] ?? null, 'closing_km_submitted', 'duty', $dutyId, (int) $event['id'], null, [
        'closing_km' => $km,
        'total_km' => $total,
    ]);
    vth_event_audit($conn, 'driver', $asg['driver_id'] ?? null, 'closing_photo_submitted', 'duty', $dutyId, (int) $event['id'], null, ['photo_id' => $photoId]);
    $fresh = $conn->prepare('SELECT d.*, e.name AS event_name, e.event_code FROM vth_event_duties d JOIN vth_events e ON e.id = d.event_id WHERE d.id = ?');
    $fresh->bind_param('i', $dutyId);
    $fresh->execute();
    $row = $fresh->get_result()->fetch_assoc();
    $fresh->close();
    return vth_admin_duty_row($row, $conn);
}

function vth_driver_ping_gps(mysqli $conn, array $asg, array $body): array
{
    $dutyId = (int) ($body['dutyId'] ?? 0);
    $aid = (int) $asg['id'];
    $stmt = $conn->prepare('SELECT * FROM vth_event_duties WHERE id = ? AND assignment_id = ?');
    $stmt->bind_param('ii', $dutyId, $aid);
    $stmt->execute();
    $duty = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$duty) {
        vth_event_error('Duty not found', 404);
    }
    if (empty($duty['opening_at']) || !empty($duty['closing_at'])) {
        vth_event_error('Tracking is only available while duty is in progress');
    }
    $clientId = vth_event_gps_client_id($body);
    if (!empty($body['release'])) {
        if ($clientId !== '') {
            $rel = $conn->prepare(
                'UPDATE vth_event_duties
                 SET last_gps_client = NULL
                 WHERE id = ? AND assignment_id = ? AND last_gps_client = ?'
            );
            $rel->bind_param('iis', $dutyId, $aid, $clientId);
            $rel->execute();
            $rel->close();
        }
        return ['accepted' => true, 'released' => true, 'dutyId' => $dutyId];
    }
    [$lat, $lng, $acc] = vth_driver_read_gps($body, 'track');
    if ($lat === null || $lng === null) {
        vth_event_error('Location is required');
    }
    $speed = isset($body['speed']) && $body['speed'] !== '' ? (float) $body['speed'] : null;
    $heading = isset($body['heading']) && $body['heading'] !== '' ? (float) $body['heading'] : null;
    $claim = !empty($body['claim']);
    return vth_event_track_ping($conn, $duty, $lat, $lng, $acc, $speed, $heading, $clientId, $claim);
}

function vth_driver_end_notices(mysqli $conn, int $assignmentId): array
{
    $stmt = $conn->prepare(
        'SELECT id, status, opening_at, closing_at, end_requested_at, end_request_seen_at, end_request_nonce,
                duty_place, parking_prompt_at, parking_prompt_nonce, paused_seconds
         FROM vth_event_duties WHERE assignment_id = ?'
    );
    $stmt->bind_param('i', $assignmentId);
    $stmt->execute();
    $res = $stmt->get_result();
    $out = [];
    while ($row = $res->fetch_assoc()) {
        $out[] = [
            'id' => (int) $row['id'],
            'status' => $row['status'],
            'openingAt' => $row['opening_at'],
            'closingAt' => $row['closing_at'],
            'endRequestedAt' => $row['end_requested_at'],
            'endRequestSeenAt' => $row['end_request_seen_at'],
            'endRequestNonce' => $row['end_request_nonce'],
            'pausedSeconds' => isset($row['paused_seconds']) ? (int) $row['paused_seconds'] : 0,
            'dutyPlace' => (($row['duty_place'] ?? '') === 'parking') ? 'parking' : 'trip',
            'parkingPromptAt' => $row['parking_prompt_at'] ?? null,
            'parkingPromptNonce' => $row['parking_prompt_nonce'] ?? null,
        ];
    }
    $stmt->close();
    return $out;
}

function vth_driver_ack_end(mysqli $conn, array $asg, array $body): array
{
    $dutyId = (int) ($body['dutyId'] ?? 0);
    $aid = (int) $asg['id'];
    $stmt = $conn->prepare(
        'UPDATE vth_event_duties
         SET end_request_seen_at = COALESCE(end_request_seen_at, NOW())
         WHERE id = ? AND assignment_id = ? AND end_requested_at IS NOT NULL'
    );
    $stmt->bind_param('ii', $dutyId, $aid);
    $stmt->execute();
    $seen = $stmt->affected_rows >= 0;
    $stmt->close();
    return ['seen' => $seen, 'dutyId' => $dutyId];
}

function vth_driver_mark_parking(mysqli $conn, array $asg, array $body): array
{
    $dutyId = (int) ($body['dutyId'] ?? 0);
    $aid = (int) $asg['id'];
    if ($dutyId < 1) {
        vth_event_error('Duty not found', 404);
    }
    $stmt = $conn->prepare(
        'SELECT id, status, opening_at, closing_at FROM vth_event_duties WHERE id = ? AND assignment_id = ?'
    );
    $stmt->bind_param('ii', $dutyId, $aid);
    $stmt->execute();
    $duty = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$duty) {
        vth_event_error('Duty not found', 404);
    }
    if (($duty['status'] ?? '') !== 'in_progress' || empty($duty['opening_at']) || !empty($duty['closing_at'])) {
        vth_event_error('In Parking is available only while the duty is in progress');
    }
    vth_event_place_span_switch($conn, $dutyId, 'parking');
    vth_event_roll_place($conn, $dutyId);
    $upd = $conn->prepare(
        'UPDATE vth_event_duties
         SET duty_place = \'parking\', parking_prompt_nonce = NULL, place_since = NOW()
         WHERE id = ? AND assignment_id = ?'
    );
    $upd->bind_param('ii', $dutyId, $aid);
    $upd->execute();
    $upd->close();
    return ['dutyId' => $dutyId, 'dutyPlace' => 'parking'];
}

function vth_driver_save_push(mysqli $conn, array $asg, array $body): array
{
    $endpoint = trim((string) ($body['endpoint'] ?? ''));
    $keys = is_array($body['keys'] ?? null) ? $body['keys'] : [];
    $p256 = trim((string) ($keys['p256dh'] ?? ''));
    $auth = trim((string) ($keys['auth'] ?? ''));
    $path = trim((string) ($body['openPath'] ?? ''));
    if (!preg_match('#^https://#', $endpoint) || strlen($endpoint) > 2000 || $p256 === '' || $auth === '' || strlen($p256) > 255 || strlen($auth) > 255) {
        vth_event_error('Invalid notification subscription');
    }
    if (!preg_match('#^/driver/register/[a-fA-F0-9]{16,128}$#', $path)) {
        vth_event_error('Invalid duty link');
    }
    $aid = (int) $asg['id'];
    $stmt = $conn->prepare(
        'INSERT INTO vth_event_driver_push (assignment_id, endpoint, p256dh, auth_key, open_path)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            assignment_id = VALUES(assignment_id),
            p256dh = VALUES(p256dh),
            auth_key = VALUES(auth_key),
            open_path = VALUES(open_path)'
    );
    $stmt->bind_param('issss', $aid, $endpoint, $p256, $auth, $path);
    $stmt->execute();
    $stmt->close();
    return ['saved' => true];
}

function vth_driver_save_expo(mysqli $conn, array $asg, array $body): array
{
    $expo = trim((string) ($body['expoToken'] ?? ''));
    if (!preg_match('/^(Exponent|Expo)PushToken\[[^\]]+\]$/', $expo) || strlen($expo) > 255) {
        vth_event_error('Invalid phone alert token');
    }
    vth_event_ensure_expo_table($conn);
    $aid = (int) $asg['id'];
    $stmt = $conn->prepare(
        'INSERT INTO vth_event_driver_expo (assignment_id, expo_token)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE assignment_id = VALUES(assignment_id), updated_at = CURRENT_TIMESTAMP'
    );
    if (!$stmt) {
        vth_event_error('Could not save phone alerts');
    }
    $stmt->bind_param('is', $aid, $expo);
    $stmt->execute();
    $stmt->close();
    return ['saved' => true];
}
