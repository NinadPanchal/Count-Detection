#!/bin/bash

# CrowdWatch Unified Startup Script
# Orchestrates the Python FastAPI backend and the Next.js frontend

echo "====================================================="
echo "         🚀 Starting CrowdWatch Dashboard            "
echo "====================================================="

# Cleanup traps for graceful shutdown
cleanup() {
    echo ""
    echo "====================================================="
    echo "🛑 Shutting down CrowdWatch servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo "✅ Shutdown complete."
    echo "====================================================="
    exit 0
}

trap cleanup SIGINT SIGTERM

# 1. Start the Backend AI Pipeline
echo "-> Booting up AI Video Pipeline & API (Port 8000)..."
cd backend
# Check if venv exists before sourcing
if [ -d "venv" ]; then
    source venv/bin/activate
fi
python start_with_tunnel.py &
BACKEND_PID=$!
cd ..

# 2. Add slight delay for tunnels to map
sleep 3

# 3. Start the Frontend Dashboard
echo "-> Booting up Premium Next.js UI (Port 3000)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "====================================================="
echo "✅ CrowdWatch is LIVE!"
echo "🌐 View Dashboard at: http://localhost:3000"
echo "📡 Check console above for external Camera Links"
echo "🛑 Press Ctrl+C to stop both servers."
echo "====================================================="

# Wait indefinitely until Ctrl+C is pressed
wait
