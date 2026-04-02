import { useState, useCallback, useRef, useEffect } from 'react'

export interface UseVoiceTranscriptionOptions {
  language?: string
  sampleRate?: number
  autoStart?: boolean
  onTranscription?: (text: string, isFinal: boolean) => void
  onError?: (error: string) => void
}

export interface TranscriptionWord {
  text: string
  start: number
  end: number
  confidence: number
}

export interface TranscriptionResult {
  text: string
  language: string
  confidence: number
  words: TranscriptionWord[]
  isFinal: boolean
  timestamp: number
}

export function useVoiceTranscription(options: UseVoiceTranscriptionOptions = {}) {
  const {
    language = 'en',
    sampleRate = 16000,
    autoStart = false,
    onTranscription,
    onError,
  } = options

  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcriptHistory, setTranscriptHistory] = useState<TranscriptionResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const animationFrameRef = useRef<number>()

  const initAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      const audioContext = new AudioContext({ sampleRate })
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256

      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      audioContextRef.current = audioContext
      analyserRef.current = analyser

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const mediaRecorder = new MediaRecorder(stream, { mimeType })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        chunksRef.current = []
        if (blob.size > 0) {
          await processAudio(blob)
        }
      }

      mediaRecorderRef.current = mediaRecorder

      const monitorAudioLevel = () => {
        if (!analyserRef.current) return
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current!.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        setAudioLevel(average / 255)
        animationFrameRef.current = requestAnimationFrame(monitorAudioLevel)
      }

      if (autoStart) {
        await startRecording()
      }

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
        audioContext.close()
        stream.getTracks().forEach(track => track.stop())
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize audio'
      setError(errorMessage)
      onError?.(errorMessage)
      throw err
    }
  }, [sampleRate, autoStart, onError])

  const processAudio = useCallback(async (blob: Blob) => {
    setIsProcessing(true)

    try {
      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')
      formData.append('language', language)

      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'
      const response = await fetch(`${backendUrl}/api/voice/transcribe`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Transcription failed')
      }

      const result: TranscriptionResult = await response.json()

      setTranscriptHistory(prev => [...prev, result])
      onTranscription?.(result.text, result.isFinal)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transcription error'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }, [language, onTranscription, onError])

  const startRecording = useCallback(async () => {
    if (!mediaRecorderRef.current) {
      await initAudio()
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
      chunksRef.current = []
      mediaRecorderRef.current.start(1000)
      setIsRecording(true)
      setError(null)

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [initAudio])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      stopRecording()
    } else {
      await startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  const clearTranscription = useCallback(() => {
    setTranscriptHistory([])
    setError(null)
  }, [])

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop()
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  return {
    isRecording,
    isProcessing,
    transcriptHistory,
    error,
    audioLevel,
    startRecording,
    stopRecording,
    toggleRecording,
    clearTranscription,
    initAudio,
  }
}
