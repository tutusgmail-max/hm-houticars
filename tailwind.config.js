/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#C9A84C',
          dark:    '#A8882E',
          light:   '#E8C76A',
          pale:    '#F5E6B8',
          glow:    'rgba(201,168,76,0.18)',
        },
        navy: {
          DEFAULT: '#0B1623',
          dark:    '#080E18',
          mid:     '#14253A',
          light:   '#1E3353',
          card:    'rgba(13,26,42,0.7)',
          glass:   'rgba(11,22,35,0.85)',
        },
        'gray-custom': {
          light: '#F6F4EF',
          mid:   '#8A95A5',
        },
        'text-muted': '#8A95A5',
        'border-gold': 'rgba(201,168,76,0.15)',
        'border-light': 'rgba(255,255,255,0.08)',
      },
      fontFamily: {
        display:   ['"Playfair Display"', 'Georgia', 'serif'],
        sans:      ['Outfit', 'DM Sans', 'system-ui', 'sans-serif'],
        condensed: ['"Bebas Neue"', 'Barlow Condensed', 'sans-serif'],
        mono:      ['"DM Mono"', 'monospace'],
        barlow:    ['Barlow', 'Outfit', 'sans-serif'],
      },
      borderRadius: {
        card:      '16px',
        'card-sm': '10px',
        'card-lg': '24px',
      },
      animation: {
        float:   'float 4.5s ease-in-out infinite',
        pulse2:  'pulse2 2s ease-in-out infinite',
        shimmer: 'shimmer 1.5s infinite',
        fadeIn:  'fadeIn .5s ease both',
        slideUp: 'slideUp .6s cubic-bezier(.16,1,.3,1) both',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%':     { transform: 'translateY(-12px)' },
        },
        pulse2: {
          '0%,100%': { transform: 'scale(1)' },
          '50%':     { transform: 'scale(1.05)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to: { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'none' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(32px)' },
          to:   { opacity: '1', transform: 'none' },
        },
      },
    },
  },
  plugins: [],
}
