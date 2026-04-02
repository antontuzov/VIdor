# Vidor Frontend

React + TypeScript frontend for Vidor video conferencing platform.

## Tech Stack

- **React 18** - UI framework with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **TailwindCSS** - Utility-first styling
- **Zustand** - Lightweight state management
- **React Router** - Client-side routing
- **Zod** - Runtime type validation
- **Immer** - Immutable state updates

## Features

- 🎥 **WebRTC Video** - Native browser WebRTC API
- 🎙️ **Media Controls** - Audio/video/screen share toggles
- 💬 **Chat** - Real-time messaging via data channels
- 🔔 **Connection Status** - Auto-reconnection with exponential backoff
- 🎨 **Responsive UI** - Mobile-first design
- 🌓 **Dark Mode** - System preference detection
- ♿ **Accessible** - ARIA labels, keyboard navigation

## Project Structure

```
frontend/
├── src/
│   ├── components/       # React components
│   │   ├── ui/          # Reusable UI components
│   │   ├── VideoGrid.tsx
│   │   ├── ControlBar.tsx
│   │   ├── ChatPanel.tsx
│   │   └── Layout.tsx
│   ├── pages/           # Route pages
│   │   ├── LandingPage.tsx
│   │   ├── JoinRoom.tsx
│   │   └── Settings.tsx
│   ├── hooks/           # Custom React hooks
│   │   └── useConferenceRoom.ts
│   ├── stores/          # Zustand stores
│   │   └── webrtcStore.ts
│   ├── services/        # External services
│   │   ├── signalingService.ts
│   │   └── apiClient.ts
│   ├── contexts/        # React contexts
│   │   └── ThemeContext.tsx
│   ├── test/            # Test setup
│   │   └── setup.ts
│   ├── App.tsx          # Root component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── shared/              # Shared types with backend
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts
└── vitest.config.ts
```

## Development

### Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Start dev server
npm run dev
```

### Environment Variables

Create `.env.local`:

```bash
# Backend API
VITE_BACKEND_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080/ws/signaling

# TURN/STUN servers
VITE_TURN_SERVER=turn:localhost:3478
VITE_TURN_USERNAME=vidor
VITE_TURN_PASSWORD=your_password

# Optional: Qwen API for voice features
VITE_QWEN_API_KEY=your_api_key

# App mode
VITE_APP_MODE=development
```

### Commands

```bash
# Development
npm run dev          # Start dev server at localhost:5173

# Build
npm run build        # Production build to dist/
npm run preview      # Preview production build

# Lint
npm run lint         # ESLint check

# Test
npm run test         # Run Vitest tests
npm run test:ui      # Run tests with UI
```

## Core Modules

### WebRTC Store (`stores/webrtcStore.ts`)

Zustand store managing all WebRTC state:

- Local/remote media streams
- Peer connections
- Participant list
- Room state
- Media controls (audio/video/screen share)

```typescript
import { useWebRTCStore } from './stores/webrtcStore'

const {
  localStream,
  toggleAudio,
  toggleVideo,
  startScreenShare,
  participants,
} = useWebRTCStore()
```

### Signaling Service (`services/signalingService.ts`)

WebSocket client for WebRTC signaling:

- Auto-reconnection with exponential backoff
- Message queuing during disconnection
- Heartbeat for connection health
- Event listeners for state changes

```typescript
import { signalingService } from './services/signalingService'

signalingService.onMessage((msg) => {
  console.log('Received:', msg.type)
})

signalingService.connect(roomId, participantId, name)
```

### Conference Room Hook (`hooks/useConferenceRoom.ts`)

High-level hook for conference room management:

```typescript
import { useConferenceRoom } from './hooks/useConferenceRoom'

const {
  isConnected,
  localStream,
  participants,
  joinRoom,
  leaveRoom,
  toggleAudio,
  toggleVideo,
} = useConferenceRoom({
  autoJoin: true,
  onParticipantJoin: (p) => console.log('Joined:', p.name),
})
```

### API Client (`services/apiClient.ts`)

REST API client with error handling:

```typescript
import { createRoom, joinRoom, getRoomInfo } from './services/apiClient'

const { room_id, token } = await createRoom({ room_name: 'My Meeting' })
```

## WebRTC Flow

```
1. User joins room
   ↓
2. Initialize local media (getUserMedia)
   ↓
3. Connect to WebSocket signaling
   ↓
4. Send "join" message
   ↓
5. Receive existing participants
   ↓
6. For each participant:
   - Create RTCPeerConnection
   - Add local tracks
   - Create and send offer
   ↓
7. Receive answer
   - Set remote description
   ↓
8. Exchange ICE candidates
   ↓
9. P2P connection established
   ↓
10. Receive remote media streams
```

## Components

### VideoGrid

Responsive grid layout for participant videos:

- Auto-layout based on participant count
- Local video with mirror effect
- Placeholder avatars when video off
- Speaking indicators

### ControlBar

Meeting controls:

- Audio toggle (mute/unmute)
- Video toggle (camera on/off)
- Screen share
- Chat toggle
- Settings
- Leave button

### ChatPanel

In-meeting chat:

- Real-time messages
- System notifications
- File upload placeholder
- Auto-scroll to bottom

## Styling

TailwindCSS with custom design tokens:

```css
/* Design tokens in index.css */
:root {
  --bg: #ffffff;
  --text: #111827;
  --accent: #2563EB;
  --blue-gradient: linear-gradient(135deg, #2563EB, #0EA5E9, #06B6D4);
}
```

### Custom Classes

- `.btn` - Button base
- `.btn-primary` - Gradient button
- `.card` - Card container
- `.input` - Form input
- `.control-btn` - Meeting control button
- `.video-container` - Video tile

## Testing

```typescript
// Example test
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Button from './components/ui/Button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })
})
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance

- Code splitting by route
- Lazy loading for heavy components
- Memoized video tiles
- Virtual scrolling for chat (future)

## Security

- Input sanitization
- XSS prevention
- CSP headers (production)
- Token-based authentication

## License

MIT License
