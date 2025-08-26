# Contributing to ModMaster Pro

Thank you for your interest in contributing to ModMaster Pro! This document provides guidelines and information for contributors.

## 🚀 Quick Start

1. **Fork** the repository
2. **Clone** your fork locally
3. **Setup** the development environment
4. **Create** a feature branch
5. **Make** your changes
6. **Test** your changes
7. **Submit** a pull request

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)
- [Architecture Decisions](#architecture-decisions)
- [Troubleshooting](#troubleshooting)

## 🛠️ Getting Started

### Prerequisites

- **Node.js** 18.0.0 or higher
- **Python** 3.9 or higher
- **Docker** and Docker Compose
- **Git** 2.30 or higher
- **Make** (for build commands)

### Initial Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/modmaster-pro.git
cd modmaster-pro

# Add upstream remote
git remote add upstream https://github.com/original-org/modmaster-pro.git

# Install dependencies
make setup

# Start development environment
make quick-start
```

## 🏗️ Development Setup

### Backend Services

The backend consists of multiple microservices:

- **API Service** (Node.js/Express) - Main REST API
- **AI Service** (Python/FastAPI) - AI/ML inference
- **Scraping Service** (Python) - Web scraping orchestration
- **Worker Service** (Node.js) - Background job processing

```bash
# Setup backend services
make setup-backend

# Start backend development
make dev-backend

# Run backend tests
make test-backend
```

### Frontend Application

The frontend is built with React Native for cross-platform mobile support:

```bash
# Setup frontend
make setup-frontend

# Start frontend development
make dev-frontend

# Run frontend tests
make test-frontend
```

### AI/ML Services

AI/ML services handle computer vision, recommendations, and predictions:

```bash
# Setup AI/ML services
make setup-ai

# Train models
make ai-train

# Start inference service
make ai-serve
```

### Web Scraping Infrastructure

Web scraping uses n8n workflows and Python scrapers:

```bash
# Setup scraping services
make setup-scraping

# Start scraping services
make scraping-start

# Monitor scraping operations
make scraping-monitor
```

## 📝 Code Standards

### General Principles

- **Readability** over cleverness
- **Consistency** across the codebase
- **Documentation** for complex logic
- **Error handling** for all external calls
- **Security** by design

### JavaScript/TypeScript

- Use **ESLint** and **Prettier** for code formatting
- Follow **Airbnb JavaScript Style Guide**
- Use **TypeScript** for type safety
- Prefer **async/await** over Promises
- Use **destructuring** and **spread operators**

```typescript
// Good
interface User {
  id: string;
  email: string;
  preferences: UserPreferences;
}

const createUser = async (userData: Partial<User>): Promise<User> => {
  try {
    const user = await userService.create(userData);
    return user;
  } catch (error) {
    logger.error('Failed to create user', { error, userData });
    throw new UserCreationError('Unable to create user');
  }
};

// Bad
function createUser(userData) {
  return userService.create(userData).then(function(user) {
    return user;
  }).catch(function(error) {
    console.log(error);
    throw error;
  });
}
```

### Python

- Use **Black** for code formatting
- Follow **PEP 8** style guidelines
- Use **type hints** for function parameters
- Implement **proper error handling**
- Use **async/await** for I/O operations

```python
# Good
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

class UserPreferences(BaseModel):
    theme: str = "dark"
    notifications: bool = True
    language: str = "en"

async def create_user(
    email: str,
    preferences: Optional[UserPreferences] = None
) -> Dict[str, Any]:
    """Create a new user with optional preferences."""
    try:
        user_data = {
            "email": email,
            "preferences": preferences or UserPreferences()
        }
        user = await user_service.create(user_data)
        logger.info(f"Created user: {user['id']}")
        return user
    except Exception as e:
        logger.error(f"Failed to create user: {e}")
        raise UserCreationError("Unable to create user") from e

# Bad
def create_user(email, preferences=None):
    user_data = {"email": email}
    if preferences:
        user_data["preferences"] = preferences
    user = user_service.create(user_data)
    print("Created user")
    return user
```

### Database

- Use **migrations** for schema changes
- Follow **naming conventions** for tables and columns
- Implement **proper indexing** for performance
- Use **transactions** for data consistency
- **Validate** data at the application level

### API Design

- Follow **RESTful** principles
- Use **consistent naming** conventions
- Implement **proper HTTP status codes**
- Provide **meaningful error messages**
- Use **versioning** for API changes

```typescript
// Good API endpoint
router.post('/api/v1/users', 
  validateUserInput,
  async (req: Request, res: Response) => {
    try {
      const user = await userService.create(req.body);
      res.status(201).json({
        success: true,
        data: user,
        message: 'User created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'USER_CREATION_FAILED'
      });
    }
  }
);
```

## 🧪 Testing Guidelines

### Test Structure

- **Unit tests** for individual functions/components
- **Integration tests** for service interactions
- **End-to-end tests** for complete user flows
- **Performance tests** for critical paths

### Testing Standards

- **Coverage target**: 90%+ for new code
- **Test naming**: Descriptive test names
- **Test isolation**: Each test should be independent
- **Mocking**: Mock external dependencies
- **Assertions**: Clear and specific assertions

```typescript
// Good test example
describe('UserService.createUser', () => {
  it('should create a user with valid data', async () => {
    const userData = {
      email: 'test@example.com',
      name: 'Test User'
    };
    
    const mockUser = { id: '123', ...userData };
    userRepository.create.mockResolvedValue(mockUser);
    
    const result = await userService.createUser(userData);
    
    expect(result).toEqual(mockUser);
    expect(userRepository.create).toHaveBeenCalledWith(userData);
  });

  it('should throw error for invalid email', async () => {
    const userData = {
      email: 'invalid-email',
      name: 'Test User'
    };
    
    await expect(userService.createUser(userData))
      .rejects
      .toThrow('Invalid email format');
  });
});
```

### Running Tests

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

## 📝 Commit Guidelines

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

### Examples

```bash
# Good commit messages
feat(auth): add JWT token refresh functionality
fix(api): resolve user creation validation error
docs(readme): update installation instructions
refactor(ai): optimize image processing pipeline
test(backend): add user service unit tests

# Bad commit messages
fixed bug
updated stuff
wip
```

### Commit Workflow

```bash
# Stage changes
git add .

# Create commit with proper message
git commit -m "feat(api): add user preferences endpoint"

# Push to your fork
git push origin feature/user-preferences
```

## 🔄 Pull Request Process

### Before Submitting

1. **Ensure tests pass** locally
2. **Update documentation** if needed
3. **Check code coverage** requirements
4. **Review your changes** for quality
5. **Test manually** if applicable

### PR Template

```markdown
## Description
Brief description of changes and why they're needed.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No breaking changes introduced

## Screenshots (if applicable)
Add screenshots for UI changes.

## Additional Notes
Any additional information or context.
```

### Review Process

1. **Automated checks** must pass
2. **Code review** by maintainers
3. **Address feedback** and make changes
4. **Maintainer approval** required
5. **Merge** after approval

## 🏛️ Project Structure

### Key Directories

```
modmaster-pro/
├── backend/           # Backend services
├── frontend/          # React Native app
├── ai-ml/            # AI/ML services
├── web-scraping/     # Scraping infrastructure
├── infrastructure/    # Infrastructure as code
├── docs/             # Documentation
├── tests/            # Test suites
└── scripts/          # Utility scripts
```

### Architecture Overview

- **Microservices architecture** for scalability
- **Event-driven communication** between services
- **API-first design** for flexibility
- **Containerized deployment** with Docker
- **Infrastructure as code** with Terraform

## 🎯 Architecture Decisions

### Technology Choices

- **Node.js/Express**: Backend API performance and ecosystem
- **Python/FastAPI**: AI/ML services and data processing
- **React Native**: Cross-platform mobile development
- **PostgreSQL**: Reliable relational database
- **Redis**: High-performance caching
- **n8n**: Workflow automation for scraping

### Design Patterns

- **Repository pattern** for data access
- **Service layer** for business logic
- **Middleware pattern** for cross-cutting concerns
- **Event sourcing** for audit trails
- **CQRS** for complex queries

## 🚨 Troubleshooting

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

# Run migrations
make db-migrate

# Check database status
docker-compose exec postgres psql -U modmaster_user -d modmaster_pro
```

#### Dependency Issues

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Update dependencies
npm update
```

### Getting Help

1. **Check existing issues** on GitHub
2. **Search documentation** for solutions
3. **Ask in discussions** for guidance
4. **Create detailed issue** if needed

## 📚 Additional Resources

- [Project Documentation](./docs/)
- [API Reference](./docs/api/)
- [Development Guide](./docs/development.md)
- [Deployment Guide](./docs/deployment.md)
- [Architecture Overview](./docs/architecture.md)

## 🤝 Community Guidelines

- **Be respectful** and inclusive
- **Help others** when possible
- **Provide constructive feedback**
- **Follow project conventions**
- **Ask questions** when unsure

## 📄 License

By contributing to ModMaster Pro, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

Thank you for contributing to ModMaster Pro! 🚗✨