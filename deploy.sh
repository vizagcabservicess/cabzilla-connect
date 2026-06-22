#!/bin/bash

echo "🚀 Starting deployment process..."

# Unique id baked into every JS chunk filename so CDN cannot serve stale cross-chunk pairs
export VITE_BUILD_ID=$(date +%s)
echo "📌 Build id: $VITE_BUILD_ID"

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
echo "3. Purge Cloudflare cache (Caching → Purge Everything) so old immutable JS is cleared"
echo "4. Test the application in an incognito/private browser window"
echo "5. Verify that new deployments load fresh content"

echo "✅ Deployment preparation complete!"
