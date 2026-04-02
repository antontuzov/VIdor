# Vidor

**Crystal-Clear Conferencing, AI-Powered**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/your-org/vidor)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![C++](https://img.shields.io/badge/C++-20-blue.svg)](https://isocpp.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)

A production-grade, self-hosted video conferencing platform with C++ signaling server, WebRTC peer-to-peer connections, and AI-powered voice transcription.

![Vidor Banner](docs/banner.png)

## ✨ Features

- 🎥 **HD Video Conferencing** - Peer-to-peer WebRTC with minimal latency
- 🎙️ **AI Transcription** - Real-time speech-to-text with Qwen-Audio/Whisper
- 🔒 **End-to-End Encryption** - Secure signaling with JWT authentication
- 🌐 **Self-Hosted** - Full control with Docker deployment
- 🎨 **Modern UI** - Notion-inspired design with blue gradient theme
- 📡 **TURN/STUN Support** - NAT traversal with integrated Coturn server
- 💬 **In-Meeting Chat** - Real-time messaging
- 🖥️ **Screen Sharing** - Full HD screen sharing with audio
- 🌓 **Dark Mode** - Automatic theme switching

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local frontend development)
- CMake 3.16+ (for local backend development)

### 1. Clone & Setup

```bash
git clone https://github.com/your-org/vidor.git
cd vidor/vidor-app

# Run setup script (generates secrets, installs dependencies)
./setup.sh
```

### 2. Run with Docker

```bash
# Build and start all services
docker compose up --build

# Access the app
# Frontend: http://localhost:3000
# Backend API: http://localhost:8080
```

### 3. Local Development

```bash
# Backend (C++)
cd backend
./build.sh
./build/vidor-server ../config.json

# Frontend (React)
cd frontend
npm install
npm run dev
```

## 📁 Project Structure

```
vidor-app/
├── backend/                    # C++ CMake project
│   ├── src/                   # Implementation files
│   │   ├── main.cpp          # Server entry point
│   │   ├── server.cpp        # REST endpoints
│   │   ├── signaling_handler.cpp  # WebSocket signaling
│   │   ├── voice_proxy.cpp   # Qwen-Audio proxy
│   │   ├── config.cpp        # Configuration loader
│   │   ├── jwt_utils.cpp     # JWT authentication
│   │   ├── room_manager.cpp  # Room persistence
│   │   └── logger.cpp        # Structured logging
│   ├── include/              # Header files
│   ├── tests/                # Unit tests
│   ├── db/                   # Database schema
│   ├── CMakeLists.txt        # Build configuration
│   └── Dockerfile            # Container build
│
├── frontend/                  # Vite + React + TypeScript
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── ui/          # Reusable UI components
│   │   │   ├── VideoGrid.tsx
│   │   │   ├── ControlBar.tsx
│   │   │   ├── ChatPanel.tsx
│   │   │   └── ...
│   │   ├── pages/           # Route pages
│   │   ├── hooks/           # Custom hooks
│   │   ├── stores/          # Zustand state
│   │   ├── services/        # API & signaling
│   │   └── ...
│   ├── package.json
│   ├── tailwind.config.ts
│   └── Dockerfile
│
├── shared/                    # Shared types
│   ├── api-types.ts          # TypeScript interfaces
│   └── env-schema.ts         # Zod validation
│
├── coturn/                    # TURN server config
│   └── turnserver.conf
│
├── docker-compose.yml         # Full stack orchestration
├── .env.example              # Environment template
├── setup.sh                  # Setup script
├── DEPLOYMENT.md             # Deployment guide
└── README.md                 # This file
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Vidor Platform                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │   Frontend   │         │   Frontend   │                 │
│  │   (Peer A)   │◄───────►│   (Peer B)   │                 │
│  │   (React)    │  WebRTC │   (React)    │                 │
│  └──────┬───────┘         └──────┬───────┘                 │
│         │                        │                          │
│         │      WebSocket         │                          │
│         └────────┬───────────────┘                          │
│                  │                                          │
│         ┌────────▼────────┐                                │
│         │    Backend      │                                │
│         │   (C++/Drogon)  │                                │
│         │                 │                                │
│         │ - Signaling     │                                │
│         │ - Room Mgmt     │                                │
│         │ - Voice Proxy   │                                │
│         │ - JWT Auth      │                                │
│         └────────┬────────┘                                │
│                  │                                          │
│         ┌────────▼────────┐                                │
│         │   PostgreSQL    │                                │
│         │   (Optional)    │                                │
│         └─────────────────┘                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

### Backend
- **C++20** - Modern C++ features
- **Drogon** - High-performance HTTP/WebSocket framework
- **nlohmann/json** - JSON processing
- **jwt-cpp** - JWT token handling
- **OpenSSL** - Cryptographic operations

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tooling
- **TailwindCSS** - Styling
- **Zustand** - State management
- **React Router** - Navigation

### Infrastructure
- **Docker** - Containerization
- **PostgreSQL** - Database (optional)
- **Coturn** - TURN/STUN server
- **Nginx** - Reverse proxy

## 📖 API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/stats` | Server statistics |
| `POST` | `/api/rooms` | Create room |
| `GET` | `/api/rooms/:id` | Get room info |
| `DELETE` | `/api/rooms/:id` | Delete room |
| `POST` | `/api/rooms/:id/join` | Get join token |
| `POST` | `/api/voice/transcribe` | Transcribe audio |
| `POST` | `/api/voice/synthesize` | Text-to-speech |
| `POST` | `/api/auth/verify` | Verify JWT token |
| `POST` | `/api/auth/refresh` | Refresh JWT token |

### WebSocket Signaling

Connect to `ws://localhost:8080/ws/signaling`

**Message Types:**
- `join` - Join a room
- `leave` - Leave a room
- `offer` - WebRTC offer
- `answer` - WebRTC answer
- `ice-candidate` - ICE candidate
- `participant-joined` - Notification
- `participant-left` - Notification
- `heartbeat` / `heartbeat-ack` - Connection health

## 🧪 Testing

```bash
# Backend tests
cd backend/build
ctest

# Frontend tests
cd frontend
npm test

# Run with coverage
npm run test:coverage
```

## 📦 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment guide including:

- Docker production configuration
- Nginx reverse proxy setup
- SSL/TLS configuration
- Coturn TURN server setup
- Cloud deployment (AWS, GCP, DigitalOcean)
- Monitoring and logging
- Scaling strategies

## 🔐 Security

- JWT-based authentication
- End-to-end encryption for media
- CORS protection
- Rate limiting
- Input validation
- Secure WebSocket connections

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push: `git push origin feature/my-feature`
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- [Drogon Framework](https://drogon.org/)
- [Qwen Audio](https://www.aliyun.com/product/dashscope)
- [Whisper.cpp](https://github.com/ggerganov/whisper.cpp)
- [Coturn](https://github.com/coturn/coturn)
- [Inter Font](https://rsms.me/inter/)

## 📞 Support

- Documentation: [docs.vidor.app](https://docs.vidor.app)
- Issues: [GitHub Issues](https://github.com/your-org/vidor/issues)
- Email: support@vidor.app

---

**Vidor** - Built with ❤️ using C++ and React
