#!/bin/bash

echo "🚀 Starting deployment process..."

# Build the application
echo "📦 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build completed successfully!"

# Copy the correct .htaccess file to dist
echo "📋 Copying .htaccess file..."
cp src/backend/php-templates/.htaccess dist/.htaccess

# Clear server cache (if using Apache)
echo "🧹 Clearing server cache..."
# Add your server cache clearing commands here if needed

# Force cache refresh by adding timestamp to index.html
echo "⏰ Adding cache-busting timestamp..."
TIMESTAMP=$(date +%s)
sed -i "s/__BUILD_TIME__/$TIMESTAMP/g" dist/index.html

echo "📤 Ready to upload files..."
echo "📋 Next steps:"
echo "1. Upload the contents of the 'dist' folder to your server"
echo "2. The .htaccess file has been copied to dist/ with proper cache control"
echo "3. Test the application in an incognito/private browser window"
echo "4. Verify that new deployments load fresh content"

echo "✅ Deployment preparation complete!"
