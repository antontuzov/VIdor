import { useState, useCallback } from 'react'

export interface UseTextToSpeechOptions {
  voice?: string
  rate?: number
  pitch?: number
  volume?: number
  onSpeechStart?: () => void
  onSpeechEnd?: () => void
  onError?: (error: string) => void
}

export function useTextToSpeech(options: UseTextToSpeechOptions = {}) {
  const {
    voice = 'default',
    rate = 1.0,
    pitch = 1.0,
    volume = 1.0,
    onSpeechStart,
    onSpeechEnd,
    onError,
  } = options

  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [supported, setSupported] = useState(true)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [error, setError] = useState<string | null>(null)

  const loadVoices = useCallback(() => {
    if (!window.speechSynthesis) {
      setSupported(false)
      return
    }

    const voices = window.speechSynthesis.getVoices()
    setAvailableVoices(voices)

    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        const updatedVoices = window.speechSynthesis.getVoices()
        setAvailableVoices(updatedVoices)
      }
    }
  }, [])

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) {
      setSupported(false)
      onError?.('Text-to-speech not supported')
      return
    }

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)

    const selectedVoice = availableVoices.find(v =>
      v.name === voice || v.lang.startsWith(voice)
    ) || availableVoices.find(v => v.default) || availableVoices[0]

    if (selectedVoice) {
      utterance.voice = selectedVoice
    }

    utterance.rate = rate
    utterance.pitch = pitch
    utterance.volume = volume

    utterance.onstart = () => {
      setIsSpeaking(true)
      setIsPaused(false)
      onSpeechStart?.()
    }

    utterance.onend = () => {
      setIsSpeaking(false)
      setIsPaused(false)
      onSpeechEnd?.()
    }

    utterance.onerror = (event) => {
      setIsSpeaking(false)
      setIsPaused(false)
      const errorMessage = event.error === 'interrupted'
        ? 'Speech interrupted'
        : `Speech error: ${event.error}`
      setError(errorMessage)
      onError?.(errorMessage)
    }

    window.speechSynthesis.speak(utterance)
  }, [voice, rate, pitch, volume, availableVoices, onSpeechStart, onSpeechEnd, onError])

  const pause = useCallback(() => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause()
      setIsPaused(true)
    }
  }, [])

  const resume = useCallback(() => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
      setIsPaused(false)
    }
  }, [])

  const togglePause = useCallback(() => {
    if (isPaused) {
      resume()
    } else {
      pause()
    }
  }, [isPaused, pause, resume])

  const stop = useCallback(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      setIsPaused(false)
    }
  }, [])

  useState(() => {
    loadVoices()
  })

  return {
    isSpeaking,
    isPaused,
    supported,
    availableVoices,
    error,
    speak,
    pause,
    resume,
    togglePause,
    stop,
    loadVoices,
  }
}
