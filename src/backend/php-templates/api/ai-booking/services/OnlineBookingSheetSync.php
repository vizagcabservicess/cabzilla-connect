<?php
/**
 * Sync online (guest) bookings to the VTH Google Sheet ledger.
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/sheets-config.php';
require_once __DIR__ . '/GoogleSheetService.php';
require_once __DIR__ . '/../../utils/ai-booking-db.php';

class OnlineBookingSheetSync
{
    /**
     * @return array{success: bool, invoice_no?: int, skipped?: bool, error?: string, tab_name?: string, sheet_row?: int}
     */
    public static function syncByBookingId(int $bookingId): array
    {
        try {
            $pdo = ai_booking_get_pdo();
            $booking = self::fetchBooking($pdo, $bookingId);
            if ($booking === null) {
                return ['success' => false, 'error' => 'Booking not found'];
            }

            $tab = vth_sheets_tab_from_pickup_date((string) ($booking['pickup_date'] ?? ''));
            $sheetInvoiceHint = self::peekSheetInvoiceNo($tab);
            $invoiceNo = self::ensureInvoiceNo($pdo, $bookingId, $booking, $sheetInvoiceHint);
            $booking = self::fetchBooking($pdo, $bookingId);
            if ($booking === null) {
                return ['success' => false, 'error' => 'Booking not found after invoice allocation'];
            }

            if (self::hasSuccessfulSync($pdo, $invoiceNo)) {
                return [
                    'success' => true,
                    'skipped' => true,
                    'invoice_no' => $invoiceNo,
                ];
            }

            $sheet = new GoogleSheetService($tab);
            $sync = $sheet->appendRow(self::normalizeForSheet($booking));

            if ($sync['success']) {
                $adopted = self::adoptSheetInvoiceNo(
                    $pdo,
                    $bookingId,
                    (int) ($sync['sheet_invoice_no'] ?? 0)
                );
                if ($adopted > 0) {
                    $invoiceNo = $adopted;
                }
                $pdo->prepare('UPDATE bookings SET sync_pending = 0 WHERE id = ?')->execute([$bookingId]);
            }

            return [
                'success' => $sync['success'],
                'invoice_no' => $invoiceNo,
                'tab_name' => $sync['tab_name'] ?? $tab,
                'sheet_row' => $sync['sheet_row'] ?? null,
                'error' => $sync['success'] ? null : ($sync['error'] ?? 'Unknown sync error'),
            ];
        } catch (Throwable $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Display / PDF invoice number: Google Sheet Invoice no when present.
     *
     * @param array<string, mixed> $booking
     */
    public static function displayInvoiceNumber(array $booking, string $customNumber = ''): string
    {
        $custom = trim($customNumber);
        if ($custom !== '') {
            return $custom;
        }
        $sheetNo = (int) ($booking['invoice_no'] ?? 0);
        if ($sheetNo > 0) {
            return (string) $sheetNo;
        }
        $bookingId = (int) ($booking['id'] ?? 0);

        return $bookingId > 0
            ? ('INV-' . date('Ymd') . '-' . $bookingId)
            : ('INV-' . date('Ymd'));
    }

    /**
     * Claim the next pre-filled Invoice no from a sheet tab (0 if unavailable).
     */
    public static function peekSheetInvoiceNo(?string $tabName = null): int
    {
        try {
            $sheet = new GoogleSheetService($tabName);
            $slot = $sheet->peekNextBookingSlot();

            return (int) ($slot['invoice_no'] ?? 0);
        } catch (Throwable $e) {
            return 0;
        }
    }

    /**
     * Keep bookings.invoice_no aligned with the Invoice no written on the sheet row.
     * When $force is true (identity-matched sheet row), steal the number from any other booking.
     */
    public static function adoptSheetInvoiceNo(
        PDO $pdo,
        int $bookingId,
        int $sheetInvoiceNo,
        bool $force = false
    ): int {
        if ($bookingId <= 0 || $sheetInvoiceNo <= 0) {
            return 0;
        }

        $stmt = $pdo->prepare('SELECT invoice_no FROM bookings WHERE id = ? LIMIT 1');
        $stmt->execute([$bookingId]);
        $current = (int) ($stmt->fetchColumn() ?: 0);
        if ($current === $sheetInvoiceNo) {
            return $sheetInvoiceNo;
        }

        $taken = $pdo->prepare('SELECT id FROM bookings WHERE invoice_no = ? AND id <> ? LIMIT 1');
        $taken->execute([$sheetInvoiceNo, $bookingId]);
        $otherId = $taken->fetchColumn();
        if ($otherId) {
            if (!$force) {
                return $current > 0 ? $current : 0;
            }
            $clear = $pdo->prepare('UPDATE bookings SET invoice_no = NULL WHERE id = ? AND invoice_no = ?');
            $clear->execute([(int) $otherId, $sheetInvoiceNo]);
        }

        $update = $pdo->prepare('UPDATE bookings SET invoice_no = ? WHERE id = ?');
        $update->execute([$sheetInvoiceNo, $bookingId]);

        return $sheetInvoiceNo;
    }

    /**
     * Update payment columns on an already-synced row after Razorpay payment.
     *
     * @return array{success: bool, skipped?: bool, error?: string}
     */
    public static function updatePaymentAfterVerify(int $bookingId, float $amountPaid): array
    {
        try {
            $pdo = ai_booking_get_pdo();
            $booking = self::fetchBooking($pdo, $bookingId);
            if ($booking === null) {
                return ['success' => false, 'error' => 'Booking not found'];
            }

            $invoiceNo = (int) ($booking['invoice_no'] ?? 0);
            if ($invoiceNo <= 0) {
                return self::syncByBookingId($bookingId);
            }

            $sheetRow = self::getSyncedSheetRow($pdo, $invoiceNo);
            $tab = vth_sheets_tab_from_pickup_date((string) ($booking['pickup_date'] ?? ''));
            $cost = self::sheetCostFromBooking($booking);
            $advance = (int) round($amountPaid);

            if ($sheetRow === null) {
                return self::syncByBookingId($bookingId);
            }

            $sheet = new GoogleSheetService($tab);
            $updated = $sheet->updatePaymentFields($sheetRow, $advance, $cost);

            return [
                'success' => $updated['success'],
                'invoice_no' => $invoiceNo,
                'tab_name' => $tab,
                'sheet_row' => $sheetRow,
                'error' => $updated['success'] ? null : ($updated['error'] ?? 'Payment update failed'),
            ];
        } catch (Throwable $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Find this booking's sheet row by guest identity and store column A's Invoice no.
     * Sheet column A always wins over a DB MAX+1 invoice_no that is not on the sheet.
     * Does not write COST or other cells.
     *
     * @return array{success: bool, skipped?: bool, error?: string|null, invoice_no?: int|null, sheet_row?: int, tab_name?: string}
     */
    public static function adoptInvoiceFromSheet(int $bookingId): array
    {
        if ($bookingId <= 0) {
            return ['success' => true, 'skipped' => true, 'error' => null];
        }

        try {
            $pdo = ai_booking_get_pdo();
            $booking = self::fetchBooking($pdo, $bookingId);
            if ($booking === null) {
                return ['success' => false, 'skipped' => false, 'error' => 'Booking not found'];
            }

            $existing = (int) ($booking['invoice_no'] ?? 0);

            // Match by name/phone/DOJ — never by DB invoice_no alone.
            // DB may hold a global MAX+1 value (e.g. 596) that is not on this month's sheet.
            $match = self::findSheetMatchByIdentity($pdo, $booking);
            if ($match === null) {
                return [
                    'success' => true,
                    'skipped' => true,
                    'invoice_no' => $existing > 0 ? $existing : null,
                    'error' => null,
                ];
            }
            if (isset($match['error'])) {
                return [
                    'success' => false,
                    'skipped' => false,
                    'invoice_no' => $existing > 0 ? $existing : null,
                    'error' => (string) $match['error'],
                ];
            }

            $identity = $match['sheet']->readIdentityRow((int) $match['row']);
            $sheetInv = GoogleSheetService::parseInvoiceNo((string) ($identity['invoice'] ?? ''));
            if ($sheetInv <= 0) {
                return [
                    'success' => true,
                    'skipped' => true,
                    'sheet_row' => (int) $match['row'],
                    'tab_name' => (string) $match['tab'],
                    'invoice_no' => $existing > 0 ? $existing : null,
                    'error' => null,
                ];
            }

            if ($existing === $sheetInv) {
                return [
                    'success' => true,
                    'skipped' => true,
                    'sheet_row' => (int) $match['row'],
                    'tab_name' => (string) $match['tab'],
                    'invoice_no' => $sheetInv,
                    'error' => null,
                ];
            }

            $adopted = self::adoptSheetInvoiceNo($pdo, $bookingId, $sheetInv, true);

            return [
                'success' => true,
                'skipped' => false,
                'sheet_row' => (int) $match['row'],
                'tab_name' => (string) $match['tab'],
                'invoice_no' => $adopted > 0 ? $adopted : $sheetInv,
                'error' => null,
            ];
        } catch (Throwable $e) {
            return ['success' => false, 'skipped' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Push package fare + driver/admin extras to the sheet COST column (and % VTH).
     *
     * @return array{success: bool, skipped?: bool, error?: string|null, sheet_row?: int, tab_name?: string, cost?: int}
     */
    public static function syncCostForBooking(int $bookingId): array
    {
        if ($bookingId <= 0) {
            return ['success' => true, 'skipped' => true, 'error' => null];
        }

        try {
            $pdo = ai_booking_get_pdo();
            $booking = self::fetchBooking($pdo, $bookingId);
            if ($booking === null) {
                return ['success' => false, 'skipped' => false, 'error' => 'Booking not found'];
            }

            self::enrichBookingFinancials($pdo, $booking);
            $cost = self::sheetCostFromBooking($booking);
            $tolls = self::sumTollExtraCharges($booking);
            $invoiceNo = (int) ($booking['invoice_no'] ?? 0);
            // Prefer guest/phone/DOJ over a stale DB invoice_no (wrong invoice updates the wrong COST cell).
            $match = self::findSheetMatchByIdentity($pdo, $booking);
            if ($match === null || isset($match['error'])) {
                $match = self::findSheetMatchForBooking($pdo, $booking);
            }
            // Last resort: scan tabs by Invoice no, but only keep the row if identity still fits.
            if (($match === null || isset($match['error'])) && $invoiceNo > 0) {
                $byInvoice = self::findSheetMatchByInvoiceAcrossTabs($invoiceNo, $booking);
                if ($byInvoice !== null) {
                    $match = $byInvoice;
                }
            }

            if ($match === null) {
                return [
                    'success' => false,
                    'skipped' => true,
                    'error' => 'No Google Sheet row found for this booking (name/phone/DOJ/invoice)',
                    'cost' => $cost,
                    'invoice_no' => $invoiceNo > 0 ? $invoiceNo : null,
                ];
            }
            if (isset($match['error'])) {
                return [
                    'success' => false,
                    'skipped' => false,
                    'error' => (string) $match['error'],
                    'cost' => $cost,
                    'invoice_no' => $invoiceNo > 0 ? $invoiceNo : null,
                ];
            }

            // Pull Invoice no from the matched sheet row into the booking (both-ways sync).
            try {
                $identity = $match['sheet']->readIdentityRow((int) $match['row']);
                $sheetInv = GoogleSheetService::parseInvoiceNo((string) ($identity['invoice'] ?? ''));
                if ($sheetInv > 0) {
                    $invoiceNo = self::adoptSheetInvoiceNo($pdo, $bookingId, $sheetInv);
                }
            } catch (Throwable $ignored) {
                // Non-fatal
            }

            $written = $match['sheet']->updateCostFields(
                (int) $match['row'],
                $cost,
                $tolls > 0 ? $tolls : null
            );
            if (!$written['success']) {
                return [
                    'success' => false,
                    'skipped' => false,
                    'tab_name' => $match['tab'],
                    'sheet_row' => (int) $match['row'],
                    'cost' => $cost,
                    'invoice_no' => $invoiceNo > 0 ? $invoiceNo : null,
                    'error' => $written['error'] ?? 'Failed to write the COST total',
                ];
            }

            return [
                'success' => true,
                'skipped' => false,
                'sheet_row' => (int) $match['row'],
                'tab_name' => (string) $match['tab'],
                'cost' => $cost,
                'invoice_no' => $invoiceNo > 0 ? $invoiceNo : null,
                'error' => null,
            ];
        } catch (Throwable $e) {
            return ['success' => false, 'skipped' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Remove the Google Sheet row that belongs to this booking.
     * The booking array is the database row captured before it is deleted.
     *
     * @param array<string, mixed> $booking
     * @return array{success: bool, skipped?: bool, error?: string|null, sheet_row?: int, tab_name?: string, removed_by?: string}
     */
    public static function removeSyncedRow(array $booking): array
    {
        try {
            $pdo = ai_booking_get_pdo();
            $invoiceNo = (int) ($booking['invoice_no'] ?? 0);
            $meta = self::getLatestSyncMeta($pdo, $invoiceNo);
            $tabs = self::tabCandidates($booking, $meta['tab_name']);
            if ($tabs === []) {
                $tabs = [vth_sheets_resolve_tab_name(null)];
            }

            $match = null;
            $ambiguous = false;
            $searched = false;
            $lastError = null;
            foreach ($tabs as $tab) {
                try {
                    $sheet = new GoogleSheetService($tab);
                    $preferred = ($meta['tab_name'] === $tab) ? $meta['sheet_row'] : null;
                    $found = self::locateRow($sheet, $booking, $preferred);
                    $searched = true;
                } catch (Throwable $e) {
                    $lastError = $e->getMessage();
                    continue;
                }

                if ($found['status'] === 'found') {
                    $match = ['sheet' => $sheet, 'row' => $found['row'], 'tab' => $tab];
                    break;
                }
                if ($found['status'] === 'ambiguous') {
                    $ambiguous = true;
                }
            }

            if ($match === null) {
                if ($ambiguous) {
                    return [
                        'success' => false,
                        'skipped' => false,
                        'error' => 'More than one Google Sheet row matches this booking',
                    ];
                }
                if (!$searched) {
                    return [
                        'success' => false,
                        'skipped' => false,
                        'error' => $lastError ?: 'Could not read the Google Sheet',
                    ];
                }

                return [
                    'success' => true,
                    'skipped' => true,
                    'error' => null,
                ];
            }

            $removed = $match['sheet']->removeBookingRow((int) $match['row']);
            if (!$removed['success']) {
                return [
                    'success' => false,
                    'skipped' => false,
                    'tab_name' => $match['tab'],
                    'sheet_row' => (int) $match['row'],
                    'error' => $removed['error'] ?? 'Failed to remove the Google Sheet row',
                ];
            }

            self::logSheetEvent($pdo, $invoiceNo, 'deleted', json_encode([
                'sheet_row' => (int) $match['row'],
                'tab_name' => $match['tab'],
                'removed_by' => $removed['removed_by'] ?? '',
            ]) ?: '');

            return [
                'success' => true,
                'skipped' => false,
                'sheet_row' => (int) $match['row'],
                'tab_name' => (string) $match['tab'],
                'removed_by' => (string) ($removed['removed_by'] ?? ''),
                'error' => null,
            ];
        } catch (Throwable $e) {
            return ['success' => false, 'skipped' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Sum this booking's fuel fills and write them on its sheet row.
     * One fill is the amount only. Several fills keep the sum and a cell note.
     * No remaining fills clears the fuel cell and its note.
     *
     * @return array{success: bool, skipped?: bool, error?: string|null, sheet_row?: int, tab_name?: string}
     */
    public static function syncFuelForBooking(int $bookingId): array
    {
        if ($bookingId <= 0) {
            return ['success' => true, 'skipped' => true, 'error' => null];
        }

        try {
            $pdo = ai_booking_get_pdo();
            $booking = self::fetchBooking($pdo, $bookingId);
            if ($booking === null) {
                return ['success' => false, 'skipped' => false, 'error' => 'Booking not found'];
            }

            $lines = self::fuelLinesForBooking($pdo, $booking);
            $amount = null;
            $note = '';
            if ($lines !== []) {
                $sum = 0.0;
                foreach ($lines as $line) {
                    $sum += (float) ($line['total_cost'] ?? 0);
                }
                $amount = round($sum, 2);
                $note = self::fuelFillNote($lines);
            }
            $vehicleNumber = self::fuelVehicleLabel($pdo, $booking, $lines);
            $driverName = self::bookingDriverName($pdo, $booking);
            $pickupYmd = self::dateKey((string) ($booking['pickup_date'] ?? ''));

            $invoiceNo = (int) ($booking['invoice_no'] ?? 0);
            $meta = self::getLatestSyncMeta($pdo, $invoiceNo);
            $tabs = self::tabCandidates($booking, $meta['tab_name']);
            if ($tabs === []) {
                $tabs = [vth_sheets_resolve_tab_name(null)];
            }

            $match = null;
            $ambiguous = false;
            $searched = false;
            $lastError = null;
            $normalized = self::normalizeForSheet($booking);
            foreach ($tabs as $tab) {
                try {
                    $sheet = new GoogleSheetService($tab);
                    $preferred = ($meta['tab_name'] === $tab) ? $meta['sheet_row'] : null;
                    $found = self::locateRow($sheet, $normalized, $preferred);
                    if ($found['status'] !== 'found') {
                        $byVehicle = self::locateByVehicle($sheet, $pickupYmd, $vehicleNumber, $driverName);
                        if ($byVehicle['status'] === 'found') {
                            $found = $byVehicle;
                        }
                    }
                    $searched = true;
                } catch (Throwable $e) {
                    $lastError = $e->getMessage();
                    continue;
                }
                if ($found['status'] === 'found') {
                    $match = ['sheet' => $sheet, 'row' => $found['row'], 'tab' => $tab];
                    break;
                }
                if ($found['status'] === 'ambiguous') {
                    $ambiguous = true;
                }
            }

            if ($match === null) {
                if ($ambiguous) {
                    return [
                        'success' => false,
                        'skipped' => false,
                        'error' => 'More than one Google Sheet row matches this booking',
                    ];
                }
                if (!$searched) {
                    return [
                        'success' => false,
                        'skipped' => false,
                        'error' => $lastError ?: 'Could not read the Google Sheet',
                    ];
                }

                return ['success' => true, 'skipped' => true, 'error' => null];
            }

            $written = $match['sheet']->updateFuelRefill((int) $match['row'], $amount, $note, $vehicleNumber);
            if (!$written['success']) {
                return [
                    'success' => false,
                    'skipped' => false,
                    'tab_name' => $match['tab'],
                    'sheet_row' => (int) $match['row'],
                    'error' => $written['error'] ?? 'Failed to write the fuel total',
                ];
            }

            return [
                'success' => true,
                'skipped' => false,
                'sheet_row' => (int) $match['row'],
                'tab_name' => (string) $match['tab'],
                'error' => null,
            ];
        } catch (Throwable $e) {
            return ['success' => false, 'skipped' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * @return array<string, mixed>|null
     */
    private static function fetchBooking(PDO $pdo, int $bookingId): ?array
    {
        $stmt = $pdo->prepare('SELECT * FROM bookings WHERE id = ? LIMIT 1');
        $stmt->execute([$bookingId]);
        $row = $stmt->fetch();

        return $row ?: null;
    }

    /**
     * Locate the Google Sheet row for a booking across likely month tabs.
     *
     * @param array<string, mixed> $booking
     * @return array{sheet: GoogleSheetService, row: int, tab: string}|array{error: string}|null
     */
    private static function findSheetMatchForBooking(PDO $pdo, array $booking): ?array
    {
        return self::findSheetMatchInternal($pdo, $booking, false);
    }

    /**
     * Same as findSheetMatchForBooking but never trusts DB invoice_no for row lookup.
     *
     * @param array<string, mixed> $booking
     * @return array{sheet: GoogleSheetService, row: int, tab: string}|array{error: string}|null
     */
    private static function findSheetMatchByIdentity(PDO $pdo, array $booking): ?array
    {
        return self::findSheetMatchInternal($pdo, $booking, true);
    }

    /**
     * @param array<string, mixed> $booking
     * @return array{sheet: GoogleSheetService, row: int, tab: string}|array{error: string}|null
     */
    private static function findSheetMatchInternal(PDO $pdo, array $booking, bool $identityOnly): ?array
    {
        $invoiceNo = (int) ($booking['invoice_no'] ?? 0);
        $meta = self::getLatestSyncMeta($pdo, $invoiceNo);
        $tabs = self::tabCandidates($booking, $meta['tab_name']);
        if ($tabs === []) {
            $tabs = [vth_sheets_resolve_tab_name(null)];
        }

        $ambiguous = false;
        $searched = false;
        $lastError = null;
        $normalized = self::normalizeForSheet($booking);
        foreach ($tabs as $tab) {
            try {
                $sheet = new GoogleSheetService($tab);
                $preferred = ($meta['tab_name'] === $tab) ? $meta['sheet_row'] : null;
                $found = $identityOnly
                    ? self::locateRowByIdentity($sheet, $normalized, $preferred)
                    : self::locateRow($sheet, $normalized, $preferred);
                $searched = true;
            } catch (Throwable $e) {
                $lastError = $e->getMessage();
                continue;
            }

            if ($found['status'] === 'found') {
                return ['sheet' => $sheet, 'row' => $found['row'], 'tab' => $tab];
            }
            if ($found['status'] === 'ambiguous') {
                $ambiguous = true;
            }
        }

        if ($ambiguous) {
            return ['error' => 'More than one Google Sheet row matches this booking'];
        }
        if (!$searched) {
            return ['error' => $lastError ?: 'Could not read the Google Sheet'];
        }

        return null;
    }

    private static function normalizeMobile(string $raw): string
    {
        $digits = preg_replace('/\D/', '', $raw);
        if (strlen($digits) === 12 && strpos($digits, '91') === 0) {
            $digits = substr($digits, 2);
        }
        if (strlen($digits) === 11 && strpos($digits, '0') === 0) {
            $digits = substr($digits, 1);
        }

        return strlen($digits) === 10 ? $digits : $raw;
    }

    /**
     * Attach latest invoice base/extra/total so sheet COST matches the bill.
     *
     * @param array<string, mixed> $booking
     */
    private static function enrichBookingFinancials(PDO $pdo, array &$booking): void
    {
        $bookingId = (int) ($booking['id'] ?? 0);
        if ($bookingId <= 0) {
            return;
        }
        try {
            $stmt = $pdo->prepare(
                'SELECT base_amount, extra_charges, total_amount
                 FROM invoices
                 WHERE booking_id = ?
                 ORDER BY id DESC
                 LIMIT 1'
            );
            $stmt->execute([$bookingId]);
            $inv = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$inv) {
                return;
            }
            $booking['_invoice_base'] = (float) ($inv['base_amount'] ?? 0);
            $booking['_invoice_extra'] = (float) ($inv['extra_charges'] ?? 0);
            $booking['_invoice_total'] = (float) ($inv['total_amount'] ?? 0);
        } catch (Throwable $ignored) {
            // invoices table may be unavailable — non-fatal
        }
    }

    /**
     * Sum admin line-item extras from extra_charges JSON / array.
     *
     * @param array<string, mixed> $booking
     */
    public static function sumExtraCharges(array $booking): float
    {
        $raw = $booking['extra_charges'] ?? $booking['extraCharges'] ?? null;
        if (is_string($raw) && $raw !== '') {
            $decoded = json_decode($raw, true);
            $raw = is_array($decoded) ? $decoded : null;
        }
        if (!is_array($raw)) {
            return 0.0;
        }
        $sum = 0.0;
        foreach ($raw as $charge) {
            if (!is_array($charge)) {
                continue;
            }
            $sum += (float) ($charge['amount'] ?? 0);
        }

        return $sum > 0 ? round($sum, 2) : 0.0;
    }

    /**
     * Toll / parking line extras for sheet column R (Tolls).
     *
     * @param array<string, mixed> $booking
     */
    public static function sumTollExtraCharges(array $booking): float
    {
        $raw = $booking['extra_charges'] ?? $booking['extraCharges'] ?? null;
        if (is_string($raw) && $raw !== '') {
            $decoded = json_decode($raw, true);
            $raw = is_array($decoded) ? $decoded : null;
        }
        if (!is_array($raw)) {
            return 0.0;
        }
        $sum = 0.0;
        foreach ($raw as $charge) {
            if (!is_array($charge)) {
                continue;
            }
            $label = strtolower(trim((string) ($charge['description'] ?? $charge['label'] ?? '')));
            $amount = (float) ($charge['amount'] ?? 0);
            if ($amount <= 0) {
                continue;
            }
            if ($label !== '' && preg_match('/toll|parking|park\b/i', $label)) {
                $sum += $amount;
            }
        }
        $driverCat = strtolower(trim((string) (
            $booking['extra_collected_category'] ?? $booking['extraCollectedCategory'] ?? ''
        )));
        if ($driverCat === 'tolls') {
            $sum += max(0, (float) (
                $booking['extra_collected_amount'] ?? $booking['extraCollectedAmount'] ?? 0
            ));
        }

        return $sum > 0 ? round($sum, 2) : 0.0;
    }

    /**
     * Sheet COST = final customer total shown on the booking.
     * Prefer bookings.total_amount (what admin edits). Do not use max(invoice, package)
     * — a stale invoice/package base (e.g. ₹3500) was overwriting a reduced total (₹3350).
     * Fall back to invoice / package+extras only when total_amount is empty.
     *
     * @param array<string, mixed> $booking
     */
    public static function sheetCostFromBooking(array $booking): int
    {
        $driverExtra = (float) ($booking['extra_collected_amount'] ?? $booking['extraCollectedAmount'] ?? 0);
        if ($driverExtra < 0) {
            $driverExtra = 0;
        }

        $invoiceTotal = (float) ($booking['_invoice_total'] ?? 0);
        $invoiceExtra = (float) ($booking['_invoice_extra'] ?? 0);
        $invoiceBase = (float) ($booking['_invoice_base'] ?? 0);
        $charges = self::sumExtraCharges($booking);
        if ($charges <= 0 && $invoiceExtra > 0) {
            $charges = $invoiceExtra;
        }

        $totalAmount = (float) ($booking['total_amount'] ?? $booking['totalAmount'] ?? 0);
        // `cost` is the AI package base (not a computed sheet total).
        $packageBase = max(
            (float) ($booking['fare'] ?? 0),
            (float) ($booking['cost'] ?? 0),
            $invoiceBase
        );

        if ($totalAmount > 0) {
            return (int) round(max(0, $totalAmount + $driverExtra));
        }
        if ($invoiceTotal > 0) {
            return (int) round(max(0, $invoiceTotal + $driverExtra));
        }
        if ($packageBase > 0) {
            return (int) round(max(0, $packageBase + $charges + $driverExtra));
        }
        if ($charges > 0 || $driverExtra > 0) {
            return (int) round(max(0, $charges + $driverExtra));
        }

        return 0;
    }

    /**
     * @param array<string, mixed> $booking
     * @return array<string, mixed>
     */
    private static function normalizeForSheet(array $booking): array
    {
        $booking['customer_name'] = trim((string) (
            $booking['customer_name'] ?? $booking['passenger_name'] ?? ''
        ));
        $booking['customer_mobile'] = self::normalizeMobile((string) (
            $booking['customer_mobile'] ?? $booking['passenger_phone'] ?? ''
        ));
        $booking['cost'] = self::sheetCostFromBooking($booking);
        $booking['advance_received'] = (int) (
            $booking['advance_received'] ?? $booking['advance_paid_amount'] ?? 0
        );
        $booking['vehicle_type'] = (string) ($booking['vehicle_type'] ?? $booking['cab_type'] ?? '');
        $booking['pickup_location'] = (string) ($booking['pickup_location'] ?? '');
        $booking['drop_location'] = (string) ($booking['drop_location'] ?? '');
        $booking['booking_date'] = (string) (
            $booking['booking_date'] ?? date('Y-m-d', strtotime((string) ($booking['created_at'] ?? 'now')))
        );

        return $booking;
    }

    /**
     * Prefer the Google Sheet Invoice no; fall back to MAX(invoice_no)+1.
     *
     * @param array<string, mixed> $booking
     */
    private static function ensureInvoiceNo(
        PDO $pdo,
        int $bookingId,
        array $booking,
        int $preferredSheetInvoiceNo = 0
    ): int {
        $existing = (int) ($booking['invoice_no'] ?? 0);
        if ($existing > 0) {
            return $existing;
        }

        $pdo->beginTransaction();
        try {
            $invoiceNo = 0;
            if ($preferredSheetInvoiceNo > 0) {
                $taken = $pdo->prepare('SELECT id FROM bookings WHERE invoice_no = ? LIMIT 1');
                $taken->execute([$preferredSheetInvoiceNo]);
                if (!$taken->fetchColumn()) {
                    $invoiceNo = $preferredSheetInvoiceNo;
                }
            }
            if ($invoiceNo <= 0) {
                $lock = $pdo->query('SELECT MAX(invoice_no) AS max_inv FROM bookings FOR UPDATE');
                $maxRow = $lock->fetch();
                $invoiceNo = ((int) ($maxRow['max_inv'] ?? 0)) + 1;
            }

            $customerName = trim((string) ($booking['passenger_name'] ?? ''));
            $customerMobile = self::normalizeMobile((string) ($booking['passenger_phone'] ?? ''));
            $cost = (int) ($booking['total_amount'] ?? 0);

            $stmt = $pdo->prepare(
                'UPDATE bookings SET
                    invoice_no = ?,
                    booking_date = COALESCE(booking_date, CURDATE()),
                    booking_source = COALESCE(NULLIF(booking_source, ""), "VTH"),
                    customer_name = COALESCE(NULLIF(customer_name, ""), ?),
                    customer_mobile = COALESCE(NULLIF(customer_mobile, ""), ?),
                    cost = COALESCE(cost, ?),
                    sync_pending = 0
                 WHERE id = ?'
            );
            $stmt->execute([$invoiceNo, $customerName, $customerMobile, $cost, $bookingId]);
            $pdo->commit();

            return $invoiceNo;
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    private static function hasSuccessfulSync(PDO $pdo, int $invoiceNo): bool
    {
        if ($invoiceNo <= 0) {
            return false;
        }

        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM sheet_sync_logs WHERE invoice_no = ? AND sync_status = ?'
        );
        $stmt->execute([$invoiceNo, 'success']);

        return (int) $stmt->fetchColumn() > 0;
    }

    private static function getSyncedSheetRow(PDO $pdo, int $invoiceNo): ?int
    {
        $stmt = $pdo->prepare(
            'SELECT response FROM sheet_sync_logs
             WHERE invoice_no = ? AND sync_status = ?
             ORDER BY id DESC LIMIT 1'
        );
        $stmt->execute([$invoiceNo, 'success']);
        $response = $stmt->fetchColumn();
        if (!is_string($response) || $response === '') {
            return null;
        }

        $data = json_decode($response, true);
        if (!is_array($data)) {
            return null;
        }

        $row = $data['sheet_row'] ?? $data['updates']['updatedRange'] ?? null;
        if (is_numeric($row)) {
            return (int) $row;
        }

        return null;
    }

    /**
     * @return array{sheet_row: ?int, tab_name: ?string}
     */
    private static function getLatestSyncMeta(PDO $pdo, int $invoiceNo): array
    {
        $empty = ['sheet_row' => null, 'tab_name' => null];
        if ($invoiceNo <= 0) {
            return $empty;
        }

        $stmt = $pdo->prepare(
            'SELECT response FROM sheet_sync_logs
             WHERE invoice_no = ? AND sync_status = ?
             ORDER BY id DESC LIMIT 1'
        );
        $stmt->execute([$invoiceNo, 'success']);
        $response = $stmt->fetchColumn();
        if (!is_string($response) || $response === '') {
            return $empty;
        }

        $data = json_decode($response, true);
        if (!is_array($data)) {
            return $empty;
        }

        $row = $data['sheet_row'] ?? null;
        $tab = $data['tab_name'] ?? null;

        return [
            'sheet_row' => is_numeric($row) ? (int) $row : null,
            'tab_name' => is_string($tab) && trim($tab) !== '' ? trim($tab) : null,
        ];
    }

    /**
     * @param array<string, mixed> $booking
     * @return list<string>
     */
    private static function tabCandidates(array $booking, ?string $loggedTab): array
    {
        $candidates = [];
        $add = static function (?string $name) use (&$candidates): void {
            $name = trim((string) $name);
            if ($name !== '' && !in_array($name, $candidates, true)) {
                $candidates[] = $name;
            }
        };

        $add($loggedTab);
        $pickup = (string) ($booking['pickup_date'] ?? '');
        $add(vth_sheets_tab_from_pickup_date($pickup));
        $ts = strtotime($pickup);
        if ($ts !== false) {
            $add(date('F Y', $ts));
            $add(date('M Y', $ts));
        }

        try {
            foreach ((new GoogleSheetService())->listAllTabTitles() as $title) {
                $add($title);
            }
        } catch (Throwable $ignored) {
            // Non-fatal — fall back to pickup-derived tab names only.
        }

        return $candidates;
    }

    /**
     * @return array{sheet: GoogleSheetService, row: int, tab: string}|null
     */
    /**
     * @param array<string, mixed>|null $booking When set, reject invoice hits that do not match this guest.
     * @return array{sheet: GoogleSheetService, row: int, tab: string}|null
     */
    private static function findSheetMatchByInvoiceAcrossTabs(int $invoiceNo, ?array $booking = null): ?array
    {
        if ($invoiceNo <= 0) {
            return null;
        }
        try {
            $titles = (new GoogleSheetService())->listAllTabTitles();
        } catch (Throwable $e) {
            return null;
        }
        if ($titles === []) {
            $titles = [vth_sheets_resolve_tab_name(null)];
        }
        foreach ($titles as $tab) {
            try {
                $sheet = new GoogleSheetService($tab);
                $row = $sheet->findRowByInvoiceNo($invoiceNo);
                if ($row === null) {
                    continue;
                }
                if ($booking !== null) {
                    $identity = $sheet->readIdentityRow($row);
                    if (!is_array($identity) || !self::rowMatchesBooking($identity, $booking, true)) {
                        continue;
                    }
                }
                return ['sheet' => $sheet, 'row' => $row, 'tab' => $tab];
            } catch (Throwable $ignored) {
                continue;
            }
        }

        return null;
    }

    /**
     * @param array<string, mixed> $booking
     * @return array{status: string, row: ?int}
     */
    /**
     * Sheet row for this vehicle and journey date when the guest name does not match.
     *
     * @return array{status: string, row: ?int}
     */
    private static function locateByVehicle(GoogleSheetService $sheet, string $pickupYmd, string $vehicleNumber, string $driverName): array
    {
        if ($pickupYmd === '' || trim($vehicleNumber) === '') {
            return ['status' => 'none', 'row' => null];
        }

        $hits = [];
        foreach ($sheet->listIdentityRows() as $identity) {
            $doj = self::dateKey((string) ($identity['doj'] ?? ''));
            if ($doj !== $pickupYmd) {
                continue;
            }
            if (!self::vehiclesMatch($vehicleNumber, (string) ($identity['vehicle'] ?? ''))) {
                continue;
            }
            $hits[] = $identity;
        }
        if (count($hits) === 1) {
            return ['status' => 'found', 'row' => (int) $hits[0]['row']];
        }
        if (count($hits) > 1 && trim($driverName) !== '') {
            $named = [];
            foreach ($hits as $hit) {
                if (self::driverClose($driverName, (string) ($hit['driver'] ?? ''))) {
                    $named[] = $hit;
                }
            }
            if (count($named) === 1) {
                return ['status' => 'found', 'row' => (int) $named[0]['row']];
            }
        }
        if (count($hits) > 1) {
            return ['status' => 'ambiguous', 'row' => null];
        }

        return ['status' => 'none', 'row' => null];
    }

    /**
     * @param array<string, mixed> $booking
     */
    private static function bookingDriverName(PDO $pdo, array $booking): string
    {
        $named = trim((string) ($booking['driver_name'] ?? ''));
        if ($named !== '') {
            return $named;
        }
        $driverId = (int) ($booking['driver_id'] ?? 0);
        if ($driverId <= 0) {
            return '';
        }
        try {
            $stmt = $pdo->prepare('SELECT name FROM drivers WHERE id = ? LIMIT 1');
            $stmt->execute([$driverId]);
            $name = $stmt->fetchColumn();

            return is_string($name) ? trim($name) : '';
        } catch (Throwable $e) {
            return '';
        }
    }

    private static function driverClose(string $left, string $right): bool
    {
        $words = static function (string $name): array {
            $name = strtolower(trim($name));
            $name = preg_replace('/[^a-z\s]/', ' ', $name) ?? $name;
            $parts = preg_split('/\s+/', $name) ?: [];
            $kept = [];
            foreach ($parts as $part) {
                if (strlen($part) >= 4) {
                    $kept[] = $part;
                }
            }

            return $kept;
        };
        foreach ($words($left) as $a) {
            foreach ($words($right) as $b) {
                if ($a === $b) {
                    return true;
                }
                if (abs(strlen($a) - strlen($b)) <= 2 && levenshtein($a, $b) <= 2) {
                    return true;
                }
            }
        }

        return false;
    }

    private static function locateRow(GoogleSheetService $sheet, array $booking, ?int $preferredRow): array
    {
        $invoiceNo = (int) ($booking['invoice_no'] ?? 0);
        if ($invoiceNo > 0) {
            $byInvoice = $sheet->findRowByInvoiceNo($invoiceNo);
            if ($byInvoice !== null) {
                $identity = $sheet->readIdentityRow($byInvoice);
                // Never update COST on an invoice row that belongs to a different guest/trip.
                if (is_array($identity) && self::rowMatchesBooking($identity, $booking, true)) {
                    return ['status' => 'found', 'row' => $byInvoice];
                }
            }
        }

        return self::locateRowByIdentity($sheet, $booking, $preferredRow);
    }

    /**
     * Match sheet rows by guest name / phone / DOJ only (ignore DB invoice_no).
     *
     * @param array<string, mixed> $booking
     * @return array{status: string, row: ?int}
     */
    private static function locateRowByIdentity(GoogleSheetService $sheet, array $booking, ?int $preferredRow): array
    {
        if ($preferredRow !== null && $preferredRow >= vth_sheets_first_data_row()) {
            $identity = $sheet->readIdentityRow($preferredRow);
            if (is_array($identity) && self::rowMatchesBooking($identity, $booking, true)) {
                return ['status' => 'found', 'row' => $preferredRow];
            }
        }

        $hits = [];
        foreach ($sheet->listIdentityRows() as $identity) {
            if (self::rowMatchesBooking($identity, $booking)) {
                $hits[] = (int) $identity['row'];
            }
        }
        $hits = array_values(array_unique($hits));
        if (count($hits) === 1) {
            return ['status' => 'found', 'row' => $hits[0]];
        }
        if (count($hits) > 1) {
            // Prefer the row whose DOJ matches pickup date (multi-day sheet rows).
            $bookDoj = self::dateKey((string) ($booking['pickup_date'] ?? ''));
            if ($bookDoj !== '') {
                $dojHits = [];
                foreach ($sheet->listIdentityRows() as $identity) {
                    $rowNum = (int) ($identity['row'] ?? 0);
                    if (!in_array($rowNum, $hits, true)) {
                        continue;
                    }
                    if (self::dateKey((string) ($identity['doj'] ?? '')) === $bookDoj) {
                        $dojHits[] = $rowNum;
                    }
                }
                $dojHits = array_values(array_unique($dojHits));
                if (count($dojHits) === 1) {
                    return ['status' => 'found', 'row' => $dojHits[0]];
                }
            }
            if ($preferredRow !== null && in_array($preferredRow, $hits, true)) {
                return ['status' => 'found', 'row' => $preferredRow];
            }

            return ['status' => 'ambiguous', 'row' => null];
        }

        return ['status' => 'none', 'row' => null];
    }

    /**
     * @param array{invoice?: string, booking_date?: string, doj?: string, name?: string, phone?: string} $identity
     * @param array<string, mixed> $booking
     */
    private static function rowMatchesBooking(array $identity, array $booking, bool $trustedRow = false): bool
    {
        $sheetName = self::nameKey((string) ($identity['name'] ?? ''));
        $bookName = self::nameKey((string) ($booking['customer_name'] ?? ''));
        if ($bookName === '') {
            $bookName = self::nameKey((string) ($booking['passenger_name'] ?? ''));
        }

        $sheetPhone = self::phoneKey((string) ($identity['phone'] ?? ''));
        $bookPhone = self::phoneKey((string) (
            $booking['customer_mobile'] ?? $booking['passenger_phone'] ?? ''
        ));

        $sheetDoj = self::dateKey((string) ($identity['doj'] ?? ''));
        $bookDoj = self::dateKey((string) ($booking['pickup_date'] ?? ''));

        $sheetInvoice = self::invoiceKey((string) ($identity['invoice'] ?? ''));
        $bookInvoice = self::invoiceKey((string) ($booking['invoice_no'] ?? ''));

        $nameOk = $bookName !== '' && $sheetName === $bookName;
        $phoneOk = $bookPhone !== '' && $sheetPhone === $bookPhone;
        $dojOk = $bookDoj !== '' && $sheetDoj === $bookDoj;
        $invoiceOk = $bookInvoice !== '' && $sheetInvoice === $bookInvoice;

        if ($trustedRow && ($nameOk || $phoneOk)) {
            return true;
        }
        if ($nameOk && $phoneOk) {
            return true;
        }
        if ($phoneOk && $dojOk) {
            return true;
        }
        if ($nameOk && $dojOk) {
            return true;
        }
        if ($invoiceOk && ($nameOk || $phoneOk || $dojOk)) {
            return true;
        }

        return false;
    }

    /**
     * Fuel fills for this booking whose vehicle matches the trip vehicle.
     *
     * @param array<string, mixed> $booking
     * @return list<array<string, mixed>>
     */
    private static function fuelLinesForBooking(PDO $pdo, array $booking): array
    {
        $bookingId = (int) ($booking['id'] ?? 0);
        if ($bookingId <= 0) {
            return [];
        }

        $stmt = $pdo->prepare(
            'SELECT fr.total_cost, fr.quantity, fr.fill_date, fr.vehicle_id, v.vehicle_number
             FROM fuel_records fr
             LEFT JOIN fleet_vehicles v ON v.id = fr.vehicle_id
             WHERE fr.booking_id = ?
             ORDER BY fr.fill_date ASC, fr.id ASC'
        );
        $stmt->execute([$bookingId]);
        $rows = $stmt->fetchAll();
        if (!is_array($rows)) {
            return [];
        }

        $bookingVehicleId = (int) ($booking['fleet_vehicle_id'] ?? 0);
        $bookingVehicle = (string) ($booking['vehicle_number'] ?? '');
        $kept = [];
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $fillVehicleId = (int) ($row['vehicle_id'] ?? 0);
            $fillVehicle = (string) ($row['vehicle_number'] ?? '');
            if ($bookingVehicleId > 0 && $fillVehicleId > 0 && $bookingVehicleId !== $fillVehicleId) {
                continue;
            }
            if (($bookingVehicleId <= 0 || $fillVehicleId <= 0)
                && $bookingVehicle !== ''
                && $fillVehicle !== ''
                && !self::vehiclesMatch($bookingVehicle, $fillVehicle)) {
                continue;
            }
            $kept[] = $row;
        }

        return $kept;
    }

    /**
     * @param array<string, mixed> $booking
     * @param list<array<string, mixed>> $lines
     */
    private static function fuelVehicleLabel(PDO $pdo, array $booking, array $lines): string
    {
        require_once __DIR__ . '/../../common/fuel_sheet_sync.inc.php';

        $bookingVehicleId = (int) ($booking['fleet_vehicle_id'] ?? 0);
        if ($bookingVehicleId > 0) {
            $stmt = $pdo->prepare('SELECT vehicle_number FROM fleet_vehicles WHERE id = ? LIMIT 1');
            $stmt->execute([$bookingVehicleId]);
            $number = $stmt->fetchColumn();
            if (is_string($number) && trim($number) !== '') {
                return fuel_sheet_vehicle_office_label($number);
            }
        }

        $typed = trim((string) ($booking['vehicle_number'] ?? ''));
        if ($typed !== '') {
            return fuel_sheet_vehicle_office_label($typed);
        }

        $fromFills = '';
        foreach ($lines as $line) {
            $number = trim((string) ($line['vehicle_number'] ?? ''));
            if ($number === '') {
                continue;
            }
            if ($fromFills === '') {
                $fromFills = $number;
                continue;
            }
            if (self::vehicleKey($fromFills) !== self::vehicleKey($number)) {
                return '';
            }
        }

        return fuel_sheet_vehicle_office_label($fromFills);
    }

    /**
     * @param list<array<string, mixed>> $lines
     */
    private static function fuelFillNote(array $lines): string
    {
        if (count($lines) < 2) {
            return '';
        }

        $parts = [];
        foreach ($lines as $line) {
            $bits = [];
            $rawDate = trim((string) ($line['fill_date'] ?? ''));
            $ts = $rawDate !== '' ? strtotime($rawDate) : false;
            if ($ts !== false) {
                $bits[] = date('j M Y', $ts);
            }
            $cents = (int) round(((float) ($line['total_cost'] ?? 0)) * 100);
            $bits[] = '₹' . ($cents % 100 === 0
                ? number_format($cents / 100, 0)
                : number_format($cents / 100, 2));
            $bits[] = number_format(round((float) ($line['quantity'] ?? 0), 2), 2) . ' L';
            $vehicle = trim((string) ($line['vehicle_number'] ?? ''));
            if ($vehicle !== '') {
                $bits[] = $vehicle;
            }
            $parts[] = implode(' · ', $bits);
        }

        return implode("\n", $parts);
    }

    private static function vehiclesMatch(string $leftNumber, string $rightNumber): bool
    {
        require_once __DIR__ . '/../../common/fuel_sheet_sync.inc.php';

        return fuel_sheet_vehicle_same(0, $leftNumber, 0, $rightNumber);
    }

    private static function vehicleKey(string $raw): string
    {
        $raw = strtoupper(trim($raw));

        return preg_replace('/[^A-Z0-9]/', '', $raw) ?? '';
    }

    private static function nameKey(string $raw): string
    {
        $raw = strtolower(trim($raw));
        $raw = preg_replace('/\s+/', ' ', $raw) ?? $raw;

        return $raw;
    }

    private static function phoneKey(string $raw): string
    {
        $digits = preg_replace('/\D/', '', $raw) ?? '';
        if (strlen($digits) > 10) {
            $digits = substr($digits, -10);
        }

        return strlen($digits) === 10 ? $digits : '';
    }

    private static function dateKey(string $raw): string
    {
        $raw = trim($raw);
        if ($raw === '') {
            return '';
        }
        if (preg_match('/^(\d{4})-(\d{2})-(\d{2})/', $raw, $m)) {
            return $m[1] . '-' . $m[2] . '-' . $m[3];
        }
        if (preg_match('/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/', $raw, $m)) {
            $day = (int) $m[1];
            $month = (int) $m[2];
            $year = (int) $m[3];
            if ($month < 1 || $month > 12 || $day < 1 || $day > 31) {
                return '';
            }

            return sprintf('%04d-%02d-%02d', $year, $month, $day);
        }
        if (preg_match('/^(\d{1,2})-([A-Za-z]+)-(\d{4})$/', $raw, $m)) {
            $ts = strtotime($m[1] . ' ' . $m[2] . ' ' . $m[3]);

            return $ts ? date('Y-m-d', $ts) : '';
        }

        $ts = strtotime($raw);

        return $ts ? date('Y-m-d', $ts) : '';
    }

    private static function invoiceKey(string $raw): string
    {
        if (!preg_match('/(\d+)/', $raw, $m)) {
            return '';
        }
        $number = (int) $m[1];

        return $number > 0 ? (string) $number : '';
    }

    private static function logSheetEvent(PDO $pdo, int $invoiceNo, string $status, string $response): void
    {
        if ($invoiceNo <= 0) {
            return;
        }
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO sheet_sync_logs (invoice_no, sync_status, response) VALUES (?, ?, ?)'
            );
            $stmt->execute([$invoiceNo, $status, $response]);
        } catch (Throwable $ignored) {
            // Non-fatal
        }
    }
}
