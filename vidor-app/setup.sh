#!/bin/bash
# Vidor Project Setup Script
# This script initializes the Vidor project structure and installs dependencies

set -e

echo "🎬 Setting up Vidor - Crystal-Clear Conferencing, AI-Powered"
echo "=============================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}Error: Please run this script from the vidor-app directory${NC}"
    exit 1
fi

# Step 1: Copy environment files
echo -e "${BLUE}📋 Step 1/5: Setting up environment files...${NC}"
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file${NC}"
else
    echo -e "${YELLOW}⚠ .env file already exists${NC}"
fi

if [ ! -f "frontend/.env.local" ]; then
    cp frontend/.env.example frontend/.env.local
    echo -e "${GREEN}✓ Created frontend/.env.local${NC}"
else
    echo -e "${YELLOW}⚠ frontend/.env.local already exists${NC}"
fi

if [ ! -f "backend/config.local.json" ]; then
    cp backend/config.json backend/config.local.json
    echo -e "${GREEN}✓ Created backend/config.local.json${NC}"
else
    echo -e "${YELLOW}⚠ backend/config.local.json already exists${NC}"
fi

echo ""

# Step 2: Generate secure secrets
echo -e "${BLUE}🔐 Step 2/5: Generating secure secrets...${NC}"

# Generate JWT secret if not set
if grep -q "your_super_secret_jwt_key_change_this_in_production" .env; then
    JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    sed -i.bak "s|JWT_SECRET=your_super_secret_jwt_key_change_this_in_production|JWT_SECRET=${JWT_SECRET}|g" .env
    rm -f .env.bak
    echo -e "${GREEN}✓ Generated JWT_SECRET${NC}"
else
    echo -e "${YELLOW}⚠ JWT_SECRET already configured${NC}"
fi

# Generate TURN password if not set
if grep -q "your_turn_password_here" .env; then
    TURN_PASSWORD=$(openssl rand -base64 24 2>/dev/null | tr -dc 'a-zA-Z0-9' | head -c 24)
    sed -i.bak "s|TURN_PASSWORD=your_turn_password_here|TURN_PASSWORD=${TURN_PASSWORD}|g" .env
    rm -f .env.bak
    echo -e "${GREEN}✓ Generated TURN_PASSWORD${NC}"
else
    echo -e "${YELLOW}⚠ TURN_PASSWORD already configured${NC}"
fi

echo ""

# Step 3: Install frontend dependencies
echo -e "${BLUE}📦 Step 3/5: Installing frontend dependencies...${NC}"
cd frontend

if command -v npm &> /dev/null; then
    echo "Installing npm packages..."
    npm install
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo -e "${RED}✗ npm not found. Please install Node.js and npm first.${NC}"
    echo "  Download from: https://nodejs.org/"
fi

cd ..
echo ""

# Step 4: Check backend dependencies
echo -e "${BLUE}🔧 Step 4/5: Checking backend requirements...${NC}"

if command -v cmake &> /dev/null; then
    CMAKE_VERSION=$(cmake --version | head -n 1)
    echo -e "${GREEN}✓ CMake found: ${CMAKE_VERSION}${NC}"
else
    echo -e "${YELLOW}⚠ CMake not found. Install CMake 3.16+ for backend development${NC}"
    echo "  Ubuntu/Debian: sudo apt-get install cmake"
    echo "  macOS: brew install cmake"
fi

if command -v g++ &> /dev/null; then
    GCC_VERSION=$(g++ --version | head -n 1)
    echo -e "${GREEN}✓ G++ found: ${GCC_VERSION}${NC}"
else
    echo -e "${YELLOW}⚠ G++ not found. Install G++ 11+ for C++20 support${NC}"
    echo "  Ubuntu/Debian: sudo apt-get install g++"
    echo "  macOS: xcode-select --install"
fi

echo ""

# Step 5: Docker check
echo -e "${BLUE}🐳 Step 5/5: Checking Docker setup...${NC}"

if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo -e "${GREEN}✓ Docker found: ${DOCKER_VERSION}${NC}"
else
    echo -e "${YELLOW}⚠ Docker not found. Install Docker for easy deployment${NC}"
    echo "  Download from: https://www.docker.com/get-started"
fi

if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version)
    echo -e "${GREEN}✓ Docker Compose found: ${COMPOSE_VERSION}${NC}"
elif docker compose version &> /dev/null; then
    COMPOSE_VERSION=$(docker compose version)
    echo -e "${GREEN}✓ Docker Compose found: ${COMPOSE_VERSION}${NC}"
else
    echo -e "${YELLOW}⚠ Docker Compose not found${NC}"
fi

echo ""

# Summary
echo "=============================================================="
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Review and edit .env file with your configuration:"
echo "   - Add QWEN_API_KEY for AI transcription (optional)"
echo "   - Adjust TURN_SERVER if using external TURN server"
echo ""
echo "2. Start the application:"
echo -e "   ${BLUE}docker compose up --build${NC}"
echo ""
echo "3. Access the application:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend API: http://localhost:8080"
echo "   - WebSocket: ws://localhost:8080/ws/signaling"
echo ""
echo "4. For local development (without Docker):"
echo "   Backend:"
echo -e "     cd backend && mkdir build && cd build"
echo -e "     cmake .. && cmake --build ."
echo -e "     ./vidor-server ../config.json"
echo ""
echo "   Frontend:"
echo -e "     cd frontend && npm run dev"
echo ""
echo "=============================================================="
echo -e "${BLUE}🎉 Welcome to Vidor!${NC}"
