#!/bin/bash

# AI Data Assistant Development Script
echo "🚀 Starting AI Data Assistant in development mode..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from example..."
    cp .env.example .env
    echo "📝 Please edit the .env file with your configuration and run this script again."
    exit 1
fi

# Build shared package in watch mode
echo "🔗 Starting shared package in watch mode..."
cd shared
npm run dev &
SHARED_PID=$!
cd ..

# Wait a bit for shared to build
sleep 3

# Start backend in development mode
echo "⚙️ Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Start frontend in development mode
echo "🖥️ Starting frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Function to cleanup processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down development servers..."
    kill $SHARED_PID 2>/dev/null
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Trap SIGINT and SIGTERM
trap cleanup SIGINT SIGTERM

echo ""
echo "✅ Development servers started!"
echo ""
echo "📍 Access points:"
echo "  • Frontend: http://localhost:3000"
echo "  • Backend:  http://localhost:3001"
echo "  • API:      http://localhost:3001/api"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for all background processes
wait