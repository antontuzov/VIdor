export default function LandingPage() {
  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent-50 via-bg to-bg dark:from-accent-950/20 dark:via-bg dark:to-bg" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-accent-500 mr-2 animate-pulse" />
              Now with AI Transcription
            </div>
            
            {/* Heading */}
            <h1 className="text-4xl md:text-6xl font-bold text-text mb-6 text-balance">
              Vidor –{' '}
              <span className="gradient-text">Crystal-Clear Conferencing</span>
              , AI-Powered
            </h1>
            
            <p className="text-lg md:text-xl text-text-muted max-w-2xl mx-auto mb-8">
              Experience seamless video meetings with real-time AI transcription, 
              HD quality, and end-to-end encryption. Self-hosted for complete control.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="/join/new" className="btn btn-primary px-8 py-3 text-lg">
                Start a Meeting
                <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
              <a href="#features" className="btn btn-secondary px-8 py-3 text-lg">
                Learn More
              </a>
            </div>
          </div>
          
          {/* Hero Image / Mockup */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-blue-gradient/20 blur-3xl rounded-full opacity-30" />
            <div className="relative card overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-accent-500 via-accent-600 to-accent-700 flex items-center justify-center">
                {/* Mock UI */}
                <div className="w-full h-full p-4 grid grid-cols-4 gap-4">
                  {/* Video placeholders */}
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white/10 rounded-lg backdrop-blur-sm flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Control bar mockup */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-bg/90 backdrop-blur-md rounded-full shadow-notion-lg">
                <div className="w-10 h-10 rounded-full bg-bg-darker flex items-center justify-center">
                  <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-gradient flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="w-10 h-10 rounded-full bg-bg-darker flex items-center justify-center">
                  <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6L18 18M6 18L18 6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section id="features" className="py-24 bg-bg-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
              Everything you need for{' '}
              <span className="gradient-text">perfect meetings</span>
            </h2>
            <p className="text-lg text-text-muted max-w-2xl mx-auto">
              Powerful features built for modern teams
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                ),
                title: 'HD Video',
                description: 'Crystal-clear 1080p video with adaptive bitrate streaming',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                ),
                title: 'AI Transcription',
                description: 'Real-time speech-to-text with 95%+ accuracy',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                ),
                title: 'Screen Sharing',
                description: 'Share your screen in full HD with audio',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ),
                title: 'E2E Encryption',
                description: 'End-to-end encryption for complete privacy',
              },
            ].map((feature, i) => (
              <div key={i} className="card p-6 hover-scale-102">
                <div className="w-12 h-12 rounded-lg bg-blue-gradient flex items-center justify-center text-white mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-text mb-2">{feature.title}</h3>
                <p className="text-text-muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Screenshot Carousel */}
      <section className="py-24 bg-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
              Beautiful by design
            </h2>
            <p className="text-lg text-text-muted">
              A clean, intuitive interface that gets out of your way
            </p>
          </div>
          
          <div className="relative">
            {/* Carousel placeholder - will be enhanced in Step 5 */}
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card overflow-hidden group">
                  <div className="aspect-video bg-gradient-to-br from-accent-100 via-accent-50 to-bg dark:from-accent-900/30 dark:via-accent-800/20 dark:to-bg relative">
                    <div className="absolute inset-0 bg-blue-gradient/10 group-hover:bg-blue-gradient/20 transition-colors" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-blue-gradient/20 flex items-center justify-center mx-auto mb-3">
                          <svg className="w-8 h-8 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-text-muted">Screenshot {i}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Navigation dots */}
            <div className="flex justify-center mt-8 space-x-2">
              {[1, 2, 3].map((i) => (
                <button
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === 1 ? 'w-8 bg-accent-500' : 'bg-border'
                  }`}
                  aria-label={`Go to slide ${i}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-24 bg-bg-soft">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-text mb-6">
            Ready to get started?
          </h2>
          <p className="text-lg text-text-muted mb-8">
            Start your first meeting in seconds. No account required.
          </p>
          <a href="/join/new" className="btn btn-primary px-8 py-3 text-lg">
            Create a Room
          </a>
        </div>
      </section>
    </div>
  )
}
