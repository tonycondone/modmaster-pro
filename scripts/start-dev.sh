#!/bin/bash

# ModMaster Pro - Development Startup Script
# This script helps you quickly start the development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${CYAN}================================${NC}"
    echo -e "${CYAN}  ModMaster Pro - Dev Startup  ${NC}"
    echo -e "${CYAN}================================${NC}"
    echo ""
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install it and try again."
        exit 1
    fi
    
    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        print_warning "Node.js is not installed. Some features may not work."
    else
        NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -lt 18 ]; then
            print_warning "Node.js version is below 18.0.0. Some features may not work."
        fi
    fi
    
    # Check if Python is available
    if ! command -v python3 &> /dev/null; then
        print_warning "Python 3 is not installed. AI/ML services may not work."
    fi
    
    # Check if Make is available
    if ! command -v make &> /dev/null; then
        print_warning "Make is not installed. You'll need to run commands manually."
    fi
    
    print_success "Prerequisites check completed"
}

# Function to setup environment
setup_environment() {
    print_status "Setting up development environment..."
    
    # Copy environment file if it doesn't exist
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            print_status "Creating .env file from template..."
            cp .env.example .env
            print_warning "Please edit .env file with your configuration before continuing"
            read -p "Press Enter when you're ready to continue..."
        else
            print_warning "No .env.example file found. You may need to create .env manually."
        fi
    fi
    
    # Install dependencies if package.json exists
    if [ -f package.json ]; then
        print_status "Installing Node.js dependencies..."
        npm install
    fi
    
    print_success "Environment setup completed"
}

# Function to start Docker services
start_docker_services() {
    print_status "Starting Docker services..."
    
    # Build and start services
    docker-compose up -d --build
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 10
    
    # Check service status
    print_status "Checking service status..."
    docker-compose ps
    
    print_success "Docker services started"
}

# Function to setup database
setup_database() {
    print_status "Setting up database..."
    
    # Wait for PostgreSQL to be ready
    print_status "Waiting for PostgreSQL to be ready..."
    until docker-compose exec -T postgres pg_isready -U modmaster_user -d modmaster_pro; do
        sleep 2
    done
    
    # Run database setup if Make is available
    if command -v make &> /dev/null; then
        print_status "Running database migrations..."
        make db-migrate
        
        print_status "Seeding database..."
        make db-seed
    else
        print_warning "Make not available. Please run database setup manually:"
        echo "  cd backend/api && npm run db:migrate"
        echo "  cd backend/api && npm run db:seed"
    fi
    
    print_success "Database setup completed"
}

# Function to start development servers
start_dev_servers() {
    print_status "Starting development servers..."
    
    if command -v make &> /dev/null; then
        # Start all development servers in background
        print_status "Starting all development servers..."
        make dev &
        DEV_PID=$!
        
        print_success "Development servers started in background (PID: $DEV_PID)"
        echo ""
        echo "To stop the development servers, run: kill $DEV_PID"
        echo ""
    else
        print_warning "Make not available. Please start development servers manually:"
        echo "  # Terminal 1: Backend API"
        echo "  cd backend/api && npm run dev"
        echo ""
        echo "  # Terminal 2: Frontend"
        echo "  cd frontend && npm start"
        echo ""
        echo "  # Terminal 3: Scraping Service"
        echo "  cd web-scraping && npm run dev"
    fi
}

# Function to show service URLs
show_service_urls() {
    echo ""
    print_success "🎉 Development environment is ready!"
    echo ""
    echo "🌐 Service URLs:"
    echo "  Backend API:     http://localhost:3000"
    echo "  API Docs:        http://localhost:3000/api-docs"
    echo "  Health Check:    http://localhost:3000/health"
    echo "  Frontend App:    http://localhost:19000"
    echo "  AI Service:      http://localhost:8000"
    echo "  Scraping:        http://localhost:8001"
    echo "  n8n Workflows:   http://localhost:5678"
    echo "  Grafana:         http://localhost:3001"
    echo "  MinIO Console:   http://localhost:9001"
    echo ""
    echo "🔧 Useful Commands:"
    echo "  View logs:       make docker-logs"
    echo "  Stop services:   make docker-down"
    echo "  Restart:         make docker-restart"
    echo "  Health check:    make health-check"
    echo ""
    echo "📚 Documentation:"
    echo "  Development:     docs/development.md"
    echo "  Contributing:    CONTRIBUTING.md"
    echo "  Project Structure: project-structure.md"
    echo ""
}

# Function to cleanup on exit
cleanup() {
    if [ ! -z "$DEV_PID" ]; then
        print_status "Stopping development servers..."
        kill $DEV_PID 2>/dev/null || true
    fi
}

# Set trap for cleanup
trap cleanup EXIT

# Main execution
main() {
    print_header
    
    # Check prerequisites
    check_prerequisites
    
    # Setup environment
    setup_environment
    
    # Start Docker services
    start_docker_services
    
    # Setup database
    setup_database
    
    # Start development servers
    start_dev_servers
    
    # Show service URLs
    show_service_urls
    
    # Keep script running if servers are in background
    if [ ! -z "$DEV_PID" ]; then
        print_status "Development environment is running. Press Ctrl+C to stop."
        wait $DEV_PID
    fi
}

# Run main function
main "$@"