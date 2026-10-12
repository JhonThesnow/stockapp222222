// tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        }
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out forwards',
        'fadeIn': 'fade-in 0.2s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.25s ease-out forwards',
        'scale-in': 'scale-in 0.2s ease-out forwards',
        'slide-in-left': 'slide-in-left 0.25s ease-out forwards',
      }
    },
  },
  plugins: [],
}