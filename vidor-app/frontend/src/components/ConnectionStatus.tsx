import { useWebRTCStore } from '../stores/webrtcStore'

interface ConnectionStatusProps {
  status?: 'connecting' | 'disconnected' | 'reconnecting' | 'error'
}

export default function ConnectionStatus({ status }: ConnectionStatusProps) {
  const { error, errorCode } = useWebRTCStore()
  
  const getStatusInfo = () => {
    switch (status) {
      case 'connecting':
        return {
          icon: (
            <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ),
          title: 'Connecting to room...',
          message: 'Establishing connection to the signaling server',
          color: 'text-accent-500',
        }
      case 'reconnecting':
        return {
          icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ),
          title: 'Reconnecting...',
          message: 'Connection lost, attempting to reconnect',
          color: 'text-yellow-500',
        }
      case 'disconnected':
        return {
          icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          ),
          title: 'Disconnected',
          message: 'You have been disconnected from the room',
          color: 'text-text-muted',
        }
      case 'error':
      default:
        return {
          icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          title: 'Connection Error',
          message: error || 'Failed to connect to the server',
          color: 'text-red-500',
        }
    }
  }
  
  const statusInfo = getStatusInfo()
  
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-bg-darker/80 backdrop-blur-sm z-50">
      <div className="card p-6 max-w-sm mx-4 text-center">
        <div className={`flex justify-center mb-4 ${statusInfo.color}`}>
          {statusInfo.icon}
        </div>
        <h3 className="text-lg font-semibold text-text mb-2">
          {statusInfo.title}
        </h3>
        <p className="text-sm text-text-muted">
          {statusInfo.message}
        </p>
        
        {errorCode && (
          <div className="mt-4 px-3 py-2 bg-bg-darker rounded text-xs font-mono text-text-muted">
            Code: {errorCode}
          </div>
        )}
      </div>
    </div>
  )
}
