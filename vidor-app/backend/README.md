# Vidor Backend

C++ signaling server for Vidor video conferencing platform.

## Features

- **WebSocket Signaling** - WebRTC SDP/ICE exchange for peer-to-peer connections
- **REST API** - Room management, JWT authentication, voice API proxy
- **JWT Authentication** - Secure token-based authentication
- **Voice AI Integration** - Qwen-Audio/Whisper transcription and TTS
- **TURN/STUN Support** - NAT traversal configuration
- **Structured Logging** - Console and file logging with rotation
- **CORS Support** - Configurable cross-origin requests

## Tech Stack

- **C++20** - Modern C++ features
- **Drogon** - High-performance HTTP/WebSocket framework
- **nlohmann/json** - JSON parsing and serialization
- **jwt-cpp** - JWT token generation and validation
- **OpenSSL** - Cryptographic operations

## Building

### Prerequisites

- CMake 3.16+
- C++20 compatible compiler (GCC 11+, Clang 14+, MSVC 2019+)
- OpenSSL development libraries
- libz (zlib)

### Build Commands

```bash
# Using build script
./build.sh

# Or manually
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build . -j$(nproc)
```

### Dependencies

Dependencies are automatically fetched by CMake using FetchContent:

- Drogon v1.9.8
- nlohmann/json v3.11.3
- jwt-cpp v0.7.0

## Running

```bash
# Set environment variables
export JWT_SECRET=$(openssl rand -base64 32)
export QWEN_API_KEY=your_api_key_here

# Run server
./build/vidor-server ../config.json
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `JWT_SECRET` | Secret key for JWT signing (min 32 chars) | Yes |
| `QWEN_API_KEY` | Qwen Audio API key | No (for voice features) |
| `TURN_SERVER` | TURN server URL | No |
| `TURN_PASSWORD` | TURN server password | No |
| `DATABASE_URL` | PostgreSQL connection URL | No |
| `VIDOR_CONFIG` | Path to config file | No |

## API Reference

### REST Endpoints

#### Health Check

```http
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": 1234567890,
  "version": "1.0.0"
}
```

#### Server Stats

```http
GET /api/stats
```

Response:
```json
{
  "total_rooms": 5,
  "active_rooms": 3,
  "total_participants": 12,
  "total_connections": 12,
  "uptime_seconds": 3600,
  "messages_sent": 1500,
  "messages_received": 1450,
  "errors": 0
}
```

#### Create Room

```http
POST /api/rooms
Content-Type: application/json

{
  "user_id": "user123",
  "room_name": "My Meeting",
  "settings": {
    "max_participants": 10,
    "is_locked": false
  }
}
```

Response:
```json
{
  "room_id": "1",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "created_at": 1234567890
}
```

#### Get Room Info

```http
GET /api/rooms/:id
```

Response:
```json
{
  "room_id": "1",
  "participant_count": 3,
  "status": "active"
}
```

#### Delete Room

```http
DELETE /api/rooms/:id
```

#### Join Room (Get Token)

```http
POST /api/rooms/:id/join
Content-Type: application/json

{
  "user_id": "user456",
  "name": "John Doe"
}
```

Response:
```json
{
  "room_id": "1",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user_id": "user456"
}
```

#### Transcribe Audio

```http
POST /api/voice/transcribe
Content-Type: multipart/form-data

File: audio.wav
```

Response:
```json
{
  "status": "processing",
  "message": "Transcription in progress"
}
```

#### Synthesize Speech

```http
POST /api/voice/synthesize
Content-Type: application/json

{
  "text": "Hello, world!",
  "voice": "default"
}
```

Response:
```json
{
  "status": "processing",
  "message": "Synthesis in progress"
}
```

#### Verify Token

```http
POST /api/auth/verify
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

Response:
```json
{
  "valid": true,
  "payload": {
    "user_id": "user123",
    "room_id": "1",
    "name": "John",
    "role": "host",
    "exp": 1234567890
  }
}
```

#### Refresh Token

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### WebSocket Signaling

Connect to `ws://localhost:8080/ws/signaling`

#### Join Room

```json
{
  "type": "join",
  "room_id": "1",
  "participant_id": "user123",
  "name": "John"
}
```

Response:
```json
{
  "type": "joined",
  "room_id": "1",
  "participant_id": "user123",
  "participants": [
    {"id": "user456", "name": "Jane", "has_video": true, "has_audio": true}
  ]
}
```

#### WebRTC Signaling

**Send Offer:**
```json
{
  "type": "offer",
  "room_id": "1",
  "from": "user123",
  "to": "user456",
  "sdp": {"type": "offer", "sdp": "v=0..."}
}
```

**Receive Offer:**
```json
{
  "type": "offer",
  "from": "user123",
  "sdp": {"type": "offer", "sdp": "v=0..."}
}
```

**Send Answer:**
```json
{
  "type": "answer",
  "room_id": "1",
  "from": "user456",
  "to": "user123",
  "sdp": {"type": "answer", "sdp": "v=0..."}
}
```

**Send ICE Candidate:**
```json
{
  "type": "ice-candidate",
  "room_id": "1",
  "from": "user123",
  "to": "user456",
  "candidate": {
    "candidate": "candidate:...",
    "sdpMid": "0",
    "sdpMLineIndex": 0
  }
}
```

#### Participant Events

**Participant Joined:**
```json
{
  "type": "participant-joined",
  "participant_id": "user789",
  "name": "Bob"
}
```

**Participant Left:**
```json
{
  "type": "participant-left",
  "participant_id": "user456"
}
```

**Participant Updated:**
```json
{
  "type": "participant-updated",
  "participant_id": "user123",
  "has_video": false,
  "has_audio": true,
  "is_screen_sharing": false
}
```

#### Heartbeat

Server sends heartbeat requests every 30 seconds. Client should respond:

**Request:**
```json
{"type": "heartbeat"}
```

**Response:**
```json
{
  "type": "heartbeat-ack",
  "timestamp": 1234567890
}
```

## Configuration

See `config.json` for all configuration options:

```json
{
  "server": {
    "port": 8080,
    "host": "0.0.0.0",
    "threads": 4,
    "use_ssl": false
  },
  "cors": {
    "allowed_origins": ["http://localhost:5173"],
    "allowed_methods": ["GET", "POST", "PUT", "DELETE"],
    "allowed_headers": ["Content-Type", "Authorization"]
  },
  "jwt": {
    "secret": "${JWT_SECRET}",
    "expiry_seconds": 3600
  },
  "voice": {
    "api_key": "${QWEN_API_KEY}",
    "model": "paraformer-realtime-v2"
  },
  "logging": {
    "level": "info",
    "file": "logs/vidor-server.log",
    "console": true
  }
}
```

## Testing

```bash
cd build
ctest
# or
./vidor-tests
```

## Logging

Logs are output to console and optionally to file. Log levels:

- `debug` - Detailed debugging information
- `info` - General operational information
- `warn` - Warning conditions
- `error` - Error conditions
- `fatal` - Critical errors

## Docker

See root `docker-compose.yml` for Docker configuration.

```bash
docker compose up --build backend
```

## Performance

- Supports 1000+ concurrent WebSocket connections
- Message routing latency < 1ms
- Memory usage: ~50MB base + ~10KB per connection

## Security

- JWT tokens for authentication
- CORS validation
- Rate limiting (configurable)
- Input validation
- Secure WebSocket connections (WSS with SSL)

## License

MIT License
