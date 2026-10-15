<?php
require_once __DIR__ . '/lib.php';

vth_event_cors();
$conn = vth_event_conn();
$id = (int) ($_GET['id'] ?? 0);
if ($id < 1) {
    vth_event_error('Duty id required');
}

$stmt = $conn->prepare(
    'SELECT d.*, e.name AS event_name, e.event_code, e.reporting_location AS event_location
     FROM vth_event_duties d
     JOIN vth_events e ON e.id = d.event_id
     WHERE d.id = ?'
);
$stmt->bind_param('i', $id);
$stmt->execute();
$duty = $stmt->get_result()->fetch_assoc();
$stmt->close();
if (!$duty) {
    vth_event_error('Duty not found', 404);
}
$stamped = vth_event_stamp_live_registrations($conn, [$duty]);
$duty = $stamped[0];

$allowed = false;
$headers = function_exists('getallheaders') ? getallheaders() : [];
$authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
if ($authHeader && stripos($authHeader, 'Bearer ') === 0) {
    $payload = verifyJwtToken(trim(substr($authHeader, 7)));
    if ($payload && in_array($payload['role'] ?? '', ['admin', 'super_admin'], true)) {
        $allowed = true;
    }
}
$driverToken = (string) ($_GET['driverToken'] ?? '');
if (!$allowed && $driverToken !== '') {
    $tok = vth_event_lookup_token($conn, $driverToken, 'driver');
    if ($tok && (int) $tok['assignment_id'] === (int) $duty['assignment_id']) {
        $allowed = true;
    }
}
$shareToken = (string) ($_GET['shareToken'] ?? '');
if (!$allowed && $shareToken !== '') {
    $tok = vth_event_lookup_token($conn, $shareToken, 'event_share');
    if ($tok && (int) $tok['event_id'] === (int) $duty['event_id']) {
        $allowed = true;
    }
}
if (!$allowed) {
    vth_event_error('Forbidden', 403);
}

function vth_pdf_data_uri(mysqli $conn, ?int $docId): string
{
    if (!$docId) {
        return '';
    }
    $stmt = $conn->prepare('SELECT storage_key, mime FROM vth_event_documents WHERE id = ?');
    $stmt->bind_param('i', $docId);
    $stmt->execute();
    $doc = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$doc) {
        return '';
    }
    $mime = $doc['mime'] ?: 'image/jpeg';
    $bytes = vth_event_read_file((string) $doc['storage_key'], $mime);
    if ($bytes === null) {
        return '';
    }
    if (str_contains((string) $mime, 'pdf')) {
        return '';
    }
    return 'data:' . $mime . ';base64,' . base64_encode($bytes);
}

$openImg = vth_pdf_data_uri($conn, $duty['opening_photo_id'] !== null ? (int) $duty['opening_photo_id'] : null);
$closeImg = vth_pdf_data_uri($conn, $duty['closing_photo_id'] !== null ? (int) $duty['closing_photo_id'] : null);
$logoCandidates = [
    dirname(__DIR__, 3) . '/uploads/vizagtaxihub-logo.png',
    ($_SERVER['DOCUMENT_ROOT'] ?? '') . '/uploads/vizagtaxihub-logo.png',
    dirname(__DIR__, 4) . '/public/uploads/vizagtaxihub-logo.png',
];
$logoUri = '';
foreach ($logoCandidates as $p) {
    if ($p && is_file($p)) {
        $logoUri = 'data:image/png;base64,' . base64_encode((string) file_get_contents($p));
        break;
    }
}

$h = static function ($v): string {
    return htmlspecialchars((string) ($v ?? ''), ENT_QUOTES, 'UTF-8');
};
$fmtTime = static function ($v): string {
    if (!$v) {
        return '—';
    }
    return date('d-m-Y h:i:s A', strtotime((string) $v));
};
$closingStamp = !empty($duty['end_requested_at']) ? $duty['end_requested_at'] : ($duty['closing_at'] ?? null);
$totalTime = '—';
// Bill from the scheduled reporting time on the duty date, not from when the driver tapped open.
$from = false;
$dutyDate = substr((string) ($duty['duty_date'] ?? ''), 0, 10);
$reporting = trim((string) ($duty['reporting_time'] ?? ''));
if (preg_match('/^(\d{1,2}):(\d{2})/', $reporting, $match) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dutyDate)) {
    $hours = (int) $match[1];
    $minutes = (int) $match[2];
    if ($hours >= 0 && $hours <= 23 && $minutes >= 0 && $minutes <= 59) {
        $from = strtotime($dutyDate . ' ' . sprintf('%02d:%02d:00', $hours, $minutes));
    }
}
if (!$from && !empty($duty['opening_at'])) {
    $from = strtotime((string) $duty['opening_at']);
}
$started = !empty($duty['opening_at']) || !empty($closingStamp);
if ($started && $from) {
    $to = $closingStamp ? strtotime((string) $closingStamp) : time();
    if ($to && $to >= $from) {
        $paused = isset($duty['paused_seconds']) ? (int) $duty['paused_seconds'] : 0;
        $mins = intdiv(max(0, ($to - $from) - $paused), 60);
        $hours = intdiv($mins, 60);
        $rest = $mins % 60;
        $totalTime = $hours > 0 ? ($hours . ' hr ' . $rest . ' min') : ($rest . ' min');
        if (!$closingStamp) {
            $totalTime .= ' (ongoing)';
        }
    }
}

$html = '<html><head><meta charset="utf-8"><style>
  body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #111; }
  .header { text-align: center; border-bottom: 2px solid #0066FF; padding-bottom: 10px; margin-bottom: 14px; }
  .header img { height: 42px; }
  h1 { font-size: 18px; margin: 6px 0 2px; color: #0066FF; }
  h2 { font-size: 14px; margin: 0 0 4px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  td, th { border: 1px solid #d0d7de; padding: 6px 8px; vertical-align: top; }
  th { background: #f4f7fb; text-align: left; width: 32%; }
  .photos img { max-width: 240px; max-height: 140px; }
  .sign { height: 54px; border-bottom: 1px solid #999; margin-top: 28px; }
  .muted { color: #666; font-size: 10px; }
  .code { font-weight: bold; letter-spacing: 1px; }
</style></head><body>
<div class="header">';
if ($logoUri) {
    $html .= '<img src="' . $logoUri . '" alt="VTH">';
}
$html .= '<h1>VIZAG TAXI HUB</h1>
<div>Travel &amp; Transportation Services</div>
<h2>DUTY SLIP</h2>
</div>
<table>
<tr><th>Event Name</th><td>' . $h($duty['event_name']) . '</td></tr>
<tr><th>Event ID</th><td>' . $h($duty['event_code']) . '</td></tr>
<tr><th>Duty Slip Number</th><td>' . $h($duty['duty_slip_no']) . '</td></tr>
<tr><th>Duty Date</th><td>' . $h(date('d-m-Y', strtotime($duty['duty_date']))) . '</td></tr>
<tr><th>Vehicle Type</th><td>' . $h(vth_event_vehicle_type_label((string) $duty['vehicle_type'])) . '</td></tr>
<tr><th>Vehicle Registration</th><td>' . $h($duty['vehicle_reg_snapshot'] ?: '—') . '</td></tr>
<tr><th>Driver Name</th><td>' . $h($duty['driver_name_snapshot'] ?: '—') . '</td></tr>
<tr><th>Driver Mobile</th><td>' . $h($duty['driver_mobile_snapshot'] ?: '—') . '</td></tr>
<tr><th>Reporting Location</th><td>' . $h($duty['reporting_location'] ?: $duty['event_location'] ?: '—') . '</td></tr>
<tr><th>Reporting Time</th><td>' . $h($duty['reporting_time'] ?: '—') . '</td></tr>
<tr><th>Opening KM</th><td>' . $h($duty['opening_km'] !== null ? number_format((int) $duty['opening_km']) : '—') . '</td></tr>
<tr><th>Opening Timestamp</th><td>' . $h($fmtTime($duty['opening_at'])) . '</td></tr>
<tr><th>Opening location</th><td>' . $h(!empty($duty['opening_address']) ? $duty['opening_address'] : ($duty['opening_lat'] !== null ? ($duty['opening_lat'] . ', ' . $duty['opening_lng']) : '—')) . '</td></tr>
<tr><th>Closing KM</th><td>' . $h($duty['closing_km'] !== null ? number_format((int) $duty['closing_km']) : '—') . '</td></tr>
<tr><th>Closing Timestamp</th><td>' . $h($fmtTime($closingStamp)) . '</td></tr>
<tr><th>Odometer uploaded</th><td>' . $h($fmtTime($duty['closing_at'])) . '</td></tr>
<tr><th>Closing location</th><td>' . $h(!empty($duty['closing_address']) ? $duty['closing_address'] : ($duty['closing_lat'] !== null ? ($duty['closing_lat'] . ', ' . $duty['closing_lng']) : '—')) . '</td></tr>
<tr><th>Total time</th><td>' . $h($totalTime) . '</td></tr>
<tr><th>Total KM</th><td><strong>' . $h($duty['total_km'] !== null ? number_format((int) $duty['total_km']) . ' KM' : '—') . '</strong></td></tr>
<tr><th>Status</th><td>' . $h($duty['status']) . '</td></tr>
<tr><th>Verification Code</th><td class="code">' . $h($duty['verification_code']) . '</td></tr>
<tr><th>Notes</th><td>' . $h($duty['notes'] ?: '—') . '</td></tr>
</table>
<table class="photos"><tr>
<td style="width:50%; text-align:center"><strong>Opening Odometer</strong><br>';
$html .= $openImg ? '<img src="' . $openImg . '">' : '—';
$html .= '</td><td style="width:50%; text-align:center"><strong>Closing Odometer</strong><br>';
$html .= $closeImg ? '<img src="' . $closeImg . '">' : '—';
$html .= '</td></tr></table>
<table><tr>
<td>Driver signature<div class="sign"></div></td>
<td>VTH representative<div class="sign"></div></td>
<td>Event representative<div class="sign"></div></td>
</tr></table>
<p class="muted">Generated by Vizag Taxi Hub · ' . $h(date('d-m-Y h:i:s A')) . ' · Official timestamps are server-recorded.</p>
</body></html>';

$autoload = dirname(__DIR__, 3) . '/vendor/autoload.php';
if (!is_file($autoload)) {
    $autoload = dirname(__DIR__, 2) . '/vendor/autoload.php';
}
if (is_file($autoload)) {
    require_once $autoload;
}

vth_event_audit($conn, 'system', null, 'duty_slip_generated', 'duty', $id, (int) $duty['event_id'], null, ['format' => 'pdf']);

if (class_exists('Dompdf\\Dompdf')) {
    $dompdf = new Dompdf\Dompdf(['isRemoteEnabled' => true]);
    $dompdf->loadHtml($html);
    $dompdf->setPaper('A4', 'portrait');
    $dompdf->render();
    $filename = $duty['duty_slip_no'] . '.pdf';
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    echo $dompdf->output();
    exit;
}

header('Content-Type: text/html; charset=utf-8');
echo $html;
exit;
