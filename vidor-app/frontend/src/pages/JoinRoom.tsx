import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useWebRTCStore } from '../stores/webrtcStore'
import { signalingService } from '../services/signalingService'
import VideoGrid from '../components/VideoGrid'
import ControlBar from '../components/ControlBar'
import ChatPanel from '../components/ChatPanel'

export default function JoinRoom() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  
  const [localName, setLocalName] = useState('')
  const [joined, setJoined] = useState(false)
  const [showChat, setShowChat] = useState(false)
  
  const {
    localStream,
    setLocalStream,
    setLocalParticipantId,
    setRoomId,
    setIsConnected,
    addParticipant,
    removeParticipant,
    cleanup,
    error,
    setError,
  } = useWebRTCStore()
  
  const videoRef = useRef<HTMLVideoElement>(null)
  
  // Initialize local media
  const initMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      
      setLocalStream(stream)
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error('Failed to get media:', err)
      setError('Failed to access camera/microphone')
    }
  }
  
  // Connect to signaling server
  const connectToRoom = async () => {
    if (!roomId || !localName) return
    
    const participantId = `user_${Date.now()}`
    setLocalParticipantId(participantId)
    setRoomId(roomId)
    
    try {
      await signalingService.connect(roomId, participantId, localName)
      
      signalingService.onOpen(() => {
        setIsConnected(true)
        setJoined(true)
      })
      
      signalingService.onMessage((message) => {
        handleSignalingMessage(message)
      })
      
      signalingService.onClose(() => {
        setIsConnected(false)
      })
      
    } catch (err) {
      console.error('Failed to connect to room:', err)
      setError('Failed to connect to signaling server')
    }
  }
  
  // Handle incoming signaling messages
  const handleSignalingMessage = async (message: any) => {
    console.log('Received message:', message)
    
    switch (message.type) {
      case 'joined':
        console.log('Successfully joined room')
        break
        
      case 'participant-joined':
        addParticipant({
          id: message.participant_id,
          name: message.name,
          has_video: true,
          has_audio: true,
        })
        // Create peer connection and send offer
        // (simplified - full implementation in Step 3)
        break
        
      case 'participant-left':
        removeParticipant(message.participant_id)
        break
        
      case 'offer':
        // Handle incoming offer
        break
        
      case 'answer':
        // Handle incoming answer
        break
        
      case 'ice-candidate':
        // Handle ICE candidate
        break
        
      case 'error':
        setError(message.message)
        break
    }
  }
  
  // Handle join form submission
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!roomId || !localName) return
    
    await initMedia()
    await connectToRoom()
  }
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (joined && roomId) {
        const participantId = `user_${Date.now()}`
        signalingService.leave(roomId, participantId)
      }
      cleanup()
    }
  }, [])
  
  // Update local video when stream changes
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream
    }
  }, [localStream])
  
  // Show join form if not joined
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
              <p className="text-text-muted">Room: {roomId}</p>
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
              
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}
              
              <button type="submit" className="btn btn-primary w-full">
                Join Meeting
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
  
  // Show conference UI
  return (
    <div className="h-screen bg-bg-darker flex flex-col">
      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video grid */}
        <div className="flex-1 p-4 overflow-auto">
          <VideoGrid />
        </div>
        
        {/* Chat panel */}
        {showChat && (
          <div className="w-80 border-l border-border bg-bg">
            <ChatPanel />
          </div>
        )}
      </div>
      
      {/* Control bar */}
      <ControlBar 
        onToggleChat={() => setShowChat(!showChat)}
        onLeave={() => navigate('/')}
      />
    </div>
  )
}
