import {
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  RoomInfoResponse,
  HealthResponse,
  StatsResponse,
  TranscriptionRequest,
  TranscriptionResponse,
  SynthesisRequest,
  SynthesisResponse,
  VerifyTokenResponse,
  RefreshTokenResponse,
  ApiResponse,
} from '@shared/api-types'
import { getBackendUrl } from '@shared/env-schema'

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

class ApiClient {
  private baseUrl: string
  
  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || getBackendUrl()
  }
  
  setBaseUrl(url: string): void {
    this.baseUrl = url
  }
  
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    }
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {}),
      },
    }
    
    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`
        let errorCode: string | undefined
        
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorMessage
          errorCode = errorData.code
        } catch {
          // Response might not be JSON
        }
        
        throw new ApiError(errorMessage, response.status, errorCode)
      }
      
      // Handle no-content responses
      if (response.status === 204) {
        return {} as T
      }
      
      const data = await response.json()
      return data as T
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ApiError('Network error - server may be unavailable', 0, 'NETWORK_ERROR')
      }
      
      throw error
    }
  }
  
  // === Health & Stats ===
  
  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/api/health')
  }
  
  async stats(): Promise<StatsResponse> {
    return this.request<StatsResponse>('/api/stats')
  }
  
  // === Room Management ===
  
  async createRoom(request: CreateRoomRequest): Promise<CreateRoomResponse> {
    return this.request<CreateRoomResponse>('/api/rooms', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }
  
  async getRoomInfo(roomId: string): Promise<RoomInfoResponse> {
    return this.request<RoomInfoResponse>(`/api/rooms/${roomId}`)
  }
  
  async deleteRoom(roomId: string): Promise<void> {
    return this.request<void>(`/api/rooms/${roomId}`, {
      method: 'DELETE',
    })
  }
  
  async joinRoom(roomId: string, request: JoinRoomRequest): Promise<JoinRoomResponse> {
    return this.request<JoinRoomResponse>(`/api/rooms/${roomId}/join`, {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }
  
  // === Voice API ===
  
  async transcribe(audio: Blob, options?: { format?: string; language?: string }): Promise<TranscriptionResponse> {
    const formData = new FormData()
    formData.append('audio', audio, 'recording.wav')
    
    if (options?.format) {
      formData.append('format', options.format)
    }
    if (options?.language) {
      formData.append('language', options.language)
    }
    
    return this.request<TranscriptionResponse>('/api/voice/transcribe', {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary
      headers: {},
    })
  }
  
  async synthesize(request: SynthesisRequest): Promise<SynthesisResponse> {
    return this.request<SynthesisResponse>('/api/voice/synthesize', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }
  
  // === Authentication ===
  
  async verifyToken(token: string): Promise<VerifyTokenResponse> {
    return this.request<VerifyTokenResponse>('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
  }
  
  async refreshToken(token: string): Promise<RefreshTokenResponse> {
    return this.request<RefreshTokenResponse>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
  }
}

// Export singleton instance
export const apiClient = new ApiClient()

// Export factory for custom instances
export function createApiClient(baseUrl?: string): ApiClient {
  return new ApiClient(baseUrl)
}

// Convenience hooks/functions
export async function createRoom(request?: Partial<CreateRoomRequest>): Promise<CreateRoomResponse> {
  return apiClient.createRoom({
    user_id: request?.user_id,
    room_name: request?.room_name,
    settings: request?.settings,
  })
}

export async function joinRoom(roomId: string, request?: Partial<JoinRoomRequest>): Promise<JoinRoomResponse> {
  return apiClient.joinRoom(roomId, {
    user_id: request?.user_id,
    name: request?.name,
  })
}

export async function getRoomInfo(roomId: string): Promise<RoomInfoResponse> {
  return apiClient.getRoomInfo(roomId)
}

export async function checkHealth(): Promise<HealthResponse> {
  return apiClient.health()
}
