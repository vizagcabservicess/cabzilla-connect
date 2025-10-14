# Payment Tracking Flow Diagram

## Before Fix ❌

```
┌─────────────────────────────────────────────────────────────┐
│                    Payment Verification                      │
│                  (verify-razorpay-payment.php)               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Try to track payment:                                       │
│  ❌ http://localhost/api/track-payment-attempt.php           │
│     (This URL doesn't exist!)                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ❌ FAILS - No tracking
                    ❌ Database not updated
```

## After Fix ✅

```
┌─────────────────────────────────────────────────────────────┐
│                    Payment Verification                      │
│                  (verify-razorpay-payment.php)               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌───────┴────────┐
                    │                │
           ┌────────▼────────┐  ┌───▼────────────┐
           │  Successful     │  │    Failed      │
           │  Payment        │  │    Payment     │
           └────────┬────────┘  └───┬────────────┘
                    │                │
                    ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│  Track Payment:                                              │
│  ✅ https://vizagtaxihub.com/api/payment-tracker-final.php   │
│     (Correct URL, exists on production server)               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌───────┴────────┐
                    │                │
           ┌────────▼────────┐  ┌───▼────────────┐
           │  track_attempt  │  │ track_failure  │
           │  (successful)   │  │   (failed)     │
           └────────┬────────┘  └───┬────────────┘
                    │                │
                    ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                  payment_attempts Table                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ id | booking_id | booking_number | amount | status   │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ 1  |    375     | VTH176043...   |  1.00  |successful│  │
│  │ 2  |    376     | VTH176043...   |  100   |  failed  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ✅ SUCCESS - Payment tracked!
                    ✅ Database updated
                    ✅ Admin can see in dashboard
```

## Detailed Flow for Each Scenario

### Scenario 1: Successful Payment ✅

```
1. User completes payment on Razorpay
   │
   ▼
2. verify-razorpay-payment.php receives payment data
   │
   ▼
3. Verify signature ✓
   │
   ▼
4. Update booking status to 'paid'
   │
   ▼
5. Send confirmation email
   │
   ▼
6. Track successful payment:
   POST https://vizagtaxihub.com/api/payment-tracker-final.php
   {
     "action": "track_attempt",
     "booking_id": 375,
     "booking_number": "VTH17604320093217",
     "amount": 1.00,
     "payment_status": "successful",
     "razorpay_order_id": "order_xxx",
     "razorpay_payment_id": "pay_xxx",
     "customer_phone": "9550099336",
     "customer_email": "customer@example.com"
   }
   │
   ▼
7. payment-tracker-final.php inserts into database:
   INSERT INTO payment_attempts (
     booking_id, booking_number, amount, payment_status,
     razorpay_order_id, razorpay_payment_id,
     customer_phone, customer_email
   ) VALUES (...)
   │
   ▼
8. ✅ Payment tracked successfully!
```

### Scenario 2: Failed Payment ❌

```
1. Payment verification fails (e.g., signature mismatch)
   │
   ▼
2. verify-razorpay-payment.php detects failure
   │
   ▼
3. Track failed payment:
   POST https://vizagtaxihub.com/api/payment-tracker-final.php
   {
     "action": "track_failure",
     "booking_id": 376,
     "booking_number": "VTH17604320093218",
     "amount": 100.00,
     "failure_reason": "Signature verification failed",
     "failure_code": "SIGNATURE_MISMATCH",
     "customer_phone": "9999999999",
     "customer_email": "customer@example.com"
   }
   │
   ▼
4. payment-tracker-final.php inserts into database:
   INSERT INTO payment_attempts (
     booking_id, booking_number, amount, payment_status,
     failure_reason, customer_phone, customer_email
   ) VALUES (..., 'failed', 'Signature verification failed', ...)
   │
   ▼
5. ✅ Failure tracked successfully!
```

### Scenario 3: Cancelled Payment 🚫

```
1. User clicks "Cancel" on Razorpay checkout
   │
   ▼
2. Frontend detects cancellation
   │
   ▼
3. Track cancelled payment:
   POST https://vizagtaxihub.com/api/payment-tracker-final.php
   {
     "action": "track_cancellation",
     "booking_id": 377,
     "booking_number": "VTH17604320093219",
     "amount": 500.00,
     "cancellation_reason": "user_cancelled",
     "customer_phone": "8888888888",
     "customer_email": "customer@example.com"
   }
   │
   ▼
4. payment-tracker-final.php inserts into database:
   INSERT INTO payment_attempts (
     booking_id, booking_number, amount, payment_status,
     cancellation_reason, customer_phone, customer_email
   ) VALUES (..., 'cancelled', 'user_cancelled', ...)
   │
   ▼
5. ✅ Cancellation tracked successfully!
```

## Database Schema

```sql
CREATE TABLE payment_attempts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id INT NOT NULL,
  booking_number VARCHAR(50) NOT NULL,
  razorpay_order_id VARCHAR(255),
  razorpay_payment_id VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  payment_status ENUM('initiated','failed','cancelled','successful'),
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

## Key Changes Made

### 1. Fixed Endpoint URL
**Before:**
```php
'http://localhost/api/track-payment-attempt.php'  // ❌ Doesn't exist
```

**After:**
```php
$baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' 
    ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'];
$baseUrl . '/api/payment-tracker-final.php'  // ✅ Correct URL
```

### 2. Added Action Handlers
**Before:**
```php
// Only handled 'track_cancellation'
if ($action === 'track_cancellation') { ... }
```

**After:**
```php
// Handles all three actions
if ($action === 'track_cancellation') { ... }
elseif ($action === 'track_attempt') { ... }
elseif ($action === 'track_failure') { ... }
```

### 3. Created Database Table
**Before:**
```sql
-- Table didn't exist
-- No way to track payments
```

**After:**
```sql
-- Complete table with all required fields
CREATE TABLE payment_attempts (...)
```

## Monitoring Dashboard

After deployment, admins can:

1. **View all payment attempts**
   - Successful payments
   - Failed payments
   - Cancelled payments

2. **Filter by:**
   - Booking number
   - Status
   - Date range

3. **See details:**
   - Amount
   - Customer info
   - Failure/cancellation reasons
   - Timestamps

4. **Export data:**
   - CSV export for analysis
   - Reports for management

## Benefits

✅ **Complete visibility** into all payment attempts
✅ **Better analytics** for business decisions
✅ **Improved customer support** with detailed payment history
✅ **Identify issues** with failed payments
✅ **Track success rates** and conversion metrics
✅ **Audit trail** for compliance

