import { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  sender: string
  text: string
  timestamp: number
  isSystem?: boolean
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'System',
      text: 'Welcome to the meeting!',
      timestamp: Date.now(),
      isSystem: true,
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  useEffect(() => {
    scrollToBottom()
  }, [messages])
  
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!inputValue.trim()) return
    
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'You',
      text: inputValue.trim(),
      timestamp: Date.now(),
    }
    
    setMessages(prev => [...prev, newMessage])
    setInputValue('')
    
    // In Step 3: Send via WebSocket signaling
  }
  
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-text">Chat</h2>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex flex-col ${
              message.sender === 'You' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[80%] px-3 py-2 rounded-lg ${
                message.isSystem
                  ? 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300'
                  : message.sender === 'You'
                  ? 'bg-blue-gradient text-white'
                  : 'bg-bg-darker text-text'
              }`}
            >
              {!message.isSystem && message.sender !== 'You' && (
                <p className="text-xs font-medium mb-1 opacity-75">{message.sender}</p>
              )}
              <p className="text-sm">{message.text}</p>
            </div>
            <span className="text-xs text-text-muted mt-1 px-2">
              {formatTime(message.timestamp)}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-border">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            className="input flex-1"
          />
          <button
            type="submit"
            className="btn btn-primary p-2"
            disabled={!inputValue.trim()}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        
        {/* File upload placeholder */}
        <div className="mt-2 flex items-center">
          <button
            type="button"
            className="text-xs text-text-muted hover:text-text flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            Attach file
          </button>
        </div>
      </form>
    </div>
  )
}
