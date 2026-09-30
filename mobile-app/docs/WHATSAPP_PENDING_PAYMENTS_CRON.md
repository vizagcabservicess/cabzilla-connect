# WhatsApp Daily Pending Payments Digest

The admin can receive a WhatsApp message every morning with the list of pending payments for follow-up.

## Manual trigger (mobile app)

In **Profile → Payments**, tap the **"Daily digest"** (WhatsApp) button in the header. This sends the current pending payments list to all configured admin numbers immediately.

## Scheduled (cron)

1. Set `ADMIN_CRON_SECRET` in `.env` (required).
2. Set `WHATSAPP_ADMIN_PHONES` (comma-separated E.164, e.g. `919966363662`) or `WHATSAPP_ADMIN_PHONE`.
3. In Hostinger → **Advanced → Cron Jobs**, **do not** use `wp-cron.php`.
4. Prefer **PHP** (CLI), not **URL / wget**. Hostinger’s URL jobs drop `?secret=` and the script returns `Forbidden`.

### Hostinger “PHP” command (recommended)

Point at the file under `public_html`. No query string needed; CLI is allowed when `ADMIN_CRON_SECRET` is set.

| Job | File | UTC (7 AM / 7 PM IST) |
|---|---|---|
| Pending payments | `api/cron/pending-payments.php` | Minute `30`, Hour `1` |
| Tomorrow’s trips | `api/cron/admin-tomorrow-reminder.php` | Minute `30`, Hour `13` |

If the panel is IST: pending payments Hour `7` Minute `0`; tomorrow’s trips Hour `19` Minute `0`.

Example command:

```bash
/usr/bin/php /home/USER/domains/vizagtaxihub.com/public_html/api/cron/admin-tomorrow-reminder.php
```

### curl / wget URL (must include secret)

Quote the URL. Use **non-www**.

```bash
# Every day at 7:00 AM IST (use 30 1 * * * if the panel is UTC)
0 7 * * * curl -fsSL "https://vizagtaxihub.com/api/cron/pending-payments.php?secret=YOUR_ADMIN_CRON_SECRET"

# Tomorrow's trips — 7:00 PM IST
0 19 * * * curl -fsSL "https://vizagtaxihub.com/api/cron/admin-tomorrow-reminder.php?secret=YOUR_ADMIN_CRON_SECRET"

# UTC crontab (7 PM IST = 13:30 UTC)
30 13 * * * curl -fsSL "https://vizagtaxihub.com/api/cron/admin-tomorrow-reminder.php?secret=YOUR_ADMIN_CRON_SECRET"
```

Also works: `/api/admin/send-pending-payments-whatsapp.php?secret=…` and `/api/admin/send-tomorrow-admin-whatsapp.php?secret=…`

## Requirements

- WhatsApp Cloud API: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID_TRIP` / `WHATSAPP_PHONE_NUMBER_ID_PAYMENT`.
- Admin numbers in E.164 (e.g. `919966363662`).
- After deploy, Upcoming trips shows **Auto cron: never** until the first CLI/URL run succeeds.
