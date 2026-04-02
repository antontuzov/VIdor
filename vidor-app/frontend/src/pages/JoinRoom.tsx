import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useConferenceRoom } from '../hooks/useConferenceRoom'
import { useVoiceTranscription } from '../hooks/useVoiceTranscription'
import VideoGrid from '../components/VideoGrid'
import ControlBar from '../components/ControlBar'
import ChatPanel from '../components/ChatPanel'
import TranscriptionPanel from '../components/TranscriptionPanel'
import ConnectionStatus from '../components/ConnectionStatus'

type PanelType = 'chat' | 'transcription' | null

export default function JoinRoom() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  
  const [localName, setLocalName] = useState('')
  const [joined, setJoined] = useState(false)
  const [activePanel, setActivePanel] = useState<PanelType>(null)
  
  const {
    isConnected,
    isConnecting,
    localAudioEnabled,
    localVideoEnabled,
    participants,
    joinRoom,
    leaveRoom,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
  } = useConferenceRoom({
    autoJoin: false,
    autoMedia: false,
  })

  // Voice transcription
  const {
    isRecording,
    transcriptHistory,
    toggleRecording,
  } = useVoiceTranscription({
    language: 'en',
    autoStart: false,
  })
  
  const videoRef = useRef<HTMLVideoElement>(null)
  
  // Initialize local media for preview
  const initPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error('Failed to get preview media:', err)
    }
  }
  
  useEffect(() => {
    initPreview()
    
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])
  
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!roomId || !localName) return
    
    try {
      await joinRoom(roomId, localName)
      setJoined(true)
    } catch (err) {
      console.error('Failed to join:', err)
    }
  }
  
  const handleLeave = () => {
    leaveRoom()
    navigate('/')
  }

  useEffect(() => {
    document.title = joined ? `${roomId} - Vidor` : 'Join Meeting - Vidor'
    return () => {
      document.title = 'Vidor'
    }
  }, [joined, roomId])
  
  if (!joined) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="card p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-xl bg-blue-gradient flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-text mb-2">Join Meeting</h1>
              <p className="text-text-muted">Room: <span className="font-mono">{roomId}</span></p>
            </div>
            
            <div className="mb-6">
              <div className="video-container aspect-video">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover transform scale-x-[-1]"
                  autoPlay
                  playsInline
                  muted
                />
                <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-white text-sm">
                  Preview
                </div>
              </div>
            </div>
            
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-text mb-1">
                  Your Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={localName}
                  onChange={(e) => setLocalName(e.target.value)}
                  className="input"
                  placeholder="Enter your name"
                  required
                  autoFocus
                />
              </div>
              
              <button 
                type="submit" 
                className="btn btn-primary w-full"
                disabled={isConnecting || !localName.trim()}
              >
                {isConnecting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Connecting...
                  </span>
                ) : (
                  'Join Meeting'
                )}
              </button>
              
              <button
                type="button"
                onClick={() => navigate('/')}
                className="btn btn-ghost w-full"
              >
                Back to Home
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="h-screen bg-bg-darker flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        {/* Video grid */}
        <div className="flex-1 p-4 overflow-auto">
          <VideoGrid />
          
          {participants.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-bg-darker flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-text-muted">Waiting for others to join...</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Side panel */}
        {activePanel === 'chat' && (
          <div className="w-80 border-l border-border bg-bg flex-shrink-0">
            <ChatPanel />
          </div>
        )}
        
        {activePanel === 'transcription' && (
          <div className="w-80 border-l border-border bg-bg flex-shrink-0">
            <TranscriptionPanel
              transcriptions={transcriptHistory}
              isRecording={isRecording}
              onToggleRecording={toggleRecording}
            />
          </div>
        )}
      </div>
      
      {/* Control bar */}
      <ControlBar 
        isConnected={isConnected}
        isConnecting={isConnecting}
        localAudioEnabled={localAudioEnabled}
        localVideoEnabled={localVideoEnabled}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
        onToggleChat={() => setActivePanel(activePanel === 'chat' ? null : 'chat')}
        onToggleTranscription={() => setActivePanel(activePanel === 'transcription' ? null : 'transcription')}
        onLeave={handleLeave}
      />
      
      {/* Connection status overlay */}
      {!isConnected && isConnecting && (
        <ConnectionStatus status="connecting" />
      )}
      
      {!isConnected && !isConnecting && (
        <ConnectionStatus status="disconnected" />
      )}
    </div>
  )
}
