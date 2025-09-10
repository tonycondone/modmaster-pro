#!/bin/bash

# ModMaster Pro - Start All Services
echo "🚀 Starting ModMaster Pro - Complete Vehicle Parts Identification System"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Check if .env files exist
ENV_FILES=("backend/api/.env" "ai-service/.env" "mobile-app/.env")

for env_file in "${ENV_FILES[@]}"; do
    if [ ! -f "$env_file" ]; then
        echo -e "${YELLOW}⚠️  Environment file missing: $env_file${NC}"
        echo -e "${YELLOW}Creating from example...${NC}"
        cp "$env_file.example" "$env_file"
    fi
done

echo -e "\n${CYAN}📋 Prerequisites Check:${NC}"

# Check Node.js
if command -v node &> /dev/null; then
    echo -e "- Node.js 18+: ${GREEN}✅ $(node --version)${NC}"
else
    echo -e "- Node.js 18+: ${RED}❌ Not installed${NC}"
    exit 1
fi

# Check Python
if command -v python3 &> /dev/null; then
    echo -e "- Python 3.11+: ${GREEN}✅ $(python3 --version)${NC}"
elif command -v python &> /dev/null; then
    echo -e "- Python 3.11+: ${GREEN}✅ $(python --version)${NC}"
else
    echo -e "- Python 3.11+: ${RED}❌ Not installed${NC}"
    exit 1
fi

# Check PostgreSQL
if command -v psql &> /dev/null; then
    echo -e "- PostgreSQL: ${GREEN}✅ Available${NC}"
else
    echo -e "- PostgreSQL: ${YELLOW}⚠️  Not in PATH (may still be installed)${NC}"
fi

# Check Redis
if command -v redis-cli &> /dev/null; then
    echo -e "- Redis: ${GREEN}✅ Available${NC}"
else
    echo -e "- Redis: ${YELLOW}⚠️  Not in PATH (may still be installed)${NC}"
fi

echo -e "\n${CYAN}🔧 Installing Dependencies...${NC}"

# Install Backend Dependencies
echo -e "${YELLOW}Installing Backend dependencies...${NC}"
cd backend/api
if [ -f "package.json" ]; then
    npm install --legacy-peer-deps
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Backend dependency installation failed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${RED}❌ Backend package.json not found${NC}"
    exit 1
fi

cd ../..

# Install Mobile App Dependencies
echo -e "${YELLOW}Installing Mobile App dependencies...${NC}"
cd mobile-app
if [ -f "package.json" ]; then
    npm install --legacy-peer-deps
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Mobile app dependency installation failed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Mobile App dependencies installed${NC}"
else
    echo -e "${RED}❌ Mobile app package.json not found${NC}"
    exit 1
fi

cd ..

# Install AI Service Dependencies
echo -e "${YELLOW}Installing AI Service dependencies...${NC}"
cd ai-service
if [ -f "requirements.txt" ]; then
    python3 -m venv venv 2>/dev/null || python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ AI Service dependency installation failed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ AI Service dependencies installed${NC}"
    deactivate
else
    echo -e "${RED}❌ AI Service requirements.txt not found${NC}"
    exit 1
fi

cd ..

echo -e "\n${CYAN}🚀 Starting Services...${NC}"
echo -e "${YELLOW}This will open multiple terminal windows/tabs for each service.${NC}"
echo -e "${YELLOW}Keep all windows open for the system to work properly.${NC}"

# Function to open new terminal with command
open_terminal() {
    local cmd="$1"
    local title="$2"
    
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal --title="$title" -- bash -c "$cmd; exec bash"
    elif command -v xterm &> /dev/null; then
        xterm -title "$title" -e bash -c "$cmd; exec bash" &
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        osascript -e "tell app \"Terminal\" to do script \"cd $(pwd) && $cmd\""
    else
        # Fallback: run in background
        bash -c "$cmd" &
        echo -e "${YELLOW}Started $title in background (PID: $!)${NC}"
    fi
}

# Start Backend API
echo -e "${GREEN}Starting Backend API (Port 3000)...${NC}"
open_terminal "cd backend/api && npm run dev" "ModMaster Backend API"

# Wait a moment
sleep 2

# Start AI Service
echo -e "${GREEN}Starting AI Service (Port 8001)...${NC}"
open_terminal "cd ai-service && source venv/bin/activate && python -m app.main" "ModMaster AI Service"

# Wait a moment
sleep 2

# Start Mobile App
echo -e "${GREEN}Starting Mobile App (Expo)...${NC}"
open_terminal "cd mobile-app && npx expo start" "ModMaster Mobile App"

# Wait a moment
sleep 2

# Start Admin Dashboard (if exists)
if [ -f "admin-dashboard/package.json" ]; then
    echo -e "${GREEN}Starting Admin Dashboard (Port 3001)...${NC}"
    open_terminal "cd admin-dashboard && npm install && npm run dev" "ModMaster Admin Dashboard"
fi

echo -e "\n${GREEN}🎉 All services are starting!${NC}"
echo -e "\n${CYAN}Service URLs:${NC}"
echo -e "- Backend API: ${WHITE}http://localhost:3000${NC}"
echo -e "- AI Service: ${WHITE}http://localhost:8001${NC}"
echo -e "- Mobile App: ${WHITE}http://localhost:19000${NC} (Expo DevTools)"
echo -e "- Admin Dashboard: ${WHITE}http://localhost:3001${NC}"

echo -e "\n${CYAN}📱 Mobile App Instructions:${NC}"
echo -e "1. Install ${WHITE}'Expo Go'${NC} app on your phone"
echo -e "2. Scan the QR code from the Expo DevTools"
echo -e "3. Or press ${WHITE}'w'${NC} to open in web browser"

echo -e "\n${CYAN}🔧 Troubleshooting:${NC}"
echo -e "- Check that PostgreSQL and Redis are running"
echo -e "- Ensure all .env files are properly configured"
echo -e "- If ports are in use, change them in the .env files"

echo -e "\n${YELLOW}Press any key to exit this script (services will keep running)...${NC}"
read -n 1 -s 