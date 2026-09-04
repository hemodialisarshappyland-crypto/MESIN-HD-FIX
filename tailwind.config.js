/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hemo: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          500: '#0061a4',
          600: '#004c82',
          700: '#003760',
          900: '#001d36',
        },
        wa: {
          light: '#25D366',
          DEFAULT: '#128C7E',
          dark: '#075E54',
          bg: '#DCF8C6'
        }
      }
    },
  },
  plugins: [],
}
