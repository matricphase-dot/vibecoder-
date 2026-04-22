/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        antigravity: {
          bg: '#0D1117',
          sidebar: '#161B22',
          tab: '#21262D',
          activeTab: '#30363D',
          border: '#30363D',
          text: '#C9D1D9',
          accent: '#58A6FF',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
