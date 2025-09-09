# ModMaster Pro - Start All Services
Write-Host "🚀 Starting ModMaster Pro - Complete Vehicle Parts Identification System" -ForegroundColor Green

# Check if .env files exist
$envFiles = @(
    "backend/api/.env",
    "ai-service/.env", 
    "mobile-app/.env"
)

foreach ($envFile in $envFiles) {
    if (-not (Test-Path $envFile)) {
        Write-Host "⚠️  Environment file missing: $envFile" -ForegroundColor Yellow
        Write-Host "Creating from example..." -ForegroundColor Yellow
        Copy-Item "$envFile.example" $envFile
    }
}

Write-Host "`n📋 Prerequisites Check:" -ForegroundColor Cyan
Write-Host "- Node.js 18+: " -NoNewline
if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "✅ $(node --version)" -ForegroundColor Green
} else {
    Write-Host "❌ Not installed" -ForegroundColor Red
    exit 1
}

Write-Host "- Python 3.11+: " -NoNewline
if (Get-Command python -ErrorAction SilentlyContinue) {
    Write-Host "✅ $(python --version)" -ForegroundColor Green
} else {
    Write-Host "❌ Not installed" -ForegroundColor Red
    exit 1
}

Write-Host "- PostgreSQL: " -NoNewline
if (Get-Command psql -ErrorAction SilentlyContinue) {
    Write-Host "✅ Available" -ForegroundColor Green
} else {
    Write-Host "⚠️  Not in PATH (may still be installed)" -ForegroundColor Yellow
}

Write-Host "- Redis: " -NoNewline
if (Get-Command redis-cli -ErrorAction SilentlyContinue) {
    Write-Host "✅ Available" -ForegroundColor Green
} else {
    Write-Host "⚠️  Not in PATH (may still be installed)" -ForegroundColor Yellow
}

Write-Host "`n🔧 Installing Dependencies..." -ForegroundColor Cyan

# Install Backend Dependencies
Write-Host "Installing Backend dependencies..." -ForegroundColor Yellow
Set-Location "backend/api"
if (Test-Path "package.json") {
    npm install --legacy-peer-deps
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Backend dependency installation failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Backend package.json not found" -ForegroundColor Red
    exit 1
}

Set-Location "../.."

# Install Mobile App Dependencies  
Write-Host "Installing Mobile App dependencies..." -ForegroundColor Yellow
Set-Location "mobile-app"
if (Test-Path "package.json") {
    npm install --legacy-peer-deps
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Mobile app dependency installation failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Mobile App dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Mobile app package.json not found" -ForegroundColor Red
    exit 1
}

Set-Location ".."

# Install AI Service Dependencies
Write-Host "Installing AI Service dependencies..." -ForegroundColor Yellow
Set-Location "ai-service"
if (Test-Path "requirements.txt") {
    python -m venv venv
    if (Test-Path "venv/Scripts/activate.ps1") {
        & "./venv/Scripts/activate.ps1"
        pip install -r requirements.txt
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ AI Service dependency installation failed" -ForegroundColor Red
            exit 1
        }
        Write-Host "✅ AI Service dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "❌ Virtual environment creation failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ AI Service requirements.txt not found" -ForegroundColor Red
    exit 1
}

Set-Location ".."

Write-Host "`n🚀 Starting Services..." -ForegroundColor Cyan
Write-Host "This will open multiple terminal windows for each service." -ForegroundColor Yellow
Write-Host "Keep all windows open for the system to work properly." -ForegroundColor Yellow

# Start Backend API
Write-Host "Starting Backend API (Port 3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$(Get-Location)\backend\api'; npm run dev"

# Wait a moment
Start-Sleep -Seconds 2

# Start AI Service  
Write-Host "Starting AI Service (Port 8001)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$(Get-Location)\ai-service'; .\venv\Scripts\activate.ps1; python -m app.main"

# Wait a moment
Start-Sleep -Seconds 2

# Start Mobile App
Write-Host "Starting Mobile App (Expo)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$(Get-Location)\mobile-app'; npx expo start"

# Wait a moment
Start-Sleep -Seconds 2

# Start Admin Dashboard (if exists)
if (Test-Path "admin-dashboard/package.json") {
    Write-Host "Starting Admin Dashboard (Port 3001)..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$(Get-Location)\admin-dashboard'; npm install; npm run dev"
}

Write-Host "`n🎉 All services are starting!" -ForegroundColor Green
Write-Host "`nService URLs:" -ForegroundColor Cyan
Write-Host "- Backend API: http://localhost:3000" -ForegroundColor White
Write-Host "- AI Service: http://localhost:8001" -ForegroundColor White  
Write-Host "- Mobile App: http://localhost:19000 (Expo DevTools)" -ForegroundColor White
Write-Host "- Admin Dashboard: http://localhost:3001" -ForegroundColor White

Write-Host "`n📱 Mobile App Instructions:" -ForegroundColor Cyan
Write-Host "1. Install 'Expo Go' app on your phone" -ForegroundColor White
Write-Host "2. Scan the QR code from the Expo DevTools" -ForegroundColor White
Write-Host "3. Or press 'w' to open in web browser" -ForegroundColor White

Write-Host "`n🔧 Troubleshooting:" -ForegroundColor Cyan
Write-Host "- Check that PostgreSQL and Redis are running" -ForegroundColor White
Write-Host "- Ensure all .env files are properly configured" -ForegroundColor White
Write-Host "- If ports are in use, change them in the .env files" -ForegroundColor White

Write-Host "`nPress any key to exit this window (services will keep running)..." -ForegroundColor Yellow
Read-Host 