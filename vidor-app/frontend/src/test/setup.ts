import '@testing-library/jest-dom'

// Mock WebSocket for tests
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  
  readyState = MockWebSocket.CONNECTING
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  
  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.onopen?.()
    }, 0)
  }
  
  send(data: string) {
    console.log('WebSocket send:', data)
  }
  
  close() {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.()
  }
}

// @ts-ignore
global.WebSocket = MockWebSocket as unknown as typeof WebSocket

// Mock mediaDevices
const mockMediaStream = new MediaStream()
const mockVideoTrack = {
  kind: 'video',
  enabled: true,
  stop: () => {},
  getSettings: () => ({ width: 1280, height: 720, frameRate: 30 }),
}
const mockAudioTrack = {
  kind: 'audio',
  enabled: true,
  stop: () => {},
  getSettings: () => ({ sampleRate: 48000, channelCount: 1 }),
}

mockMediaStream.addTrack(mockVideoTrack)
mockMediaStream.addTrack(mockAudioTrack)

Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: async (constraints: MediaStreamConstraints) => {
      return mockMediaStream
    },
    getDisplayMedia: async (constraints: MediaStreamConstraints) => {
      return mockMediaStream
    },
  },
})

// Mock RTCPeerConnection
class MockRTCPeerConnection {
  localDescription: RTCSessionDescription | null = null
  remoteDescription: RTCSessionDescription | null = null
  connectionState = 'connected'
  iceConnectionState = 'connected'
  
  onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null = null
  ontrack: ((event: RTCTrackEvent) => void) | null = null
  onconnectionstatechange: (() => void) | null = null
  oniceconnectionstatechange: (() => void) | null = null
  onnegotiationneeded: (() => void) | null = null
  
  constructor(configuration?: RTCConfiguration) {
    setTimeout(() => {
      this.onconnectionstatechange?.()
    }, 100)
  }
  
  async createOffer(options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit> {
    return { type: 'offer', sdp: 'mock-sdp-offer' }
  }
  
  async createAnswer(options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit> {
    return { type: 'answer', sdp: 'mock-sdp-answer' }
  }
  
  async setLocalDescription(description: RTCSessionDescriptionInit): Promise<void> {
    this.localDescription = description as RTCSessionDescription
  }
  
  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    this.remoteDescription = description as RTCSessionDescription
  }
  
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {}
  
  addTrack(track: MediaStreamTrack, stream?: MediaStream): RTCRTCRtpSender {
    return {} as RTCRTCRtpSender
  }
  
  getSenders(): RTCRtpSender[] {
    return []
  }
  
  close() {
    this.connectionState = 'closed'
  }
  
  getStats(): Promise<RTCStatsReport> {
    return Promise.resolve({} as RTCStatsReport)
  }
}

// @ts-ignore
global.RTCPeerConnection = MockRTCPeerConnection as unknown as typeof RTCPeerConnection
