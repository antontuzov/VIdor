# Multi-stage Dockerfile for Vidor C++ Backend
# Stage 1: Build
FROM ubuntu:22.04 AS builder

# Install dependencies
RUN apt-get update && apt-get install -y \
    cmake \
    g++ \
    git \
    libssl-dev \
    zlib1g-dev \
    libboost-all-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy source
COPY CMakeLists.txt vcpkg.json config.json ./
COPY src/ ./src/
COPY include/ ./include/

# Configure and build
RUN mkdir build && cd build && \
    cmake .. -DCMAKE_BUILD_TYPE=Release && \
    cmake --build . -j$(nproc)

# Stage 2: Runtime
FROM ubuntu:22.04

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libssl3 \
    zlib1g \
    libboost-system1.74.0 \
    libboost-thread1.74.0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built binary from builder
COPY --from=builder /build/build/vidor-server .
COPY --from=builder /build/config.json .

# Create logs directory
RUN mkdir -p /app/logs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Run
CMD ["./vidor-server", "config.json"]
