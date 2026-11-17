/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Space Grotesk"', '"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        canvas: 'rgb(var(--bg-primary-rgb) / <alpha-value>)',
        surface: 'rgb(var(--bg-card-rgb) / <alpha-value>)',
        cloud: 'rgb(var(--bg-cloud-rgb) / <alpha-value>)',
        ink: 'rgb(var(--text-primary-rgb) / <alpha-value>)',
        muted: 'rgb(var(--text-muted-rgb) / <alpha-value>)',
        accent: 'rgb(var(--accent-primary-rgb) / <alpha-value>)',
        'accent-hover': 'rgb(var(--accent-secondary-rgb) / <alpha-value>)',
        'accent-soft': 'var(--accent-soft)',
        'accent-ink': 'rgb(var(--accent-ink-rgb) / <alpha-value>)',
        line: 'var(--border-subtle)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
        btn: 'var(--radius-btn)',
      },
      boxShadow: {
        soft: 'var(--shadow-card)',
        glow: '0 14px 36px -10px var(--accent-glow)',
      },
    },
  },
  plugins: [],
};
