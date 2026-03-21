/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Azure Ethereal Design System
        primary: {
          DEFAULT: '#1A73E8',
          light: '#257DF1',
          dim: '#BFDBFE',
          fixed: '#DBEAFE',
          container: '#257DF1',
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#1A73E8',
          600: '#1A73E8',
          700: '#172554',
          800: '#0B1B3D',
          900: '#071228',
        },
        surface: {
          DEFAULT: '#F0F7FF',
          bright: '#FFFFFF',
          dim: '#E0E9F5',
          variant: '#F1F5F9',
        },
        midnight: '#0B1B3D',
        tertiary: {
          DEFAULT: '#38BDF8',
          container: '#BAE6FD',
          fixed: '#E0F2FE',
        },
        success: {
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#059669',
        },
        danger: {
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
        },
        warning: {
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
        },
        outline: {
          DEFAULT: '#BFDBFE',
          variant: '#E2E8F0',
        },
      },
      fontFamily: {
        display: ['Inter'],
        body: ['Inter'],
        label: ['Inter'],
      },
      borderRadius: {
        DEFAULT: '16px',
        lg: '24px',
        xl: '32px',
      },
    },
  },
  plugins: [],
};
