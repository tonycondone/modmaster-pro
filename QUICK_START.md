# 🚀 ModMaster Pro - Quick Start Guide

## 🎯 **FASTEST WAY TO RUN** (Windows)

### 🖱️ **One-Click Start (Recommended)**

1. **Right-click** on `start-all.ps1` 
2. Select **"Run with PowerShell"**
3. Follow the on-screen instructions
4. Services will start automatically in separate windows

### ⌨️ **Manual Commands**

If the script doesn't work, run these commands in **separate PowerShell windows**:

#### Window 1: Backend API
```powershell
cd backend/api
npm install --legacy-peer-deps
npm run dev
# Backend will be at: http://localhost:3000
```

#### Window 2: AI Service  
```powershell
cd ai-service
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python -m app.main
# AI Service will be at: http://localhost:8001
```

#### Window 3: Mobile App
```powershell
cd mobile-app
npm install --legacy-peer-deps
npx expo start
# Expo DevTools will be at: http://localhost:19000
```

#### Window 4: Admin Dashboard (Optional)
```powershell
cd admin-dashboard
npm install
npm run dev
# Admin Dashboard will be at: http://localhost:3001
```

## 📱 **Using the Mobile App**

### Option 1: Your Phone (Recommended)
1. Install **"Expo Go"** app from App Store/Google Play
2. Scan the QR code from the Expo DevTools window
3. App loads instantly on your phone

### Option 2: Web Browser
1. Press **"w"** in the Expo DevTools window
2. App opens in your browser
3. (Note: Camera won't work in browser)

## 🎮 **What You Can Do**

### ✅ **Mobile App Features**
- **Register/Login** - Create your account
- **Add Vehicles** - Add your cars with photos
- **Scan Parts** - Use camera to identify auto parts  
- **Browse Marketplace** - Shop for automotive parts
- **Track Orders** - Monitor your purchases
- **View Analytics** - See your vehicle stats

### ✅ **Admin Dashboard Features** 
- **User Management** - View all users and activity
- **Vehicle Tracking** - Monitor all vehicles in system
- **Parts Inventory** - Manage marketplace catalog
- **AI Analytics** - Monitor scan performance
- **System Health** - Check service status

## 🔧 **Troubleshooting**

### ❓ **Service Won't Start?**
```powershell
# Check if ports are free
netstat -ano | findstr :3000
netstat -ano | findstr :8001
netstat -ano | findstr :19000

# Kill processes if needed
taskkill /PID <process_id> /F
```

### ❓ **Mobile App Won't Load?**
1. Restart Expo: `Ctrl+C` then `npx expo start`
2. Clear cache: `npx expo start --clear`
3. Try web version: Press "w" in Expo DevTools

### ❓ **Dependencies Failed?**
```powershell
# Clean and reinstall
rm -rf node_modules
npm install --legacy-peer-deps --force
```

### ❓ **Database Issues?**
- Ensure PostgreSQL is installed and running
- Check connection string in `.env` files
- Default: `postgresql://postgres:password@localhost:5432/modmaster_pro`

## 🌐 **Service URLs**

| Service | URL | Status |
|---------|-----|--------|
| **Backend API** | http://localhost:3000 | Core API |
| **AI Service** | http://localhost:8001 | AI Processing |  
| **Mobile App** | http://localhost:19000 | Expo DevTools |
| **Admin Dashboard** | http://localhost:3001 | Management |
| **API Docs** | http://localhost:3000/api-docs | Swagger |

## 🎯 **Success Indicators**

You know everything is working when:

✅ **Backend**: Shows "Server running on port 3000"  
✅ **AI Service**: Shows "Application startup complete"  
✅ **Mobile App**: Shows QR code in Expo DevTools  
✅ **Admin Dashboard**: Loads login page  

## 🎉 **You're Ready!**

The ModMaster Pro system is now running with:
- **Complete backend API** with authentication, payments, file upload
- **AI-powered part identification** using YOLOv8 and ResNet50
- **Modern mobile app** with camera scanning and marketplace
- **Admin dashboard** for system management
- **Production-ready architecture** with error handling and logging

**Start by registering a new account in the mobile app and adding your first vehicle!** 🚗📱 