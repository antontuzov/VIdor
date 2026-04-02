import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { Participant, SignalingMessage, PeerConnectionConfig, WebRTCStats } from '@shared/api-types'
import { getIceServers } from '@shared/env-schema'

interface MediaState {
  // Local media
  localStream: MediaStream | null
  localAudioEnabled: boolean
  localVideoEnabled: boolean
  localScreenStream: MediaStream | null
  
  // Remote media streams keyed by participant ID
  remoteStreams: Map<string, MediaStream>
  
  // Audio context for processing
  audioContext: AudioContext | null
  analyserNode: AnalyserNode | null
}

interface ParticipantState {
  // Participants in current room
  participants: Participant[]
  localParticipantId: string | null
  localParticipantName: string | null
  
  // Peer connections keyed by participant ID
  peerConnections: Map<string, RTCPeerConnection>
  
  // Data channels for messaging
  dataChannels: Map<string, RTCDataChannel>
}

interface RoomState {
  roomId: string | null
  roomCode: string | null
  isConnected: boolean
  isConnecting: boolean
  isReconnecting: boolean
  error: string | null
  errorCode: string | null
}

interface WebRTCActions {
  // Media actions
  initLocalMedia: (video?: boolean, audio?: boolean) => Promise<void>
  stopLocalMedia: () => void
  toggleAudio: () => void
  toggleVideo: () => void
  setLocalAudioEnabled: (enabled: boolean) => void
  setLocalVideoEnabled: (enabled: boolean) => void
  
  // Screen sharing
  startScreenShare: () => Promise<void>
  stopScreenShare: () => void
  toggleScreenShare: () => Promise<void>
  
  // Participant management
  setLocalParticipantId: (id: string) => void
  setLocalParticipantName: (name: string) => void
  addParticipant: (participant: Participant) => void
  removeParticipant: (participantId: string) => void
  updateParticipant: (participantId: string, updates: Partial<Participant>) => void
  getParticipant: (participantId: string) => Participant | undefined
  
  // Remote streams
  addRemoteStream: (participantId: string, stream: MediaStream) => void
  removeRemoteStream: (participantId: string) => void
  getRemoteStream: (participantId: string) => MediaStream | undefined
  
  // Peer connections
  createPeerConnection: (participantId: string) => RTCPeerConnection
  removePeerConnection: (participantId: string) => void
  getPeerConnection: (participantId: string) => RTCPeerConnection | undefined
  
  // WebRTC signaling
  createOffer: (participantId: string) => Promise<RTCSessionDescriptionInit | null>
  handleOffer: (offer: RTCSessionDescriptionInit) => Promise<RTCSessionDescriptionInit | null>
  createAnswer: (offer: RTCSessionDescriptionInit) => Promise<RTCSessionDescriptionInit | null>
  handleAnswer: (answer: RTCSessionDescriptionInit) => Promise<void>
  addIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>
  
  // Room state
  setRoomId: (roomId: string | null) => void
  setRoomCode: (code: string | null) => void
  setIsConnected: (connected: boolean) => void
  setIsConnecting: (connecting: boolean) => void
  setIsReconnecting: (reconnecting: boolean) => void
  setError: (error: string | null, code?: string) => void
  
  // Stats
  getStats: (participantId: string) => Promise<WebRTCStats | null>
  
  // Cleanup
  cleanup: () => void
  reset: () => void
}

export interface WebRTCStore extends MediaState, ParticipantState, RoomState, WebRTCActions {}

const DEFAULT_ICE_CONFIG: PeerConnectionConfig = {
  iceServers: getIceServers(),
  iceCandidatePoolSize: 10,
}

const MEDIA_CONSTRAINTS = {
  video: {
    width: { ideal: 1280, max: 1920 },
    height: { ideal: 720, max: 1080 },
    frameRate: { ideal: 30, max: 60 },
    facingMode: 'user',
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
  },
}

export const useWebRTCStore = create<WebRTCStore>()(
  immer((set, get) => ({
    // Initial state
    // Media
    localStream: null,
    localAudioEnabled: true,
    localVideoEnabled: true,
    localScreenStream: null,
    remoteStreams: new Map(),
    audioContext: null,
    analyserNode: null,
    
    // Participants
    participants: [],
    localParticipantId: null,
    localParticipantName: null,
    peerConnections: new Map(),
    dataChannels: new Map(),
    
    // Room
    roomId: null,
    roomCode: null,
    isConnected: false,
    isConnecting: false,
    isReconnecting: false,
    error: null,
    errorCode: null,
    
    // === Media Actions ===
    
    initLocalMedia: async (video = true, audio = true) => {
      try {
        const constraints: MediaStreamConstraints = {
          video: video ? MEDIA_CONSTRAINTS.video : false,
          audio: audio ? MEDIA_CONSTRAINTS.audio : false,
        }
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        
        set((state) => {
          state.localStream = stream
          state.localAudioEnabled = audio
          state.localVideoEnabled = video
        })
        
        // Setup audio context for analysis
        if (audio) {
          const audioContext = new AudioContext()
          const analyserNode = audioContext.createAnalyser()
          analyserNode.fftSize = 256
          
          const source = audioContext.createMediaStreamSource(stream)
          source.connect(analyserNode)
          
          set({ audioContext, analyserNode })
        }
      } catch (error) {
        console.error('Failed to get local media:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to access camera/microphone'
        set({ error: errorMessage, errorCode: 'MEDIA_ERROR' })
        throw error
      }
    },
    
    stopLocalMedia: () => {
      const { localStream, localScreenStream, audioContext } = get()
      
      localStream?.getTracks().forEach((track) => track.stop())
      localScreenStream?.getTracks().forEach((track) => track.stop())
      audioContext?.close()
      
      set({
        localStream: null,
        localScreenStream: null,
        localAudioEnabled: false,
        localVideoEnabled: false,
        audioContext: null,
        analyserNode: null,
      })
    },
    
    toggleAudio: () => {
      const { localStream, localAudioEnabled } = get()
      
      if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0]
        if (audioTrack) {
          audioTrack.enabled = !audioTrack.enabled
          set((state) => {
            state.localAudioEnabled = audioTrack.enabled
          })
        }
      }
    },
    
    toggleVideo: () => {
      const { localStream, localVideoEnabled } = get()
      
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0]
        if (videoTrack) {
          videoTrack.enabled = !videoTrack.enabled
          set((state) => {
            state.localVideoEnabled = videoTrack.enabled
          })
        }
      }
    },
    
    setLocalAudioEnabled: (enabled: boolean) => {
      const { localStream } = get()
      
      if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0]
        if (audioTrack) {
          audioTrack.enabled = enabled
          set((state) => {
            state.localAudioEnabled = enabled
          })
        }
      }
    },
    
    setLocalVideoEnabled: (enabled: boolean) => {
      const { localStream } = get()
      
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0]
        if (videoTrack) {
          videoTrack.enabled = enabled
          set((state) => {
            state.localVideoEnabled = enabled
          })
        }
      }
    },
    
    startScreenShare: async () => {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920, max: 3840 },
            height: { ideal: 1080, max: 2160 },
            frameRate: { ideal: 30, max: 60 },
          },
          audio: false,
        })
        
        const { localStream, peerConnections } = get()
        
        set((state) => {
          state.localScreenStream = screenStream
        })
        
        // Replace video track in local stream
        if (localStream) {
          const videoTrack = screenStream.getVideoTracks()[0]
          const localVideoTrack = localStream.getVideoTracks()[0]
          
          if (localVideoTrack) {
            localVideoTrack.stop()
            localStream.removeTrack(localVideoTrack)
            localStream.addTrack(videoTrack)
            
            set((state) => {
              state.localVideoEnabled = true
            })
          }
          
          // Update all peer connections
          peerConnections.forEach((pc) => {
            const sender = pc.getSenders().find((s) => s.track?.kind === 'video')
            if (sender && videoTrack) {
              sender.replaceTrack(videoTrack)
            }
          })
        }
        
        // Handle screen share stop
        screenStream.getVideoTracks()[0].onended = () => {
          get().stopScreenShare()
        }
      } catch (error) {
        console.error('Screen share error:', error)
        set({ error: 'Failed to start screen sharing', errorCode: 'SCREEN_SHARE_ERROR' })
        throw error
      }
    },
    
    stopScreenShare: () => {
      const { localStream, localScreenStream, peerConnections } = get()
      
      if (localScreenStream) {
        localScreenStream.getTracks().forEach((track) => track.stop())
        
        set((state) => {
          state.localScreenStream = null
        })
        
        // Revert to camera stream if available
        if (localStream) {
          // Camera track should still be in localStream
          // Just notify peers
          peerConnections.forEach((pc, participantId) => {
            const sender = pc.getSenders().find((s) => s.track?.kind === 'video')
            const cameraTrack = localStream?.getVideoTracks()[0]
            if (sender && cameraTrack) {
              sender.replaceTrack(cameraTrack)
            }
          })
          
          set((state) => {
            state.localVideoEnabled = true
          })
        }
      }
    },
    
    toggleScreenShare: async () => {
      const { localScreenStream } = get()
      
      if (localScreenStream) {
        get().stopScreenShare()
      } else {
        await get().startScreenShare()
      }
    },
    
    // === Participant Actions ===
    
    setLocalParticipantId: (id: string) => {
      set((state) => {
        state.localParticipantId = id
      })
    },
    
    setLocalParticipantName: (name: string) => {
      set((state) => {
        state.localParticipantName = name
      })
    },
    
    addParticipant: (participant: Participant) => {
      set((state) => {
        const existing = state.participants.find((p) => p.id === participant.id)
        if (!existing) {
          state.participants.push(participant)
        }
      })
    },
    
    removeParticipant: (participantId: string) => {
      set((state) => {
        state.participants = state.participants.filter((p) => p.id !== participantId)
      })
      get().removeRemoteStream(participantId)
      get().removePeerConnection(participantId)
    },
    
    updateParticipant: (participantId: string, updates: Partial<Participant>) => {
      set((state) => {
        const participant = state.participants.find((p) => p.id === participantId)
        if (participant) {
          Object.assign(participant, updates)
        }
      })
    },
    
    getParticipant: (participantId: string) => {
      return get().participants.find((p) => p.id === participantId)
    },
    
    // === Remote Streams ===
    
    addRemoteStream: (participantId: string, stream: MediaStream) => {
      set((state) => {
        state.remoteStreams.set(participantId, stream)
        
        const participant = state.participants.find((p) => p.id === participantId)
        if (participant) {
          participant.stream = stream
        }
      })
    },
    
    removeRemoteStream: (participantId: string) => {
      set((state) => {
        state.remoteStreams.delete(participantId)
        
        const participant = state.participants.find((p) => p.id === participantId)
        if (participant) {
          participant.stream = undefined
        }
      })
    },
    
    getRemoteStream: (participantId: string) => {
      return get().remoteStreams.get(participantId)
    },
    
    // === Peer Connections ===
    
    createPeerConnection: (participantId: string) => {
      const { localStream, removeParticipant } = get()
      
      const pc = new RTCPeerConnection(DEFAULT_ICE_CONFIG)
      
      // Add local stream tracks
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream)
        })
      }
      
      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('ICE candidate generated:', event.candidate)
          // Will be sent via signaling service
        }
      }
      
      // Handle remote tracks
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          get().addRemoteStream(participantId, event.streams[0])
        }
      }
      
      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log(`Peer connection state: ${pc.connectionState}`)
        
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          console.warn(`Peer connection failed for ${participantId}`)
          // Could trigger reconnection logic
        }
      }
      
      // Handle ICE connection state
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          console.warn(`ICE connection state: ${pc.iceConnectionState}`)
        }
      }
      
      set((state) => {
        state.peerConnections.set(participantId, pc)
      })
      
      return pc
    },
    
    removePeerConnection: (participantId: string) => {
      const { peerConnections } = get()
      const pc = peerConnections.get(participantId)
      
      if (pc) {
        pc.close()
        set((state) => {
          state.peerConnections.delete(participantId)
          state.dataChannels.delete(participantId)
        })
      }
    },
    
    getPeerConnection: (participantId: string) => {
      return get().peerConnections.get(participantId)
    },
    
    // === WebRTC Signaling ===
    
    createOffer: async (participantId: string) => {
      const pc = get().getPeerConnection(participantId)
      if (!pc) {
        console.error('Peer connection not found:', participantId)
        return null
      }
      
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        })
        await pc.setLocalDescription(offer)
        return offer
      } catch (error) {
        console.error('Create offer error:', error)
        set({ error: 'Failed to create offer', errorCode: 'WEBRTC_ERROR' })
        return null
      }
    },
    
    handleOffer: async (offer: RTCSessionDescriptionInit) => {
      const { peerConnections } = get()
      
      // Get or create peer connection for the offerer
      let pc = Array.from(peerConnections.values())[0]
      if (!pc) {
        console.warn('No peer connection found for offer')
        return null
      }
      
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        return pc.localDescription
      } catch (error) {
        console.error('Handle offer error:', error)
        return null
      }
    },
    
    createAnswer: async (offer: RTCSessionDescriptionInit) => {
      const pc = Array.from(get().peerConnections.values())[0]
      if (!pc) {
        console.error('No peer connection available')
        return null
      }
      
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        return answer
      } catch (error) {
        console.error('Create answer error:', error)
        return null
      }
    },
    
    handleAnswer: async (answer: RTCSessionDescriptionInit) => {
      const pc = Array.from(get().peerConnections.values())[0]
      if (!pc) {
        console.error('No peer connection available')
        return
      }
      
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer))
      } catch (error) {
        console.error('Handle answer error:', error)
      }
    },
    
    addIceCandidate: async (candidate: RTCIceCandidateInit) => {
      const pc = Array.from(get().peerConnections.values())[0]
      if (!pc) {
        return
      }
      
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (error) {
        console.error('Add ICE candidate error:', error)
      }
    },
    
    // === Room State ===
    
    setRoomId: (roomId: string | null) => {
      set((state) => {
        state.roomId = roomId
      })
    },
    
    setRoomCode: (code: string | null) => {
      set((state) => {
        state.roomCode = code
      })
    },
    
    setIsConnected: (connected: boolean) => {
      set((state) => {
        state.isConnected = connected
        if (connected) {
          state.isConnecting = false
          state.isReconnecting = false
          state.error = null
        }
      })
    },
    
    setIsConnecting: (connecting: boolean) => {
      set((state) => {
        state.isConnecting = connecting
      })
    },
    
    setIsReconnecting: (reconnecting: boolean) => {
      set((state) => {
        state.isReconnecting = reconnecting
      })
    },
    
    setError: (error: string | null, code?: string) => {
      set((state) => {
        state.error = error
        state.errorCode = code || null
      })
    },
    
    // === Stats ===
    
    getStats: async (participantId: string): Promise<WebRTCStats | null> => {
      const pc = get().getPeerConnection(participantId)
      if (!pc) return null
      
      try {
        const stats = await pc.getStats()
        let result: WebRTCStats = {
          bytesSent: 0,
          bytesReceived: 0,
          packetsSent: 0,
          packetsReceived: 0,
        }
        
        stats.forEach((report) => {
          if (report.type === 'outbound-rtp') {
            result.bytesSent += report.bytesSent || 0
            result.packetsSent += report.packetsSent || 0
          } else if (report.type === 'inbound-rtp') {
            result.bytesReceived += report.bytesReceived || 0
            result.packetsReceived += report.packetsReceived || 0
            result.roundTripTime = report.roundTripTime
            result.jitter = report.jitter
          } else if (report.type === 'video' && report.kind === 'video') {
            result.frameRate = report.frameRate
            if (report.frameWidth && report.frameHeight) {
              result.resolution = {
                width: report.frameWidth,
                height: report.frameHeight,
              }
            }
          }
        })
        
        return result
      } catch (error) {
        console.error('Get stats error:', error)
        return null
      }
    },
    
    // === Cleanup ===
    
    cleanup: () => {
      const { localStream, localScreenStream, peerConnections, audioContext } = get()
      
      // Close peer connections
      peerConnections.forEach((pc) => pc.close())
      
      // Stop media tracks (optional - keep for quick rejoin)
      // localStream?.getTracks().forEach(track => track.stop())
      localScreenStream?.getTracks().forEach((track) => track.stop())
      
      // Close audio context
      audioContext?.close()
      
      set((state) => {
        state.peerConnections.clear()
        state.dataChannels.clear()
        state.remoteStreams.clear()
        state.participants = []
        state.localScreenStream = null
        state.roomId = null
        state.roomCode = null
        state.isConnected = false
        state.isConnecting = false
        state.isReconnecting = false
        state.error = null
        state.errorCode = null
      })
    },
    
    reset: () => {
      set((state) => {
        state.roomId = null
        state.roomCode = null
        state.isConnected = false
        state.isConnecting = false
        state.isReconnecting = false
        state.error = null
        state.errorCode = null
        state.participants = []
        state.localParticipantId = null
        state.peerConnections.clear()
        state.dataChannels.clear()
        state.remoteStreams.clear()
      })
    },
  }))
)
