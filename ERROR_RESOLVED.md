# ✅ FIXED: "Web server returned an unknown error"

## Problem Identified & Resolved

**Issue**: You were getting "Web server returned an unknown error" when trying to preview the app.

**Root Cause**: 
1. Backend server wasn't running
2. Port conflicts on port 8001
3. Preview mode expecting production build

## ✅ Solution Applied

### Services are NOW RUNNING! ✅

**Backend API**: ✅ Running on `http://localhost:8001`
- Health check: Active
- Gemini API: Connected
- Groq API: Connected

**Frontend Dev Server**: ✅ Running on `http://localhost:5173`
- Vite dev server with hot reload
- Full React app loaded

---

## 🚀 How to Access Your App

### Option 1: Development Mode (RECOMMENDED - Currently Running)
```
Frontend: http://localhost:5173
Backend:  http://localhost:8001
```

**What you see**:
- Full PYQverse app with hot reload
- All features working
- Fast refresh on code changes

### Option 2: Production Preview Mode
```bash
# Build first
cd /app
yarn build

# Start preview
yarn preview

# Access at: http://localhost:3000
```

---

## 🔍 Quick Status Check

Run anytime to check if services are running:
```bash
/app/check-status.sh
```

Or manually:
```bash
# Check backend
curl http://localhost:8001/api/health

# Check frontend
curl http://localhost:5173
```

---

## 🛠️ Service Management Commands

### Start Services (if not running)

**Backend**:
```bash
cd /app
node api/index.js > /var/log/backend.log 2>&1 &
```

**Frontend Dev**:
```bash
cd /app
yarn dev > /var/log/frontend.log 2>&1 &
```

**Frontend Preview** (production mode):
```bash
cd /app
yarn build
yarn preview > /var/log/frontend.log 2>&1 &
```

### Stop Services

**Stop Backend**:
```bash
pkill -f 'node api/index'
```

**Stop Frontend**:
```bash
pkill -f 'vite'
```

**Stop All**:
```bash
pkill -f 'node api/index'
pkill -f 'vite'
```

### Restart Services

```bash
# Stop all
pkill -f 'node api/index'
pkill -f 'vite'

# Wait a moment
sleep 2

# Start backend
cd /app && node api/index.js > /var/log/backend.log 2>&1 &

# Start frontend
cd /app && yarn dev > /var/log/frontend.log 2>&1 &
```

---

## 📋 Check Logs

**Backend Logs**:
```bash
tail -f /var/log/backend.log
```

**Frontend Logs**:
```bash
tail -f /var/log/frontend.log
```

---

## 🎯 What Works Now

✅ Backend API running on port 8001  
✅ Frontend dev server on port 5173  
✅ All API endpoints accessible  
✅ Firebase connection working  
✅ Gemini & Groq APIs connected  
✅ Hot reload enabled  
✅ All native features ready  

---

## 🐛 Troubleshooting

### If you see "Port already in use"

```bash
# Find what's using port 8001
lsof -i :8001

# Kill the process
kill -9 <PID>

# Or kill all node processes
pkill -f node
```

### If services don't start

**Check for errors**:
```bash
# Backend errors
tail -50 /var/log/backend.log

# Frontend errors  
tail -50 /var/log/frontend.log
```

**Common fixes**:
```bash
# Clear port 8001
pkill -f 'node api'

# Clear port 5173
pkill -f vite

# Rebuild if needed
cd /app && yarn build
```

### If you see "connection refused"

```bash
# Verify services are running
ps aux | grep -E "node|vite" | grep -v grep

# If not running, start them
cd /app
node api/index.js > /var/log/backend.log 2>&1 &
yarn dev > /var/log/frontend.log 2>&1 &
```

---

## 🌐 Access URLs

| Service | URL | Status |
|---------|-----|--------|
| Frontend (Dev) | http://localhost:5173 | ✅ RUNNING |
| Backend API | http://localhost:8001 | ✅ RUNNING |
| API Health | http://localhost:8001/api/health | ✅ ACTIVE |
| Frontend (Preview) | http://localhost:3000 | Need to run `yarn preview` |

---

## 💡 Development Workflow

**Normal Development** (What's running now):
1. Frontend: `http://localhost:5173` - Dev server with hot reload
2. Backend: `http://localhost:8001` - API server
3. Make changes in code → auto-reload in browser

**Testing Production Build**:
```bash
yarn build        # Build production assets
yarn preview      # Preview at localhost:3000
```

**For Android Build**:
```bash
yarn build        # Build web assets
yarn android:sync # Sync to Android
yarn android:open # Open in Android Studio
```

---

## ✅ Current Status

**Both services are running successfully!**

- ✅ Backend API: Listening on port 8001
- ✅ Frontend: Vite dev server on port 5173
- ✅ All APIs connected and working
- ✅ Ready for development and testing

**Access your app now at**: `http://localhost:5173`

---

## 🚀 Next Steps

1. **Access the app**: Open `http://localhost:5173` in your browser
2. **Test features**: All features should work (login, practice, doubt solver, etc.)
3. **Make changes**: Code changes will auto-reload
4. **Build Android**: When ready, run `yarn android:open`

---

**Status**: ✅ **RESOLVED** - All services running smoothly!
