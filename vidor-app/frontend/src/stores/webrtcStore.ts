import { create } from 'zustand'
import { Participant, SignalingMessage } from '@shared/api-types'

interface WebRTCState {
  // Local media
  localStream: MediaStream | null
  remoteStreams: Map<string, MediaStream>
  
  // Participants
  participants: Participant[]
  localParticipantId: string | null
  
  // Peer connections
  peerConnections: Map<string, RTCPeerConnection>
  
  // Room state
  roomId: string | null
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  
  // Actions
  setLocalStream: (stream: MediaStream | null) => void
  addRemoteStream: (participantId: string, stream: MediaStream) => void
  removeRemoteStream: (participantId: string) => void
  setLocalParticipantId: (id: string) => void
  addParticipant: (participant: Participant) => void
  removeParticipant: (participantId: string) => void
  setRoomId: (roomId: string) => void
  setIsConnected: (connected: boolean) => void
  setIsConnecting: (connecting: boolean) => void
  setError: (error: string | null) => void
  
  // WebRTC actions
  createPeerConnection: (participantId: string) => RTCPeerConnection
  removePeerConnection: (participantId: string) => void
  createOffer: (participantId: string) => Promise<RTCSessionDescriptionInit>
  createAnswer: (offer: RTCSessionDescriptionInit) => Promise<RTCSessionDescriptionInit>
  
  // Media controls
  toggleAudio: () => void
  toggleVideo: () => void
  toggleScreenShare: () => Promise<void>
  
  // Cleanup
  cleanup: () => void
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

export const useWebRTCStore = create<WebRTCState>((set, get) => ({
  // Initial state
  localStream: null,
  remoteStreams: new Map(),
  participants: [],
  localParticipantId: null,
  peerConnections: new Map(),
  roomId: null,
  isConnected: false,
  isConnecting: false,
  error: null,
  
  setLocalStream: (stream) => set({ localStream: stream }),
  
  addRemoteStream: (participantId, stream) => {
    const remoteStreams = new Map(get().remoteStreams)
    remoteStreams.set(participantId, stream)
    set({ remoteStreams })
  },
  
  removeRemoteStream: (participantId) => {
    const remoteStreams = new Map(get().remoteStreams)
    remoteStreams.delete(participantId)
    set({ remoteStreams })
  },
  
  setLocalParticipantId: (id) => set({ localParticipantId: id }),
  
  addParticipant: (participant) => {
    const participants = get().participants
    if (!participants.find(p => p.id === participant.id)) {
      set({ participants: [...participants, participant] })
    }
  },
  
  removeParticipant: (participantId) => {
    set({ 
      participants: get().participants.filter(p => p.id !== participantId)
    })
    get().removeRemoteStream(participantId)
    get().removePeerConnection(participantId)
  },
  
  setRoomId: (roomId) => set({ roomId }),
  
  setIsConnected: (connected) => set({ isConnected: connected }),
  
  setIsConnecting: (connecting) => set({ isConnecting: connecting }),
  
  setError: (error) => set({ error }),
  
  createPeerConnection: (participantId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS)
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // Send ICE candidate to peer via signaling server
        console.log('ICE candidate:', event.candidate)
      }
    }
    
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        get().addRemoteStream(participantId, event.streams[0])
      }
    }
    
    // Add local stream tracks
    const localStream = get().localStream
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream)
      })
    }
    
    const peerConnections = new Map(get().peerConnections)
    peerConnections.set(participantId, pc)
    set({ peerConnections })
    
    return pc
  },
  
  removePeerConnection: (participantId) => {
    const pc = get().peerConnections.get(participantId)
    if (pc) {
      pc.close()
      const peerConnections = new Map(get().peerConnections)
      peerConnections.delete(participantId)
      set({ peerConnections })
    }
  },
  
  createOffer: async (participantId) => {
    const pc = get().peerConnections.get(participantId)
    if (!pc) throw new Error('Peer connection not found')
    
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    return offer
  },
  
  createAnswer: async (offer) => {
    const pc = Array.from(get().peerConnections.values())[0]
    if (!pc) throw new Error('No peer connections available')
    
    await pc.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    return answer
  },
  
  toggleAudio: () => {
    const localStream = get().localStream
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
      }
    }
  },
  
  toggleVideo: () => {
    const localStream = get().localStream
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
      }
    }
  },
  
  toggleScreenShare: async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      })
      
      const localStream = get().localStream
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0]
        if (videoTrack) {
          videoTrack.stop()
          localStream.removeTrack(videoTrack)
        }
        localStream.addTrack(screenStream.getVideoTracks()[0])
        set({ localStream })
      }
      
      // Update all peer connections
      get().peerConnections.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video')
        if (sender) {
          sender.replaceTrack(screenStream.getVideoTracks()[0])
        }
      })
    } catch (error) {
      console.error('Screen share error:', error)
      set({ error: 'Failed to start screen sharing' })
    }
  },
  
  cleanup: () => {
    const { peerConnections, localStream } = get()
    
    peerConnections.forEach(pc => pc.close())
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
    }
    
    set({
      peerConnections: new Map(),
      localStream: null,
      remoteStreams: new Map(),
      participants: [],
      roomId: null,
      isConnected: false,
      isConnecting: false,
      error: null,
    })
  },
}))
