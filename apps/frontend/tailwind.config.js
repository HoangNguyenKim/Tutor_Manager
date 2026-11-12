/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slate: {
          50: '#FFFDFB',
          100: '#FFF5F8',
          200: '#EDD7E0',
          300: '#D8A7B1',
          400: '#C1A8B7',
          500: '#806774',
          600: '#705B68',
          700: '#5C4553',
          800: '#47333F',
          900: '#30232D',
          950: '#211821',
        },
        sky: {
          50: '#FFF5F8',
          100: '#F8DCE6',
          200: '#EFC6D5',
          300: '#E7B0C7',
          400: '#D8A7B1',
          500: '#AC6C85',
          600: '#914D68',
          700: '#783C55',
          800: '#633148',
          900: '#503343',
          950: '#30232D',
        },
      },
    },
  },
  plugins: [],
};
