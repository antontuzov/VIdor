# Multi-stage Dockerfile for Vidor Frontend
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build arguments for environment variables
ARG VITE_BACKEND_URL=http://localhost:8080
ARG VITE_TURN_SERVER=turn:localhost:3478

ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_TURN_SERVER=$VITE_TURN_SERVER

# Build
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost/ || exit 1

# Run
CMD ["nginx", "-g", "daemon off;"]
