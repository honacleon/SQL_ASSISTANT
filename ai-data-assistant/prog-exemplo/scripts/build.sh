#!/bin/bash

# AI Data Assistant Build Script
echo "🔨 Building AI Data Assistant for production..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf */dist
rm -rf */build

# Build shared package first
echo "🔗 Building shared package..."
cd shared
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Failed to build shared package"
    exit 1
fi
cd ..

# Build backend
echo "⚙️ Building backend..."
cd backend
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Failed to build backend"
    exit 1
fi
cd ..

# Build frontend
echo "🖥️ Building frontend..."
cd frontend
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Failed to build frontend"
    exit 1
fi
cd ..

# Create production directory structure
echo "📁 Creating production build structure..."
mkdir -p production
mkdir -p production/backend
mkdir -p production/frontend
mkdir -p production/shared

# Copy built files
cp -r backend/dist/* production/backend/
cp -r backend/package.json production/backend/
cp -r frontend/dist/* production/frontend/
cp -r shared/dist/* production/shared/
cp -r shared/package.json production/shared/

# Copy necessary files
cp .env.example production/
cp README.md production/
cp -r docs production/

echo ""
echo "✅ Build completed successfully!"
echo ""
echo "📁 Production files are in the 'production' directory"
echo "🚀 Deploy the contents to your production server"