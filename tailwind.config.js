/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#030014',
                primary: {
                    DEFAULT: '#00f3ff', // Cyan
                    glow: 'rgba(0, 243, 255, 0.5)',
                },
                secondary: {
                    DEFAULT: '#bd00ff', // Violet
                    glow: 'rgba(189, 0, 255, 0.5)',
                },
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
            },
        },
    },
    plugins: [],
}
