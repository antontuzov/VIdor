# Vidor

**Crystal-Clear Conferencing, AI-Powered**

A production-grade, self-hosted video conferencing platform with C++ signaling server, WebRTC peer-to-peer connections, and AI-powered voice transcription.

![Vidor](https://img.shields.io/badge/Vidor-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![C++](https://img.shields.io/badge/C++-20-blue)
![React](https://img.shields.io/badge/React-18-blue)

## Features

- 🎥 **HD Video Conferencing** - Peer-to-peer WebRTC with minimal latency
- 🎙️ **AI Transcription** - Real-time speech-to-text with Qwen-Audio/Whisper
- 🔒 **End-to-End Encryption** - Secure signaling with JWT authentication
- 🌐 **Self-Hosted** - Full control with Docker deployment
- 🎨 **Modern UI** - Notion-inspired design with blue gradient theme
- 📡 **TURN/STUN Support** - NAT traversal with integrated Coturn server

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local frontend development)
- CMake 3.16+ (for local backend development)
- C++20 compatible compiler (GCC 11+, Clang 14+, or MSVC 2019+)

### 1. Clone & Setup

```bash
cd vidor-app

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# - Generate JWT_SECRET: openssl rand -base64 32
# - Add QWEN_API_KEY (optional, for AI features)
```

### 2. Run with Docker

```bash
# Build and start all services
docker compose up --build

# Access the app
# Frontend: http://localhost:3000
# Backend API: http://localhost:8080
# WebSocket: ws://localhost:8080/ws/signaling
```

### 3. Local Development

#### Backend (C++)

```bash
cd backend

# Create build directory
mkdir build && cd build

# Configure with CMake
cmake .. -DCMAKE_BUILD_TYPE=Debug

# Build
cmake --build . -j$(nproc)

# Run
./vidor-server ../config.json
```

#### Frontend (React + TypeScript)

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev

# Access at http://localhost:5173
```

## Project Structure

```
vidor-app/
├── backend/           # C++ CMake project (Drogon framework)
│   ├── src/          # Implementation files
│   ├── include/      # Header files
│   ├── CMakeLists.txt
│   └── config.json
├── frontend/          # Vite + React + TypeScript
│   ├── src/
│   ├── components/
│   ├── hooks/
│   └── vite.config.ts
├── shared/            # Shared types and schemas
│   ├── api-types.ts
│   └── env-schema.ts
├── docker-compose.yml
└── .env.example
```

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend    │────▶│  Qwen API   │
│  (React)    │ WS  │   (C++/Drogon)│ HTTP │  (Voice)  │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │
       │      WebRTC        │
       └────────────────────┘
            P2P Media
```

### Components

- **Frontend**: React 18 + TypeScript + TailwindCSS + native WebRTC
- **Backend**: C++20 + Drogon + WebSocket signaling + JWT auth
- **Database**: PostgreSQL (optional, for room persistence)
- **TURN/STUN**: Coturn for NAT traversal
- **Voice AI**: Qwen-Audio API or local Whisper.cpp

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BACKEND_URL` | Backend API URL | `http://localhost:8080` |
| `QWEN_API_KEY` | Qwen Audio API key | (optional) |
| `TURN_SERVER` | TURN server URL | `turn:localhost:3478` |
| `TURN_USERNAME` | TURN username | `vidor` |
| `TURN_PASSWORD` | TURN password | (required) |
| `JWT_SECRET` | JWT signing secret | (required) |

### TURN Server Setup

For production, configure Coturn with HTTPS:

```bash
# Generate SSL certificates
openssl req -x509 -newkey rsa:2048 -keyout turnserver.key -out turnserver.crt

# Update coturn/turnserver.conf with cert paths
```

## API Reference

### REST Endpoints

```http
POST /api/rooms
Content-Type: application/json

{"user_id": "user123"}

Response:
{
  "room_id": "abc123",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "created_at": 1234567890
}
```

```http
GET /api/rooms/:id

Response:
{
  "room_id": "abc123",
  "participant_count": 2,
  "status": "active"
}
```

### WebSocket Signaling

Connect to `ws://localhost:8080/ws/signaling`

**Join Room:**
```json
{
  "type": "join",
  "room_id": "abc123",
  "participant_id": "user123",
  "name": "John"
}
```

**WebRTC Signaling:**
```json
{
  "type": "offer",
  "from": "user123",
  "to": "user456",
  "sdp": { "type": "offer", "sdp": "v=0..." }
}
```

## Testing

```bash
# Backend tests
cd backend/build
ctest

# Frontend tests
cd frontend
npm test
```

## Deployment

### VPS Requirements

- **CPU**: 2+ vCPU
- **RAM**: 4GB+
- **Ports**: 80, 443, 3478 (TCP/UDP), 10000-10200 (UDP)
- **OS**: Ubuntu 22.04+ or Debian 11+

### Production Checklist

- [ ] Set strong `JWT_SECRET`
- [ ] Configure HTTPS with Let's Encrypt
- [ ] Setup TURN server with SSL
- [ ] Configure firewall rules
- [ ] Set up monitoring/logging
- [ ] Enable database backups

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## Troubleshooting

### WebRTC Connection Issues

1. Check TURN server is running: `docker compose ps coturn`
2. Verify ports 3478 and 10000-10200 are open
3. Check browser console for ICE errors

### CORS Errors

Ensure `BACKEND_URL` in frontend matches backend's CORS allowed origins in `config.json`.

### AI Transcription Not Working

1. Verify `QWEN_API_KEY` is set in `.env`
2. Check backend logs: `docker compose logs backend`
3. Fallback to local Whisper if API key is missing

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push: `git push origin feature/my-feature`
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [Drogon Framework](https://drogon.org/)
- [Qwen Audio](https://www.aliyun.com/product/dashscope)
- [Coturn](https://github.com/coturn/coturn)
- [Whisper.cpp](https://github.com/ggerganov/whisper.cpp)

---

**Vidor** - Built with ❤️ using C++ and React
