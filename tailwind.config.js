/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Identité GMX Motors — reprise exacte du logo : vert tracteur, or de la marque,
        // anthracite industriel (#0d100f pour les aplats sombres).
        brand: {
          50: '#f2f9ee',
          100: '#ddf0d3',
          200: '#b9e0a5',
          300: '#8fcb74',
          400: '#68b74c',
          500: '#4e9c37',
          600: '#3a7d28',
          700: '#2e6a1e',
          800: '#245419',
          900: '#1b4014',
          950: '#0f240b',
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
          50: '#fffaeb',
          100: '#fff2ce',
          200: '#ffe29b',
          300: '#ffcd5e',
          400: '#ffb92b',
          500: '#efa501',
          600: '#d18f00',
          700: '#8a5f00',
          800: '#6b4a00',
          900: '#4a3200',
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
