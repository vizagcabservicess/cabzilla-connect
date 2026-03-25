# Logs & Debug Guide

## Where to See Logs

### 1. Mobile app (Expo / React Native)

- **Metro / Expo console** – When running `npx expo start`, all `console.log` / `console.warn` output appears in the terminal where Expo is running.
- **Odometer errors** – In dev mode, failed odometer saves log the DB error to the console as `Odometer API debug: <error>`.
- **React Native Debugger** – If you connect a debugger, logs appear there too.

### 2. Backend (Hostinger / PHP)

- **Odometer-specific log file** (if it exists on server):
  - Path: `logs/odometer_errors.log` (inside your backend/php-templates folder)
  - Or: `{project_root}/logs/odometer_errors.log`
- **PHP error log** – Check Hostinger:
  - hPanel → Advanced → Error Logs
  - Or via `.htaccess`: `php_value error_log /path/to/php_errors.log`
- **Apache/Nginx error log** – Often at `error_log` or `logs/error.log` on the host.

### 3. Debug mode for odometer API

- **From mobile (dev)** – `X-Debug: 1` is sent automatically when `__DEV__` is true. The API will return the real database error in the response (and in the app error message).
- **From curl / Postman** – Add header `X-Debug: 1` or query `?debug=1` when testing the odometer endpoint to see the detailed DB error.
