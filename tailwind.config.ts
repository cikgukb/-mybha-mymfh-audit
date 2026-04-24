import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        mybha: {
          gold: '#C9A84C',
          'gold-light': '#E8C97A',
          'gold-dark': '#9A7A2E',
          black: '#1A1A1A',
          cream: '#FDF8EE',
        },
        bronze: '#CD7F32',
        silver: '#A8A9AD',
        gold: '#C9A84C',
      },
      fontFamily: {
        zh: ['Noto Sans SC', 'sans-serif'],
        ja: ['Noto Sans JP', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
