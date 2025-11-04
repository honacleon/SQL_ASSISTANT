#!/bin/bash

# AI Data Assistant Setup Script
# This script helps set up the development environment

set -e

echo "🚀 Setting up AI Data Assistant..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Build shared package
echo "🔨 Building shared package..."
cd shared && npm run build && cd ..

# Install and build backend
echo "🔧 Setting up backend..."
cd backend
npm install
npm run build
echo "✅ Backend setup complete"
cd ..

# Install and build frontend
echo "🎨 Setting up frontend..."
cd frontend
npm install
echo "✅ Frontend setup complete"
cd ..

# Check for environment file
echo "🔍 Checking environment configuration..."
if [ ! -f backend/.env ]; then
    echo "⚠️  No .env file found in backend directory"
    echo "📋 Creating .env template..."
    cp backend/.env.example backend/.env
    echo "✏️  Please edit backend/.env with your actual credentials:"
    echo "   - SUPABASE_URL"
    echo "   - SUPABASE_SERVICE_KEY"
    echo "   - OPENAI_API_KEY or ANTHROPIC_API_KEY"
else
    echo "✅ Environment file found"
fi

# Create database directory if it doesn't exist
mkdir -p database

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit backend/.env with your Supabase and AI API credentials"
echo "2. Set up your Supabase database:"
echo "   - Run database/schema.sql in your Supabase SQL editor"
echo "   - Run database/sample_data.sql for sample data"
echo "3. Start the development servers:"
echo "   npm run dev"
echo ""
echo "📚 Documentation:"
echo "- Database setup: database/README.md"
echo "- API endpoints: http://localhost:3001/api/health"
echo "- Frontend app: http://localhost:3000"
echo ""
echo "🛠️  For Docker deployment:"
echo "   docker-compose up -d"
echo ""

# Test if we can run the health check
echo "🏥 Testing backend health check..."
cd backend
if npm run build > /dev/null 2>&1; then
    echo "✅ Backend builds successfully"
else
    echo "⚠️  Backend build issues detected - check dependencies"
fi
cd ..

echo "✨ Ready to start development!"