#!/bin/bash

# Exit on error
set -e

echo "🚀 Preparing MyDay HRMS for cPanel Deployment..."

# 1. Build the application
echo "📦 Building application..."
npm run build

# 2. Create deployment directory
echo "📂 Creating deployment package..."
rm -rf deploy
mkdir -p deploy

# 3. Copy necessary files
echo "COPYing files..."
cp package.json deploy/
cp package-lock.json deploy/ 2>/dev/null || true
cp -r dist deploy/
# Copy shared folder just in case, though esbuild should bundle it
# cp -r shared deploy/ 2>/dev/null || true

# 4. Create Zip file
echo "🤐 Zipping files..."
cd deploy
zip -r ../myday_cpanel_deploy.zip .
cd ..

echo "✅ Deployment package created: myday_cpanel_deploy.zip"
echo "---------------------------------------------------"
echo "👉 Upload 'myday_cpanel_deploy.zip' to your cPanel File Manager"
echo "👉 Extract it to a folder (e.g., 'myday_app')"
echo "👉 Use 'Setup Node.js App' to point to that folder"
echo "---------------------------------------------------"
