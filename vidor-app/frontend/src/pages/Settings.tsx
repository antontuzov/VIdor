import { useState } from 'react'
import { useTheme } from '../contexts/ThemeContext'

export default function Settings() {
  const { theme, toggleTheme } = useTheme()
  const [settings, setSettings] = useState({
    audioInput: 'default',
    audioOutput: 'default',
    videoInput: 'default',
    videoQuality: '720p',
    noiseSuppression: true,
    echoCancellation: true,
    autoGainControl: false,
  })

  const handleChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text mb-2">Settings</h1>
        <p className="text-text-muted">Configure your audio and video preferences</p>
      </div>

      <div className="space-y-6">
        {/* Audio Settings */}
        <section className="card p-6">
          <h2 className="text-xl font-semibold text-text mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            Audio
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Microphone
              </label>
              <select
                value={settings.audioInput}
                onChange={(e) => handleChange('audioInput', e.target.value)}
                className="input"
              >
                <option value="default">Default</option>
                <option value="builtin">Built-in Microphone</option>
                <option value="external">External Microphone</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Speaker
              </label>
              <select
                value={settings.audioOutput}
                onChange={(e) => handleChange('audioOutput', e.target.value)}
                className="input"
              >
                <option value="default">Default</option>
                <option value="builtin">Built-in Speaker</option>
                <option value="headphones">Headphones</option>
              </select>
            </div>
            
            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-medium text-text mb-3">Audio Processing</h3>
              
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-sm text-text-muted">Noise Suppression</span>
                  <input
                    type="checkbox"
                    checked={settings.noiseSuppression}
                    onChange={(e) => handleChange('noiseSuppression', e.target.checked)}
                    className="w-4 h-4 rounded border-border text-accent-500 focus:ring-accent-500"
                  />
                </label>
                
                <label className="flex items-center justify-between">
                  <span className="text-sm text-text-muted">Echo Cancellation</span>
                  <input
                    type="checkbox"
                    checked={settings.echoCancellation}
                    onChange={(e) => handleChange('echoCancellation', e.target.checked)}
                    className="w-4 h-4 rounded border-border text-accent-500 focus:ring-accent-500"
                  />
                </label>
                
                <label className="flex items-center justify-between">
                  <span className="text-sm text-text-muted">Auto Gain Control</span>
                  <input
                    type="checkbox"
                    checked={settings.autoGainControl}
                    onChange={(e) => handleChange('autoGainControl', e.target.checked)}
                    className="w-4 h-4 rounded border-border text-accent-500 focus:ring-accent-500"
                  />
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Video Settings */}
        <section className="card p-6">
          <h2 className="text-xl font-semibold text-text mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Video
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Camera
              </label>
              <select
                value={settings.videoInput}
                onChange={(e) => handleChange('videoInput', e.target.value)}
                className="input"
              >
                <option value="default">Default</option>
                <option value="builtin">Built-in Camera</option>
                <option value="external">External Camera</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Video Quality
              </label>
              <select
                value={settings.videoQuality}
                onChange={(e) => handleChange('videoQuality', e.target.value)}
                className="input"
              >
                <option value="480p">480p (SD)</option>
                <option value="720p">720p (HD)</option>
                <option value="1080p">1080p (Full HD)</option>
              </select>
              <p className="text-xs text-text-muted mt-1">
                Higher quality requires more bandwidth
              </p>
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section className="card p-6">
          <h2 className="text-xl font-semibold text-text mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            Appearance
          </h2>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text">Dark Mode</p>
              <p className="text-xs text-text-muted">Toggle dark theme</p>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                theme === 'dark' ? 'bg-accent-500' : 'bg-border'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  theme === 'dark' ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Save button */}
        <div className="flex justify-end">
          <button className="btn btn-primary">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}
