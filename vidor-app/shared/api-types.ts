/**
 * Shared API types for Vidor frontend and backend communication
 */

// Room types
export interface Room {
  id: string;
  code?: string;
  name?: string;
  created_at: number;
  participant_count: number;
  status: 'active' | 'waiting' | 'closed';
  settings?: RoomSettings;
}

export interface RoomSettings {
  max_participants?: number;
  is_locked?: boolean;
  require_password?: boolean;
  allow_screen_share?: boolean;
  allow_chat?: boolean;
}

export interface CreateRoomRequest {
  user_id?: string;
  room_name?: string;
  settings?: Partial<RoomSettings>;
}

export interface CreateRoomResponse {
  room_id: string;
  token: string;
  created_at: number;
}

export interface RoomInfoResponse {
  room_id: string;
  participant_count: number;
  status: string;
}

export interface JoinRoomRequest {
  user_id?: string;
  name?: string;
}

export interface JoinRoomResponse {
  room_id: string;
  token: string;
  user_id: string;
}

// WebSocket Signaling Message types
export type SignalingMessageType =
  | 'join'
  | 'leave'
  | 'joined'
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'participant-joined'
  | 'participant-left'
  | 'participant-updated'
  | 'room-locked'
  | 'room-unlocked'
  | 'room-deleted'
  | 'heartbeat'
  | 'heartbeat-ack'
  | 'error'
  | 'server-shutdown';

export interface SignalingMessage {
  type: SignalingMessageType;
  room_id?: string;
  participant_id?: string;
  from?: string;
  to?: string;
  name?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  message?: string;
  error?: string;
  data?: Record<string, unknown>;
  participants?: ParticipantInfo[];
  has_video?: boolean;
  has_audio?: boolean;
  is_screen_sharing?: boolean;
  timestamp?: number;
}

export interface ParticipantInfo {
  id: string;
  name: string;
  has_video: boolean;
  has_audio: boolean;
  is_speaking?: boolean;
  is_screen_sharing?: boolean;
}

// WebRTC types
export interface PeerConnectionConfig {
  iceServers: RTCIceServer[];
  iceCandidatePoolSize?: number;
}

export interface WebRTCStats {
  bytesSent: number;
  bytesReceived: number;
  packetsSent: number;
  packetsReceived: number;
  roundTripTime?: number;
  jitter?: number;
  frameRate?: number;
  resolution?: { width: number; height: number };
}

// Voice API types
export interface TranscriptionRequest {
  audio: Blob | ArrayBuffer;
  format?: 'pcm' | 'wav' | 'mp3' | 'ogg';
  sample_rate?: number;
  language?: string;
}

export interface TranscriptionWord {
  text: string;
  start: number;
  end: number;
  confidence: number;
}

export interface TranscriptionResponse {
  text: string;
  language: string;
  confidence: number;
  words: TranscriptionWord[];
  is_final: boolean;
  session_id?: string;
  timestamp: number;
}

export interface SynthesisRequest {
  text: string;
  voice?: string;
  format?: 'wav' | 'mp3' | 'pcm' | 'ogg';
  sample_rate?: number;
  speed?: number;
  pitch?: number;
}

export interface SynthesisResponse {
  audio_url?: string;
  audio_data?: ArrayBuffer;
  format: string;
  sample_rate: number;
  duration: number;
}

export interface TranscriptionUpdate {
  session_id: string;
  text: string;
  is_final: boolean;
  confidence: number;
  timestamp: number;
  words?: TranscriptionWord[];
}

// Participant types
export interface Participant {
  id: string;
  name: string;
  has_video: boolean;
  has_audio: boolean;
  is_speaking?: boolean;
  is_screen_sharing?: boolean;
  stream?: MediaStream;
  joined_at?: number;
  role?: 'host' | 'participant' | 'guest';
}

// Chat types
export interface ChatMessage {
  id: string;
  room_id?: string;
  sender_id: string;
  sender_name: string;
  text: string;
  timestamp: number;
  is_system?: boolean;
  is_deleted?: boolean;
}

// App Configuration
export interface AppConfig {
  backend_url: string;
  ws_url: string;
  turn_server: string;
  turn_username: string;
  turn_password: string;
  ice_servers: RTCIceServer[];
}

// Environment Schema
export interface EnvSchema {
  VITE_BACKEND_URL: string;
  VITE_WS_URL: string;
  VITE_TURN_SERVER: string;
  VITE_TURN_USERNAME: string;
  VITE_TURN_PASSWORD: string;
  VITE_QWEN_API_KEY?: string;
  VITE_APP_MODE: 'development' | 'production' | 'test';
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  status: 'success' | 'error';
}

export interface HealthResponse {
  status: string;
  timestamp: number;
  version: string;
}

export interface StatsResponse {
  total_rooms: number;
  active_rooms: number;
  total_participants: number;
  total_connections: number;
  uptime_seconds: number;
  messages_sent: number;
  messages_received: number;
  errors: number;
}

// Auth types
export interface AuthToken {
  token: string;
  expires_at?: number;
}

export interface TokenPayload {
  user_id: string;
  room_id: string;
  name: string;
  role: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface VerifyTokenResponse {
  valid: boolean;
  payload?: TokenPayload;
}

export interface RefreshTokenResponse {
  token: string;
}
