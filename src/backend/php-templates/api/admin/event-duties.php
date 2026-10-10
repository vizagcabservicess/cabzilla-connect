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
