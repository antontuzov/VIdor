#!/bin/bash
# Vidor Backend Build Script

set -e

echo "🔧 Building Vidor Backend..."
echo "============================="

# Configuration
BUILD_TYPE="${BUILD_TYPE:-Release}"
BUILD_DIR="build"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check for required tools
if ! command -v cmake &> /dev/null; then
    echo -e "${YELLOW}Warning: cmake not found. Install cmake to build.${NC}"
    exit 1
fi

if ! command -v g++ &> /dev/null && ! command -v clang++ &> /dev/null; then
    echo -e "${YELLOW}Warning: No C++ compiler found. Install g++ or clang++.${NC}"
    exit 1
fi

# Create build directory
echo -e "${BLUE}Creating build directory...${NC}"
mkdir -p ${BUILD_DIR}
cd ${BUILD_DIR}

# Configure
echo -e "${BLUE}Configuring with CMake...${NC}"
cmake .. \
    -DCMAKE_BUILD_TYPE=${BUILD_TYPE} \
    -DCMAKE_EXPORT_COMPILE_COMMANDS=ON

# Build
echo -e "${BLUE}Building...${NC}"
cmake --build . -j$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)

# Print summary
echo ""
echo -e "${GREEN}✅ Build complete!${NC}"
echo ""
echo "Binary location: ${BUILD_DIR}/vidor-server"
echo ""
echo "To run the server:"
echo "  cd ${BUILD_DIR}"
echo "  ./vidor-server ../config.json"
echo ""
echo "Or with environment variables:"
echo "  export JWT_SECRET=\$(openssl rand -base64 32)"
echo "  export QWEN_API_KEY=your_api_key"
echo "  ./vidor-server ../config.json"
echo ""
