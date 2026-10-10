<?php
require_once __DIR__ . '/../events/lib.php';

vth_event_cors();
$admin = vth_event_require_admin();
$conn = vth_event_conn();
vth_event_ensure_optional_columns($conn);
$body = vth_event_body();
$action = vth_event_action($body);

switch ($action) {
    case 'create_event_share':
        $eventId = (int) ($body['eventId'] ?? 0);
        if (!vth_event_get($conn, $eventId)) {
            vth_event_error('Event not found', 404);
        }
        $days = (int) ($body['expiresInDays'] ?? 60);
        $expires = $days > 0 ? date('Y-m-d H:i:s', time() + $days * 86400) : null;
        $raw = vth_event_issue_token($conn, 'event_share', $eventId, null, null, $expires);
        $url = vth_event_public_base() . '/event/share/' . $raw;
        vth_event_audit($conn, 'admin', $admin['user_id'] ?? null, 'event_share_created', 'event', $eventId, $eventId, null, ['expires' => $expires]);
        vth_event_ok([
            'token' => $raw,
            'url' => $url,
            'todayUrl' => $url . '?date=' . date('Y-m-d'),
            'expiresAt' => $expires,
        ], 'Share link created');
        break;
    case 'revoke_event_share':
        $id = (int) ($body['id'] ?? 0);
        $stmt = $conn->prepare('UPDATE vth_event_tokens SET revoked_at = NOW() WHERE id = ? AND token_type = \'event_share\'');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();
        vth_event_audit($conn, 'admin', $admin['user_id'] ?? null, 'event_share_revoked', 'token', $id, $body['eventId'] ?? null, null, ['revoked' => true]);
        vth_event_ok([], 'Share link revoked');
        break;
    case 'create_driver_token':
        $assignmentId = (int) ($body['assignmentId'] ?? 0);
        $stmt = $conn->prepare('SELECT * FROM vth_event_assignments WHERE id = ?');
        $stmt->bind_param('i', $assignmentId);
        $stmt->execute();
        $asg = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$asg) {
            vth_event_error('Assignment not found', 404);
        }
        $revoke = $conn->prepare(
            'UPDATE vth_event_tokens SET revoked_at = NOW()
             WHERE assignment_id = ? AND token_type = \'driver\' AND revoked_at IS NULL'
        );
        $revoke->bind_param('i', $assignmentId);
        $revoke->execute();
        $revoke->close();
        $days = (int) ($body['expiresInDays'] ?? 45);
        $expires = $days > 0 ? date('Y-m-d H:i:s', time() + $days * 86400) : null;
        $raw = vth_event_issue_token(
            $conn,
            'driver',
            (int) $asg['event_id'],
            $assignmentId,
            $asg['driver_id'] !== null ? (int) $asg['driver_id'] : null,
            $expires
        );
        $url = vth_event_public_base() . '/driver/register/' . $raw;
        vth_event_audit($conn, 'admin', $admin['user_id'] ?? null, 'driver_link_created', 'assignment', $assignmentId, (int) $asg['event_id'], null, ['expires' => $expires]);
        vth_event_ok([
            'token' => $raw,
            'url' => $url,
            'expiresAt' => $expires,
        ], 'Driver registration link created');
        break;
    case 'revoke_driver_token':
        $id = (int) ($body['id'] ?? 0);
        $stmt = $conn->prepare('UPDATE vth_event_tokens SET revoked_at = NOW() WHERE id = ? AND token_type = \'driver\'');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();
        vth_event_audit($conn, 'admin', $admin['user_id'] ?? null, 'driver_link_revoked', 'token', $id, $body['eventId'] ?? null, null, ['revoked' => true]);
        vth_event_ok([], 'Driver link revoked');
        break;
    case 'list':
        $eventId = (int) ($body['eventId'] ?? $_GET['eventId'] ?? 0);
        if ($eventId < 1) {
            vth_event_error('eventId is required');
        }
        $plainCol = $conn->query("SHOW COLUMNS FROM vth_event_tokens LIKE 'token_plain'");
        $hasPlain = $plainCol && $plainCol->num_rows > 0;
        $stmt = $conn->prepare(
            'SELECT id, token_type, assignment_id, driver_id, expires_at, revoked_at, last_used_at, created_at'
            . ($hasPlain ? ', token_plain' : '')
            . ' FROM vth_event_tokens WHERE event_id = ? ORDER BY id DESC'
        );
        $stmt->bind_param('i', $eventId);
        $stmt->execute();
        $res = $stmt->get_result();
        $out = [];
        while ($row = $res->fetch_assoc()) {
            $out[] = [
                'id' => (int) $row['id'],
                'type' => $row['token_type'],
                'assignmentId' => $row['assignment_id'] !== null ? (int) $row['assignment_id'] : null,
                'driverId' => $row['driver_id'] !== null ? (int) $row['driver_id'] : null,
                'expiresAt' => $row['expires_at'],
                'revokedAt' => $row['revoked_at'],
                'lastUsedAt' => $row['last_used_at'],
                'createdAt' => $row['created_at'],
                'active' => empty($row['revoked_at']),
                'url' => ($row['token_type'] === 'event_share' && !empty($row['token_plain']))
                    ? vth_event_public_base() . '/event/share/' . $row['token_plain']
                    : null,
            ];
        }
        $stmt->close();
        vth_event_ok(['tokens' => $out]);
        break;
    default:
        vth_event_error('Unknown action');
}
