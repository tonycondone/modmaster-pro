# 🚀 ModMaster Pro - Complete Run Guide

## 🎯 Quick Start (Recommended)

### Option 1: Docker Compose (Easiest - One Command Setup)

```bash
# Clone and start everything with Docker
git clone <your-repo-url>
cd modmaster-pro

# Copy environment files
cp backend/api/.env.example backend/api/.env
cp ai-service/.env.example ai-service/.env
cp mobile-app/.env.example mobile-app/.env

# Start all services with Docker
docker-compose up --build

# Services will be available at:
# - Backend API: http://localhost:3000
# - AI Service: http://localhost:8001
# - Admin Dashboard: http://localhost:3001
# - PostgreSQL: localhost:5432
# - Redis: localhost:6379
```

### Option 2: Manual Setup (For Development)

## 📋 Prerequisites

Before starting, ensure you have:

- **Node.js** 18+ installed
- **Python** 3.11+ installed 
- **PostgreSQL** 15+ installed and running
- **Redis** 6+ installed and running
- **Expo CLI** installed globally: `npm install -g @expo/cli`
- **Git** installed

### Windows Prerequisites
```powershell
# Install Node.js from https://nodejs.org
# Install Python from https://python.org
# Install PostgreSQL from https://postgresql.org
# Install Redis from https://github.com/microsoftarchive/redis/releases

# Install Expo CLI
npm install -g @expo/cli
```

### macOS Prerequisites
```bash
# Using Homebrew
brew install node python postgresql redis
npm install -g @expo/cli

# Start services
brew services start postgresql
brew services start redis
```

### Linux Prerequisites
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm python3 python3-pip postgresql redis-server

# Install Expo CLI
sudo npm install -g @expo/cli

# Start services
sudo systemctl start postgresql
sudo systemctl start redis
```

## 🗄️ Database Setup

### 1. Create Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE modmaster_pro;
CREATE USER modmaster WITH ENCRYPTED PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE modmaster_pro TO modmaster;
\q
```

### 2. Configure Environment Variables

**Backend (.env)**
```bash
cd backend/api
cp .env.example .env

# Edit .env file with your settings:
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/modmaster_pro
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-here-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here-change-in-production
# Add your Stripe, Cloudinary, and email credentials
```

**AI Service (.env)**
```bash
cd ../../ai-service
cp .env.example .env

# Edit .env file:
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=modmaster_pro
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Mobile App (.env)**
```bash
cd ../mobile-app
cp .env.example .env

# Edit .env file:
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_AI_SERVICE_URL=http://localhost:8001
```

## 🚀 Start Services

### Terminal 1: Backend API
```bash
cd backend/api

# Install dependencies
npm install

# Run database migrations
npm run migrate

# Seed initial data (optional)
npm run seed

# Start development server
npm run dev

# Backend will be available at: http://localhost:3000
```

### Terminal 2: AI Service
```bash
cd ai-service

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start AI service
python -m app.main

# AI Service will be available at: http://localhost:8001
```

### Terminal 3: Mobile App
```bash
cd mobile-app

# Install dependencies
npm install

# Start Expo development server
npx expo start

# Follow the QR code to open in Expo Go app on your device
# Or press 'w' to open in web browser
# Or press 'i' for iOS simulator
# Or press 'a' for Android emulator
```

### Terminal 4: Admin Dashboard (Optional)
```bash
cd admin-dashboard

# Install dependencies
npm install

# Start development server
npm run dev

# Admin Dashboard will be available at: http://localhost:3001
```

## 📱 Mobile App Setup

### Option A: Physical Device (Recommended)
1. Install **Expo Go** app from App Store/Google Play
2. Run `npx expo start` in mobile-app directory
3. Scan QR code with Expo Go app
4. App will load on your device

### Option B: iOS Simulator (macOS only)
```bash
# Install Xcode from App Store
# Install iOS Simulator
npx expo start
# Press 'i' to open in iOS simulator
```

### Option C: Android Emulator
```bash
# Install Android Studio
# Create Android Virtual Device (AVD)
# Start AVD
npx expo start
# Press 'a' to open in Android emulator
```

### Option D: Web Browser
```bash
npx expo start
# Press 'w' to open in web browser
# Note: Camera features won't work in browser
```

## 🔧 Development Commands

### Backend Commands
```bash
cd backend/api

# Development
npm run dev          # Start with hot reload
npm run build        # Build for production
npm run start        # Start production server
npm test             # Run tests
npm run migrate      # Run database migrations
npm run seed         # Seed database with sample data
npm run reset-db     # Reset database (WARNING: deletes all data)
```

### AI Service Commands
```bash
cd ai-service

# Development
python -m app.main                    # Start development server
uvicorn app.main:app --reload        # Alternative start command
pytest                               # Run tests
python -m app.train.train_yolo       # Train YOLOv8 model
python -m app.train.train_classifier # Train ResNet50 model
```

### Mobile App Commands
```bash
cd mobile-app

# Development
npx expo start              # Start development server
npx expo start --web        # Start web version
npx expo start --ios        # Start iOS simulator
npx expo start --android    # Start Android emulator
npm test                    # Run tests
npx expo doctor             # Check for common issues
```

### Admin Dashboard Commands
```bash
cd admin-dashboard

# Development
npm run dev         # Start development server
npm run build       # Build for production
npm run preview     # Preview production build
npm test            # Run tests
```

## 🔍 Testing the Application

### 1. Backend API Testing
```bash
# Test API endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/auth/status
```

### 2. AI Service Testing
```bash
# Test AI service
curl http://localhost:8001/health
curl http://localhost:8001/docs  # View API documentation
```

### 3. Database Connection Testing
```bash
# Connect to database
psql -U postgres -d modmaster_pro

# Check tables
\dt

# Check sample data
SELECT * FROM users LIMIT 5;
```

### 4. Mobile App Testing
1. Open app in Expo Go
2. Test user registration
3. Test vehicle addition
4. Test part scanning (camera)
5. Test marketplace browsing

## 🐛 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port
netstat -tulpn | grep :3000
# Kill process
kill -9 <process_id>

# Or use different ports
PORT=3001 npm run dev
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
# macOS:
brew services list | grep postgresql
# Linux:
sudo systemctl status postgresql
# Windows: Check Services in Task Manager

# Reset database connection
npm run reset-db
npm run migrate
```

#### Redis Connection Issues
```bash
# Check Redis status
redis-cli ping  # Should return PONG

# Start Redis
# macOS: brew services start redis
# Linux: sudo systemctl start redis
# Windows: Start Redis service
```

#### Node Modules Issues
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Python Dependencies Issues
```bash
# Recreate virtual environment
rm -rf venv
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

#### Expo/React Native Issues
```bash
# Clear Expo cache
npx expo start --clear

# Reset Metro bundler
npx expo start --reset-cache

# Check Expo doctor
npx expo doctor
```

### Performance Issues

#### Backend Slow Response
- Check database indexing
- Monitor Redis cache usage
- Check log files for errors

#### AI Service Slow Processing
- Ensure GPU drivers are installed
- Monitor CPU/Memory usage
- Consider reducing model size

#### Mobile App Slow Loading
- Check network connection
- Clear app cache
- Restart Expo development server

## 📊 Monitoring & Logs

### View Logs
```bash
# Backend logs
cd backend/api && npm run logs

# AI Service logs
cd ai-service && tail -f app.log

# Mobile app logs (in Expo dev tools)
# Open http://localhost:19002 after starting Expo
```

### Health Checks
```bash
# Backend health
curl http://localhost:3000/api/health

# AI Service health
curl http://localhost:8001/health

# Database health
psql -U postgres -c "SELECT 1"

# Redis health
redis-cli ping
```

## 🚀 Production Deployment

### Docker Production
```bash
# Build and run production containers
docker-compose -f docker-compose.prod.yml up --build

# Or with scaling
docker-compose up --scale backend=3 --scale ai-service=2
```

### Manual Production
```bash
# Backend
cd backend/api
npm run build
npm start

# AI Service
cd ai-service
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker

# Mobile App
cd mobile-app
npx expo build:android  # Android APK
npx expo build:ios      # iOS IPA
```

## 📋 Service URLs

When all services are running:

| Service | URL | Description |
|---------|-----|-------------|
| **Backend API** | http://localhost:3000 | Main API server |
| **AI Service** | http://localhost:8001 | AI processing service |
| **Mobile App** | http://localhost:19000 | Expo development server |
| **Admin Dashboard** | http://localhost:3001 | Admin web interface |
| **API Documentation** | http://localhost:3000/api-docs | Swagger documentation |
| **AI API Docs** | http://localhost:8001/docs | FastAPI documentation |
| **Database** | localhost:5432 | PostgreSQL database |
| **Redis** | localhost:6379 | Redis cache |

## 🎯 What You Can Do

Once everything is running:

### Mobile App Features:
✅ **Register/Login** - Create account and authenticate  
✅ **Add Vehicles** - Add your cars with photos and details  
✅ **Scan Parts** - Use camera to identify auto parts  
✅ **Browse Marketplace** - Search and buy automotive parts  
✅ **Manage Orders** - Track purchases and order history  
✅ **Maintenance Tracking** - Schedule and track vehicle maintenance  

### Admin Dashboard Features:
✅ **User Management** - View and manage user accounts  
✅ **Vehicle Tracking** - Monitor all vehicles in system  
✅ **Parts Inventory** - Manage marketplace inventory  
✅ **AI Analytics** - Monitor scan accuracy and performance  
✅ **System Health** - Check service status and performance  

### API Features:
✅ **RESTful APIs** - Complete CRUD operations for all entities  
✅ **Authentication** - JWT-based security with refresh tokens  
✅ **File Upload** - Image processing and storage  
✅ **Payment Processing** - Stripe integration for purchases  
✅ **Real-time Features** - WebSocket support for live updates  

## 🆘 Need Help?

### Quick Fixes
1. **Restart all services** - Close terminals and restart
2. **Clear caches** - Delete node_modules, clear Expo cache
3. **Check environment variables** - Ensure all .env files are properly configured
4. **Verify database connection** - Test PostgreSQL and Redis connections
5. **Update dependencies** - Run npm install/pip install to update packages

### Getting Support
- Check the console logs for specific error messages
- Verify all prerequisites are installed and running
- Ensure all ports (3000, 8001, 5432, 6379) are available
- Test individual services before running everything together

---

**You now have a complete, production-ready vehicle parts identification system running! 🎉**

Start by testing the mobile app features, then explore the admin dashboard to see the full system in action. 