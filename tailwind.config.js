/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#dc6365',
          500: '#9c1e20',
          600: '#881a1c',
          700: '#741618',
          800: '#601214',
          900: '#4c0e10',
        },
        cream: '#faf8e4',
      },
      backgroundColor: {
        'card': '#faf8e4',
      },
    },
  },
  plugins: [],
}
