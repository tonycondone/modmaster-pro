# ModMaster Pro - Development Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- Python 3.9+
- Docker & Docker Compose
- PostgreSQL 14+
- Redis 6+
- Git

### Initial Setup

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/modmaster-pro.git
cd modmaster-pro
```

2. **Install dependencies**
```bash
# Root dependencies
npm install

# Backend API
cd backend/api && npm install

# Mobile app
cd mobile-app && npm install

# AI Service
cd ai-service && pip install -r requirements.txt

# Web Scraping Service
cd web-scraping && npm install
```

3. **Environment setup**
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configurations
# Required variables:
# - DATABASE_URL
# - REDIS_URL
# - JWT_SECRET
# - AWS_ACCESS_KEY_ID (for S3)
# - INTERNAL_API_KEY
```

4. **Database setup**
```bash
# Run migrations
cd backend/api
npm run migrate

# Seed initial data (optional)
npm run seed
```

5. **Start services**
```bash
# Using Docker Compose (recommended)
docker-compose up -d

# Or start individually
npm run dev:backend    # Backend API
npm run dev:mobile     # Mobile app
npm run dev:ai         # AI service
npm run dev:scraping   # Web scraping
```

## 🏗️ Architecture Overview

### Service Architecture
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Mobile App    │────▶│   Backend API   │────▶│   PostgreSQL    │
│  (React Native) │     │   (Node.js)     │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                         
         │                       ├─────────────────┐       
         │                       ▼                 ▼       
         │              ┌─────────────────┐ ┌─────────────┐
         │              │   AI Service    │ │    Redis    │
         │              │   (Python)      │ └─────────────┘
         │              └─────────────────┘        
         │                       │                  
         │                       ▼                  
         │              ┌─────────────────┐        
         └─────────────▶│  Web Scraping   │        
                        │   (Node.js)     │        
                        └─────────────────┘        
```

### Database Schema
```sql
-- Core tables
users
vehicles
parts
scans
projects
recommendations
marketplace_integrations
reviews

-- Relationships
users -> vehicles (1:many)
users -> scans (1:many)
vehicles -> scans (1:many)
vehicles -> projects (1:many)
parts -> reviews (1:many)
parts -> marketplace_integrations (1:many)
```

## 🔧 Development Workflow

### 1. Feature Development

**Branch naming convention:**
- `feature/description` - New features
- `fix/description` - Bug fixes
- `chore/description` - Maintenance tasks
- `docs/description` - Documentation

**Example workflow:**
```bash
# Create feature branch
git checkout -b feature/add-part-comparison

# Make changes and commit
git add .
git commit -m "feat: add part comparison feature"

# Push and create PR
git push origin feature/add-part-comparison
```

### 2. API Development

**Adding a new endpoint:**

1. Create route file:
```javascript
// backend/api/src/routes/comparison.routes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

router.post('/compare', authenticate, async (req, res) => {
  // Implementation
});

module.exports = router;
```

2. Add to app.js:
```javascript
app.use('/api/v1/comparisons', require('./routes/comparison.routes'));
```

3. Add tests:
```javascript
// backend/api/src/__tests__/comparison.test.js
describe('Comparison API', () => {
  test('should compare parts', async () => {
    // Test implementation
  });
});
```

### 3. Mobile App Development

**Adding a new screen:**

1. Create screen component:
```typescript
// mobile-app/src/screens/ComparisonScreen.tsx
export const ComparisonScreen: React.FC = () => {
  // Component implementation
};
```

2. Add to navigation:
```typescript
// mobile-app/src/navigation/AppNavigator.tsx
<Stack.Screen name="Comparison" component={ComparisonScreen} />
```

3. Update store if needed:
```typescript
// mobile-app/src/store/slices/comparisonSlice.ts
const comparisonSlice = createSlice({
  name: 'comparison',
  initialState,
  reducers: {
    // Reducers
  }
});
```

### 4. AI Model Development

**Training new models:**

1. Prepare dataset:
```python
# ai-models/data/prepare_dataset.py
def prepare_training_data():
    # Data preparation logic
```

2. Train model:
```bash
cd ai-models
python training/train_model.py --epochs 100 --batch-size 32
```

3. Deploy model:
```python
# ai-service/models/
# Copy trained model to production
# Update model_server.py configuration
```

## 🧪 Testing

### Running Tests

```bash
# All tests
npm test

# Backend tests
cd backend/api && npm test

# Mobile app tests
cd mobile-app && npm test

# E2E tests
npm run test:e2e

# With coverage
npm run test:coverage
```

### Writing Tests

**Unit test example:**
```javascript
describe('Vehicle Model', () => {
  test('should create vehicle with valid data', async () => {
    const vehicle = await Vehicle.create({
      make: 'Tesla',
      model: 'Model 3',
      year: 2023
    });
    expect(vehicle.id).toBeDefined();
  });
});
```

**Integration test example:**
```javascript
describe('POST /api/v1/vehicles', () => {
  test('should create vehicle for authenticated user', async () => {
    const response = await request(app)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send({ make: 'Tesla', model: 'Model 3', year: 2023 })
      .expect(201);
      
    expect(response.body.success).toBe(true);
  });
});
```

## 🚢 Deployment

### Development Environment
```bash
# Deploy to dev
./scripts/deploy-dev.sh
```

### Staging Environment
```bash
# Deploy to staging
./scripts/deploy-staging.sh

# Run smoke tests
npm run test:smoke
```

### Production Environment
```bash
# Deploy to production (requires approval)
./scripts/deploy-prod.sh

# Monitor deployment
npm run monitor:prod
```

### Environment Variables

**Backend API:**
- `NODE_ENV` - Environment (development/staging/production)
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret
- `AWS_S3_BUCKET` - S3 bucket for uploads

**AI Service:**
- `MODEL_PATH` - Path to AI models
- `CUDA_VISIBLE_DEVICES` - GPU configuration
- `MAX_BATCH_SIZE` - Maximum inference batch size

**Mobile App:**
- `API_URL` - Backend API URL
- `SOCKET_URL` - WebSocket URL
- `SENTRY_DSN` - Error tracking

## 📊 Monitoring & Debugging

### Logging
```javascript
// Use structured logging
logger.info('Scan completed', {
  scanId: scan.id,
  userId: user.id,
  duration: processingTime
});
```

### Monitoring Tools
- **Prometheus** - Metrics collection
- **Grafana** - Metrics visualization
- **Sentry** - Error tracking
- **New Relic** - Application performance

### Debug Mode
```bash
# Enable debug logging
DEBUG=modmaster:* npm run dev

# Mobile app debugging
npx react-native log-android
npx react-native log-ios
```

## 🔐 Security Best Practices

1. **API Security**
   - Always validate input with Joi
   - Use parameterized queries
   - Implement rate limiting
   - Sanitize file uploads

2. **Authentication**
   - JWT tokens with short expiry
   - Refresh token rotation
   - Secure password requirements
   - Email verification required

3. **Data Protection**
   - Encrypt sensitive data at rest
   - Use HTTPS everywhere
   - Implement CORS properly
   - Regular security audits

## 📚 Additional Resources

- [API Documentation](http://localhost:3000/api-docs)
- [Mobile App Style Guide](./docs/mobile-style-guide.md)
- [Database Migrations Guide](./docs/migrations.md)
- [AI Model Documentation](./ai-models/README.md)
- [Troubleshooting Guide](./docs/troubleshooting.md)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

## 📞 Support

- **Discord**: [Join our community](https://discord.gg/modmaster)
- **Email**: dev@modmasterpro.com
- **Issues**: [GitHub Issues](https://github.com/yourusername/modmaster-pro/issues)