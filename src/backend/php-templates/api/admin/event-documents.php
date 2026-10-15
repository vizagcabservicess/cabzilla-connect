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
        vth_event_ok(['documents' => vth_docs_list($conn, $eventId)]);
        break;
    case 'verify':
        vth_docs_set_status($conn, $admin, (int) ($body['id'] ?? 0), 'verified', null);
        vth_event_ok([], 'Document verified');
        break;
    case 'reject':
        $reason = trim((string) ($body['reason'] ?? ''));
        if ($reason === '') {
            vth_event_error('Rejection reason is required');
        }
        vth_docs_set_status($conn, $admin, (int) ($body['id'] ?? 0), 'rejected', $reason);
        vth_event_ok([], 'Document rejected');
        break;
    case 'upload':
        vth_event_ok(['document' => vth_docs_admin_upload($conn, $admin)], 'Document uploaded');
        break;
    case 'delete':
        vth_docs_delete($conn, $admin, (int) ($body['id'] ?? 0));
        vth_event_ok([], 'Document deleted');
        break;
    case 'media':
        $id = (int) ($body['id'] ?? $_GET['id'] ?? 0);
        if ($id < 1) {
            vth_event_error('Document id required');
        }
        $stmt = $conn->prepare('SELECT * FROM vth_event_documents WHERE id = ?');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $doc = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$doc) {
            vth_event_error('Document not found', 404);
        }
        vth_event_ok(vth_event_media_payload($doc));
        break;
    default:
        vth_event_error('Unknown action');
}

function vth_docs_list(mysqli $conn, int $eventId): array
{
    if ($eventId < 1) {
        vth_event_error('eventId is required');
    }
    $sql = 'SELECT doc.id, doc.owner_type, doc.owner_id, doc.doc_type, doc.status, doc.rejection_reason, doc.created_at,
                   d.driver_name_snapshot, d.vehicle_reg_snapshot, d.duty_date, d.duty_slip_no,
                   dr.name AS driver_table_name,
                   ev.registration_number AS event_vehicle_number,
                   fv.vehicle_number AS fleet_vehicle_number
            FROM vth_event_documents doc
            LEFT JOIN vth_event_duties d ON doc.owner_type = \'duty\' AND d.id = doc.owner_id
            LEFT JOIN drivers dr ON doc.owner_type = \'driver\' AND dr.id = doc.owner_id
            LEFT JOIN vth_event_vehicles ev ON doc.owner_type = \'vehicle\' AND ev.id = doc.owner_id AND ev.status = \'active\'
            LEFT JOIN fleet_vehicles fv ON doc.owner_type = \'vehicle\' AND fv.id = doc.owner_id
            WHERE doc.event_id = ? OR (doc.owner_type = \'duty\' AND d.event_id = ?)
            ORDER BY doc.id DESC';
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('ii', $eventId, $eventId);
    $stmt->execute();
    $res = $stmt->get_result();
    $rows = [];
    while ($row = $res->fetch_assoc()) {
        $rows[] = $row;
    }
    $stmt->close();
    $driverVehicles = [];
    $asg = $conn->prepare(
        'SELECT a.driver_id, COALESCE(ev.registration_number, fv.vehicle_number) AS vehicle_number
         FROM vth_event_assignments a
         LEFT JOIN vth_event_vehicles ev ON ev.id = a.event_vehicle_id
         LEFT JOIN fleet_vehicles fv ON fv.id = a.fleet_vehicle_id
         WHERE a.event_id = ? AND a.status = \'active\' AND a.driver_id IS NOT NULL'
    );
    $asg->bind_param('i', $eventId);
    $asg->execute();
    $ares = $asg->get_result();
    while ($row = $ares->fetch_assoc()) {
        $did = (int) $row['driver_id'];
        if (!isset($driverVehicles[$did]) && !empty($row['vehicle_number'])) {
            $driverVehicles[$did] = $row['vehicle_number'];
        }
    }
    $asg->close();
    $out = [];
    foreach ($rows as $row) {
        $ownerId = (int) $row['owner_id'];
        $vehicleNumber = $row['vehicle_reg_snapshot'] ?: $row['event_vehicle_number'] ?: $row['fleet_vehicle_number'];
        if (!$vehicleNumber && $row['owner_type'] === 'driver') {
            $vehicleNumber = $driverVehicles[$ownerId] ?? null;
        }
        $out[] = [
            'id' => (int) $row['id'],
            'ownerType' => $row['owner_type'],
            'ownerId' => $ownerId,
            'docType' => $row['doc_type'],
            'status' => $row['status'],
            'rejectionReason' => $row['rejection_reason'],
            'driverName' => $row['driver_name_snapshot'] ?: $row['driver_table_name'],
            'vehicleNumber' => $vehicleNumber,
            'dutyDate' => $row['duty_date'] ?? null,
            'dutySlipNo' => $row['duty_slip_no'] ?? null,
            'createdAt' => $row['created_at'],
            'sensitive' => in_array($row['doc_type'], VTH_EVENT_SENSITIVE_DOCS, true),
        ];
    }
    return $out;
}

function vth_docs_set_status(mysqli $conn, array $admin, int $id, string $status, ?string $reason): void
{
    $stmt = $conn->prepare('SELECT * FROM vth_event_documents WHERE id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $old = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$old) {
        vth_event_error('Document not found', 404);
    }
    $upd = $conn->prepare('UPDATE vth_event_documents SET status = ?, rejection_reason = ? WHERE id = ?');
    $upd->bind_param('ssi', $status, $reason, $id);
    $upd->execute();
    $upd->close();
    vth_event_audit(
        $conn,
        'admin',
        $admin['user_id'] ?? null,
        $status === 'verified' ? 'document_verified' : 'document_rejected',
        'document',
        $id,
        $old['event_id'] !== null ? (int) $old['event_id'] : null,
        $old['status'],
        ['status' => $status, 'reason' => $reason]
    );
}

function vth_docs_admin_upload(mysqli $conn, array $admin): array
{
    if (empty($_FILES['file']) && empty($_FILES['image'])) {
        vth_event_error('File is required');
    }
    $file = $_FILES['file'] ?? $_FILES['image'];
    $saved = vth_event_save_upload($file, (string) ($_POST['docType'] ?? 'doc'));
    if (!empty($saved['error'])) {
        vth_event_error($saved['error']);
    }
    $ownerType = (string) ($_POST['ownerType'] ?? '');
    $ownerId = (int) ($_POST['ownerId'] ?? 0);
    $docType = (string) ($_POST['docType'] ?? '');
    $eventId = (int) ($_POST['eventId'] ?? 0) ?: null;
    if (!in_array($ownerType, ['driver', 'vehicle', 'duty'], true) || $ownerId < 1 || $docType === '') {
        vth_event_error('ownerType, ownerId and docType are required');
    }
    $id = vth_event_insert_document($conn, $eventId, $ownerType, $ownerId, $docType, $saved, 'admin:' . ($admin['user_id'] ?? '0'));
    vth_event_audit($conn, 'admin', $admin['user_id'] ?? null, 'document_uploaded', 'document', $id, $eventId, null, [
        'docType' => $docType,
        'ownerType' => $ownerType,
        'ownerId' => $ownerId,
    ]);
    return ['id' => $id, 'docType' => $docType, 'status' => 'pending'];
}

function vth_docs_delete(mysqli $conn, array $admin, int $id): void
{
    $stmt = $conn->prepare('SELECT * FROM vth_event_documents WHERE id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $old = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$old) {
        vth_event_error('Document not found', 404);
    }
    $del = $conn->prepare('DELETE FROM vth_event_documents WHERE id = ?');
    $del->bind_param('i', $id);
    $del->execute();
    $del->close();
    if ($old['owner_type'] === 'duty') {
        $dutyId = (int) $old['owner_id'];
        if ($old['doc_type'] === 'opening_odometer') {
            vth_event_reset_duty_opening($conn, $dutyId);
        } elseif ($old['doc_type'] === 'closing_odometer') {
            vth_event_reset_duty_closing($conn, $dutyId);
        }
    }
    vth_event_audit(
        $conn,
        'admin',
        $admin['user_id'] ?? null,
        'document_deleted',
        'document',
        $id,
        $old['event_id'] !== null ? (int) $old['event_id'] : null,
        $old,
        null
    );
}
