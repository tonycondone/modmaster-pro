# =============================================================================
# ModMaster Pro - Makefile
# =============================================================================
# This Makefile provides commands for building, testing, and deploying
# the ModMaster Pro application
# =============================================================================

# Variables
PROJECT_NAME := modmaster-pro
VERSION := 1.0.0
DOCKER_COMPOSE := docker-compose
DOCKER := docker
NODE := node
NPM := npm
PYTHON := python3
PIP := pip3

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
PURPLE := \033[0;35m
CYAN := \033[0;36m
WHITE := \033[0;37m
RESET := \033[0m

# Default target
.DEFAULT_GOAL := help

# =============================================================================
# HELP
# =============================================================================
.PHONY: help
help: ## Show this help message
	@echo "$(CYAN)ModMaster Pro - Available Commands$(RESET)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-30s$(RESET) %s\n", $$1, $$2}'
	@echo ""

# =============================================================================
# SETUP & INSTALLATION
# =============================================================================
.PHONY: setup
setup: ## Install all dependencies and setup the project
	@echo "$(BLUE)Setting up ModMaster Pro...$(RESET)"
	@$(NPM) install
	@$(NPM) run setup
	@echo "$(GREEN)Setup complete!$(RESET)"

.PHONY: setup-backend
setup-backend: ## Setup backend services
	@echo "$(BLUE)Setting up backend services...$(RESET)"
	@cd backend/api && $(NPM) install
	@cd backend/worker-service && $(NPM) install
	@echo "$(GREEN)Backend setup complete!$(RESET)"

.PHONY: setup-frontend
setup-frontend: ## Setup frontend application
	@echo "$(BLUE)Setting up frontend application...$(RESET)"
	@cd frontend && $(NPM) install
	@echo "$(GREEN)Frontend setup complete!$(RESET)"

.PHONY: setup-scraping
setup-scraping: ## Setup web scraping services
	@echo "$(BLUE)Setting up web scraping services...$(RESET)"
	@cd web-scraping && $(NPM) install
	@echo "$(GREEN)Web scraping setup complete!$(RESET)"

.PHONY: setup-ai
setup-ai: ## Setup AI/ML services
	@echo "$(BLUE)Setting up AI/ML services...$(RESET)"
	@$(PIP) install -r requirements.txt
	@echo "$(GREEN)AI/ML setup complete!$(RESET)"

# =============================================================================
# DEVELOPMENT
# =============================================================================
.PHONY: dev
dev: ## Start all services in development mode
	@echo "$(BLUE)Starting development environment...$(RESET)"
	@$(NPM) run dev

.PHONY: dev-backend
dev-backend: ## Start backend services in development mode
	@echo "$(BLUE)Starting backend services...$(RESET)"
	@$(NPM) run dev:backend

.PHONY: dev-frontend
dev-frontend: ## Start frontend in development mode
	@echo "$(BLUE)Starting frontend...$(RESET)"
	@$(NPM) run dev:frontend

.PHONY: dev-scraping
dev-scraping: ## Start web scraping services in development mode
	@echo "$(BLUE)Starting web scraping services...$(RESET)"
	@$(NPM) run dev:scraping

# =============================================================================
# DOCKER OPERATIONS
# =============================================================================
.PHONY: docker-build
docker-build: ## Build all Docker containers
	@echo "$(BLUE)Building Docker containers...$(RESET)"
	@$(DOCKER_COMPOSE) build

.PHONY: docker-up
docker-up: ## Start all Docker services
	@echo "$(BLUE)Starting Docker services...$(RESET)"
	@$(DOCKER_COMPOSE) up -d

.PHONY: docker-down
docker-down: ## Stop all Docker services
	@echo "$(BLUE)Stopping Docker services...$(RESET)"
	@$(DOCKER_COMPOSE) down

.PHONY: docker-logs
docker-logs: ## Show Docker service logs
	@$(DOCKER_COMPOSE) logs -f

.PHONY: docker-clean
docker-clean: ## Clean up Docker containers and volumes
	@echo "$(YELLOW)Cleaning up Docker containers and volumes...$(RESET)"
	@$(DOCKER_COMPOSE) down -v --remove-orphans
	@$(DOCKER) system prune -f

.PHONY: docker-restart
docker-restart: ## Restart all Docker services
	@echo "$(BLUE)Restarting Docker services...$(RESET)"
	@$(MAKE) docker-down
	@$(MAKE) docker-up

# =============================================================================
# DATABASE OPERATIONS
# =============================================================================
.PHONY: db-migrate
db-migrate: ## Run database migrations
	@echo "$(BLUE)Running database migrations...$(RESET)"
	@$(NPM) run db:migrate

.PHONY: db-seed
db-seed: ## Seed database with initial data
	@echo "$(BLUE)Seeding database...$(RESET)"
	@$(NPM) run db:seed

.PHONY: db-reset
db-reset: ## Reset database (WARNING: This will delete all data)
	@echo "$(RED)WARNING: This will delete all database data!$(RESET)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "$(BLUE)Resetting database...$(RESET)"; \
		$(NPM) run db:reset; \
	else \
		echo "$(YELLOW)Database reset cancelled.$(RESET)"; \
	fi

.PHONY: db-backup
db-backup: ## Create database backup
	@echo "$(BLUE)Creating database backup...$(RESET)"
	@mkdir -p backups
	@$(DOCKER_COMPOSE) exec postgres pg_dump -U modmaster_user modmaster_pro > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)Backup created successfully!$(RESET)"

# =============================================================================
# TESTING
# =============================================================================
.PHONY: test
test: ## Run all tests
	@echo "$(BLUE)Running all tests...$(RESET)"
	@$(NPM) test

.PHONY: test-backend
test-backend: ## Run backend tests
	@echo "$(BLUE)Running backend tests...$(RESET)"
	@$(NPM) run test:backend

.PHONY: test-frontend
test-frontend: ## Run frontend tests
	@echo "$(BLUE)Running frontend tests...$(RESET)"
	@$(NPM) run test:frontend

.PHONY: test-e2e
test-e2e: ## Run end-to-end tests
	@echo "$(BLUE)Running end-to-end tests...$(RESET)"
	@$(NPM) run test:e2e

.PHONY: test-coverage
test-coverage: ## Run tests with coverage
	@echo "$(BLUE)Running tests with coverage...$(RESET)"
	@$(NPM) run test:coverage

# =============================================================================
# CODE QUALITY
# =============================================================================
.PHONY: lint
lint: ## Run linting on all code
	@echo "$(BLUE)Running linting...$(RESET)"
	@$(NPM) run lint

.PHONY: lint-fix
lint-fix: ## Fix linting issues automatically
	@echo "$(BLUE)Fixing linting issues...$(RESET)"
	@$(NPM) run lint:fix

.PHONY: format
format: ## Format code with Prettier
	@echo "$(BLUE)Formatting code...$(RESET)"
	@$(NPM) run format

.PHONY: type-check
type-check: ## Run TypeScript type checking
	@echo "$(BLUE)Running TypeScript type checking...$(RESET)"
	@$(NPM) run type-check

# =============================================================================
# BUILDING
# =============================================================================
.PHONY: build
build: ## Build all applications
	@echo "$(BLUE)Building applications...$(RESET)"
	@$(NPM) run build

.PHONY: build-backend
build-backend: ## Build backend services
	@echo "$(BLUE)Building backend services...$(RESET)"
	@$(NPM) run build:backend

.PHONY: build-frontend
build-frontend: ## Build frontend application
	@echo "$(BLUE)Building frontend application...$(RESET)"
	@$(NPM) run build:frontend

# =============================================================================
# AI/ML OPERATIONS
# =============================================================================
.PHONY: ai-train
ai-train: ## Train AI/ML models
	@echo "$(BLUE)Training AI/ML models...$(RESET)"
	@$(NPM) run ai:train

.PHONY: ai-serve
ai-serve: ## Start AI/ML inference service
	@echo "$(BLUE)Starting AI/ML inference service...$(RESET)"
	@$(NPM) run ai:serve

.PHONY: ai-evaluate
ai-evaluate: ## Evaluate AI/ML model performance
	@echo "$(BLUE)Evaluating AI/ML models...$(RESET)"
	@cd ai-ml && $(PYTHON) -m training.evaluate

# =============================================================================
# WEB SCRAPING OPERATIONS
# =============================================================================
.PHONY: scraping-start
scraping-start: ## Start web scraping services
	@echo "$(BLUE)Starting web scraping services...$(RESET)"
	@$(NPM) run scraping:start

.PHONY: scraping-monitor
scraping-monitor: ## Monitor web scraping operations
	@echo "$(BLUE)Monitoring web scraping...$(RESET)"
	@$(NPM) run scraping:monitor

.PHONY: scraping-test
scraping-test: ## Test web scraping functionality
	@echo "$(BLUE)Testing web scraping...$(RESET)"
	@cd web-scraping && $(PYTHON) -m pytest tests/ -v

# =============================================================================
# DEPLOYMENT
# =============================================================================
.PHONY: deploy-staging
deploy-staging: ## Deploy to staging environment
	@echo "$(BLUE)Deploying to staging...$(RESET)"
	@$(NPM) run deploy:staging

.PHONY: deploy-production
deploy-production: ## Deploy to production environment
	@echo "$(RED)WARNING: Deploying to production!$(RESET)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "$(BLUE)Deploying to production...$(RESET)"; \
		$(NPM) run deploy:production; \
	else \
		echo "$(YELLOW)Production deployment cancelled.$(RESET)"; \
	fi

.PHONY: deploy-infra
deploy-infra: ## Deploy infrastructure
	@echo "$(BLUE)Deploying infrastructure...$(RESET)"
	@cd infrastructure && $(NPM) run deploy:$(ENVIRONMENT)

# =============================================================================
# MONITORING & MAINTENANCE
# =============================================================================
.PHONY: logs
logs: ## Show application logs
	@echo "$(BLUE)Showing application logs...$(RESET)"
	@$(NPM) run logs

.PHONY: health-check
health-check: ## Check service health
	@echo "$(BLUE)Checking service health...$(RESET)"
	@curl -f http://localhost:3000/health || echo "$(RED)Backend API is down$(RESET)"
	@curl -f http://localhost:8000/health || echo "$(RED)AI Service is down$(RESET)"
	@curl -f http://localhost:8001/health || echo "$(RED)Scraping Service is down$(RESET)"

.PHONY: clean
clean: ## Clean build artifacts and temporary files
	@echo "$(BLUE)Cleaning build artifacts...$(RESET)"
	@rm -rf build/ dist/ out/ node_modules/ .nyc_output/ coverage/
	@find . -name "*.pyc" -delete
	@find . -name "__pycache__" -delete
	@find . -name "*.log" -delete
	@echo "$(GREEN)Cleanup complete!$(RESET)"

.PHONY: reset
reset: ## Reset the entire project (WARNING: This will delete all data)
	@echo "$(RED)WARNING: This will reset the entire project and delete all data!$(RESET)"
	@read -p "Are you absolutely sure? [y/N] " -n 1 -r; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "$(BLUE)Resetting project...$(RESET)"; \
		$(MAKE) docker-clean; \
		$(MAKE) clean; \
		$(MAKE) setup; \
		echo "$(GREEN)Project reset complete!$(RESET)"; \
	else \
		echo "$(YELLOW)Project reset cancelled.$(RESET)"; \
	fi

# =============================================================================
# UTILITY COMMANDS
# =============================================================================
.PHONY: status
status: ## Show project status
	@echo "$(CYAN)ModMaster Pro - Project Status$(RESET)"
	@echo "$(BLUE)Version:$(RESET) $(VERSION)"
	@echo "$(BLUE)Environment:$(RESET) $(ENVIRONMENT)"
	@echo ""
	@echo "$(BLUE)Docker Services:$(RESET)"
	@$(DOCKER_COMPOSE) ps
	@echo ""
	@echo "$(BLUE)Service URLs:$(RESET)"
	@echo "  Backend API: http://localhost:3000"
	@echo "  AI Service:  http://localhost:8000"
	@echo "  Scraping:    http://localhost:8001"
	@echo "  Frontend:    http://localhost:19000"
	@echo "  n8n:         http://localhost:5678"
	@echo "  Grafana:     http://localhost:3001"
	@echo "  MinIO:       http://localhost:9000"

.PHONY: version
version: ## Show project version
	@echo "$(VERSION)"

.PHONY: info
info: ## Show project information
	@echo "$(CYAN)ModMaster Pro$(RESET)"
	@echo "$(BLUE)Description:$(RESET) Full-stack car modification platform with AI-powered engine scanning"
	@echo "$(BLUE)Version:$(RESET) $(VERSION)"
	@echo "$(BLUE)Author:$(RESET) ModMaster Pro Team"
	@echo "$(BLUE)License:$(RESET) MIT"
	@echo "$(BLUE)Repository:$(RESET) https://github.com/your-org/modmaster-pro"

# =============================================================================
# DEVELOPMENT WORKFLOW
# =============================================================================
.PHONY: dev-workflow
dev-workflow: ## Complete development workflow (setup, build, test, dev)
	@echo "$(BLUE)Starting complete development workflow...$(RESET)"
	@$(MAKE) setup
	@$(MAKE) build
	@$(MAKE) test
	@$(MAKE) dev

.PHONY: quick-start
quick-start: ## Quick start for development
	@echo "$(BLUE)Quick starting development environment...$(RESET)"
	@$(MAKE) docker-up
	@$(MAKE) setup
	@$(MAKE) dev

# =============================================================================
# DOCUMENTATION
# =============================================================================
.PHONY: docs
docs: ## Generate documentation
	@echo "$(BLUE)Generating documentation...$(RESET)"
	@cd docs && $(NPM) run build

.PHONY: docs-serve
docs-serve: ## Serve documentation locally
	@echo "$(BLUE)Serving documentation...$(RESET)"
	@cd docs && $(NPM) run serve

# =============================================================================
# SECURITY
# =============================================================================
.PHONY: security-audit
security-audit: ## Run security audit
	@echo "$(BLUE)Running security audit...$(RESET)"
	@$(NPM) audit
	@$(NPM) audit fix

.PHONY: secrets-check
secrets-check: ## Check for exposed secrets in code
	@echo "$(BLUE)Checking for exposed secrets...$(RESET)"
	@git secrets --scan

# =============================================================================
# BACKUP & RECOVERY
# =============================================================================
.PHONY: backup
backup: ## Create full system backup
	@echo "$(BLUE)Creating system backup...$(RESET)"
	@mkdir -p backups
	@$(MAKE) db-backup
	@tar -czf backups/system_backup_$$(date +%Y%m%d_%H%M%S).tar.gz \
		--exclude=node_modules \
		--exclude=.git \
		--exclude=backups \
		.
	@echo "$(GREEN)System backup created successfully!$(RESET)"

.PHONY: restore
restore: ## Restore from backup (specify BACKUP_FILE=filename)
	@if [ -z "$(BACKUP_FILE)" ]; then \
		echo "$(RED)Error: Please specify BACKUP_FILE=filename$(RESET)"; \
		exit 1; \
	fi; \
	echo "$(BLUE)Restoring from backup: $(BACKUP_FILE)$(RESET)"; \
	tar -xzf backups/$(BACKUP_FILE) --strip-components=1; \
	echo "$(GREEN)Restore complete!$(RESET)"

# =============================================================================
# PERFORMANCE & OPTIMIZATION
# =============================================================================
.PHONY: performance-test
performance-test: ## Run performance tests
	@echo "$(BLUE)Running performance tests...$(RESET)"
	@$(NPM) run test:performance

.PHONY: benchmark
benchmark: ## Run benchmarks
	@echo "$(BLUE)Running benchmarks...$(RESET)"
	@$(NPM) run benchmark

.PHONY: optimize
optimize: ## Optimize application performance
	@echo "$(BLUE)Optimizing application...$(RESET)"
	@$(NPM) run optimize

# =============================================================================
# TROUBLESHOOTING
# =============================================================================
.PHONY: troubleshoot
troubleshoot: ## Run troubleshooting diagnostics
	@echo "$(BLUE)Running troubleshooting diagnostics...$(RESET)"
	@$(MAKE) health-check
	@$(MAKE) status
	@echo "$(BLUE)Checking for common issues...$(RESET)"
	@$(NPM) run troubleshoot

.PHONY: fix-common-issues
fix-common-issues: ## Fix common development issues
	@echo "$(BLUE)Fixing common issues...$(RESET)"
	@$(NPM) run fix-common-issues

# =============================================================================
# CLEANUP
# =============================================================================
.PHONY: cleanup
cleanup: ## Clean up temporary files and caches
	@echo "$(BLUE)Cleaning up temporary files...$(RESET)"
	@find . -name "*.tmp" -delete
	@find . -name "*.cache" -delete
	@find . -name ".DS_Store" -delete
	@$(NPM) cache clean --force
	@echo "$(GREEN)Cleanup complete!$(RESET)"

# =============================================================================
# FINAL TARGETS
# =============================================================================
.PHONY: all
all: ## Build and test everything
	@$(MAKE) setup
	@$(MAKE) build
	@$(MAKE) test
	@$(MAKE) lint

.PHONY: production-ready
production-ready: ## Prepare for production deployment
	@echo "$(BLUE)Preparing for production...$(RESET)"
	@$(MAKE) clean
	@$(MAKE) setup
	@$(MAKE) build
	@$(MAKE) test
	@$(MAKE) security-audit
	@$(MAKE) performance-test
	@echo "$(GREEN)Production ready!$(RESET)"