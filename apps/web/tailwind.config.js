/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        teal:  { DEFAULT: '#0d9488', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e' },
        brand: { DEFAULT: '#0d9488', light: '#ccfbf1', dark: '#134e4a' },
      },
    },
  },
  plugins: [],
};
