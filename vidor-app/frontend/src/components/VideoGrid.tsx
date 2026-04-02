import { useWebRTCStore } from '../stores/webrtcStore'

export default function VideoGrid() {
  const { localStream, remoteStreams, participants } = useWebRTCStore()
  
  const allStreams = [
    { id: 'local', stream: localStream, isLocal: true, name: 'You' },
    ...Array.from(remoteStreams.entries()).map(([id, stream]) => ({
      id,
      stream,
      isLocal: false,
      name: participants.find(p => p.id === id)?.name || 'Participant',
    })),
  ]
  
  // Determine grid layout based on participant count
  const getGridClass = (count: number) => {
    if (count <= 1) return 'grid-cols-1'
    if (count <= 4) return 'grid-cols-2'
    if (count <= 9) return 'grid-cols-3'
    return 'grid-cols-4'
  }
  
  return (
    <div className={`grid ${getGridClass(allStreams.length)} gap-4 h-full`}>
      {allStreams.map(({ id, stream, isLocal, name }) => (
        <VideoTile
          key={id}
          stream={stream}
          name={name}
          isLocal={isLocal}
          isSpeaking={false}
        />
      ))}
      
      {allStreams.length === 0 && (
        <div className="col-span-full flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-bg-darker flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-text-muted">Waiting for participants...</p>
          </div>
        </div>
      )}
    </div>
  )
}

interface VideoTileProps {
  stream: MediaStream | null
  name: string
  isLocal: boolean
  isSpeaking: boolean
}

function VideoTile({ stream, name, isLocal, isSpeaking }: VideoTileProps) {
  return (
    <div className={`video-container group relative ${isSpeaking ? 'ring-2 ring-accent-500' : ''}`}>
      {/* Video element */}
      {stream ? (
        <video
          ref={(el) => {
            if (el) el.srcObject = stream
          }}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted={isLocal}
        />
      ) : (
        <div className="w-full h-full bg-bg-darker flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
            <span className="text-2xl font-semibold text-accent-600 dark:text-accent-400">
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      )}
      
      {/* Participant name overlay */}
      <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-white text-sm">
        {name} {isLocal && '(You)'}
      </div>
      
      {/* Video quality indicator */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center space-x-1 px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-white text-xs">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
          </svg>
          <span>HD</span>
        </div>
      </div>
    </div>
  )
}
