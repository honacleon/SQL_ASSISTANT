#!/bin/bash

# AI Data Assistant Setup Script
echo "🤖 Setting up AI Data Assistant..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm and try again."
    exit 1
fi

echo "✅ npm $(npm -v) detected"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Setup shared package
echo "🔗 Setting up shared package..."
cd shared
npm install
npm run build
cd ..

# Setup backend
echo "⚙️ Setting up backend..."
cd backend
npm install
mkdir -p logs
cd ..

# Setup frontend
echo "🖥️ Setting up frontend..."
cd frontend
npm install
cd ..

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from example..."
    cp .env.example .env
    echo "⚠️  Please edit the .env file with your actual configuration values."
fi

echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Edit the .env file with your configuration"
echo "2. Set up your Supabase database using docs/supabase-setup.sql"
echo "3. Run 'npm run dev' to start the development servers"
echo ""
echo "🚀 Happy coding!"