/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Identité GMX Motors — vert forêt profond + anthracite industriel
        brand: {
          50: '#f2f8f3',
          100: '#dfeee1',
          200: '#bedcc4',
          300: '#90c29b',
          400: '#5fa26f',
          500: '#3d8651',
          600: '#2c6b3f',
          700: '#235533',
          800: '#1d442a',
          900: '#16351f',
          950: '#0b1c11',
        },
        ink: {
          50: '#f6f7f7',
          100: '#e1e4e3',
          200: '#c3c8c7',
          300: '#9aa3a1',
          400: '#757e7c',
          500: '#5b6462',
          600: '#47504e',
          700: '#3a413f',
          800: '#242928',
          900: '#171b1a',
          950: '#0d100f',
        },
        accent: {
          50: '#fff8ed',
          100: '#ffefd4',
          200: '#ffdba8',
          300: '#ffc070',
          400: '#ff9b37',
          500: '#fd7c11',
          600: '#ee6007',
          700: '#c54608',
          800: '#9c380f',
          900: '#7e3010',
        },
        cream: '#f7f6f2',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['"Barlow Condensed"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(13,16,15,.04), 0 8px 24px -12px rgba(13,16,15,.18)',
        lift: '0 2px 4px rgba(13,16,15,.05), 0 18px 40px -18px rgba(13,16,15,.32)',
        inset: 'inset 0 1px 0 rgba(255,255,255,.06)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .5s ease-out both',
        'fade-in': 'fade-in .35s ease-out both',
        'slide-in': 'slide-in .28s cubic-bezier(.32,.72,0,1) both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};
