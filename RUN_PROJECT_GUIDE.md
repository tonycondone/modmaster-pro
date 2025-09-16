# 🚀 ModMaster Pro - Complete Project Setup & Run Guide

## 📋 Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Project Installation](#project-installation)
- [Running the Full Stack](#running-the-full-stack)
- [Individual Component Setup](#individual-component-setup)
- [Mobile App Development](#mobile-app-development)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)
- [API Documentation](#api-documentation)

---

## 🛠️ Prerequisites

### System Requirements
- **Operating System**: macOS, Windows 10/11, or Linux (Ubuntu 20.04+)
- **RAM**: Minimum 8GB, Recommended 16GB
- **Storage**: At least 10GB free space
- **Network**: Stable internet connection for dependencies

### Required Software

#### 1. **Node.js & npm**
```bash
# Install Node.js 18+ (LTS recommended)
# macOS
brew install node

# Windows
# Download from https://nodejs.org/

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be 18.0.0 or higher
npm --version   # Should be 8.0.0 or higher
```

#### 2. **Python 3.11+**
```bash
# macOS
brew install python@3.11

# Windows
# Download from https://python.org/downloads/

# Ubuntu/Debian
sudo apt update
sudo apt install python3.11 python3.11-pip python3.11-venv

# Verify installation
python3 --version  # Should be 3.11.0 or higher
pip3 --version
```

#### 3. **Docker & Docker Compose**
```bash
# macOS
brew install docker docker-compose

# Windows
# Download Docker Desktop from https://docker.com/

# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Verify installation
docker --version
docker-compose --version
```

#### 4. **Git**
```bash
# macOS
brew install git

# Windows
# Download from https://git-scm.com/

# Ubuntu/Debian
sudo apt install git

# Verify installation
git --version
```

#### 5. **Mobile Development Tools** (for React Native)
```bash
# Install Expo CLI globally
npm install -g @expo/cli

# For iOS development (macOS only)
# Install Xcode from Mac App Store

# For Android development
# Install Android Studio from https://developer.android.com/studio
```

---

## 🌍 Environment Setup

### 1. **Clone the Repository**
```bash
git clone https://github.com/tonycondone/modmaster-pro.git
cd modmaster-pro
```

### 2. **Create Environment Files**

#### **Root .env file**
```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your settings
nano .env  # or use your preferred editor
```

**Required Environment Variables:**
```env
# Database Configuration
POSTGRES_DB=modmaster_pro
POSTGRES_USER=modmaster_user
POSTGRES_PASSWORD=your_secure_password_here

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_min_32_characters
JWT_REFRESH_SECRET=your_refresh_secret_key_min_32_characters

# API Keys
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# N8N Configuration
N8N_USERNAME=admin
N8N_PASSWORD=your_n8n_password

# Monitoring
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=your_grafana_password

# MinIO Object Storage
MINIO_ACCESS_KEY=modmaster_access_key
MINIO_SECRET_KEY=your_minio_secret_key

# Internal API Keys
INTERNAL_API_KEY=your_internal_api_key_for_services
```

#### **Backend API .env**
```bash
cd backend/api
cp .env.example .env
```

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://modmaster_user:your_password@localhost:5432/modmaster_pro
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret_key_min_32_characters
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
AI_SERVICE_URL=http://localhost:8001
CORS_ORIGIN=http://localhost:19006,exp://192.168.1.100:8081
```

#### **Mobile App .env**
```bash
cd mobile-app
cp .env.example .env
```

```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api
EXPO_PUBLIC_AI_SERVICE_URL=http://192.168.1.100:8001
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
EXPO_PUBLIC_ENVIRONMENT=development
```

#### **AI Service .env**
```bash
cd ai-service
cp .env.example .env
```

```env
ENVIRONMENT=development
DATABASE_URL=postgresql://modmaster_user:your_password@localhost:5432/modmaster_pro
REDIS_URL=redis://localhost:6379/1
BACKEND_API_URL=http://localhost:3000
INTERNAL_API_KEY=your_internal_api_key_for_services
MODEL_STORAGE_PATH=/app/models
DEBUG=true
PORT=8001
LOG_LEVEL=DEBUG
```

---

## ⚡ Quick Start - Full Stack with Docker

### 1. **Start All Services with Docker Compose**
```bash
# Build and start all services
docker-compose up --build

# Or run in background
docker-compose up -d --build

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### 2. **Access the Services**
Once all services are running, you can access:

- **Backend API**: http://localhost:3000
- **AI Service**: http://localhost:8001
- **Mobile App** (Expo): http://localhost:19000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **Elasticsearch**: http://localhost:9200
- **N8N Workflows**: http://localhost:5678
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001
- **MinIO**: http://localhost:9000

### 3. **Initialize the Database**
```bash
# Run database migrations
docker-compose exec backend-api npm run migrate

# Or if running locally
cd backend/api
npm run migrate
```

### 4. **Stop All Services**
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: This will delete all data)
docker-compose down -v
```

---

## 🔧 Individual Component Setup

### 1. **Backend API Setup**

```bash
cd backend/api

# Install dependencies
npm install

# Setup database (if not using Docker)
# Make sure PostgreSQL is running locally
createdb modmaster_pro

# Run migrations
npm run migrate

# Start development server
npm run dev

# The API will be available at http://localhost:3000
```

**Available Scripts:**
```bash
npm run dev          # Start development server with hot reload
npm run start        # Start production server
npm run test         # Run tests
npm run migrate      # Run database migrations
npm run rollback     # Rollback last migration
npm run seed         # Seed database with sample data
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

### 2. **AI Service Setup**

```bash
cd ai-service

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download AI models (first time only)
python -c "
from ultralytics import YOLO
from torchvision.models import resnet50, ResNet50_Weights
YOLO('yolov8n.pt')  # Downloads YOLOv8 nano model
resnet50(weights=ResNet50_Weights.IMAGENET1K_V2)  # Downloads ResNet50
print('Models downloaded successfully!')
"

# Start the AI service
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001

# The AI service will be available at http://localhost:8001
```

**Available Commands:**
```bash
uvicorn app.main:app --reload    # Development server with auto-reload
python -m pytest tests/         # Run tests
black app/                       # Format code
isort app/                       # Sort imports
flake8 app/                     # Check code style
```

### 3. **Mobile App Setup**

```bash
cd mobile-app

# Install dependencies
npm install

# Start Expo development server
npm start

# Or start specific platform
npm run android      # Android emulator/device
npm run ios         # iOS simulator (macOS only)
npm run web         # Web browser
```

**Development Workflow:**
1. **Expo Go App**: Install Expo Go on your phone and scan the QR code
2. **Android Emulator**: Have Android Studio with emulator set up
3. **iOS Simulator**: Have Xcode installed (macOS only)
4. **Web Browser**: Access at http://localhost:19006

**Available Scripts:**
```bash
npm start           # Start Expo development server
npm run android     # Run on Android
npm run ios         # Run on iOS
npm run web         # Run on web
npm test           # Run tests
npm run lint       # Run ESLint
npm run type-check # TypeScript type checking
```

---

## 📱 Mobile App Development

### Development Setup Options

#### Option 1: Physical Device (Recommended)
1. Install **Expo Go** from App Store/Google Play
2. Start the development server: `npm start`
3. Scan the QR code with Expo Go app
4. App will load on your device with hot reload

#### Option 2: Android Emulator
```bash
# Start Android emulator (Android Studio required)
# Then run:
npm run android
```

#### Option 3: iOS Simulator (macOS only)
```bash
# Xcode required
npm run ios
```

#### Option 4: Web Browser
```bash
npm run web
# Access at http://localhost:19006
```

### Mobile App Features
- ✅ **Authentication**: Login, Register, Password Reset
- ✅ **Part Scanning**: Camera integration with AI processing
- ✅ **Vehicle Management**: Add, edit, view vehicles
- ✅ **Parts Marketplace**: Browse, search, purchase parts
- ✅ **Shopping Cart**: Add to cart, checkout with Stripe
- ✅ **Profile Management**: User settings and preferences
- ✅ **Scan History**: View previous scans and results

---

## 🗄️ Database Setup

### Local PostgreSQL Setup
```bash
# Install PostgreSQL
# macOS
brew install postgresql
brew services start postgresql

# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# Create database and user
sudo -u postgres psql
CREATE DATABASE modmaster_pro;
CREATE USER modmaster_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE modmaster_pro TO modmaster_user;
\q
```

### Database Migrations
```bash
cd backend/api

# Run migrations
npm run migrate

# Create new migration
npm run migrate:make migration_name

# Rollback last migration
npm run migrate:rollback

# Check migration status
npm run migrate:status
```

---

## 🚀 Production Deployment

### Docker Production Build
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.prod.yml up -d

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale backend-api=3
```

### Environment-Specific Configurations

#### **Production .env**
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@production-db:5432/modmaster_pro
REDIS_URL=redis://production-redis:6379
JWT_SECRET=super_secure_production_jwt_secret
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
```

### Deployment Platforms

#### **Railway**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway link
railway up
```

#### **Vercel (Backend API)**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd backend/api
vercel --prod
```

#### **Expo EAS (Mobile App)**
```bash
cd mobile-app

# Install EAS CLI
npm install -g @expo/eas-cli

# Configure EAS
eas login
eas build:configure

# Build for production
eas build --platform android
eas build --platform ios

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

#### **Google Cloud Run (AI Service)**
```bash
# Build and deploy AI service
cd ai-service

# Build Docker image
docker build -t gcr.io/your-project/modmaster-ai .

# Push to Google Container Registry
docker push gcr.io/your-project/modmaster-ai

# Deploy to Cloud Run
gcloud run deploy modmaster-ai \
  --image gcr.io/your-project/modmaster-ai \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

## 🧪 Testing

### Backend API Tests
```bash
cd backend/api

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- auth.test.js
```

### AI Service Tests
```bash
cd ai-service

# Run all tests
python -m pytest

# Run with coverage
python -m pytest --cov=app

# Run specific test
python -m pytest tests/test_scan_api.py
```

### Mobile App Tests
```bash
cd mobile-app

# Run Jest tests
npm test

# Run tests with coverage
npm run test:coverage

# Run E2E tests (if configured)
npm run test:e2e
```

---

## 🔍 Monitoring & Debugging

### View Logs
```bash
# Docker logs
docker-compose logs -f backend-api
docker-compose logs -f ai-service
docker-compose logs -f

# Local development logs
cd backend/api && npm run dev
cd ai-service && uvicorn app.main:app --reload
```

### Health Checks
- **Backend API**: http://localhost:3000/health
- **AI Service**: http://localhost:8001/health
- **Database**: Check with docker-compose ps

### Performance Monitoring
- **Grafana Dashboard**: http://localhost:3001 (admin/password)
- **Prometheus Metrics**: http://localhost:9090

---

## 🐛 Troubleshooting

### Common Issues

#### **Port Already in Use**
```bash
# Find process using port
lsof -i :3000
kill -9 PID

# Or use different port
PORT=3001 npm run dev
```

#### **Database Connection Issues**
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Reset database
docker-compose down -v
docker-compose up postgres -d
```

#### **Mobile App Not Loading**
```bash
# Clear Expo cache
npx expo start --clear

# Reset Metro bundler
npx react-native start --reset-cache
```

#### **AI Service Model Loading Issues**
```bash
# Download models manually
cd ai-service
python -c "
from ultralytics import YOLO
YOLO('yolov8n.pt')
print('YOLOv8 downloaded')
"
```

#### **Docker Issues**
```bash
# Reset Docker
docker system prune -a
docker-compose down -v
docker-compose up --build

# Check Docker resources
docker system df
```

### Getting Help
- **GitHub Issues**: https://github.com/your-repo/modmaster-pro/issues
- **Documentation**: Check `/docs` folder
- **Logs**: Always check logs first: `docker-compose logs -f`

---

## 📚 API Documentation

### Backend API Endpoints

#### **Authentication**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh token

#### **Vehicles**
- `GET /api/vehicles` - Get user vehicles
- `POST /api/vehicles` - Create vehicle
- `GET /api/vehicles/:id` - Get vehicle details
- `PUT /api/vehicles/:id` - Update vehicle
- `DELETE /api/vehicles/:id` - Delete vehicle

#### **Parts**
- `GET /api/parts` - Browse parts
- `GET /api/parts/:id` - Get part details
- `GET /api/parts/search` - Search parts
- `POST /api/parts/:id/favorite` - Add to favorites

#### **Scans**
- `POST /api/scans/process` - Process scan
- `GET /api/scans` - Get scan history
- `GET /api/scans/:id` - Get scan details
- `DELETE /api/scans/:id` - Delete scan

### AI Service Endpoints

#### **Scan Processing**
- `POST /api/v1/scan/process` - Process image scan
- `GET /api/v1/scan/result/:id` - Get scan results
- `POST /api/v1/scan/batch` - Batch process images

#### **Health & Monitoring**
- `GET /health` - Service health check
- `GET /api/v1/metrics` - Performance metrics

---

## 🎯 Quick Reference

### Essential Commands
```bash
# Start everything
docker-compose up -d

# View all logs
docker-compose logs -f

# Stop everything
docker-compose down

# Reset everything
docker-compose down -v && docker-compose up --build

# Individual services
cd backend/api && npm run dev
cd ai-service && uvicorn app.main:app --reload
cd mobile-app && npm start
```

### Default Ports
- **Backend API**: 3000
- **AI Service**: 8001
- **Mobile App**: 19000-19002
- **PostgreSQL**: 5432
- **Redis**: 6379
- **Grafana**: 3001
- **N8N**: 5678

### Default Credentials
- **Grafana**: admin / (set in .env)
- **N8N**: admin / (set in .env)
- **Database**: modmaster_user / (set in .env)

---

## 🚀 You're Ready!

Your ModMaster Pro development environment is now set up and ready to use! 

### Next Steps:
1. **Start the full stack**: `docker-compose up -d`
2. **Open mobile app**: `cd mobile-app && npm start`
3. **Test the API**: http://localhost:3000/health
4. **Check AI service**: http://localhost:8001/health
5. **Start developing!** 🎉

For any issues, check the [Troubleshooting](#troubleshooting) section or create an issue on GitHub.

**Happy coding!** 🚗💨