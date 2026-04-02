# Vidor Deployment Guide

Complete guide for deploying Vidor video conferencing platform to production.

## 📋 Prerequisites

### Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 vCPU | 4+ vCPU |
| RAM | 4 GB | 8+ GB |
| Storage | 20 GB | 50+ GB SSD |
| Bandwidth | 10 Mbps | 100+ Mbps |

### Software Requirements

- Docker 20.10+
- Docker Compose 2.0+
- Nginx (for production reverse proxy)
- SSL certificates (Let's Encrypt)

### Network Ports

| Port | Protocol | Service |
|------|----------|---------|
| 80 | TCP | HTTP (redirect to HTTPS) |
| 443 | TCP | HTTPS |
| 3478 | TCP/UDP | TURN/STUN |
| 5349 | TCP/UDP | TURN over TLS |
| 10000-10200 | UDP | RTP media ports |

## 🐳 Docker Deployment

### Quick Start

```bash
# Clone repository
git clone https://github.com/your-org/vidor.git
cd vidor/vidor-app

# Copy environment file
cp .env.example .env

# Generate secure secrets
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
echo "TURN_PASSWORD=$(openssl rand -base64 24)" >> .env

# Build and start all services
docker compose up --build -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  backend:
    image: vidor-backend:latest
    container_name: vidor-backend
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - QWEN_API_KEY=${QWEN_API_KEY}
      - TURN_SERVER=turn:coturn:3478
      - TURN_PASSWORD=${TURN_PASSWORD}
      - DATABASE_URL=postgresql://vidor:${POSTGRES_PASSWORD}@postgres:5432/vidor
    volumes:
      - backend_logs:/app/logs
      - ./backend/config.json:/app/config.json:ro
    networks:
      - vidor-network
    depends_on:
      postgres:
        condition: service_healthy
      coturn:
        condition: service_started
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    image: vidor-frontend:latest
    container_name: vidor-frontend
    restart: unless-stopped
    ports:
      - "3000:80"
    environment:
      - VITE_BACKEND_URL=https://your-domain.com/api
      - VITE_WS_URL=wss://your-domain.com/ws
    networks:
      - vidor-network
    depends_on:
      - backend
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15-alpine
    container_name: vidor-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_USER=vidor
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=vidor
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/db/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    networks:
      - vidor-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vidor"]
      interval: 10s
      timeout: 5s
      retries: 5

  coturn:
    image: coturn/coturn:latest
    container_name: vidor-coturn
    restart: unless-stopped
    ports:
      - "3478:3478"
      - "3478:3478/udp"
      - "5349:5349"
      - "5349:5349/udp"
      - "10000-10200:10000-10200/udp"
    environment:
      - TURN_USERNAME=${TURN_USERNAME}
      - TURN_PASSWORD=${TURN_PASSWORD}
      - REALM=${DOMAIN_NAME}
      - LISTENING_PORT=3478
    volumes:
      - ./coturn/turnserver.conf:/etc/turnserver.conf:ro
      - turn_logs:/var/log/turnserver
    networks:
      - vidor-network
    sysctls:
      - net.ipv4.ip_forward=1
    cap_add:
      - NET_ADMIN

volumes:
  postgres_data:
  backend_logs:
  turn_logs:

networks:
  vidor-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16
```

## 🔒 Nginx Reverse Proxy

### Installation

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/vidor
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Frontend (SPA)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # WebSocket
    location /ws {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }
    
    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        proxy_pass http://localhost:3000;
    }
}
```

### Enable Site and Get SSL

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/vidor /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal (already configured by certbot)
sudo certbot renew --dry-run
```

## 🔧 Coturn Configuration

### Production turnserver.conf

```ini
# /etc/turnserver.conf

# Listening ports
listening-port=3478
tls-listening-port=5349

# External IP (your server's public IP)
external-ip=YOUR_SERVER_IP

# Realm (your domain)
realm=your-domain.com

# Server name
server-name=vidor-turn

# Authentication
lt-cred-mech
user=vidor:YOUR_TURN_PASSWORD

# Use long-term credentials
use-auth-secret
static-auth-secret=YOUR_SECRET_KEY

# Relay ports
min-port=10000
max-port=10200

# TLS certificates (generate with OpenSSL)
cert=/etc/turnserver.d/turnserver.crt
pkey=/etc/turnserver.d/turnserver.key

# Logging
verbose
log-file=/var/log/turnserver.log
simple-log

# Security
fingerprint
no-loopback-peer
no-multicast-peers
webRTC
no-cli

# Rate limiting
max-bps=1000000
user-quota=12
total-quota=1200

# Deny private IPs
denied-peer-ip=0.0.0.0-0.255.255.255
denied-peer-ip=127.0.0.0-127.255.255.255
```

### Generate TLS Certificates for Coturn

```bash
sudo mkdir -p /etc/turnserver.d

sudo openssl req -x509 -newkey rsa:2048 \
  -keyout /etc/turnserver.d/turnserver.key \
  -out /etc/turnserver.d/turnserver.crt \
  -days 365 -nodes -subj "/CN=your-domain.com"

sudo chown turnserver:turnserver /etc/turnserver.d/*
sudo chmod 400 /etc/turnserver.d/turnserver.key
```

## 📊 Monitoring & Logging

### Docker Logs

```bash
# View all logs
docker compose logs -f

# View specific service
docker compose logs -f backend
docker compose logs -f coturn

# Log rotation (add to docker-compose.yml)
# logging:
#   driver: "json-file"
#   options:
#     max-size: "10m"
#     max-file: "3"
```

### Health Checks

```bash
# Backend health
curl https://your-domain.com/api/health

# Stats endpoint
curl https://your-domain.com/api/stats

# Frontend
curl https://your-domain.com

# TURN server
telnet your-domain.com 3478
```

## 🔐 Security Checklist

- [ ] Strong JWT_SECRET (32+ characters)
- [ ] Strong TURN_PASSWORD
- [ ] HTTPS enabled with valid SSL
- [ ] Firewall configured (only required ports open)
- [ ] Database password changed from default
- [ ] Regular security updates applied
- [ ] Log rotation configured
- [ ] Rate limiting enabled
- [ ] CORS configured for your domain only

## 🚨 Troubleshooting

### WebRTC Connection Issues

```bash
# Check TURN server
docker compose exec coturn telnet localhost 3478

# Check firewall
sudo ufw status
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 10000:10200/udp

# Test ICE candidates
# In browser console (F12):
# navigator.mediaDevices.getUserMedia({video:true,audio:true})
```

### Database Issues

```bash
# Check PostgreSQL
docker compose exec postgres psql -U vidor -d vidor -c "SELECT 1"

# Reset database (WARNING: deletes all data)
docker compose down -v
docker compose up -d postgres
```

### High CPU Usage

```bash
# Check resource usage
docker stats

# Limit backend threads
# In config.json: "threads": 2
```

## 📈 Scaling

### Horizontal Scaling

For multiple backend instances:

1. Use a load balancer (HAProxy, AWS ALB)
2. Shared PostgreSQL database
3. Redis for session sharing (future)
4. Sticky sessions for WebSocket

### Vertical Scaling

Increase server resources:
- More CPU threads for backend
- More RAM for PostgreSQL
- More bandwidth for TURN

## 🌍 Cloud Deployments

### AWS

```yaml
# Use AWS ALB for load balancing
# RDS for PostgreSQL
# Elastic IP for TURN server
# Security Groups for firewall
```

### DigitalOcean

```yaml
# Use DigitalOcean Load Balancer
# Managed Database for PostgreSQL
# Firewall rules for ports
```

### Google Cloud

```yaml
# Use Cloud Load Balancing
# Cloud SQL for PostgreSQL
# Firewall rules for TURN
```

## 📝 Maintenance

### Backup Database

```bash
# Backup
docker compose exec postgres pg_dump -U vidor vidor > backup.sql

# Restore
docker compose exec -T postgres psql -U vidor vidor < backup.sql
```

### Update Vidor

```bash
# Pull latest images
docker compose pull

# Restart services
docker compose up -d

# Or rebuild
docker compose up --build -d
```

### Log Rotation

```bash
# Install logrotate
sudo apt install logrotate

# Configure /etc/logrotate.d/vidor
/var/log/vidor/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 root root
}
```

---

**Vidor Deployment Guide** - For support, visit our documentation or open an issue.
