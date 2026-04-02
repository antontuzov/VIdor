import { useRef, useEffect } from 'react'
import { useWebRTCStore } from '../stores/webrtcStore'
import { Participant } from '@shared/api-types'

export default function VideoGrid() {
  const { localStream, remoteStreams, participants, localAudioEnabled, localVideoEnabled } = useWebRTCStore()
  
  // Build list of all video tiles
  const videoTiles = [
    // Local video
    {
      id: 'local',
      stream: localStream,
      name: 'You',
      isLocal: true,
      hasVideo: localVideoEnabled,
      hasAudio: localAudioEnabled,
    },
    // Remote videos
    ...participants.map((p: Participant) => ({
      id: p.id,
      stream: remoteStreams.get(p.id) || p.stream,
      name: p.name,
      isLocal: false,
      hasVideo: p.has_video,
      hasAudio: p.has_audio,
      isSpeaking: p.is_speaking,
    })),
  ]
  
  // Determine grid layout based on participant count
  const getGridClass = (count: number) => {
    if (count <= 1) return 'grid-cols-1 max-w-2xl mx-auto'
    if (count <= 4) return 'grid-cols-2'
    if (count <= 9) return 'grid-cols-3'
    return 'grid-cols-4'
  }
  
  return (
    <div className="h-full flex items-center justify-center">
      <div className={`grid ${getGridClass(videoTiles.length)} gap-4 w-full max-w-7xl mx-auto p-4`}>
        {videoTiles.map((tile) => (
          <VideoTile
            key={tile.id}
            stream={tile.stream}
            name={tile.name}
            isLocal={tile.isLocal}
            hasVideo={tile.hasVideo}
            hasAudio={tile.hasAudio}
            isSpeaking={tile.isSpeaking}
          />
        ))}
        
        {videoTiles.length === 0 && (
          <div className="col-span-full flex items-center justify-center min-h-[400px]">
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
    </div>
  )
}

interface VideoTileProps {
  stream: MediaStream | null | undefined
  name: string
  isLocal: boolean
  hasVideo: boolean
  hasAudio: boolean
  isSpeaking?: boolean
}

function VideoTile({ stream, name, isLocal, hasVideo, hasAudio, isSpeaking }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  
  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])
  
  return (
    <div className={`video-container group relative ${isSpeaking ? 'ring-2 ring-accent-500' : ''}`}>
      {/* Video element */}
      {stream && hasVideo ? (
        <video
          ref={videoRef}
          className="w-full h-full object-cover transform scale-x-[-1]"
          autoPlay
          playsInline
          muted={isLocal}
        />
      ) : (
        <div className="w-full h-full bg-bg-darker flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl font-bold text-white">
                {name.charAt(0).toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-text-muted">{name}</p>
          </div>
        </div>
      )}
      
      {/* Participant name overlay */}
      <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-white text-sm flex items-center space-x-2">
        <span>{name}</span>
        {isLocal && <span className="text-xs opacity-75">(You)</span>}
      </div>
      
      {/* Status indicators */}
      <div className="absolute top-3 right-3 flex items-center space-x-2">
        {/* Audio indicator */}
        {!hasAudio && (
          <div className="p-1.5 bg-black/50 backdrop-blur-sm rounded-full">
            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          </div>
        )}
        
        {/* Video quality indicator (hover) */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-white text-xs flex items-center space-x-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
            <span>HD</span>
          </div>
        </div>
      </div>
      
      {/* Screen share indicator */}
      {false && ( // TODO: Add screen share tracking
        <div className="absolute top-3 left-3 px-2 py-1 bg-accent-500 text-white text-xs rounded flex items-center space-x-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span>Sharing</span>
        </div>
      )}
    </div>
  )
}
