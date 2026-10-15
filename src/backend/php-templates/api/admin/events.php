<?php
require_once __DIR__ . '/../events/lib.php';

vth_event_cors();
$conn = vth_event_conn();
$body = vth_event_body();
$action = vth_event_action($body);
if ($action === 'my_app_access') {
    vth_event_ensure_optional_columns($conn);
    $user = vth_event_require_user();
    $userId = vth_event_jwt_user_id($user);
    $access = vth_event_app_access_for($conn, $userId);
    $driverToken = $access === 'event_driver' ? vth_event_driver_token_for_user($conn, $userId, $user) : null;
    vth_event_ok(['access' => $access, 'driverToken' => $driverToken]);
}
$admin = vth_event_require_admin();
vth_event_ensure_optional_columns($conn);
if ($action === '' && ($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
    $action = isset($_GET['id']) ? 'get' : 'list';
}

switch ($action) {
    case 'set_app_access':
        if (($admin['role'] ?? '') !== 'super_admin') {
            vth_event_error('Only a super admin can set app access', 403);
        }
        $targetId = (int) ($body['userId'] ?? 0);
        $access = (string) ($body['access'] ?? '');
        if ($targetId < 1 || !in_array($access, ['full', 'event_manager', 'event_driver'], true)) {
            vth_event_error('Choose full, event manager, or event driver access');
        }
        vth_event_ensure_app_access($conn);
        $save = $conn->prepare('INSERT INTO vth_user_app_access (user_id, access) VALUES (?, ?) ON DUPLICATE KEY UPDATE access = VALUES(access)');
        $save->bind_param('is', $targetId, $access);
        $save->execute();
        $save->close();
        vth_event_ok(['userId' => $targetId, 'access' => $access], 'App access saved');
        break;
    case 'list_app_access':
        if (($admin['role'] ?? '') !== 'super_admin') {
            vth_event_error('Only a super admin can view app access', 403);
        }
        vth_event_ensure_app_access($conn);
        $accesses = [];
        $accessResult = $conn->query('SELECT user_id, access FROM vth_user_app_access');
        if ($accessResult) {
            while ($accessRow = $accessResult->fetch_assoc()) {
                $accesses[] = [
                    'userId' => (int) $accessRow['user_id'],
                    'access' => (string) $accessRow['access'],
                ];
            }
        }
        vth_event_ok(['accesses' => $accesses]);
        break;
    case 'dashboard':
        vth_event_ok(['dashboard' => vth_admin_dashboard($conn)]);
        break;
    case 'list':
        vth_event_ok([
            'events' => vth_admin_list_events($conn, $body),
            'dashboard' => vth_admin_dashboard($conn),
        ]);
        break;
    case 'get':
        $id = (int) ($body['id'] ?? $_GET['id'] ?? 0);
        $event = vth_admin_get_event($conn, $id);
        if (!$event) {
            vth_event_error('Event not found', 404);
        }
        vth_event_ok(['event' => $event]);
        break;
    case 'create':
        vth_event_ok(['event' => vth_admin_save_event($conn, $admin, $body, null)], 'Event created');
        break;
    case 'update':
        $id = (int) ($body['id'] ?? 0);
        if ($id < 1) {
            vth_event_error('Event id required');
        }
        vth_event_ok(['event' => vth_admin_save_event($conn, $admin, $body, $id)], 'Event updated');
        break;
    case 'archive':
        vth_admin_set_status($conn, $admin, (int) ($body['id'] ?? 0), 'archived');
        vth_event_ok([], 'Event archived');
        break;
    case 'delete':
        vth_admin_delete_event($conn, $admin, (int) ($body['id'] ?? 0));
        vth_event_ok([], 'Event deleted');
        break;
    case 'duplicate':
        vth_event_ok(['event' => vth_admin_duplicate($conn, $admin, (int) ($body['id'] ?? 0))], 'Event duplicated');
        break;
    case 'apply_october_template':
        $id = (int) ($body['id'] ?? 0);
        vth_event_ok(['event' => vth_admin_apply_october_template($conn, $admin, $id)], 'Template applied');
        break;
    case 'search':
        vth_event_ok(vth_admin_search($conn, (string) ($body['q'] ?? $_GET['q'] ?? ''), $body));
        break;
    case 'summary':
        $id = (int) ($body['id'] ?? $_GET['id'] ?? 0);
        vth_event_ok(['summary' => vth_admin_event_summary($conn, $id)]);
        break;
    case 'daily_report':
        $id = (int) ($body['id'] ?? $_GET['id'] ?? 0);
        $date = (string) ($body['date'] ?? $_GET['date'] ?? date('Y-m-d'));
        vth_event_ok(vth_admin_daily_report($conn, $id, $date));
        break;
    case 'create_vehicle':
        vth_event_ok(['vehicle' => vth_admin_create_vehicle($conn, $admin, $body)], 'Vehicle saved');
        break;
    case 'create_driver':
        vth_event_ok(['driver' => vth_admin_create_driver($conn, $admin, $body)], 'Driver saved');
        break;
    case 'update_vehicle':
        vth_event_ok(['vehicle' => vth_admin_update_vehicle($conn, $admin, $body)], 'Vehicle updated');
        break;
    case 'delete_vehicle':
        vth_admin_delete_vehicle($conn, $admin, $body);
        vth_event_ok([], 'Vehicle removed from this event');
        break;
    case 'update_driver':
        vth_event_ok(['driver' => vth_admin_update_driver($conn, $admin, $body)], 'Driver updated');
        break;
    case 'unassign_driver':
        vth_admin_unassign_driver($conn, $admin, $body);
        vth_event_ok([], 'Driver removed from this event');
        break;
    case 'remove_event_driver':
        vth_admin_remove_event_driver($conn, $admin, $body);
        vth_event_ok([], 'Driver removed from this event');
        break;
    case 'fleet_options':
        $eventId = (int) ($body['eventId'] ?? $_GET['eventId'] ?? 0);
        vth_event_ok([
            'vehicles' => vth_admin_event_vehicle_options($conn, $eventId),
            'drivers' => !empty($body['masters']) ? vth_admin_driver_options($conn) : [],
            'eventDrivers' => $eventId > 0 ? vth_admin_event_driver_list($conn, $eventId) : [],
        ]);
        break;
    case 'driver_options':
        vth_event_ok(['drivers' => vth_admin_driver_options($conn)]);
        break;
    case 'audit':
        vth_event_ok(['logs' => vth_admin_audit($conn, (int) ($body['eventId'] ?? $_GET['eventId'] ?? 0))]);
        break;
    default:
        vth_event_error('Unknown action', 400);
}

function vth_admin_dashboard(mysqli $conn): array
{
    $today = date('Y-m-d');
    $row = $conn->query(
        "SELECT
            (SELECT COUNT(*) FROM vth_events WHERE status = 'active') AS active_events,
            (SELECT COUNT(*) FROM vth_event_assignments WHERE status = 'active' AND (event_vehicle_id IS NOT NULL OR fleet_vehicle_id IS NOT NULL)) AS vehicles_assigned,
            (SELECT COUNT(DISTINCT d.driver_id)
               FROM vth_event_assignments d
               JOIN vth_event_documents doc ON doc.owner_type = 'driver' AND doc.owner_id = d.driver_id
              WHERE d.driver_id IS NOT NULL) AS drivers_registered,
            (SELECT COUNT(*) FROM vth_event_duties WHERE duty_date = '$today' AND status <> 'cancelled') AS todays_duties,
            (SELECT COUNT(*) FROM vth_event_duties WHERE duty_date = '$today' AND status = 'completed') AS completed_duties,
            (SELECT COUNT(*) FROM vth_event_duties WHERE duty_date = '$today' AND status IN ('not_started','scheduled')) AS pending_duties,
            (SELECT COUNT(*) FROM vth_event_assignments a
              WHERE a.status = 'active' AND a.driver_id IS NOT NULL
                AND NOT EXISTS (
                  SELECT 1 FROM vth_event_documents d
                  WHERE d.owner_type = 'driver' AND d.owner_id = a.driver_id AND d.doc_type = 'aadhaar' AND d.status <> 'rejected'
                )) AS missing_documents"
    )->fetch_assoc() ?: [];
    return [
        'activeEvents' => (int) ($row['active_events'] ?? 0),
        'vehiclesAssigned' => (int) ($row['vehicles_assigned'] ?? 0),
        'driversRegistered' => (int) ($row['drivers_registered'] ?? 0),
        'todaysDuties' => (int) ($row['todays_duties'] ?? 0),
        'completedDuties' => (int) ($row['completed_duties'] ?? 0),
        'pendingDuties' => (int) ($row['pending_duties'] ?? 0),
        'missingDocuments' => (int) ($row['missing_documents'] ?? 0),
    ];
}

function vth_admin_list_events(mysqli $conn, array $body): array
{
    $status = $body['status'] ?? $_GET['status'] ?? '';
    $q = trim((string) ($body['q'] ?? $_GET['q'] ?? ''));
    $sql = 'SELECT e.*,
            (SELECT COUNT(*) FROM vth_event_assignments a WHERE a.event_id = e.id AND a.status = \'active\') AS assignment_count,
            (SELECT COUNT(*) FROM vth_event_duties d WHERE d.event_id = e.id AND d.status <> \'cancelled\') AS duty_count
            FROM vth_events e WHERE 1=1';
    $types = '';
    $params = [];
    if ($status && in_array($status, ['draft', 'active', 'archived'], true)) {
        $sql .= ' AND e.status = ?';
        $types .= 's';
        $params[] = $status;
    }
    if ($q !== '') {
        $sql .= ' AND (e.name LIKE ? OR e.event_code LIKE ? OR e.client_name LIKE ?)';
        $types .= 'sss';
        $like = '%' . $q . '%';
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }
    $sql .= ' ORDER BY e.start_date DESC, e.id DESC';
    $stmt = $conn->prepare($sql);
    if ($types !== '') {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $res = $stmt->get_result();
    $out = [];
    while ($row = $res->fetch_assoc()) {
        $out[] = vth_admin_event_row($row);
    }
    $stmt->close();
    return $out;
}

function vth_admin_event_row(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'eventCode' => $row['event_code'],
        'name' => $row['name'],
        'clientName' => $row['client_name'],
        'clientMobile' => $row['client_mobile'],
        'startDate' => $row['start_date'],
        'endDate' => $row['end_date'],
        'reportingLocation' => $row['reporting_location'],
        'defaultReportingTime' => $row['default_reporting_time'],
        'notes' => $row['notes'],
        'status' => $row['status'],
        'gpsRequired' => (bool) $row['gps_required'],
        'supportMobile' => $row['support_mobile'] ?? null,
        'assignmentCount' => (int) ($row['assignment_count'] ?? 0),
        'dutyCount' => (int) ($row['duty_count'] ?? 0),
        'createdAt' => $row['created_at'],
        'updatedAt' => $row['updated_at'],
    ];
}

function vth_admin_get_event(mysqli $conn, int $id): ?array
{
    $event = vth_event_get($conn, $id);
    if (!$event) {
        return null;
    }
    $row = vth_admin_event_row($event);
    $gstmt = $conn->prepare('SELECT * FROM vth_event_requirement_groups WHERE event_id = ? ORDER BY id');
    $gstmt->bind_param('i', $id);
    $gstmt->execute();
    $groups = [];
    $gres = $gstmt->get_result();
    while ($g = $gres->fetch_assoc()) {
        $groups[] = $g;
    }
    $gstmt->close();
    $datesByGroup = [];
    $groupIds = vth_event_id_sql(array_map(static function ($g) {
        return (int) $g['id'];
    }, $groups));
    if ($groupIds !== '') {
        $dres = $conn->query("SELECT group_id, duty_date FROM vth_event_requirement_dates WHERE group_id IN ($groupIds) ORDER BY duty_date");
        if ($dres) {
            while ($d = $dres->fetch_assoc()) {
                $datesByGroup[(int) $d['group_id']][] = $d['duty_date'];
            }
        }
    }
    $built = [];
    foreach ($groups as $g) {
        $gid = (int) $g['id'];
        $built[] = [
            'id' => $gid,
            'vehicleType' => $g['vehicle_type'],
            'vehicleTypeLabel' => vth_event_vehicle_type_label($g['vehicle_type']),
            'quantity' => (int) $g['quantity'],
            'passengerCount' => $g['passenger_count'] !== null ? (int) $g['passenger_count'] : null,
            'notes' => $g['notes'],
            'dates' => $datesByGroup[$gid] ?? [],
        ];
    }
    $groups = $built;
    $row['requirementGroups'] = $groups;
    $row['dashboard'] = vth_event_daily_stats($conn, $id, date('Y-m-d'));
    return $row;
}

function vth_admin_save_event(mysqli $conn, array $admin, array $body, ?int $id): array
{
    $name = trim((string) ($body['name'] ?? ''));
    $code = strtoupper(trim((string) ($body['eventCode'] ?? $body['event_code'] ?? '')));
    $start = (string) ($body['startDate'] ?? $body['start_date'] ?? '');
    $end = (string) ($body['endDate'] ?? $body['end_date'] ?? '');
    if ($name === '' || $start === '' || $end === '') {
        vth_event_error('Name, start date and end date are required');
    }
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $start) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $end)) {
        vth_event_error('Start and end dates must be valid calendar days');
    }
    if (strtotime($start) > strtotime($end)) {
        vth_event_error('Start date cannot be after end date');
    }
    if ($code === '') {
        $stmt = $conn->prepare('SELECT event_code FROM vth_events WHERE event_code LIKE ? ORDER BY event_code DESC LIMIT 1');
        $prefix = 'VTH-' . date('Y', strtotime($start)) . '-' . date('m', strtotime($start)) . '-';
        $like = $prefix . '%';
        $stmt->bind_param('s', $like);
        $stmt->execute();
        $last = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        $n = 1;
        if ($last && preg_match('/-(\d+)$/', $last['event_code'], $m)) {
            $n = ((int) $m[1]) + 1;
        }
        $code = $prefix . str_pad((string) $n, 3, '0', STR_PAD_LEFT);
    }
    $client = trim((string) ($body['clientName'] ?? $body['client_name'] ?? '')) ?: null;
    $mobileIn = $body['clientMobile'] ?? $body['client_mobile'] ?? null;
    $mobile = $mobileIn ? vth_event_validate_mobile((string) $mobileIn) : null;
    if ($mobileIn && !$mobile) {
        vth_event_error('Invalid client mobile number');
    }
    $loc = trim((string) ($body['reportingLocation'] ?? $body['reporting_location'] ?? '')) ?: null;
    $time = substr((string) ($body['defaultReportingTime'] ?? $body['default_reporting_time'] ?? '06:00'), 0, 5);
    $notes = trim((string) ($body['notes'] ?? '')) ?: null;
    $status = (string) ($body['status'] ?? 'draft');
    if (!in_array($status, ['draft', 'active', 'archived'], true)) {
        $status = 'draft';
    }
    $gps = !empty($body['gpsRequired'] ?? $body['gps_required']) ? 1 : 0;
    $supportIn = $body['supportMobile'] ?? $body['support_mobile'] ?? null;
    $support = $supportIn ? vth_event_validate_mobile((string) $supportIn) : null;
    if ($supportIn && !$support) {
        vth_event_error('Invalid support mobile number');
    }
    $uid = isset($admin['user_id']) ? (int) $admin['user_id'] : null;

    if ($id) {
        $old = vth_event_get($conn, $id);
        if (!$old) {
            vth_event_error('Event not found', 404);
        }
        $stmt = $conn->prepare(
            'UPDATE vth_events SET event_code=?, name=?, client_name=?, client_mobile=?, support_mobile=?, start_date=?, end_date=?,
             reporting_location=?, default_reporting_time=?, notes=?, status=?, gps_required=? WHERE id=?'
        );
        $stmt->bind_param('sssssssssssii', $code, $name, $client, $mobile, $support, $start, $end, $loc, $time, $notes, $status, $gps, $id);
        $stmt->execute();
        $stmt->close();
        if ($old['start_date'] !== $start || $old['end_date'] !== $end) {
            vth_admin_sync_event_dates($conn, $id, (string) $old['start_date'], (string) $old['end_date'], $start, $end);
        }
        vth_event_audit($conn, 'admin', $uid, 'event_updated', 'event', $id, $id, $old, $body);
    } else {
        $stmt = $conn->prepare(
            'INSERT INTO vth_events (event_code, name, client_name, client_mobile, support_mobile, start_date, end_date,
             reporting_location, default_reporting_time, notes, status, gps_required, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->bind_param('sssssssssssii', $code, $name, $client, $mobile, $support, $start, $end, $loc, $time, $notes, $status, $gps, $uid);
        try {
            $stmt->execute();
        } catch (Throwable $e) {
            vth_event_error('Event ID already exists. Choose a different Event ID.');
        }
        $id = (int) $conn->insert_id;
        $stmt->close();
        vth_event_audit($conn, 'admin', $uid, 'event_created', 'event', $id, $id, null, ['name' => $name, 'event_code' => $code]);
    }
    $saved = vth_admin_get_event($conn, $id);
    return $saved ?: ['id' => $id];
}

function vth_admin_sync_event_dates(mysqli $conn, int $eventId, string $oldStart, string $oldEnd, string $start, string $end): void
{
    $newDates = vth_event_date_span($start, $end);
    if (!$newDates) {
        vth_event_error('Event must cover at least one day');
    }
    $keep = array_flip($newDates);
    $locked = $conn->prepare(
        "SELECT DISTINCT duty_date FROM vth_event_duties
         WHERE event_id = ? AND status NOT IN ('not_started','scheduled','cancelled')"
    );
    $locked->bind_param('i', $eventId);
    $locked->execute();
    $lockRes = $locked->get_result();
    while ($row = $lockRes->fetch_assoc()) {
        $day = $row['duty_date'];
        if (!isset($keep[$day])) {
            $locked->close();
            vth_event_error('Cannot change dates: a duty already started or completed on ' . $day);
        }
    }
    $locked->close();

    $added = array_values(array_diff($newDates, vth_event_date_span($oldStart, $oldEnd)));
    $removed = array_values(array_diff(vth_event_date_span($oldStart, $oldEnd), $newDates));

    $asgStmt = $conn->prepare("SELECT * FROM vth_event_assignments WHERE event_id = ? AND status = 'active'");
    $asgStmt->bind_param('i', $eventId);
    $asgStmt->execute();
    $asgRes = $asgStmt->get_result();
    while ($asg = $asgRes->fetch_assoc()) {
        $aid = (int) $asg['id'];
        $current = [];
        $ds = $conn->prepare('SELECT duty_date FROM vth_event_assignment_dates WHERE assignment_id = ? ORDER BY duty_date');
        $ds->bind_param('i', $aid);
        $ds->execute();
        $dres = $ds->get_result();
        while ($d = $dres->fetch_assoc()) {
            $current[] = $d['duty_date'];
        }
        $ds->close();
        $next = array_values(array_unique(array_merge($current, $added)));
        if ($removed) {
            $drop = array_flip($removed);
            $next = array_values(array_filter($next, static function ($day) use ($drop) {
                return !isset($drop[$day]);
            }));
        }
        sort($next);
        vth_event_sync_assignment_dates($conn, $aid, $next);
        vth_event_create_duties_for_dates($conn, $asg, $next);
    }
    $asgStmt->close();

    $groups = $conn->prepare('SELECT id FROM vth_event_requirement_groups WHERE event_id = ?');
    $groups->bind_param('i', $eventId);
    $groups->execute();
    $gres = $groups->get_result();
    while ($g = $gres->fetch_assoc()) {
        $gid = (int) $g['id'];
        foreach ($added as $day) {
            $ins = $conn->prepare('INSERT IGNORE INTO vth_event_requirement_dates (group_id, duty_date) VALUES (?, ?)');
            $ins->bind_param('is', $gid, $day);
            $ins->execute();
            $ins->close();
        }
        foreach ($removed as $day) {
            $del = $conn->prepare('DELETE FROM vth_event_requirement_dates WHERE group_id = ? AND duty_date = ?');
            $del->bind_param('is', $gid, $day);
            $del->execute();
            $del->close();
        }
    }
    $groups->close();
}

function vth_admin_delete_event(mysqli $conn, array $admin, int $id): void
{
    $old = vth_event_get($conn, $id);
    if (!$old) {
        vth_event_error('Event not found', 404);
    }
    $busy = $conn->prepare(
        "SELECT id FROM vth_event_duties
         WHERE event_id = ? AND status NOT IN ('not_started','scheduled','cancelled')
         LIMIT 1"
    );
    $busy->bind_param('i', $id);
    $busy->execute();
    if ($busy->get_result()->fetch_assoc()) {
        $busy->close();
        vth_event_error('This event has started or completed duties. Archive it, or cancel those duties first.');
    }
    $busy->close();
    $del = $conn->prepare('DELETE FROM vth_events WHERE id = ?');
    $del->bind_param('i', $id);
    $del->execute();
    $del->close();
    vth_event_audit($conn, 'admin', $admin['user_id'] ?? null, 'event_deleted', 'event', $id, $id, $old, ['deleted' => true]);
}

function vth_admin_set_status(mysqli $conn, array $admin, int $id, string $status): void
{
    if ($id < 1) {
        vth_event_error('Event id required');
    }
    $old = vth_event_get($conn, $id);
    if (!$old) {
        vth_event_error('Event not found', 404);
    }
    $stmt = $conn->prepare('UPDATE vth_events SET status = ? WHERE id = ?');
    $stmt->bind_param('si', $status, $id);
    $stmt->execute();
    $stmt->close();
    vth_event_audit($conn, 'admin', $admin['user_id'] ?? null, 'event_archived', 'event', $id, $id, $old['status'], $status);
}

function vth_admin_duplicate(mysqli $conn, array $admin, int $id): array
{
    $src = vth_admin_get_event($conn, $id);
    if (!$src) {
        vth_event_error('Event not found', 404);
    }
    $body = $src;
    $body['name'] = $src['name'] . ' (Copy)';
    $body['eventCode'] = '';
    $body['status'] = 'draft';
    $copy = vth_admin_save_event($conn, $admin, $body, null);
    $newId = (int) $copy['id'];
    foreach ($src['requirementGroups'] ?? [] as $g) {
        $stmt = $conn->prepare(
            'INSERT INTO vth_event_requirement_groups (event_id, vehicle_type, quantity, passenger_count, notes)
             VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->bind_param('isiis', $newId, $g['vehicleType'], $g['quantity'], $g['passengerCount'], $g['notes']);
        $stmt->execute();
        $gid = (int) $conn->insert_id;
        $stmt->close();
        foreach ($g['dates'] ?? [] as $d) {
            $ds = $conn->prepare('INSERT IGNORE INTO vth_event_requirement_dates (group_id, duty_date) VALUES (?, ?)');
            $ds->bind_param('is', $gid, $d);
            $ds->execute();
            $ds->close();
        }
    }
    vth_event_audit($conn, 'admin', $admin['user_id'] ?? null, 'event_duplicated', 'event', $newId, $newId, ['from' => $id], $copy);
    return vth_admin_get_event($conn, $newId) ?: $copy;
}

function vth_admin_apply_october_template(mysqli $conn, array $admin, int $eventId): array
{
    $event = vth_event_get($conn, $eventId);
    if (!$event) {
        vth_event_error('Event not found', 404);
    }
    $already = $conn->prepare('SELECT id FROM vth_event_requirement_groups WHERE event_id = ? LIMIT 1');
    $already->bind_param('i', $eventId);
    $already->execute();
    $hasGroups = (bool) $already->get_result()->fetch_assoc();
    $already->close();
    if ($hasGroups) {
        return vth_admin_get_event($conn, $eventId) ?: [];
    }
    $groups = [
        ['innova_crysta', 8, null, '12-17 Oct and 20-21 Oct', ['2026-10-12','2026-10-13','2026-10-14','2026-10-15','2026-10-16','2026-10-17','2026-10-20','2026-10-21']],
        ['fortuner', 1, 24, '12-18 Oct', ['2026-10-12','2026-10-13','2026-10-14','2026-10-15','2026-10-16','2026-10-17','2026-10-18']],
        ['mini_bus', 3, 24, '12-17 Oct and 20-21 Oct', ['2026-10-12','2026-10-13','2026-10-14','2026-10-15','2026-10-16','2026-10-17','2026-10-20','2026-10-21']],
        ['innova', 7, 19, '15-21 Oct', ['2026-10-15','2026-10-16','2026-10-17','2026-10-18','2026-10-19','2026-10-20','2026-10-21']],
        ['innova', 1, 2, '16-21 Oct', ['2026-10-16','2026-10-17','2026-10-18','2026-10-19','2026-10-20','2026-10-21']],
        ['innova', 1, 2, '16-21 Oct continuation', ['2026-10-16','2026-10-17','2026-10-18','2026-10-19','2026-10-20','2026-10-21']],
        ['fortuner', 1, 4, '17-21 Oct', ['2026-10-17','2026-10-18','2026-10-19','2026-10-20','2026-10-21']],
    ];
    foreach ($groups as $g) {
        [$type, $qty, $pax, $notes, $dates] = $g;
        $stmt = $conn->prepare(
            'INSERT INTO vth_event_requirement_groups (event_id, vehicle_type, quantity, passenger_count, notes) VALUES (?, ?, ?, ?, ?)'
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
    }
    vth_event_audit($conn, 'admin', $admin['user_id'] ?? null, 'template_applied', 'event', $eventId, $eventId, null, ['template' => 'october_2026']);
    return vth_admin_get_event($conn, $eventId) ?: [];
}

function vth_admin_search(mysqli $conn, string $q, array $filters): array
{
    $q = trim($q);
    $sql = 'SELECT d.*, e.name AS event_name, e.event_code
            FROM vth_event_duties d
            JOIN vth_events e ON e.id = d.event_id
            LEFT JOIN vth_event_vehicles ev ON ev.id = d.event_vehicle_id AND ev.status <> \'inactive\'
            LEFT JOIN fleet_vehicles fv ON fv.id = d.fleet_vehicle_id
            WHERE 1=1';
    $types = '';
    $params = [];
    if ($q !== '') {
        $sql .= ' AND (d.vehicle_reg_snapshot LIKE ? OR ev.registration_number LIKE ? OR fv.vehicle_number LIKE ? OR d.driver_name_snapshot LIKE ? OR d.driver_mobile_snapshot LIKE ? OR e.name LIKE ? OR e.event_code LIKE ? OR d.duty_slip_no LIKE ?)';
        $types .= 'ssssssss';
        $like = '%' . $q . '%';
        for ($i = 0; $i < 8; $i++) {
            $params[] = $like;
        }
    }
    if (!empty($filters['eventId'])) {
        $sql .= ' AND d.event_id = ?';
        $types .= 'i';
        $params[] = (int) $filters['eventId'];
    }
    if (!empty($filters['status'])) {
        $sql .= ' AND d.status = ?';
        $types .= 's';
        $params[] = $filters['status'];
    }
    if (!empty($filters['date'])) {
        $sql .= ' AND d.duty_date = ?';
        $types .= 's';
        $params[] = $filters['date'];
    }
    if (!empty($filters['vehicleType'])) {
        $sql .= ' AND d.vehicle_type = ?';
        $types .= 's';
        $params[] = $filters['vehicleType'];
    }
    $sql .= ' ORDER BY d.duty_date DESC, d.id DESC LIMIT 200';
    $stmt = $conn->prepare($sql);
    if ($types !== '') {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $res = $stmt->get_result();
    $rows = [];
    while ($row = $res->fetch_assoc()) {
        $rows[] = $row;
    }
    $stmt->close();
    return ['duties' => vth_event_map_duty_rows($conn, $rows)];
}

function vth_admin_event_summary(mysqli $conn, int $id): array
{
    $event = vth_event_get($conn, $id);
    if (!$event) {
        vth_event_error('Event not found', 404);
    }
    $totals = $conn->query(
        "SELECT
            COUNT(DISTINCT COALESCE(event_vehicle_id, fleet_vehicle_id)) AS vehicles,
            COUNT(DISTINCT driver_id) AS drivers,
            COUNT(*) AS duty_days,
            SUM(status = 'completed') AS completed,
            SUM(status IN ('not_started','scheduled','in_progress','missing_opening','missing_closing')) AS pending,
            COALESCE(SUM(total_km), 0) AS total_km
         FROM vth_event_duties
         WHERE event_id = $id AND status <> 'cancelled'
           AND " . vth_event_has_registration_sql('vehicle_reg_snapshot')
    )->fetch_assoc();
    $vehicles = [];
    $vres = $conn->query(
        "SELECT vehicle_reg_snapshot AS vehicle, driver_name_snapshot AS driver,
                COUNT(*) AS duty_days, COALESCE(SUM(total_km),0) AS total_km
         FROM vth_event_duties
         WHERE event_id = $id AND status <> 'cancelled'
           AND " . vth_event_has_registration_sql('vehicle_reg_snapshot') . "
         GROUP BY vehicle_reg_snapshot, driver_name_snapshot
         ORDER BY vehicle_reg_snapshot"
    );
    while ($row = $vres->fetch_assoc()) {
        $vehicles[] = [
            'vehicle' => $row['vehicle'],
            'driver' => $row['driver'],
            'dutyDays' => (int) $row['duty_days'],
            'totalKm' => (int) $row['total_km'],
        ];
    }
    $drivers = [];
    $dres = $conn->query(
        "SELECT driver_name_snapshot AS driver, vehicle_reg_snapshot AS vehicle,
                COUNT(*) AS duty_days, COALESCE(SUM(total_km),0) AS total_km
         FROM vth_event_duties
         WHERE event_id = $id AND status <> 'cancelled'
           AND " . vth_event_has_registration_sql('vehicle_reg_snapshot') . "
         GROUP BY driver_name_snapshot, vehicle_reg_snapshot
         ORDER BY driver_name_snapshot"
    );
    while ($row = $dres->fetch_assoc()) {
        $drivers[] = [
            'driver' => $row['driver'],
            'vehicle' => $row['vehicle'],
            'dutyDays' => (int) $row['duty_days'],
            'totalKm' => (int) $row['total_km'],
        ];
    }
    return [
        'event' => vth_admin_event_row($event),
        'totalVehicles' => (int) $totals['vehicles'],
        'totalDrivers' => (int) $totals['drivers'],
        'totalDutyDays' => (int) $totals['duty_days'],
        'completedDutySlips' => (int) $totals['completed'],
        'pendingDutySlips' => (int) $totals['pending'],
        'totalKm' => (int) $totals['total_km'],
        'vehicleWise' => $vehicles,
        'driverWise' => $drivers,
    ];
}

function vth_admin_daily_report(mysqli $conn, int $id, string $date): array
{
    $event = vth_event_get($conn, $id);
    if (!$event) {
        vth_event_error('Event not found', 404);
    }
    $stmt = $conn->prepare(
        "SELECT d.*, e.name AS event_name, e.event_code
         FROM vth_event_duties d
         JOIN vth_events e ON e.id = d.event_id
         WHERE d.event_id = ? AND d.duty_date = ?
           AND d.status <> 'cancelled'
           AND " . vth_event_has_registration_sql('d.vehicle_reg_snapshot') . "
         ORDER BY d.vehicle_type, d.vehicle_reg_snapshot, d.id"
    );
    $stmt->bind_param('is', $id, $date);
    $stmt->execute();
    $res = $stmt->get_result();
    $rows = [];
    while ($row = $res->fetch_assoc()) {
        $rows[] = $row;
    }
    $stmt->close();
    $rows = vth_event_map_duty_rows($conn, $rows);
    return [
        'event' => vth_admin_event_row($event),
        'stats' => vth_event_daily_stats($conn, $id, $date),
        'duties' => $rows,
    ];
}

function vth_admin_create_vehicle(mysqli $conn, array $admin, array $body): array
{
    $eventId = (int) ($body['eventId'] ?? 0);
    if ($eventId < 1 || !vth_event_get($conn, $eventId)) {
        vth_event_error('Event is required');
    }
    $reg = vth_event_normalize_reg((string) ($body['registrationNumber'] ?? $body['vehicleNumber'] ?? ''));
    if ($reg === '') {
        vth_event_error('Vehicle registration number is required');
    }
    $type = (string) ($body['vehicleType'] ?? 'other');
    if (!in_array($type, VTH_EVENT_VEHICLE_TYPES, true)) {
        $type = 'other';
    }
    $make = trim((string) ($body['make'] ?? '')) ?: 'Unknown';
    $model = trim((string) ($body['model'] ?? '')) ?: vth_event_vehicle_type_label($type);
    $name = trim((string) ($body['name'] ?? '')) ?: ($model . ' ' . $reg);
    $cap = (int) ($body['seatingCapacity'] ?? $body['capacity'] ?? 4);
    $owner = trim((string) ($body['ownerName'] ?? '')) ?: null;
    $ownerMobIn = trim((string) ($body['ownerMobile'] ?? ''));
    $ownerMob = $ownerMobIn !== '' ? vth_event_validate_mobile($ownerMobIn) : null;
    if ($ownerMobIn !== '' && !$ownerMob) {
        vth_event_error('Invalid owner mobile number');
    }
    $notes = trim((string) ($body['notes'] ?? '')) ?: null;
    if (empty($_FILES['rc']) || (($_FILES['rc']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK)) {
        vth_event_error('RC document is required');
    }
    if (empty($_FILES['insurance']) || (($_FILES['insurance']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK)) {
        vth_event_error('Insurance document is required');
    }
    $rcSaved = vth_event_save_upload($_FILES['rc'], 'rc');
    if (!empty($rcSaved['error'])) {
        vth_event_error($rcSaved['error']);
    }
    $insuranceSaved = vth_event_save_upload($_FILES['insurance'], 'insurance');
    if (!empty($insuranceSaved['error'])) {
        vth_event_error($insuranceSaved['error']);
    }
    $chk = $conn->prepare('SELECT id, status FROM vth_event_vehicles WHERE event_id = ? AND registration_number = ? LIMIT 1');
    $chk->bind_param('is', $eventId, $reg);
    $chk->execute();
    $existing = $chk->get_result()->fetch_assoc();
    $chk->close();
    $status = 'active';
    if ($existing && ($existing['status'] ?? '') !== 'inactive') {
        vth_event_error('This vehicle is already added to this event');
    }
    if ($existing) {
        $vid = (int) $existing['id'];
        $stmt = $conn->prepare(
            'UPDATE vth_event_vehicles
             SET vehicle_type=?, make=?, model=?, seating_capacity=?, owner_name=?, owner_mobile=?, notes=?, status=?
             WHERE id=?'
        );
        $stmt->bind_param('sssissssi', $type, $make, $model, $cap, $owner, $ownerMob, $notes, $status, $vid);
        $stmt->execute();
        $stmt->close();
    } else {
        $stmt = $conn->prepare(
            'INSERT INTO vth_event_vehicles
             (event_id, registration_number, vehicle_type, make, model, seating_capacity, owner_name, owner_mobile, notes, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->bind_param('issssissss', $eventId, $reg, $type, $make, $model, $cap, $owner, $ownerMob, $notes, $status);
        try {
            $stmt->execute();
        } catch (Throwable $e) {
            vth_event_error('Could not save event vehicle');
        }
        $vid = (int) $conn->insert_id;
        $stmt->close();
    }
    $uploadedBy = 'admin:' . ($admin['user_id'] ?? '0');
    vth_event_insert_document($conn, $eventId, 'vehicle', $vid, 'rc', $rcSaved, $uploadedBy);
    vth_event_insert_document($conn, $eventId, 'vehicle', $vid, 'insurance', $insuranceSaved, $uploadedBy);
    vth_event_attach_posted_file($conn, $eventId, 'vehicle', $vid, 'rc_back', 'rc_back', $uploadedBy);
    vth_event_attach_posted_file($conn, $eventId, 'vehicle', $vid, 'insurance_back', 'insurance_back', $uploadedBy);
    vth_event_audit($conn, 'admin', $admin['user_id'] ?? null, 'event_vehicle_created', 'event_vehicle', $vid, $eventId, null, ['reg' => $reg]);
    return [
        'id' => $vid,
        'vehicleNumber' => $reg,
        'name' => $name,
        'make' => $make,
        'model' => $model,
        'vehicleType' => $type,
        'capacity' => $cap,
        'ownerName' => $owner,
        'ownerMobile' => $ownerMob,
        'documents' => vth_event_doc_checklist($conn, 'vehicle', $vid),
    ];
}

function vth_admin_update_vehicle(mysqli $conn, array $admin, array $body): array
{
    $id = (int) ($body['id'] ?? 0);
    $stmt = $conn->prepare('SELECT * FROM vth_event_vehicles WHERE id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $old = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$old) {
        vth_event_error('Vehicle not found', 404);
    }
    $eventId = (int) $old['event_id'];
    $reg = vth_event_normalize_reg((string) ($body['registrationNumber'] ?? $body['vehicleNumber'] ?? $old['registration_number']));
    if ($reg === '') {
        vth_event_error('Vehicle registration number is required');
    }
    $type = (string) ($body['vehicleType'] ?? $old['vehicle_type']);
    if (!in_array($type, VTH_EVENT_VEHICLE_TYPES, true)) {
        $type = $old['vehicle_type'];
    }
    $make = trim((string) ($body['make'] ?? $old['make'] ?? '')) ?: 'Unknown';
    $model = trim((string) ($body['model'] ?? $old['model'] ?? '')) ?: vth_event_vehicle_type_label($type);
    $cap = (int) ($body['seatingCapacity'] ?? $body['capacity'] ?? $old['seating_capacity'] ?? 4);
    $owner = trim((string) ($body['ownerName'] ?? $old['owner_name'] ?? '')) ?: null;
    $ownerMobIn = trim((string) ($body['ownerMobile'] ?? $old['owner_mobile'] ?? ''));
    $ownerMob = $ownerMobIn !== '' ? vth_event_validate_mobile($ownerMobIn) : null;
    if ($ownerMobIn !== '' && !$ownerMob) {
        vth_event_error('Invalid owner mobile number');
    }
    $notes = array_key_exists('notes', $body) ? (trim((string) $body['notes']) ?: null) : $old['notes'];
    $upd = $conn->prepare(
        'UPDATE vth_event_vehicles
         SET registration_number=?, vehicle_type=?, make=?, model=?, seating_capacity=?, owner_name=?, owner_mobile=?, notes=?
         WHERE id=?'
    );
    $upd->bind_param('ssssisssi', $reg, $type, $make, $model, $cap, $owner, $ownerMob, $notes, $id);
    $upd->execute();
    $upd->close();
    $syncPlate = $conn->prepare(
        "UPDATE vth_event_duties
         SET vehicle_reg_snapshot = ?
         WHERE event_vehicle_id = ? AND status <> 'cancelled'"
    );
    $syncPlate->bind_param('si', $reg, $id);
    $syncPlate->execute();
    $syncPlate->close();
    $uploadedBy = 'admin:' . ($admin['user_id'] ?? '0');
    if (!empty($_FILES['rc']) && (($_FILES['rc']['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK)) {
        vth_event_attach_posted_file($conn, $eventId, 'vehicle', $id, 'rc', 'rc', $uploadedBy);
    }
    if (!empty($_FILES['insurance']) && (($_FILES['insurance']['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK)) {
        vth_event_attach_posted_file($conn, $eventId, 'vehicle', $id, 'insurance', 'insurance', $uploadedBy);
    }
    vth_event_attach_posted_file($conn, $eventId, 'vehicle', $id, 'rc_back', 'rc_back', $uploadedBy);
    vth_event_attach_posted_file($conn, $eventId, 'vehicle', $id, 'insurance_back', 'insurance_back', $uploadedBy);
    $asgRes = $conn->prepare('SELECT * FROM vth_event_assignments WHERE event_vehicle_id = ?');
    $asgRes->bind_param('i', $id);
    $asgRes->execute();
    $asgs = $asgRes->get_result();
    while ($asg = $asgs->fetch_assoc()) {
        vth_event_refresh_assignment_snapshots($conn, $asg, true);
    }
    $asgRes->close();
    vth_event_audit($conn, 'admin', $admin['user_id'] ?? null, 'event_vehicle_updated', 'event_vehicle', $id, $eventId, $old, ['reg' => $reg]);
    return [
        'id' => $id,
        'vehicleNumber' => $reg,
        'name' => trim($make . ' ' . $model),
        'make' => $make,
        'model' => $model,
        'vehicleType' => $type,
        'capacity' => $cap,
        'ownerName' => $owner,
        'ownerMobile' => $ownerMob,
        'documents' => vth_event_doc_checklist($conn, 'vehicle', $id),
    ];
}

function vth_admin_delete_vehicle(mysqli $conn, array $admin, array $body): void
{
    $id = (int) ($body['id'] ?? 0);
    $stmt = $conn->prepare('SELECT * FROM vth_event_vehicles WHERE id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $old = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$old) {
        vth_event_error('Vehicle not found', 404);
    }
    $eventId = (int) $old['event_id'];
    $busy = $conn->prepare(
        "SELECT id FROM vth_event_duties
         WHERE event_vehicle_id = ? AND status NOT IN ('not_started','scheduled','cancelled')
         LIMIT 1"
    );
    $busy->bind_param('i', $id);
    $busy->execute();
    if ($busy->get_result()->fetch_assoc()) {
        $busy->close();
        vth_event_error('This vehicle has started or completed duties. Cancel those duties first.');
    }
    $busy->close();
    $cancel = $conn->prepare(
        "UPDATE vth_event_duties SET status = 'cancelled'
         WHERE event_vehicle_id = ? AND status IN ('not_started','scheduled')"
    );
    $cancel->bind_param('i', $id);
    $cancel->execute();
    $cancel->close();
    $clear = $conn->prepare(
        "UPDATE vth_event_assignments SET event_vehicle_id = NULL
         WHERE event_vehicle_id = ? AND event_id = ?"
    );
    $clear->bind_param('ii', $id, $eventId);
    $clear->execute();
    $clear->close();
    $del = $conn->prepare("UPDATE vth_event_vehicles SET status = 'inactive' WHERE id = ?");
    $del->bind_param('i', $id);
    $del->execute();
    $del->close();
    vth_event_audit($conn, 'admin', $admin['user_id'] ?? null, 'event_vehicle_deleted', 'event_vehicle', $id, $eventId, $old, ['status' => 'inactive']);
}

function vth_admin_update_driver(mysqli $conn, array $admin, array $body): array
{
    $id = (int) ($body['id'] ?? 0);
    $stmt = $conn->prepare('SELECT id, name, phone, license_no FROM drivers WHERE id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $old = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$old) {
        vth_event_error('Driver not found', 404);
    }
    $name = trim((string) ($body['fullName'] ?? $body['name'] ?? $old['name']));
    $mobile = vth_event_validate_mobile((string) ($body['mobile'] ?? $body['phone'] ?? $old['phone']));
    if ($name === '' || !$mobile) {
        vth_event_error('Driver name and a valid Indian mobile number are required');
    }
    $dl = isset($body['licenseNumber']) || isset($body['license_no'])
        ? vth_event_validate_dl((string) ($body['licenseNumber'] ?? $body['license_no'] ?? ''))
        : $old['license_no'];
    $altIn = $body['altMobile'] ?? $body['alt_mobile'] ?? null;
    $alt = $altIn ? vth_event_validate_mobile((string) $altIn) : null;
    $upd = $conn->prepare('UPDATE drivers SET name = ?, phone = ?, license_no = ? WHERE id = ?');
    $upd->bind_param('sssi', $name, $mobile, $dl, $id);
    $upd->execute();
    $upd->close();
    $aadhaar = $body['aadhaar'] ?? $body['aadhaarNumber'] ?? null;
    if ($aadhaar && !vth_event_validate_aadhaar((string) $aadhaar)) {
        vth_event_error('Invalid Aadhaar number');
    }
    $eventId = (int) ($body['eventId'] ?? 0) ?: null;
    vth_event_upsert_driver_pii($conn, $id, $aadhaar ? (string) $aadhaar : null, $alt, $body['address'] ?? null);
    $uploadedBy = 'admin:' . ($admin['user_id'] ?? '0');
    vth_event_attach_posted_file($conn, $eventId, 'driver', $id, 'driver_photo', 'driver_photo', $uploadedBy);
    vth_event_attach_posted_file($conn, $eventId, 'driver', $id, 'dl_front', 'dl_front', $uploadedBy);
    vth_event_attach_posted_file($conn, $eventId, 'driver', $id, 'dl_back', 'dl_back', $uploadedBy);
    vth_event_attach_posted_file($conn, $eventId, 'driver', $id, 'aadhaar', 'aadhaar', $uploadedBy);
    vth_event_attach_posted_file($conn, $eventId, 'driver', $id, 'aadhaar_back', 'aadhaar_back', $uploadedBy);
    if ($eventId) {
        $asgRes = $conn->prepare('SELECT * FROM vth_event_assignments WHERE event_id = ? AND driver_id = ?');
        $asgRes->bind_param('ii', $eventId, $id);
        $asgRes->execute();
        $asgs = $asgRes->get_result();
        while ($asg = $asgs->fetch_assoc()) {
            vth_event_refresh_assignment_snapshots($conn, $asg, true);
        }
        $asgRes->close();
    }
    vth_event_audit($conn, 'admin', $admin['user_id'] ?? null, 'driver_updated', 'driver', $id, $eventId, $old, ['name' => $name, 'mobile' => $mobile]);
    $last4 = $aadhaar ? substr(vth_event_validate_aadhaar((string) $aadhaar) ?? '', -4) : null;
    return [
        'id' => $id,
        'name' => $name,
        'phone' => $mobile,
        'altMobile' => $alt,
        'licenseNo' => $dl,
        'aadhaarMasked' => $last4 ? ('XXXX XXXX ' . $last4) : null,
        'documents' => vth_event_doc_checklist($conn, 'driver', $id),
    ];
}

function vth_admin_unassign_driver(mysqli $conn, array $admin, array $body): void
{
    $eventId = (int) ($body['eventId'] ?? 0);
    $driverId = (int) ($body['id'] ?? $body['driverId'] ?? 0);
    if ($eventId < 1 || $driverId < 1) {
        vth_event_error('Event and driver are required');
    }
    $asgRes = $conn->prepare('SELECT * FROM vth_event_assignments WHERE event_id = ? AND driver_id = ?');
    $asgRes->bind_param('ii', $eventId, $driverId);
    $asgRes->execute();
    $asgs = $asgRes->get_result();
    $found = false;
    while ($asg = $asgs->fetch_assoc()) {
        $found = true;
        $aid = (int) $asg['id'];
        $conn->query('UPDATE vth_event_assignments SET driver_id = NULL WHERE id = ' . $aid);
        $asg['driver_id'] = null;
        vth_event_refresh_assignment_snapshots($conn, $asg, true);
    }
    $asgRes->close();
    if (!$found) {
        vth_event_error('This driver is not assigned to the event');
    }
    vth_event_audit($conn, 'admin', $admin['user_id'] ?? null, 'driver_unassigned', 'driver', $driverId, $eventId, null, ['driverId' => $driverId]);
}

function vth_admin_remove_event_driver(mysqli $conn, array $admin, array $body): void
{
    $eventId = (int) ($body['eventId'] ?? 0);
    $driverId = (int) ($body['id'] ?? $body['driverId'] ?? 0);
    if ($eventId < 1 || $driverId < 1) {
        vth_event_error('Event and driver are required');
    }
    $asgRes = $conn->prepare('SELECT * FROM vth_event_assignments WHERE event_id = ? AND driver_id = ?');
    $asgRes->bind_param('ii', $eventId, $driverId);
    $asgRes->execute();
    $asgs = $asgRes->get_result();
    while ($asg = $asgs->fetch_assoc()) {
        $aid = (int) $asg['id'];
        $conn->query('UPDATE vth_event_assignments SET driver_id = NULL WHERE id = ' . $aid);
        $asg['driver_id'] = null;
        vth_event_refresh_assignment_snapshots($conn, $asg, true);
    }
    $asgRes->close();
    $del = $conn->prepare("DELETE FROM vth_event_documents WHERE event_id = ? AND owner_type = 'driver' AND owner_id = ?");
    $del->bind_param('ii', $eventId, $driverId);
    $del->execute();
    $del->close();
    vth_event_audit($conn, 'admin', $admin['user_id'] ?? null, 'driver_removed_from_event', 'driver', $driverId, $eventId, null, ['driverId' => $driverId]);
}

function vth_admin_driver_columns(mysqli $conn): array
{
    static $cols = null;
    if (is_array($cols)) {
        return $cols;
    }
    $cols = [];
    $res = @$conn->query('SHOW COLUMNS FROM drivers');
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $cols[strtolower((string) $row['Field'])] = true;
        }
    }
    return $cols;
}

function vth_admin_insert_driver_row(mysqli $conn, string $name, string $mobile, string $email, string $dl, string $loc): int
{
    $cols = vth_admin_driver_columns($conn);
    $status = isset($cols['status']) ? 'available' : '';
    $fields = ['name', 'phone'];
    $values = [$name, $mobile];
    $types = 'ss';
    if (isset($cols['email'])) {
        $fields[] = 'email';
        $values[] = $email;
        $types .= 's';
    }
    if (isset($cols['license_no'])) {
        $fields[] = 'license_no';
        $values[] = $dl;
        $types .= 's';
    } elseif (isset($cols['license_number'])) {
        $fields[] = 'license_number';
        $values[] = $dl;
        $types .= 's';
    }
    if (isset($cols['status'])) {
        $fields[] = 'status';
        $values[] = $status;
        $types .= 's';
    }
    if (isset($cols['location'])) {
        $fields[] = 'location';
        $values[] = $loc;
        $types .= 's';
    }
    if (isset($cols['vehicle'])) {
        $fields[] = 'vehicle';
        $values[] = '';
        $types .= 's';
    }
    $placeholders = implode(', ', array_fill(0, count($fields), '?'));
    $sql = 'INSERT INTO drivers (' . implode(', ', $fields) . ') VALUES (' . $placeholders . ')';
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        vth_event_error('Could not save driver: ' . $conn->error);
    }
    $stmt->bind_param($types, ...$values);
    if (!$stmt->execute()) {
        $err = $stmt->error;
        $stmt->close();
        vth_event_error('Could not save driver: ' . $err);
    }
    $id = (int) $conn->insert_id;
    $stmt->close();
    if ($id < 1) {
        $find = $conn->prepare('SELECT id FROM drivers WHERE phone = ? ORDER BY id DESC LIMIT 1');
        $find->bind_param('s', $mobile);
        $find->execute();
        $row = $find->get_result()->fetch_assoc();
        $find->close();
        $id = (int) ($row['id'] ?? 0);
    }
    if ($id < 1) {
        vth_event_error('Could not save driver');
    }
    return $id;
}

function vth_event_assign_driver_to_open_slot(mysqli $conn, int $eventId, int $driverId): bool
{
    $chk = $conn->prepare('SELECT id FROM vth_event_assignments WHERE event_id = ? AND driver_id = ? LIMIT 1');
    $chk->bind_param('ii', $eventId, $driverId);
    $chk->execute();
    $already = $chk->get_result()->fetch_assoc();
    $chk->close();
    if ($already) {
        return true;
    }
    $stmt = $conn->prepare(
        "SELECT * FROM vth_event_assignments
         WHERE event_id = ? AND status = 'active' AND driver_id IS NULL
         ORDER BY id ASC LIMIT 1"
    );
    $stmt->bind_param('i', $eventId);
    $stmt->execute();
    $asg = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$asg) {
        return false;
    }
    $aid = (int) $asg['id'];
    $upd = $conn->prepare('UPDATE vth_event_assignments SET driver_id = ? WHERE id = ?');
    $upd->bind_param('ii', $driverId, $aid);
    $upd->execute();
    $upd->close();
    $asg['driver_id'] = $driverId;
    vth_event_refresh_assignment_snapshots($conn, $asg, true);
    return true;
}

function vth_admin_event_driver_list(mysqli $conn, int $eventId): array
{
    $ids = [];
    $asg = $conn->prepare('SELECT DISTINCT driver_id FROM vth_event_assignments WHERE event_id = ? AND driver_id IS NOT NULL');
    $asg->bind_param('i', $eventId);
    $asg->execute();
    $res = $asg->get_result();
    while ($row = $res->fetch_assoc()) {
        $ids[(int) $row['driver_id']] = true;
    }
    $asg->close();
    $docs = $conn->prepare("SELECT DISTINCT owner_id FROM vth_event_documents WHERE event_id = ? AND owner_type = 'driver' AND owner_id > 0");
    $docs->bind_param('i', $eventId);
    $docs->execute();
    $dres = $docs->get_result();
    while ($row = $dres->fetch_assoc()) {
        $ids[(int) $row['owner_id']] = true;
    }
    $docs->close();
    $event = vth_event_get($conn, $eventId);
    $support = preg_replace('/\D+/', '', (string) ($event['support_mobile'] ?? '9966363662'));
    if (strlen($support) === 12 && str_starts_with($support, '91')) {
        $support = substr($support, 2);
    }
    if (!$ids) {
        return [];
    }
    $idList = vth_event_id_sql(array_keys($ids));
    if ($idList === '') {
        return [];
    }
    $out = [];
    $rows = [];
    $q = $conn->query("SELECT id, name, phone, license_no, aadhaar_last4, status FROM drivers WHERE id IN ($idList) ORDER BY name");
    if ($q) {
        while ($row = $q->fetch_assoc()) {
            $rows[] = $row;
        }
    }
    $docs = vth_event_doc_checklists($conn, 'driver', array_map(static function ($row) {
        return (int) $row['id'];
    }, $rows));
    foreach ($rows as $row) {
        $did = (int) $row['id'];
        $phone = preg_replace('/\D+/', '', (string) ($row['phone'] ?? ''));
        if (strlen($phone) === 12 && str_starts_with($phone, '91')) {
            $phone = substr($phone, 2);
        }
        if ($support !== '' && $phone === $support) {
            continue;
        }
        $out[] = [
            'id' => $did,
            'name' => $row['name'],
            'phone' => $row['phone'],
            'licenseNo' => $row['license_no'] ?? null,
            'aadhaarMasked' => !empty($row['aadhaar_last4']) ? ('XXXX XXXX ' . $row['aadhaar_last4']) : null,
            'status' => $row['status'] ?? null,
            'documents' => !empty($docs[$did]) ? $docs[$did] : new stdClass(),
        ];
    }
    return $out;
}

function vth_admin_create_driver(mysqli $conn, array $admin, array $body): array
{
    $name = trim((string) ($body['fullName'] ?? $body['name'] ?? ''));
    $mobile = vth_event_validate_mobile((string) ($body['mobile'] ?? $body['phone'] ?? ''));
    if ($name === '' || !$mobile) {
        vth_event_error('Driver name and a valid Indian mobile number are required');
    }
    $dl = isset($body['licenseNumber']) || isset($body['license_no'])
        ? (vth_event_validate_dl((string) ($body['licenseNumber'] ?? $body['license_no'] ?? '')) ?: '')
        : '';
    $altIn = $body['altMobile'] ?? $body['alt_mobile'] ?? null;
    $alt = $altIn ? vth_event_validate_mobile((string) $altIn) : null;
    $email = trim((string) ($body['email'] ?? ''));
    if ($email === '') {
        $email = $mobile . '@event.vizagtaxihub.local';
    }
    $existing = $conn->prepare('SELECT id, name, phone, license_no FROM drivers WHERE phone = ? OR RIGHT(REPLACE(phone, " ", ""), 10) = ? LIMIT 1');
    $existing->bind_param('ss', $mobile, $mobile);
    $existing->execute();
    $row = $existing->get_result()->fetch_assoc();
    $existing->close();
    $isExisting = (bool) $row;
    if ($row) {
        $did = (int) $row['id'];
        $u = $conn->prepare('UPDATE drivers SET name = ?, license_no = ? WHERE id = ?');
        $u->bind_param('ssi', $name, $dl, $did);
        @$u->execute();
        $u->close();
        if ($alt) {
            @$conn->query("UPDATE drivers SET alt_mobile = '" . $conn->real_escape_string($alt) . "' WHERE id = " . $did);
        }
    } else {
        $loc = trim((string) ($body['address'] ?? 'Visakhapatnam')) ?: 'Visakhapatnam';
        $did = vth_admin_insert_driver_row($conn, $name, $mobile, $email, $dl, $loc);
        if ($alt) {
            @$conn->query("UPDATE drivers SET alt_mobile = '" . $conn->real_escape_string($alt) . "' WHERE id = " . $did);
        }
    }
    if ($did < 1) {
        vth_event_error('Could not save driver');
    }
    $aadhaar = $body['aadhaar'] ?? $body['aadhaarNumber'] ?? null;
    if ($aadhaar && !vth_event_validate_aadhaar((string) $aadhaar)) {
        vth_event_error('Invalid Aadhaar number');
    }
    vth_event_upsert_driver_pii($conn, $did, $aadhaar ? (string) $aadhaar : null, $alt, $body['address'] ?? null);
    $eventId = (int) ($body['eventId'] ?? 0) ?: null;
    $uploadedBy = 'admin:' . ($admin['user_id'] ?? '0');
    $attached = 0;
    foreach (['driver_photo' => 'driver_photo', 'dl_front' => 'dl_front', 'dl_back' => 'dl_back', 'aadhaar' => 'aadhaar', 'aadhaar_back' => 'aadhaar_back'] as $fileKey => $docType) {
        if (vth_event_attach_posted_file($conn, $eventId, 'driver', $did, $docType, $fileKey, $uploadedBy)) {
            $attached++;
        }
    }
    $assigned = false;
    if ($eventId) {
        $assigned = vth_event_assign_driver_to_open_slot($conn, $eventId, $did);
    }
    if ($eventId && ($assigned || $attached > 0 || !$isExisting)) {
        vth_event_audit($conn, 'admin', $admin['user_id'] ?? null, 'driver_created', 'driver', $did, $eventId, null, ['name' => $name, 'mobile' => $mobile]);
    }
    $last4 = $aadhaar ? substr(vth_event_validate_aadhaar((string) $aadhaar) ?? '', -4) : null;
    return [
        'id' => $did,
        'name' => $name,
        'phone' => $mobile,
        'altMobile' => $alt,
        'licenseNo' => $dl !== '' ? $dl : null,
        'aadhaarMasked' => $last4 ? ('XXXX XXXX ' . $last4) : null,
        'documents' => vth_event_doc_checklist($conn, 'driver', $did),
    ];
}

function vth_admin_event_vehicle_options(mysqli $conn, int $eventId): array
{
    if ($eventId < 1) {
        return [];
    }
    $stmt = $conn->prepare(
        'SELECT id, registration_number, vehicle_type, make, model, seating_capacity, owner_name, owner_mobile, status
         FROM vth_event_vehicles
         WHERE event_id = ? AND status = \'active\'
         ORDER BY registration_number'
    );
    $stmt->bind_param('i', $eventId);
    $stmt->execute();
    $res = $stmt->get_result();
    $rows = [];
    while ($row = $res->fetch_assoc()) {
        $rows[] = $row;
    }
    $stmt->close();
    $docs = vth_event_doc_checklists($conn, 'vehicle', array_map(static function ($row) {
        return (int) $row['id'];
    }, $rows));
    $out = [];
    foreach ($rows as $row) {
        $vid = (int) $row['id'];
        $out[] = [
            'id' => $vid,
            'vehicleNumber' => $row['registration_number'],
            'name' => trim(($row['make'] ?? '') . ' ' . ($row['model'] ?? '')) ?: $row['registration_number'],
            'make' => $row['make'],
            'model' => $row['model'],
            'vehicleType' => $row['vehicle_type'],
            'capacity' => $row['seating_capacity'] !== null ? (int) $row['seating_capacity'] : null,
            'ownerName' => $row['owner_name'] ?? null,
            'ownerMobile' => $row['owner_mobile'] ?? null,
            'status' => $row['status'],
            'documents' => !empty($docs[$vid]) ? $docs[$vid] : new stdClass(),
        ];
    }
    return $out;
}

function vth_admin_driver_options(mysqli $conn): array
{
    $res = $conn->query('SELECT id, name, phone, license_no, aadhaar_last4, status FROM drivers ORDER BY name');
    $out = [];
    while ($row = $res->fetch_assoc()) {
        $out[] = [
            'id' => (int) $row['id'],
            'name' => $row['name'],
            'phone' => $row['phone'],
            'licenseNo' => $row['license_no'],
            'aadhaarMasked' => !empty($row['aadhaar_last4']) ? ('XXXX XXXX ' . $row['aadhaar_last4']) : null,
            'status' => $row['status'],
        ];
    }
    return $out;
}

function vth_admin_audit(mysqli $conn, int $eventId): array
{
    if ($eventId < 1) {
        return [];
    }
    $stmt = $conn->prepare(
        'SELECT * FROM vth_event_audit_logs WHERE event_id = ? ORDER BY id DESC LIMIT 300'
    );
    $stmt->bind_param('i', $eventId);
    $stmt->execute();
    $res = $stmt->get_result();
    $out = [];
    while ($row = $res->fetch_assoc()) {
        $out[] = [
            'id' => (int) $row['id'],
            'actorType' => $row['actor_type'],
            'actorId' => $row['actor_id'],
            'action' => $row['action'],
            'entityType' => $row['entity_type'],
            'entityId' => $row['entity_id'],
            'oldValue' => $row['old_value'] ? json_decode($row['old_value'], true) : null,
            'newValue' => $row['new_value'] ? json_decode($row['new_value'], true) : null,
            'ip' => $row['ip'],
            'createdAt' => $row['created_at'],
        ];
    }
    $stmt->close();
    return $out;
}
