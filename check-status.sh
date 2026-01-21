#!/bin/bash
# PYQverse Service Status & Quick Start Guide

echo "======================================"
echo "   PYQverse Services Status"
echo "======================================"
echo ""

# Check Backend
if curl -s http://localhost:8001/api/health > /dev/null 2>&1; then
    echo "✅ Backend API: RUNNING on http://localhost:8001"
    echo "   Health Check: $(curl -s http://localhost:8001/api/health)"
else
    echo "❌ Backend API: NOT RUNNING"
    echo "   Start with: cd /app && node api/index.js &"
fi

echo ""

# Check Frontend
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ Frontend (Dev): RUNNING on http://localhost:5173"
elif curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend (Preview): RUNNING on http://localhost:3000"
else
    echo "❌ Frontend: NOT RUNNING"
    echo "   Start Dev: cd /app && yarn dev"
    echo "   Or Preview: cd /app && yarn build && yarn preview"
fi

echo ""
echo "======================================"
echo "   Quick Commands"
echo "======================================"
echo ""
echo "Start Development Servers:"
echo "  Backend:  cd /app && node api/index.js &"
echo "  Frontend: cd /app && yarn dev &"
echo ""
echo "Access Application:"
echo "  Development: http://localhost:5173"
echo "  API Docs:    http://localhost:8001/api/health"
echo ""
echo "Stop Services:"
echo "  pkill -f 'node api/index'"
echo "  pkill -f 'vite'"
echo ""
