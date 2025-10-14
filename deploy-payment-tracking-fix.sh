#!/bin/bash

# Payment Tracking Fix Deployment Script
# This script deploys the payment tracking fix to production

echo "=========================================="
echo "Payment Tracking Fix - Deployment Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PRODUCTION_SERVER="www.vizagtaxihub.com"
API_DIR="/api"
ROOT_DIR="/"

echo "Step 1: Creating database table..."
echo "-----------------------------------"
echo "Please run this SQL script on your database:"
echo ""
echo "  sql/payment_attempts_table.sql"
echo ""
echo "You can do this by:"
echo "  1. Logging into phpMyAdmin"
echo "  2. Selecting your database"
echo "  3. Going to SQL tab"
echo "  4. Copying and pasting the contents of sql/payment_attempts_table.sql"
echo "  5. Clicking 'Go'"
echo ""
read -p "Have you created the database table? (y/n): " db_created

if [ "$db_created" != "y" ]; then
    echo -e "${RED}Please create the database table first and run this script again.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Database table created${NC}"
echo ""

echo "Step 2: Uploading files to production server..."
echo "-----------------------------------"

# Check if files exist
if [ ! -f "src/backend/php-templates/api/verify-razorpay-payment.php" ]; then
    echo -e "${RED}Error: verify-razorpay-payment.php not found${NC}"
    exit 1
fi

if [ ! -f "payment-tracker-final.php" ]; then
    echo -e "${RED}Error: payment-tracker-final.php not found${NC}"
    exit 1
fi

echo "Files to upload:"
echo "  1. src/backend/php-templates/api/verify-razorpay-payment.php"
echo "  2. payment-tracker-final.php"
echo ""

# Ask for deployment method
echo "Choose deployment method:"
echo "  1. Manual upload (recommended)"
echo "  2. SCP (if you have SSH access)"
echo ""
read -p "Enter choice (1 or 2): " deploy_method

if [ "$deploy_method" = "1" ]; then
    echo ""
    echo "Please upload the following files manually:"
    echo ""
    echo "  1. src/backend/php-templates/api/verify-razorpay-payment.php"
    echo "     → Upload to: ${PRODUCTION_SERVER}/api/verify-razorpay-payment.php"
    echo ""
    echo "  2. payment-tracker-final.php"
    echo "     → Upload to: ${PRODUCTION_SERVER}/api/payment-tracker-final.php"
    echo ""
    read -p "Press Enter after uploading files..."
    
elif [ "$deploy_method" = "2" ]; then
    echo ""
    read -p "Enter SSH username: " ssh_user
    read -p "Enter SSH host (default: ${PRODUCTION_SERVER}): " ssh_host
    ssh_host=${ssh_host:-$PRODUCTION_SERVER}
    
    echo ""
    echo "Uploading files via SCP..."
    
    # Upload verify-razorpay-payment.php
    scp "src/backend/php-templates/api/verify-razorpay-payment.php" "${ssh_user}@${ssh_host}:${API_DIR}/verify-razorpay-payment.php"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Uploaded verify-razorpay-payment.php${NC}"
    else
        echo -e "${RED}✗ Failed to upload verify-razorpay-payment.php${NC}"
        exit 1
    fi
    
    # Upload payment-tracker-final.php
    scp "payment-tracker-final.php" "${ssh_user}@${ssh_host}:${API_DIR}/payment-tracker-final.php"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Uploaded payment-tracker-final.php${NC}"
    else
        echo -e "${RED}✗ Failed to upload payment-tracker-final.php${NC}"
        exit 1
    fi
else
    echo -e "${RED}Invalid choice${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Files uploaded successfully${NC}"
echo ""

echo "Step 3: Testing the deployment..."
echo "-----------------------------------"

echo "Testing payment tracking endpoint..."
response=$(curl -s -o /dev/null -w "%{http_code}" "https://${PRODUCTION_SERVER}/api/payment-tracker-final.php")

if [ "$response" = "200" ]; then
    echo -e "${GREEN}✓ Payment tracking endpoint is working${NC}"
else
    echo -e "${YELLOW}⚠ Payment tracking endpoint returned HTTP $response${NC}"
    echo "  This might be normal if there are no payment attempts yet."
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Make a test payment to verify tracking is working"
echo "  2. Check the database: SELECT * FROM payment_attempts ORDER BY created_at DESC LIMIT 5;"
echo "  3. Monitor the payment tracking dashboard in admin panel"
echo ""
echo "For troubleshooting, see: PAYMENT_TRACKING_FIX.md"
echo ""

