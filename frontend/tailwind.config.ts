import type { Config } from 'tailwindcss';

const config: Config = {
   content: [
      './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
      './src/components/**/*.{js,ts,jsx,tsx,mdx}',
      './src/features/**/*.{js,ts,jsx,tsx,mdx}',
      './src/app/**/*.{js,ts,jsx,tsx,mdx}',
   ],
   theme: {
      extend: {
         colors: {
            background: '#121212',
            surface: '#1e1e1e',
            primary: '#ff0000',
            text: '#e0e0e0',
            'text-secondary': '#a0a0a0',
            'user-message': '#2d2d2d',
            'ai-message': '#242424',
            border: '#333333',
            disabled: '#505050',
         },
         fontSize: {
            'chat-lg': ['1.125rem', '1.6'],
            'chat-xl': ['1.25rem', '1.6'],
            'chat-2xl': ['1.5rem', '1.6'],
            'chat-sm': ['0.875rem', '1.6'],
         },
         backgroundImage: {
            'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
            'gradient-conic':
               'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
         },
         fontFamily: {
            sans: [
               '-apple-system',
               'BlinkMacSystemFont',
               'Segoe UI',
               'Roboto',
               'Oxygen',
               'Ubuntu',
               'Cantarell',
               'Open Sans',
               'Helvetica Neue',
               'sans-serif',
            ],
         },
         animation: {
            'fade-in': 'fadeIn 0.3s ease-out',
            'pulse-dot': 'pulseDot 1.5s infinite ease-in-out',
            'pulse-dot-delay-1': 'pulseDot 1.5s infinite ease-in-out 0.2s',
            'pulse-dot-delay-2': 'pulseDot 1.5s infinite ease-in-out 0.4s',
         },
         keyframes: {
            fadeIn: {
               '0%': {
                  opacity: '0',
                  transform: 'translateY(10px)',
               },
               '100%': {
                  opacity: '1',
                  transform: 'translateY(0)',
               },
            },
            pulseDot: {
               '0%, 100%': {
                  transform: 'scale(0.6)',
                  opacity: '0.6',
               },
               '50%': {
                  transform: 'scale(1)',
                  opacity: '1',
               },
            },
         },
      },
   },
   plugins: [],
};
export default config;
