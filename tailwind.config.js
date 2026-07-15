/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7f7',
          100: '#d5ebec',
          200: '#aed8da',
          300: '#7dbdc2',
          400: '#4d9da4',
          500: '#348189',
          600: '#2b6a73',
          700: '#27565e',
          800: '#24474e',
          900: '#1a3a41',
          950: '#0e2429'
        },
        sand: {
          50: '#faf8f5',
          100: '#f2ede4',
          200: '#e5dbc9'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        logo: ['Sora', 'Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.04)'
      }
    }
  },
  plugins: []
};
