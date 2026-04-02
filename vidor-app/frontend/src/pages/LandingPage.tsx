import { Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'

interface Testimonial {
  quote: string
  author: string
  role: string
  company: string
}

interface Stat {
  value: string
  label: string
}

export default function LandingPage() {
  const [activeSlide, setActiveSlide] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [stats, setStats] = useState<Stat[]>([
    { value: '0', label: 'Active Meetings' },
    { value: '0', label: 'Users Today' },
    { value: '0', label: 'Hours Saved' },
  ])
  
  const statsRef = useRef<HTMLDivElement>(null)
  const statsAnimated = useRef(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  // Auto-rotate slides
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 3)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  // Animate stats on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !statsAnimated.current) {
          statsAnimated.current = true
          animateStats()
        }
      },
      { threshold: 0.5 }
    )

    if (statsRef.current) {
      observer.observe(statsRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const animateStats = () => {
    const targets = [150, 2500, 10000]
    const duration = 2000
    const steps = 60
    const stepDuration = duration / steps

    let currentStep = 0
    const interval = setInterval(() => {
      currentStep++
      const progress = currentStep / steps
      const easeOut = 1 - Math.pow(1 - progress, 3)

      setStats([
        { value: Math.floor(targets[0] * easeOut).toString(), label: 'Active Meetings' },
        { value: Math.floor(targets[1] * easeOut).toString(), label: 'Users Today' },
        { value: Math.floor(targets[2] * easeOut).toString(), label: 'Hours Saved' },
      ])

      if (currentStep >= steps) {
        clearInterval(interval)
      }
    }, stepDuration)
  }

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-bg-primary">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent-50 via-bg-primary to-bg-primary dark:from-accent-950/20 dark:via-bg-primary dark:to-bg-primary" />
        
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent-200/30 dark:bg-accent-800/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-300/20 dark:bg-accent-700/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className={`text-center transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Badge */}
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 text-sm font-medium mb-6 animate-in fade-in slide-up">
              <span className="w-2 h-2 rounded-full bg-accent-500 mr-2 animate-pulse" />
              Now with AI Transcription
            </div>
            
            {/* Heading */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary mb-6 text-balance">
              Vidor –{' '}
              <span className="gradient-text">Crystal-Clear Conferencing</span>
              , AI-Powered
            </h1>
            
            <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-8">
              Experience seamless video meetings with real-time AI transcription, 
              HD quality, and end-to-end encryption. Self-hosted for complete control.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link 
                to="/join/new" 
                className="btn btn-primary btn-lg px-8 group"
              >
                Start a Meeting
                <svg 
                  className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <a 
                href="#features" 
                className="btn btn-secondary btn-lg px-8"
              >
                Learn More
              </a>
            </div>
          </div>
          
          {/* Hero Image / Mockup */}
          <div className="relative max-w-5xl mx-auto">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-blue-gradient/20 blur-3xl rounded-full opacity-30 animate-pulse-slow" />
            
            {/* App mockup */}
            <div className="relative card overflow-hidden shadow-2xl">
              {/* Browser chrome */}
              <div className="h-10 bg-bg-tertiary border-b border-border-primary flex items-center px-4 space-x-2">
                <div className="flex space-x-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-3 py-1 bg-bg-primary rounded text-xs text-text-tertiary font-mono">
                    vidor.app/meeting
                  </div>
                </div>
              </div>
              
              {/* Video grid mockup */}
              <div className="aspect-video bg-gradient-to-br from-accent-500 via-accent-600 to-accent-700 p-4">
                <div className="grid grid-cols-2 gap-4 h-full">
                  {[1, 2, 3, 4].map((i) => (
                    <div 
                      key={i} 
                      className="bg-white/10 rounded-lg backdrop-blur-sm flex items-center justify-center border border-white/20"
                    >
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2">
                          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <span className="text-white/80 text-sm">Participant {i}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Control bar mockup */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 bg-bg-primary/95 backdrop-blur-md rounded-full shadow-lg border border-border-primary">
                <button className="control-btn control-btn-inactive p-2.5">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
                <button className="control-btn control-btn-active p-2.5">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                <button className="control-btn control-btn-inactive p-2.5">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </button>
                <div className="w-px h-6 bg-border-primary mx-1" />
                <button className="control-btn control-btn-danger p-2.5">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section ref={statsRef} className="py-16 bg-bg-secondary border-y border-border-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl md:text-5xl font-bold gradient-text mb-2">
                  {stat.value}+
                </div>
                <div className="text-text-secondary">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section id="features" className="py-24 bg-bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Everything you need for{' '}
              <span className="gradient-text">perfect meetings</span>
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
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
                color: 'from-blue-500 to-cyan-500',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                ),
                title: 'AI Transcription',
                description: 'Real-time speech-to-text with 95%+ accuracy',
                color: 'from-purple-500 to-pink-500',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                ),
                title: 'Screen Sharing',
                description: 'Share your screen in full HD with audio',
                color: 'from-orange-500 to-red-500',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ),
                title: 'E2E Encryption',
                description: 'End-to-end encryption for complete privacy',
                color: 'from-green-500 to-emerald-500',
              },
            ].map((feature, i) => (
              <div 
                key={i} 
                className="card card-hover p-6 hover-scale transition-all duration-300 group"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  {feature.title}
                </h3>
                <p className="text-text-secondary">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              How it works
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Get started in three simple steps
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Create a Room',
                description: 'Click "Start a Meeting" to instantly create a new room with a unique code.',
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                ),
              },
              {
                step: '02',
                title: 'Share the Link',
                description: 'Share the room code or link with your team. No account required.',
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                ),
              },
              {
                step: '03',
                title: 'Start Meeting',
                description: 'Join with HD video, screen sharing, and AI-powered transcription.',
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                ),
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="card p-8 h-full">
                  <div className="text-6xl font-bold text-accent-100 dark:text-accent-900/30 absolute top-4 right-4">
                    {item.step}
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-blue-gradient flex items-center justify-center text-white mb-4">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-text-primary mb-3">
                    {item.title}
                  </h3>
                  <p className="text-text-secondary">
                    {item.description}
                  </p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <svg className="w-8 h-8 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Screenshot Carousel */}
      <section className="py-24 bg-bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Beautiful by design
            </h2>
            <p className="text-lg text-text-secondary">
              A clean, intuitive interface that gets out of your way
            </p>
          </div>
          
          <div className="relative max-w-5xl mx-auto">
            {/* Carousel */}
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: 'Meeting View',
                  description: 'Clean video grid with intuitive controls',
                  gradient: 'from-accent-100 via-accent-50 to-bg-primary dark:from-accent-900/30',
                  icon: (
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  ),
                },
                {
                  title: 'Screen Sharing',
                  description: 'Share presentations in full HD',
                  gradient: 'from-purple-100 via-purple-50 to-bg-primary dark:from-purple-900/30',
                  icon: (
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  ),
                },
                {
                  title: 'AI Transcription',
                  description: 'Real-time captions powered by AI',
                  gradient: 'from-green-100 via-green-50 to-bg-primary dark:from-green-900/30',
                  icon: (
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  ),
                },
              ].map((slide, i) => (
                <div 
                  key={i}
                  className={`card overflow-hidden group cursor-pointer transition-all duration-300 ${
                    activeSlide === i ? 'ring-2 ring-accent-500 scale-105' : 'hover:scale-102'
                  }`}
                  onClick={() => setActiveSlide(i)}
                >
                  <div className={`aspect-video bg-gradient-to-br ${slide.gradient} relative`}>
                    <div className="absolute inset-0 bg-blue-gradient/10 group-hover:bg-blue-gradient/20 transition-colors" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center p-4">
                        <div className="w-16 h-16 rounded-full bg-blue-gradient/20 flex items-center justify-center mx-auto mb-3 text-accent-600">
                          {slide.icon}
                        </div>
                        <p className="text-sm font-medium text-text-primary">{slide.title}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-text-secondary">{slide.description}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Navigation dots */}
            <div className="flex justify-center mt-8 space-x-2">
              {[0, 1, 2].map((i) => (
                <button
                  key={i}
                  onClick={() => setActiveSlide(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === activeSlide 
                      ? 'w-8 bg-accent-500' 
                      : 'w-2 bg-border-primary hover:bg-border-secondary'
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Loved by teams worldwide
            </h2>
            <p className="text-lg text-text-secondary">
              See what our users have to say
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "Vidor has transformed how our remote team collaborates. The AI transcription is a game-changer.",
                author: "Sarah Chen",
                role: "CTO",
                company: "TechStart",
              },
              {
                quote: "Finally, a video conferencing solution we can self-host. The quality is outstanding.",
                author: "Marcus Rodriguez",
                role: "DevOps Lead",
                company: "SecureCorp",
              },
              {
                quote: "The best part? No account needed. Just share a link and start meeting. Brilliant!",
                author: "Emily Watson",
                role: "Product Manager",
                company: "DesignCo",
              },
            ].map((testimonial, i) => (
              <div key={i} className="card p-8">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, j) => (
                    <svg key={j} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-text-primary mb-6 italic">"{testimonial.quote}"</p>
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white font-semibold mr-3">
                    {testimonial.author.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium text-text-primary">{testimonial.author}</div>
                    <div className="text-sm text-text-secondary">{testimonial.role}, {testimonial.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-24 bg-bg-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="card p-12 bg-gradient-to-br from-accent-600 via-accent-700 to-accent-800 text-white relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Ready to get started?
              </h2>
              <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
                Start your first meeting in seconds. No account required. 
                Self-hosted for complete control.
              </p>
              <Link 
                to="/join/new" 
                className="inline-flex items-center px-8 py-3 bg-white text-accent-700 font-medium rounded-md shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
              >
                Create a Room
                <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
