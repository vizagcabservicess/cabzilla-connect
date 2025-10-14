# Payment Tracking Fixes - Customer Details & Timezone

## 🎯 Issues Found

### Issue 1: Customer Details Missing
For cancelled bookings, customer phone and email were not showing in the payment tracking dashboard.

### Issue 2: Wrong Attempt Time
The attempt timestamp was showing incorrect time (likely UTC instead of IST).

## ✅ Solutions Implemented

### Fix 1: Added Customer Details to Cancellation Tracking

**Problem:** When tracking payment cancellations, customer phone and email were not being passed to the tracking API.

**Solution:** Updated the cancellation tracking code to:
1. Retrieve customer details from sessionStorage
2. Pass them to the tracking API
3. Store them in the database

**Files Modified:**
- `src/services/razorpayService.ts`
- `src/services/paymentTrackingService.ts`

**Changes in `razorpayService.ts`:**
```typescript
// Get customer details from sessionStorage
const bookingDetails = sessionStorage.getItem('bookingDetails');
let customerPhone = null;
let customerEmail = null;

if (bookingDetails) {
  try {
    const details = JSON.parse(bookingDetails);
    customerPhone = details.guestDetails?.phone || details.passengerPhone || details.passenger_phone;
    customerEmail = details.guestDetails?.email || details.passengerEmail || details.passenger_email;
    console.log('📞 Customer details:', { customerPhone, customerEmail });
  } catch (e) {
    console.warn('⚠️ Could not parse booking details for customer info');
  }
}

const result = await trackPaymentCancellation(
  bookingData.bookingId,
  bookingData.bookingNumber,
  bookingData.amount,
  'user_cancelled',
  'User dismissed payment modal',
  customerPhone,  // ✅ Added
  customerEmail   // ✅ Added
);
```

**Changes in `paymentTrackingService.ts`:**
```typescript
export const trackPaymentCancellation = async (
  bookingId: number,
  bookingNumber: string,
  amount: number,
  reason: 'user_cancelled' | 'timeout' | 'system_error' | 'insufficient_funds' | 'card_declined' | 'other',
  description?: string,
  customerPhone?: string,   // ✅ Added
  customerEmail?: string    // ✅ Added
) => {
  return paymentTrackingService.trackCancellation({
    booking_id: bookingId,
    booking_number: bookingNumber,
    amount: amount,
    cancellation_reason: reason,
    cancellation_description: description,
    customer_phone: customerPhone,  // ✅ Added
    customer_email: customerEmail,  // ✅ Added
  });
};
```

### Fix 2: Fixed Timezone for Attempt Timestamp

**Problem:** The `attempt_timestamp` was using `NOW()` which returns server time (likely UTC), causing incorrect timestamps in the dashboard.

**Solution:** Updated all SQL queries to use `CONVERT_TZ` to convert to IST (India Standard Time, +05:30).

**File Modified:**
- `payment-tracker-final.php`

**Changes:**
```sql
-- Before:
attempt_timestamp = NOW()

-- After:
attempt_timestamp = CONVERT_TZ(NOW(), @@session.time_zone, '+05:30')
```

Applied to all three tracking actions:
1. `track_cancellation` - Cancelled payments
2. `track_attempt` - Successful payments
3. `track_failure` - Failed payments

## 📋 Files Modified

| File | Changes |
|------|---------|
| `src/services/razorpayService.ts` | Added customer details retrieval from sessionStorage |
| `src/services/paymentTrackingService.ts` | Added customer phone/email parameters |
| `payment-tracker-final.php` | Fixed timezone for all timestamps |

## 🧪 How to Test

### Test 1: Customer Details

1. Create a new booking with guest details
2. Go to payment page
3. Click "Pay Now"
4. Click the **X button** to close the modal
5. **Check console** - should see:
   ```
   📞 Customer details: {customerPhone: "9550099336", customerEmail: "customer@example.com"}
   ```
6. **Check database:**
   ```sql
   SELECT booking_number, customer_phone, customer_email, payment_status
   FROM payment_attempts
   WHERE payment_status = 'cancelled'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   Should show:
   - ✅ customer_phone: "9550099336"
   - ✅ customer_email: "customer@example.com"

7. **Check Admin Dashboard:**
   - Go to Payment Tracking Widget
   - Should show customer phone and email for cancelled bookings

### Test 2: Correct Timestamp

1. Cancel a payment at 3:00 PM IST
2. **Check database:**
   ```sql
   SELECT booking_number, attempt_timestamp, payment_status
   FROM payment_attempts
   WHERE payment_status = 'cancelled'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   Should show:
   - ✅ attempt_timestamp: "2025-01-14 15:00:00" (IST)
   - ✅ Not "2025-01-14 09:30:00" (UTC)

3. **Check Admin Dashboard:**
   - Go to Payment Tracking Widget
   - Attempt Time should show correct IST time

## 📊 What Gets Tracked Now

### Cancelled Payments Include:
- ✅ Booking ID
- ✅ Booking Number
- ✅ Amount
- ✅ Status: 'cancelled'
- ✅ Cancellation Reason: 'user_cancelled'
- ✅ **Customer Phone** (NEW)
- ✅ **Customer Email** (NEW)
- ✅ **Correct IST Timestamp** (FIXED)

### Example Database Record:
```sql
{
  id: 123,
  booking_id: 386,
  booking_number: "CB17263268571234",
  amount: 1500.00,
  payment_status: "cancelled",
  cancellation_reason: "user_cancelled",
  customer_phone: "9550099336",        -- ✅ Now included
  customer_email: "customer@example.com", -- ✅ Now included
  attempt_timestamp: "2025-01-14 15:00:00", -- ✅ Correct IST time
  created_at: "2025-01-14 15:00:00"
}
```

## 🎉 Expected Results

### Before:
- ❌ Customer phone: NULL
- ❌ Customer email: NULL
- ❌ Attempt time: Wrong (UTC instead of IST)

### After:
- ✅ Customer phone: "9550099336"
- ✅ Customer email: "customer@example.com"
- ✅ Attempt time: Correct IST time

## 🔧 Technical Details

### Timezone Conversion

The `CONVERT_TZ` function converts the current server time to IST:
```sql
CONVERT_TZ(NOW(), @@session.time_zone, '+05:30')
```

- `NOW()` - Current server time
- `@@session.time_zone` - Server's timezone
- `'+05:30'` - IST offset (UTC+5:30)

### Customer Details Retrieval

The code checks multiple possible locations for customer details:
```typescript
customerPhone = details.guestDetails?.phone || details.passengerPhone || details.passenger_phone;
customerEmail = details.guestDetails?.email || details.passengerEmail || details.passenger_email;
```

This ensures compatibility with different booking flows:
- Regular bookings (guestDetails)
- Tour bookings (passengerPhone/passengerEmail)
- Admin bookings (passenger_phone/passenger_email)

## 🐛 Troubleshooting

### Issue: Customer details still not showing

**Check:**
1. Console for "📞 Customer details:" log
2. sessionStorage for bookingDetails
3. Database for customer_phone and customer_email fields

**Debug:**
```javascript
// In browser console
const bookingDetails = JSON.parse(sessionStorage.getItem('bookingDetails'));
console.log('Guest Details:', bookingDetails.guestDetails);
console.log('Phone:', bookingDetails.guestDetails?.phone);
console.log('Email:', bookingDetails.guestDetails?.email);
```

### Issue: Time still showing wrong

**Check:**
1. Database timezone settings
2. PHP timezone settings
3. Server timezone

**Debug:**
```sql
-- Check server timezone
SELECT @@session.time_zone;

-- Check current time
SELECT NOW(), CONVERT_TZ(NOW(), @@session.time_zone, '+05:30');
```

## 📝 Summary

**Issues Fixed:**
1. ✅ Customer phone and email now tracked for cancellations
2. ✅ Timestamps now show correct IST time

**Files Modified:** 3
- `src/services/razorpayService.ts`
- `src/services/paymentTrackingService.ts`
- `payment-tracker-final.php`

**Impact:**
- Better tracking of cancelled payments
- Correct timestamps for all payment attempts
- Complete customer information for analytics

---

**Status:** ✅ Fixed
**Last Updated:** 2025-01-14
**Ready for Testing:** Yes

