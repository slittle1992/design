import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Pulled from the Homefield logo: dark forest green on cream.
        field: {
          50: '#f7f3e7',
          100: '#f0e9d3',
          200: '#e3d6a8',
          DEFAULT: '#1d5a3a',
          dark: '#13422a',
          darker: '#0b2a1a',
        },
        cream: {
          DEFAULT: '#f5ecd6',
          dark: '#e8dcb8',
        },
      },
      fontFamily: {
        // Placeholder until brand fonts are provided. Bold sans for outdoor legibility.
        display: ['ui-rounded', 'system-ui', 'sans-serif'],
        body: ['system-ui', 'sans-serif'],
      },
      // Touch targets sized for outdoor iPad use. Minimum tap = 56px, ideal = 72px.
      spacing: {
        'tap-sm': '56px',
        'tap-md': '72px',
        'tap-lg': '96px',
      },
    },
  },
  plugins: [],
};

export default config;
