import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'Avenir Next', 'Segoe UI', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
      },
      colors: {
        canvas: {
          50: '#f7f3ef',
          100: '#efe8e1',
          200: '#dfd3c6',
          300: '#cdb9a6',
          400: '#b3987a',
          500: '#9b7b5a',
          600: '#7b5f45',
          700: '#5c4634',
          800: '#3d2f22',
          900: '#241a12',
        },
        ink: {
          50: '#f4f6f7',
          100: '#e3e9ee',
          200: '#c6d4df',
          300: '#9fb2c3',
          400: '#7b90a6',
          500: '#5e7288',
          600: '#4b5a6b',
          700: '#38434f',
          800: '#252c33',
          900: '#14181c',
        },
      },
      boxShadow: {
        soft: '0 12px 30px -18px rgba(20, 24, 28, 0.45)',
      },
    },
  },
  plugins: [],
} satisfies Config
