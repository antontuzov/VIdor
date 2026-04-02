import { useEffect, useCallback } from 'react'
import { useWebRTCStore } from '../stores/webrtcStore'
import { signalingService } from '../services/signalingService'
import { ParticipantInfo } from '@shared/api-types'

interface UseConferenceRoomOptions {
  autoJoin?: boolean
  autoMedia?: boolean
  onParticipantJoin?: (participant: ParticipantInfo) => void
  onParticipantLeave?: (participantId: string) => void
  onParticipantUpdate?: (participantId: string, updates: Partial<ParticipantInfo>) => void
  onError?: (error: string) => void
}

interface UseConferenceRoomReturn {
  isConnected: boolean
  isConnecting: boolean
  localAudioEnabled: boolean
  localVideoEnabled: boolean
  participants: ParticipantInfo[]
  roomId: string | null
  error: string | null
  joinRoom: (roomId: string, name: string) => Promise<void>
  leaveRoom: () => void
  toggleAudio: () => void
  toggleVideo: () => void
  toggleScreenShare: () => Promise<void>
}

export function useConferenceRoom(options: UseConferenceRoomOptions = {}): UseConferenceRoomReturn {
  const {
    autoJoin = true,
    autoMedia = true,
    onParticipantJoin,
    onParticipantLeave,
    onParticipantUpdate,
    onError,
  } = options

  const {
    localAudioEnabled,
    localVideoEnabled,
    participants,
    roomId,
    isConnected,
    isConnecting,
    error,
    initLocalMedia,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    setLocalParticipantId,
    setLocalParticipantName,
    setRoomId,
    setIsConnected,
    setError,
    addParticipant,
    removeParticipant,
    updateParticipant,
    createPeerConnection,
    createOffer,
    addIceCandidate,
    cleanup,
  } = useWebRTCStore()

  const handleMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'joined':
        setIsConnected(true)
        if (message.participants) {
          message.participants.forEach((p: ParticipantInfo) => {
            addParticipant(p)
          })
        }
        break

      case 'participant-joined':
        if (message.participant_id && message.name) {
          const participant: ParticipantInfo = {
            id: message.participant_id,
            name: message.name,
            has_video: true,
            has_audio: true,
          }
          addParticipant(participant)
          onParticipantJoin?.(participant)

          const pc = createPeerConnection(message.participant_id)
          pc.onnegotiationneeded = async () => {
            const offer = await createOffer(message.participant_id!)
            if (offer) {
              signalingService.sendOffer(message.participant_id!, offer)
            }
          }
        }
        break

      case 'participant-left':
        if (message.participant_id) {
          removeParticipant(message.participant_id)
          onParticipantLeave?.(message.participant_id)
        }
        break

      case 'participant-updated':
        if (message.participant_id) {
          const updates: Partial<ParticipantInfo> = {}
          if (typeof message.has_video === 'boolean') updates.has_video = message.has_video
          if (typeof message.has_audio === 'boolean') updates.has_audio = message.has_audio
          if (typeof message.is_screen_sharing === 'boolean') updates.is_screen_sharing = message.is_screen_sharing

          updateParticipant(message.participant_id, updates)
          onParticipantUpdate?.(message.participant_id, updates)
        }
        break

      case 'offer':
        handleOffer(message)
        break

      case 'answer':
        handleAnswer(message)
        break

      case 'ice-candidate':
        handleIceCandidate(message)
        break

      case 'error':
        setError(message.error || 'Server error', 'SERVER_ERROR')
        onError?.(message.error || 'Server error')
        break

      case 'room-deleted':
        setError('Room was deleted', 'ROOM_DELETED')
        leaveRoom()
        break
    }
  }, [addParticipant, removeParticipant, updateParticipant, createPeerConnection, createOffer, setIsConnected, setError, onParticipantJoin, onParticipantLeave, onParticipantUpdate, onError])

  const handleOffer = useCallback(async (message: any) => {
    if (!message.from || !message.sdp) return

    const pc = createPeerConnection(message.from)

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(message.sdp))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      signalingService.sendAnswer(message.from, answer)
    } catch (err) {
      console.error('Handle offer error:', err)
      setError('Failed to establish connection', 'WEBRTC_ERROR')
    }
  }, [createPeerConnection, setError])

  const handleAnswer = useCallback(async (message: any) => {
    if (!message.from || !message.sdp) return

    const pc = createPeerConnection(message.from)

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(message.sdp))
    } catch (err) {
      console.error('Handle answer error:', err)
    }
  }, [createPeerConnection])

  const handleIceCandidate = useCallback(async (message: any) => {
    if (!message.from || !message.candidate) return

    try {
      await addIceCandidate(message.candidate)
    } catch (err) {
      console.error('Add ICE candidate error:', err)
    }
  }, [addIceCandidate])

  useEffect(() => {
    const unsubscribeMessage = signalingService.onMessage(handleMessage)
    return () => unsubscribeMessage()
  }, [handleMessage])

  const joinRoom = useCallback(async (roomId: string, name: string) => {
    try {
      setError(null)

      if (autoMedia) {
        await initLocalMedia(true, true)
      }

      const participantId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setLocalParticipantId(participantId)
      setLocalParticipantName(name)
      setRoomId(roomId)

      await signalingService.connect(roomId, participantId, name)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join room'
      setError(errorMessage, 'JOIN_ERROR')
      onError?.(errorMessage)
      throw err
    }
  }, [autoMedia, initLocalMedia, setLocalParticipantId, setLocalParticipantName, setRoomId, setError, onError])

  const leaveRoom = useCallback(() => {
    signalingService.disconnect()
    cleanup()
  }, [cleanup])

  const toggleScreenShare = useCallback(async () => {
    try {
      const localScreenStream = useWebRTCStore.getState().localScreenStream
      if (localScreenStream) {
        stopScreenShare()
        signalingService.sendParticipantUpdate({ is_screen_sharing: false })
      } else {
        await startScreenShare()
        signalingService.sendParticipantUpdate({ is_screen_sharing: true })
      }
    } catch (err) {
      console.error('Screen share error:', err)
      throw err
    }
  }, [startScreenShare, stopScreenShare])

  useEffect(() => {
    if (autoJoin && roomId) {
      // Already joined
    }
    return () => {
      leaveRoom()
    }
  }, [])

  return {
    isConnected,
    isConnecting,
    localAudioEnabled,
    localVideoEnabled,
    participants,
    roomId,
    error,
    joinRoom,
    leaveRoom,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
  }
}
