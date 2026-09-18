import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ["'Courier New'", 'Courier', 'SF Mono', 'monospace'],
      },
      colors: {
        // Mapped to CSS custom properties — always go through variables
        bg:        'hsl(var(--bg) / <alpha-value>)',
        surface:   'hsl(var(--surface) / <alpha-value>)',
        surface2:  'hsl(var(--surface2) / <alpha-value>)',
        border:    'hsl(var(--border) / <alpha-value>)',
        border2:   'hsl(var(--border2) / <alpha-value>)',
        tx:        'hsl(var(--tx) / <alpha-value>)',
        tx2:       'hsl(var(--tx2) / <alpha-value>)',
        tx3:       'hsl(var(--tx3) / <alpha-value>)',
        accent:    'hsl(var(--accent) / <alpha-value>)',
        accent2:   'hsl(var(--accent2) / <alpha-value>)',
        python:    'hsl(var(--python) / <alpha-value>)',
        sql:       'hsl(var(--sql) / <alpha-value>)',
        danger:    'hsl(var(--danger) / <alpha-value>)',
      },
      borderRadius: {
        DEFAULT: '3px',
        md: '4px',
        lg: '6px',
      },
      animation: {
        'cursor-blink': 'blink 1.1s step-end infinite',
        'boss-idle': 'boss-idle 2.8s ease-in-out infinite',
        'damage-flash': 'damage-flash 0.3s ease-out',
        'hp-drop': 'hp-drop 0.4s ease-out',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'boss-idle': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'damage-flash': {
          '0%': { filter: 'brightness(1)' },
          '30%': { filter: 'brightness(3) saturate(0)' },
          '100%': { filter: 'brightness(1)' },
        },
        'hp-drop': {
          '0%': { transform: 'scaleX(1.02)' },
          '100%': { transform: 'scaleX(1)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
