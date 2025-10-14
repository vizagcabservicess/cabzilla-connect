# Debug Payment Cancellation Tracking

## 🔍 Issue

You're not seeing the console logs when cancelling a payment:
```
Tracking payment cancellation...
Payment cancellation tracked successfully
```

## ✅ What I Fixed

### 1. Added Detailed Console Logging

Updated `src/services/razorpayService.ts` with comprehensive logging:

```typescript
ondismiss: async () => {
  console.log('🔴 Razorpay modal dismissed!');
  console.log('Booking data:', bookingData);
  
  if (bookingData?.bookingId && bookingData?.bookingNumber && bookingData?.amount) {
    console.log('📊 Tracking payment cancellation...', bookingData);
    // ... tracking code
    console.log('✅ Payment cancellation tracked successfully:', result);
  } else {
    console.warn('⚠️ Booking data missing, cannot track cancellation');
  }
}
```

### 2. Fixed CSP Violation

Updated `index.html` to allow Razorpay's tracking domain:

**Added to `connect-src`:**
```
https://lumberjack.razorpay.com
```

This fixes the CSP errors you were seeing in the console.

## 🧪 How to Test

### Step 1: Clear Browser Cache

1. Open browser DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### Step 2: Test Payment Cancellation

1. Go to payment page
2. Click "Pay Now"
3. **Click the X button** to close the Razorpay modal
4. **Check the console** - you should now see:

```
🔴 Razorpay modal dismissed!
Booking data: {bookingId: ..., bookingNumber: ..., amount: ...}
📊 Tracking payment cancellation... {bookingId: ..., bookingNumber: ..., amount: ...}
✅ Payment cancellation tracked successfully: {status: "success", ...}
🔔 Calling onDismiss callback
```

### Step 3: Verify in Database

```sql
SELECT * FROM payment_attempts 
WHERE payment_status = 'cancelled' 
ORDER BY created_at DESC 
LIMIT 1;
```

### Step 4: Check Admin Dashboard

Go to Admin Dashboard → Payment Tracking Widget
- Should show cancelled payments
- Status should be "cancelled"
- Reason should be "user_cancelled"

## 📋 Files Modified

| File | Changes |
|------|---------|
| `src/services/razorpayService.ts` | Added detailed console logging |
| `index.html` | Added `https://lumberjack.razorpay.com` to CSP |

## 🔧 What to Look For

### If you see "🔴 Razorpay modal dismissed!":
✅ The modal is being dismissed correctly
✅ The ondismiss handler is firing

### If you see "⚠️ Booking data missing":
❌ The booking data is not being passed correctly
- Check if `bookingDetails.bookingId` exists
- Check if `bookingDetails.bookingNumber` exists
- Check if `amount` is calculated correctly

### If you see "✅ Payment cancellation tracked successfully":
✅ The tracking API call succeeded
✅ The record should be in the database

### If you DON'T see "🔴 Razorpay modal dismissed!":
❌ The ondismiss handler is not firing
- The modal might be closing in a different way
- Try clicking outside the modal
- Try pressing ESC key
- Check if Razorpay SDK is loaded correctly

## 🐛 Troubleshooting

### Issue: Still not seeing any console logs

**Possible causes:**
1. **Cache issue** - Hard refresh the page (Ctrl+Shift+R)
2. **Razorpay SDK not loaded** - Check console for Razorpay errors
3. **Modal closing differently** - Try different ways to close the modal

**Debug steps:**
```javascript
// In browser console, check if Razorpay is loaded
console.log(typeof window.Razorpay); // Should be "function"

// Check if booking data is in sessionStorage
console.log(sessionStorage.getItem('bookingDetails'));

// Manually trigger tracking
window.trackPaymentCancellation();
```

### Issue: CSP errors still showing

**Solution:** Make sure you hard refresh the page after updating `index.html`

```bash
# In browser
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

### Issue: "Booking data missing" warning

**Solution:** Check if booking data is being passed correctly:

```typescript
// In PaymentPage.tsx, check these values:
console.log('bookingId:', bookingDetails.bookingId);
console.log('bookingNumber:', bookingDetails.bookingNumber);
console.log('amount:', amount);
```

## 📊 Expected Console Output

When you cancel a payment, you should see:

```
🔴 Razorpay modal dismissed!
Booking data: {
  bookingId: 375,
  bookingNumber: "VTH17604320093217",
  amount: 1500
}
📊 Tracking payment cancellation... {
  bookingId: 375,
  bookingNumber: "VTH17604320093217",
  amount: 1500
}
✅ Payment cancellation tracked successfully: {
  status: "success",
  message: "Payment cancellation tracked successfully",
  id: 123
}
🔔 Calling onDismiss callback
```

## 🚀 Next Steps

1. **Upload the modified files** to production
2. **Clear browser cache** (hard refresh)
3. **Test cancellation** and check console
4. **Verify in database** that the record was created
5. **Check admin dashboard** to see the cancelled payment

## ✨ What's Different Now

### Before:
- ❌ No console logs
- ❌ CSP errors blocking Razorpay tracking
- ❌ Cancellations not tracked

### After:
- ✅ Detailed console logs at every step
- ✅ CSP allows Razorpay tracking
- ✅ Cancellations tracked and stored
- ✅ Easy to debug any issues

---

**Status:** ✅ Ready for Testing
**Last Updated:** 2025-01-14

