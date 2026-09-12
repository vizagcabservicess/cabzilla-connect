# WhatsApp Daily Pending Payments Digest

The admin can receive a WhatsApp message every morning with the list of pending payments for follow-up.

## Manual trigger (mobile app)

In **Profile → Payments**, tap the **"Daily digest"** (WhatsApp) button in the header. This sends the current pending payments list to all configured admin numbers immediately.

## Scheduled (cron)

1. Set `ADMIN_CRON_SECRET` in your `.env` (a random string for security).
2. Set `WHATSAPP_ADMIN_PHONES` (comma-separated E.164, e.g. `919966363662,918501234567`) or `WHATSAPP_ADMIN_PHONE` for a single number.
3. In Hostinger → **Advanced → Cron Jobs**, do **not** use `wp-cron.php`. Point the job at the PHP files below.

### Hostinger “PHP script” (recommended)

Query params are dropped in CLI. The scripts now authenticate automatically when Hostinger runs them as PHP CLI, as long as `ADMIN_CRON_SECRET` is set in `.env`.

Pick these files (browse under `public_html`):

| Job | File | UTC time (7 AM / 7 PM IST) |
|---|---|---|
| Pending payments | `api/admin/send-pending-payments-whatsapp.php` | Minute `30`, Hour `1` |
| Tomorrow’s trips | `api/cron/admin-tomorrow-reminder.php` | Minute `30`, Hour `13` |

If the panel is IST instead of UTC: pending payments Hour `7` Minute `0`; tomorrow’s trips Hour `19` Minute `0`.

### curl / wget URL

Quote the URL. Use **non-www**.

```bash
# Every day at 7:00 AM IST (use 30 1 * * * if the panel is UTC)
0 7 * * * curl -fsSL "https://vizagtaxihub.com/api/admin/send-pending-payments-whatsapp.php?secret=YOUR_ADMIN_CRON_SECRET"
```

### Tomorrow's trips (same secret, 7:00 PM IST)

```bash
# IST crontab
0 19 * * * curl -fsSL "https://vizagtaxihub.com/api/cron/admin-tomorrow-reminder.php?secret=YOUR_ADMIN_CRON_SECRET"

# UTC crontab (7 PM IST = 13:30 UTC)
30 13 * * * curl -fsSL "https://vizagtaxihub.com/api/cron/admin-tomorrow-reminder.php?secret=YOUR_ADMIN_CRON_SECRET"
```

Also works: `/api/admin/send-tomorrow-admin-whatsapp.php?secret=YOUR_ADMIN_CRON_SECRET`

Or using wget:

```bash
0 7 * * * wget -q -O - "https://vizagtaxihub.com/api/admin/send-pending-payments-whatsapp.php?secret=YOUR_ADMIN_CRON_SECRET"
```

## Requirements

- `send-whatsapp.php` and WhatsApp Cloud API must be configured (WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID_PAYMENT or WHATSAPP_PHONE_NUMBER_ID).
- Admin numbers must be in E.164 format (e.g. `919966363662` for +91 9966363662).
