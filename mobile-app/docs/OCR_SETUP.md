# OCR Setup — Live Receipt & Odometer Scanning

**When OCR fails:** Both Odometer and Fuel Capture modals support **manual entry** as a fallback. Use "Enter Manually" (fuel) or type the reading and tap "Submit" (odometer).

To get **live OCR** (automatic text extraction when you capture a photo) working, use one of these:

## Option 1: Development Build (Recommended — No Server Setup)

Run a dev build instead of Expo Go. The native `expo-text-extractor` module works on-device:

```bash
# iOS
npx expo run:ios

# Android  
npx expo run:android
```

OCR runs instantly on the device; no backend or Tesseract needed.

---

## Option 2: Backend Tesseract (For Expo Go)

When using **Expo Go**, OCR uses the backend (`/api/bill-text.php`). Tesseract must be installed where PHP runs. (Some hosts’ WAF blocks paths containing `ocr` or `extract`; `bill-text.php` is the canonical endpoint.)

### Windows (Local Dev)

1. Download: https://github.com/UB-Mannheim/tesseract/wiki  
2. Install to `C:\Program Files\Tesseract-OCR\`
3. Restart your PHP server

### macOS

```bash
brew install tesseract
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install tesseract-ocr
```

### Verify

```bash
# Linux/macOS
which tesseract

# Windows (cmd)
where tesseract
```

---

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| "Cannot find native module ExpoTextExtractor" | Use Option 1 (dev build) or Option 2 (Tesseract on server) |
| "Could not extract text" / "Receipt scanning is not available" | **Workaround:** Use "Enter Manually" (fuel) or manual odometer entry. **To fix OCR:** Install Tesseract where your **API server** runs (not on your dev PC unless the app points to localhost). For Expo Go, the app calls `EXPO_PUBLIC_API_BASE_URL` or `EXPO_PUBLIC_WEB_APP_BASE_URL` — Tesseract must be on that host. |
| App points to production (vizagtaxihub.com) | Production server needs Tesseract. Your local Windows Tesseract installation does not help. |
| Running backend locally (localhost/IP) | Install Tesseract on the same machine running PHP. Restart PHP. Verify with `where tesseract` (Windows) or `which tesseract` (Mac/Linux). |
| OCR slow in Expo Go | Backend upload adds latency; dev build is faster |
