<?php
require_once __DIR__ . '/../events/lib.php';

vth_event_cors();
$admin = vth_event_require_admin();
$conn = vth_event_conn();
vth_event_ensure_optional_columns($conn);

$body = vth_event_body();
$action = vth_event_action($body);
if ($action === '' && ($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
    $action = isset($_GET['id']) ? 'get' : 'list';
}

switch ($action) {
    case 'list':
        $eventId = (int) ($body['eventId'] ?? $_GET['eventId'] ?? 0);
        $date = (string) ($body['date'] ?? $_GET['date'] ?? '');
        $status = (string) ($body['status'] ?? $_GET['status'] ?? '');
        vth_event_ok(['duties' => vth_duty_list($conn, $eventId, $date, $status)]);
        break;
    case 'get':
        $id = (int) ($body['id'] ?? $_GET['id'] ?? 0);
        $row = vth_duty_get($conn, $id);
        if (!$row) {
            vth_event_error('Duty not found', 404);
        }
        vth_event_ok(['duty' => $row]);
        break;
    case 'override_km':
        vth_event_ok(['duty' => vth_duty_override_km($conn, $admin, $body)], 'Kilometres updated');
        break;
    case 'override_times':
        vth_event_ok(['duty' => vth_duty_override_times($conn, $admin, $body)], 'Times updated');
        break;
    case 'set_reporting':
        vth_event_ok(['duty' => vth_duty_set_reporting($conn, $admin, $body)], 'Reporting time updated');
        break;
    case 'set_status':
        vth_event_ok(['duty' => vth_duty_set_status($conn, $admin, $body)], 'Status updated');
        break;
    case 'set_notes':
        vth_event_ok(['duty' => vth_duty_set_notes($conn, $admin, $body)], 'Notes updated');
        break;
    case 'delete':
        vth_duty_delete($conn, $admin, (int) ($body['id'] ?? 0));
        vth_event_ok([], 'Duty deleted');
        break;
    case 'reset_reading':
        vth_event_ok(['duty' => vth_duty_reset_reading($conn, $admin, $body)], 'Driver can re-upload this reading');
        break;
    case 'request_end':
        $id = (int) ($body['id'] ?? 0);
        vth_event_ok(
            vth_event_request_driver_end($conn, $id, 'admin', null, $admin['id'] ?? null),
            'Driver asked to end the duty'
        );
        break;
    case 'revoke_end':
        $id = (int) ($body['id'] ?? 0);
        vth_event_ok(
            vth_event_revoke_driver_end($conn, $id, 'admin', null, $admin['id'] ?? null),
            'End request revoked'
        );
        break;
    case 'resume_duty':
        $id = (int) ($body['id'] ?? 0);
        vth_event_ok(
            vth_event_resume_duty($conn, $id, 'admin', null, $admin['id'] ?? null),
            'Duty continued'
        );
        break;
    case 'tracking':
        $eventId = (int) ($body['eventId'] ?? $_GET['eventId'] ?? 0);
        $date = (string) ($body['date'] ?? $_GET['date'] ?? date('Y-m-d'));
        if ($eventId < 1) {
            vth_event_error('eventId is required');
        }
        vth_event_ok(['vehicles' => vth_event_track_list($conn, $eventId, $date)]);
        break;
    default:
        vth_event_error('Unknown action');
}

function vth_duty_list(mysqli $conn, int $eventId, string $date, string $status): array
{
    if ($eventId < 1) {
        vth_event_error('eventId is required');
    }
    $sql = 'SELECT d.*, e.name AS event_name, e.event_code
            FROM vth_event_duties d
            JOIN vth_events e ON e.id = d.event_id
            WHERE d.event_id = ?';
    $types = 'i';
    $params = [$eventId];
    if ($date !== '') {
        $sql .= ' AND d.duty_date = ?';
        $types .= 's';
        $params[] = $date;
    }
    if ($status !== '' && in_array($status, VTH_EVENT_DUTY_STATUSES, true)) {
        $sql .= ' AND d.status = ?';
        $types .= 's';
        $params[] = $status;
    }
    $sql .= ' ORDER BY d.duty_date, d.vehicle_type, d.id';
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $res = $stmt->get_result();
    $rows = [];
    while ($row = $res->fetch_assoc()) {
        $rows[] = $row;
    }
    $stmt->close();
    return vth_event_map_duty_rows($conn, $rows);
}

function vth_duty_get(mysqli $conn, int $id): ?array
{
    $stmt = $conn->prepare(
        'SELECT d.*, e.name AS event_name, e.event_code
         FROM vth_event_duties d
         JOIN vth_events e ON e.id = d.event_id
         WHERE d.id = ?'
    );
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $row ? vth_admin_duty_row($row, $conn) : null;
}

function vth_duty_override_km(mysqli $conn, array $admin, array $body): array
{
    $id = (int) ($body['id'] ?? 0);
    $stmt = $conn->prepare('SELECT * FROM vth_event_duties WHERE id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $old = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$old) {
        vth_event_error('Duty not found', 404);
    }
    $opening = array_key_exists('openingKm', $body) ? (int) $body['openingKm'] : ($old['opening_km'] !== null ? (int) $old['opening_km'] : null);
    $closing = array_key_exists('closingKm', $body) ? (int) $body['closingKm'] : ($old['closing_km'] !== null ? (int) $old['closing_km'] : null);
    $total = null;
    $status = $old['status'];
    if ($opening !== null && $closing !== null) {
        if ($closing < $opening) {
            vth_event_error('Closing KM cannot normally be lower than opening KM.');
        }
        $total = $closing - $opening;
        $status = 'completed';
    } elseif ($opening !== null) {
        $status = 'in_progress';
    }
    $upd = $conn->prepare(
        'UPDATE vth_event_duties SET opening_km = ?, closing_km = ?, total_km = ?, status = ?, admin_override = 1 WHERE id = ?'
    );
    $upd->bind_param('iissi', $opening, $closing, $total, $status, $id);
    $upd->execute();
    $upd->close();
    vth_event_audit($conn, 'admin', $admin['user_id'] ?? null, 'admin_edited_km', 'duty', $id, (int) $old['event_id'], [
        'opening_km' => $old['opening_km'],
        'closing_km' => $old['closing_km'],
        'total_km' => $old['total_km'],
    ], [
        'opening_km' => $opening,
        'closing_km' => $closing,
        'total_km' => $total,
    ]);
    return vth_duty_get($conn, $id) ?: [];
}

function vth_duty_clock(?string $value): ?string
{
    $value = trim(str_replace('T', ' ', (string) $value));
    if ($value === '') {
        return null;
    }
    if (!preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/', $value)) {
        vth_event_error('Enter a valid date and time');
    }
    if (strlen($value) === 16) {
        $value .= ':00';
    }
    return $value;
}

function vth_duty_override_times(mysqli $conn, array $admin, array $body): array
{
    $id = (int) ($body['id'] ?? 0);
    $stmt = $conn->prepare('SELECT * FROM vth_event_duties WHERE id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $old = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$old) {
        vth_event_error('Duty not found', 404);
    }
    $reporting = substr(trim((string) ($body['reportingTime'] ?? '')), 0, 5);
    if (!preg_match('/^\d{2}:\d{2}$/', $reporting)) {
        vth_event_error('Enter a reporting time');
    }
    $opening = vth_duty_clock(isset($body['reportedAt']) ? (string) $body['reportedAt'] : null);
    $closing = vth_duty_clock(isset($body['closingAt']) ? (string) $body['closingAt'] : null);
    if ($opening && $closing && strtotime($closing) < strtotime($opening)) {
        vth_event_error('Closing time cannot be earlier than the reported time.');
    }
    $end = !empty($old['end_requested_at']) ? $closing : ($old['end_requested_at'] ?? null);
    $upd = $conn->prepare(
        'UPDATE vth_event_duties
         SET reporting_time = ?, opening_at = ?, closing_at = ?, end_requested_at = ?, admin_override = 1
         WHERE id = ?'
    );
    $upd->bind_param('ssssi', $reporting, $opening, $closing, $end, $id);
    $upd->execute();
    $upd->close();
    vth_event_audit($conn, 'admin', $admin['user_id'] ?? null, 'admin_edited_times', 'duty', $id, (int) $old['event_id'], [
        'reporting_time' => $old['reporting_time'],
        'opening_at' => $old['opening_at'],
        'closing_at' => $old['closing_at'],
        'end_requested_at' => $old['end_requested_at'] ?? null,
    ], [
        'reporting_time' => $reporting,
        'opening_at' => $opening,
        'closing_at' => $closing,
        'end_requested_at' => $end,
    ]);
    return vth_duty_get($conn, $id) ?: [];
}

function vth_duty_apply_reporting(mysqli $conn, int $id, string $reporting, ?string $loc, bool $revive): void
{
    if ($revive && $loc === null) {
        $upd = $conn->prepare(
            "UPDATE vth_event_duties
             SET reporting_time = ?, reporting_location = NULL, status = 'not_started'
             WHERE id = ? AND opening_at IS NULL"
        );
        $upd->bind_param('si', $reporting, $id);
    } elseif ($revive) {
        $upd = $conn->prepare(
            "UPDATE vth_event_duties
             SET reporting_time = ?, reporting_location = ?, status = 'not_started'
             WHERE id = ? AND opening_at IS NULL"
        );
        $upd->bind_param('ssi', $reporting, $loc, $id);
    } elseif ($loc === null) {
        $upd = $conn->prepare(
            'UPDATE vth_event_duties SET reporting_time = ?, reporting_location = NULL WHERE id = ?'
        );
        $upd->bind_param('si', $reporting, $id);
    } else {
        $upd = $conn->prepare(
            'UPDATE vth_event_duties SET reporting_time = ?, reporting_location = ? WHERE id = ?'
        );
        $upd->bind_param('ssi', $reporting, $loc, $id);
    }
    $upd->execute();
    $upd->close();
}

function vth_duty_set_reporting(mysqli $conn, array $admin, array $body): array
{
    $id = (int) ($body['id'] ?? 0);
    $stmt = $conn->prepare('SELECT * FROM vth_event_duties WHERE id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $old = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$old) {
        vth_event_error('Duty not found', 404);
    }
    $reporting = vth_event_clock_hm((string) ($body['reportingTime'] ?? ''));
    if ($reporting === null) {
        vth_event_error('Enter a reporting time');
    }
    $loc = array_key_exists('reportingLocation', $body)
        ? (trim((string) $body['reportingLocation']) ?: null)
        : ($old['reporting_location'] ?? null);
    $date = substr((string) ($body['date'] ?? $old['duty_date']), 0, 10);
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        $date = substr((string) $old['duty_date'], 0, 10);
    }
    $assignmentId = (int) ($body['assignmentId'] ?? $old['assignment_id']);
    if ($assignmentId < 1) {
        $assignmentId = (int) $old['assignment_id'];
    }
    $live = $conn->prepare(
        "SELECT id FROM vth_event_duties
         WHERE assignment_id = ? AND duty_date = ? AND status <> 'cancelled'
         ORDER BY id DESC LIMIT 1"
    );
    $live->bind_param('is', $assignmentId, $date);
    $live->execute();
    $liveRow = $live->get_result()->fetch_assoc();
    $live->close();
    $oldDate = substr((string) $old['duty_date'], 0, 10);
    $target = $liveRow ? (int) $liveRow['id'] : 0;
    $revive = false;
    if ($target < 1 && $oldDate === $date && ($old['status'] ?? '') === 'cancelled' && empty($old['opening_at'])) {
        $target = (int) $old['id'];
        $revive = true;
    } elseif ($target < 1 && $oldDate === $date && ($old['status'] ?? '') !== 'cancelled') {
        $target = (int) $old['id'];
    }
    if ($target < 1) {
        vth_event_error('No open duty for ' . $date);
    }
    vth_duty_apply_reporting($conn, $target, $reporting, $loc, $revive);
    $fresh = vth_duty_get($conn, $target) ?: [];
    $savedTime = vth_event_clock_hm((string) ($fresh['reportingTime'] ?? ''));
    $savedLoc = trim((string) ($fresh['reportingLocation'] ?? ''));
    $wantLoc = $loc === null ? '' : $loc;
    if ($savedTime !== $reporting || $savedLoc !== $wantLoc || ($fresh['status'] ?? '') === 'cancelled') {
        vth_event_error('Reporting details for ' . $date . ' did not save');
    }
    vth_event_audit($conn, 'admin', $admin['user_id'] ?? null, 'admin_edited_reporting', 'duty', $target, (int) $old['event_id'], [
        'reporting_time' => $old['reporting_time'],
        'reporting_location' => $old['reporting_location'],
        'status' => $old['status'],
    ], [
        'reporting_time' => $reporting,
        'reporting_location' => $loc,
        'duty_id' => $target,
    ]);
    return $fresh;
}

function vth_duty_set_status(mysqli $conn, array $admin, array $body): array
{
    $id = (int) ($body['id'] ?? 0);
    $status = (string) ($body['status'] ?? '');
    if (!in_array($status, VTH_EVENT_DUTY_STATUSES, true)) {
        vth_event_error('Invalid status');
    }
    $stmt = $conn->prepare('SELECT * FROM vth_event_duties WHERE id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $old = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$old) {
        vth_event_error('Duty not found', 404);
    }
    $upd = $conn->prepare('UPDATE vth_event_duties SET status = ? WHERE id = ?');
    $upd->bind_param('si', $status, $id);
    $upd->execute();
    $upd->close();
    vth_event_audit($conn, 'admin', $admin['user_id'] ?? null, 'duty_status_changed', 'duty', $id, (int) $old['event_id'], $old['status'], $status);
    return vth_duty_get($conn, $id) ?: [];
}

function vth_duty_set_notes(mysqli $conn, array $admin, array $body): array
{
    $id = (int) ($body['id'] ?? 0);
    $notes = trim((string) ($body['notes'] ?? ''));
    $stmt = $conn->prepare('SELECT * FROM vth_event_duties WHERE id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $old = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$old) {
        vth_event_error('Duty not found', 404);
    }
    $upd = $conn->prepare('UPDATE vth_event_duties SET notes = ? WHERE id = ?');
    $upd->bind_param('si', $notes, $id);
    $upd->execute();
    $upd->close();
    vth_event_audit($conn, 'admin', $admin['user_id'] ?? null, 'duty_notes_updated', 'duty', $id, (int) $old['event_id'], $old['notes'], $notes);
    return vth_duty_get($conn, $id) ?: [];
}

function vth_duty_reset_reading(mysqli $conn, array $admin, array $body): array
{
    $id = (int) ($body['id'] ?? 0);
    $side = (string) ($body['side'] ?? 'opening');
    $stmt = $conn->prepare('SELECT * FROM vth_event_duties WHERE id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $old = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$old) {
        vth_event_error('Duty not found', 404);
    }
    if ($side === 'closing') {
        vth_event_reset_duty_closing($conn, $id);
    } elseif ($side === 'opening') {
        vth_event_reset_duty_opening($conn, $id);
    } else {
        vth_event_error('Choose opening or closing');
    }
    vth_event_audit($conn, 'admin', $admin['user_id'] ?? null, 'duty_reading_reset', 'duty', $id, (int) $old['event_id'], $old['status'], $side);
    $fresh = vth_duty_get($conn, $id);
    if (!$fresh) {
        vth_event_error('Duty not found', 404);
    }
    return $fresh;
}

function vth_duty_delete(mysqli $conn, array $admin, int $id): void
{
    $stmt = $conn->prepare('SELECT * FROM vth_event_duties WHERE id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $old = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$old) {
        vth_event_error('Duty not found', 404);
    }
    if (!in_array($old['status'], ['not_started', 'scheduled', 'cancelled'], true)) {
        vth_event_error('Cancel this duty first, or only delete duties that have not started.');
    }
    $del = $conn->prepare('DELETE FROM vth_event_duties WHERE id = ?');
    $del->bind_param('i', $id);
    $del->execute();
    $del->close();
    vth_event_audit($conn, 'admin', $admin['user_id'] ?? null, 'duty_deleted', 'duty', $id, (int) $old['event_id'], $old, null);
}
