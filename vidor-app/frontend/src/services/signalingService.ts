import { SignalingMessage, SignalingMessageType } from '@shared/api-types'
import { getWebSocketUrl } from '@shared/env-schema'

export type WebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

export interface SignalingServiceConfig {
  url?: string
  reconnectAttempts?: number
  reconnectDelay?: number
  heartbeatInterval?: number
}

export class SignalingService {
  private ws: WebSocket | null = null
  private status: WebSocketStatus = 'disconnected'
  private reconnectAttempts = 0
  private maxReconnectAttempts: number
  private reconnectDelay: number
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private messageQueue: SignalingMessage[] = []
  private statusListeners: Set<(status: WebSocketStatus) => void> = new Set()
  private messageListeners: Set<(message: SignalingMessage) => void> = new Set()
  
  private currentRoomId: string | null = null
  private currentParticipantId: string | null = null
  private currentParticipantName: string | null = null
  
  private heartbeatInterval: number
  
  constructor(config: SignalingServiceConfig = {}) {
    this.maxReconnectAttempts = config.reconnectAttempts ?? 5
    this.reconnectDelay = config.reconnectDelay ?? 1000
    this.heartbeatInterval = config.heartbeatInterval ?? 30000
  }
  
  // === Connection Management ===
  
  connect(roomId: string, participantId: string, name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = this.buildWebSocketUrl()
      
      console.log('[Signaling] Connecting to:', url)
      this.setStatus('connecting')
      
      this.currentRoomId = roomId
      this.currentParticipantId = participantId
      this.currentParticipantName = name
      
      try {
        this.ws = new WebSocket(url)
        
        this.ws.onopen = () => {
          console.log('[Signaling] Connected')
          this.reconnectAttempts = 0
          this.setStatus('connected')
          
          // Send join message
          this.sendInternal({
            type: 'join',
            room_id: roomId,
            participant_id: participantId,
            name: name,
          })
          
          // Start heartbeat
          this.startHeartbeat()
          
          // Flush message queue
          this.flushMessageQueue()
          
          resolve()
        }
        
        this.ws.onmessage = (event) => {
          try {
            const message: SignalingMessage = JSON.parse(event.data)
            console.log('[Signaling] Received:', message.type, message)
            this.handleMessage(message)
          } catch (error) {
            console.error('[Signaling] Parse error:', error)
          }
        }
        
        this.ws.onclose = (event) => {
          console.log('[Signaling] Disconnected:', event.code, event.reason)
          this.setStatus('disconnected')
          this.stopHeartbeat()
          this.attemptReconnect()
        }
        
        this.ws.onerror = (error) => {
          console.error('[Signaling] Error:', error)
          this.setStatus('error')
          reject(error)
        }
      } catch (error) {
        this.setStatus('error')
        reject(error)
      }
    })
  }
  
  disconnect(): void {
    console.log('[Signaling] Disconnecting')
    this.stopHeartbeat()
    this.clearReconnectTimer()
    
    if (this.ws) {
      // Send leave message
      if (this.currentRoomId && this.currentParticipantId) {
        this.sendInternal({
          type: 'leave',
          room_id: this.currentRoomId,
          participant_id: this.currentParticipantId,
        })
      }
      
      this.ws.close()
      this.ws = null
    }
    
    this.setStatus('disconnected')
    this.currentRoomId = null
    this.currentParticipantId = null
    this.currentParticipantName = null
    this.messageQueue = []
  }
  
  private buildWebSocketUrl(): string {
    const baseUrl = getWebSocketUrl()
    
    // Add query params if needed
    const url = new URL(baseUrl)
    
    if (this.currentRoomId) {
      url.searchParams.set('room_id', this.currentRoomId)
    }
    
    return url.toString()
  }
  
  // === Message Sending ===
  
  send(message: SignalingMessage): void {
    if (this.status === 'connected') {
      this.sendInternal(message)
    } else {
      // Queue message for later
      console.log('[Signaling] Queueing message:', message.type)
      this.messageQueue.push(message)
    }
  }
  
  private sendInternal(message: SignalingMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[Signaling] Cannot send, connection not open')
      return
    }
    
    try {
      const data = JSON.stringify(message)
      this.ws.send(data)
      console.log('[Signaling] Sent:', message.type)
    } catch (error) {
      console.error('[Signaling] Send error:', error)
    }
  }
  
  private flushMessageQueue(): void {
    console.log('[Signaling] Flushing message queue:', this.messageQueue.length, 'messages')
    
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()
      if (message) {
        this.sendInternal(message)
      }
    }
  }
  
  // === Signaling Methods ===
  
  sendOffer(to: string, sdp: RTCSessionDescriptionInit): void {
    if (!this.currentRoomId || !this.currentParticipantId) return
    
    this.send({
      type: 'offer',
      room_id: this.currentRoomId,
      from: this.currentParticipantId,
      to,
      sdp,
    })
  }
  
  sendAnswer(to: string, sdp: RTCSessionDescriptionInit): void {
    if (!this.currentRoomId || !this.currentParticipantId) return
    
    this.send({
      type: 'answer',
      room_id: this.currentRoomId,
      from: this.currentParticipantId,
      to,
      sdp,
    })
  }
  
  sendIceCandidate(to: string, candidate: RTCIceCandidateInit): void {
    if (!this.currentRoomId || !this.currentParticipantId) return
    
    this.send({
      type: 'ice-candidate',
      room_id: this.currentRoomId,
      from: this.currentParticipantId,
      to,
      candidate,
    })
  }
  
  sendParticipantUpdate(updates: {
    has_video?: boolean
    has_audio?: boolean
    is_screen_sharing?: boolean
  }): void {
    if (!this.currentRoomId || !this.currentParticipantId) return
    
    this.send({
      type: 'participant-updated',
      room_id: this.currentRoomId,
      participant_id: this.currentParticipantId,
      data: updates,
    })
  }
  
  // === Event Listeners ===
  
  onStatusChange(listener: (status: WebSocketStatus) => void): () => void {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }
  
  onMessage(listener: (message: SignalingMessage) => void): () => void {
    this.messageListeners.add(listener)
    return () => this.messageListeners.delete(listener)
  }
  
  // === Private Methods ===
  
  private handleMessage(message: SignalingMessage): void {
    // Notify all listeners
    this.messageListeners.forEach((listener) => {
      try {
        listener(message)
      } catch (error) {
        console.error('[Signaling] Listener error:', error)
      }
    })
    
    // Handle specific message types
    switch (message.type) {
      case 'heartbeat':
        this.handleHeartbeat()
        break
        
      case 'heartbeat-ack':
        // Heartbeat acknowledged
        break
        
      case 'error':
        console.error('[Signaling] Server error:', message.error)
        break
        
      case 'room-deleted':
        console.warn('[Signaling] Room was deleted')
        this.disconnect()
        break
        
      case 'room-locked':
        console.warn('[Signaling] Room was locked')
        break
        
      case 'room-unlocked':
        console.log('[Signaling] Room was unlocked')
        break
    }
  }
  
  private setStatus(status: WebSocketStatus): void {
    this.status = status
    console.log('[Signaling] Status:', status)
    
    this.statusListeners.forEach((listener) => {
      try {
        listener(status)
      } catch (error) {
        console.error('[Signaling] Status listener error:', error)
      }
    })
  }
  
  getStatus(): WebSocketStatus {
    return this.status
  }
  
  isConnected(): boolean {
    return this.status === 'connected'
  }
  
  // === Reconnection ===
  
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Signaling] Max reconnection attempts reached')
      return
    }
    
    if (!this.currentRoomId || !this.currentParticipantId || !this.currentParticipantName) {
      console.log('[Signaling] Cannot reconnect without room/participant info')
      return
    }
    
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`[Signaling] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    this.setStatus('reconnecting')
    
    this.clearReconnectTimer()
    this.reconnectTimer = setTimeout(() => {
      this.connect(this.currentRoomId!, this.currentParticipantId!, this.currentParticipantName!)
        .catch(console.error)
    }, delay)
  }
  
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
  
  // === Heartbeat ===
  
  private startHeartbeat(): void {
    this.stopHeartbeat()
    
    this.heartbeatTimer = setInterval(() => {
      if (this.status === 'connected') {
        this.sendInternal({ type: 'heartbeat' })
      }
    }, this.heartbeatInterval)
  }
  
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }
  
  private handleHeartbeat(): void {
    // Respond to heartbeat
    this.sendInternal({
      type: 'heartbeat-ack',
      timestamp: Date.now(),
    })
  }
}

// Export singleton instance
export const signalingService = new SignalingService({
  reconnectAttempts: 5,
  reconnectDelay: 1000,
  heartbeatInterval: 30000,
})

// Hook-like function for React components
export function createSignalingService(config?: SignalingServiceConfig): SignalingService {
  return new SignalingService(config)
}
