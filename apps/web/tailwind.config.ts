import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Linear/Stripe-style restrained palette.
        ink: {
          DEFAULT: '#0a0a0a',
          soft: '#18181b',
          muted: '#52525b',
          subtle: '#a1a1aa',
        },
        surface: {
          DEFAULT: '#ffffff',
          soft: '#fafafa',
          sunken: '#f4f4f5',
        },
        line: {
          DEFAULT: '#e4e4e7',
          strong: '#d4d4d8',
        },
        // Single accent — Homefield green, restrained, used only on CTAs and
        // selected states. Hairline-thin rather than chunky.
        accent: {
          DEFAULT: '#1d5a3a',
          hover: '#164a2e',
          soft: '#f0f6f2',
        },
        danger: {
          DEFAULT: '#b91c1c',
          soft: '#fef2f2',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      spacing: {
        'tap-sm': '44px',
        'tap-md': '52px',
        'tap-lg': '60px',
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
    },
  },
  plugins: [],
};

export default config;
