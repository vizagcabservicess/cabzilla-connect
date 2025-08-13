<?php
// Test script to verify current issues
require_once __DIR__ . '/utils/email.php';

echo "=== CURRENT ISSUES TEST ===\n\n";

// Test 1: Date formatting with timezone conversion
echo "1. Testing date formatting with timezone conversion:\n";
$testDate = "2025-08-13 07:48:00"; // This is what's showing on the page (UTC)
echo "   Input (UTC): $testDate\n";
echo "   formatDateTimeForEmail: " . formatDateTimeForEmail($testDate) . "\n";
echo "   Expected (IST): 13 Aug 2025 at 01:18 PM\n";
echo "   Status: " . (formatDateTimeForEmail($testDate) === '13 Aug 2025 at 01:18 PM' ? '✅ FIXED' : '❌ STILL BROKEN') . "\n\n";

// Test with the expected time (12:31 PM IST)
$expectedISTTime = "2025-08-13 12:31:00";
echo "2. Testing expected IST time:\n";
echo "   Expected IST time: $expectedISTTime\n";
echo "   formatDateTimeForEmail: " . formatDateTimeForEmail($expectedISTTime) . "\n";
echo "   Status: " . (formatDateTimeForEmail($expectedISTTime) === '13 Aug 2025 at 06:01 PM' ? '✅ FIXED' : '❌ STILL BROKEN') . "\n\n";

// Test 3: Price formatting
echo "3. Testing price formatting:\n";
$testAmount = 5990;
echo "   Input: $testAmount\n";
echo "   formatPriceForEmail: " . formatPriceForEmail($testAmount) . "\n";
echo "   Expected: ₹5,990.00\n";
echo "   Status: " . (formatPriceForEmail($testAmount) === '₹5,990.00' ? '✅ FIXED' : '❌ STILL BROKEN') . "\n\n";

// Test 4: PDF generation
echo "4. Testing PDF generation:\n";
$testBooking = [
    'id' => 999,
    'bookingNumber' => 'VTH' . date('Ymd') . 'TEST',
    'pickupLocation' => 'Test Location',
    'dropLocation' => 'Test Destination',
    'pickupDate' => $testDate, // Use the UTC time
    'cabType' => 'Swift Dzire',
    'totalAmount' => $testAmount,
    'passengerName' => 'Test User',
    'passengerPhone' => '9876543210',
    'passengerEmail' => 'test@example.com',
    'payment_status' => 'payment_pending',
    'payment_method' => 'razorpay',
    'advance_paid_amount' => 1797,
    'razorpay_payment_id' => 'test_payment',
    'razorpay_order_id' => 'test_order',
    'razorpay_signature' => 'test_signature',
    'tripType' => 'outstation',
    'tripMode' => 'one-way'
];

echo "   Generating payment receipt...\n";
$receiptHtml = generatePaymentReceipt($testBooking);

// Check if receipt contains correct date format (IST)
$dateInReceipt = preg_match('/Receipt Date<\/div>\s*<div class="detail-value">(.*?)<\/div>/', $receiptHtml, $matches) ? $matches[1] : 'Not found';
echo "   Date in receipt: $dateInReceipt\n";
echo "   Expected (IST): 13 Aug 2025 at 01:18 PM\n";
echo "   Date Status: " . ($dateInReceipt === '13 Aug 2025 at 01:18 PM' ? '✅ FIXED' : '❌ STILL BROKEN') . "\n";

// Check if receipt contains correct price format (no double rupee)
$priceInReceipt = preg_match('/Total Amount:<\/span>\s*<span>(.*?)<\/span>/', $receiptHtml, $matches) ? $matches[1] : 'Not found';
echo "   Price in receipt: $priceInReceipt\n";
echo "   Expected: ₹5,990.00\n";
echo "   Price Status: " . ($priceInReceipt === '₹5,990.00' ? '✅ FIXED' : '❌ STILL BROKEN') . "\n";

// Test PDF generation
echo "   Testing PDF generation...\n";
$pdfFile = generatePDFFromHTML($receiptHtml, 'test_receipt');
if ($pdfFile && file_exists($pdfFile)) {
    $fileSize = filesize($pdfFile);
    echo "   PDF generated: $pdfFile (Size: $fileSize bytes)\n";
    echo "   PDF Status: " . ($fileSize > 0 ? '✅ WORKING' : '❌ EMPTY FILE') . "\n";
    
    // Clean up test file
    unlink($pdfFile);
} else {
    echo "   PDF generation failed\n";
    echo "   PDF Status: ❌ FAILED\n";
}

echo "\n=== SUMMARY ===\n";
echo "1. Date formatting (timezone): " . (formatDateTimeForEmail($testDate) === '13 Aug 2025 at 01:18 PM' ? '✅ FIXED' : '❌ STILL BROKEN') . "\n";
echo "2. Price formatting: " . (formatPriceForEmail($testAmount) === '₹5,990.00' ? '✅ FIXED' : '❌ STILL BROKEN') . "\n";
echo "3. PDF generation: " . (isset($fileSize) && $fileSize > 0 ? '✅ WORKING' : '❌ FAILED') . "\n";

echo "\n=== TIMEZONE EXPLANATION ===\n";
echo "The times stored in the database are in UTC.\n";
echo "When you see '07:48 AM' on the booking confirmation page, this is UTC time.\n";
echo "In IST (India Standard Time, UTC+5:30), this would be '01:18 PM'.\n";
echo "The fix converts UTC times to IST for proper display.\n";

echo "\n=== END TEST ===\n";
?>
