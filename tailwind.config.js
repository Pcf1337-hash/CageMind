/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#12111A',
        surface: '#1C1B28',
        surface2: '#252436',
        accent: '#A78BFA',
        accent2: '#86EFAC',
        warm: '#FCD34D',
        text: '#F1F0FA',
        muted: '#7B7A96',
        danger: '#F87171',
      },
    },
  },
  plugins: [],
};
