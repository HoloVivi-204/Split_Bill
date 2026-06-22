/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        canvas: '#ffffff',
        fern: { DEFAULT: '#0b7443', dark: '#095936', light: '#d1fadf' },
        sage: '#d1fadf',
        ash: '#eceff4',
        melon: '#fee9d1',
        sky: '#c7e0f8',
        terra: '#715039',
        leaf: '#61bc76',
        'cool-gray': '#5b616b',
        'mint-glow': '#e1fdea',
      },
      borderRadius: {
        card: '12px',
        badge: '80px',
        input: '12px',
        button: '12px',
      },
      boxShadow: {
        panel:
          'rgba(0, 0, 0, 0.04) 0px 1px 3px 0px, rgba(0, 0, 0, 0.06) 0px 4px 8px 0px, rgba(0, 0, 0, 0.04) 0px 12px 24px 0px',
        'panel-hover':
          'rgba(0, 0, 0, 0.06) 0px 2px 6px 0px, rgba(0, 0, 0, 0.08) 0px 8px 16px 0px, rgba(0, 0, 0, 0.06) 0px 16px 32px 0px',
      },
      backgroundImage: {
        'auth-grain':
          'radial-gradient(circle at 1px 1px, rgba(91, 97, 107, 0.08) 1px, transparent 0)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease-out both',
      },
    },
  },
  plugins: [],
};
