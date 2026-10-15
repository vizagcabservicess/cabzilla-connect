<?php
require_once __DIR__ . '/../events/lib.php';

vth_event_cors();
$admin = vth_event_require_admin();
$conn = vth_event_conn();
vth_event_ensure_optional_columns($conn);

$body = vth_event_body();
$action = vth_event_action($body);
if ($action === '' && ($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
    $action = 'list';
}

switch ($action) {
    case 'list':
        $eventId = (int) ($body['eventId'] ?? $_GET['eventId'] ?? 0);
        vth_event_ok(['assignments' => vth_asg_list($conn, $eventId)]);
        break;
    case 'create':
        vth_event_ok(['assignment' => vth_asg_create($conn, $admin, $body)], 'Assignment saved');
        break;
    case 'update':
        vth_event_ok(['assignment' => vth_asg_update($conn, $admin, $body)], 'Assignment updated');
        break;
    case 'set_serial':
        vth_event_ok(['assignment' => vth_asg_set_serial($conn, $admin, $body)], 'Serial number saved');
        break;
    case 'delete':
        vth_asg_delete($conn, $admin, (int) ($body['id'] ?? 0));
        vth_event_ok([], 'Assignment deleted');
        break;
    case 'replace':
        vth_event_ok(['assignment' => vth_asg_replace($conn, $admin, $body)], 'Replacement created');
        break;
    case 'expand_requirement':
        vth_event_ok(vth_asg_expand_requirement($conn, $admin, $body), 'Requirement expanded');
        break;
    case 'download_profile':
        vth_asg_download_profile($conn, (int) ($body['id'] ?? $_GET['id'] ?? 0));
        break;
    default:
        vth_event_error('Unknown action');
}

function vth_asg_ensure_serial(mysqli $conn): bool
{
    static $has = null;
    if ($has !== null) {
        return $has;
    }
    $col = @$conn->query("SHOW COLUMNS FROM `vth_event_assignments` LIKE 'serial_no'");
    if ($col instanceof mysqli_result && $col->num_rows > 0) {
        $has = true;
        return true;
    }
    try {
        $added = @$conn->query('ALTER TABLE vth_event_assignments ADD COLUMN serial_no INT UNSIGNED NULL');
    } catch (Throwable $e) {
        $added = false;
    }
    if ($added) {
        $has = true;
        return true;
    }
    $col = @$conn->query("SHOW COLUMNS FROM `vth_event_assignments` LIKE 'serial_no'");
    $has = $col instanceof mysqli_result && $col->num_rows > 0;
    return $has;
}

function vth_asg_set_serial(mysqli $conn, array $admin, array $body): array
{
    if (!vth_asg_ensure_serial($conn)) {
        vth_event_error('Serial number could not be saved');
    }
    $id = (int) ($body['id'] ?? 0);
    $old = vth_asg_get($conn, $id);
    if (!$old) {
        vth_event_error('Assignment not found', 404);
    }
    $raw = $body['serialNo'] ?? null;
    if ($raw === null || $raw === '') {
        $stmt = $conn->prepare('UPDATE vth_event_assignments SET serial_no = NULL WHERE id = ?');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();
    } else {
        $serial = (int) $raw;
        if ($serial < 1 || $serial > 9999) {
            vth_event_error('Enter a serial number from 1 to 9999');
        }
        $stmt = $conn->prepare('UPDATE vth_event_assignments SET serial_no = ? WHERE id = ?');
        $stmt->bind_param('ii', $serial, $id);
        $stmt->execute();
        $stmt->close();
    }
    vth_event_audit($conn, 'admin', $admin['user_id'] ?? null, 'assignment_serial', 'assignment', $id, (int) $old['event_id'], [
        'serial_no' => $old['serial_no'] ?? null,
    ], [
        'serial_no' => ($raw === null || $raw === '') ? null : (int) $raw,
    ]);
    $list = vth_asg_list($conn, (int) $old['event_id']);
    foreach ($list as $item) {
        if ($item['id'] === $id) {
            return $item;
        }
    }
    return ['id' => $id];
}

function vth_asg_get(mysqli $conn, int $id): ?array
{
    $stmt = $conn->prepare('SELECT * FROM vth_event_assignments WHERE id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $row ?: null;
}

function vth_asg_list(mysqli $conn, int $eventId): array
{
    if ($eventId < 1) {
        vth_event_error('eventId is required');
    }
    $order = vth_asg_ensure_serial($conn)
        ? '(a.serial_no IS NULL), a.serial_no, a.status, a.vehicle_type, a.id'
        : 'a.status, a.vehicle_type, a.id';
    $sql = 'SELECT a.*,
            COALESCE(ev.registration_number, v.vehicle_number) AS vehicle_number,
            COALESCE(ev.make, v.make) AS make,
            COALESCE(ev.model, v.model) AS model,
            COALESCE(ev.owner_name, v.owner_name) AS owner_name,
            COALESCE(ev.owner_mobile, v.owner_mobile) AS owner_mobile,
            dr.name AS driver_name, dr.phone AS driver_phone, dr.license_no,
            COALESCE(pii.aadhaar_last4, dr.aadhaar_last4) AS aadhaar_last4
            FROM vth_event_assignments a
            LEFT JOIN vth_event_vehicles ev ON ev.id = a.event_vehicle_id
            LEFT JOIN fleet_vehicles v ON v.id = a.fleet_vehicle_id
            LEFT JOIN drivers dr ON dr.id = a.driver_id
            LEFT JOIN vth_event_driver_pii pii ON pii.driver_id = a.driver_id
            WHERE a.event_id = ?
            ORDER BY ' . $order;
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('i', $eventId);
    $stmt->execute();
    $res = $stmt->get_result();
    $rows = [];
    while ($row = $res->fetch_assoc()) {
        $rows[] = $row;
    }
    $stmt->close();
    $assignmentIds = [];
    $driverIds = [];
    $vehicleIds = [];
    foreach ($rows as $row) {
        $assignmentIds[] = (int) $row['id'];
        if ($row['driver_id'] !== null) {
            $driverIds[] = (int) $row['driver_id'];
        }
        $eventVehicleId = isset($row['event_vehicle_id']) && $row['event_vehicle_id'] !== null
            ? (int) $row['event_vehicle_id'] : 0;
        $fleetVehicleId = $row['fleet_vehicle_id'] !== null ? (int) $row['fleet_vehicle_id'] : 0;
        $vehicleId = $eventVehicleId ?: $fleetVehicleId;
        if ($vehicleId) {
            $vehicleIds[] = $vehicleId;
        }
    }
    $datesByAssignment = [];
    $assignmentSql = vth_event_id_sql($assignmentIds);
    if ($assignmentSql !== '') {
        $dres = $conn->query("SELECT assignment_id, duty_date FROM vth_event_assignment_dates WHERE assignment_id IN ($assignmentSql) ORDER BY duty_date");
        if ($dres) {
            while ($d = $dres->fetch_assoc()) {
                $datesByAssignment[(int) $d['assignment_id']][] = $d['duty_date'];
            }
        }
    }
    $tokens = [];
    if ($assignmentSql !== '') {
        $tres = $conn->query(
            "SELECT assignment_id, id, created_at FROM vth_event_tokens
             WHERE token_type = 'driver' AND revoked_at IS NULL AND assignment_id IN ($assignmentSql)
             ORDER BY id DESC"
        );
        if ($tres) {
            while ($tok = $tres->fetch_assoc()) {
                $aid = (int) $tok['assignment_id'];
                if (!isset($tokens[$aid])) {
                    $tokens[$aid] = $tok;
                }
            }
        }
    }
    $driverDocs = vth_event_doc_checklists($conn, 'driver', $driverIds);
    $vehicleDocs = vth_event_doc_checklists($conn, 'vehicle', $vehicleIds);
    $out = [];
    foreach ($rows as $row) {
        $aid = (int) $row['id'];
        $eventVehicleId = isset($row['event_vehicle_id']) && $row['event_vehicle_id'] !== null
            ? (int) $row['event_vehicle_id'] : null;
        $fleetVehicleId = $row['fleet_vehicle_id'] !== null ? (int) $row['fleet_vehicle_id'] : null;
        $vehicleId = $eventVehicleId ?: $fleetVehicleId;
        $driverId = $row['driver_id'] !== null ? (int) $row['driver_id'] : 0;
        $tok = $tokens[$aid] ?? null;
        $out[] = [
            'id' => $aid,
            'eventId' => (int) $row['event_id'],
            'requirementGroupId' => $row['requirement_group_id'] !== null ? (int) $row['requirement_group_id'] : null,
            'vehicleId' => $vehicleId,
            'driverId' => $row['driver_id'] !== null ? (int) $row['driver_id'] : null,
            'vehicleType' => $row['vehicle_type'],
            'vehicleTypeLabel' => vth_event_vehicle_type_label((string) $row['vehicle_type']),
            'vehicleNumber' => $row['vehicle_number'],
            'make' => $row['make'],
            'model' => $row['model'],
            'ownerName' => $row['owner_name'],
            'ownerMobile' => $row['owner_mobile'],
            'driverName' => $row['driver_name'],
            'driverMobile' => $row['driver_phone'],
            'licenseNo' => $row['license_no'],
            'aadhaarMasked' => !empty($row['aadhaar_last4']) ? ('XXXX XXXX ' . $row['aadhaar_last4']) : null,
            'passengerCount' => $row['passenger_count'] !== null ? (int) $row['passenger_count'] : null,
            'reportingTime' => $row['reporting_time'],
            'reportingLocation' => $row['reporting_location'],
            'notes' => $row['notes'],
            'serialNo' => isset($row['serial_no']) && $row['serial_no'] !== null ? (int) $row['serial_no'] : null,
            'status' => $row['status'],
            'replacedFromAssignmentId' => $row['replaced_from_assignment_id'] !== null ? (int) $row['replaced_from_assignment_id'] : null,
            'dates' => $datesByAssignment[$aid] ?? [],
            'driverDocuments' => $driverId && !empty($driverDocs[$driverId]) ? $driverDocs[$driverId] : new stdClass(),
            'vehicleDocuments' => $vehicleId && !empty($vehicleDocs[$vehicleId]) ? $vehicleDocs[$vehicleId] : new stdClass(),
            'hasDriverLink' => (bool) $tok,
            'driverLinkCreatedAt' => $tok['created_at'] ?? null,
        ];
    }
    return $out;
}

function vth_asg_create(mysqli $conn, array $admin, array $body): array
{
    $eventId = (int) ($body['eventId'] ?? 0);
    $event = vth_event_get($conn, $eventId);
    if (!$event) {
        vth_event_error('Event not found', 404);
    }
    $type = (string) ($body['vehicleType'] ?? 'other');
    if (!in_array($type, VTH_EVENT_VEHICLE_TYPES, true)) {
        $type = 'other';
    }
    $vehicleId = isset($body['vehicleId']) && $body['vehicleId'] !== '' && $body['vehicleId'] !== null
        ? (int) $body['vehicleId'] : null;
    if ($vehicleId) {
        $own = $conn->prepare('SELECT id FROM vth_event_vehicles WHERE id = ? AND event_id = ? LIMIT 1');
        $own->bind_param('ii', $vehicleId, $eventId);
        $own->execute();
        if (!$own->get_result()->fetch_assoc()) {
            $own->close();
            vth_event_error('Select a vehicle that belongs to this event');
        }
        $own->close();
    }
    $driverId = isset($body['driverId']) && $body['driverId'] !== '' && $body['driverId'] !== null
        ? (int) $body['driverId'] : null;
    $pax = isset($body['passengerCount']) && $body['passengerCount'] !== '' ? (int) $body['passengerCount'] : null;
    $time = substr((string) ($body['reportingTime'] ?? $event['default_reporting_time']), 0, 5);
    $loc = trim((string) ($body['reportingLocation'] ?? $event['reporting_location'] ?? '')) ?: null;
    $notes = trim((string) ($body['notes'] ?? '')) ?: null;
    $groupId = isset($body['requirementGroupId']) ? (int) $body['requirementGroupId'] : null;
    $dates = $body['dates'] ?? [];
    if (!is_array($dates)) {
        $dates = [];
    }

    $fleetVehicleId = null;
    $groupId = $groupId ?: null;
    $vehicleId = $vehicleId ?: null;
    $driverId = $driverId ?: null;
    $pax = $pax ?: null;
    $stmt = $conn->prepare(
        'INSERT INTO vth_event_assignments
         (event_id, requirement_group_id, event_vehicle_id, fleet_vehicle_id, driver_id, vehicle_type, passenger_count, reporting_time, reporting_location, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->bind_param('iiiiisisss', $eventId, $groupId, $vehicleId, $fleetVehicleId, $driverId, $type, $pax, $time, $loc, $notes);
    $stmt->execute();
    $id = (int) $conn->insert_id;
    $stmt->close();

    $asg = vth_asg_get($conn, $id);
    $schedules = (isset($body['schedules']) && is_array($body['schedules'])) ? $body['schedules'] : [];
    vth_event_sync_assignment_dates($conn, $id, $dates);
    $dutyResult = vth_event_create_duties_for_dates($conn, $asg, $dates, $schedules);
    if ($schedules) {
        vth_event_apply_date_schedules($conn, $id, $schedules);
    }
    if ($dutyResult['errors'] && $dutyResult['created'] === 0 && $vehicleId) {
        $conn->query('DELETE FROM vth_event_assignments WHERE id = ' . $id);
        vth_event_error('Duty already exists for this vehicle on this date.');
    }
    vth_event_audit($conn, 'admin', $admin['user_id'] ?? null, 'vehicle_assigned', 'assignment', $id, $eventId, null, [
        'vehicleId' => $vehicleId,
        'driverId' => $driverId,
        'dates' => $dates,
    ]);
    $list = vth_asg_list($conn, $eventId);
    foreach ($list as $item) {
        if ($item['id'] === $id) {
            $item['dutyResult'] = $dutyResult;
            return $item;
        }
    }
    return ['id' => $id, 'dutyResult' => $dutyResult];
}

function vth_asg_update(mysqli $conn, array $admin, array $body): array
{
    $id = (int) ($body['id'] ?? 0);
    $old = vth_asg_get($conn, $id);
    if (!$old) {
        vth_event_error('Assignment not found', 404);
    }
    $type = (string) ($body['vehicleType'] ?? $old['vehicle_type']);
    $vehicleId = array_key_exists('vehicleId', $body)
        ? ($body['vehicleId'] !== null && $body['vehicleId'] !== '' ? (int) $body['vehicleId'] : null)
        : (isset($old['event_vehicle_id']) && $old['event_vehicle_id'] !== null
            ? (int) $old['event_vehicle_id']
            : ($old['fleet_vehicle_id'] !== null ? (int) $old['fleet_vehicle_id'] : null));
    $driverId = array_key_exists('driverId', $body)
        ? ($body['driverId'] !== null && $body['driverId'] !== '' ? (int) $body['driverId'] : null)
        : ($old['driver_id'] !== null ? (int) $old['driver_id'] : null);
    $pax = array_key_exists('passengerCount', $body)
        ? ($body['passengerCount'] !== null && $body['passengerCount'] !== '' ? (int) $body['passengerCount'] : null)
        : ($old['passenger_count'] !== null ? (int) $old['passenger_count'] : null);
    $time = substr((string) ($body['reportingTime'] ?? $old['reporting_time']), 0, 5);
    $loc = trim((string) ($body['reportingLocation'] ?? $old['reporting_location'] ?? '')) ?: null;
    $notes = array_key_exists('notes', $body) ? (trim((string) $body['notes']) ?: null) : $old['notes'];

    $fleetVehicleId = null;
    $vehicleId = $vehicleId ?: null;
    $driverId = $driverId ?: null;
    $pax = $pax ?: null;
    $stmt = $conn->prepare(
        'UPDATE vth_event_assignments
         SET event_vehicle_id=?, fleet_vehicle_id=?, driver_id=?, vehicle_type=?, passenger_count=?, reporting_time=?, reporting_location=?, notes=?
         WHERE id=?'
    );
    $stmt->bind_param('iiisisssi', $vehicleId, $fleetVehicleId, $driverId, $type, $pax, $time, $loc, $notes, $id);
    $stmt->execute();
    $stmt->close();

    $asg = vth_asg_get($conn, $id);
    $schedules = (isset($body['schedules']) && is_array($body['schedules'])) ? $body['schedules'] : [];
    if (isset($body['dates']) && is_array($body['dates'])) {
        vth_event_sync_assignment_dates($conn, $id, $body['dates']);
        $result = vth_event_create_duties_for_dates($conn, $asg, $body['dates'], $schedules);
        if ($result['errors'] && $vehicleId) {
            foreach ($result['errors'] as $err) {
                if (str_contains($err, 'already exists')) {
                    // keep assignment; report skip
                }
            }
        }
    }
    vth_event_refresh_assignment_snapshots($conn, $asg, true);
    if ($schedules) {
        vth_event_apply_date_schedules($conn, $id, $schedules);
    }
    vth_event_audit($conn, 'admin', $admin['user_id'] ?? null, 'assignment_updated', 'assignment', $id, (int) $old['event_id'], $old, $body);
    $list = vth_asg_list($conn, (int) $old['event_id']);
    foreach ($list as $item) {
        if ($item['id'] === $id) {
            return $item;
        }
    }
    return ['id' => $id];
}

function vth_asg_delete(mysqli $conn, array $admin, int $id): void
{
    $old = vth_asg_get($conn, $id);
    if (!$old) {
        vth_event_error('Assignment not found', 404);
    }
    $busy = $conn->prepare(
        "SELECT id FROM vth_event_duties
         WHERE assignment_id = ? AND status NOT IN ('not_started','scheduled','cancelled')
         LIMIT 1"
    );
    $busy->bind_param('i', $id);
    $busy->execute();
    $started = $busy->get_result()->fetch_assoc();
    $busy->close();

    $revoke = $conn->prepare(
        "UPDATE vth_event_tokens SET revoked_at = NOW()
         WHERE assignment_id = ? AND token_type = 'driver' AND revoked_at IS NULL"
    );
    $revoke->bind_param('i', $id);
    $revoke->execute();
    $revoke->close();

    if ($started) {
        $stmt = $conn->prepare("UPDATE vth_event_assignments SET status = 'cancelled' WHERE id = ?");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();
        $upd = $conn->prepare(
            "UPDATE vth_event_duties SET status = 'cancelled'
             WHERE assignment_id = ? AND status IN ('not_started','scheduled')"
        );
        $upd->bind_param('i', $id);
        $upd->execute();
        $upd->close();
        vth_event_audit($conn, 'admin', $admin['user_id'] ?? null, 'assignment_cancelled', 'assignment', $id, (int) $old['event_id'], $old, ['status' => 'cancelled']);
        return;
    }

    $duties = $conn->prepare(
        "DELETE FROM vth_event_duties
         WHERE assignment_id = ? AND status IN ('not_started','scheduled','cancelled')"
    );
    $duties->bind_param('i', $id);
    $duties->execute();
    $duties->close();
    $dates = $conn->prepare('DELETE FROM vth_event_assignment_dates WHERE assignment_id = ?');
    $dates->bind_param('i', $id);
    $dates->execute();
    $dates->close();
    $asg = $conn->prepare('DELETE FROM vth_event_assignments WHERE id = ?');
    $asg->bind_param('i', $id);
    $asg->execute();
    $asg->close();
    vth_event_audit($conn, 'admin', $admin['user_id'] ?? null, 'assignment_deleted', 'assignment', $id, (int) $old['event_id'], $old, ['deleted' => true]);
}

function vth_asg_replace(mysqli $conn, array $admin, array $body): array
{
    $id = (int) ($body['id'] ?? 0);
    $fromDate = (string) ($body['fromDate'] ?? '');
    $old = vth_asg_get($conn, $id);
    if (!$old || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $fromDate)) {
        vth_event_error('Assignment and fromDate are required');
    }

    $ds = $conn->prepare('SELECT duty_date FROM vth_event_assignment_dates WHERE assignment_id = ? AND duty_date >= ? ORDER BY duty_date');
    $ds->bind_param('is', $id, $fromDate);
    $ds->execute();
    $future = [];
    $res = $ds->get_result();
    while ($row = $res->fetch_assoc()) {
        $future[] = $row['duty_date'];
    }
    $ds->close();
    if (!$future) {
        vth_event_error('No future dates to replace from ' . $fromDate);
    }

    $cancel = $conn->prepare(
        "UPDATE vth_event_duties SET status = 'cancelled'
         WHERE assignment_id = ? AND duty_date >= ? AND status IN ('not_started','scheduled')"
    );
    $cancel->bind_param('is', $id, $fromDate);
    $cancel->execute();
    $cancel->close();

    $delDates = $conn->prepare('DELETE FROM vth_event_assignment_dates WHERE assignment_id = ? AND duty_date >= ?');
    $delDates->bind_param('is', $id, $fromDate);
    $delDates->execute();
    $delDates->close();

    $remain = $conn->prepare('SELECT COUNT(*) c FROM vth_event_assignment_dates WHERE assignment_id = ?');
    $remain->bind_param('i', $id);
    $remain->execute();
    $left = (int) ($remain->get_result()->fetch_assoc()['c'] ?? 0);
    $remain->close();
    if ($left === 0) {
        $conn->query("UPDATE vth_event_assignments SET status = 'replaced' WHERE id = " . $id);
    }

    $newBody = $body;
    $newBody['eventId'] = (int) $old['event_id'];
    $newBody['vehicleType'] = $body['vehicleType'] ?? $old['vehicle_type'];
    $newBody['vehicleId'] = array_key_exists('vehicleId', $body)
        ? $body['vehicleId']
        : ($old['event_vehicle_id'] ?? $old['fleet_vehicle_id']);
    $newBody['driverId'] = array_key_exists('driverId', $body) ? $body['driverId'] : $old['driver_id'];
    $newBody['passengerCount'] = $body['passengerCount'] ?? $old['passenger_count'];
    $newBody['reportingTime'] = $body['reportingTime'] ?? $old['reporting_time'];
    $newBody['reportingLocation'] = $body['reportingLocation'] ?? $old['reporting_location'];
    $newBody['dates'] = $future;
    $created = vth_asg_create($conn, $admin, $newBody);
    $nid = (int) $created['id'];
    $link = $conn->prepare('UPDATE vth_event_assignments SET replaced_from_assignment_id = ? WHERE id = ?');
    $link->bind_param('ii', $id, $nid);
    $link->execute();
    $link->close();

    $oldVehicleId = (int) ($old['event_vehicle_id'] ?? $old['fleet_vehicle_id'] ?? 0);
    $action = array_key_exists('vehicleId', $body) && (int) $body['vehicleId'] !== $oldVehicleId
        ? 'vehicle_replaced'
        : 'driver_changed';
    vth_event_audit($conn, 'admin', $admin['user_id'] ?? null, $action, 'assignment', $nid, (int) $old['event_id'], $old, $created);
    return $created;
}

function vth_asg_expand_requirement(mysqli $conn, array $admin, array $body): array
{
    $eventId = (int) ($body['eventId'] ?? 0);
    $event = vth_event_get($conn, $eventId);
    if (!$event) {
        vth_event_error('Event not found', 404);
    }
    $type = (string) ($body['vehicleType'] ?? '');
    if (!in_array($type, VTH_EVENT_VEHICLE_TYPES, true)) {
        vth_event_error('Valid vehicle type is required');
    }
    $qty = max(1, (int) ($body['quantity'] ?? 1));
    $dates = $body['dates'] ?? [];
    if (!is_array($dates) || !$dates) {
        vth_event_error('Select at least one duty date');
    }
    $pax = isset($body['passengerCount']) && $body['passengerCount'] !== '' ? (int) $body['passengerCount'] : null;
    $notes = trim((string) ($body['notes'] ?? '')) ?: null;
    $stmt = $conn->prepare(
        'INSERT INTO vth_event_requirement_groups (event_id, vehicle_type, quantity, passenger_count, notes)
         VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->bind_param('isiis', $eventId, $type, $qty, $pax, $notes);
    $stmt->execute();
    $gid = (int) $conn->insert_id;
    $stmt->close();
    foreach ($dates as $d) {
        $ds = $conn->prepare('INSERT IGNORE INTO vth_event_requirement_dates (group_id, duty_date) VALUES (?, ?)');
        $ds->bind_param('is', $gid, $d);
        $ds->execute();
        $ds->close();
    }
    $created = [];
    for ($i = 0; $i < $qty; $i++) {
        $created[] = vth_asg_create($conn, $admin, [
            'eventId' => $eventId,
            'requirementGroupId' => $gid,
            'vehicleType' => $type,
            'passengerCount' => $pax,
            'reportingTime' => $body['reportingTime'] ?? $event['default_reporting_time'],
            'reportingLocation' => $body['reportingLocation'] ?? $event['reporting_location'],
            'notes' => $notes,
            'dates' => $dates,
        ]);
    }
    vth_event_audit($conn, 'admin', $admin['user_id'] ?? null, 'requirement_expanded', 'requirement_group', $gid, $eventId, null, [
        'quantity' => $qty,
        'vehicleType' => $type,
        'dates' => $dates,
    ]);
    return ['groupId' => $gid, 'assignments' => $created];
}

function vth_asg_zip_safe(string $name): string
{
    $safe = preg_replace('/[^A-Za-z0-9._-]+/', '_', $name) ?? 'file';
    $safe = trim($safe, '._-');
    return $safe !== '' ? substr($safe, 0, 80) : 'file';
}

function vth_asg_owner_docs(mysqli $conn, string $ownerType, int $ownerId): array
{
    $stmt = $conn->prepare(
        'SELECT id, doc_type, storage_key, original_name, mime
         FROM vth_event_documents
         WHERE owner_type = ? AND owner_id = ?
         ORDER BY id DESC'
    );
    $stmt->bind_param('si', $ownerType, $ownerId);
    $stmt->execute();
    $res = $stmt->get_result();
    $latest = [];
    while ($row = $res->fetch_assoc()) {
        $type = (string) $row['doc_type'];
        if (!isset($latest[$type])) {
            $latest[$type] = $row;
        }
    }
    $stmt->close();
    return $latest;
}

function vth_asg_add_zip_docs(ZipArchive $zip, mysqli $conn, string $folder, array $docs): int
{
    $added = 0;
    foreach ($docs as $doc) {
        $mime = $doc['mime'] ?: null;
        $bytes = vth_event_read_file((string) $doc['storage_key'], $mime);
        if ($bytes === null || $bytes === '') {
            continue;
        }
        $orig = (string) ($doc['original_name'] ?: '');
        $ext = strtolower(pathinfo($orig, PATHINFO_EXTENSION));
        if ($ext === '') {
            if (str_contains((string) $mime, 'pdf')) {
                $ext = 'pdf';
            } elseif (str_contains((string) $mime, 'png')) {
                $ext = 'png';
            } else {
                $ext = 'jpg';
            }
        }
        $name = vth_asg_zip_safe((string) $doc['doc_type']) . '.' . $ext;
        $zip->addFromString($folder . '/' . $name, $bytes);
        $added++;
    }
    return $added;
}

function vth_asg_download_profile(mysqli $conn, int $id): void
{
    if (!class_exists('ZipArchive')) {
        vth_event_error('Zip download is not available on this server', 500);
    }
    $row = vth_asg_get($conn, $id);
    if (!$row) {
        vth_event_error('Assignment not found', 404);
    }
    $list = vth_asg_list($conn, (int) $row['event_id']);
    $asg = null;
    foreach ($list as $item) {
        if ((int) $item['id'] === $id) {
            $asg = $item;
            break;
        }
    }
    if (!$asg) {
        vth_event_error('Assignment not found', 404);
    }

    $vehicleNo = vth_asg_zip_safe((string) ($asg['vehicleNumber'] ?: 'vehicle'));
    $driverName = vth_asg_zip_safe((string) ($asg['driverName'] ?: 'driver'));
    $root = $vehicleNo . '_' . $driverName;
    $zipName = $root . '-profile.zip';

    $vehicleId = (int) ($asg['vehicleId'] ?? 0);
    $driverId = (int) ($asg['driverId'] ?? 0);
    $vehicleDocs = $vehicleId ? vth_asg_owner_docs($conn, 'vehicle', $vehicleId) : [];
    $driverDocs = $driverId ? vth_asg_owner_docs($conn, 'driver', $driverId) : [];

    $tmp = tempnam(sys_get_temp_dir(), 'vthzip');
    if ($tmp === false) {
        vth_event_error('Could not create zip', 500);
    }
    @unlink($tmp);
    $zip = new ZipArchive();
    if ($zip->open($tmp, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
        @unlink($tmp);
        vth_event_error('Could not create zip', 500);
    }

    $vehicleProfile = "Vehicle number: " . ($asg['vehicleNumber'] ?: '-') . "\n"
        . "Type: " . ($asg['vehicleTypeLabel'] ?: $asg['vehicleType'] ?: '-') . "\n"
        . "Make: " . ($asg['make'] ?: '-') . "\n"
        . "Model: " . ($asg['model'] ?: '-') . "\n"
        . "Owner: " . ($asg['ownerName'] ?: '-') . "\n"
        . "Owner mobile: " . ($asg['ownerMobile'] ?: '-') . "\n"
        . "Dates: " . implode(', ', $asg['dates'] ?? []) . "\n";
    $driverProfile = "Driver: " . ($asg['driverName'] ?: '-') . "\n"
        . "Mobile: " . ($asg['driverMobile'] ?: '-') . "\n"
        . "Driving licence: " . ($asg['licenseNo'] ?: '-') . "\n"
        . "Aadhaar: " . ($asg['aadhaarMasked'] ?: '-') . "\n";

    $zip->addFromString($root . '/vehicle/profile.txt', $vehicleProfile);
    $zip->addFromString($root . '/driver/profile.txt', $driverProfile);
    vth_asg_add_zip_docs($zip, $conn, $root . '/vehicle', $vehicleDocs);
    vth_asg_add_zip_docs($zip, $conn, $root . '/driver', $driverDocs);
    $zip->close();

    $size = filesize($tmp);
    if ($size === false || $size < 1) {
        @unlink($tmp);
        vth_event_error('Could not create zip', 500);
    }

    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    header_remove('Content-Type');
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="' . $zipName . '"');
    header('Content-Length: ' . $size);
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: private, no-store');
    readfile($tmp);
    @unlink($tmp);
    exit;
}
