#!/bin/bash

# =============================================================================
# ModMaster Pro Security Audit Script
# =============================================================================
# This script performs comprehensive security checks on the codebase

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    log_info "Checking dependencies..."
    
    local missing_tools=()
    
    # Check for npm
    if ! command -v npm &> /dev/null; then
        missing_tools+=("npm")
    fi
    
    # Check for pip
    if ! command -v pip &> /dev/null; then
        missing_tools+=("pip")
    fi
    
    # Check for bandit (Python security linter)
    if ! command -v bandit &> /dev/null; then
        missing_tools+=("bandit")
    fi
    
    # Check for safety (Python dependency checker)
    if ! command -v safety &> /dev/null; then
        missing_tools+=("safety")
    fi
    
    # Check for auditjs (Node.js dependency checker)
    if ! command -v auditjs &> /dev/null; then
        missing_tools+=("auditjs")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_warning "Missing tools: ${missing_tools[*]}"
        log_info "Installing missing tools..."
        
        for tool in "${missing_tools[@]}"; do
            case $tool in
                "bandit")
                    pip install bandit
                    ;;
                "safety")
                    pip install safety
                    ;;
                "auditjs")
                    npm install -g auditjs
                    ;;
            esac
        done
    else
        log_success "All required tools are installed"
    fi
}

# Check for hardcoded secrets and passwords
check_hardcoded_secrets() {
    log_info "Checking for hardcoded secrets and passwords..."
    
    local issues_found=false
    
    # Patterns to check for
    local patterns=(
        "password.*=.*['\"][^'\"]*['\"]"
        "secret.*=.*['\"][^'\"]*['\"]"
        "key.*=.*['\"][^'\"]*['\"]"
        "token.*=.*['\"][^'\"]*['\"]"
        "api_key.*=.*['\"][^'\"]*['\"]"
        "jwt_secret.*=.*['\"][^'\"]*['\"]"
        "modmaster_password"
        "modmaster123"
        "dev_jwt_secret"
        "your_super_secret"
    )
    
    for pattern in "${patterns[@]}"; do
        if grep -r --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=__pycache__ --exclude=*.log "$pattern" .; then
            log_error "Found potential hardcoded secret: $pattern"
            issues_found=true
        fi
    done
    
    if [ "$issues_found" = false ]; then
        log_success "No hardcoded secrets found"
    fi
}

# Check for SQL injection vulnerabilities
check_sql_injection() {
    log_info "Checking for SQL injection vulnerabilities..."
    
    local issues_found=false
    
    # Patterns that might indicate SQL injection
    local patterns=(
        "query.*\+.*req\."
        "query.*\+.*params\."
        "query.*\+.*body\."
        "SELECT.*\+"
        "INSERT.*\+"
        "UPDATE.*\+"
        "DELETE.*\+"
        "WHERE.*\+"
    )
    
    for pattern in "${patterns[@]}"; do
        if grep -r --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=__pycache__ --exclude=*.log "$pattern" .; then
            log_error "Found potential SQL injection: $pattern"
            issues_found=true
        fi
    done
    
    if [ "$issues_found" = false ]; then
        log_success "No obvious SQL injection vulnerabilities found"
    fi
}

# Check for XSS vulnerabilities
check_xss_vulnerabilities() {
    log_info "Checking for XSS vulnerabilities..."
    
    local issues_found=false
    
    # Patterns that might indicate XSS
    local patterns=(
        "innerHTML.*\+"
        "document\.write.*\+"
        "eval\("
        "innerHTML\s*="
        "outerHTML\s*="
    )
    
    for pattern in "${patterns[@]}"; do
        if grep -r --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=__pycache__ --exclude=*.log "$pattern" .; then
            log_error "Found potential XSS vulnerability: $pattern"
            issues_found=true
        fi
    done
    
    if [ "$issues_found" = false ]; then
        log_success "No obvious XSS vulnerabilities found"
    fi
}

# Check for missing security headers
check_security_headers() {
    log_info "Checking for security headers..."
    
    local issues_found=false
    
    # Check if Helmet is used
    if ! grep -r "helmet" backend/ --exclude-dir=node_modules; then
        log_warning "Helmet security middleware not found in backend"
        issues_found=true
    fi
    
    # Check if CORS is configured
    if ! grep -r "cors" backend/ --exclude-dir=node_modules; then
        log_warning "CORS configuration not found in backend"
        issues_found=true
    fi
    
    if [ "$issues_found" = false ]; then
        log_success "Security headers appear to be configured"
    fi
}

# Check for outdated dependencies
check_dependencies_security() {
    log_info "Checking for security vulnerabilities in dependencies..."
    
    # Check Node.js dependencies
    if [ -f "backend/api/package.json" ]; then
        log_info "Checking Node.js dependencies..."
        cd backend/api
        if npm audit --audit-level=moderate; then
            log_success "No critical Node.js vulnerabilities found"
        else
            log_error "Node.js vulnerabilities found - run 'npm audit fix'"
        fi
        cd ../..
    fi
    
    # Check Python dependencies
    if [ -f "requirements.txt" ]; then
        log_info "Checking Python dependencies..."
        if safety check -r requirements.txt; then
            log_success "No critical Python vulnerabilities found"
        else
            log_error "Python vulnerabilities found - update requirements.txt"
        fi
    fi
    
    if [ -f "ai-service/requirements.txt" ]; then
        log_info "Checking AI service Python dependencies..."
        if safety check -r ai-service/requirements.txt; then
            log_success "No critical AI service vulnerabilities found"
        else
            log_error "AI service vulnerabilities found - update requirements.txt"
        fi
    fi
}

# Check for proper authentication
check_authentication() {
    log_info "Checking authentication implementation..."
    
    local issues_found=false
    
    # Check if JWT is used
    if ! grep -r "jsonwebtoken\|jwt" backend/ --exclude-dir=node_modules; then
        log_warning "JWT authentication not found"
        issues_found=true
    fi
    
    # Check if bcrypt is used for password hashing
    if ! grep -r "bcrypt" backend/ --exclude-dir=node_modules; then
        log_warning "bcrypt password hashing not found"
        issues_found=true
    fi
    
    # Check if password validation exists
    if ! grep -r "password.*validation\|password.*requirements" backend/ --exclude-dir=node_modules; then
        log_warning "Password validation not found"
        issues_found=true
    fi
    
    if [ "$issues_found" = false ]; then
        log_success "Authentication appears to be properly implemented"
    fi
}

# Check for proper input validation
check_input_validation() {
    log_info "Checking input validation..."
    
    local issues_found=false
    
    # Check if validation middleware exists
    if ! grep -r "validation\|joi\|express-validator" backend/ --exclude-dir=node_modules; then
        log_warning "Input validation middleware not found"
        issues_found=true
    fi
    
    # Check if file upload validation exists
    if ! grep -r "multer\|file.*validation" backend/ --exclude-dir=node_modules; then
        log_warning "File upload validation not found"
        issues_found=true
    fi
    
    if [ "$issues_found" = false ]; then
        log_success "Input validation appears to be implemented"
    fi
}

# Check for proper error handling
check_error_handling() {
    log_info "Checking error handling..."
    
    local issues_found=false
    
    # Check if error handling middleware exists
    if ! grep -r "error.*handler\|errorHandler" backend/ --exclude-dir=node_modules; then
        log_warning "Error handling middleware not found"
        issues_found=true
    fi
    
    # Check if try-catch blocks are used
    if ! grep -r "try.*catch\|async.*await" backend/ --exclude-dir=node_modules; then
        log_warning "Async error handling not found"
        issues_found=true
    fi
    
    if [ "$issues_found" = false ]; then
        log_success "Error handling appears to be implemented"
    fi
}

# Check for proper logging
check_logging() {
    log_info "Checking logging implementation..."
    
    local issues_found=false
    
    # Check if logging is configured
    if ! grep -r "winston\|morgan\|logger" backend/ --exclude-dir=node_modules; then
        log_warning "Logging not configured"
        issues_found=true
    fi
    
    # Check if sensitive data is being logged
    if grep -r "password.*log\|secret.*log\|token.*log" backend/ --exclude-dir=node_modules; then
        log_error "Sensitive data might be logged"
        issues_found=true
    fi
    
    if [ "$issues_found" = false ]; then
        log_success "Logging appears to be properly configured"
    fi
}

# Check for environment variable usage
check_environment_variables() {
    log_info "Checking environment variable usage..."
    
    local issues_found=false
    
    # Check if .env files are in .gitignore
    if ! grep -q "\.env" .gitignore; then
        log_error ".env files not in .gitignore"
        issues_found=true
    fi
    
    # Check if sensitive config uses environment variables
    if grep -r "password.*=.*['\"][^'\"]*['\"]" backend/api/src/config/ --exclude-dir=node_modules; then
        log_error "Hardcoded passwords in config files"
        issues_found=true
    fi
    
    if [ "$issues_found" = false ]; then
        log_success "Environment variables appear to be properly used"
    fi
}

# Run Python security checks
run_python_security_checks() {
    log_info "Running Python security checks..."
    
    # Run bandit on Python files
    if command -v bandit &> /dev/null; then
        log_info "Running bandit security linter..."
        if find . -name "*.py" -not -path "./node_modules/*" -not -path "./.git/*" | xargs bandit -r -f json -o bandit-report.json; then
            log_success "Bandit security check completed"
        else
            log_error "Bandit found security issues"
        fi
    fi
}

# Generate security report
generate_report() {
    log_info "Generating security report..."
    
    local report_file="security-audit-report-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "ModMaster Pro Security Audit Report"
        echo "Generated: $(date)"
        echo "=================================="
        echo ""
        echo "Summary:"
        echo "- Hardcoded secrets: $(grep -c "hardcoded secret" /tmp/security-audit.log 2>/dev/null || echo "0")"
        echo "- SQL injection vulnerabilities: $(grep -c "SQL injection" /tmp/security-audit.log 2>/dev/null || echo "0")"
        echo "- XSS vulnerabilities: $(grep -c "XSS" /tmp/security-audit.log 2>/dev/null || echo "0")"
        echo ""
        echo "Recommendations:"
        echo "1. Use environment variables for all secrets"
        echo "2. Implement proper input validation"
        echo "3. Use parameterized queries"
        echo "4. Enable security headers"
        echo "5. Regular dependency updates"
        echo "6. Implement proper error handling"
        echo "7. Use secure authentication"
        echo "8. Enable comprehensive logging"
    } > "$report_file"
    
    log_success "Security report generated: $report_file"
}

# Main function
main() {
    log_info "Starting ModMaster Pro Security Audit..."
    
    # Create temporary log file
    exec 2> >(tee /tmp/security-audit.log)
    
    check_dependencies
    check_hardcoded_secrets
    check_sql_injection
    check_xss_vulnerabilities
    check_security_headers
    check_dependencies_security
    check_authentication
    check_input_validation
    check_error_handling
    check_logging
    check_environment_variables
    run_python_security_checks
    
    log_info "Security audit completed"
    generate_report
    
    log_info "Check /tmp/security-audit.log for detailed results"
}

# Run main function
main "$@"