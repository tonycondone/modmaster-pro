# ModMaster Pro 🏎️

AI-powered automotive modification platform for car enthusiasts. ModMaster Pro revolutionizes the way car enthusiasts discover, plan, and execute vehicle modifications by combining cutting-edge AI technology with real-time marketplace integration.

## 🌟 Key Features

- **🔍 AI-Powered Engine Scanning**: Snap a photo of your engine bay to instantly identify parts and get modification recommendations
- **🏷️ Real-Time Price Tracking**: Compare prices across multiple retailers with live updates and deal alerts
- **🤖 Smart Recommendations**: AI-driven suggestions based on your vehicle, driving style, and budget
- **📱 Mobile-First Design**: Native mobile app for iOS and Android with camera integration
- **🛠️ Project Management**: Track your builds, costs, and share with the community
- **🔧 Professional Tools**: Shop integration for businesses and professional tuners
- **📊 Performance Analytics**: Predict performance gains before you buy

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React Native)                   │
│                     iOS & Android Mobile Apps                    │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────────┐
│                    API Gateway (Express.js)                      │
│              Authentication, Rate Limiting, Routing              │
└──────────┬──────────────┬──────────────┬───────────────────────┘
           │              │              │
┌──────────┴────┐ ┌───────┴──────┐ ┌────┴────────────────────────┐
│ Backend API   │ │ AI/ML Service │ │ Web Scraping Service        │
│ (Node.js)     │ │ (Python)      │ │ (Node.js + n8n)            │
└──────┬────────┘ └───────┬──────┘ └────┬────────────────────────┘
       │                  │              │
┌──────┴──────────────────┴──────────────┴───────────────────────┐
│                    Data Layer                                    │
│         PostgreSQL    │    Redis    │    Elasticsearch         │
└─────────────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

### Frontend
- **React Native** with Expo for cross-platform mobile development
- **TypeScript** for type safety
- **Redux Toolkit** for state management
- **React Navigation** for routing
- **React Native Paper** for Material Design components
- **React Query** for server state management

### Backend Services
- **Node.js** with Express.js for the main API
- **Python** FastAPI for AI/ML service
- **PostgreSQL** for primary database
- **Redis** for caching and sessions
- **Elasticsearch** for advanced search
- **Docker** for containerization

### AI/ML Stack
- **TensorFlow** & **PyTorch** for deep learning
- **YOLOv8** for object detection
- **ResNet** for image classification
- **Tesseract** for OCR (VIN extraction)
- **OpenCV** for image processing

### Web Scraping
- **n8n** for workflow automation
- **Playwright** & **Puppeteer** for browser automation
- **Cheerio** for HTML parsing
- **Bull** for job queuing

### Infrastructure
- **Docker Compose** for local development
- **Kubernetes** for production orchestration
- **Prometheus** & **Grafana** for monitoring
- **MinIO** for S3-compatible storage

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- Redis 7+

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/modmaster-pro.git
   cd modmaster-pro
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start all services**
   ```bash
   make setup
   make dev
   ```

4. **Access the services**
   - Backend API: http://localhost:3000
   - AI Service: http://localhost:8001
   - Web Scraping: http://localhost:8002
   - n8n Workflows: http://localhost:5678
   - Mobile App: Use Expo Go app

### Development Commands

```bash
# Setup project
make setup

# Start development environment
make dev

# Run database migrations
make db-migrate

# Run tests
make test

# View logs
make logs

# Stop services
make stop

# Clean up
make clean
```

## 📱 Mobile App Development

### Running the Mobile App

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Start Expo**
   ```bash
   npm start
   ```

3. **Run on device/simulator**
   - iOS: Press `i` in terminal or scan QR with Camera app
   - Android: Press `a` in terminal or scan QR with Expo Go app

### Building for Production

```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```

## 🧪 Testing

### Backend Tests
```bash
cd backend/api
npm test
```

### AI Service Tests
```bash
cd ai-service
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

### End-to-End Tests
```bash
make test-e2e
```

## 📊 API Documentation

- Swagger UI: http://localhost:3000/api-docs
- Postman Collection: [Download](./docs/postman-collection.json)

### Key Endpoints

#### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Get current user

#### Vehicles
- `GET /api/v1/vehicles/my-vehicles` - Get user's vehicles
- `POST /api/v1/vehicles` - Add new vehicle
- `GET /api/v1/vehicles/:id` - Get vehicle details
- `PUT /api/v1/vehicles/:id` - Update vehicle

#### Parts
- `GET /api/v1/parts/search` - Search parts
- `GET /api/v1/parts/:id` - Get part details
- `GET /api/v1/parts/trending` - Get trending parts
- `GET /api/v1/parts/compatible/:vehicleId` - Get compatible parts

#### Scans
- `POST /api/v1/scans` - Create new scan
- `GET /api/v1/scans/:id` - Get scan results
- `GET /api/v1/scans` - Get user's scan history

## 🔐 Security

- JWT-based authentication with refresh tokens
- Rate limiting per user tier
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration
- Secure password hashing with bcrypt
- API key authentication for service-to-service communication

## 🚦 Performance

- Redis caching for frequently accessed data
- Database query optimization with indexes
- Image optimization and CDN delivery
- Lazy loading and code splitting
- Background job processing
- Horizontal scaling ready

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- YOLOv8 team for object detection models
- The open-source community for amazing tools
- Car enthusiast community for feedback and ideas

## 📞 Support

- Documentation: [docs.modmasterpro.com](https://docs.modmasterpro.com)
- Email: support@modmasterpro.com
- Discord: [Join our community](https://discord.gg/modmasterpro)

---

Built with ❤️ by car enthusiasts, for car enthusiasts 🏁
- **Professional Tools**: Shop integration, installer network, and business analytics
- **Social Features**: Build sharing, community reviews, and expert feedback

## 🏗️ Architecture

- **Frontend**: React Native / Flutter with Material Design
- **Backend**: Node.js / Python FastAPI with PostgreSQL
- **AI/ML**: TensorFlow/PyTorch for computer vision and recommendations
- **Web Scraping**: n8n workflow automation with multiple scraping strategies
- **Cloud**: AWS/GCP with Docker and Kubernetes

## 🚀 Getting Started

See the [Development Guide](./docs/development.md) for setup instructions.

## 📊 Project Status

- **Phase 1 (MVP)**: 3-4 months - Basic engine scanning and parts search
- **Phase 2 (Enhancement)**: 2-3 months - Advanced AI and automation
- **Phase 3 (Optimization)**: 2 months - Performance and enterprise features

## 🤝 Contributing

This project is currently in development. See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

[License details to be determined]
