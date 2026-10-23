/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: v('ink'),
        deep: v('deep'),
        surface: v('surface'),
        panel: v('panel'),
        moss: { DEFAULT: v('moss'), dark: v('moss-dark'), soft: v('moss-soft') },
        coral: { DEFAULT: v('coral'), dark: v('coral-dark'), soft: v('coral-soft') },
      },
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] },
      boxShadow: { card: '0 1px 2px rgba(15,42,36,.06), 0 4px 16px rgba(15,42,36,.04)' },
    },
  },
  plugins: [],
};
