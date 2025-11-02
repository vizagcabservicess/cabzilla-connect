#!/bin/bash

# Payment Tracking Deployment Script
# This script helps deploy the payment tracking system to production

echo "🚀 Payment Tracking System Deployment"
echo "======================================"

# Check if files exist
if [ ! -f "src/backend/php-templates/api/track-payment-attempt.php" ]; then
    echo "❌ Error: track-payment-attempt.php not found!"
    echo "   Expected location: src/backend/php-templates/api/track-payment-attempt.php"
    exit 1
fi

if [ ! -f "src/backend/php-templates/api/payment-tracking.sql" ]; then
    echo "❌ Error: payment-tracking.sql not found!"
    echo "   Expected location: src/backend/php-templates/api/payment-tracking.sql"
    exit 1
fi

echo "✅ All required files found!"

echo ""
echo "📋 Deployment Checklist:"
echo "1. Upload track-payment-attempt.php to your server at:"
echo "   https://www.vizagtaxihub.com/api/track-payment-attempt.php"
echo ""
echo "2. Run the SQL script on your production database:"
echo "   (Contents of src/backend/php-templates/api/payment-tracking.sql)"
echo ""
echo "3. Test the API endpoint:"
echo "   https://www.vizagtaxihub.com/api/track-payment-attempt.php"
echo ""
echo "4. Open test-payment-tracking-api.html in your browser to test"
echo ""

# Display SQL content
echo "📄 SQL Script Content:"
echo "======================"
cat src/backend/php-templates/api/payment-tracking.sql
echo ""
echo "======================"
echo ""

echo "🔧 Manual Upload Instructions:"
echo "1. Use your FTP/SFTP client or cPanel File Manager"
echo "2. Navigate to your website's /api/ directory"
echo "3. Upload track-payment-attempt.php"
echo "4. Set file permissions to 644 or 755"
echo ""

echo "🧪 Testing Instructions:"
echo "1. Open test-payment-tracking-api.html in your browser"
echo "2. Click 'Test GET Request' to verify the API is working"
echo "3. Click 'Create Test Payment' to add sample data"
echo "4. Click 'Fetch All Payments' to see the data"
echo ""

echo "✅ Once the API is working, update your frontend:"
echo "   In src/pages/AdminDashboardPage.tsx, change:"
echo "   FROM: PaymentTrackingWidgetSimple"
echo "   TO:   PaymentTrackingWidget"
echo ""

echo "🎉 Deployment complete! Follow the checklist above."


























