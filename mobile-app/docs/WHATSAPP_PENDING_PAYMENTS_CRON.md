# WhatsApp Daily Pending Payments Digest

The admin can receive a WhatsApp message every morning with the list of pending payments for follow-up.

## Manual trigger (mobile app)

In **Profile → Payments**, tap the **"Daily digest"** (WhatsApp) button in the header. This sends the current pending payments list to all configured admin numbers immediately.

## Scheduled (cron)

To receive the digest automatically every morning (e.g. 7 AM IST):

1. Set `ADMIN_CRON_SECRET` in your `.env` (a random string for security).
2. Set `WHATSAPP_ADMIN_PHONES` (comma-separated E.164, e.g. `919966363662,918501234567`) or `WHATSAPP_ADMIN_PHONE` for a single number.
3. Add a cron job:

```bash
# Every day at 7:00 AM IST
0 7 * * * curl -s "https://yoursite.com/api/admin/send-pending-payments-whatsapp.php?secret=YOUR_ADMIN_CRON_SECRET"
```

Or using wget:

```bash
0 7 * * * wget -q -O - "https://yoursite.com/api/admin/send-pending-payments-whatsapp.php?secret=YOUR_ADMIN_CRON_SECRET"
```

## Requirements

- `send-whatsapp.php` and WhatsApp Cloud API must be configured (WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID_PAYMENT or WHATSAPP_PHONE_NUMBER_ID).
- Admin numbers must be in E.164 format (e.g. `919966363662` for +91 9966363662).
