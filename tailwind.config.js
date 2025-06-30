/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./api/**/*.mjs"
  ],
  theme: {
    extend: {
      animation: {
        'spin': 'spin 1s linear infinite',
      }
    },
  },
  plugins: [],
}
