/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif'
        ],
        instagram: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif'
        ]
      },
      colors: {
        ig: {
          blue: '#0095f6',
          dark: '#121212',
          surface: '#1c1c1e',
          border: '#2e2e30',
          gradient: {
            from: '#833ab4',
            via: '#fd1d1d',
            to: '#fcb045'
          }
        }
      },
      aspectRatio: {
        'story': '9 / 16',
      },
      animation: {
        'pulse-subtle': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bar-1': 'equalizer 0.8s ease-in-out infinite alternate',
        'bar-2': 'equalizer 1.1s ease-in-out infinite alternate 0.2s',
        'bar-3': 'equalizer 0.7s ease-in-out infinite alternate 0.4s',
        'bar-4': 'equalizer 1.0s ease-in-out infinite alternate 0.1s',
      },
      keyframes: {
        equalizer: {
          '0%': { height: '3px' },
          '100%': { height: '14px' },
        }
      }
    },
  },
  plugins: [],
}
