/**
 * Shared API types for Vidor frontend and backend communication
 */

export interface Room {
  id: string;
  created_at: number;
  participant_count: number;
  status: 'active' | 'closed';
}

export interface CreateRoomRequest {
  user_id?: string;
  room_name?: string;
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

// WebSocket Signaling Messages
export interface SignalingMessage {
  type: 'join' | 'leave' | 'offer' | 'answer' | 'ice-candidate' | 'participant-joined' | 'participant-left' | 'error';
  room_id?: string;
  participant_id?: string;
  from?: string;
  to?: string;
  name?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  message?: string;
}

export interface JoinMessage extends SignalingMessage {
  type: 'join';
  room_id: string;
  participant_id: string;
  name: string;
}

export interface OfferMessage extends SignalingMessage {
  type: 'offer';
  from: string;
  to: string;
  sdp: RTCSessionDescriptionInit;
}

export interface AnswerMessage extends SignalingMessage {
  type: 'answer';
  from: string;
  to: string;
  sdp: RTCSessionDescriptionInit;
}

export interface IceCandidateMessage extends SignalingMessage {
  type: 'ice-candidate';
  from: string;
  to: string;
  candidate: RTCIceCandidateInit;
}

// Voice API Types
export interface TranscriptionRequest {
  audio: Blob | ArrayBuffer;
  format?: 'pcm' | 'wav' | 'mp3';
  sample_rate?: number;
  language?: string;
}

export interface TranscriptionResponse {
  text: string;
  confidence: number;
  language: string;
  timestamps: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export interface SynthesisRequest {
  text: string;
  voice?: string;
  format?: 'wav' | 'mp3' | 'pcm';
  sample_rate?: number;
}

export interface SynthesisResponse {
  audio_url?: string;
  audio_data?: ArrayBuffer;
  format: string;
  sample_rate: number;
  duration: number;
}

// Voice Streaming Types
export interface VoiceStreamChunk {
  session_id: string;
  chunk_id: number;
  data: ArrayBuffer;
  sample_rate: number;
  bits_per_sample: number;
}

export interface TranscriptionUpdate {
  session_id: string;
  text: string;
  is_final: boolean;
  confidence: number;
  timestamp: number;
}

// Participant Types
export interface Participant {
  id: string;
  name: string;
  has_video: boolean;
  has_audio: boolean;
  is_speaking?: boolean;
  stream?: MediaStream;
}

// App Configuration
export interface AppConfig {
  backend_url: string;
  turn_server: string;
  turn_username: string;
  turn_password: string;
  jwt_secret?: string;
}

// Environment Schema
export interface EnvSchema {
  VITE_BACKEND_URL: string;
  VITE_TURN_SERVER: string;
  VITE_TURN_USERNAME: string;
  VITE_TURN_PASSWORD: string;
  VITE_QWEN_API_KEY?: string;
}
