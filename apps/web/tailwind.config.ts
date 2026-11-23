import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
        heading: ['var(--font-space-grotesk)', 'Space Grotesk', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#0B7A55',
          hover: '#086143',
          tint: '#EAF5EF',
        },
        brand: {
          DEFAULT: '#0B7A55',
          dark: '#086143',
          50: '#EAF5EF',
          100: '#ccebe0',
          200: '#99d7c1',
          300: '#66c3a2',
          400: '#33af83',
          500: '#0B7A55',
          600: '#086143',
          700: '#064932',
          800: '#043021',
          900: '#0F1A15',
          950: '#14201B',
        },
        'brand-dark': '#086143',
        surface: '#FAF8F4',
        page: '#FAF8F4',
        content: {
          primary: '#14201B',
          muted: '#5B6660',
        },
        card: '#FFFFFF',
        border: {
          DEFAULT: '#E7E2D9',
          chip: '#D9D3C7',
          input: '#D9D3C7',
        },
        'input-border': '#D9D3C7',
      },
      maxWidth: {
        store: '1360px',
      },
      borderRadius: {
        '16': '16px',
        '10': '10px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(20,32,27,.04)',
        'card-hover': '0 12px 28px rgba(20,32,27,.10)',
      },
    },
  },
  plugins: [],
};

export default config;
