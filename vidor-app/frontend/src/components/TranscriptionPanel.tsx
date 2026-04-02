import { useRef, useEffect } from 'react'

interface TranscriptionWord {
  text: string
  start: number
  end: number
  confidence: number
}

interface TranscriptionResult {
  text: string
  language: string
  confidence: number
  words: TranscriptionWord[]
  isFinal: boolean
  timestamp: number
}

interface TranscriptionPanelProps {
  transcriptions: TranscriptionResult[]
  isRecording?: boolean
  onToggleRecording?: () => void
}

export default function TranscriptionPanel({
  transcriptions,
  isRecording = false,
  onToggleRecording,
}: TranscriptionPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcriptions])

  return (
    <div className="h-full flex flex-col bg-bg-primary border-l border-border-primary">
      {/* Header */}
      <div className="p-4 border-b border-border-primary">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">
            Live Transcription
          </h2>
          {onToggleRecording && (
            <button
              onClick={onToggleRecording}
              className={`p-2 rounded-full transition-colors ${
                isRecording
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-bg-secondary text-text-secondary hover:bg-bg-hover'
              }`}
              title={isRecording ? 'Stop transcription' : 'Start transcription'}
            >
              {isRecording ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>
          )}
        </div>
        
        {/* Status indicator */}
        <div className="flex items-center mt-2 space-x-2">
          <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className="text-sm text-text-secondary">
            {isRecording ? 'Transcribing...' : 'Transcription paused'}
          </span>
        </div>
      </div>

      {/* Transcriptions */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {transcriptions.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <p className="text-text-secondary text-sm">
              No transcription yet
            </p>
            <p className="text-text-tertiary text-xs mt-1">
              Click the microphone to start
            </p>
          </div>
        ) : (
          transcriptions.map((transcription, index) => (
            <div key={index} className={`space-y-2 ${!transcription.isFinal ? 'opacity-70' : ''}`}>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-text-primary">Speaker</span>
                <span className="text-xs text-text-tertiary">
                  {new Date(transcription.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              
              <div className="text-text-secondary leading-relaxed">
                {transcription.text}
                {!transcription.isFinal && (
                  <span className="inline-block w-2 h-4 ml-1 bg-accent-500 animate-pulse" />
                )}
              </div>

              {/* Word-level timestamps (if available) */}
              {transcription.words && transcription.words.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {transcription.words.map((word: TranscriptionWord, i: number) => (
                    <span
                      key={i}
                      className="text-xs px-1.5 py-0.5 rounded bg-bg-tertiary text-text-tertiary"
                      title={`${word.start.toFixed(2)}s - ${word.end.toFixed(2)}s`}
                    >
                      {word.text}
                    </span>
                  ))}
                </div>
              )}

              {/* Confidence indicator */}
              {transcription.confidence > 0 && (
                <div className="flex items-center space-x-1">
                  <div className="flex-1 h-1 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        transcription.confidence > 0.8
                          ? 'bg-green-500'
                          : transcription.confidence > 0.6
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${transcription.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-tertiary">
                    {Math.round(transcription.confidence * 100)}%
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer actions */}
      {transcriptions.length > 0 && (
        <div className="p-4 border-t border-border-primary space-y-2">
          <button
            onClick={() => {
              const text = transcriptions.map(t => t.text).join(' ')
              navigator.clipboard.writeText(text)
            }}
            className="btn btn-secondary w-full btn-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy Transcript
          </button>
          
          <button
            onClick={() => {
              const text = transcriptions.map(t => t.text).join(' ')
              const blob = new Blob([text], { type: 'text/plain' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `transcript-${new Date().toISOString()}.txt`
              a.click()
              URL.revokeObjectURL(url)
            }}
            className="btn btn-ghost w-full btn-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
        </div>
      )}
    </div>
  )
}
