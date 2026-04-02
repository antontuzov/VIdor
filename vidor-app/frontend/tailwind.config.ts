/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Notion-inspired palette
        bg: {
          DEFAULT: '#ffffff',
          soft: '#f8f9fa',
          darker: '#eff0f1',
        },
        text: {
          DEFAULT: '#111827',
          muted: '#6b7280',
          light: '#9ca3af',
        },
        border: {
          DEFAULT: '#e5e7eb',
          hover: '#d1d5db',
        },
        // Blue gradient accent
        accent: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      backgroundImage: {
        'blue-gradient': 'linear-gradient(135deg, #2563EB 0%, #0EA5E9 50%, #06B6D4 100%)',
        'blue-gradient-hover': 'linear-gradient(135deg, #1d4ed8 0%, #0284c7 50%, #0891b2 100%)',
      },
      boxShadow: {
        'notion': '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)',
        'notion-md': '0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 15px rgba(0, 0, 0, 0.1)',
        'notion-lg': '0 10px 15px rgba(0, 0, 0, 0.05), 0 20px 25px rgba(0, 0, 0, 0.1)',
      },
      borderRadius: {
        'notion': '8px',
        'notion-lg': '12px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
