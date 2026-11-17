/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        paper: '#FDFCF8',
        rule: '#DCE8F5',
        margin: '#F4B8B8',
        graphite: '#334155',
        pen: '#1D4ED8',
        correction: '#DC2626',
        highlighter: '#FDE047',
        pencil: '#16A34A',
        sharpener: '#EA580C',
        gel: '#7C3AED',
        postit: '#FEF08A',
      },
    },
  },
  plugins: [],
};
