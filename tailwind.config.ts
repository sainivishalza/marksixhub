import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

// Design tokens: see DESIGN.md. Gold is for actions; balls are the only saturated colour on the page.
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: '#0A0E1A',
        panel: '#111827',
        raised: '#182236',
        line: 'rgba(212,175,55,0.22)',
        ivory: '#F3EFE4',
        mute: '#A9B0C0',
        gold: { DEFAULT: '#D4AF37', bright: '#F5C542', deep: '#8F7320' },
        win: '#10B981',
        miss: '#EF4444',
        ball: { red: '#C8102E', blue: '#1F4FD8', green: '#12804A' },
        // Softer tones for the outlined, not-yet-picked numbers on the dark board.
        tone: { red: '#E8645F', blue: '#5C93C4', green: '#7FBF63' },
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: { '2xl': '1rem', '3xl': '1.5rem' },
      boxShadow: {
        glow: '0 0 0 2px #F5C542, 0 0 22px 4px rgba(245,197,66,0.45)',
        panel: '0 18px 50px -20px rgba(0,0,0,0.7)',
        lacquer: 'inset 0 -6px 10px rgba(0,0,0,0.35), inset 0 4px 8px rgba(255,255,255,0.25), 0 6px 12px rgba(0,0,0,0.45)',
      },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
      },
      animation: {
        shimmer: 'shimmer 6s linear infinite',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [animate],
};

export default config;
