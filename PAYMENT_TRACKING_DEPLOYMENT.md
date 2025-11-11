# Payment Tracking System - Production Deployment Guide

## 🚀 Quick Setup for Production

### Step 1: Upload API Endpoint
Upload the file `src/backend/php-templates/api/track-payment-attempt.php` to your production server at:
```
https://www.vizagtaxihub.com/api/track-payment-attempt.php
```

### Step 2: Create Database Tables
Run this SQL script on your production database:

```sql
-- Payment tracking tables for failed and cancelled payments
CREATE TABLE IF NOT EXISTS payment_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    booking_number VARCHAR(50) NOT NULL,
    razorpay_order_id VARCHAR(255),
    razorpay_payment_id VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    payment_status ENUM('initiated', 'failed', 'cancelled', 'successful') NOT NULL,
    failure_reason TEXT,
    cancellation_reason TEXT,
    payment_method VARCHAR(50),
    customer_phone VARCHAR(15),
    customer_email VARCHAR(100),
    attempt_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    failure_timestamp TIMESTAMP NULL,
    cancellation_timestamp TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_booking_id (booking_id),
    INDEX idx_booking_number (booking_number),
    INDEX idx_payment_status (payment_status),
    INDEX idx_attempt_timestamp (attempt_timestamp)
);
```

### Step 3: Test the API
Test the endpoint by visiting:
```
https://www.vizagtaxihub.com/api/track-payment-attempt.php
```

You should see:
```json
{
    "status": "success",
    "data": []
}
```

### Step 4: Enable Full Payment Tracking Widget
Once the API is working, update your frontend to use the full widget:

In `src/pages/AdminDashboardPage.tsx`, change:
```typescript
// FROM:
import { PaymentTrackingWidgetSimple as PaymentTrackingWidget } from '@/components/admin/PaymentTrackingWidgetSimple';

// TO:
import { PaymentTrackingWidget } from '@/components/admin/PaymentTrackingWidget';
```

### Step 5: Deploy Frontend
Deploy your updated frontend code to production.

## 🔍 Troubleshooting

### If API returns 404:
- Check that the file is uploaded to the correct location
- Verify file permissions (should be 644 or 755)

### If API returns 500 error:
- Check server error logs
- Verify database connection in the PHP file
- Ensure all required PHP extensions are installed

### If no data appears:
- The system will start capturing data once payments are made
- Create test data manually if needed for testing

## 📊 What Gets Tracked

Once deployed, the system will automatically track:
- ✅ Payment attempts when users start payment
- ❌ Failed payments (card declined, insufficient funds, etc.)
- 🚫 Cancelled payments (user dismisses modal, timeout, etc.)
- ✅ Successful payments

## 🎯 Next Steps

After deployment:
1. Test by making a real booking and attempting payment
2. Check the payment tracking dashboard for captured data
3. Verify failed/cancelled payments are being recorded
4. Export reports as needed

The system is now ready to capture all payment events!































