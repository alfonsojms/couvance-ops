/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/client/index.html',
    './src/client/src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    screens: {
      'xs': '420px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        background: '#09090b',
        foreground: '#f4f4f5',
        card: {
          DEFAULT: '#121215',
          foreground: '#f4f4f5',
          border: '#27272a',
        },
        couvance: {
          blue: {
            DEFAULT: '#004BFF',
            hover: '#1a5eff',
            subtle: 'rgba(0, 75, 255, 0.12)',
            border: 'rgba(0, 75, 255, 0.35)',
            glow: 'rgba(0, 75, 255, 0.25)',
          },
          lime: {
            DEFAULT: '#BDEF00',
            hover: '#cbff00',
            subtle: 'rgba(189, 239, 0, 0.12)',
            border: 'rgba(189, 239, 0, 0.35)',
            glow: 'rgba(189, 239, 0, 0.25)',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      transitionDuration: {
        '150': '150ms',
      },
      transitionTimingFunction: {
        'out': 'ease-out',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-6px)' },
          '40%, 80%': { transform: 'translateX(6px)' },
        },
      },
      animation: {
        shake: 'shake 0.35s cubic-bezier(0.36, 0.07, 0.19, 0.97) both',
      },
    },
  },
  plugins: [],
};
