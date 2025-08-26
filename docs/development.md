# ModMaster Pro - Development Guide

This guide will help you set up and develop the ModMaster Pro application locally.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.0.0 or higher
- **Python** 3.9 or higher
- **Docker** and Docker Compose
- **Git** 2.30 or higher
- **Make** (for build commands)

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/modmaster-pro.git
cd modmaster-pro
```

### 2. Setup Development Environment

```bash
# Install all dependencies and setup services
make setup

# Or setup individual components
make setup-backend
make setup-frontend
make setup-scraping
make setup-ai
```

### 3. Start Development Environment

```bash
# Start all services with Docker
make docker-up

# Start development servers
make dev

# Or start individual services
make dev-backend
make dev-frontend
make dev-scraping
```

### 4. Access Services

- **Backend API**: http://localhost:3000
- **Frontend App**: http://localhost:19000
- **AI Service**: http://localhost:8000
- **Scraping Service**: http://localhost:8001
- **n8n Workflows**: http://localhost:5678
- **Grafana**: http://localhost:3001
- **MinIO Console**: http://localhost:9001

## 🏗️ Project Architecture

### Service Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   AI Service    │
│  (React Native) │◄──►│   (Node.js)     │◄──►│   (Python)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  Scraping       │
                       │  Service        │
                       │  (Python)       │
                       └─────────────────┘
```

### Technology Stack

- **Frontend**: React Native with Expo
- **Backend**: Node.js/Express with TypeScript
- **AI/ML**: Python/FastAPI with TensorFlow/PyTorch
- **Database**: PostgreSQL with Redis caching
- **Search**: Elasticsearch
- **Workflow**: n8n for automation
- **Monitoring**: Prometheus + Grafana
- **Storage**: MinIO (S3-compatible)

## 🛠️ Development Setup

### Backend Development

The backend consists of multiple microservices:

```bash
cd backend/api

# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Run with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format
```

#### Database Setup

```bash
# Run migrations
make db-migrate

# Seed database
make db-seed

# Reset database
make db-reset

# Check database status
make db-status
```

#### Environment Variables

Copy the environment template and configure:

```bash
cp .env.example .env
# Edit .env with your configuration
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run tests
npm test
```

### AI/ML Development

```bash
cd ai-ml

# Install Python dependencies
pip install -r requirements.txt

# Train models
make ai-train

# Start inference service
make ai-serve

# Evaluate models
make ai-evaluate
```

### Web Scraping Development

```bash
cd web-scraping

# Install dependencies
npm install

# Start scraping service
make scraping-start

# Monitor scraping
make scraping-monitor

# Test scraping
make scraping-test
```

## 🔧 Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat(component): add new feature"

# Push to remote
git push origin feature/your-feature-name

# Create pull request
# ... via GitHub/GitLab interface
```

### 2. Testing

```bash
# Run all tests
make test

# Run specific test suites
make test-backend
make test-frontend
make test-e2e

# Run tests with coverage
make test-coverage

# Run tests in watch mode
npm run test:watch
```

### 3. Code Quality

```bash
# Lint all code
make lint

# Fix linting issues
make lint-fix

# Format code
make format

# Type checking
make type-check
```

### 4. Database Changes

```bash
# Create new migration
cd backend/api
npx knex migrate:make migration_name

# Edit migration file
# ... add your schema changes

# Run migrations
make db-migrate

# Rollback if needed
make db-rollback
```

## 📊 Monitoring and Debugging

### Health Checks

```bash
# Check service health
make health-check

# View service status
make status

# Check logs
make docker-logs
```

### Metrics and Monitoring

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/modmaster123)
- **Application Metrics**: http://localhost:3000/metrics

### Logging

Logs are stored in the `logs/` directory with rotation:

```bash
# View application logs
tail -f logs/combined-$(date +%Y-%m-%d).log

# View error logs
tail -f logs/error-$(date +%Y-%m-%d).log

# View debug logs (development only)
tail -f logs/debug-$(date +%Y-%m-%d).log
```

## 🐛 Troubleshooting

### Common Issues

#### Docker Issues

```bash
# Clean up Docker
make docker-clean

# Rebuild containers
make docker-build

# Check service logs
make docker-logs
```

#### Database Issues

```bash
# Reset database
make db-reset

# Check database connection
docker-compose exec postgres psql -U modmaster_user -d modmaster_pro

# View database logs
docker-compose logs postgres
```

#### Frontend Issues

```bash
# Clear cache
cd frontend
npm start -- --clear

# Reset Metro bundler
npm start -- --reset-cache
```

#### AI Service Issues

```bash
# Check Python environment
cd ai-ml
python --version
pip list

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### Getting Help

1. **Check existing issues** on GitHub
2. **Search documentation** for solutions
3. **Ask in discussions** for guidance
4. **Create detailed issue** if needed

## 🚀 Deployment

### Local Testing

```bash
# Build for production
make build

# Test production build
make production-ready
```

### Staging Deployment

```bash
# Deploy to staging
make deploy-staging
```

### Production Deployment

```bash
# Deploy to production
make deploy-production
```

## 📚 Additional Resources

- [API Documentation](./api/)
- [Architecture Overview](./architecture.md)
- [Deployment Guide](./deployment.md)
- [Contributing Guidelines](../CONTRIBUTING.md)
- [Project Structure](../project-structure.md)

## 🔄 Development Commands Reference

### Setup Commands

```bash
make setup              # Setup entire project
make setup-backend      # Setup backend services
make setup-frontend     # Setup frontend
make setup-scraping     # Setup scraping services
make setup-ai           # Setup AI/ML services
```

### Development Commands

```bash
make dev                # Start all development servers
make dev-backend        # Start backend development
make dev-frontend       # Start frontend development
make dev-scraping       # Start scraping development
```

### Docker Commands

```bash
make docker-up          # Start all Docker services
make docker-down        # Stop all Docker services
make docker-build       # Build Docker containers
make docker-logs        # View Docker logs
make docker-clean       # Clean up Docker
```

### Testing Commands

```bash
make test               # Run all tests
make test-backend       # Run backend tests
make test-frontend      # Run frontend tests
make test-e2e           # Run end-to-end tests
make test-coverage      # Run tests with coverage
```

### Database Commands

```bash
make db-migrate         # Run database migrations
make db-seed            # Seed database
make db-reset           # Reset database
make db-backup          # Create database backup
```

### Utility Commands

```bash
make status             # Show project status
make health-check       # Check service health
make clean              # Clean build artifacts
make format             # Format code
make lint               # Lint code
make lint-fix           # Fix linting issues
```

## 🎯 Next Steps

1. **Explore the codebase** - Start with the main components
2. **Run the application** - Get familiar with the features
3. **Make small changes** - Start with documentation or simple fixes
4. **Join discussions** - Engage with the community
5. **Contribute features** - Work on issues or new features

---

Happy coding! 🚗✨ If you have questions or need help, don't hesitate to ask in the project discussions or create an issue.