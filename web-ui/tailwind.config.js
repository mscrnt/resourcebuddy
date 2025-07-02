/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'art-dark': 'var(--color-dark-bg, #0a0a0a)',
        'art-darker': 'var(--color-dark-bg-secondary, #171717)',
        'art-gray': {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: 'var(--color-dark-bg-tertiary, #262626)',
          900: 'var(--color-dark-bg-secondary, #171717)',
        },
        'art-accent': ({ opacityValue }) => {
          if (opacityValue !== undefined) {
            return `rgba(var(--color-accent-rgb, 16 185 129), ${opacityValue})`
          }
          return 'rgb(var(--color-accent-rgb, 16 185 129))'
        },
        'art-accent-dark': 'var(--color-primary-dark, #059669)',
        'art-primary': 'var(--color-primary, #10b981)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
  plugins: [],
}