import { SignalingMessage } from '@shared/api-types'

export class SignalingService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private messageQueue: SignalingMessage[] = []
  private onMessageCallback: ((message: SignalingMessage) => void) | null = null
  private onOpenCallback: (() => void) | null = null
  private onCloseCallback: (() => void) | null = null
  private onErrorCallback: ((error: Event) => void) | null = null

  constructor(private baseUrl: string = 'ws://localhost:8080') {}

  connect(roomId: string, participantId: string, name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`${this.baseUrl}/ws/signaling`)

        this.ws.onopen = () => {
          console.log('WebSocket connected')
          this.reconnectAttempts = 0
          this.onOpenCallback?.()
          
          // Send join message
          this.send({
            type: 'join',
            room_id: roomId,
            participant_id: participantId,
            name,
          })
          
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: SignalingMessage = JSON.parse(event.data)
            console.log('Received signaling message:', message)
            this.onMessageCallback?.(message)
          } catch (error) {
            console.error('Failed to parse signaling message:', error)
          }
        }

        this.ws.onclose = () => {
          console.log('WebSocket closed')
          this.onCloseCallback?.()
          this.attemptReconnect(roomId, participantId, name)
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.onErrorCallback?.(error)
          reject(error)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private attemptReconnect(roomId: string, participantId: string, name: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
      
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`)
      
      setTimeout(() => {
        this.connect(roomId, participantId, name).catch(console.error)
      }, delay)
    } else {
      console.error('Max reconnection attempts reached')
    }
  }

  send(message: SignalingMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      // Queue message for later
      this.messageQueue.push(message)
    }
  }

  sendOffer(from: string, to: string, sdp: RTCSessionDescriptionInit, roomId: string): void {
    this.send({
      type: 'offer',
      from,
      to,
      sdp,
      room_id: roomId,
    })
  }

  sendAnswer(from: string, to: string, sdp: RTCSessionDescriptionInit, roomId: string): void {
    this.send({
      type: 'answer',
      from,
      to,
      sdp,
      room_id: roomId,
    })
  }

  sendIceCandidate(from: string, to: string, candidate: RTCIceCandidateInit, roomId: string): void {
    this.send({
      type: 'ice-candidate',
      from,
      to,
      candidate,
      room_id: roomId,
    })
  }

  leave(roomId: string, participantId: string): void {
    this.send({
      type: 'leave',
      room_id: roomId,
      participant_id: participantId,
    })
  }

  onMessage(callback: (message: SignalingMessage) => void): void {
    this.onMessageCallback = callback
  }

  onOpen(callback: () => void): void {
    this.onOpenCallback = callback
  }

  onClose(callback: () => void): void {
    this.onCloseCallback = callback
  }

  onError(callback: (error: Event) => void): void {
    this.onErrorCallback = callback
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.messageQueue = []
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}

// Export singleton instance
export const signalingService = new SignalingService()
