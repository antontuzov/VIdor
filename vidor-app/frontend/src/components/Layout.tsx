import { Outlet, Link, useLocation } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import ThemeToggle from './ThemeToggle'

export default function Layout() {
  const location = useLocation()
  const { theme } = useTheme()
  
  const isHomePage = location.pathname === '/'
  
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="w-8 h-8 rounded-lg bg-blue-gradient flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xl font-bold gradient-text">Vidor</span>
            </Link>
            
            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link 
                to="/" 
                className={`text-sm font-medium transition-colors ${
                  isHomePage ? 'text-text' : 'text-text-muted hover:text-text'
                }`}
              >
                Home
              </Link>
              <a 
                href="#features" 
                className="text-sm font-medium text-text-muted hover:text-text transition-colors"
              >
                Features
              </a>
              <Link 
                to="/settings" 
                className="text-sm font-medium text-text-muted hover:text-text transition-colors"
              >
                Settings
              </Link>
            </nav>
            
            {/* Actions */}
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              {!isHomePage && (
                <Link to="/" className="btn btn-primary">
                  New Meeting
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>
      
      {/* Footer */}
      <footer className="border-t border-border bg-bg-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-text mb-3">Product</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="text-sm text-text-muted hover:text-text">Features</a></li>
                <li><a href="#" className="text-sm text-text-muted hover:text-text">Security</a></li>
                <li><a href="#" className="text-sm text-text-muted hover:text-text">Enterprise</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text mb-3">Resources</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-text-muted hover:text-text">Documentation</a></li>
                <li><a href="#" className="text-sm text-text-muted hover:text-text">API Reference</a></li>
                <li><a href="#" className="text-sm text-text-muted hover:text-text">Blog</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text mb-3">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-text-muted hover:text-text">About</a></li>
                <li><a href="#" className="text-sm text-text-muted hover:text-text">Careers</a></li>
                <li><a href="#" className="text-sm text-text-muted hover:text-text">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text mb-3">Legal</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-text-muted hover:text-text">Privacy</a></li>
                <li><a href="#" className="text-sm text-text-muted hover:text-text">Terms</a></li>
                <li><a href="#" className="text-sm text-text-muted hover:text-text">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border">
            <p className="text-sm text-text-muted text-center">
              © 2024 Vidor. Built with ❤️ using C++ and React.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
