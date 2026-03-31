/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    200: '#bae6fd',
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#0ea5e9',
                    600: '#0284c7',
                    700: '#0369a1',
                    800: '#075985',
                    900: '#082f49',
                },
                success: {
                    50: '#f0fdf4',
                    500: '#22c55e',
                    600: '#16a34a',
                },
                warning: {
                    50: '#fffbeb',
                    500: '#f59e0b',
                    600: '#d97706',
                },
                danger: {
                    50: '#fef2f2',
                    500: '#ef4444',
                    600: '#dc2626',
                },
                slate: {
                    50: '#f8fafc',
                    100: '#f1f5f9',
                    200: '#e2e8f0',
                    300: '#cbd5e1',
                    400: '#94a3b8',
                    500: '#64748b',
                    600: '#475569',
                    700: '#334155',
                    800: '#1e293b',
                    900: '#0f172a',
                },
            },
            animation: {
                'pulse-subtle': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'progress-fill': 'progress-fill 1.5s ease-out forwards',
                'badge-unlock': 'badge-unlock 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                'counter': 'counter 0.8s ease-out',
                'shimmer': 'shimmer 2s infinite',
            },
            keyframes: {
                'progress-fill': {
                    '0%': { width: '0%' },
                    '100%': { width: 'var(--progress-width, 0%)' },
                },
                'badge-unlock': {
                    '0%': {
                        transform: 'scale(0) rotate(-20deg)',
                        opacity: '0',
                    },
                    '50%': {
                        transform: 'scale(1.1) rotate(5deg)',
                    },
                    '100%': {
                        transform: 'scale(1) rotate(0deg)',
                        opacity: '1',
                    },
                },
                'counter': {
                    '0%': {
                        transform: 'translateY(10px)',
                        opacity: '0',
                    },
                    '100%': {
                        transform: 'translateY(0)',
                        opacity: '1',
                    },
                },
                'shimmer': {
                    '0%': {
                        backgroundPosition: '-1000px 0',
                    },
                    '100%': {
                        backgroundPosition: '1000px 0',
                    },
                },
            },
            backdropBlur: {
                sm: '4px',
            },
        },
    },
    plugins: [],
}
